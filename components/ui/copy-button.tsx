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
        "inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-secondary transition hover:border-line-strong hover:bg-surface-subtle hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-success-ink" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {iconOnly ? null : copied ? "คัดลอกแล้ว" : label}
    </button>
  );
}
