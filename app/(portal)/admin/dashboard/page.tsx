"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  Eye,
  Gauge,
  QrCode,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import type { AdminExpiringData } from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getAdminDistribution,
  getAdminExpiring,
  getAdminOverview,
  getAdminTimeseries,
} from "@/services/dashboard";
import { listPackages } from "@/services/packages";
import { ApiError } from "@/services/api";
import { useApiData } from "@/lib/hooks/use-api-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { buildPresetRange, rangeQuery, type DateRangeValue } from "@/lib/date-range";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChartCard } from "@/components/charts/chart-card";
import {
  CHART_COLORS,
  CategoryBarChart,
  ChartLegend,
  DonutChart,
  SeriesChart,
} from "@/components/charts/dashboard-charts";
import { RenewSubscriptionModal } from "@/components/admin/renew-subscription-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice } from "@/components/ui/toast";
import { Skeleton, KpiSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SUBSCRIPTION_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  PAST_DUE: "#f43f5e",
  CANCELLED: "#94a3b8",
};

export default function AdminDashboardPage() {
  const { setActiveBusiness } = useAuth();
  const router = useRouter();
  const [range, setRange] = useState<DateRangeValue>(() => buildPresetRange("last_30d"));
  const [expiringDays, setExpiringDays] = useState(7);
  const debouncedDays = useDebouncedValue(expiringDays, 450);
  const [quotaThreshold, setQuotaThreshold] = useState(0.8);
  const [renewTarget, setRenewTarget] = useState<{
    subscriptionId: string;
    businessName: string;
  } | null>(null);

  const core = useApiData(`admin-dashboard-core:${JSON.stringify(rangeQuery(range))}`, async () => {
    const [overview, timeseries, distribution] = await Promise.all([
      getAdminOverview(rangeQuery(range)),
      getAdminTimeseries(rangeQuery(range)),
      getAdminDistribution(),
    ]);
    return { overview, timeseries, distribution };
  });

  const expiring = useApiData<AdminExpiringData>(
    `admin-expiring:${debouncedDays}:${quotaThreshold}`,
    () =>
      getAdminExpiring({
        days: debouncedDays,
        quota_threshold: quotaThreshold,
      }),
  );

  const packages = useApiData("admin-active-packages", () => listPackages(true));

  const overview = core.data?.overview;
  const distribution = core.data?.distribution;
  const timeseries = core.data?.timeseries.series ?? [];
  const expiringData = expiring.data;

  const openBusiness = (businessId: string, businessName: string) => {
    setActiveBusiness({ id: businessId, name: businessName });
    router.push("/dashboard");
  };

  if (core.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Platform overview"
          title="ภาพรวมแพลตฟอร์ม"
          description="MRR/ARR ภาพรวมธุรกิจ Subscription และประสิทธิภาพ Webhook"
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />
        <ErrorNotice
          message={core.error instanceof Error ? core.error.message : "โหลด Platform Analytics ไม่สำเร็จ"}
          correlationId={core.error instanceof ApiError ? core.error.correlationId : null}
          onRetry={core.refetch}
        />
      </div>
    );
  }

  if (core.isLoading || !overview) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Platform overview"
          title="ภาพรวมแพลตฟอร์ม"
          description="กำลังโหลดข้อมูลทั้งแพลตฟอร์ม..."
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <ChartSkeleton className="xl:col-span-2" />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const packagesDistribution =
    distribution?.packages.map((pkg, index) => ({
      name: pkg.code,
      value: pkg.business_count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    })) ?? [];

  const statusDistribution =
    distribution?.subscription_status.map((item) => ({
      name: item.status,
      value: item.count,
      color: SUBSCRIPTION_COLORS[item.status] ?? "#94a3b8",
    })) ?? [];

  const quotaDistribution =
    distribution?.quota_utilization.map((item) => ({
      name: `${item.bucket}%`,
      value: item.count,
      color:
        item.bucket === "76-100" || item.bucket === "100+"
          ? "#f43f5e"
          : item.bucket === "51-75"
            ? "#f59e0b"
            : "#10b981",
    })) ?? [];

  const paidRate = overview.platform.paid_rate;
  const expiring7 = overview.subscriptions.expiring_7d;
  const expiring30 = overview.subscriptions.expiring_30d;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform overview"
        title="ภาพรวมแพลตฟอร์ม"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>Executive analytics · ข้อมูลทั้งแพลตฟอร์ม · Asia/Bangkok</span>
            <Badge tone="indigo">{range.interval.toUpperCase()}</Badge>
          </span>
        }
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                core.refetch();
                expiring.refetch();
              }}
              loading={core.isRefreshing}
              icon={<RefreshCw className="size-3.5" />}
            >
              รีเฟรช
            </Button>
            <Link href="/admin/businesses">
              <Button size="sm" icon={<Building2 className="size-3.5" />}>
                จัดการร้านค้า
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estimated MRR"
          value={formatCurrency(overview.estimated_mrr)}
          hint="รายได้แพ็กเกจประจำเดือนโดยประมาณ"
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Estimated ARR"
          value={formatCurrency(overview.estimated_arr)}
          hint="Annualized run-rate จากแพ็กเกจที่ใช้งาน"
          icon={Wallet}
          tone="indigo"
        />
        <KpiCard
          label="Platform GMV"
          value={formatCurrency(overview.platform.gmv)}
          hint={`AOV ${formatCurrency(overview.platform.average_order_value)} · Paid rate ${formatPercent(paidRate)}`}
          icon={ReceiptText}
          tone="emerald"
        />
        <KpiCard
          label="Webhook Match Rate"
          value={formatPercent(overview.webhook.match_rate)}
          hint={`Matched ${formatNumber(overview.webhook.matched)} · No match ${formatNumber(
            overview.webhook.no_match,
          )}`}
          icon={Webhook}
          tone={overview.webhook.match_rate < 0.8 ? "amber" : "emerald"}
          footer={
            <Progress
              value={overview.webhook.match_rate * 100}
              tone={overview.webhook.match_rate < 0.8 ? "amber" : "emerald"}
            />
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Businesses"
          value={formatNumber(overview.businesses.total)}
          hint={`Active ${formatNumber(overview.businesses.active)} · New ${formatNumber(
            overview.businesses.new_in_range,
          )} ในช่วงนี้`}
          icon={Building2}
          tone="slate"
        />
        <KpiCard
          label="Active Subscriptions"
          value={formatNumber(overview.subscriptions.active)}
          hint={`Past due ${formatNumber(overview.subscriptions.past_due)} · Cancelled ${formatNumber(
            overview.subscriptions.cancelled,
          )}`}
          icon={CreditCard}
          tone="emerald"
        />
        <KpiCard
          label="Expiring Soon"
          value={`${formatNumber(expiring7)} / ${formatNumber(expiring30)}`}
          hint="ภายใน 7 วัน / 30 วัน"
          icon={CalendarClock}
          tone={expiring7 > 0 ? "amber" : "slate"}
          footer={
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700">
              <AlertTriangle className="size-3" />
              ต้องติดตามการต่ออายุ
            </div>
          }
        />
        <KpiCard
          label="QR ที่สร้าง / ชำระ"
          value={`${formatNumber(overview.platform.qr_created)} / ${formatNumber(
            overview.platform.qr_paid,
          )}`}
          hint={`Orders ${formatNumber(overview.platform.orders_created)} · Paid ${formatNumber(
            overview.platform.paid_count,
          )} · Expired ${formatNumber(overview.platform.expired_count)}`}
          icon={QrCode}
          tone="indigo"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertTriangle className="size-4 text-amber-500" />
              Actionable Alerts
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              ร้านค้าที่ใกล้หมดอายุหรือใกล้ใช้โควต้าเต็ม — ต่ออายุ/อัปเกรดได้ทันที
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-slate-500">หมดอายุใน</span>
              <input
                type="range"
                min={1}
                max={90}
                value={expiringDays}
                onChange={(event) => setExpiringDays(Number(event.target.value))}
                className="h-1.5 w-24 accent-emerald-600"
                aria-label="จำนวนวันล่วงหน้าที่ต้องการแจ้งเตือน"
              />
              <span className="min-w-9 font-mono text-[10px] font-semibold text-slate-700">
                {expiringDays} วัน
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-slate-500">Near quota</span>
              <select
                value={quotaThreshold}
                onChange={(event) => setQuotaThreshold(Number(event.target.value))}
                aria-label="เกณฑ์โควต้าใกล้เต็ม"
                className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
              >
                {[0.5, 0.7, 0.8, 0.9, 1].map((value) => (
                  <option key={value} value={value}>
                    ≥ {Math.round(value * 100)}%
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {expiring.error ? (
          <div className="p-4">
            <ErrorNotice
              message={
                expiring.error instanceof Error
                  ? expiring.error.message
                  : "โหลดรายการแจ้งเตือนไม่สำเร็จ"
              }
              correlationId={
                expiring.error instanceof ApiError ? expiring.error.correlationId : null
              }
              onRetry={expiring.refetch}
            />
          </div>
        ) : expiring.isLoading || !expiringData ? (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <AlertTable
              title="ใกล้หมดอายุ"
              count={expiringData.expiring.length}
              tone="amber"
              emptyText="ไม่มีร้านค้าที่ใกล้หมดอายุในช่วงนี้"
            >
              {expiringData.expiring.map((item) => (
                <tr key={item.subscription_id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="max-w-[150px] truncate text-xs font-semibold text-slate-800">
                      {item.business_name}
                    </p>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[10px] text-slate-600">
                      {formatDate(item.current_period_end)}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold text-amber-600">
                      เหลือ {item.days_remaining} วัน
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="font-mono text-[10px] text-slate-600">
                      {formatNumber(item.quota_remaining)} / {formatNumber(item.quota_limit)}
                    </p>
                    <p className="text-[9px] text-slate-400">quota left</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() =>
                          setRenewTarget({
                            subscriptionId: item.subscription_id,
                            businessName: item.business_name,
                          })
                        }
                      >
                        Renew
                      </Button>
                      <button
                        type="button"
                        onClick={() => openBusiness(item.business_id, item.business_name)}
                        aria-label={`ดู ${item.business_name}`}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </AlertTable>

            <AlertTable
              title="โควต้าใกล้เต็ม"
              count={expiringData.near_quota.length}
              tone="rose"
              emptyText={`ไม่มีร้านค้าที่ใช้โควต้าเกิน ${Math.round(quotaThreshold * 100)}%`}
            >
              {expiringData.near_quota.map((item) => (
                <tr key={item.subscription_id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="max-w-[150px] truncate text-xs font-semibold text-slate-800">
                      {item.business_name}
                    </p>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="w-36 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={item.utilization * 100}
                        tone={item.utilization >= 0.9 ? "rose" : "amber"}
                        className="h-1.5"
                      />
                      <span className="w-10 text-right font-mono text-[10px] font-semibold text-slate-600">
                        {formatPercent(item.utilization, 0)}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-slate-400">
                      {formatNumber(item.quota_used)} / {formatNumber(item.quota_limit)}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="font-mono text-[10px] text-slate-600">
                      {formatNumber(item.quota_remaining)}
                    </p>
                    <p className="text-[9px] text-slate-400">remaining</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() =>
                          setRenewTarget({
                            subscriptionId: item.subscription_id,
                            businessName: item.business_name,
                          })
                        }
                      >
                        Upgrade
                      </Button>
                      <button
                        type="button"
                        onClick={() => openBusiness(item.business_id, item.business_name)}
                        aria-label={`ดู ${item.business_name}`}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </AlertTable>
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[9px] text-slate-400">
          อัปเดตอัตโนมัติตามตัวกรอง · ข้อมูล Usage จาก Subscription API
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Platform Activity"
          description="จำนวนธุรกิจใหม่ คำสั่งซื้อ QR และรายการที่ชำระสำเร็จ"
          action={
            <ChartLegend
              items={timeseries
                .filter((serie) =>
                  ["new_businesses", "orders_created", "paid_count", "qr_created", "qr_paid"].includes(
                    serie.key,
                  ),
                )
                .map((serie) => ({ label: serie.label }))}
            />
          }
        >
          <SeriesChart
            series={timeseries.filter((serie) =>
              ["new_businesses", "orders_created", "paid_count", "qr_created", "qr_paid"].includes(
                serie.key,
              ),
            )}
            height={300}
          />
        </ChartCard>

        <ChartCard
          title="GMV Trend"
          description="ยอดรับชำระรวมทั้งแพลตฟอร์ม (THB)"
        >
          <SeriesChart
            series={timeseries.filter((serie) => serie.key === "gmv")}
            height={300}
            currency
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="สัดส่วนร้านค้าตามแพ็กเกจ"
          description="จำนวนธุรกิจในแต่ละ Master Package"
        >
          <CategoryBarChart
            data={packagesDistribution}
            height={256}
            valueLabel="Businesses"
          />
        </ChartCard>
        <ChartCard
          title="สถานะ Subscription"
          description="ภาพรวม Active / Past due / Cancelled"
        >
          <DonutChart
            data={statusDistribution}
            height={230}
            centerLabel="Subscriptions"
            centerValue={formatNumber(
              statusDistribution.reduce((sum, item) => sum + item.value, 0),
            )}
          />
          <div className="mx-4 mb-2 grid grid-cols-3 gap-1.5">
            {statusDistribution.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center"
              >
                <p className="font-mono text-sm font-semibold tabular-nums text-slate-700">
                  {formatNumber(item.value)}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-medium uppercase tracking-wide text-slate-400">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard
          title="การกระจายการใช้โควต้า"
          description="สัดส่วนร้านค้าตามช่วง utilization"
        >
          <CategoryBarChart
            data={quotaDistribution}
            height={256}
            valueLabel="Businesses"
          />
        </ChartCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Orders Created", value: overview.platform.orders_created, icon: ReceiptText },
          { label: "Paid Count", value: overview.platform.paid_count, icon: CreditCard },
          { label: "Active Unverified", value: overview.platform.active_unverified_count, icon: Gauge },
          { label: "QR Paid", value: overview.platform.qr_paid, icon: QrCode },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                {formatNumber(item.value)}
              </p>
            </div>
            <item.icon className="size-4 text-slate-300" />
          </div>
        ))}
      </div>

      {renewTarget ? (
        <RenewSubscriptionModal
          key={renewTarget.subscriptionId}
          open
          businessName={renewTarget.businessName}
          subscriptionId={renewTarget.subscriptionId}
          packages={packages.data ?? []}
          onClose={() => setRenewTarget(null)}
          onRenewed={() => {
            core.refetch();
            expiring.refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function AlertTable({
  title,
  count,
  tone,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  tone: "amber" | "rose";
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
          <span
            className={cn(
              "size-1.5 rounded-full",
              tone === "amber" ? "bg-amber-500" : "bg-rose-500",
            )}
          />
          {title}
        </p>
        <Badge tone={tone === "amber" ? "amber" : "rose"}>{formatNumber(count)}</Badge>
      </div>
      {count === 0 ? (
        <EmptyState
          icon={Users}
          title={emptyText}
          compact
          className="mx-4 mb-4 mt-2 border-0 bg-transparent py-7"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-left">
            <thead>
              <tr className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Business</th>
                <th className="px-3 py-2">Period / Usage</th>
                <th className="px-3 py-2 text-right">Quota</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
