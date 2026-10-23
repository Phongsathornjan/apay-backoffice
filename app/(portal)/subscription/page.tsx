"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CreditCard,
  Gauge,
  KeyRound,
  Package as PackageIcon,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react";
import type {
  BusinessSubscriptionDetailsData,
  DashboardSeries,
  DashboardSubscriptionTrendData,
  Package,
} from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import { getBusinessSubscription } from "@/services/subscriptions";
import { getSubscriptionTrend } from "@/services/dashboard";
import { listPackages } from "@/services/packages";
import { ApiError } from "@/services/api";
import { useApiData } from "@/lib/hooks/use-api-data";
import {
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  quotaTone,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { BusinessContextNotice } from "@/components/dashboard/business-context";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { SeriesChart } from "@/components/charts/dashboard-charts";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/toast";

export default function SubscriptionPage() {
  const { businessId, role } = useAuth();
  const isAdmin = role === "admin";

  const query = useApiData(
    businessId ? `subscription-page:${businessId}` : null,
    async () => {
      const [details, trend, packages] = await Promise.all([
        getBusinessSubscription(businessId!),
        getSubscriptionTrend(isAdmin ? businessId! : undefined),
        listPackages(true),
      ]);
      return { details, trend, packages };
    },
  );

  const details: BusinessSubscriptionDetailsData | undefined = query.data?.details;
  const trend: DashboardSubscriptionTrendData | undefined = query.data?.trend;
  const packages: Package[] = query.data?.packages ?? [];
  const current = trend?.current ?? null;
  const subscription = details?.subscription ?? null;
  const days = current ? (daysUntil(current.current_period_end) ?? current.days_until_period_end) : 0;

  const burnDownSeries: DashboardSeries[] = useMemo(() => {
    const daily = trend?.quota.daily ?? [];
    if (daily.length === 0) return [];
    return [
      {
        key: "cumulative_used",
        label: "Cumulative Used",
        points: daily.map((point) => ({
          bucket_start: point.bucket_start,
          label: point.label,
          value: point.cumulative_used,
        })),
      },
      {
        key: "quota_remaining",
        label: "Quota Remaining",
        points: daily.map((point) => ({
          bucket_start: point.bucket_start,
          label: point.label,
          value: point.quota_remaining,
        })),
      },
      {
        key: "quota_deducted",
        label: "Daily Deducted",
        points: daily.map((point) => ({
          bucket_start: point.bucket_start,
          label: point.label,
          value: point.quota_deducted,
        })),
      },
    ];
  }, [trend?.quota.daily]);

  if (!businessId) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Prepaid billing"
          title="แพ็กเกจ & โควต้า"
          description="ติดตามรอบบิล paid-through การใช้โควต้า และประวัติรอบบิล"
        />
        <BusinessContextNotice feature="Subscription" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Prepaid billing"
          title="แพ็กเกจ & โควต้า"
          description="ติดตามรอบบิล paid-through การใช้โควต้า และประวัติรอบบิล"
        />
        <ErrorNotice
          message={query.error instanceof Error ? query.error.message : "โหลด Subscription ไม่สำเร็จ"}
          correlationId={query.error instanceof ApiError ? query.error.correlationId : null}
          onRetry={query.refetch}
        />
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Prepaid billing"
          title="แพ็กเกจ & โควต้า"
          description="กำลังโหลดรอบบิลและประวัติการใช้งาน..."
        />
        <Skeleton className="h-[170px] w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[340px] w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!subscription || !current) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Prepaid billing"
          title="แพ็กเกจ & โควต้า"
          description="ยังไม่มี Subscription สำหรับธุรกิจนี้"
          actions={
            isAdmin ? (
              <Link href="/admin/businesses">
                <Button icon={<ArrowUpRight className="size-4" />}>ผูกแพ็กเกจ</Button>
              </Link>
            ) : undefined
          }
        />
        <EmptyState
          icon={CreditCard}
          title="ยังไม่มีแพ็กเกจที่ใช้งานอยู่"
          description={
            isAdmin
              ? "ธุรกิจนี้ยังไม่ถูกผูก Subscription กรุณาไปที่หน้าร้านค้าเพื่อ Assign Package"
              : "กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานแพ็กเกจก่อนเริ่มใช้งาน"
          }
          action={
            isAdmin ? (
              <Link href="/admin/businesses">
                <Button size="sm">ไปที่รายการร้านค้า</Button>
              </Link>
            ) : undefined
          }
        />
        <PackageComparison
          packages={packages}
          currentPackageId={null}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  const quotaRatio =
    current.quota_limit > 0 ? current.quota_used / current.quota_limit : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Prepaid billing"
        title="แพ็กเกจ & โควต้า"
        description="ตรวจสอบ paid-through, โควต้าคงเหลือ และรอบบิลย้อนหลัง"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={query.refetch}
              loading={query.isRefreshing}
              icon={<RefreshCw className="size-3.5" />}
            >
              รีเฟรช
            </Button>
            {isAdmin ? (
              <Link href="/admin/businesses">
                <Button size="sm" icon={<ArrowUpRight className="size-3.5" />}>
                  จัดการแพ็กเกจ
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <SubscriptionBanner subscription={current} adminView={isAdmin} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="โควต้าคงเหลือ"
          value={formatNumber(current.quota_remaining)}
          hint={`ใช้ไป ${formatNumber(current.quota_used)} / ${formatNumber(current.quota_limit)} ครั้ง`}
          icon={Gauge}
          tone={quotaRatio >= 0.8 ? "rose" : quotaRatio >= 0.5 ? "amber" : "emerald"}
          footer={<Progress value={quotaRatio * 100} tone={quotaTone(quotaRatio)} />}
        />
        <KpiCard
          label="วันคงเหลือในรอบบิล"
          value={`${days} วัน`}
          hint={`Paid through ${formatDate(current.current_period_end)}`}
          icon={CalendarClock}
          tone={days <= 7 ? "amber" : "indigo"}
        />
        <KpiCard
          label="ชำระครั้งล่าสุด"
          value={current.last_payment_at ? formatDate(current.last_payment_at) : "—"}
          hint={current.last_payment_at ? formatDateTime(current.last_payment_at) : "ยังไม่มีประวัติชำระ"}
          icon={Wallet}
          tone="slate"
        />
        <KpiCard
          label="API Key Slots"
          value={`${formatNumber(details?.api_keys.used ?? 0)} / ${formatNumber(
            details?.api_keys.max ?? current.max_api_keys,
          )}`}
          hint={`Rate limit ${formatNumber(current.rate_limit_per_hour)} requests / hour`}
          icon={KeyRound}
          tone="indigo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Daily Quota Burn-down"
          description="ยอดโควต้าที่ใช้สะสมและโควต้าคงเหลือรายวัน"
        >
          {burnDownSeries.length > 0 ? (
            <SeriesChart series={burnDownSeries} height={300} />
          ) : (
            <EmptyState
              icon={Gauge}
              title="ยังไม่มีการใช้โควต้าในรอบนี้"
              description="กราฟจะเริ่มแสดงเมื่อมีการสร้างและชำระ QR"
              compact
              className="mx-4 mb-4"
            />
          )}
        </ChartCard>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <ReceiptText className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Subscription details</h2>
              <p className="text-[10px] text-slate-400">ข้อมูลรอบบิลปัจจุบัน</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-[11px]">
            {[
              ["Status", null],
              ["Period start", formatDate(subscription.current_period_start)],
              ["Period end", formatDate(subscription.current_period_end)],
              ["Last payment", subscription.last_payment_at ? formatDateTime(subscription.last_payment_at) : "—"],
              ["Rate limit", `${formatNumber(subscription.rate_limit_per_hour)} / hour`],
              ["Max API keys", formatNumber(subscription.max_api_keys)],
              ["Subscription ID", subscription.id],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <dt className="text-slate-400">{label}</dt>
                <dd className="max-w-[60%] text-right font-medium text-slate-700">
                  {value === null ? <StatusBadge status={subscription.status} /> : (
                    <span className={label === "Subscription ID" ? "break-all font-mono text-[9px]" : ""}>
                      {value}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800">
              <Check className="size-3.5" />
              Paid-through คือวันที่ชำระล่วงหน้าถึง
            </p>
            <p className="mt-1 text-[10px] leading-4 text-emerald-700/80">
              หากต่ออายุก่อนครบกำหนด รอบบิลใหม่จะเริ่มต่อจากวันเดิม
              โดยไม่เสียวันคงเหลือ
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">ประวัติรอบบิล</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Billing period history พร้อมเปอร์เซ็นต์การใช้โควต้า
            </p>
          </div>
          <Badge tone="slate">{formatNumber(trend?.periods.length ?? 0)} รอบ</Badge>
        </div>
        {!trend || trend.periods.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ReceiptText}
              title="ยังไม่มีประวัติรอบบิล"
              description="ประวัติจะปรากฏหลังจบรอบบิลหรือมีการต่ออายุ"
              compact
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">Period</th>
                  <th className="px-3 py-2.5">Package ID</th>
                  <th className="px-3 py-2.5 text-right">Quota used</th>
                  <th className="px-3 py-2.5">Utilization</th>
                  <th className="px-3 py-2.5 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trend.periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-[11px] text-slate-700">
                      {formatDate(period.period_start)} – {formatDate(period.period_end)}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-3 font-mono text-[9px] text-slate-400">
                      {period.package_id}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700">
                      {formatNumber(period.quota_used)} / {formatNumber(period.quota_limit)}
                    </td>
                    <td className="w-44 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={period.utilization * 100}
                          tone={quotaTone(period.utilization)}
                          className="h-1.5"
                        />
                        <span className="w-10 text-right font-mono text-[10px] text-slate-500">
                          {formatPercent(period.utilization, 0)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[10px] text-slate-400">
                      {formatDate(period.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PackageComparison
        packages={packages}
        currentPackageId={current.package_id}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function PackageComparison({
  packages,
  currentPackageId,
  isAdmin,
}: {
  packages: Package[];
  currentPackageId: string | null;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">เปรียบเทียบแพ็กเกจ</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Master Packages ที่เปิดใช้งานอยู่ในขณะนี้
          </p>
        </div>
        {isAdmin ? (
          <Link href="/admin/packages" className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800">
            จัดการ Master Packages
          </Link>
        ) : null}
      </div>

      {packages.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={PackageIcon}
            title="ยังไม่มีแพ็กเกจให้เลือก"
            description="ผู้ดูแลระบบยังไม่ได้เปิดใช้งาน Master Package"
            compact
          />
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => {
            const isCurrent = pkg.id === currentPackageId;
            return (
              <div
                key={pkg.id}
                className={`relative rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-emerald-300 bg-emerald-50/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      {pkg.code}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{pkg.name}</h3>
                  </div>
                  {isCurrent ? (
                    <Badge tone="emerald" dot>
                      Current
                    </Badge>
                  ) : (
                    <Badge tone={pkg.is_active ? "slate" : "rose"}>
                      {pkg.is_active ? "Available" : "Inactive"}
                    </Badge>
                  )}
                </div>
                <p className="mt-3">
                  <span className="text-xl font-bold tabular-nums text-slate-900">
                    {formatCurrency(pkg.price)}
                  </span>
                  <span className="ml-1 text-[10px] text-slate-400">
                    / {pkg.billing_cycle_months} เดือน
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5 text-[10px] text-slate-500">
                  <li className="flex items-center justify-between gap-2">
                    <span>Quota</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatNumber(pkg.quota_limit)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>Rate limit</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatNumber(pkg.rate_limit_per_hour)}/hr
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span>API keys</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatNumber(pkg.max_api_keys)}
                    </span>
                  </li>
                </ul>
                {pkg.description ? (
                  <p className="mt-3 line-clamp-2 text-[10px] leading-4 text-slate-400">
                    {pkg.description}
                  </p>
                ) : null}
                {isCurrent ? (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <Check className="size-3" />
                    แพ็กเกจที่ใช้งานอยู่
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
