import type { PCBuild } from "@/types/pc-build";
import type { TikTokProduct } from "@/types/tiktok-pricing";

function productKey(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Full names include configurations. Never borrow prices from a similar variant. */
export function matchTikTokProduct(
  build: Pick<PCBuild, "name">,
  products: TikTokProduct[]
): TikTokProduct | null {
  const key = productKey(build.name);
  const matches = products.filter((product) => productKey(product.name) === key);
  // Ambiguous duplicate names need correction in the source before showing a price.
  return matches.length === 1 ? matches[0] : null;
}

// Preserve cents without changing the existing brochure price rounding.
export function formatTikTokPrice(value: number | null): string {
  return value === null ? "Not available" : `$${value.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
