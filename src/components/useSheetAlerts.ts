"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SheetChange, SheetSnapshot } from "@/types/google-sheet";

const preferenceKey = "aspc:sheet-browser-alerts";
type SheetAlert = { title: string; summary: string; products: string[]; detectedAt: string };

export function useSheetAlerts() {
  const [notice, setNotice] = useState<SheetAlert | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const enabledRef = useRef(false);
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    function syncPermission() {
      setPermission("Notification" in window && window.isSecureContext ? Notification.permission : "unsupported");
    }
    syncPermission();
    try { enabledRef.current = localStorage.getItem(preferenceKey) === "true"; } catch { /* Use the session preference. */ }
    setEnabled(enabledRef.current);
    window.addEventListener("focus", syncPermission);
    return () => { window.removeEventListener("focus", syncPermission); notificationRef.current?.close(); };
  }, []);

  const clear = useCallback(() => {
    setNotice(null);
    notificationRef.current?.close();
    notificationRef.current = null;
  }, []);

  const report = useCallback((snapshot: SheetSnapshot, changes: SheetChange[]) => {
    if (!changes.length) return;
    const added = new Set<string>(), updated = new Set<string>(), removed = new Set<string>();
    for (const change of changes) {
      const key = `${change.tab}:${change.product}`;
      (change.field === "Product added" ? added : change.field === "Product removed" ? removed : updated).add(key);
    }
    const summary = [[added.size, "added"], [updated.size, "updated"], [removed.size, "removed"]]
      .filter(([count]) => count).map(([count, label]) => `${count} ${label}`).join(" · ");
    setNotice({ title: snapshot.title, summary, products: [...new Set(changes.map((change) => change.product))], detectedAt: snapshot.checkedAt });
    if (!enabledRef.current || !("Notification" in window) || Notification.permission !== "granted") return;
    try {
      notificationRef.current?.close();
      const notification = new Notification("RTS build changes", {
        body: `${snapshot.title}: ${summary}. Open the tool to review changes.`,
        tag: "aspc-sheet-changes",
      });
      notification.onclick = () => { window.focus(); notification.close(); };
      notificationRef.current = notification;
      notification.onerror = () => setMessage("Browser notification could not be shown. In-app popups are still on.");
    } catch { setMessage("This browser could not show a notification. In-app popups are still on."); }
  }, []);

  async function toggleBrowserAlerts() {
    setMessage(null);
    if (enabledRef.current) {
      enabledRef.current = false; setEnabled(false); notificationRef.current?.close();
    } else {
      if (!("Notification" in window) || !window.isSecureContext) { setPermission("unsupported"); return; }
      try {
        // Browsers require the permission prompt to originate from this button click.
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setMessage(result === "denied" ? "Notifications are blocked. Allow them in your browser’s site settings to enable browser alerts." : "Permission wasn’t granted. You can enable browser notifications later.");
          return;
        }
        enabledRef.current = true; setEnabled(true);
      } catch { setMessage("Could not request browser notifications. In-app popups are still on."); return; }
    }
    try { localStorage.setItem(preferenceKey, String(enabledRef.current)); }
    catch { setMessage("Notification preference will apply only for this session because browser storage is unavailable."); }
  }

  return { notice, permission, enabled, message, report, clear, toggleBrowserAlerts };
}
