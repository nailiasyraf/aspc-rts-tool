"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { PCBuild } from "@/types/pc-build";
import {
  matchLiveProduct,
  type LiveProduct,
  type LiveProductsResponse,
} from "@/lib/liveProducts";

let cachedProducts: LiveProduct[] | null = null;
let fetchPromise: Promise<LiveProduct[]> | null = null;

async function loadProducts(): Promise<LiveProduct[]> {
  if (cachedProducts) return cachedProducts;
  if (!fetchPromise) {
    fetchPromise = fetch("/api/live-products")
      .then((response) => response.json() as Promise<LiveProductsResponse>)
      .then((data) => {
        cachedProducts = data.products;
        return data.products;
      })
      .catch(() => [] as LiveProduct[]);
  }
  return fetchPromise;
}

function formatWebsitePrice(product: LiveProduct): string {
  const formatted = Math.round(product.price).toLocaleString("en-US");
  return `${product.currency} $${formatted}`;
}

function formatComparePrice(product: LiveProduct): string {
  const formatted = Math.round(product.compareAtPrice!).toLocaleString("en-US");
  return `${product.currency} $${formatted}`;
}

export function LiveProductPanel({ build }: { build: PCBuild }) {
  const [products, setProducts] = useState<LiveProduct[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadProducts().then((list) => {
      setProducts(list);
      setFailed(list.length === 0);
    });
  }, []);

  const match = products ? matchLiveProduct(build, products) : null;

  return (
    <div className="flex w-full flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      <p className="border-b border-zinc-800 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        Live Product
      </p>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {products === null && !failed && (
          <p className="py-8 text-center text-xs text-zinc-500">
            Checking website...
          </p>
        )}

        {products !== null && !match && (
          <p className="py-8 text-center text-xs text-zinc-500">
            No matching product found on the website.
          </p>
        )}

        {match && (
          <>
            <div className="overflow-hidden rounded-md bg-zinc-950/60 ring-1 ring-zinc-800">
              {match.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.image}
                  alt={match.name}
                  className="aspect-square w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-zinc-700">
                  No image
                </div>
              )}
            </div>

            <p className="mt-3 text-sm font-semibold leading-snug text-zinc-100">
              {match.name.split("/")[0]?.trim() ?? match.name}
            </p>

            <p className="mt-1 text-xl font-bold tabular-nums text-amber-300">
              {formatWebsitePrice(match)}
            </p>

            {match.compareAtPrice !== undefined &&
              match.compareAtPrice > match.price && (
                <p className="mt-0.5 text-[11px] text-zinc-500 line-through decoration-zinc-600">
                  {formatComparePrice(match)}
                </p>
              )}

            <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live on website
            </p>

            <a
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              Open live product page
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}
