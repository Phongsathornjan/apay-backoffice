import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
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
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl border",
            TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 truncate text-[26px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[11px] leading-5 text-slate-500">{hint}</div>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
