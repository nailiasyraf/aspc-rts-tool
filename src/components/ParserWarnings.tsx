"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ParserWarning } from "@/types/pc-build";
import { cn } from "@/lib/utils";

type ParserWarningsProps = {
  warnings: ParserWarning[];
  buildWarnings?: { name: string; warnings: string[] }[];
};

export function ParserWarnings({ warnings, buildWarnings = [] }: ParserWarningsProps) {
  const [open, setOpen] = useState(false);
  const count = warnings.length + buildWarnings.reduce((sum, b) => sum + b.warnings.length, 0);
  if (count === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-300 hover:bg-amber-500/20"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {count} {count === 1 ? "WARNING" : "WARNINGS"}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-96 w-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-2xl shadow-black/50">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parser Warnings
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {warnings.map((warning, i) => (
              <li
                key={i}
                className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300"
              >
                {warning.buildName && (
                  <span className="font-semibold text-zinc-100">{warning.buildName} — </span>
                )}
                {warning.message}
              </li>
            ))}
            {buildWarnings
              .filter((b) => b.warnings.length > 0)
              .map((b) =>
                b.warnings.map((warning, i) => (
                  <li
                    key={`${b.name}-${i}`}
                    className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300"
                  >
                    <span className="font-semibold text-zinc-100">{b.name} — </span>
                    {warning}
                  </li>
                ))
              )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WarningChip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-300"
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      {label}
    </span>
  );
}
