"use client";

import type { LoadedWorkbook } from "@/types/pc-build";
import { FileUploader } from "@/components/FileUploader";
import { ViewSwitcher, type ViewMode } from "@/components/ViewSwitcher";
import { ParserWarnings } from "@/components/ParserWarnings";
import type { PCBuild } from "@/types/pc-build";

type AppHeaderProps = {
  loaded: LoadedWorkbook | null;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onFile: (file: File) => void;
  loading: boolean;
  builds: PCBuild[];
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
}: AppHeaderProps) {
  const buildWarnings = builds
    .filter((b) => b.warnings.length > 0)
    .map((b) => ({ name: b.name, warnings: b.warnings }));

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-zinc-800 bg-zinc-950 px-6 py-3">
      <div className="min-w-0">
        <h1 className="text-sm font-bold tracking-[0.18em] text-zinc-50">
          ASPC RTS BUILDS BROWSER
        </h1>
        {loaded ? (
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {loaded.fileName} • Marketing • {loaded.builds.length} builds •
            loaded {formatLoadedAt(loaded.loadedAt)}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-zinc-600">Marketing builds</p>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {loaded && (
          <ViewSwitcher view={view} onChange={onViewChange} />
        )}
        {loaded && <ParserWarnings warnings={loaded.warnings} buildWarnings={buildWarnings} />}
        <FileUploader onFile={onFile} disabled={loading} />
      </div>
    </header>
  );
}
