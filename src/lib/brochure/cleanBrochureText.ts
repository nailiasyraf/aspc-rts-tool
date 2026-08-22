import type { FieldKey } from "@/lib/parser/normalizeRowLabel";

export type BrochureRule = {
  id: string;
  appliesTo?: FieldKey[];
  transform: (value: string, field: FieldKey) => string | null;
};

/**
 * Entries containing emoji-decorated internal tags such as
 * "🐏SINGLE STICK RAM🐏" are skipped entirely in brochure output.
 * Legitimate component names never contain emoji.
 */
const INTERNAL_MARKER_PATTERNS: RegExp[] = [
  /\p{Extended_Pictographic}/u,
];

export function isInternalMarkerEntry(value: string): boolean {
  return INTERNAL_MARKER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Rule-based brochure text cleaning.
 *
 * Rules are applied in order. A rule returning `null` means "no change".
 * Each rule must be conservative: only strip content it explicitly
 * recognizes as internal spreadsheet metadata.
 */
export const BROCHURE_RULES: BrochureRule[] = [
  {
    // Strips internal tag prefixes such as "(P) AMD Ryzen 7 7700".
    id: "strip-tag-prefix",
    transform: (value) => {
      const match = value.match(/^\s*\([A-Za-z0-9]{1,3}\)\s+/);
      if (!match) return null;
      const stripped = value.slice(match[0].length).trim();
      return stripped.length > 0 ? stripped : null;
    },
  },
  {
    // Keeps only the customer-facing segment before a top-level "|" separator
    // (outside parentheses). e.g. "(P) AMD Ryzen 7 7700 | 8 Cores 16 Threads"
    // -> "AMD Ryzen 7 7700". Pipes inside parentheses, such as SSD speed
    // specs "(R: 5000 | W: 4200)", are customer-facing and kept.
    id: "strip-pipe-metadata",
    transform: (value) => {
      let depth = 0;
      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (char === "(") depth += 1;
        if (char === ")") depth -= 1;
        if (char === "|" && depth === 0) {
          const stripped = value.slice(0, i).trim();
          return stripped.length > 0 ? stripped : null;
        }
      }
      return null;
    },
  },
  {
    // Storage brochure copy keeps only the read-speed spec; write speeds
    // are dropped. e.g. "... SSD (R: 5000 | W: 4200)" -> "... SSD (R: 5000)".
    id: "storage-keep-read-speed",
    appliesTo: ["storage"],
    transform: (value) => {
      const group = value.match(/\([^()]*(?:\bR(?:ead)?\b):?\s*[\d.,]+[^()]*\)/i);
      if (!group) return null;
      const read = group[0].match(/(?:\bR(?:ead)?\b):?\s*[\d.,]+/i);
      if (!read) return null;
      return value.replace(group[0], `(${read[0].replace(/[,\s]+$/, "")})`);
    },
  },
  {
    // Removes a dash used as a separator before a capacity/wattage value.
    // e.g. "Gigabyte RTX 5060 Windforce MAX OC - 8GB" -> "... MAX OC 8GB".
    id: "strip-dash-before-capacity",
    transform: (value) => {
      if (!/\s[-–—]\s+\d/.test(value)) return null;
      return value.replace(/\s+[-–—]\s+(?=\d+(?:\.\d+)?\s*(?:GB|MB|TB|W|MHz|GHz)\b)/i, " ");
    },
  },
  {
    // Chassis lines end with the word CHASSIS in brochure copy.
    // e.g. "AFTERSHOCK Zeal-M 2026 Black" -> "AFTERSHOCK Zeal-M 2026 Black Chassis".
    id: "append-chassis-word",
    appliesTo: ["chassis"],
    transform: (value) => {
      if (/\bchassis\b/i.test(value)) return null;
      return `${value} Chassis`;
    },
  },
];

export type CleanBrochureResult = {
  value: string;
  modified: boolean;
};

export function cleanBrochureText(
  value: string,
  field: FieldKey
): CleanBrochureResult {
  let current = value;
  let modified = false;
  for (const rule of BROCHURE_RULES) {
    if (rule.appliesTo && !rule.appliesTo.includes(field)) continue;
    const result = rule.transform(current, field);
    if (result !== null && result !== current) {
      current = result;
      modified = true;
    }
  }
  return { value: current.replace(/\s+/g, " ").trim(), modified };
}

export function formatBrochureLine(value: string, field: FieldKey): string {
  const cleaned = cleanBrochureText(value, field);
  return cleaned.value.toUpperCase();
}
