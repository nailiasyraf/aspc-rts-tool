import type { PCBuild, ParseResult, ParserWarning } from "@/types/pc-build";
import { PC_BUILD_SCHEMA } from "@/types/pc-build";
import { sheetToMatrix, toColumnLetter } from "@/lib/xlsx/readWorkbook";
import {
  rowLabelToField,
  isIgnoredRowLabel,
  type FieldKey,
} from "@/lib/parser/normalizeRowLabel";
import { cleanText, parsePrice, isEmptyValue } from "@/lib/parser/cleanValue";

type FieldRow = {
  field: FieldKey;
  rowIndex: number;
  occurrence: number;
  rawLabel: string;
};

type LabelBlock = {
  startRow: number;
  endRow: number;
  rows: FieldRow[];
};

type SectionHeading = {
  row: number;
  col: number;
  text: string;
};

const LABEL_COLUMN_SCAN_LIMIT = 6;
const SECTION_PATTERN = /\bbuilds?\s*$/i;
const LIST_FIELDS: FieldKey[] = ["ram", "storage", "fan", "notes"];
const CORE_FIELDS: FieldKey[] = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "chassis",
];

function detectLabelColumn(matrix: unknown[][]): number {
  let bestColumn = 0;
  let bestScore = 0;
  const limit = Math.min(LABEL_COLUMN_SCAN_LIMIT, 40);
  for (let col = 0; col < limit; col++) {
    let score = 0;
    for (const row of matrix) {
      if (row && rowLabelToField(row[col])) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestColumn = col;
    }
  }
  return bestColumn;
}

function buildFieldRows(matrix: unknown[][], labelColumn: number): FieldRow[] {
  const rows: FieldRow[] = [];
  const occurrenceCount = new Map<FieldKey, number>();
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    const labelCell = row[labelColumn];
    if (isIgnoredRowLabel(labelCell)) continue;
    const field = rowLabelToField(labelCell);
    if (!field) continue;
    const occurrence = (occurrenceCount.get(field) ?? 0) + 1;
    occurrenceCount.set(field, occurrence);
    rows.push({
      field,
      rowIndex: r,
      occurrence,
      rawLabel: cleanText(labelCell) ?? String(labelCell),
    });
  }
  return rows;
}

/**
 * Groups label rows into vertical blocks.
 *
 * A workbook may stack several labelled tables (one per section, e.g.
 * "AMD Optimal Builds" then "Intel Optimal Builds"), each repeating the
 * Name/CPU/MOBO/... rows. Each `Name` row therefore starts a new block.
 * With a single `Name` row, all label rows form one block (builds are then
 * separated across columns under merged section banners).
 */
function buildLabelBlocks(fieldRows: FieldRow[]): LabelBlock[] {
  const nameRows = fieldRows.filter((fr) => fr.field === "name");
  if (nameRows.length <= 1) {
    return [
      {
        startRow: fieldRows[0].rowIndex,
        endRow: fieldRows[fieldRows.length - 1].rowIndex,
        rows: fieldRows,
      },
    ];
  }
  const blocks: LabelBlock[] = [];
  nameRows.forEach((nameRow, index) => {
    const next = nameRows[index + 1];
    const upper = next ? next.rowIndex - 1 : Number.MAX_SAFE_INTEGER;
    const rows = fieldRows.filter(
      (fr) => fr.rowIndex >= nameRow.rowIndex && fr.rowIndex <= upper
    );
    blocks.push({
      startRow: nameRow.rowIndex,
      endRow: rows.length ? rows[rows.length - 1].rowIndex : nameRow.rowIndex,
      rows,
    });
  });
  return blocks;
}

function isLikelySectionText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length < 60 &&
    SECTION_PATTERN.test(value.trim())
  );
}

function detectSections(
  matrix: unknown[][],
  labelColumn: number,
  fieldRows: FieldRow[]
): SectionHeading[] {
  const fieldRowIndexes = new Set(fieldRows.map((fr) => fr.rowIndex));
  const sections: SectionHeading[] = [];
  for (let r = 0; r < matrix.length; r++) {
    if (fieldRowIndexes.has(r)) continue;
    const row = matrix[r];
    if (!row) continue;
    const labelCell = row[labelColumn];
    if (isLikelySectionText(labelCell)) {
      sections.push({ row: r, col: labelColumn, text: labelCell.trim() });
      continue;
    }
    for (let c = labelColumn + 1; c < row.length; c++) {
      if (isLikelySectionText(row[c])) {
        sections.push({
          row: r,
          col: c,
          text: (row[c] as string).replace(/\s+/g, " ").trim(),
        });
      }
    }
  }
  sections.sort((a, b) => a.row - b.row || a.col - b.col);
  return sections;
}

/** Section for a stacked block: nearest heading above the block. */
function sectionForBlock(
  block: LabelBlock,
  sections: SectionHeading[]
): string | undefined {
  let matched: SectionHeading | undefined;
  for (const section of sections) {
    if (section.row < block.startRow) matched = section;
  }
  return matched?.text;
}

/**
 * Section for a column when only one label block exists (merged banners
 * spanning groups of columns).
 */
function sectionForColumn(
  column: number,
  sections: SectionHeading[],
  maxColumn: number
): string | undefined {
  let matched: SectionHeading | undefined;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.col > column) continue;
    const next = sections[i + 1];
    let endColumn: number;
    if (next && next.row === section.row) {
      endColumn = next.col - 1;
    } else if (next) {
      endColumn = Math.max(next.col - 1, section.col);
    } else {
      endColumn = maxColumn;
    }
    if (column <= endColumn) matched = section;
  }
  return matched?.text;
}

