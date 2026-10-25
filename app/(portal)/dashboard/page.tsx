"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  CreditCard,
  KeyRound,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Webhook,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getBusinessOverview,
  getRateLimit,
  getTransactionsTimeseries,
  getUsageTimeseries,
} from "@/services/dashboard";
import { listApiKeys } from "@/services/api-keys";
import { useApiData } from "@/lib/hooks/use-api-data";
import { buildPresetRange, rangeQuery, type DateRangeValue } from "@/lib/date-range";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  quotaTone,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BusinessContextNotice } from "@/components/dashboard/business-context";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { LineLinkCard } from "@/components/dashboard/line-link-card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChartCard } from "@/components/charts/chart-card";
import { STATUS_COLORS } from "@/lib/chart-colors";
import {
  CHART_COLORS,
  ChartLegend,
  DonutChart,
  FinancialChart,
  PointsAreaChart,
  RadialGauge,
  SeriesChart,
} from "@/components/charts/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Skeleton, KpiSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorNotice } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/services/api";
import type { ApiKeySummary } from "@/types/api";

export default function MerchantDashboardPage() {
  const { role, businessId, activeBusiness, setBusinessDisplayName } = useAuth();
  const [range, setRange] = useState<DateRangeValue>(() => buildPresetRange("last_30d"));
  const [usageMetric, setUsageMetric] = useState<"" | "qr_created" | "qr_paid" | "quota_deducted">(
    "",
  );
  const [usageKeyId, setUsageKeyId] = useState("");
  const isAdminView = role === "admin";
  // Business scope comes from the JWT; only admin may select a business.
  const scopedBusinessId = isAdminView ? (businessId ?? undefined) : undefined;

  const scopedKey = businessId
    ? JSON.stringify({ businessId, ...rangeQuery(range) })
    : null;

  const core = useApiData(scopedKey ? `dashboard-core:${scopedKey}` : null, async () => {
    const [overview, transactions, rateLimit] = await Promise.all([
      getBusinessOverview({ ...rangeQuery(range), business_id: scopedBusinessId }),
      getTransactionsTimeseries({
        ...rangeQuery(range),
        business_id: scopedBusinessId,
      }),
      getRateLimit({
        hours: range.interval === "hour" ? 24 : 168,
        business_id: scopedBusinessId,
      }),
    ]);
    return { overview, transactions, rateLimit };
  });

  const usage = useApiData(
    businessId
      ? `dashboard-usage:${JSON.stringify({
          businessId,
          ...rangeQuery(range),
          usageMetric,
          usageKeyId,
        })}`
      : null,
    () =>
      getUsageTimeseries({
        ...rangeQuery(range),
        business_id: scopedBusinessId,
        ...(usageMetric ? { metric: usageMetric } : {}),
        ...(usageKeyId ? { api_key_id: usageKeyId } : {}),
      }),
  );

  const keys = useApiData<ApiKeySummary[]>(
    businessId ? `dashboard-keys:${businessId}` : null,
    () => listApiKeys(scopedBusinessId),
  );

  const overview = core.data?.overview;
  const subscription = overview?.subscription ?? null;
  const transactions = overview?.transactions;
  const usageData = overview?.usage;
  const transactionSeries = core.data?.transactions.series ?? [];
  const statusBreakdown = core.data?.transactions.status_breakdown;
  const rateLimit = core.data?.rateLimit;

  useEffect(() => {
    if (isAdminView && overview?.business.name) {
      setBusinessDisplayName(overview.business.name);
    }
  }, [isAdminView, overview?.business.name, setBusinessDisplayName]);

  const quotaRatio =
    subscription && subscription.quota_limit > 0
      ? subscription.quota_used / subscription.quota_limit
      : 0;
  const rateRatio = rateLimit?.utilization ?? 0;

  const statusData = statusBreakdown
    ? [
        { name: "PAID", value: statusBreakdown.PAID, color: STATUS_COLORS.paid },
        {
          name: "UNVERIFIED · active",
          value: statusBreakdown.UNVERIFIED.active,
          color: STATUS_COLORS.unverifiedActive,
        },
        {
          name: "UNVERIFIED · expired",
          value: statusBreakdown.UNVERIFIED.expired,
          color: STATUS_COLORS.unverifiedExpired,
        },
        { name: "EXPIRED", value: statusBreakdown.EXPIRED, color: STATUS_COLORS.expired },
      ]
    : [];

  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  if (!businessId) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Merchant overview"
          title="ภาพรวมร้านค้า"
          description="ดูยอดรับชำระ การใช้งาน QR โควต้า และสถานะแพ็กเกจของร้านค้า"
        />
        <BusinessContextNotice feature="ภาพรวมร้านค้า" />
      </div>
    );
  }

  if (core.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Merchant overview"
          title="ภาพรวมร้านค้า"
          description={activeBusiness?.name}
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />
        <ErrorNotice
          message={core.error instanceof Error ? core.error.message : "โหลดข้อมูลไม่สำเร็จ"}
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
          eyebrow="Merchant overview"
          title="ภาพรวมร้านค้า"
          description="กำลังโหลดข้อมูลล่าสุด..."
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />
        <Skeleton className="h-[166px] w-full rounded-panel" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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

  const displayUsageSeries = usageMetric
    ? (usage.data?.series ?? []).filter((serie) => serie.key === usageMetric)
    : (usage.data?.series ?? []);

  const usageMetricLabel: Record<string, string> = {
    qr_created: "QR Created",
    qr_paid: "QR Paid",
    quota_deducted: "Quota Deducted",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isAdminView ? "Admin · merchant drill-down" : "Merchant overview"}
        title={overview.business.name || "ภาพรวมร้านค้า"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>ข้อมูลช่วง {range.interval === "hour" ? "รายชั่วโมง" : "รายวัน"} · เขตเวลาไทย</span>
            {subscription ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                <ShieldCheck className="size-3 text-success-ink" />
                {subscription.package_name}
              </span>
            ) : null}
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
                usage.refetch();
                keys.refetch();
              }}
              loading={core.isRefreshing || usage.isRefreshing}
              icon={<RefreshCw className="size-3.5" />}
            >
              รีเฟรช
            </Button>
          </>
        }
      />

      <SubscriptionBanner subscription={subscription} adminView={isAdminView} />

      <LineLinkCard adminView={isAdminView} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="ยอดรับชำระรวม"
          value={formatCurrency(transactions?.gmv)}
          hint={`จาก ${formatNumber(transactions?.paid_count)} รายการที่ชำระสำเร็จ`}
          icon={Wallet}
          tone="brand"
        />
        <KpiCard
          label="ค่าเฉลี่ยต่อบิล"
          value={formatCurrency(transactions?.average_order_value)}
          hint={`Paid rate ${formatPercent(transactions?.paid_rate)}`}
          icon={ReceiptText}
          tone="info"
        />
        <KpiCard
          label="รายการทั้งหมด"
          value={formatNumber(transactions?.orders_created)}
          hint={`Paid ${formatNumber(transactions?.paid_count)} · Expired ${formatNumber(
            transactions?.expired_count,
          )} · Active ${formatNumber(transactions?.active_unverified_count)}`}
          icon={Banknote}
          tone="neutral"
        />
        <KpiCard
          label="ชำระเงินสำเร็จ"
          value={`${formatNumber(usageData?.qr_paid)}`}
          hint={`คิดเป็น ${(usageData?.qr_paid ?? 0) / Math.max(transactions?.orders_created ?? 1, 1) * 100}% ของรายการทั้งหมด`}
          icon={QrCode}
          tone="success"
        />
        <KpiCard
          label="โควต้าคงเหลือ"
          value={subscription ? formatNumber(subscription.quota_remaining) : "—"}
          hint={
            subscription
              ? `ใช้ไป ${formatPercent(quotaRatio)} ของ ${formatNumber(
                  subscription.quota_limit,
                )} ครั้ง`
              : "ยังไม่มีแพ็กเกจที่ใช้งาน"
          }
          icon={CreditCard}
          tone={quotaRatio >= 0.8 ? "danger" : quotaRatio >= 0.5 ? "warning" : "brand"}
          footer={
            subscription ? (
              <Progress value={quotaRatio * 100} tone={quotaTone(quotaRatio)} />
            ) : undefined
          }
        />
        <KpiCard
          label="API Key Slots"
          value={`${formatNumber(overview.api_keys.used)} / ${formatNumber(
            overview.api_keys.max,
          )}`}
          hint={`Active ${formatNumber(overview.api_keys.active)} คีย์`}
          icon={KeyRound}
          tone="brand"
          footer={<Progress value={overview.api_keys.max ? (overview.api_keys.used / overview.api_keys.max) * 100 : 0} tone="brand" />}
        />
        <KpiCard
          label="Rate Limit ชั่วโมงล่าสุด"
          value={`${formatNumber(overview.rate_limit.requests_last_hour)} / ${formatNumber(
            overview.rate_limit.limit,
          )}`}
          hint={`ใช้ไป ${formatPercent(overview.rate_limit.utilization)} · เหลือ ${formatNumber(
            overview.rate_limit.remaining,
          )} คำขอ`}
          icon={Activity}
          tone={overview.rate_limit.utilization >= 0.8 ? "danger" : "neutral"}
          footer={<Progress value={overview.rate_limit.utilization * 100} tone={quotaTone(overview.rate_limit.utilization)} />}
        />
        <KpiCard
          label="Webhook ที่จับคู่สำเร็จ"
          value={formatNumber(overview.webhook.matched)}
          hint="รายการ KBank LINE ที่ยืนยันยอดและเปลี่ยนเป็น PAID"
          icon={Webhook}
          tone="success"
          footer={
            <Link
              href="/payments"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-ink hover:text-brand"
            >
              เปิด Payment Inspector
              <ArrowUpRight className="size-3" />
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="ปริมาณธุรกรรม"
          description="เปรียบเทียบคำสั่งซื้อที่สร้าง ชำระสำเร็จ และหมดอายุ"
          action={
            <ChartLegend
              items={transactionSeries.map((serie) => ({ label: serie.label }))}
            />
          }
        >
          <SeriesChart series={transactionSeries} height={292} />
        </ChartCard>

        <ChartCard
          title="สัดส่วนสถานะรายการ"
          description={`ทั้งหมด ${formatNumber(statusTotal)} รายการในช่วงนี้`}
        >
          <DonutChart
            data={statusData}
            centerValue={formatNumber(statusTotal)}
            centerLabel="รายการ"
            height={218}
          />
          <div className="mx-4 mb-2 grid grid-cols-2 gap-2">
            {statusData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-subtle px-2.5 py-2"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-secondary">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-ink">
                  {formatNumber(item.value)}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="GMV และค่าเฉลี่ยต่อบิล"
          description="แท่ง = GMV, เส้น = Average Order Value (THB)"
        >
          <FinancialChart
            series={transactionSeries.filter((serie) =>
              ["gmv", "average_order_value"].includes(serie.key),
            )}
            height={286}
          />
        </ChartCard>

        <ChartCard
          title="Rate Limit"
          description={
            rateLimit
              ? `60 นาทีล่าสุด · limit ${formatNumber(rateLimit.limit_per_hour)}/ชม.`
              : "กำลังโหลด"
          }
        >
          <RadialGauge
            value={rateRatio}
            label="Utilization"
            detail={
              rateLimit
                ? `${formatNumber(rateLimit.requests_last_hour)} requests · เหลือ ${formatNumber(
                    rateLimit.remaining,
                  )}`
                : undefined
            }
          />
          <div className="mx-4 mb-1 grid grid-cols-3 gap-2 border-t border-line pt-3">
            {[
              { label: "Requests", value: rateLimit?.requests_last_hour ?? 0 },
              { label: "Limit", value: rateLimit?.limit_per_hour ?? 0 },
              { label: "Remaining", value: rateLimit?.remaining ?? 0 },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                  {formatNumber(item.value)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="การใช้งาน QR และโควต้า"
          description="ข้อมูลแบบ zero-fill ทุก bucket ตามเขตเวลา Asia/Bangkok"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={usageMetric}
                onChange={(event) =>
                  setUsageMetric(
                    event.target.value as "" | "qr_created" | "qr_paid" | "quota_deducted",
                  )
                }
                aria-label="กรอง metric"
                className="h-8 rounded-control border border-line bg-surface px-2 text-[11px] font-medium text-ink-secondary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                <option value="">ทุก Metric</option>
                <option value="qr_created">QR Created</option>
                <option value="qr_paid">QR Paid</option>
                <option value="quota_deducted">Quota Deducted</option>
              </select>
              <select
                value={usageKeyId}
                onChange={(event) => setUsageKeyId(event.target.value)}
                aria-label="กรอง API Key"
                className="h-8 max-w-[150px] rounded-control border border-line bg-surface px-2 text-[11px] font-medium text-ink-secondary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                <option value="">ทุก API Key</option>
                {(keys.data ?? []).map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {usage.error ? (
            <div className="mx-4 mb-3">
              <ErrorNotice
                message={usage.error instanceof Error ? usage.error.message : "โหลด Usage ไม่สำเร็จ"}
                correlationId={usage.error instanceof ApiError ? usage.error.correlationId : null}
                onRetry={usage.refetch}
              />
            </div>
          ) : usage.isLoading ? (
            <div className="h-[286px] px-4 py-4">
              <Skeleton className="size-full" />
            </div>
          ) : (
            <>
              <div className="px-4 pb-1">
                <ChartLegend
                  items={displayUsageSeries.map((serie) => ({
                    label: usageMetricLabel[serie.key] ?? serie.label,
                  }))}
                />
              </div>
              <SeriesChart series={displayUsageSeries} height={286} />
            </>
          )}
        </ChartCard>

        <ChartCard
          title="คำขอรายชั่วโมง"
          description="Rate limit utilization ย้อนหลัง"
        >
          <PointsAreaChart
            points={rateLimit?.series ?? []}
            height={286}
            color={CHART_COLORS[1]}
          />
        </ChartCard>
      </div>

      {!subscription ? (
        <EmptyState
          icon={CreditCard}
          title="ยังไม่มี Subscription ในช่วงเวลานี้"
          description={
            isAdminView
              ? "คุณสามารถผูกแพ็กเกจให้ธุรกิจนี้ได้จากหน้าร้านค้าและ Subscription"
              : "ข้อมูล KPI จะแสดงได้เมื่อมีแพ็กเกจและเริ่มสร้าง QR"
          }
          action={
            isAdminView ? (
              <Link href="/admin/businesses">
                <Button size="sm">จัดการแพ็กเกจ</Button>
              </Link>
            ) : undefined
          }
          compact
        />
      ) : null}
    </div>
  );
}
