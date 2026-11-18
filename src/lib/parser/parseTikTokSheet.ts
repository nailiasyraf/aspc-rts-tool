import type { WorkBook, WorkSheet } from "xlsx";
import { sheetToMatrix } from "../xlsx/readWorkbook";
import type { TikTokPricingResult, TikTokProduct } from "../../types/tiktok-pricing";

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().toLowerCase()
    : "";
}

function price(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^(?:S\$|SGD|\$)\s*/i, "");
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text.replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** Parse each repeated Name block independently. Never borrow another block's prices. */
export function parseTikTokSheet(sheet: WorkSheet): TikTokPricingResult {
  const rows = sheetToMatrix(sheet);
  const products: TikTokProduct[] = [];
  const warnings: string[] = [];
  const headers = rows.flatMap((row, index) => normalize(row[0]) === "name" ? [index] : []);

  for (let block = 0; block < headers.length; block++) {
    const start = headers[block];
    const end = headers[block + 1] ?? rows.length;
    const fields = new Map<string, unknown[]>();
    for (let row = start + 1; row < end; row++) {
      const label = normalize(rows[row][0]);
      if (label) fields.set(label, rows[row]);
    }
    for (let column = 1; column < rows[start].length; column++) {
      const value = rows[start][column];
      if (typeof value !== "string" || !value.trim()) continue;
      const activatedPrice = price(fields.get("tiktok price (activated)")?.[column]);
      const unactivatedPrice = price(fields.get("tiktok price (unactivated)")?.[column]);
      // A name, website price, listing price or RAM upgrade alone is not a base TikTok listing.
      if (activatedPrice === null && unactivatedPrice === null) continue;
      products.push({
        id: `tiktok-${start + 1}-${column + 1}`,
        name: value.replace(/\s+/g, " ").trim(),
        websitePrice: price(fields.get(".com selling price (unactivated)")?.[column]),
        activatedPrice,
        unactivatedPrice,
      });
    }
  }

  if (headers.length === 0) {
    warnings.push('No "Name" sections were found. Check the layout of the TikTok Price tab.');
  }
  return { products, warnings };
}

export function readTikTokPricing(workbook: WorkBook): TikTokPricingResult {
  const name = workbook.SheetNames.find((name) => normalize(name) === "tiktok price");
  if (!name || !workbook.Sheets[name]) {
    // TikTok pricing is optional: older Marketing-only workbooks still work.
    return { products: [], warnings: [] };
  }
  try {
    return parseTikTokSheet(workbook.Sheets[name]);
  } catch {
    return {
      products: [],
      warnings: ["TikTok prices could not be read. Build and brochure information are still available."],
    };
  }
}
