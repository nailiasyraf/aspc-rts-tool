"use client";

import { useEffect, useRef, useState } from "react";
import type { useGoogleSheet } from "./useGoogleSheet";

const buttonStyle = "rounded-md border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-50";
const time = (value: string | number) => new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function GoogleSheetConnection({ connection }: { connection: ReturnType<typeof useGoogleSheet> }) {
  const c = connection;
  const panelRef = useRef<HTMLDetailsElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const cutoff = period === "all" ? 0 : now - Number(period) * 3600000;
  const changes = c.history?.batches.filter((batch) => new Date(batch.detectedAt).getTime() >= cutoff).flatMap((batch) => batch.changes.map((change) => ({ ...change, detectedAt: batch.detectedAt }))) ?? [];
  const lastPage = Math.max(0, Math.ceil(changes.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  function viewChanges() {
    setPeriod("all"); setPage(0);
    if (panelRef.current) panelRef.current.open = true;
    historyHeadingRef.current?.focus();
    historyHeadingRef.current?.scrollIntoView({ block: "nearest" });
    c.alerts.clear();
  }
  return (
    <>
    {c.alerts.notice && <aside aria-label="Build change notification" className="fixed bottom-6 right-6 z-50 max-h-[65vh] w-[calc(100%-3rem)] max-w-md overflow-y-auto rounded-xl border border-zinc-600 bg-zinc-900 p-5 text-sm text-zinc-100">
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2 className="text-base font-semibold text-amber-200">Build changes detected</h2>
        <p className="mt-2 break-words text-zinc-300">{c.alerts.notice.title} · {time(c.alerts.notice.detectedAt)}</p>
        <p className="mt-2 font-medium">{c.alerts.notice.summary}</p>
        <ul className="mt-3 space-y-1 text-zinc-300">{c.alerts.notice.products.slice(0, 3).map((name) => <li className="break-words" key={name}>{name}</li>)}</ul>
        {c.alerts.notice.products.length > 3 && <p className="mt-1 text-zinc-400">And {c.alerts.notice.products.length - 3} more products</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className={buttonStyle} onClick={viewChanges}>View changes</button>
        <button className={buttonStyle} onClick={c.alerts.clear}>Dismiss</button>
      </div>
    </aside>}
    <details ref={panelRef} className="shrink-0 border-b border-zinc-800 bg-zinc-950 text-sm" open={c.error ? true : undefined}>
      <summary className="cursor-pointer px-6 py-3 font-medium text-zinc-200 focus-visible:outline-2 focus-visible:outline-amber-400">
        Google Sheets <span className="ml-2 font-normal text-zinc-400">{c.busy ? "Checking…" : c.sheetId ? "Connected · checks every 15 minutes" : c.status?.connected ? "Signed in · paste a sheet link to connect" : "Connect a spreadsheet"}</span>
      </summary>
      <div className="max-h-[55vh] space-y-4 overflow-y-auto px-6 pb-5">
        {!c.status && !c.error && <p role="status" className="text-zinc-400">Checking Google connection…</p>}
        {c.status && !c.status.configured && <p className="max-w-2xl leading-6 text-zinc-300">Google sign-in hasn’t been configured for this tool yet. The tool owner needs to complete Google connection setup. XLSX uploads remain available.</p>}
        {c.status?.configured && !c.status.connected && <>
          <p className="max-w-2xl leading-6 text-zinc-400">Sign in with Google, then paste your sheet link. Google will ask for read-only access to your spreadsheets; this tool reads the Marketing and TikTok Price tabs of the sheet you connect.</p>
          <form action="/api/google/connect" method="post"><button className={buttonStyle}>Sign in with Google</button></form>
        </>}
        {c.status?.connected && <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="break-all text-zinc-300">Signed in as {c.status.user?.email}</p>
            <button className={buttonStyle} onClick={() => void c.disconnect()}>Sign out</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setPage(0); c.connect(); }} className="flex max-w-4xl flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-72">
              <label htmlFor="google-sheet-link" className="mb-2 block text-zinc-200">Google Sheet link</label>
              <input id="google-sheet-link" type="url" required value={c.link} onChange={(event) => c.setLink(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100 placeholder:text-zinc-400 focus:outline-2 focus:outline-amber-400" />
            </div>
            <button disabled={c.busy} className={buttonStyle}>Connect sheet</button>
          </form>
          {c.sheetId && <div className="flex flex-wrap items-center gap-3">
            <button onClick={c.checkNow} disabled={c.busy} className={buttonStyle}>Check now</button>
            <button onClick={c.pause} className={buttonStyle}>Pause checks</button>
            <a className="text-amber-200 underline underline-offset-4" href={`https://docs.google.com/spreadsheets/d/${c.sheetId}/edit`} target="_blank" rel="noopener noreferrer">Open connected sheet</a>
          </div>}
          <div className="space-y-2 border-t border-zinc-800 pt-3">
            <p className="text-zinc-300">In-app popups are on for detected additions, updates and removals, including TikTok prices.</p>
            <button className={buttonStyle} disabled={c.alerts.permission === "unsupported"} onClick={() => void c.alerts.toggleBrowserAlerts()}>{c.alerts.enabled ? "Turn off browser notifications" : "Enable browser notifications"}</button>
            <p className="max-w-3xl text-xs leading-5 text-zinc-400">{c.alerts.permission === "unsupported" ? "Browser notifications aren’t supported here. In-app popups will still appear." : c.alerts.permission === "denied" ? "Browser notifications are blocked in this site’s settings." : c.alerts.enabled ? "Browser notifications are on, including when you’re in another tab." : "Optional browser notifications can alert you while you’re in another tab."} Keep the tool open; alerts follow successful checks every 15 minutes or Check now.</p>
            {c.alerts.message && <p role="status" className="text-amber-200">{c.alerts.message}</p>}
          </div>
        </>}
        {c.error && <p role="alert" className="text-red-300">{c.error}</p>}
        {c.storageWarning && <p role="status" className="text-amber-200">{c.storageWarning}</p>}
        {c.history && <section aria-labelledby="sheet-history-heading" className="space-y-3 border-t border-zinc-800 pt-4">
          <h2 ref={historyHeadingRef} tabIndex={-1} id="sheet-history-heading" className="font-semibold text-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-400">Change history — {c.history.snapshot.title}</h2>
          <p className="text-xs leading-6 text-zinc-400">{c.sheetId ? "Automatic refresh is on." : "Checks are paused."} Last successful check: {time(c.lastChecked ?? c.history.snapshot.checkedAt)}.{c.nextCheck && ` Next check: ${time(c.nextCheck)}.`}</p>
          <p className="max-w-3xl text-xs leading-5 text-zinc-400">History records detected product, specification and price changes between checks, starting with your first connection. The latest 1,000 changes are saved in this browser for this account and sheet. Browser sleep can delay checks; overdue checks run when you return. Uploading an XLSX pauses the connection.</p>
          <label className="flex flex-wrap items-center gap-3 text-zinc-300">Show changes
            <select aria-label="Change history timeframe" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(0); }} className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-zinc-100">
              <option value="all">All saved history</option><option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option>
            </select>
          </label>
          {changes.length === 0 ? <p className="text-zinc-400">No changes detected in this timeframe. The first successful read establishes a baseline.</p> : <>
            <ol className="divide-y divide-zinc-800">
              {changes.slice(currentPage * 20, currentPage * 20 + 20).map((change, index) => <li key={`${currentPage}-${index}`} className="py-3">
                <p className="text-xs text-zinc-400">{time(change.detectedAt)} · {change.tab}</p>
                <p className="mt-1 break-words font-medium text-zinc-100">{change.product}</p>
                <p className="mt-1 text-zinc-300">{change.field}</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0"><dt className="text-xs text-zinc-400">Previous</dt><dd className="break-words text-zinc-300">{change.before}</dd></div>
                  <div className="min-w-0"><dt className="text-xs text-zinc-400">Current</dt><dd className="break-words text-amber-200">{change.after}</dd></div>
                </dl>
              </li>)}
            </ol>
            <div className="flex flex-wrap items-center gap-3"><button className={buttonStyle} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span className="text-zinc-400">Page {currentPage + 1} of {lastPage + 1} · {changes.length} changes</span><button className={buttonStyle} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></div>
          </>}
        </section>}
      </div>
    </details>
    </>
  );
}
