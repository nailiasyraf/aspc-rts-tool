/**
 * Generates a sample workbook that mirrors the real "Marketing" worksheet
 * structure: builds arranged horizontally, divider columns, section
 * banners, duplicate RAM/FAN/Notes rows, ignored VARIANTS/Total rows.
 *
 * Usage: node scripts/make-sample-xlsx.mjs [out.xlsx]
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

const outPath = process.argv[2] ?? "sample-optimal-builds.xlsx";

// Each build: [name, cpu, gpu, mobo, cooler, ram1, ram2, ssd, psu, chassis, fan1, fan2, note1, note2, promo]
const amdBuilds = [
  [
    "Untouchable RTX Combo",
    "(P) AMD Ryzen 7 9800X3D | 8 Cores 16 Threads",
    "NVIDIA RTX 5080 Founders Edition 16GB",
    "ASUS ROG Strix B850-E Gaming WiFi",
    "Deepcool AK620 Digital",
    "32GB G.Skill Trident Z5 Neo RGB DDR5 6000MHz",
    "",
    "2TB Samsung 990 Pro Gen4 SSD",
    "850W Corsair RM850e 80+ Gold",
    "AFTERSHOCK Citadel 2026 Black",
    "3x 120mm ARGB Fans",
    "",
    "Use white chassis variant when requested",
    "",
    2999,
  ],
  [
    "Level 0 AMD",
    "(P) AMD Ryzen 5 8500G | 6 Cores 12 Threads",
    "",
    "Gigabyte B850M C WIFI7",
    "ID Cooling SE-214-XT V2",
    "16GB ADATA Lancer Blade RGB DDR5 6000MHz",
    "",
    "1TB Kingbank KP260 Plus Gen4 SSD",
    "550W Gigabyte 80+ Silver",
    "AFTERSHOCK Zeal-M 2026 Black",
    "",
    "",
    "",
    "",
    899,
  ],
  [
    "Level 1X Plus AMD",
    "(P) AMD Ryzen 7 7700 | 8 Cores 16 Threads",
    "Gigabyte RTX 5060 Windforce MAX OC - 8GB",
    "Gigabyte B850M C WIFI7",
    "ID Cooling SE-214-XT V2",
    "16GB ADATA Lancer Blade RGB DDR5 6000MHz",
    "",
    "1TB Kingbank KP260 Plus Gen4 SSD",
    "550W Gigabyte 80+ Silver",
    "AFTERSHOCK Zeal-M 2026 Black",
    "",
    "",
    "",
    "",
    1010.13,
  ],
  [
    "Level 2 AMD",
    "(P) AMD Ryzen 7 7700X | 8 Cores 16 Threads",
    "ASUS Dual RTX 5070 12GB",
    "MSI B850 Gaming Plus WiFi",
    "Thermalright Peerless Assassin 120 SE",
    "32GB Kingston Fury Beast RGB DDR5 6000MHz",
    "",
    "1TB WD Black SN770 Gen4 SSD",
    "750W MSI MAG A750GL 80+ Gold",
    "AFTERSHOCK Citadel 2026 White",
    "3x 120mm ARGB Fans",
    "1x Rear 120mm Fan",
    "Change SSD when KP260 unavailable",
    "",
    1749,
  ],
];

const intelBuilds = [
  [
    "Level 0 Intel",
    "(P) Intel Core i5-13400F | 10 Cores 16 Threads",
    "",
    "MSI PRO B760M-A WiFi",
    "ID Cooling SE-214-XT V2",
    "16GB Klevv Bolt X DDR4 3600MHz",
    "",
    "1TB Kingbank KP260 Plus Gen4 SSD",
    "550W Gigabyte 80+ Silver",
    "AFTERSHOCK Zeal-M 2026 Black",
    "",
    "",
    "",
    "",
    899,
  ],
  [
    "Level 1 Intel",
    "(P) Intel Core i5-14600KF | 14 Cores 20 Threads",
    "Gigabyte RTX 5060 Ti Gaming OC 16GB",
    "Gigabyte B760M Aorus Elite X AX Ice",
    "Deepcool AK500",
    "32GB ADATA Lancer Blade RGB DDR5 6000MHz",
    "",
    "1TB Samsung 980 Pro Gen4 SSD",
    "650W Cooler Master MWE Gold 650 V2",
    "AFTERSHOCK Citadel 2026 Black",
    "2x 120mm ARGB Fans",
    "",
    "",
    "",
    1599,
  ],
  [
    "Level 2 Intel",
    "(P) Intel Core i7-14700KF | 20 Cores 28 Threads",
    "MSI Ventus RTX 5070 Ti 16GB",
    "MSI MAG B760 Tomahawk WiFi",
    "Deepcool AK620 Digital",
    "32GB G.Skill Trident Z5 RGB DDR5 6400MHz",
    "",
    "2TB Samsung 990 Pro Gen4 SSD",
    "850W Corsair RM850e 80+ Gold",
    "AFTERSHOCK Citadel 2026 Black",
    "3x 120mm ARGB Fans",
    "1x Rear 120mm Fan",
    "",
    "Include keyboard promo while stock lasts",
    2449,
  ],
  [
    "Level 3 Intel",
    "(P) Intel Core i9-14900K | 24 Cores 32 Threads",
    "ASUS TUF RTX 5080 16GB",
    "ASUS ROG Strix Z790-A Gaming WiFi II",
    "Cooler Master MasterLiquid 360 ATMOS",
    "64GB Corsair Vengeance RGB DDR5 6000MHz",
    "",
    "2TB Samsung 990 Pro Gen4 SSD",
    "1000W Seasonic Focus GX-1000 80+ Gold",
    "AFTERSHOCK Citadel Ultra 2026 Black",
    "3x 120mm ARGB Fans",
    "1x Rear 140mm Fan",
    "",
    "",
    "N/A",
  ],
];

const rowLabels = [
  "Name",
  "CPU",
  "GRAPHICS CARD",
  "MOBO",
  "Cooler",
  "RAM",
  "RAM",
  "SSD",
  "PSU",
  "CHASSIS",
  "FAN",
  "FAN",
  "Notes",
  "Notes",
  "Promo Price",
];

function buildSheet() {
  const matrix = [];
  // Title row
  matrix.push(["Marketing Build Matrix", ...Array(20).fill(null)]);
  // Section banner: AMD
  matrix.push(["AMD Optimal Builds", ...Array(20).fill(null)]);

  const amdRows = rowLabels.map((label, i) => {
    const row = [label];
    amdBuilds.forEach((build) => {
      row.push(build[i]);
      row.push(null); // divider column between builds
    });
    return row;
  });
  amdRows.forEach((r) => matrix.push(r));

  // Ignored rows
  matrix.push(["VARIANTS", ...amdBuilds.flatMap(() => ["16GB / 32GB", null])]);
  matrix.push(["VARIANTS", ...amdBuilds.flatMap(() => [null, null])]);
  matrix.push(["Red Top Tab", ...amdBuilds.flatMap(() => [null, null])]);
  matrix.push(["Total USD", ...amdBuilds.flatMap(() => [1234, null])]);
  matrix.push(["SGD w tax", ...amdBuilds.flatMap(() => [1685, null])]);

  // Section banner: Intel
  matrix.push(["Intel Optimal Builds", ...Array(20).fill(null)]);

  const intelRows = rowLabels.map((label, i) => {
    const row = [label];
    intelBuilds.forEach((build) => {
      row.push(build[i]);
      row.push(null);
    });
    return row;
  });
  intelRows.forEach((r) => matrix.push(r));

  matrix.push(["VARIANTS", ...intelBuilds.flatMap(() => [null, null])]);
  matrix.push(["Total USD", ...intelBuilds.flatMap(() => [null, null])]);

  return XLSX.utils.aoa_to_sheet(matrix);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, buildSheet(), "Marketing");
// Decoy sheets that must be ignored
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([["Internal Pricing"], ["GPU", "Cost"]]),
  "Costing"
);
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([["Logistics"]]),
  "Shipping"
);

writeFileSync(outPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Wrote ${outPath}`);
