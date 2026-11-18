import type { PCBuild, ParserWarning } from "./pc-build";
import type { TikTokProduct } from "./tiktok-pricing";

export type SheetSnapshot = {
  spreadsheetId: string;
  title: string;
  checkedAt: string;
  builds: PCBuild[];
  tiktokProducts: TikTokProduct[];
  warnings: ParserWarning[];
};

export type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  user?: { id: string; email: string };
};

export type SheetChange = {
  tab: string;
  product: string;
  field: string;
  before: string;
  after: string;
};

export type SheetChangeBatch = { detectedAt: string; changes: SheetChange[] };
export type SheetHistory = { snapshot: SheetSnapshot; batches: SheetChangeBatch[] };
