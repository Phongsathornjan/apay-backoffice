import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface-subtle px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-panel border border-line bg-surface text-brand-ink shadow-card">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <div className="mt-1 max-w-md text-xs leading-5 text-ink-secondary">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
