"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ExternalLink, FileSpreadsheet, History, RefreshCw, Settings2, X } from "lucide-react";
import type { useGoogleSheet } from "./useGoogleSheet";
import { SHEET_CHECK_MINUTES } from "@/lib/google-sheet-data";

const buttonStyle = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-50";
const selectStyle = "min-h-10 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400";
const time = (value: string | number) => new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const shortTime = (value: string | number) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function GoogleSheetConnection({ connection: c }: { connection: ReturnType<typeof useGoogleSheet> }) {
  const [panel, setPanel] = useState<"settings" | "history" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel) {
      if (!dialog.open) dialog.showModal();
      (panel === "history" ? historyHeadingRef.current : headingRef.current)?.focus();
    } else if (dialog.open) dialog.close();
  }, [panel]);

  const cutoff = period === "all" ? 0 : now - Number(period) * 3600000;
  const changes = c.history?.batches.filter((batch) => new Date(batch.detectedAt).getTime() >= cutoff).flatMap((batch) => batch.changes.map((change) => ({ ...change, detectedAt: batch.detectedAt }))) ?? [];
  const totalChanges = c.history?.batches.reduce((total, batch) => total + batch.changes.length, 0) ?? 0;
  const lastPage = Math.max(0, Math.ceil(changes.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  const stateLabel = !c.status ? "Checking connection…" : c.error ? "Needs attention" : !c.status.configured ? "Setup required" : !c.status.connected ? "Not connected" : c.busy ? "Checking…" : c.sheetId ? "Connected" : c.history ? "Paused" : "Ready to connect";

  function openPanel(next: "settings" | "history", trigger?: HTMLElement | null) {
    returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPanel(next);
  }
  function viewChanges() {
    setPeriod("all"); setPage(0);
    openPanel("history", historyButtonRef.current);
    c.alerts.clear();
  }

  return <>
    <section aria-label="Google Sheets connection" className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-sm md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <FileSpreadsheet aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-400" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-zinc-200">Google Sheets</span>
              <span role="status" className={`text-xs ${c.error ? "text-amber-200" : c.sheetId ? "text-emerald-300" : "text-zinc-400"}`}>{stateLabel}</span>
            </div>
            <p className="mt-1 truncate text-xs text-zinc-400" title={c.history?.snapshot.title}>
              {c.history?.snapshot.title ?? (c.status?.hasDefaultSheet ? "Your team spreadsheet" : "Connect a spreadsheet to keep prices up to date")}
              {c.sheetId && <span> · Every {c.checkMinutes} min{c.lastChecked && ` · Checked ${shortTime(c.lastChecked)}`}</span>}
            </p>
          </div>
        </div>
        <div className="grid w-full grid-flow-col auto-cols-fr items-center gap-2 sm:flex sm:w-auto [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:text-xs sm:[&>button]:px-3 sm:[&>button]:text-sm [&>button>svg]:hidden sm:[&>button>svg]:block">
          {c.sheetId && <button onClick={c.checkNow} disabled={c.busy} className={buttonStyle}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${c.busy ? "motion-safe:animate-spin" : ""}`} />{c.busy ? "Checking…" : "Check now"}</button>}
          {c.history && <button ref={historyButtonRef} onClick={(event) => openPanel("history", event.currentTarget)} className={buttonStyle}><History aria-hidden="true" className="h-4 w-4" />History{totalChanges > 0 && <span className="text-xs tabular-nums text-amber-200">{totalChanges}</span>}</button>}
          <button aria-label="Google Sheets settings" onClick={(event) => openPanel("settings", event.currentTarget)} className={buttonStyle}><Settings2 aria-hidden="true" className="h-4 w-4" />{c.status?.connected ? "Settings" : "Connect"}</button>
        </div>
      </div>
      {!panel && c.error && <p role="alert" className="mt-3 max-w-4xl break-words text-xs leading-5 text-red-300">{c.error}</p>}
      {!panel && c.storageWarning && <p role="status" className="mt-3 max-w-4xl text-xs leading-5 text-amber-200">{c.storageWarning}</p>}
    </section>

    <dialog ref={dialogRef} aria-labelledby="sheet-panel-title" className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-xl border-0 border-l border-zinc-700 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60"
      onCancel={() => setPanel(null)} onClose={() => { setPanel(null); if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus(); }}
      onClick={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-5 pt-6 sm:px-6">
          <div className="min-w-0"><h2 ref={headingRef} tabIndex={-1} id="sheet-panel-title" className="text-xl font-semibold tracking-tight outline-none">Google Sheets</h2><p className="mt-1 break-words text-sm text-zinc-400">{c.history?.snapshot.title ?? "Connection and automatic updates"}</p></div>
          <button aria-label="Close Google Sheets panel" onClick={() => setPanel(null)} className={`${buttonStyle} shrink-0 px-2.5`}><X aria-hidden="true" className="h-5 w-5" /></button>
        </header>
        <nav aria-label="Google Sheets panels" className="flex shrink-0 gap-5 border-b border-zinc-800 px-5 sm:px-6">
          {(["settings", "history"] as const).map((item) => <button key={item} aria-pressed={panel === item} onClick={() => setPanel(item)} className={`min-h-11 border-b-2 pb-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-amber-400 ${panel === item ? "border-amber-300 text-amber-200" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}>{item === "settings" ? "Connection settings" : "Change history"}</button>)}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          {panel && c.error && <p role="alert" className="mb-5 break-words rounded-md border border-red-400/30 bg-red-400/5 p-3 text-sm leading-6 text-red-200">{c.error}</p>}
          {panel && c.storageWarning && <p role="status" className="mb-5 text-sm leading-6 text-amber-200">{c.storageWarning}</p>}
          {panel === "settings" && <div className="space-y-7">
            {!c.status && !c.error && <p role="status" className="text-sm text-zinc-400">Checking Google connection…</p>}
            {c.status && !c.status.configured && <p className="text-sm leading-6 text-zinc-300">Google sign-in hasn’t been configured for this tool yet. The tool owner needs to complete Google connection setup. XLSX uploads remain available.</p>}
            {c.status?.configured && !c.status.connected && <section className="space-y-4">
              <h3 className="font-medium">Connect your spreadsheet</h3>
              <p className="text-sm leading-6 text-zinc-400">{c.status.hasDefaultSheet ? "Sign in with your company Google account. Your team sheet will connect automatically if you have access to it." : "Sign in with Google, then paste your sheet link."} The tool requests read-only access and reads the Marketing and TikTok Price tabs.</p>
              <form action="/api/google/connect" method="post"><button className="min-h-10 rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Sign in with Google</button></form>
            </section>}
            {c.status?.connected && <>
              <section className="space-y-4" aria-labelledby="sheet-sync-heading">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="sheet-sync-heading" className="font-medium">Automatic checks</h3><span className={`text-xs ${c.sheetId ? "text-emerald-300" : "text-zinc-400"}`}>{c.sheetId ? "Running" : "Paused"}</span></div>
                <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="sheet-check-interval" className="text-sm text-zinc-300">Check for changes every</label><select id="sheet-check-interval" value={c.checkMinutes} onChange={(event) => c.changeCheckMinutes(Number(event.target.value))} className={selectStyle}>{SHEET_CHECK_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></div>
                <p className="text-xs leading-5 text-zinc-400">Saved in this browser. Changing the interval restarts the countdown; paused checks stay paused. Keep the tool open for automatic updates.</p>
                {c.intervalWarning && <p role="status" className="text-sm text-amber-200">{c.intervalWarning}</p>}
                {c.history && <dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="text-zinc-400">Last successful check</dt><dd className="mt-1.5 leading-5 text-zinc-200">{time(c.lastChecked ?? c.history.snapshot.checkedAt)}</dd></div><div><dt className="text-zinc-400">Next check</dt><dd className="mt-1.5 leading-5 text-zinc-200">{c.busy ? "Checking now…" : c.nextCheck ? time(c.nextCheck) : "Paused"}</dd></div></dl>}
                {c.sheetId && <div className="flex flex-wrap items-center gap-3"><button onClick={c.pause} className={buttonStyle}>Pause checks</button><a className="inline-flex min-h-10 items-center gap-1.5 text-sm text-amber-200 underline decoration-amber-200/40 underline-offset-4 hover:decoration-amber-200" href={`https://docs.google.com/spreadsheets/d/${c.sheetId}/edit`} target="_blank" rel="noopener noreferrer">Open connected sheet<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a></div>}
              </section>
              <section className="space-y-3 border-t border-zinc-800 pt-6" aria-labelledby="sheet-source-heading">
                <h3 id="sheet-source-heading" className="font-medium">Spreadsheet</h3>
                {c.status.hasDefaultSheet && <p className="text-xs leading-5 text-zinc-400">Your team sheet connects on first use. Connect a different sheet below to save that choice in this browser.</p>}
                <form onSubmit={(event) => { event.preventDefault(); setPage(0); c.connect(); }} className="space-y-3">
                  <label htmlFor="google-sheet-link" className="block text-sm text-zinc-300">Google Sheet link</label>
                  <input id="google-sheet-link" type="url" required value={c.link} onChange={(event) => c.setLink(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="min-h-10 w-full min-w-0 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-2 focus:outline-amber-400" />
                  <button disabled={c.busy} className={buttonStyle}>Connect sheet</button>
                </form>
              </section>
              <section className="space-y-3 border-t border-zinc-800 pt-6" aria-labelledby="sheet-notifications-heading">
                <h3 id="sheet-notifications-heading" className="flex items-center gap-2 font-medium"><Bell aria-hidden="true" className="h-4 w-4 text-zinc-400" />Notifications</h3>
                <p className="text-sm leading-6 text-zinc-300">In-app popups are on for additions, updates and removals, including TikTok prices.</p>
                <button className={buttonStyle} disabled={c.alerts.permission === "unsupported"} onClick={() => void c.alerts.toggleBrowserAlerts()}>{c.alerts.enabled ? "Turn off browser notifications" : "Enable browser notifications"}</button>
                <p className="text-xs leading-5 text-zinc-400">{c.alerts.permission === "unsupported" ? "Browser notifications aren’t supported here. In-app popups will still appear." : c.alerts.permission === "denied" ? "Browser notifications are blocked in this site’s settings." : c.alerts.enabled ? "Browser notifications are on, including when you’re in another tab." : "Optional browser notifications can alert you while you’re in another tab."} Alerts follow successful checks every {c.checkMinutes} minutes or Check now, while the tool is open.</p>
                {c.alerts.message && <p role="status" className="text-sm text-amber-200">{c.alerts.message}</p>}
              </section>
              <section className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-6" aria-label="Google account"><div className="min-w-0"><p className="text-xs text-zinc-400">Signed in as</p><p className="mt-1 break-all text-sm text-zinc-200">{c.status.user?.email}</p></div><button className={buttonStyle} onClick={() => void c.disconnect()}>Sign out</button></section>
            </>}
          </div>}

          {panel === "history" && <section aria-labelledby="sheet-history-heading" className="space-y-5">
            <div><h3 ref={historyHeadingRef} tabIndex={-1} id="sheet-history-heading" className="font-medium outline-none">Change history</h3><p className="mt-2 text-xs leading-5 text-zinc-400">Updates detected in this browser. The latest 1,000 field changes are kept for this account and sheet.</p></div>
            {!c.history ? <p className="py-4 text-sm leading-6 text-zinc-400">Connect a spreadsheet to start tracking changes. The first successful check creates your baseline.</p> : <>
              <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="sheet-history-period" className="text-sm text-zinc-300">Show changes</label><select id="sheet-history-period" aria-label="Change history timeframe" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(0); }} className={selectStyle}><option value="all">All saved history</option><option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option></select></div>
              <p className="text-xs text-zinc-400">{changes.length} field {changes.length === 1 ? "change" : "changes"}{c.lastChecked && ` · Checked ${time(c.lastChecked)}`}</p>
              {changes.length === 0 ? <p className="border-y border-zinc-800 py-6 text-sm leading-6 text-zinc-300">No changes detected in this timeframe. The first successful read establishes a baseline.</p> : <>
                <ol className="divide-y divide-zinc-800 border-y border-zinc-800">
                  {changes.slice(currentPage * 20, currentPage * 20 + 20).map((change, index) => <li key={`${currentPage}-${index}`} className="py-5">
                    <p className="text-xs leading-5 text-zinc-400">{time(change.detectedAt)} · {change.tab}</p><p className="mt-1.5 break-words text-sm font-semibold leading-6 text-zinc-100">{change.product}</p><p className="mt-1 text-xs text-zinc-400">{change.field}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-4 text-sm"><div className="min-w-0"><dt className="text-xs text-zinc-400">Previous</dt><dd className="mt-1 break-words leading-6 text-zinc-300">{change.before}</dd></div><div className="min-w-0"><dt className="text-xs text-zinc-400">Current</dt><dd className="mt-1 break-words leading-6 text-amber-200">{change.after}</dd></div></dl>
                  </li>)}
                </ol>
                <div className="flex items-center justify-between gap-3"><button className={buttonStyle} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span className="text-xs tabular-nums text-zinc-400">{currentPage + 1} / {lastPage + 1}</span><button className={buttonStyle} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></div>
              </>}
              <details className="text-xs leading-5 text-zinc-400"><summary className="cursor-pointer py-2 text-zinc-300 focus-visible:outline-2 focus-visible:outline-amber-400">About change history</summary><p className="mt-2">History records detected product, specification and price changes between checks, starting with your first connection. It does not record every edit or formatting change. Browser sleep can delay checks; overdue checks run when you return. Uploading an XLSX pauses the connection. Clearing site data removes saved history.</p></details>
            </>}
          </section>}
        </div>
      </div>
    </dialog>

    {c.alerts.notice && !panel && <aside aria-label="Build change notification" className="fixed bottom-6 right-6 z-50 max-h-[65vh] w-[calc(100%-3rem)] max-w-md overflow-y-auto rounded-xl border border-zinc-600 bg-zinc-900 p-5 text-sm text-zinc-100">
      <div role="status" aria-live="polite" aria-atomic="true"><h2 className="text-base font-semibold text-amber-200">Build changes detected</h2><p className="mt-2 break-words text-zinc-300">{c.alerts.notice.title} · {time(c.alerts.notice.detectedAt)}</p><p className="mt-2 font-medium">{c.alerts.notice.summary}</p><ul className="mt-3 space-y-1 text-zinc-300">{c.alerts.notice.products.slice(0, 3).map((name) => <li className="break-words" key={name}>{name}</li>)}</ul>{c.alerts.notice.products.length > 3 && <p className="mt-1 text-zinc-400">And {c.alerts.notice.products.length - 3} more products</p>}</div>
      <div className="mt-4 flex flex-wrap gap-3"><button className={buttonStyle} onClick={viewChanges}>View changes</button><button className={buttonStyle} onClick={c.alerts.clear}>Dismiss</button></div>
    </aside>}
  </>;
}
