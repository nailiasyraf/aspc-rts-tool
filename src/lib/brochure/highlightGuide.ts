import type { PCBuild } from "@/types/pc-build";

export type HighlightEntry = {
  id: string;
  label: string;
  hex: string;
};

export const HIGHLIGHT_PALETTE = {
  amdProcessor: { label: "AMD PROCESSOR", hex: "#FF7A00" },
  intelProcessor: { label: "INTEL PROCESSOR", hex: "#00AEEF" },
  nvidiaGpu: { label: "NVIDIA GPU", hex: "#7CFF00" },
  amdGpu: { label: "AMD GPU", hex: "#FF2D2D" },
  ssdR7: { label: "SSD R:7XXX", hex: "#F448FF" },
  ram6000: { label: "RAM 6XXXMHZ", hex: "#FFE600" },
  goldPsu: { label: "GOLD PSU", hex: "#FFC928" },
} satisfies Record<string, { label: string; hex: string }>;

/**
 * Determines which highlight color entries are relevant to the selected
 * build. Pure detection only — never modifies spec text.
 */
export function detectHighlights(build: PCBuild): HighlightEntry[] {
  const entries: HighlightEntry[] = [];
  const cpu = (build.cpu ?? "").toUpperCase();
  const gpu = (build.gpu ?? "").toUpperCase();
  const psu = (build.psu ?? "").toUpperCase();

  if (/\bAMD\b|\bRYZEN\b/.test(cpu)) {
    entries.push({ id: "amdProcessor", ...HIGHLIGHT_PALETTE.amdProcessor });
  } else if (/\bINTEL\b|\bCORE\b/.test(cpu)) {
    entries.push({ id: "intelProcessor", ...HIGHLIGHT_PALETTE.intelProcessor });
  }

  if (/\bRTX\b|\bGEFORCE\b|\bNVIDIA\b/.test(gpu)) {
    entries.push({ id: "nvidiaGpu", ...HIGHLIGHT_PALETTE.nvidiaGpu });
  } else if (/\bRADEON\b|RX\s*[79]\b/.test(gpu)) {
    entries.push({ id: "amdGpu", ...HIGHLIGHT_PALETTE.amdGpu });
  }

  const readSpeeds = build.storage
    .map((item) => item.toUpperCase().match(/\bR:?\s*(7)\d{3}/))
    .filter((match): match is RegExpMatchArray => match !== null);

  if (readSpeeds.length > 0) {
    entries.push({ id: "ssdR7", ...HIGHLIGHT_PALETTE.ssdR7 });
  }

  if (
    build.ram.some((item) =>
      /\b6\d{3}\s*MHZ\b/i.test(item)
    )
  ) {
    entries.push({ id: "ram6000", ...HIGHLIGHT_PALETTE.ram6000 });
  }

  if (/80\s*\+\s*GOLD|80\s*PLUS\s*GOLD|\bGOLD\b/.test(psu)) {
    entries.push({ id: "goldPsu", ...HIGHLIGHT_PALETTE.goldPsu });
  }

  return entries;
}
