import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-100", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-8 w-36" />
      <Skeleton className="mt-3 h-3 w-28" />
    </div>
  );
}

const BAR_HEIGHTS = [38, 55, 44, 68, 52, 74, 61, 82, 58, 70, 48, 64, 56, 76];

export function ChartSkeleton({
  height = 280,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5",
        className,
      )}
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <div className="mt-6 flex items-end gap-2" style={{ height }}>
        {BAR_HEIGHTS.map((barHeight, index) => (
          <Skeleton
            key={index}
            className="flex-1"
            // Deterministic variation avoids hydration mismatch.
            style={{ height: `${barHeight}%` }}
          />
        ))}
      </div>
    </div>
  );
}
