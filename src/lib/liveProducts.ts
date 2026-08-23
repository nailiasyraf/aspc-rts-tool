import type { PCBuild } from "@/types/pc-build";
import type { LiveProduct } from "@/app/api/live-products/route";

export type { LiveProduct, LiveProductsResponse } from "@/app/api/live-products/route";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Expands abbreviations such as "L3 AMD" -> "level 3 amd". */
function expandAbbreviations(value: string): string {
  return value.replace(/\bl\s*(\d+)\b/g, "level $1");
}

/**
 * Modifier tokens that appear as prefixes in website titles (e.g.
 * "NVIDIA Airflow Ultimate : X3D Gaming"). Their presence/absence must
 * align between the XLSX build name and the website title, or sibling
 * variants with the same CPU/GPU will steal each other's match.
 */
const MODIFIER_WORDS = new Set([
  "special",
  "showcase",
  "nvidia",
  "airflow",
  "supreme",
  "ultimate",
  "insane",
  "icue",
  "lunchbox",
  "black",
  "white",
  "focus",
  "atomic",
  "pro",
]);

function modifierSet(name: string): Set<string> {
  return new Set(
    normalize(name)
      .split(" ")
      .filter((token) => MODIFIER_WORDS.has(token))
  );
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 || /\d/.test(token))
  );
}

/** Extracts the key CPU model, e.g. "ryzen 7 7700", "core ultra 7 265kf". */
function extractCpuKey(cpu: string | undefined): string | null {
  if (!cpu) return null;
  const text = cpu.toLowerCase();
  const ryzen = text.match(/ryzen\s+\d\s+\d{3,4}[a-z]*/);
  if (ryzen) return normalize(ryzen[0]);
  const core = text.match(/core\s+(?:ultra\s+)?i?\d{3,5}[a-z]*/);
  if (core) return normalize(core[0]);
  return null;
}

/** Extracts the key GPU model, e.g. "rtx 5060 ti", "rx 9070 xt". */
function extractGpuKey(gpu: string | undefined): string | null {
  if (!gpu) return null;
  const text = gpu.toLowerCase();
  const rtx = text.match(/rtx\s*\d{3,4}\s*(?:ti)?/);
  if (rtx) return normalize(rtx[0]);
  const rx = text.match(/rx\s*\d{3,4}\s*(?:xt)?/);
  if (rx) return normalize(rx[0]);
  return null;
}

/**
 * Matches an XLSX build against live website products.
 *
 * The website's component configurations drift over time while the XLSX is
 * a snapshot, so build-name evidence dominates the score (EXACT/CONTAINED/
 * FUZZY are an order of magnitude apart) and component keys (CPU / GPU)
 * only break ties between same-name variants.
 *
 * Modifier alignment: the site sells sibling variants that share the same
 * build body (e.g. "Airflow Ultimate : X3D Gaming" vs "NVIDIA Airflow
 * Ultimate : X3D Gaming", or plain vs "Special : ..." variants) often with
 * identical CPU/GPU. Modifier words (SPECIAL, NVIDIA, AIRFLOW, ...) must
 * align between the XLSX name and the website title, or a sibling steals
 * the match.
 *
 * Acceptance:
 *   exact or contained name match       -> accepted
 *   fuzzy name + BOTH components match  -> accepted
 *   anything weaker                     -> no match
 */
export function matchLiveProduct(
  build: PCBuild,
  products: LiveProduct[]
): LiveProduct | null {
  const EVIDENCE_EXACT = 100;
  const EVIDENCE_CONTAINED = 80;
  const EVIDENCE_FUZZY = 50;
  const COMPONENT_BONUS = 1;
  const MODIFIER_MISMATCH_PENALTY = 25;

  const buildName = normalize(build.name);
  const buildModifiers = modifierSet(build.name);
  const nameTokens = tokenSet(build.name);
  const cpuKey = extractCpuKey(build.cpu);
  const gpuKey = extractGpuKey(build.gpu);

  let best: LiveProduct | null = null;
  let bestScore = 0;
  let bestEvidence = 0;
  let bestComponents = 0;

  for (const product of products) {
    const rawTitle = product.name.split("/")[0] ?? product.name;
    const title = normalize(expandAbbreviations(rawTitle));
    const haystack = normalize(expandAbbreviations(product.name));

    let evidence = 0;
    if (title === buildName || haystack === buildName) {
      evidence = EVIDENCE_EXACT;
    } else if (haystack.includes(buildName) || buildName.includes(title)) {
      evidence = EVIDENCE_CONTAINED;
    } else {
      const titleTokens = tokenSet(expandAbbreviations(rawTitle));
      let overlap = 0;
      for (const token of nameTokens) {
        if (titleTokens.has(token)) overlap += 1;
      }
      if (overlap >= 2 && overlap >= nameTokens.size * 0.6) {
        evidence = EVIDENCE_FUZZY;
      }
    }

    if (evidence === 0) continue;

    let score = evidence;
    let components = 0;
    if (cpuKey && haystack.includes(cpuKey)) {
      score += COMPONENT_BONUS;
      components += 1;
    }
    if (gpuKey && haystack.includes(gpuKey)) {
      score += COMPONENT_BONUS;
      components += 1;
    }

    // Modifier alignment: penalize variants whose modifier words differ
    // from the XLSX build name (e.g. plain build vs "NVIDIA Airflow ...").
    const titleModifiers = modifierSet(rawTitle);
    const symmetricDiff = new Set(
      [...buildModifiers, ...titleModifiers].filter(
        (token) =>
          !buildModifiers.has(token) || !titleModifiers.has(token)
      )
    );
    score -= symmetricDiff.size * MODIFIER_MISMATCH_PENALTY;

    if (score > bestScore) {
      bestScore = score;
      best = product;
      bestEvidence = evidence;
      bestComponents = components;
    }
  }

  if (!best) return null;

  // Exact or contained name match is sufficient on its own.
  if (bestEvidence >= EVIDENCE_CONTAINED) return best;
  // Fuzzy name match requires both CPU and GPU confirmation.
  if (bestEvidence >= EVIDENCE_FUZZY && bestComponents >= 2) return best;

  return null;
}
