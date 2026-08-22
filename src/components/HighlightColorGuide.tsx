"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { HighlightEntry } from "@/lib/brochure/highlightGuide";
import { cn } from "@/lib/utils";

function CopyHexButton({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = hex;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
        copied
          ? "bg-emerald-500 text-zinc-950"
          : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "COPIED ✓" : "COPY"}
    </button>
  );
}

function ColorEntry({ entry }: { entry: HighlightEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
      <span
        aria-hidden
        className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/20"
        style={{ backgroundColor: entry.hex }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide text-zinc-200">
          {entry.label}
        </p>
        <p className="font-mono text-[11px] text-zinc-500">{entry.hex}</p>
      </div>
      <CopyHexButton hex={entry.hex} />
    </div>
  );
}

export function HighlightColorGuide({ entries }: { entries: HighlightEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="w-56 shrink-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        Highlight Color Guide
      </p>
      <div className="mt-2 space-y-1.5">
        {entries.map((entry) => (
          <ColorEntry key={entry.id} entry={entry} />
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
        Reference only — apply manually in Photoshop. Spec text stays white.
      </p>
    </div>
  );
}
