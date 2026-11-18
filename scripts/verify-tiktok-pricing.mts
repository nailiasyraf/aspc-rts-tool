/** Run: npx tsx scripts/verify-tiktok-pricing.mts [workbook.xlsx] */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { parseTikTokSheet, readTikTokPricing } from "../src/lib/parser/parseTikTokSheet";
import { formatTikTokPrice, matchTikTokProduct } from "../src/lib/tiktokPricing";
import { parseMarketingSheet } from "../src/lib/parser/parseMarketingSheet";
import { formatBrochureSpecs } from "../src/lib/brochure/formatBrochureSpecs";

const sheet = XLSX.utils.aoa_to_sheet([
  ["Name", "Demo PC / CPU A + GPU A", null, "Website only", "Invalid", "RAM only", "Partial PC"],
  [".com Selling Price (Unactivated)", 1000, null, 500, 700, 800],
  ["TikTok Price (Activated)", 950.45, null, null, "#VALUE!"],
  ["TikTok Price (Unactivated)", 850.35, null, null, 0, null, "S$1,200.50"],
  ["Listing Price (Activated)", 1100, null, 600],
  ["TikTok Price (Upgrade RAM)", 1050, null, null, null, 900],
  ["Laptop"],
  [" Name ", "Demo laptop / CPU B + GPU B", null, "Duplicate", "Duplicate", "Uncached formula"],
  ["TikTok Price\n(Activated)", 900.55, null, "SGD 1,500.25", 1600],
  [".com Selling Price (Activated)", 1050, null, 1700, 1800],
]);
sheet.F9 = { t: "n", f: "1+1000" };
const { products } = parseTikTokSheet(sheet);
assert.deepEqual(products.map((p) => p.name), ["Demo PC / CPU A + GPU A", "Partial PC", "Demo laptop / CPU B + GPU B", "Duplicate", "Duplicate"]);
assert.deepEqual(products[0], {
  id: "tiktok-1-2", name: "Demo PC / CPU A + GPU A",
  websitePrice: 1000, activatedPrice: 950.45, unactivatedPrice: 850.35,
});
assert.equal(products[1].unactivatedPrice, 1200.5);
assert.equal(products[2].websitePrice, null, "Never substitute the activated website price");
assert.equal(products[2].unactivatedPrice, null, "Never borrow a previous block's unactivated price");
assert.equal(products[3].activatedPrice, 1500.25);
assert.equal(new Set(products.map((p) => p.id)).size, products.length);
assert.equal(formatTikTokPrice(950.45), "$950.45");
assert.equal(formatTikTokPrice(950), "$950.00");
assert.equal(formatTikTokPrice(null), "Not available");
assert.equal(matchTikTokProduct({ name: "  DEMO PC / CPU A  + GPU A " }, products), products[0]);
assert.equal(matchTikTokProduct({ name: "Special Demo PC / CPU A + GPU A" }, products), null);
assert.equal(matchTikTokProduct({ name: "Demo PC / CPU A + GPU B" }, products), null);
assert.equal(matchTikTokProduct({ name: "Demo PC" }, products), null);
assert.equal(matchTikTokProduct({ name: "Duplicate" }, products), null);
assert.equal(matchTikTokProduct({ name: "Unlisted" }, products), null);
assert.equal(parseTikTokSheet(XLSX.utils.aoa_to_sheet([["Name", "No price"]])).products.length, 0);
assert.equal(parseTikTokSheet(XLSX.utils.aoa_to_sheet([["Unknown layout"]])).warnings.length, 1);
assert.deepEqual(readTikTokPricing(XLSX.utils.book_new()), { products: [], warnings: [] });

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, " TikTok Price ");
assert.equal(readTikTokPricing(workbook).products.length, 5);

// Compare the original Marketing parser and brochure output before/after optional pricing reads.
const sample = XLSX.read(readFileSync("sample-optimal-builds.xlsx"), { type: "buffer" });
const baseline = parseMarketingSheet(sample.Sheets.Marketing);
const specsBefore = baseline.builds.map(formatBrochureSpecs);
assert.deepEqual(readTikTokPricing(sample), { products: [], warnings: [] });
assert.deepEqual(parseMarketingSheet(sample.Sheets.Marketing), baseline);
assert.deepEqual(baseline.builds.map(formatBrochureSpecs), specsBefore);

if (process.argv[2]) {
  const source = XLSX.read(readFileSync(process.argv[2]), { type: "buffer" });
  const before = JSON.stringify(source);
  const pricing = readTikTokPricing(source);
  const builds = parseMarketingSheet(source.Sheets.Marketing).builds;
  assert.ok(pricing.products.length > 0, "Expected TikTok prices in the supplied workbook");
  let matched = 0;
  for (const build of builds) {
    const match = matchTikTokProduct(build, pricing.products);
    const normalize = (name: string) => name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
    const exact = pricing.products.filter((p) => normalize(p.name) === normalize(build.name));
    assert.equal(match, exact.length === 1 ? exact[0] : null);
    if (match) matched++;
  }
  assert.ok(matched > 0, "Expected some Marketing builds to match TikTok pricing");
  assert.equal(JSON.stringify(source), before, "Parsing must not mutate the workbook");
  console.log(`Source check: ${pricing.products.length} priced products; ${matched}/${builds.length} Marketing builds match uniquely.`);
}
console.log("TikTok parsing, conservative matching, missing-sheet compatibility and Marketing/brochure regression checks passed.");
