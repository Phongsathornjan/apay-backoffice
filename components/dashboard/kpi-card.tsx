import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-brand-soft text-brand-ink border-brand-border",
  success: "bg-success-soft text-success-ink border-success-border",
  warning: "bg-warning-soft text-warning-ink border-warning-border",
  danger: "bg-danger-soft text-danger-ink border-danger-border",
  info: "bg-info-soft text-info-ink border-info-border",
  neutral: "bg-surface-muted text-ink-secondary border-line",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-card border",
            TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 truncate text-[26px] font-bold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[11px] leading-5 text-ink-secondary">{hint}</div>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
