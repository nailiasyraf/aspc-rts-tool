export type FieldKey =
  | "name"
  | "cpu"
  | "motherboard"
  | "cooler"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "chassis"
  | "fan"
  | "notes"
  | "salePrice";

const FIELD_ALIASES: Record<string, FieldKey> = {
  name: "name",
  buildname: "name",
  build: "name",
  cpu: "cpu",
  processor: "cpu",
  mobo: "motherboard",
  motherboard: "motherboard",
  mainboard: "motherboard",
  cooler: "cooler",
  cpucoler: "cooler",
  cpucooler: "cooler",
  ram: "ram",
  memory: "ram",
  graphicscard: "gpu",
  gpu: "gpu",
  graphics: "gpu",
  vga: "gpu",
  ssd: "storage",
  storage: "storage",
  hdd: "storage",
  nvme: "storage",
  psu: "psu",
  powersupply: "psu",
  chassis: "chassis",
  case: "chassis",
  casing: "chassis",
  fan: "fan",
  fans: "fan",
  notes: "notes",
  note: "notes",
  remarks: "notes",
  promoprice: "salePrice",
  saleprice: "salePrice",
  promo: "salePrice",
  promo_price: "salePrice",
  sale_price: "salePrice",
};

const IGNORED_ALIASES = new Set([
  "variants",
  "variant",
  "redtoptab",
  "redtop",
  "totalusd",
  "usdtotal",
  "total",
  "sgdwtax",
  "sgd",
  "nonpromoprice",
  "usualprice",
  "usual",
]);

export function normalizeRowLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .toLowerCase()
    .replace(/[:：]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "");
  if (!cleaned) return null;
  return cleaned;
}

export function rowLabelToField(value: unknown): FieldKey | null {
  const normalized = normalizeRowLabel(value);
  if (!normalized) return null;
  const field = FIELD_ALIASES[normalized];
  return field ?? null;
}

export function isIgnoredRowLabel(value: unknown): boolean {
  const normalized = normalizeRowLabel(value);
  if (!normalized) return false;
  return IGNORED_ALIASES.has(normalized);
}
