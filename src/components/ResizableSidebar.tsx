"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 288; // 18rem — default w-72
const MAX_WIDTH = 640;

/**
 * Wraps the sidebar with a draggable resize handle on its right edge.
 * Desktop only; children render normally on small screens.
 */
export function ResizableSidebar({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(MIN_WIDTH);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!frameRef.current) return;
      const bounds = frameRef.current.getBoundingClientRect();
      const next = event.clientX - bounds.left;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    },
    []
  );

  const stopDragging = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [dragging, onPointerMove, stopDragging]);

  return (
    <div
      ref={frameRef}
      className="relative hidden shrink-0 border-r border-zinc-800 bg-zinc-950 md:block"
      style={{ width }}
    >
      <div className="h-full">{children}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => setWidth(MIN_WIDTH)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none transition-colors hover:bg-amber-400/40"
        style={{ transform: "translateX(50%)" }}
      />
    </div>
  );
}
