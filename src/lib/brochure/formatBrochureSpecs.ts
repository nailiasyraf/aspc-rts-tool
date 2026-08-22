import type { PCBuild } from "@/types/pc-build";
import {
  formatBrochureLine,
  isInternalMarkerEntry,
} from "@/lib/brochure/cleanBrochureText";

/**
 * Returns brochure-ready specification lines in brochure order:
 * CPU, GPU, Motherboard, Cooler, RAM, Storage, PSU, Chassis.
 *
 * Pure function — no UI dependencies. Missing values are skipped.
 * Fans are intentionally excluded from brochure output.
 */
export function formatBrochureSpecs(build: PCBuild): string[] {
  const specs: string[] = [];

  if (build.cpu) specs.push(formatBrochureLine(build.cpu, "cpu"));
  if (build.gpu) specs.push(formatBrochureLine(build.gpu, "gpu"));
  if (build.motherboard) {
    specs.push(formatBrochureLine(build.motherboard, "motherboard"));
  }
  if (build.cooler) specs.push(formatBrochureLine(build.cooler, "cooler"));

  for (const item of build.ram) {
    if (item && !isInternalMarkerEntry(item)) {
      specs.push(formatBrochureLine(item, "ram"));
    }
  }
  for (const item of build.storage) {
    if (item) specs.push(formatBrochureLine(item, "storage"));
  }

  if (build.psu) specs.push(formatBrochureLine(build.psu, "psu"));
  if (build.chassis) specs.push(formatBrochureLine(build.chassis, "chassis"));

  return specs;
}
