"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "build" | "brochure";

type ViewSwitcherProps = {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
};

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  const options: { key: ViewMode; label: string }[] = [
    { key: "build", label: "BUILD VIEW" },
    { key: "brochure", label: "BROCHURE VIEW" },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={cn(
            "rounded px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors",
            view === option.key
              ? "bg-zinc-700/80 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
