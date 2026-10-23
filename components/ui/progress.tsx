import { cn } from "@/lib/utils";

export type ProgressTone = "emerald" | "amber" | "rose" | "indigo";

const BAR_TONES: Record<ProgressTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
};

export function Progress({
  value,
  tone = "emerald",
  className,
  ariaLabel,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  ariaLabel?: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", BAR_TONES[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
