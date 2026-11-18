import type { TikTokProduct } from "@/types/tiktok-pricing";
import { formatTikTokPrice } from "@/lib/tiktokPricing";

export function TikTokPricingPanel({ product }: { product: TikTokProduct }) {
  const prices = [
    { label: "Website Price", value: product.websitePrice },
    { label: "TikTok Price (Activated)", value: product.activatedPrice },
    { label: "TikTok Price (Unactivated)", value: product.unactivatedPrice },
  ];

  return (
    <section aria-labelledby="tiktok-pricing-heading" className="mt-8 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900/40">
      <h2 id="tiktok-pricing-heading" className="border-b border-zinc-800 px-5 py-4 text-sm font-semibold text-zinc-100">
        TikTok Pricing
      </h2>
      <dl className="px-5">
        <div className="border-b border-zinc-800 py-4">
          <dt className="text-xs text-zinc-400">Name</dt>
          <dd className="mt-1 break-words text-sm font-medium leading-6 text-zinc-100">{product.name}</dd>
        </div>
        {prices.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-zinc-800 py-3 last:border-0">
            <dt className="text-sm leading-6 text-zinc-300">{label}</dt>
            <dd className={`shrink-0 text-right text-sm font-semibold leading-6 tabular-nums ${value === null ? "text-zinc-400" : label === "TikTok Price (Activated)" ? "text-amber-300" : "text-zinc-100"}`}>
              {formatTikTokPrice(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
