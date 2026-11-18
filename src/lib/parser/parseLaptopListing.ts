import { z } from "zod";
import type { LiveLaptop } from "@/types/live-laptop";

const productSchema = z.object({
  id: z.string(), title: z.string().min(1), handle: z.string().regex(/^[a-z0-9-]+$/),
  tags: z.array(z.string()), availableForSale: z.boolean(),
  priceRange: z.object({ minVariantPrice: z.object({ amount: z.string(), currencyCode: z.string().regex(/^[A-Z]{3}$/) }) }),
  images: z.object({ edges: z.array(z.object({ node: z.object({ url: z.string().url() }) })) }),
  variants: z.object({ edges: z.array(z.object({ node: z.object({
    price: z.object({ amount: z.string() }),
    compareAtPrice: z.object({ amount: z.string() }).nullable(),
  }) })) }),
});

/** Read JSON references from the page's Remix loader. Never execute page scripts.
 * JSON-LD contains the whole collection, so it cannot establish laptop membership.
 */
export function parseLaptopListing(html: string): LiveLaptop[] {
  const match = html.match(/window\.__remixContext\.streamController\.enqueue\(("(?:\\.|[^"\\])*")\)/);
  if (!match) throw new Error("Laptop category data is missing from the website.");
  const rawTable: unknown = JSON.parse(JSON.parse(match[1]));
  if (!Array.isArray(rawTable)) throw new Error("Laptop category data has changed.");
  const table: unknown[] = rawTable;

  // Resolve only the collection subtree; other loader entries include promises.
  function child(index: number, key: string): number {
    const value = table[index];
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid listing data.");
    const entry = Object.entries(value).find(([k]) => /^_\d+$/.test(k) && table[Number(k.slice(1))] === key);
    if (!entry || typeof entry[1] !== "number") throw new Error("Incomplete listing data.");
    return entry[1];
  }
  let index = 0;
  for (const key of ["loaderData", "routes/ready-to-ship.$handle", "criticalData", "collectionData", "collectionByHandle", "products"]) {
    index = child(index, key);
  }
  const memo = new Map<number, unknown>();
  function decode(ref: number, depth = 0): unknown {
    if (ref === -5) return null;
    if (!Number.isInteger(ref) || ref < 0 || ref >= table.length || depth > 40) throw new Error("Invalid listing reference.");
    if (memo.has(ref)) return memo.get(ref);
    const value = table[ref];
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      memo.set(ref, result);
      for (const item of value) {
        if (typeof item !== "number") throw new Error("Invalid listing array.");
        result.push(decode(item, depth + 1));
      }
      return result;
    }
    const result = Object.create(null) as Record<string, unknown>;
    memo.set(ref, result);
    for (const [key, item] of Object.entries(value)) {
      const name = table[Number(key.slice(1))];
      if (!/^_\d+$/.test(key) || typeof name !== "string" || typeof item !== "number") throw new Error("Invalid listing object.");
      result[name] = decode(item, depth + 1);
    }
    return result;
  }
  const collection = z.object({
    pageInfo: z.object({ hasNextPage: z.boolean() }),
    edges: z.array(z.object({ node: z.unknown() })),
  }).parse(decode(index));
  if (collection.pageInfo.hasNextPage) throw new Error("The website returned an incomplete laptop listing.");

  const products: LiveLaptop[] = [];
  const seen = new Set<string>();
  for (const { node } of collection.edges) {
    const tags = z.object({ tags: z.array(z.string()) }).parse(node).tags;
    if (!tags.some((tag) => tag.trim().toLowerCase() === "category:laptops")) continue;
    const product = productSchema.parse(node);
    if (seen.has(product.id)) continue;
    const price = Number(product.priceRange.minVariantPrice.amount);
    if (!Number.isFinite(price) || price <= 0) throw new Error("A laptop price is missing from the website.");
    const variant = product.variants.edges.find(({ node }) => Number(node.price.amount) === price)?.node;
    const compare = Number(variant?.compareAtPrice?.amount);
    const specs = tags.flatMap((tag) => {
      const spec = tag.match(/^specifications:([^:]+):([^:]+):(.+)$/i);
      return spec ? [{ order: spec[1], label: spec[2].replace(/-/g, " "), value: spec[3] }] : [];
    }).sort((a, b) => a.order.localeCompare(b.order, "en", { numeric: true }))
      .map(({ label, value }) => ({ label, value }));
    seen.add(product.id);
    products.push({
      id: product.id, name: product.title,
      url: `https://aftershockpc.com/products/${product.handle}`,
      image: product.images.edges[0]?.node.url ?? "",
      price, compareAtPrice: Number.isFinite(compare) && compare > price ? compare : null,
      currency: product.priceRange.minVariantPrice.currencyCode,
      available: product.availableForSale, specs,
    });
  }
  return products;
}
