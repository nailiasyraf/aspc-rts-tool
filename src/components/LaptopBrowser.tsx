"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { LiveLaptopsResponse } from "@/types/live-laptop";
import type { TikTokProduct } from "@/types/tiktok-pricing";
import { LAPTOP_LISTING_URL, formatLaptopPrice, groupLaptopsByModel, matchLaptopTikTokProduct } from "@/lib/laptops";
import { CopySpecsButton } from "@/components/CopySpecsButton";
import { TikTokPricingPanel } from "@/components/TikTokPricingPanel";

export function LaptopBrowser({ tiktokProducts, pricingFileName }: {
  tiktokProducts: TikTokProduct[];
  pricingFileName: string | null;
}) {
  const [data, setData] = useState<LiveLaptopsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/live-laptops", { signal: controller.signal, cache: "no-store" });
        const result: LiveLaptopsResponse = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || "Could not load the laptop listing. Try again.");
        if (!controller.signal.aborted) setData(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the laptop listing. Try again.");
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  const loading = data === null && error === null;
  const products = data?.products ?? [];
  const filtered = products.filter((product) => `${product.name} ${product.specs.map((spec) => spec.value).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = groupLaptopsByModel(filtered);
  const selected = filtered.find((product) => product.id === selectedId) ?? groups[0]?.products[0] ?? null;
  const pricing = selected ? matchLaptopTikTokProduct(selected, products, tiktokProducts) : null;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Laptop brochures</h2>
          <p className="mt-1 text-sm text-zinc-400">Live laptops from the website. Spreadsheet pricing is optional.</p>
          {data && <p className="mt-1 text-xs text-zinc-400">{products.length} laptops · Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href={LAPTOP_LISTING_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-zinc-300 underline underline-offset-4 hover:text-white">Website listing <ExternalLink size={14} /></a>
          <button disabled={loading} onClick={() => { setData(null); setError(null); setRevision((value) => value + 1); }} className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"><RefreshCw size={14} />Refresh laptops</button>
        </div>
      </div>
      {loading && <p role="status" className="p-8 text-sm text-zinc-300">Loading laptops from the website…</p>}
      {error && <p role="alert" className="m-6 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {data && products.length === 0 && <p className="p-8 text-sm text-zinc-300">No laptops are listed in this website category right now.</p>}
      {data && products.length > 0 && <div className="flex flex-col md:flex-row">
        <aside aria-label="Laptop selection" className="w-full shrink-0 border-b border-zinc-800 md:w-80 md:border-b-0 md:border-r">
          <div className="p-4">
            <label htmlFor="laptop-search" className="mb-2 block text-sm text-zinc-300">Search laptops</label>
            <input id="laptop-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Model, CPU, GPU…" className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-2 focus:outline-amber-400" />
            <p role="status" className="mt-2 text-xs text-zinc-400">{filtered.length} of {products.length} laptops</p>
          </div>
          <div className="max-h-72 overflow-y-auto md:max-h-[calc(100vh-300px)]">
            {groups.map((group) => <section key={group.model} aria-label={group.model}>
              <h3 className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold leading-6 text-zinc-100">{group.model}</h3>
              <ul>
                {group.products.map((product) => <li key={product.id}>
                  <button aria-label={product.name} aria-pressed={selected?.id === product.id} onClick={() => setSelectedId(product.id)} className={`w-full border-t border-zinc-800 px-4 py-4 text-left transition-colors hover:bg-zinc-800 ${selected?.id === product.id ? "bg-zinc-800 text-amber-200" : "text-zinc-200"}`}>
                    <span className="block text-sm font-medium leading-6">{product.name.includes("/") ? product.name.slice(product.name.indexOf("/") + 1).trim() || product.name : product.name}</span>
                    <span className="mt-1 block text-xs tabular-nums text-zinc-400">{formatLaptopPrice(product.price, product.currency)}</span>
                  </button>
                </li>)}
              </ul>
            </section>)}
          </div>
        </aside>
        <div className="min-w-0 flex-1 p-5 lg:p-8">
          {!selected && <p className="text-sm text-zinc-300">No laptops match your search. Try another model or clear the search.</p>}
          {selected && <div className="mx-auto max-w-4xl">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                {selected.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.image} alt={selected.name} className="aspect-square w-full rounded-lg bg-zinc-900 object-contain" />
                )}
                <p className="mt-4 text-sm text-zinc-400">Website price · {selected.currency}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-300">{formatLaptopPrice(selected.price, selected.currency)}</p>
                {selected.compareAtPrice !== null && <p className="mt-1 text-sm tabular-nums text-zinc-400"><span className="sr-only">Website original price </span><s>{formatLaptopPrice(selected.compareAtPrice, selected.currency)}</s></p>}
                {!selected.available && <p className="mt-2 text-sm text-zinc-300">Currently unavailable on the website</p>}
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-200 underline underline-offset-4 hover:text-white">Open live product page <ExternalLink size={14} /></a>
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-xl font-bold leading-8 text-zinc-100">{selected.name}</h3>
                <dl className="mt-5 divide-y divide-zinc-800">
                  {selected.specs.map((spec, index) => <div key={`${spec.label}-${index}`} className="py-3">
                    <dt className="text-xs capitalize text-zinc-400">{spec.label}</dt>
                    <dd className="mt-1 text-sm leading-6 text-zinc-100">{spec.value}</dd>
                  </div>)}
                </dl>
                {selected.specs.length > 0 ? <div className="mt-6"><CopySpecsButton specs={selected.specs.map((spec) => spec.value)} /></div> : <p className="mt-4 text-sm text-zinc-400">Specifications are not available in the website listing.</p>}
                {pricing ? <>
                  <TikTokPricingPanel product={pricing} />
                  <p className="mt-3 break-words text-xs leading-5 text-zinc-400">TikTok comparison from {pricingFileName}. Its Website Price is the spreadsheet’s unactivated price; the live website price is shown separately.</p>
                </> : <p className="mt-6 text-sm leading-6 text-zinc-400">{pricingFileName ? "No matching TikTok price in the spreadsheet." : "Connect Google Sheets or upload an XLSX with a TikTok Price tab to show matching TikTok prices."}</p>}
              </div>
            </div>
          </div>}
        </div>
      </div>}
    </main>
  );
}
