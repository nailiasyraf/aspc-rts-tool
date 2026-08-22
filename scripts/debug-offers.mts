import { writeFileSync } from "node:fs";

const html = await (
  await fetch("https://aftershockpc.com/ready-to-ship/desktops", {
    headers: { "user-agent": "Mozilla/5.0" },
  })
).text();

const names: string[] = [];
for (const block of html.matchAll(
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
)) {
  try {
    const d = JSON.parse(block[1]);
    if (d["@type"] !== "ItemList") continue;
    for (const el of d.itemListElement) {
      const p = el.item ?? el;
      if (p["@type"] === "Product") names.push(p.name);
    }
  } catch {
    // skip
  }
}

writeFileSync(
  "sp.txt",
  names.filter((n) => /special/i.test(n)).join("\n") +
    "\n---prefix formats---\n" +
    names
      .filter((n) => /[:]/.test(n))
      .map((n) => n.split("/")[0].trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .join("\n"),
  "utf8"
);
console.log("done");
