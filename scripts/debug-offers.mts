import { writeFileSync } from "node:fs";

const html = await (
  await fetch("https://aftershockpc.com/ready-to-ship/desktops", {
    headers: { "user-agent": "Mozilla/5.0" },
  })
).text();

const products: { name: string }[] = [];
for (const block of html.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
)) {
  try {
    const d = JSON.parse(block[1]);
    if (d["@type"] !== "ItemList") continue;
    for (const el of d.itemListElement) {
      const p = el.item ?? el;
      if (p["@type"] === "Product") products.push({ name: p.name });
    }
  } catch {
    // skip
  }
}

const names = products.map((p) => p.name.split("/")[0].trim());
const airflow = names.filter((n) => /airflow/i.test(n));
const uniqueFirstTokens = [...new Set(names.map((n) => n.split(/[\s:]/)[0]))];

writeFileSync(
  "af.txt",
  airflow.join("\n") +
    "\n---unique first tokens---\n" +
    uniqueFirstTokens.join(", ") +
    "\n",
  "utf8"
);
console.log("done");
