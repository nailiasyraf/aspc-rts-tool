"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopySpecsButtonProps = {
  specs: string[];
  className?: string;
};

export function CopySpecsButton({ specs, className }: CopySpecsButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = specs.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={specs.length === 0}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold tracking-wide transition-colors",
        copied
          ? "bg-emerald-500 text-zinc-950"
          : "bg-amber-400 text-zinc-950 hover:bg-amber-300",
        specs.length === 0 && "cursor-not-allowed opacity-40",
        className
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "COPIED" : "COPY SPECS"}
    </button>
  );
}
