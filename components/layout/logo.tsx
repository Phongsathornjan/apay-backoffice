import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-extrabold tracking-tight text-white shadow-lg shadow-emerald-950/20">
        A
      </span>
      {compact ? null : (
        <span className="leading-none">
          <span
            className={cn(
              "block text-[17px] font-bold tracking-tight",
              light ? "text-white" : "text-slate-900",
            )}
          >
            APay
          </span>
          <span
            className={cn(
              "mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em]",
              light ? "text-slate-400" : "text-slate-400",
            )}
          >
            Payment Gateway
          </span>
        </span>
      )}
    </div>
  );
}
