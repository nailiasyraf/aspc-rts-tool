import type { PCBuild } from "@/types/pc-build";

/**
 * Builds a lowercase searchable text index for a build. Created once per
 * parse — search then runs over the in-memory index without touching the
 * workbook again.
 */
export function buildSearchIndex(build: PCBuild): string {
  return [
    build.name,
    build.section ?? "",
    build.cpu ?? "",
    build.gpu ?? "",
    build.motherboard ?? "",
    build.cooler ?? "",
    ...build.ram,
    ...build.storage,
    build.psu ?? "",
    build.chassis ?? "",
    ...build.fans,
    ...build.notes,
  ]
    .join(" \n ")
    .toLowerCase();
}

export function searchBuilds(
  builds: PCBuild[],
  indexes: Map<string, string>,
  query: string
): PCBuild[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return builds;
  const tokens = trimmed.split(/\s+/);
  return builds.filter((build) => {
    const index = indexes.get(build.id);
    if (!index) return false;
    return tokens.every((token) => index.includes(token));
  });
}
