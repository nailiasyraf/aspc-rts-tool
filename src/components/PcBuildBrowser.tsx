"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import type { LoadedWorkbook } from "@/types/pc-build";
import { readWorkbook, getMarketingSheet } from "@/lib/xlsx/readWorkbook";
import { parseMarketingSheet } from "@/lib/parser/parseMarketingSheet";
import { buildSearchIndex, searchBuilds } from "@/lib/search";
import {
  buildMatchesComponent,
  type ComponentFilter,
} from "@/lib/componentFilter";
import { AppHeader } from "@/components/AppHeader";
import { BuildSidebar } from "@/components/BuildSidebar";
import { BuildView } from "@/components/BuildView";
import { BrochureView } from "@/components/BrochureView";
import { FileUploader } from "@/components/FileUploader";
import { ResizableSidebar } from "@/components/ResizableSidebar";

function EmptyState({
  onFile,
  loading,
  error,
}: {
  onFile: (file: File) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <FileUp className="mx-auto h-10 w-10 text-zinc-700" />
        <h2 className="mt-5 text-lg font-bold tracking-[0.14em] text-zinc-300">
          ASPC RTS TOOL
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Upload the latest XLSX file to browse Marketing builds.
        </p>
        {error && (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <FileUploader onFile={onFile} disabled={loading} />
        </div>
      </div>
    </div>
  );
}

export function PcBuildBrowser() {
  const [loaded, setLoaded] = useState<LoadedWorkbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"build" | "brochure">("build");
  const [query, setQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState<ComponentFilter | null>(
    null
  );

  const searchIndexes = useMemo(() => {
    const indexes = new Map<string, string>();
    for (const build of loaded?.builds ?? []) {
      indexes.set(build.id, buildSearchIndex(build));
    }
    return indexes;
  }, [loaded]);

  const filteredBuilds = useMemo(() => {
    const searched = searchBuilds(loaded?.builds ?? [], searchIndexes, query);
    if (!componentFilter) return searched;
    return searched.filter((build) =>
      buildMatchesComponent(build, componentFilter)
    );
  }, [loaded, searchIndexes, query, componentFilter]);

  const selectedBuild = useMemo(() => {
    const builds = loaded?.builds ?? [];
    return builds.find((b) => b.id === selectedId) ?? builds[0] ?? null;
  }, [loaded, selectedId]);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please upload a valid XLSX workbook.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const read = readWorkbook(buffer);
      if (!read.ok) {
        setError(read.message);
        return;
      }
      const sheet = getMarketingSheet(read.workbook);
      if (!sheet.ok) {
        setError(sheet.message);
        return;
      }
      const { builds, warnings } = parseMarketingSheet(sheet.sheet);
      if (builds.length === 0) {
        setError("No PC builds could be detected in the Marketing worksheet.");
        return;
      }
      setLoaded({
        fileName: file.name,
        sheetName: "Marketing",
        builds,
        warnings,
        loadedAt: new Date(),
      });
      setSelectedId(builds[0].id);
      setQuery("");
      setComponentFilter(null);
      setView("build");
    } catch {
      setError("Please upload a valid XLSX workbook.");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <AppHeader
          loaded={null}
          view={view}
          onViewChange={setView}
          onFile={handleFile}
          loading={loading}
          builds={[]}
        />
        <EmptyState onFile={handleFile} loading={loading} error={error} />
        <footer className="pointer-events-none fixed bottom-2 right-3 select-none">
          <p className="text-[11px] font-medium tracking-wide text-zinc-400">
            Built by <span className="font-bold text-zinc-200">Asyraf</span> for{" "}
            <span className="font-bold text-zinc-200">ASPC</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <AppHeader
        loaded={loaded}
        view={view}
        onViewChange={setView}
        onFile={handleFile}
        loading={loading}
        builds={loaded.builds}
      />
      <div className="flex min-h-0 flex-1">
        <ResizableSidebar>
          <BuildSidebar
            allBuilds={loaded.builds}
            builds={filteredBuilds}
            selectedId={selectedBuild?.id ?? null}
            query={query}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
            componentFilter={componentFilter}
            onComponentFilterChange={setComponentFilter}
          />
        </ResizableSidebar>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-zinc-800 p-3 md:hidden">
            <BuildSidebar
              allBuilds={loaded.builds}
              builds={filteredBuilds}
              selectedId={selectedBuild?.id ?? null}
              query={query}
              onQueryChange={setQuery}
              onSelect={setSelectedId}
              componentFilter={componentFilter}
              onComponentFilterChange={setComponentFilter}
            />
          </div>
          {selectedBuild ? (
            view === "build" ? (
              <BuildView build={selectedBuild} />
            ) : (
              <BrochureView build={selectedBuild} />
            )
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-500">
              Select a build to view its specifications.
            </div>
          )}
        </main>
      </div>
      <footer className="pointer-events-none fixed bottom-2 right-3 z-20 select-none">
        <p className="text-[11px] font-medium tracking-wide text-zinc-400">
          Built by <span className="font-bold text-zinc-200">Asyraf</span> for{" "}
          <span className="font-bold text-zinc-200">ASPC</span>
        </p>
      </footer>
    </div>
  );
}
