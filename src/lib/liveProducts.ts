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
 * "SPECIAL" is likewise a strong tie-breaker: the site sells both plain and
 * Special variants of the same build (e.g. "Level 8 X3D Gaming" vs
 * "Special : Level 8 X3D Gaming"), often with identical CPU/GPU. A build
 * whose XLSX name contains SPECIAL must prefer the Special variant, and a
 * plain build must prefer the plain variant.
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
  const SPECIAL_MISMATCH_PENALTY = 25;

  const buildName = normalize(build.name);
  const buildHasSpecial = /\bspecial\b/.test(buildName);
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

    // SPECIAL presence alignment: same evidence and components must not
    // let a plain build steal the Special variant's slot (or vice versa).
    const productHasSpecial = /\bspecial\b/.test(title);
    if (buildHasSpecial !== productHasSpecial) {
      score -= SPECIAL_MISMATCH_PENALTY;
    }

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
