import { NextResponse } from "next/server";

export const revalidate = 300;

const SOURCE_URL = "https://aftershockpc.com/ready-to-ship/desktops";

export type LiveProduct = {
  name: string;
  image: string;
  url: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
};

export type LiveProductsResponse = {
  products: LiveProduct[];
  fetchedAt: string;
  error?: string;
};

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      const body: LiveProductsResponse = {
        products: [],
        fetchedAt: new Date().toISOString(),
        error: "Website could not be reached.",
      };
      return NextResponse.json(body);
    }

    const html = await response.text();
    const products: LiveProduct[] = [];

    // Compare-at (pre-discount) prices are not in JSON-LD — they only exist
    // in the DOM as strikethrough elements in each card's price block, which
    // appears just before the product link. Map product URL -> compare price.
    const compareAtByUrl = new Map<string, number>();
    for (const match of html.matchAll(
      /line-through">([\d,.]+)<\/div>[\s\S]{0,2000}?href="(\/products\/[^"]+)"/g
    )) {
      const href = match[2];
      if (compareAtByUrl.has(href)) continue;
      const compare = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(compare)) compareAtByUrl.set(href, compare);
    }

    for (const block of html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    )) {
      let data: unknown;
      try {
        data = JSON.parse(block[1]);
      } catch {
        continue;
      }
      const list = data as {
        "@type"?: string;
        itemListElement?: unknown[];
      };
      if (list["@type"] !== "ItemList" || !Array.isArray(list.itemListElement)) {
        continue;
      }
      for (const element of list.itemListElement) {
        const product = (element as { item?: unknown })?.item ?? element;
        const p = product as {
          "@type"?: string;
          name?: string;
          image?: string;
          url?: string;
          offers?: {
            price?: string;
            priceCurrency?: string;
            highPrice?: string;
          };
        };
        if (p["@type"] !== "Product" || !p.name || !p.url) continue;
        const price = Number.parseFloat(p.offers?.price ?? "");
        if (!Number.isFinite(price)) continue;
        // Look up the DOM strikethrough compare-at price for this product.
        const productPath = new URL(p.url).pathname;
        const domCompare = compareAtByUrl.get(productPath);
        const compareAtPrice =
          domCompare !== undefined && domCompare > price ? domCompare : undefined;
        products.push({
          name: p.name,
          image: p.image ?? "",
          url: p.url,
          price,
          compareAtPrice,
          currency: p.offers?.priceCurrency ?? "SGD",
        });
      }
    }

    const body: LiveProductsResponse = {
      products,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch {
    const body: LiveProductsResponse = {
      products: [],
      fetchedAt: new Date().toISOString(),
      error: "Website could not be reached.",
    };
    return NextResponse.json(body);
  }
}
