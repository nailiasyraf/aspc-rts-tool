/** Run: npx tsx scripts/verify-live-laptops.mts [listing.html] [workbook.xlsx] */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { parseLaptopListing } from "../src/lib/parser/parseLaptopListing";
import { matchLaptopTikTokProduct } from "../src/lib/laptops";
import { readTikTokPricing } from "../src/lib/parser/parseTikTokSheet";
import type { LiveLaptop } from "../src/types/live-laptop";

function page(nodes: unknown[], hasNextPage = false) {
  // Minimal reference-encoded loader fixture; no execution of website JavaScript.
  const table: unknown[] = [];
  function encode(value: unknown): number {
    const index = table.length;
    table.push(null);
    table[index] = Array.isArray(value) ? value.map(encode) : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [`_${encode(key)}`, encode(item)])) : value;
    return index;
  }
  encode({ loaderData: { "routes/ready-to-ship.$handle": { criticalData: { collectionData: { collectionByHandle: { products: {
    pageInfo: { hasNextPage }, edges: nodes.map((node) => ({ node })),
  } } } } } } });
  return `<script>window.__remixContext.streamController.enqueue(${JSON.stringify(JSON.stringify(table) + "\n")});</script>`;
}
const source = {
  id: "laptop-1", title: "Gigabyte Gaming A16 / i7 13620H + GeForce RTX 5050", handle: "demo-laptop",
  tags: ["category:LAPTOPS", "specifications:10:Weight:2 KG", "specifications:2:Display:16 inch", "specifications:1:CPU:Intel i7"],
  availableForSale: true,
  priceRange: { minVariantPrice: { amount: "1999.45", currencyCode: "SGD" } },
  images: { edges: [{ node: { url: "https://example.com/laptop.png" } }] },
  variants: { edges: [{ node: { price: { amount: "1999.45" }, compareAtPrice: { amount: "2199.95" } } }] },
};
const laptops = parseLaptopListing(page([source, { ...source, id: "desktop", tags: ["category:1440P GAMING"] }, source]));
assert.equal(laptops.length, 1, "Only laptop category members; deduplicate IDs");
assert.equal(laptops[0].price, 1999.45);
assert.equal(laptops[0].compareAtPrice, 2199.95);
assert.deepEqual(laptops[0].specs.map((spec) => spec.label), ["CPU", "Display", "Weight"]);
assert.equal(parseLaptopListing(page([{ ...source, availableForSale: false }]))[0].available, false);
assert.deepEqual(parseLaptopListing(page([])), []);
assert.throws(() => parseLaptopListing("<html>Only generic JSON-LD</html>"));
assert.throws(() => parseLaptopListing(page([source], true)), /incomplete/);
assert.throws(() => parseLaptopListing(page([{ ...source, priceRange: { minVariantPrice: { amount: "invalid", currencyCode: "SGD" } } }])));

const price = { id: "sheet-1", name: "Gaming A16 / i7 13620H + GeForce RTX 5050", websitePrice: null, activatedPrice: 1800.35, unactivatedPrice: null };
assert.equal(matchLaptopTikTokProduct(laptops[0], laptops, [price]), price);
assert.equal(matchLaptopTikTokProduct(laptops[0], laptops, []), null);
assert.equal(matchLaptopTikTokProduct(laptops[0], laptops, [price, { ...price, id: "duplicate" }]), null);
assert.equal(matchLaptopTikTokProduct(laptops[0], [...laptops, { ...laptops[0], id: "ambiguous" }], [price]), null);
for (const name of ["Gaming A16 / i7 13620H + GeForce RTX 5060", "Gaming A16 / i9 14900HX + GeForce RTX 5050", "Gaming A16 White / i7 13620H + GeForce RTX 5050", "Gaming A16 - RTX 5050"]) {
  assert.equal(matchLaptopTikTokProduct(laptops[0], laptops, [{ ...price, name }]), null, `Reject a different or incomplete configuration: ${name}`);
}
const master: LiveLaptop = { ...laptops[0], name: "GIGABYTE AORUS MASTER 16 Gen 2 / AMD Ryzen 9 8940HX + GeForce RTX 5070 Ti" };
const masterPrice = { ...price, name: "Aorus Master 16 (Gen 2) / AMD Ryzen 9 8940HX + GeForce RTX 5070 Ti" };
assert.equal(matchLaptopTikTokProduct(master, [master], [masterPrice]), masterPrice);
assert.equal(matchLaptopTikTokProduct(master, [master], [{ ...masterPrice, name: masterPrice.name.replace("Gen 2", "Gen 3") }]), null);
const eagle = { ...laptops[0], name: "Gigabyte Eagle (2026) / Ryzen 5 7533HS + GeForce RTX 4050" };
const eaglePrice = { ...price, name: "GIGABYTE EAGLE / Ryzen 5 7533HS + GeForce RTX 4050" };
assert.equal(matchLaptopTikTokProduct(eagle, [eagle], [eaglePrice]), eaglePrice);

if (process.argv[2]) {
  const live = parseLaptopListing(readFileSync(process.argv[2], "utf8"));
  assert.ok(live.length > 0);
  assert.ok(live.every((item) => item.price > 0 && item.url.startsWith("https://aftershockpc.com/products/")));
  console.log(`Website fixture: ${live.length} laptops.`);
  if (process.argv[3]) {
    const workbook = XLSX.read(readFileSync(process.argv[3]), { type: "buffer" });
    const prices = readTikTokPricing(workbook).products;
    const matched = live.filter((laptop) => matchLaptopTikTokProduct(laptop, live, prices));
    console.log(`Workbook: ${matched.length} safely matched laptop prices.`);
  }
}
console.log("Laptop category, prices, specifications, error handling and configuration matching checks passed.");
