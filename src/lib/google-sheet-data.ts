import * as XLSX from "xlsx";
import { parseMarketingSheet } from "./parser/parseMarketingSheet";
import { readTikTokPricing } from "./parser/parseTikTokSheet";
import type { SheetSnapshot, SheetChange, SheetHistory } from "@/types/google-sheet";

export const SHEET_CHECK_INTERVAL = 15 * 60 * 1000;
export const HISTORY_CHANGE_LIMIT = 1000;

export function spreadsheetIdFromLink(link: string): string {
  let url: URL;
  try { url = new URL(link.trim()); } catch { throw new Error("Paste a valid Google Sheets link."); }
  const id = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com" || url.port || url.username || url.password || !id) {
    throw new Error("Use a link starting with https://docs.google.com/spreadsheets/d/.");
  }
  return id;
}

export function snapshotFromValues(spreadsheetId: string, title: string, tabs: { title: string; values: unknown[][] }[], checkedAt = new Date().toISOString()): SheetSnapshot {
  const workbook = XLSX.utils.book_new();
  for (const tab of tabs) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(tab.values), tab.title);
  const marketing = tabs.find((tab) => tab.title === "Marketing");
  const parsed = marketing ? parseMarketingSheet(workbook.Sheets.Marketing) : { builds: [], warnings: [] };
  const tiktok = readTikTokPricing(workbook);
  return { spreadsheetId, title, checkedAt, builds: parsed.builds, tiktokProducts: tiktok.products,
    warnings: [...parsed.warnings, ...tiktok.warnings.map((message) => ({ message: `TikTok Price: ${message}` }))] };
}

const buildFields = {
  section: "Section", cpu: "CPU", motherboard: "Motherboard", cooler: "Cooler", ram: "RAM", gpu: "GPU",
  storage: "Storage", psu: "Power supply", chassis: "Chassis", fans: "Fans", notes: "Notes", salePrice: "Sale Price",
} as const;
const priceFields = { websitePrice: "Website Price (Unactivated)", activatedPrice: "TikTok Price (Activated)", unactivatedPrice: "TikTok Price (Unactivated)" } as const;
function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not available";
  if (Array.isArray(value)) return value.length ? value.join("; ") : "Not available";
  return String(value);
}
function records(snapshot: SheetSnapshot) {
  const result = new Map<string, { tab: string; name: string; values: Record<string, string> }>();
  const occurrences = new Map<string, number>();
  function add(tab: string, name: string, values: Record<string, string>) {
    const base = `${tab}:${name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()}`;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    result.set(`${base}:${occurrence}`, { tab, name, values });
  }
  for (const build of snapshot.builds) add("Marketing", build.name, Object.fromEntries(Object.entries(buildFields).map(([key, label]) => [label, display(build[key as keyof typeof buildFields])])));
  for (const product of snapshot.tiktokProducts) add("TikTok Price", product.name, Object.fromEntries(Object.entries(priceFields).map(([key, label]) => [label, display(product[key as keyof typeof priceFields])])));
  return result;
}

export function compareSnapshots(before: SheetSnapshot, after: SheetSnapshot): SheetChange[] {
  if (before.spreadsheetId !== after.spreadsheetId) return [];
  const oldRecords = records(before), newRecords = records(after);
  const changes: SheetChange[] = [];
  for (const [key, item] of newRecords) {
    const old = oldRecords.get(key);
    if (!old) changes.push({ tab: item.tab, product: item.name, field: "Product added", before: "Not listed", after: "Listed" });
    else for (const [field, value] of Object.entries(item.values)) {
      if (old.values[field] !== value) changes.push({ tab: item.tab, product: item.name, field, before: old.values[field], after: value });
    }
  }
  for (const [key, item] of oldRecords) if (!newRecords.has(key)) changes.push({ tab: item.tab, product: item.name, field: "Product removed", before: "Listed", after: "Not listed" });
  return changes;
}

export function updateSheetHistory(previous: SheetHistory | null, snapshot: SheetSnapshot): SheetHistory {
  const sameSheet = previous?.snapshot.spreadsheetId === snapshot.spreadsheetId;
  const changes = sameSheet ? compareSnapshots(previous.snapshot, snapshot) : [];
  const batches = changes.length ? [{ detectedAt: snapshot.checkedAt, changes }, ...(sameSheet ? previous.batches : [])] : sameSheet ? previous.batches : [];
  let remaining = HISTORY_CHANGE_LIMIT;
  return { snapshot, batches: batches.flatMap((batch) => {
    const kept = batch.changes.slice(0, remaining);
    remaining -= kept.length;
    return kept.length ? [{ ...batch, changes: kept }] : [];
  }) };
}
