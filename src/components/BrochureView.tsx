"use client";

import type { PCBuild } from "@/types/pc-build";
import { formatBrochureSpecs } from "@/lib/brochure/formatBrochureSpecs";
import { chassisFamilyLabel } from "@/lib/brochure/chassisFamily";
import { usualPrice, formatPrice } from "@/lib/pricing";
import { CopySpecsButton } from "@/components/CopySpecsButton";
import { HighlightColorGuide } from "@/components/HighlightColorGuide";
import { LiveProductPanel } from "@/components/LiveProductPanel";
import { detectHighlights } from "@/lib/brochure/highlightGuide";

function PriceBlocks({ build }: { build: PCBuild }) {
  if (build.salePrice === undefined) {
    return (
      <div className="grid grid-cols-2">
        <div className="bg-zinc-200 px-3 py-3.5">
          <p className="text-sm text-zinc-500">—</p>
          <p className="mt-0.5 text-[9px] font-bold tracking-[0.14em] text-zinc-500">
            USUAL PRICE
          </p>
        </div>
        <div className="bg-zinc-200 px-3 py-3.5">
          <p className="text-sm text-zinc-500">—</p>
          <p className="mt-0.5 text-[9px] font-bold tracking-[0.14em] text-zinc-500">
            SALE PRICE
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2">
      {/* Usual price — grey block, black text, red diagonal strike */}
      <div className="relative overflow-hidden bg-zinc-200 px-5 py-5">
        <p className="text-3xl font-extrabold leading-none tabular-nums text-zinc-950">
          {formatPrice(usualPrice(build.salePrice))}
        </p>
        <p className="mt-1.5 text-[10px] font-bold tracking-[0.14em] text-zinc-800">
          USUAL PRICE
        </p>
        <span
          aria-hidden
          className="pointer-events-none absolute left-[-10%] top-1/2 h-[3px] w-[120%] -translate-y-1/2 -rotate-12 bg-red-600"
        />
      </div>
      {/* Sale price — red block, white text */}
      <div className="bg-red-600 px-5 py-5">
        <p className="text-3xl font-extrabold leading-none tabular-nums text-white">
          {formatPrice(build.salePrice)}
        </p>
        <p className="mt-1.5 text-[10px] font-bold tracking-[0.14em] text-white">
          SALE PRICE
        </p>
      </div>
    </div>
  );
}

function BrochureCard({ build }: { build: PCBuild }) {
  const specs = formatBrochureSpecs(build);
  const family = chassisFamilyLabel(build.chassis) || (build.section ?? "");
  const hasPrice = build.salePrice !== undefined;

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-sm bg-zinc-800 shadow-2xl shadow-black/60 ring-1 ring-black/40">
      {/* Header */}
      <div className="px-8 pt-9">
        {family && (
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
            {family.toUpperCase()}
          </p>
        )}
        <p className="mt-1.5 text-3xl font-extrabold uppercase leading-tight tracking-wide text-white">
          {build.name}
        </p>
      </div>

      {/* Specification area with thin vertical line */}
      <div className="px-8 py-8">
        {specs.length > 0 ? (
          <div className="border-l-2 border-zinc-100 pl-5">
            <ul className="space-y-2">
              {specs.map((line, i) => (
                <li
                  key={i}
                  className="text-[15px] font-bold uppercase leading-snug text-white"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No brochure specifications available for this build.
          </p>
        )}
      </div>

      {/* Pricing attached at bottom */}
      <div className={hasPrice ? "" : "mt-2"}>
        <PriceBlocks build={build} />
      </div>
    </div>
  );
}

export function BrochureView({ build }: { build: PCBuild }) {
  const specs = formatBrochureSpecs(build);
  const highlights = detectHighlights(build);

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      {/* Desktop: Live Product | Brochure Specs | Highlight Color Guide */}
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-4 lg:flex-row lg:items-start lg:justify-center">
        {/* Left — Live Product (secondary emphasis) */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-80">
          <LiveProductPanel build={build} />
        </div>

        {/* Center — Brochure Specs (main focus) */}
        <div className="order-1 flex w-full flex-col items-center lg:order-2 lg:flex-1">
          <BrochureCard build={build} />
          <div className="mt-8">
            <CopySpecsButton specs={specs} />
          </div>
        </div>

        {/* Right — Highlight Color Guide (compact reference) */}
        <div className="order-3 w-full shrink-0 lg:w-64">
          <HighlightColorGuide entries={highlights} />
        </div>
      </div>
    </div>
  );
}
