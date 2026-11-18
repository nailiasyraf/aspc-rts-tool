"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GoogleStatus, SheetHistory, SheetSnapshot } from "@/types/google-sheet";
import { DEFAULT_SHEET_CHECK_MINUTES, SHEET_CHECK_MINUTES, compareSnapshots, spreadsheetIdFromLink, updateSheetHistory } from "@/lib/google-sheet-data";
import { connectionStorageKey, readSheetHistory, writeSheetHistory } from "@/lib/sheet-history-storage";
import { useSheetAlerts } from "./useSheetAlerts";

const intervalStorageKey = "aspc-sheets-check-minutes-v1";

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
  const [checkMinutes, setCheckMinutes] = useState<number>(DEFAULT_SHEET_CHECK_MINUTES);
  const [intervalWarning, setIntervalWarning] = useState<string | null>(null);
  const intervalRef = useRef<number>(DEFAULT_SHEET_CHECK_MINUTES);
  const applyRef = useRef(onSnapshot);
  const activeRef = useRef<string | null>(null);
  const userRef = useRef<GoogleStatus["user"]>(undefined);
  const historyRef = useRef<SheetHistory | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const nextRef = useRef<number | null>(null);
  useEffect(() => { applyRef.current = onSnapshot; }, [onSnapshot]);

  const schedule = useCallback((time: number | null) => { nextRef.current = time; setNextCheck(time); }, []);
  function changeCheckMinutes(minutes: number) {
    if (!SHEET_CHECK_MINUTES.some((option) => option === minutes)) return;
    intervalRef.current = minutes;
    setCheckMinutes(minutes);
    try {
      localStorage.setItem(intervalStorageKey, String(minutes));
      setIntervalWarning(null);
    } catch { setIntervalWarning("The check interval applies for this session, but couldn’t be saved in this browser."); }
    // Restart the countdown without resuming a paused source or overlapping a read.
    if (activeRef.current && userRef.current && !requestRef.current) schedule(Date.now() + minutes * 60 * 1000);
  }
  const pause = useCallback(() => {
    clear();
    generationRef.current += 1;
    requestRef.current?.abort(); requestRef.current = null;
    activeRef.current = null;
    setSheetId(null); setBusy(false); schedule(null);
    try { if (userRef.current) localStorage.setItem(connectionStorageKey(userRef.current.id), "paused"); } catch { /* In-memory pause still succeeds. */ }
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
        if (activeRef.current && userRef.current) schedule(Date.now() + intervalRef.current * 60 * 1000);
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
        try {
          const savedMinutes = Number(localStorage.getItem(intervalStorageKey));
          if (SHEET_CHECK_MINUTES.some((option) => option === savedMinutes)) {
            intervalRef.current = savedMinutes;
            setCheckMinutes(savedMinutes);
          }
        } catch { setIntervalWarning("Saved check interval couldn’t be read. Using 2 minutes for this session."); }
        setStatus(result); userRef.current = result.user;
        const url = new URL(window.location.href);
        const justSignedIn = url.searchParams.get("google") === "connected";
        if (url.searchParams.get("google") === "failed") setError("Google sign-in was cancelled or could not be completed. Try signing in again.");
        if (url.searchParams.has("google")) { url.searchParams.delete("google"); window.history.replaceState(null, "", url); }
        if (result.connected && result.user && generationRef.current === initialGeneration) {
          let saved: string | null = null;
          try {
            saved = localStorage.getItem(connectionStorageKey(result.user.id));
          } catch { setStorageWarning("Browser storage is unavailable. You can still connect a sheet for this session."); }
          const isId = (value: string | null | undefined): value is string => Boolean(value && /^[A-Za-z0-9_-]{10,200}$/.test(value));
          const target = isId(saved) ? saved : isId(result.defaultSheetId) ? result.defaultSheetId : null;
          if (target) {
            setLink(`https://docs.google.com/spreadsheets/d/${target}/edit`);
            if (saved !== "paused" || justSignedIn) void check(target, true);
          }
        } else if (result.connected && result.user && generationRef.current !== initialGeneration) {
          // An upload/pause while status was loading must also survive a reload.
          try { localStorage.setItem(connectionStorageKey(result.user.id), "paused"); } catch { /* The current session is already paused. */ }
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
    checkMinutes, changeCheckMinutes, intervalWarning,
    checkNow: () => { if (activeRef.current) void check(activeRef.current); }, disconnect };
}
