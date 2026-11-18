"use client";

import type { LoadedWorkbook } from "@/types/pc-build";
import { FileUploader } from "@/components/FileUploader";
import { ViewSwitcher, type ViewMode } from "@/components/ViewSwitcher";
import { ParserWarnings } from "@/components/ParserWarnings";
import type { PCBuild } from "@/types/pc-build";
import { APP_VERSION } from "@/lib/version";

type AppHeaderProps = {
  loaded: LoadedWorkbook | null;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onFile: (file: File) => void;
  loading: boolean;
  builds: PCBuild[];
  catalog: "desktops" | "laptops";
  onCatalogChange: (catalog: "desktops" | "laptops") => void;
};

function formatLoadedAt(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AppHeader({
  loaded,
  view,
  onViewChange,
  onFile,
  loading,
  builds,
  catalog,
  onCatalogChange,
}: AppHeaderProps) {
  const buildWarnings = builds
    .filter((b) => b.warnings.length > 0)
    .map((b) => ({ name: b.name, warnings: b.warnings }));

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:px-6">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="text-sm font-bold tracking-[0.18em] text-zinc-50">
          ASPC RTS TOOL
          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold tracking-normal text-zinc-400">
            {APP_VERSION}
          </span>
        </h1>
        {loaded ? (
          <p className="mt-1 truncate text-xs text-zinc-400" title={loaded.fileName}>
            {loaded.fileName} • Marketing • {loaded.builds.length} builds •
            loaded {formatLoadedAt(loaded.loadedAt)}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-zinc-600">Marketing builds</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:gap-3">
        <nav aria-label="Product catalog" className="flex rounded-md border border-zinc-700 p-1 text-xs font-semibold">
          {(["desktops", "laptops"] as const).map((item) => <button key={item} aria-pressed={catalog === item} onClick={() => onCatalogChange(item)} className={`rounded px-3 py-2 ${catalog === item ? "bg-zinc-800 text-amber-200" : "text-zinc-300 hover:bg-zinc-900"}`}>{item === "desktops" ? "Desktop builds" : "Laptops"}</button>)}
        </nav>
        {loaded && catalog === "desktops" && (
          <ViewSwitcher view={view} onChange={onViewChange} />
        )}
        {loaded && <ParserWarnings warnings={loaded.warnings} buildWarnings={buildWarnings} />}
        <FileUploader onFile={onFile} disabled={loading} variant={loaded ? "ghost" : "primary"} />
      </div>
    </header>
  );
}
