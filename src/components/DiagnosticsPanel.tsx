"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import type { PCBuild } from "@/types/pc-build";

const TRACKED_FIELDS: { key: string; label: string }[] = [
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "GPU" },
  { key: "motherboard", label: "Motherboard" },
  { key: "cooler", label: "Cooler" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Storage" },
  { key: "psu", label: "PSU" },
  { key: "chassis", label: "Chassis" },
  { key: "fans", label: "Fans" },
  { key: "salePrice", label: "Sale Price" },
];

function hasField(build: PCBuild, key: string): boolean {
  if (key === "salePrice") return build.salePrice !== undefined;
  const value = (build as unknown as Record<string, unknown>)[key];
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.length > 0;
}

export function DiagnosticsPanel({ build }: { build: PCBuild }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
      >
        <Bug className="h-3.5 w-3.5" />
        Diagnostics
        <span className="ml-auto text-zinc-600">{open ? "—" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-zinc-800 px-4 py-4 text-xs">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Source
            </p>
            <p className="font-mono text-zinc-300">
              {build.sheetName}!{build.sourceColumn ?? "?"}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Detected Fields
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {TRACKED_FIELDS.map((field) => (
                <p
                  key={field.key}
                  className={
                    hasField(build, field.key)
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  }
                >
                  {hasField(build, field.key) ? "✓" : "✗"} {field.label}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Warnings
            </p>
            {build.warnings.length === 0 ? (
              <p className="text-zinc-500">None</p>
            ) : (
              <ul className="space-y-1 text-amber-300">
                {build.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Raw Values
            </p>
            <pre className="max-h-72 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
              {JSON.stringify(build.raw, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
