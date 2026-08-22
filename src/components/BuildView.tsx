"use client";

import type { PCBuild } from "@/types/pc-build";
import { PricingPanel } from "@/components/PricingPanel";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { WarningChip } from "@/components/ParserWarnings";

function Field({
  label,
  values,
}: {
  label: string;
  values: (string | undefined)[] | string[];
}) {
  const present = values.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (present.length === 0) return null;
  return (
    <div className="border-b border-zinc-800/70 py-3.5 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {present.map((value, i) => (
          <p key={i} className="text-sm leading-relaxed text-zinc-100">
            {value}
          </p>
        ))}
      </div>
    </div>
  );
}

export function BuildView({ build }: { build: PCBuild }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-wide text-zinc-50">
          {build.name}
        </h2>
        {build.section && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {build.section}
          </p>
        )}
        {build.warnings.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {build.warnings.map((warning) => (
              <WarningChip key={warning} label={warning} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-5">
        <Field label="CPU" values={[build.cpu]} />
        <Field label="Graphics Card" values={[build.gpu]} />
        <Field label="Motherboard" values={[build.motherboard]} />
        <Field label="Cooler" values={[build.cooler]} />
        <Field label="RAM" values={build.ram} />
        <Field label="Storage" values={build.storage} />
        <Field label="PSU" values={[build.psu]} />
        <Field label="Chassis" values={[build.chassis]} />
        <Field label="Fans" values={build.fans} />
      </div>

      {build.notes.length > 0 && (
        <div className="mt-5 rounded-lg border border-zinc-800 border-dashed bg-zinc-900/20 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Notes
          </p>
          <ul className="mt-2 space-y-1">
            {build.notes.map((note, i) => (
              <li key={i} className="text-sm text-zinc-400">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <PricingPanel build={build} />
      </div>

      <div className="mt-5">
        <DiagnosticsPanel build={build} />
      </div>

      <p className="mt-6 text-[11px] text-zinc-600">
        Source: {build.sheetName}!{build.sourceColumn ?? "?"}
      </p>
    </div>
  );
}
