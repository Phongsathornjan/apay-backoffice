"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/lib/hooks/use-copy";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "คัดลอก",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => void copy(value)}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {iconOnly ? null : copied ? "คัดลอกแล้ว" : label}
    </button>
  );
}
