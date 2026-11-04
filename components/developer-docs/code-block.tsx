"use client";

import { Terminal } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  label = "json",
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-ink/40 bg-code", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-code-accent">
          <Terminal className="size-3" aria-hidden="true" />
          {label}
        </span>
        <CopyButton
          value={code}
          label="คัดลอก"
          className="border-white/10 bg-white/5 text-code-ink hover:border-white/25 hover:bg-white/10 hover:text-white"
        />
      </div>
      <pre className="max-h-[420px] overflow-auto p-3.5 text-[11px] leading-5">
        <code className="font-mono text-code-ink">{code}</code>
      </pre>
    </div>
  );
}
