import * as XLSX from "xlsx";

export type ReadWorkbookResult =
  | { ok: true; workbook: XLSX.WorkBook }
  | { ok: false; error: "invalid-file"; message: string };

export function readWorkbook(data: ArrayBuffer): ReadWorkbookResult {
  try {
    const workbook = XLSX.read(data, { type: "array" });
    return { ok: true, workbook };
  } catch {
    return {
      ok: false,
      error: "invalid-file",
      message: "Please upload a valid XLSX workbook.",
    };
  }
}

export type MarketingSheetResult =
  | { ok: true; sheet: XLSX.WorkSheet }
  | { ok: false; error: "missing-marketing-tab"; message: string };

export function getMarketingSheet(workbook: XLSX.WorkBook): MarketingSheetResult {
  const sheetName = workbook.SheetNames.find((name) => name === "Marketing");
  if (!sheetName) {
    return {
      ok: false,
      error: "missing-marketing-tab",
      message: "Marketing tab not found in this workbook.",
    };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      ok: false,
      error: "missing-marketing-tab",
      message: "Marketing tab not found in this workbook.",
    };
  }
  return { ok: true, sheet };
}

export function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: true,
    defval: null,
  });
}

export function toColumnLetter(index: number): string {
  let n = index;
  let letter = "";
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
