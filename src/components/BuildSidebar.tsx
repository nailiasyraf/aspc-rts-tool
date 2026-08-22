"use client";

import type { PCBuild } from "@/types/pc-build";
import type { ComponentFilter } from "@/lib/componentFilter";
import { ComponentFilterPanel } from "@/components/ComponentFilterPanel";
import { cn } from "@/lib/utils";

type BuildSidebarProps = {
  /** All builds — component filter options derive from the full dataset. */
  allBuilds: PCBuild[];
  /** Builds after search + component filter are applied. */
  builds: PCBuild[];
  selectedId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  componentFilter: ComponentFilter | null;
  onComponentFilterChange: (filter: ComponentFilter | null) => void;
};

export function BuildSidebar({
  allBuilds,
  builds,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  componentFilter,
  onComponentFilterChange,
}: BuildSidebarProps) {
  const groups = new Map<string, PCBuild[]>();
  for (const build of builds) {
    const section = build.section ?? "Ungrouped Builds";
    const list = groups.get(section) ?? [];
    list.push(build);
    groups.set(section, list);
  }

  const hasActiveSearch = query.trim().length > 0;
  const hasActiveFilter = componentFilter !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800 p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search builds..."
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-600"
        />
        <ComponentFilterPanel
          builds={allBuilds}
          filter={componentFilter}
          onChange={onComponentFilterChange}
        />
        {(hasActiveSearch || hasActiveFilter) && (
          <p className="mt-2 text-[11px] text-zinc-500">
            {builds.length} {builds.length === 1 ? "build" : "builds"} found
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {builds.length === 0 && (
          <p className="px-2 py-4 text-xs text-zinc-500">
            No builds match this search.
          </p>
        )}
        {[...groups.entries()].map(([section, sectionBuilds]) => (
          <div key={section} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {section}
            </p>
            <ul>
              {sectionBuilds.map((build) => (
                <li key={build.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(build.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-left text-sm transition-colors",
                      build.id === selectedId
                        ? "border-amber-400 bg-zinc-800 text-zinc-50"
                        : "border-transparent text-zinc-300 hover:bg-zinc-800/50"
                    )}
                  >
                    <span className="truncate">{build.name}</span>
                    {build.salePrice !== undefined && (
                      <span
                        className={cn(
                          "shrink-0 text-[11px] tabular-nums",
                          build.id === selectedId ? "text-amber-300" : "text-zinc-500"
                        )}
                      >
                        ${Math.ceil(build.salePrice).toLocaleString("en-US")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
