import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

export type BadgeTone = "emerald" | "amber" | "rose" | "slate" | "indigo" | "sky";

const TONES: Record<BadgeTone, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
};

export function Badge({
  tone = "slate",
  children,
  dot = false,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function statusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case "ACTIVE":
    case "PAID":
    case "MATCHED":
      return "emerald";
    case "UNVERIFIED":
      return "amber";
    case "PAST_DUE":
    case "EXPIRED":
    case "NO_MATCH":
    case "REVOKED":
      return "rose";
    case "CANCELLED":
    case "INACTIVE":
      return "slate";
    default:
      return "slate";
  }
}

export function StatusBadge({
  status,
  label,
  dot = true,
}: {
  status: string | null | undefined;
  label?: string;
  dot?: boolean;
}) {
  if (!status) {
    return <Badge tone="slate">ยังไม่มีแพ็กเกจ</Badge>;
  }
  return (
    <Badge tone={statusTone(status)} dot={dot}>
      {label ?? titleCase(status)}
    </Badge>
  );
}
