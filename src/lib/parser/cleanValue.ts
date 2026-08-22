const EMPTY_MARKERS = new Set(["", "-", "—", "–", "n/a", "na", "tbd"]);

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    return EMPTY_MARKERS.has(value.replace(/\s+/g, "").toLowerCase());
  }
  return false;
}

export function cleanText(value: unknown): string | undefined {
  if (isEmptyValue(value)) return undefined;
  let text: string;
  if (typeof value === "number") {
    text = String(value);
  } else if (typeof value === "boolean") {
    text = String(value);
  } else if (typeof value === "string") {
    text = value;
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else {
    text = String(value);
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || EMPTY_MARKERS.has(cleaned.toLowerCase())) return undefined;
  return cleaned;
}

export function parsePrice(value: unknown): number | undefined {
  if (isEmptyValue(value)) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const stripped = value.replace(/[,$\s]/g, "");
    const parsed = Number.parseFloat(stripped);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
