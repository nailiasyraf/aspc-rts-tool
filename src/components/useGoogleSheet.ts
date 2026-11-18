"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GoogleStatus, SheetHistory, SheetSnapshot } from "@/types/google-sheet";
import { SHEET_CHECK_INTERVAL, compareSnapshots, spreadsheetIdFromLink, updateSheetHistory } from "@/lib/google-sheet-data";
import { connectionStorageKey, readSheetHistory, writeSheetHistory } from "@/lib/sheet-history-storage";
import { useSheetAlerts } from "./useSheetAlerts";

export function useGoogleSheet(onSnapshot: (snapshot: SheetSnapshot) => void) {
  const alerts = useSheetAlerts();
  const { report, clear } = alerts;
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [link, setLink] = useState("");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [history, setHistory] = useState<SheetHistory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [nextCheck, setNextCheck] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const applyRef = useRef(onSnapshot);
  const activeRef = useRef<string | null>(null);
  const userRef = useRef<GoogleStatus["user"]>(undefined);
  const historyRef = useRef<SheetHistory | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const nextRef = useRef<number | null>(null);
  useEffect(() => { applyRef.current = onSnapshot; }, [onSnapshot]);

  const schedule = useCallback((time: number | null) => { nextRef.current = time; setNextCheck(time); }, []);
  const pause = useCallback(() => {
    clear();
    generationRef.current += 1;
    requestRef.current?.abort(); requestRef.current = null;
    activeRef.current = null;
    setSheetId(null); setBusy(false); schedule(null);
    try { if (userRef.current) localStorage.removeItem(connectionStorageKey(userRef.current.id)); } catch { /* In-memory pause still succeeds. */ }
  }, [schedule, clear]);

  const check = useCallback(async (id: string, switching = false) => {
    const user = userRef.current;
    if (!user || (requestRef.current && !switching)) return;
    requestRef.current?.abort();
    const generation = ++generationRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true); setError(null); schedule(null);
    if (switching) {
      clear();
      activeRef.current = null; setSheetId(null); setLastChecked(null);
      try {
        historyRef.current = readSheetHistory(user.id, id);
        localStorage.removeItem(connectionStorageKey(user.id));
      } catch {
        historyRef.current = null;
        setStorageWarning("Saved history could not be read. This session will start a new baseline.");
      }
      setHistory(historyRef.current);
    }
    try {
      const response = await fetch("/api/google/sheet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spreadsheetId: id, accountId: user.id }), signal: controller.signal });
      const result = await response.json();
      if (generation !== generationRef.current) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 409) {
          activeRef.current = null; setSheetId(null); userRef.current = undefined;
          setStatus((old) => old ? { ...old, connected: false, user: undefined } : old);
        }
        throw new Error(result.error || "Could not check the sheet. Try again.");
      }
      const snapshot = result as SheetSnapshot;
      if (snapshot.spreadsheetId !== id || !Array.isArray(snapshot.builds) || !Array.isArray(snapshot.tiktokProducts)) throw new Error("Incomplete sheet data received. Try again.");
      const changes = historyRef.current ? compareSnapshots(historyRef.current.snapshot, snapshot) : [];
      const updated = updateSheetHistory(historyRef.current, snapshot);
      historyRef.current = updated;
      setHistory(updated); setLastChecked(snapshot.checkedAt);
      activeRef.current = id; setSheetId(id);
      try {
        writeSheetHistory(user.id, updated);
        localStorage.setItem(connectionStorageKey(user.id), id);
        setStorageWarning(null);
      } catch { setStorageWarning("Browser storage is unavailable or full. Refreshes still work, but this session’s history may be lost when you close the page."); }
      applyRef.current(snapshot);
      report(snapshot, changes);
    } catch (failure) {
      if (generation === generationRef.current && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not check the sheet. Try again.");
    } finally {
      if (generation === generationRef.current) {
        requestRef.current = null; setBusy(false);
        if (activeRef.current && userRef.current) schedule(Date.now() + SHEET_CHECK_INTERVAL);
      }
    }
  }, [schedule, report, clear]);

  useEffect(() => {
    const controller = new AbortController();
    const initialGeneration = generationRef.current;
    async function initialize() {
      try {
        const response = await fetch("/api/google/status", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Could not check Google sign-in. Reload the page to retry.");
        const result: GoogleStatus = await response.json();
        if (controller.signal.aborted) return;
        setStatus(result); userRef.current = result.user;
        const url = new URL(window.location.href);
        if (url.searchParams.get("google") === "failed") setError("Google sign-in was cancelled or could not be completed. Try signing in again.");
        if (url.searchParams.has("google")) { url.searchParams.delete("google"); window.history.replaceState(null, "", url); }
        if (result.connected && result.user && generationRef.current === initialGeneration) {
          try {
            const saved = localStorage.getItem(connectionStorageKey(result.user.id));
            if (saved && /^[A-Za-z0-9_-]{10,200}$/.test(saved)) {
              setLink(`https://docs.google.com/spreadsheets/d/${saved}/edit`);
              void check(saved, true);
            }
          } catch { setStorageWarning("Browser storage is unavailable. Paste your sheet link to connect for this session."); }
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not check Google sign-in. Reload the page to retry.");
      }
    }
    void initialize();
    return () => { controller.abort(); generationRef.current += 1; requestRef.current?.abort(); requestRef.current = null; };
  }, [check]);

  useEffect(() => {
    if (nextCheck === null) return;
    const run = () => { if (activeRef.current && nextRef.current !== null && Date.now() >= nextRef.current) void check(activeRef.current); };
    const timer = setTimeout(run, Math.max(0, nextCheck - Date.now()));
    const resume = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", resume);
    return () => { clearTimeout(timer); window.removeEventListener("focus", run); window.removeEventListener("online", run); document.removeEventListener("visibilitychange", resume); };
  }, [nextCheck, check]);

  function connect() {
    try { void check(spreadsheetIdFromLink(link), true); } catch (failure) { setError((failure as Error).message); }
  }
  async function disconnect() {
    pause();
    try {
      const response = await fetch("/api/google/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("Checks are paused, but sign-out failed. Try signing out again.");
      userRef.current = undefined; historyRef.current = null;
      setStatus((old) => old ? { ...old, connected: false, user: undefined } : old);
      setHistory(null); setLink(""); setError(null); setStorageWarning(null); setLastChecked(null);
    } catch (failure) { setError((failure as Error).message); }
  }
  return { status, link, setLink, sheetId, history, busy, error, storageWarning, nextCheck, lastChecked, connect, pause, alerts,
    checkNow: () => { if (activeRef.current) void check(activeRef.current); }, disconnect };
}
