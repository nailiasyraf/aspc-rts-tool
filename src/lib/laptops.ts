import type { LiveLaptop } from "@/types/live-laptop";
import type { TikTokProduct } from "@/types/tiktok-pricing";

export const LAPTOP_LISTING_URL = "https://aftershockpc.com/ready-to-ship/desktops?category=laptops&custom_yes=1";

/** Group listing model names without merging generations or editions. */
export function groupLaptopsByModel(products: LiveLaptop[]): { model: string; products: LiveLaptop[] }[] {
  const groups = new Map<string, { model: string; products: LiveLaptop[] }>();
  for (const product of products) {
    const model = product.name.split("/")[0].trim() || product.name;
    const key = model.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
    const group = groups.get(key);
    if (group) group.products.push(product);
    else groups.set(key, { model, products: [product] });
  }
  // Retain the website's model order, with variants ordered by price.
  return Array.from(groups.values(), (group) => ({
    ...group, products: group.products.sort((a, b) => a.price - b.price),
  }));
}

// Only cosmetic brand/format differences are allowed; retain the complete
// configuration, colour, generation and suffixes. Desktop matching is unchanged.
function laptopKey(name: string): string {
  return name.normalize("NFKC").toLowerCase()
    .replace(/^(?:gigabyte|aftershock)\s+/, "")
    // This listing labels the Eagle's 7533HS/4050 configuration as (2026).
    .replace(/^eagle\s*\(2026\)(?=\s*\/\s*ryzen 5 7533hs\s*\+\s*geforce rtx 4050\s*$)/, "eagle")
    .replace(/[()]/g, " ")
    .replace(/\s*([/+])\s*/g, "$1")
    .replace(/\s+/g, " ").trim();
}

export function matchLaptopTikTokProduct(
  laptop: LiveLaptop,
  laptops: LiveLaptop[],
  prices: TikTokProduct[],
): TikTokProduct | null {
  const key = laptopKey(laptop.name);
  if (laptops.filter((item) => laptopKey(item.name) === key).length !== 1) return null;
  const matches = prices.filter((item) => laptopKey(item.name) === key);
  return matches.length === 1 ? matches[0] : null;
}

export function formatLaptopPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency }).format(value);
}
