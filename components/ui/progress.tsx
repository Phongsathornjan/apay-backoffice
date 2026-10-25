import { cn } from "@/lib/utils";

export type ProgressTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const BAR_TONES: Record<ProgressTone, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink-muted",
};

export function Progress({
  value,
  tone = "brand",
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
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
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
