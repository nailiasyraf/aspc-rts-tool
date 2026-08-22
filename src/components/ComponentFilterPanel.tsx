"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import type { PCBuild } from "@/types/pc-build";
import {
  FILTERABLE_FIELDS,
  deriveComponentOptions,
  type ComponentFilter,
  type FilterableField,
} from "@/lib/componentFilter";
import { cn } from "@/lib/utils";

type ComponentFilterPanelProps = {
  /** All builds — options are derived from the full dataset. */
  builds: PCBuild[];
  filter: ComponentFilter | null;
  onChange: (filter: ComponentFilter | null) => void;
};

export function ComponentFilterPanel({
  builds,
  filter,
  onChange,
}: ComponentFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterableField>(
    filter?.field ?? "cpu"
  );
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => deriveComponentOptions(builds, field),
    [builds, field]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const activeFieldLabel = filter
    ? FILTERABLE_FIELDS.find((f) => f.key === filter.field)?.label
    : null;

  function selectOption(value: string) {
    if (filter && filter.field === field && filter.value === value) {
      onChange(null);
    } else {
      onChange({ field, value });
    }
    setOpen(false);
    setQuery("");
  }

  function switchField(next: FilterableField) {
    setField(next);
    setQuery("");
  }

  return (
    <div className="mt-3">
      {/* Active filter chip */}
      {filter && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
            <span className="font-semibold">{activeFieldLabel}:</span>
            <span className="truncate">{filter.value}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-0.5 shrink-0 rounded text-amber-400/70 hover:text-amber-200"
              aria-label="Remove filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
          open
            ? "border-zinc-600 bg-zinc-800 text-zinc-100"
            : "border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filter by component
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5">
          {/* Category chips */}
          <div className="flex flex-wrap gap-1">
            {FILTERABLE_FIELDS.map((category) => {
              const count = deriveComponentOptions(builds, category.key).length;
              if (count === 0) return null;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => switchField(category.key)}
                  className={cn(
                    "rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    field === category.key
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  )}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Model search */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${FILTERABLE_FIELDS.find((f) => f.key === field)?.label ?? ""}...`}
            className="mt-2.5 w-full rounded border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600"
          />

          {/* Model list */}
          <ul className="mt-2 max-h-52 space-y-0.5 overflow-y-auto">
            {filteredOptions.map((option) => {
              const isSelected =
                filter?.field === field && filter.value === option;
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => selectOption(option)}
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-amber-400/15 text-amber-300"
                        : "text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    {isSelected && <span className="mr-1 text-amber-400">✓</span>}
                    {option}
                  </button>
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="px-2 py-2 text-xs text-zinc-500">
                No components match this search.
              </li>
            )}
          </ul>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2">
            <p className="text-[10px] text-zinc-600">
              {filteredOptions.length} of {options.length} models
            </p>
            {filter && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
