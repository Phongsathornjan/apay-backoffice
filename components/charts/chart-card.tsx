import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-panel border border-line bg-surface shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-ink-secondary">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn("px-2 pb-4 pt-1 sm:px-3", contentClassName)}>{children}</div>
    </section>
  );
}
