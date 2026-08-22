/**
 * Verification script: reads the sample workbook, parses the Marketing
 * sheet, and prints the normalized PCBuild[] JSON plus parser warnings.
 *
 * Usage: npx tsx scripts/verify-parser.mts [workbook.xlsx]
 */
import { readFileSync } from "node:fs";
import { readWorkbook, getMarketingSheet } from "../src/lib/xlsx/readWorkbook";
import { parseMarketingSheet } from "../src/lib/parser/parseMarketingSheet";
import { formatBrochureSpecs } from "../src/lib/brochure/formatBrochureSpecs";
import { usualPrice, formatPrice } from "../src/lib/pricing";

const workbookPath = process.argv[2] ?? "sample-optimal-builds.xlsx";

const buffer = readFileSync(workbookPath);
const read = readWorkbook(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
if (!read.ok) {
  console.error(read.message);
  process.exit(1);
}

const sheet = getMarketingSheet(read.workbook);
if (!sheet.ok) {
  console.error(sheet.message);
  process.exit(1);
}

const { builds, warnings } = parseMarketingSheet(sheet.sheet);

console.log("=== NORMALIZED PCBuild[] ===");
console.log(JSON.stringify(builds, null, 2));

console.log("\n=== BROCHURE OUTPUT (Level 1X Plus AMD) ===");
const target = builds.find((b) => b.name === "Level 1X Plus AMD");
if (target) {
  console.log(formatBrochureSpecs(target).join("\n"));
  console.log(
    `\nSale: ${formatPrice(target.salePrice!)}  Usual: ${formatPrice(usualPrice(target.salePrice!))}`
  );
}

console.log("\n=== PARSER WARNINGS ===");
if (warnings.length === 0) {
  console.log("None");
} else {
  for (const w of warnings) console.log(`- ${w.message}`);
}
