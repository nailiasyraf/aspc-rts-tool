"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  label?: string;
};

export function FileUploader({
  onFile,
  disabled,
  variant = "primary",
  label = "UPLOAD XLSX",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
          variant === "primary"
            ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
            : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Upload className="h-3.5 w-3.5" />
        {label}
      </button>
    </>
  );
}
