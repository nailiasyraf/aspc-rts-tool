import { matchLiveProduct, type LiveProduct } from "../src/lib/liveProducts";
import { writeFileSync } from "node:fs";

const html = await (
  await fetch("https://aftershockpc.com/ready-to-ship/desktops", {
    headers: { "user-agent": "Mozilla/5.0" },
  })
).text();

const products: LiveProduct[] = [];
for (const block of html.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
)) {
  try {
    const data = JSON.parse(block[1]);
    if (data["@type"] !== "ItemList") continue;
    for (const el of data.itemListElement) {
      const p = el.item ?? el;
      if (p["@type"] !== "Product" || !p.name || !p.url) continue;
      const price = parseFloat(p.offers?.price ?? "NaN");
      if (!Number.isFinite(price)) continue;
      products.push({
        name: p.name,
        image: p.image ?? "",
        url: p.url,
        price,
        currency: p.offers?.priceCurrency ?? "SGD",
      });
    }
  } catch {
    // skip
  }
}

const mk = (o: Partial<import("../src/types/pc-build").PCBuild>) => ({
  id: "x",
  name: "X",
  ram: [],
  storage: [],
  fans: [],
  notes: [],
  sheetName: "Marketing" as const,
  raw: {},
  warnings: [],
  ...o,
});

// Real failure modes: same name, stale website config.
const testBuilds = [
  mk({ name: "Level 0 AMD", cpu: "AMD Ryzen 5 7500F", gpu: "GeForce RTX 5060 8GB" }),
  mk({ name: "Level 4X AMD", cpu: "AMD Ryzen 9 9950X3D", gpu: "Gigabyte RTX 5090 32GB" }),
  mk({ name: "Level 1 Intel", cpu: "Intel Core i5 14400F", gpu: "GeForce RTX 5060 8GB" }),
  mk({ name: "Level 3 AMD", cpu: "AMD Ryzen 5 7500F", gpu: "GeForce RTX 5060 Ti 16GB" }),
  mk({ name: "Level 8X AMD", cpu: "AMD Ryzen 7 9700X", gpu: "ASUS RTX 5070 Ti Prime OC 16GB" }),
  mk({ name: "Level 8 X3D Gaming", cpu: "AMD Ryzen 7 9800X3D", gpu: "RTX 5070 Ti 16GB" }),
  // SPECIAL variants: must pick the Special-prefixed product, not the plain one.
  mk({ name: "Special Level 8 X3D Gaming", cpu: "AMD Ryzen 7 9800X3D", gpu: "GeForce RTX 5070 Ti 16GB" }),
  mk({ name: "Special AMD X3D Level 8X", cpu: "AMD Ryzen 7 9800X3D", gpu: "Radeon RX 9070 XT" }),
  // Plain variant must NOT steal the Special product.
  mk({ name: "AMD X3D Level 8X", cpu: "AMD Ryzen 7 9800X3D", gpu: "Radeon RX 9070 XT" }),
  // Genuinely absent product.
  mk({ name: "Level 2 Intel", cpu: "Intel Core i5 14400F", gpu: "RTX 5060 Ti" }),
  // Different name, different components — must NOT match.
  mk({ name: "Weird Build XYZ", cpu: "AMD Ryzen 7 7700", gpu: "Gigabyte RTX 5060 8GB" }),
  // Fuzzy name with both components matching — should match.
  mk({ name: "Untouchable RTX Combo", cpu: "AMD Ryzen 5 7500F", gpu: "GeForce RTX 3050" }),
  // Fuzzy name with no component match — must NOT match.
  mk({ name: "Untouchable RTX Combo", cpu: "AMD Ryzen 7 9800X3D", gpu: "RTX 5080 16GB" }),
];

let out = `products: ${products.length}\n`;
for (const build of testBuilds) {
  const m = matchLiveProduct(build, products);
  out += `${build.name.padEnd(26)} [${build.cpu} | ${build.gpu}] -> ${
    m ? m.name : "NO MATCH"
  }\n`;
}
writeFileSync("live-debug-out.txt", out, "utf8");
console.log("done");
