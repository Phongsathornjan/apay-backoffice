import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

export type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "brand"
  | "info";

const TONES: Record<BadgeTone, string> = {
  success: "border-success-border bg-success-soft text-success-ink",
  warning: "border-warning-border bg-warning-soft text-warning-ink",
  danger: "border-danger-border bg-danger-soft text-danger-ink",
  neutral: "border-line bg-surface-muted text-ink-secondary",
  brand: "border-brand-border bg-brand-soft text-brand-ink",
  info: "border-info-border bg-info-soft text-info-ink",
};

export function Badge({
  tone = "neutral",
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
    case "SUCCESS":
      return "success";
    case "UNVERIFIED":
    case "PENDING":
    case "PAST_DUE":
      return "warning";
    case "EXPIRED":
    case "FAILED":
    case "ERROR":
    case "NO_MATCH":
    case "REVOKED":
      return "danger";
    case "CANCELLED":
    case "INACTIVE":
      return "neutral";
    case "PROCESSING":
      return "brand";
    default:
      return "neutral";
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
    return <Badge tone="neutral">ยังไม่มีแพ็กเกจ</Badge>;
  }
  return (
    <Badge tone={statusTone(status)} dot={dot}>
      {label ?? titleCase(status)}
    </Badge>
  );
}
