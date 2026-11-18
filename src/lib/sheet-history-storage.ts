import { z } from "zod";
import { PC_BUILD_SCHEMA } from "@/types/pc-build";
import type { SheetHistory } from "@/types/google-sheet";

const snapshotSchema = z.object({
  spreadsheetId: z.string(), title: z.string(), checkedAt: z.string().datetime(),
  builds: z.array(PC_BUILD_SCHEMA),
  tiktokProducts: z.array(z.object({ id: z.string(), name: z.string(), websitePrice: z.number().nullable(), activatedPrice: z.number().nullable(), unactivatedPrice: z.number().nullable() })),
  warnings: z.array(z.object({ message: z.string(), column: z.string().optional(), buildName: z.string().optional() })),
});
const historySchema = z.object({ snapshot: snapshotSchema, batches: z.array(z.object({
  detectedAt: z.string().datetime(), changes: z.array(z.object({ tab: z.string(), product: z.string(), field: z.string(), before: z.string(), after: z.string() })),
})) });
export function historyStorageKey(accountId: string, sheetId: string) { return `aspc-sheets-v1:${accountId}:${sheetId}`; }
export function connectionStorageKey(accountId: string) { return `aspc-sheets-active-v1:${accountId}`; }
export function readSheetHistory(accountId: string, sheetId: string): SheetHistory | null {
  const raw = localStorage.getItem(historyStorageKey(accountId, sheetId));
  if (!raw) return null;
  const parsed = historySchema.safeParse(JSON.parse(raw));
  return parsed.success && parsed.data.snapshot.spreadsheetId === sheetId ? parsed.data : null;
}
export function writeSheetHistory(accountId: string, history: SheetHistory) {
  localStorage.setItem(historyStorageKey(accountId, history.snapshot.spreadsheetId), JSON.stringify(history));
}
