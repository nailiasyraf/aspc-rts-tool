import type { PCBuild } from "@/types/pc-build";

export type FilterableField =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "cooler"
  | "ram"
  | "storage"
  | "psu"
  | "chassis";

export type ComponentFilter = {
  field: FilterableField;
  value: string;
};

export const FILTERABLE_FIELDS: { key: FilterableField; label: string }[] = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "motherboard", label: "Motherboard" },
  { key: "cooler", label: "Cooler" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Storage" },
  { key: "psu", label: "PSU" },
  { key: "chassis", label: "Chassis" },
];

/**
 * Normalization for matching only: case-insensitive, collapses whitespace.
 * Never merges products that differ by anything other than formatting.
 */
export function normalizeComponentText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function collectValues(
  builds: PCBuild[],
  field: FilterableField
): string[] {
  const values: string[] = [];
  for (const build of builds) {
    if (field === "ram" || field === "storage") {
      values.push(...(build[field] ?? []));
    } else {
      const value = build[field];
      if (value) values.push(value);
    }
  }
  return values;
}

/**
 * All unique component models for a field, derived dynamically from the
 * parsed builds. Sorted naturally for easy scanning.
 */
export function deriveComponentOptions(
  builds: PCBuild[],
  field: FilterableField
): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const value of collectValues(builds, field)) {
    const display = value.replace(/\s+/g, " ").trim();
    if (!display) continue;
    const key = normalizeComponentText(display);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(display);
  }
  return options.sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

/**
 * Scalar fields match directly. Array fields (ram/storage) match if any
 * entry equals the selected component.
 */
export function buildMatchesComponent(
  build: PCBuild,
  filter: ComponentFilter
): boolean {
  const target = normalizeComponentText(filter.value);
  if (filter.field === "ram" || filter.field === "storage") {
    return (build[filter.field] ?? []).some(
      (entry) => normalizeComponentText(entry) === target
    );
  }
  const value = build[filter.field];
  return value !== undefined && normalizeComponentText(value) === target;
}