type ColumnParse = {
  name: string | undefined;
  scalar: Partial<Record<FieldKey, string>>;
  lists: Partial<Record<FieldKey, string[]>>;
  raw: Record<string, unknown>;
  salePrice: number | undefined;
  salePriceUnparsable: boolean;
  hasSalePriceCell: boolean;
};

function parseColumnBlock(
  matrix: unknown[][],
  block: LabelBlock,
  col: number
): ColumnParse {
  const result: ColumnParse = {
    name: undefined,
    scalar: {},
    lists: {},
    raw: {},
    salePrice: undefined,
    salePriceUnparsable: false,
    hasSalePriceCell: false,
  };
  const occurrence = new Map<string, number>();
  for (const fr of block.rows) {
    const cellValue = matrix[fr.rowIndex]?.[col] ?? null;
    if (!isEmptyValue(cellValue)) {
      const count = (occurrence.get(fr.rawLabel) ?? 0) + 1;
      occurrence.set(fr.rawLabel, count);
      const rawKey = count > 1 ? `${fr.rawLabel}_${count}` : fr.rawLabel;
      result.raw[rawKey] = cellValue;
    }
    if (fr.field === "name") {
      result.name = cleanText(cellValue);
      continue;
    }
    if (fr.field === "salePrice") {
      if (isEmptyValue(cellValue)) continue;
      result.hasSalePriceCell = true;
      const parsed = parsePrice(cellValue);
      if (parsed !== undefined) {
        result.salePrice = parsed;
      } else {
        result.salePriceUnparsable = true;
      }
      continue;
    }
    const cleaned = cleanText(cellValue);
    if (!cleaned) continue;
    if (LIST_FIELDS.includes(fr.field)) {
      const list = result.lists[fr.field] ?? [];
      list.push(cleaned);
      result.lists[fr.field] = list;
    } else {
      if (result.scalar[fr.field] === undefined) {
        result.scalar[fr.field] = cleaned;
      }
    }
  }
  return result;
}

export function parseMarketingSheet(sheet: unknown): ParseResult {
  const matrix = sheetToMatrix(sheet as never);
  const warnings: ParserWarning[] = [];

  const labelColumn = detectLabelColumn(matrix);
  const fieldRows = buildFieldRows(matrix, labelColumn);

  if (fieldRows.length === 0) {
    return {
      builds: [],
      warnings: [
        {
          message:
            "No PC builds could be detected in the Marketing worksheet.",
        },
      ],
    };
  }

  const sections = detectSections(matrix, labelColumn, fieldRows);
  const blocks = buildLabelBlocks(fieldRows);
  const stackedMode = blocks.length > 1;

  const columnCount = matrix.reduce(
    (max, row) => Math.max(max, row?.length ?? 0),
    0
  );

  const builds: PCBuild[] = [];

  blocks.forEach((block, blockIndex) => {
    for (let col = 0; col < columnCount; col++) {
      if (col === labelColumn) continue;

      const parsed = parseColumnBlock(matrix, block, col);
      const hasAnyValue = Object.keys(parsed.raw).length > 0;
      if (!hasAnyValue) continue;

      const coreFieldCount = CORE_FIELDS.filter((f) => {
        if (f === "ram" || f === "storage") {
          return (parsed.lists[f]?.length ?? 0) > 0;
        }
        return parsed.scalar[f] !== undefined;
      }).length;

      const columnLetter = toColumnLetter(col);

      if (!parsed.name) {
        if (coreFieldCount >= 3) {
          warnings.push({
            column: columnLetter,
            message: `Possible build detected but no Name found (column ${columnLetter})`,
          });
        }
        continue;
      }

      if (coreFieldCount < 2) continue;

      const buildWarnings: string[] = [];
      if (parsed.salePrice === undefined) {
        if (parsed.salePriceUnparsable) {
          buildWarnings.push("Sale Price could not be parsed");
        } else {
          buildWarnings.push("Sale Price could not be detected");
        }
      }
      if (!parsed.scalar.chassis) buildWarnings.push("Missing chassis");
      if (!parsed.scalar.gpu) buildWarnings.push("Missing GPU");

      const section = stackedMode
        ? sectionForBlock(block, sections)
        : sectionForColumn(col, sections, columnCount - 1);

      const candidate = {
        id: `${columnLetter}-${blockIndex}-${parsed.name
          .replace(/\s+/g, "-")
          .toLowerCase()}`,
        section,
        name: parsed.name,
        cpu: parsed.scalar.cpu,
        motherboard: parsed.scalar.motherboard,
        cooler: parsed.scalar.cooler,
        ram: parsed.lists.ram ?? [],
        gpu: parsed.scalar.gpu,
        storage: parsed.lists.storage ?? [],
        psu: parsed.scalar.psu,
        chassis: parsed.scalar.chassis,
        fans: parsed.lists.fan ?? [],
        notes: parsed.lists.notes ?? [],
        salePrice: parsed.salePrice,
        sourceColumn: columnLetter,
        sheetName: "Marketing" as const,
        raw: parsed.raw,
        warnings: buildWarnings,
      };

      const validated = PC_BUILD_SCHEMA.safeParse(candidate);
      if (validated.success) {
        builds.push(validated.data);
      } else {
        warnings.push({
          column: columnLetter,
          buildName: parsed.name,
          message: `Build "${parsed.name}" in column ${columnLetter} could not be fully parsed`,
        });
      }
    }
  });

  const seen = new Set<string>();
  const dedupedWarnings = warnings.filter((w) => {
    const key = JSON.stringify(w);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (builds.length === 0 && dedupedWarnings.length === 0) {
    dedupedWarnings.push({
      message: "No PC builds could be detected in the Marketing worksheet.",
    });
  }

  return { builds, warnings: dedupedWarnings };
}
