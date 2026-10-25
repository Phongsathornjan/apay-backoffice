"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import type { DashboardSubscriptionSummary } from "@/types/api";
import {
  daysUntil,
  formatDate,
  formatNumber,
  formatPercent,
  quotaTone,
} from "@/lib/format";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubscriptionBanner({
  subscription,
  showDetailsLink = true,
  adminView = false,
}: {
  subscription: DashboardSubscriptionSummary | null;
  showDetailsLink?: boolean;
  adminView?: boolean;
}) {
  if (!subscription) {
    return (
      <div className="flex flex-col justify-between gap-4 rounded-panel border border-dashed border-line-strong bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-warning-soft text-warning-ink">
            <CreditCard className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">ยังไม่มีแพ็กเกจที่ใช้งานอยู่</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-secondary">
              {adminView
                ? "ธุรกิจนี้ยังไม่ถูกผูกแพ็กเกจ จึงยังไม่สามารถสร้าง API Key หรือ QR ได้"
                : "กรุณาติดต่อผู้ดูแลระบบเพื่อผูกแพ็กเกจก่อนเริ่มใช้งาน API"}
            </p>
          </div>
        </div>
        {adminView ? (
          <Link href="/admin/businesses">
            <Button variant="secondary" icon={<ArrowUpRight className="size-3.5" />}>
              ผูกแพ็กเกจ
            </Button>
          </Link>
        ) : null}
      </div>
    );
  }

  const usedRatio =
    subscription.quota_limit > 0 ? subscription.quota_used / subscription.quota_limit : 0;
  const days = daysUntil(subscription.current_period_end) ?? subscription.days_until_period_end;
  const isPastDue = subscription.status === "PAST_DUE";
  const isCancelled = subscription.status === "CANCELLED";
  const problematic = isPastDue || isCancelled;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-panel border p-5 shadow-card sm:p-6",
        problematic
          ? "border-danger-border bg-gradient-to-br from-danger-soft via-surface to-surface"
          : "border-brand-border bg-gradient-to-br from-brand-soft via-surface to-surface",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute -right-16 -top-24 size-64 rounded-full blur-3xl",
          problematic ? "bg-danger/10" : "bg-brand/10",
        )}
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-card",
                problematic
                  ? "bg-danger-soft text-danger-ink"
                  : "bg-brand-soft text-brand-ink",
              )}
            >
              {problematic ? <AlertTriangle className="size-4" /> : <ShieldCheck className="size-4" />}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              Current package
            </span>
            <StatusBadge status={subscription.status} />
            {subscription.package_code ? (
              <Badge tone="brand" className="font-mono uppercase">
                {subscription.package_code}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight text-ink">
            {subscription.package_name ?? "ไม่ระบุชื่อแพ็กเกจ"}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Paid through {formatDate(subscription.current_period_end)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" />
              {days >= 0 ? `เหลือ ${days} วัน` : `เลยกำหนด ${Math.abs(days)} วัน`}
            </span>
          </p>
          {isPastDue ? (
            <p className="mt-2.5 max-w-2xl rounded-control bg-danger-soft px-3 py-2 text-[11px] font-medium leading-5 text-danger-ink">
              แพ็กเกจเลยวันชำระแล้วและไม่มี grace period — โควต้าจะถูกตั้งเป็น 0
              จนกว่าจะต่ออายุ
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-sm shrink-0 rounded-card border border-line bg-surface/80 p-3.5 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Quota usage
            </p>
            <p className="font-mono text-[11px] font-semibold tabular-nums text-ink">
              {formatNumber(subscription.quota_used)} / {formatNumber(subscription.quota_limit)}
            </p>
          </div>
          <Progress
            value={usedRatio * 100}
            tone={quotaTone(usedRatio)}
            className="mt-2 h-2"
            ariaLabel="โควต้าที่ใช้ไป"
          />
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-secondary">
            <span>เหลือ {formatNumber(subscription.quota_remaining)} ครั้ง</span>
            <span className="font-semibold">{formatPercent(usedRatio)}</span>
          </div>
          {showDetailsLink ? (
            <Link
              href="/subscription"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-ink hover:text-brand"
            >
              ดูรายละเอียดแพ็กเกจ
              <ArrowUpRight className="size-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
