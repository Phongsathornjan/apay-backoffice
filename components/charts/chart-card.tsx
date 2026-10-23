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
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn("px-2 pb-4 pt-1 sm:px-3", contentClassName)}>{children}</div>
    </section>
  );
}
