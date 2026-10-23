"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CreditCard,
  Eye,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react";
import type {
  AdminBusinessListData,
  AdminBusinessListItem,
  AdminBusinessListQuery,
  Package,
  SubscriptionStatus,
} from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import { getAdminBusinesses } from "@/services/dashboard";
import { getBusinessSubscription } from "@/services/subscriptions";
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
import { getInitials } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { RegisterBusinessModal } from "@/components/admin/register-business-modal";
import { AssignPackageModal } from "@/components/admin/assign-package-modal";
import { RenewSubscriptionModal } from "@/components/admin/renew-subscription-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

type SortBy = NonNullable<AdminBusinessListQuery["sort_by"]>;

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "created_at", label: "Created date" },
  { value: "gmv", label: "GMV" },
  { value: "qr_created", label: "QR Created" },
  { value: "qr_paid", label: "QR Paid" },
  { value: "quota_used", label: "Quota Used" },
  { value: "current_period_end", label: "Period End" },
];

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: SortBy;
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== column) return null;
  return sortOrder === "asc" ? (
    <ArrowUp className="size-3" />
  ) : (
    <ArrowDown className="size-3" />
  );
}

export default function AdminBusinessesPage() {
  const router = useRouter();
  const { setActiveBusiness } = useAuth();
  const { notifyError, info } = useToast();
  const [range, setRange] = useState<DateRangeValue>(() => buildPresetRange("last_30d"));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [packageId, setPackageId] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminBusinessListItem | null>(null);
  const [renewTarget, setRenewTarget] = useState<{
    subscriptionId: string;
    businessName: string;
  } | null>(null);
  const [loadingRenew, setLoadingRenew] = useState<string | null>(null);

  const packagesQuery = useApiData("admin-all-packages", () => listPackages(false));
  const packages = useMemo<Package[]>(() => packagesQuery.data ?? [], [packagesQuery.data]);
  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.is_active),
    [packages],
  );

  const query = useApiData<AdminBusinessListData>(
    `admin-businesses:${JSON.stringify({
      ...rangeQuery(range),
      search: debouncedSearch,
      status,
      packageId,
      sortBy,
      sortOrder,
      page,
      limit,
    })}`,
    () =>
      getAdminBusinesses({
        ...rangeQuery(range),
        search: debouncedSearch.trim() || undefined,
        status: status || undefined,
        package_id: packageId || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      }),
  );

  const data = query.data;
  const items = data?.items ?? [];

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPackageId("");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const refresh = () => {
    query.refetch();
    packagesQuery.refetch();
  };

  const openRenew = async (business: AdminBusinessListItem) => {
    if (!business.subscription_status) {
      info("ร้านค้านี้ยังไม่มี Subscription — กรุณา Assign Package ก่อน", {
        title: "ยังไม่มีแพ็กเกจ",
      });
      setAssignTarget(business);
      return;
    }

    setLoadingRenew(business.business_id);
    try {
      const details = await getBusinessSubscription(business.business_id);
      if (!details.subscription) {
        info("ไม่พบ Subscription ที่ต่ออายุได้", { title: "ไม่พบข้อมูล" });
        setAssignTarget(business);
        return;
      }
      setRenewTarget({
        subscriptionId: details.subscription.id,
        businessName: business.business_name,
      });
    } catch (cause) {
      notifyError(cause, "โหลดข้อมูล Subscription ไม่สำเร็จ");
    } finally {
      setLoadingRenew(null);
    }
  };

  const openBusiness = (business: AdminBusinessListItem) => {
    setActiveBusiness({ id: business.business_id, name: business.business_name });
    router.push("/dashboard");
  };

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  if (query.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Merchant management"
          title="ร้านค้า & Subscription"
          description="ค้นหา จัดการแพ็กเกจ และต่ออายุร้านค้าทั้งแพลตฟอร์ม"
        />
        <ErrorNotice
          message={query.error instanceof Error ? query.error.message : "โหลดรายการร้านค้าไม่สำเร็จ"}
          correlationId={query.error instanceof ApiError ? query.error.correlationId : null}
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Merchant management"
        title="ร้านค้า & Subscription"
        description="จัดการทุกธุรกิจบนแพลตฟอร์ม พร้อม Usage, GMV และ paid-through"
        actions={
          <>
            <DateRangePicker value={range} onChange={(next) => { setRange(next); setPage(1); }} />
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              loading={query.isRefreshing}
              icon={<RefreshCw className="size-3.5" />}
            >
              รีเฟรช
            </Button>
            <Button
              size="sm"
              onClick={() => setRegisterOpen(true)}
              icon={<UserPlus className="size-3.5" />}
            >
              Register Business
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อร้านค้า..."
              maxLength={150}
              className="pl-10"
            />
          </div>

          <Select
            value={packageId}
            onChange={(event) => {
              setPackageId(event.target.value);
              setPage(1);
            }}
            aria-label="กรองตามแพ็กเกจ"
            className="w-full sm:w-[180px]"
          >
            <option value="">ทุกแพ็กเกจ</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.code} · {pkg.name}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SubscriptionStatus | "");
              setPage(1);
            }}
            aria-label="กรองตามสถานะ Subscription"
            className="w-full sm:w-[160px]"
          >
            <option value="">ทุกสถานะ</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAST_DUE">PAST_DUE</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>

          <div className="flex items-center gap-1">
            <Select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortBy);
                setPage(1);
              }}
              aria-label="เรียงลำดับตาม"
              className="w-[150px]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}
              aria-label={sortOrder === "asc" ? "เรียงจากน้อยไปมาก" : "เรียงจากมากไปน้อย"}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              {sortOrder === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            icon={<SlidersHorizontal className="size-3.5" />}
          >
            ล้างตัวกรอง
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] text-slate-400">
          <span>
            {debouncedSearch ? `ผลการค้นหา "${debouncedSearch}" · ` : ""}
            {formatNumber(data?.pagination.total ?? 0)} ร้านค้า
          </span>
          <span className="font-mono">
            {range.interval.toUpperCase()} range · {formatNumber(limit)} / page
          </span>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Building2}
              title="ไม่พบร้านค้าตามเงื่อนไข"
              description="ลองปรับคำค้นหา ตัวกรอง หรือช่วงวันที่"
              action={
                <Button size="sm" variant="secondary" onClick={resetFilters}>
                  ล้างตัวกรอง
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-4 py-2.5 sm:px-5">Business</th>
                  <th className="px-3 py-2.5">Package</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Quota</th>
                  <th className="px-3 py-2.5">API Keys</th>
                  <th className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort("qr_created")}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-slate-700"
                    >
                      QR <SortIcon column="qr_created" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort("gmv")}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-slate-700"
                    >
                      GMV <SortIcon column="gmv" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("current_period_end")}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-slate-700"
                    >
                      Period end <SortIcon column="current_period_end" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((business) => {
                  const quotaRatio =
                    business.quota_limit && business.quota_limit > 0
                      ? (business.quota_used ?? 0) / business.quota_limit
                      : 0;
                  const keyRatio =
                    business.api_keys_max && business.api_keys_max > 0
                      ? business.api_keys_used / business.api_keys_max
                      : 0;
                  return (
                    <tr key={business.business_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white">
                            {getInitials(business.business_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[190px] truncate text-xs font-semibold text-slate-800">
                              {business.business_name}
                            </p>
                            <p className="mt-0.5 max-w-[190px] truncate font-mono text-[9px] text-slate-400">
                              {business.business_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {business.package_code ? (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-700">
                              {business.package_name}
                            </p>
                            <p className="font-mono text-[9px] text-slate-400">
                              {business.package_code}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">ยังไม่มีแพ็กเกจ</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={business.subscription_status} />
                      </td>
                      <td className="w-36 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={quotaRatio * 100}
                            tone={quotaRatio >= 0.8 ? "rose" : quotaRatio >= 0.5 ? "amber" : "emerald"}
                            className="h-1.5"
                          />
                          <span className="w-9 text-right font-mono text-[9px] text-slate-500">
                            {business.quota_limit ? formatPercent(quotaRatio, 0) : "—"}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[9px] text-slate-400">
                          {business.quota_used === null
                            ? "—"
                            : `${formatNumber(business.quota_used)} / ${formatNumber(
                                business.quota_limit,
                              )}`}
                        </p>
                      </td>
                      <td className="w-28 px-3 py-3">
                        <p className="font-mono text-[10px] text-slate-600">
                          {formatNumber(business.api_keys_used)} /{" "}
                          {business.api_keys_max === null
                            ? "—"
                            : formatNumber(business.api_keys_max)}
                        </p>
                        <Progress
                          value={keyRatio * 100}
                          tone="indigo"
                          className="mt-1 h-1"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-mono text-xs font-semibold text-slate-700">
                          {formatNumber(business.qr_created)}
                        </p>
                        <p className="text-[9px] text-emerald-600">
                          paid {formatNumber(business.qr_paid)}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="font-mono text-xs font-semibold tabular-nums text-slate-800">
                          {formatCurrency(business.gmv)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="whitespace-nowrap text-[10px] text-slate-600">
                          {business.current_period_end
                            ? formatDate(business.current_period_end)
                            : "—"}
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          paid {business.last_payment_at ? formatDate(business.last_payment_at) : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setAssignTarget(business)}
                            aria-label={`Assign package ให้ ${business.business_name}`}
                            title="Assign / Change Package"
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Layers className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void openRenew(business)}
                            disabled={loadingRenew === business.business_id}
                            aria-label={`ต่ออายุ ${business.business_name}`}
                            title="Renew / Upgrade"
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                          >
                            {loadingRenew === business.business_id ? (
                              <RefreshCw className="size-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openBusiness(business)}
                            aria-label={`ดู Dashboard ของ ${business.business_name}`}
                            title="View drill-down"
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data ? (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.total_pages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onChange={setPage}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        ) : null}
      </Card>

      {registerOpen ? (
        <RegisterBusinessModal
          key="register-business"
          packages={activePackages}
          onClose={() => setRegisterOpen(false)}
          onCreated={() => {
            setPage(1);
            query.refetch();
          }}
        />
      ) : null}

      {assignTarget ? (
        <AssignPackageModal
          key={`assign-${assignTarget.business_id}`}
          businessId={assignTarget.business_id}
          businessName={assignTarget.business_name}
          currentPackageId={
            packages.find((pkg) => pkg.code === assignTarget.package_code)?.id ?? null
          }
          packages={activePackages}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            query.refetch();
          }}
        />
      ) : null}

      {renewTarget ? (
        <RenewSubscriptionModal
          key={renewTarget.subscriptionId}
          open
          businessName={renewTarget.businessName}
          subscriptionId={renewTarget.subscriptionId}
          packages={activePackages}
          onClose={() => setRenewTarget(null)}
          onRenewed={() => query.refetch()}
        />
      ) : null}
    </div>
  );
}
