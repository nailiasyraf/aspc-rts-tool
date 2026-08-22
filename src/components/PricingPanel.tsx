"use client";

import type { PCBuild } from "@/types/pc-build";
import { usualPrice, formatPrice } from "@/lib/pricing";

export function PricingPanel({ build }: { build: PCBuild }) {
  if (build.salePrice === undefined) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          Pricing
        </p>
        <p className="mt-2 text-sm text-zinc-500">Sale Price not available</p>
      </div>
    );
  }

  const sale = build.salePrice;
  const usual = usualPrice(sale);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        Pricing
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Usual Price
          </p>
          <p className="mt-1 text-xl font-medium tabular-nums text-zinc-500 line-through decoration-zinc-600">
            {formatPrice(usual)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
            Sale Price
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-300">
            {formatPrice(sale)}
          </p>
        </div>
      </div>
    </div>
  );
}
