"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import type { DashboardApiKeyBreakdownData, DashboardApiKeyTimeseriesData } from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import { getApiKeyBreakdown, getApiKeyTimeseries } from "@/services/dashboard";
import { revokeApiKey, updateApiKey } from "@/services/api-keys";
import { ApiError } from "@/services/api";
import { useApiData } from "@/lib/hooks/use-api-data";
import { buildPresetRange, rangeQuery, type DateRangeValue } from "@/lib/date-range";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  maskKeyPrefix,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { BusinessContextNotice } from "@/components/dashboard/business-context";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartLegend, SeriesChart } from "@/components/charts/dashboard-charts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice, useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CreateKeyModal,
  EditKeyModal,
  OneTimeKeyModal,
} from "@/components/api-keys/key-modals";
import { KeyUsageDrawer } from "@/components/api-keys/key-usage-drawer";
import type { CreateApiKeyData } from "@/types/api";

type KeyRow = DashboardApiKeyBreakdownData["keys"][number];
type PendingAction =
  | { type: "toggle"; key: KeyRow; nextActive: boolean }
  | { type: "revoke"; key: KeyRow };

const METRIC_OPTIONS = [
  { value: "qr_created", label: "QR Created" },
  { value: "qr_paid", label: "QR Paid" },
  { value: "quota_deducted", label: "Quota Deducted" },
] as const;

export default function ApiKeysPage() {
  const { businessId, role } = useAuth();
  const isAdmin = role === "admin";
  const scopedBusinessId = isAdmin ? (businessId ?? undefined) : undefined;
  const [range, setRange] = useState<DateRangeValue>(() => buildPresetRange("last_30d"));
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [metric, setMetric] = useState<"qr_created" | "qr_paid" | "quota_deducted">("qr_created");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreateApiKeyData | null>(null);
  const [editingKey, setEditingKey] = useState<Pick<KeyRow, "id" | "name" | "key_prefix"> | null>(
    null,
  );
  const [usageKey, setUsageKey] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [mutating, setMutating] = useState(false);
  const { notifyError, success } = useToast();

  const breakdown = useApiData<DashboardApiKeyBreakdownData>(
    businessId
      ? `api-keys-breakdown:${JSON.stringify({
          businessId,
          ...rangeQuery(range),
          includeDeleted,
        })}`
      : null,
    () =>
      getApiKeyBreakdown({
        ...rangeQuery(range),
        business_id: scopedBusinessId,
        include_deleted: includeDeleted,
      }),
  );

  const timeseries = useApiData<DashboardApiKeyTimeseriesData>(
    businessId
      ? `api-keys-timeseries:${JSON.stringify({
          businessId,
          ...rangeQuery(range),
          includeDeleted,
          metric,
        })}`
      : null,
    () =>
      getApiKeyTimeseries({
        ...rangeQuery(range),
        business_id: scopedBusinessId,
        include_deleted: includeDeleted,
        metric,
      }),
  );

  const summary = breakdown.data?.summary;
  const keys = useMemo(() => {
    const rows = breakdown.data?.keys ?? [];
    return [...rows].sort((a, b) => {
      if (Boolean(a.deleted_at) !== Boolean(b.deleted_at)) return a.deleted_at ? 1 : -1;
      return Number(b.qr_created) - Number(a.qr_created);
    });
  }, [breakdown.data?.keys]);

  const maxKeys = summary?.max_api_keys ?? 0;
  const activeKeys = summary?.active_keys ?? 0;
  // Inactive keys still occupy a package slot; only soft-deleted keys release it.
  const slotUsed = keys.filter((key) => !key.deleted_at).length;
  const isFull = maxKeys > 0 && slotUsed >= maxKeys;
  const createDisabled = maxKeys === 0 || isFull;

  const refetchAll = () => {
    breakdown.refetch();
    timeseries.refetch();
  };

  const confirmAction = async () => {
    if (!pending) return;
    setMutating(true);
    try {
      if (pending.type === "toggle") {
        await updateApiKey(pending.key.id, { is_active: pending.nextActive });
        success(
          pending.nextActive
            ? `เปิดใช้งาน "${pending.key.name}" แล้ว`
            : `ปิดใช้งาน "${pending.key.name}" และยกเลิก Refresh Token เดิมแล้ว`,
        );
      } else {
        await revokeApiKey(pending.key.id);
        success(`เพิกถอน "${pending.key.name}" แล้ว และคืน Slot เรียบร้อย`, {
          title: "เพิกถอน API Key สำเร็จ",
        });
        if (usageKey?.id === pending.key.id) setUsageKey(null);
      }
      setPending(null);
      refetchAll();
    } catch (cause) {
      notifyError(cause);
    } finally {
      setMutating(false);
    }
  };

  if (!businessId) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Developer access"
          title="API Keys"
          description="สร้าง เพิกถอน และติดตามการใช้งาน API Key ของร้านค้า"
        />
        <BusinessContextNotice feature="API Keys" />
      </div>
    );
  }

  if (breakdown.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Developer access"
          title="API Keys"
          description="สร้าง เพิกถอน และติดตามการใช้งาน API Key ของร้านค้า"
          actions={<DateRangePicker value={range} onChange={setRange} />}
        />
        <ErrorNotice
          message={
            breakdown.error instanceof Error ? breakdown.error.message : "โหลดข้อมูล API Keys ไม่สำเร็จ"
          }
          correlationId={
            breakdown.error instanceof ApiError ? breakdown.error.correlationId : null
          }
          onRetry={refetchAll}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Developer access"
        title="API Keys"
        description="จัดการคีย์สำหรับเชื่อมต่อระบบร้านค้า พร้อม Usage Analytics แยกรายคีย์"
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button
              variant="secondary"
              size="sm"
              onClick={refetchAll}
              loading={breakdown.isRefreshing}
              icon={<RefreshCw className="size-3.5" />}
            >
              รีเฟรช
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={createDisabled}
              title={
                maxKeys === 0
                  ? "ต้องมี Subscription ที่ ACTIVE ก่อนสร้าง API Key"
                  : isFull
                    ? "จำนวน API Key เต็มตามแพ็กเกจแล้ว"
                    : undefined
              }
              icon={<Plus className="size-3.5" />}
            >
              สร้าง API Key
            </Button>
          </>
        }
      />

      {breakdown.isLoading ? null : maxKeys === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldOff className="size-4" />
            ยังไม่สามารถสร้าง API Key ได้
          </p>
          <p className="mt-1">
            ต้องมี Subscription สถานะ ACTIVE และยังไม่เลย paid-through
            {isAdmin ? " — กรุณาผูกแพ็กเกจจากหน้าร้านค้า" : " — กรุณาติดต่อผู้ดูแลระบบ"}
          </p>
        </div>
      ) : isFull ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          ใช้งาน API Key ครบ {formatNumber(maxKeys)} Slot ตามแพ็กเกจแล้ว
          หากต้องการเพิ่ม ต้องเพิกถอน Key เดิมหรืออัปเกรดแพ็กเกจ
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {breakdown.isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-20" />
              <Skeleton className="mt-3 h-3 w-32" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              label="Active Keys"
              value={formatNumber(summary.active_keys)}
              hint="Key ที่ยังเปิดใช้งาน"
              icon={ShieldCheck}
              tone="emerald"
            />
            <KpiCard
              label="Revoked / Deleted"
              value={formatNumber(summary.revoked_keys)}
              hint="ยังเก็บประวัติการใช้งาน"
              icon={ShieldOff}
              tone="rose"
            />
            <KpiCard
              label="API Key Slots"
              value={`${formatNumber(slotUsed)} / ${formatNumber(summary.max_api_keys)}`}
              hint={
                summary.max_api_keys > 0
                  ? `เหลือ ${formatNumber(Math.max(summary.max_api_keys - slotUsed, 0))} slot · Active ${formatNumber(activeKeys)}`
                  : "ยังไม่มีแพ็กเกจ"
              }
              icon={KeyRound}
              tone="indigo"
              footer={
                <Progress
                  value={
                    summary.max_api_keys > 0
                      ? (slotUsed / summary.max_api_keys) * 100
                      : 0
                  }
                  tone={isFull ? "rose" : "indigo"}
                />
              }
            />
            <KpiCard
              label="QR ในช่วงเวลานี้"
              value={formatNumber(keys.reduce((sum, key) => sum + key.qr_created, 0))}
              hint={`Paid ${formatNumber(
                keys.reduce((sum, key) => sum + key.qr_paid, 0),
              )} · ${formatNumber(keys.length)} คีย์ในช่วง ${range.interval}`}
              icon={Eye}
              tone="slate"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Usage แยกตาม API Key"
          description="Top 10 + Other · เรียงตาม metric ที่เลือก"
          action={
            <select
              value={metric}
              onChange={(event) =>
                setMetric(event.target.value as "qr_created" | "qr_paid" | "quota_deducted")
              }
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 outline-none focus:border-emerald-500"
              aria-label="เลือก Metric"
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          }
        >
          {timeseries.error ? (
            <div className="mx-4 mb-3">
              <ErrorNotice
                message={
                  timeseries.error instanceof Error
                    ? timeseries.error.message
                    : "โหลด Usage Timeseries ไม่สำเร็จ"
                }
                correlationId={
                  timeseries.error instanceof ApiError ? timeseries.error.correlationId : null
                }
                onRetry={timeseries.refetch}
              />
            </div>
          ) : timeseries.isLoading ? (
            <div className="h-[300px] p-4">
              <Skeleton className="size-full" />
            </div>
          ) : (
            <>
              <div className="px-4 pb-1">
                <ChartLegend
                  items={(timeseries.data?.series ?? []).map((serie) => ({
                    label: serie.label,
                  }))}
                />
              </div>
              <SeriesChart series={timeseries.data?.series ?? []} stacked height={300} />
            </>
          )}
        </ChartCard>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">ตัวกรองรายการ</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                ควบคุมข้อมูลที่แสดงในตารางและกราฟ
              </p>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => setIncludeDeleted(event.target.checked)}
              className="mt-0.5 size-4 accent-emerald-600"
            />
            <span>
              <span className="block text-xs font-semibold text-slate-700">
                รวม Key ที่ถูก Soft Delete
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
                เปิดเพื่อดูประวัติของ Key ที่เพิกถอนแล้ว (ไม่นับรวมใน slot)
              </span>
            </span>
          </label>

          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">ช่วงข้อมูล</span>
              <span className="font-semibold text-slate-700">{range.interval.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Timezone</span>
              <span className="font-mono text-[10px] text-slate-600">Asia/Bangkok</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">แสดงในตาราง</span>
              <span className="font-semibold text-slate-700">{formatNumber(keys.length)} คีย์</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">รายการ API Keys</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {includeDeleted
                ? "รวมคีย์ที่ถูกเพิกถอนแล้ว"
                : "แสดงเฉพาะคีย์ที่ยังไม่ถูก Soft Delete"}
            </p>
          </div>
          <Badge tone="slate">{formatNumber(keys.length)} รายการ</Badge>
        </div>

        {breakdown.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={KeyRound}
              title="ยังไม่มี API Key"
              description={
                maxKeys === 0
                  ? "เมื่อมี Subscription ที่ ACTIVE แล้ว คุณจะสามารถสร้าง Key ได้"
                  : "สร้าง Key แรกเพื่อให้ระบบหลังบ้านหรือ POS เริ่มเรียก Payment API ได้"
              }
              action={
                <Button
                  size="sm"
                  disabled={createDisabled}
                  onClick={() => setCreateOpen(true)}
                  icon={<Plus className="size-3.5" />}
                >
                  สร้าง API Key
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  <th className="px-4 py-2.5 sm:px-5">Key</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Last used</th>
                  <th className="px-3 py-2.5 text-right">QR Created</th>
                  <th className="px-3 py-2.5 text-right">QR Paid</th>
                  <th className="px-3 py-2.5">Share</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((key) => {
                  const deleted = Boolean(key.deleted_at);
                  return (
                    <tr key={key.id} className="group hover:bg-slate-50/60">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                              deleted
                                ? "bg-slate-100 text-slate-400"
                                : key.is_active
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <KeyRound className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-xs font-semibold text-slate-800">
                              {key.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                              {maskKeyPrefix(key.key_prefix)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={deleted ? "REVOKED" : key.is_active ? "ACTIVE" : "INACTIVE"}
                          label={deleted ? "Revoked" : key.is_active ? "Active" : "Inactive"}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">
                        {formatDateTime(key.last_used_at)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-700">
                        {formatNumber(key.qr_created)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-emerald-700">
                        {formatNumber(key.qr_paid)}
                      </td>
                      <td className="w-32 px-3 py-3">
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[9px] text-slate-400">
                              <span>created</span>
                              <span>{formatPercent(key.share_of_created, 0)}</span>
                            </div>
                            <Progress
                              value={key.share_of_created * 100}
                              tone="emerald"
                              className="h-1"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] text-slate-400">
                              <span>paid</span>
                              <span>{formatPercent(key.share_of_paid, 0)}</span>
                            </div>
                            <Progress
                              value={key.share_of_paid * 100}
                              tone="indigo"
                              className="h-1"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => setUsageKey({ id: key.id, name: key.name })}
                            aria-label={`ดู usage ของ ${key.name}`}
                            title="ดู Usage"
                            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          {!deleted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingKey(key)}
                                aria-label={`แก้ไขชื่อ ${key.name}`}
                                title="แก้ไขชื่อ"
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPending({
                                    type: "toggle",
                                    key,
                                    nextActive: !key.is_active,
                                  })
                                }
                                aria-label={key.is_active ? `ปิดใช้งาน ${key.name}` : `เปิดใช้งาน ${key.name}`}
                                title={key.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                className={`flex size-7 items-center justify-center rounded-lg transition hover:bg-slate-100 ${
                                  key.is_active
                                    ? "text-amber-500 hover:text-amber-700"
                                    : "text-emerald-600 hover:text-emerald-700"
                                }`}
                              >
                                <Power className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPending({ type: "revoke", key })}
                                aria-label={`เพิกถอน ${key.name}`}
                                title="เพิกถอน Key"
                                className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateKeyModal
        open={createOpen}
        businessId={businessId}
        isAdmin={isAdmin}
        onClose={() => setCreateOpen(false)}
        onCreated={(key) => {
          setCreateOpen(false);
          setCreatedKey(key);
          refetchAll();
        }}
      />

      {createdKey ? (
        <OneTimeKeyModal
          key={createdKey.id}
          created={createdKey}
          onClose={() => setCreatedKey(null)}
        />
      ) : null}

      {editingKey ? (
        <EditKeyModal
          key={editingKey.id}
          apiKey={editingKey}
          onClose={() => setEditingKey(null)}
          onSaved={refetchAll}
        />
      ) : null}

      <KeyUsageDrawer
        open={Boolean(usageKey)}
        apiKeyId={usageKey?.id ?? null}
        apiKeyName={usageKey?.name ?? ""}
        onClose={() => setUsageKey(null)}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={confirmAction}
        loading={mutating}
        destructive={
          pending?.type === "revoke" || (pending?.type === "toggle" && !pending.nextActive)
        }
        title={
          pending?.type === "revoke"
            ? "เพิกถอน API Key"
            : pending?.nextActive
              ? "เปิดใช้งาน API Key"
              : "ปิดใช้งาน API Key"
        }
        description={
          pending?.key
            ? `${pending.key.name} · ${pending.key.key_prefix}`
            : undefined
        }
        confirmLabel={
          pending?.type === "revoke"
            ? "เพิกถอน Key"
            : pending?.nextActive
              ? "เปิดใช้งาน"
              : "ปิดใช้งาน"
        }
      >
        {pending?.type === "revoke" ? (
          <p className="mt-2">
            Key จะถูก Soft Delete และคืน Slot ทันที แต่ Usage Log
            และประวัติการใช้งานเดิมจะยังถูกเก็บไว้
          </p>
        ) : pending?.type === "toggle" && !pending.nextActive ? (
          <p className="mt-2">
            การปิดคีย์จะยกเลิก Refresh Token ของคีย์นี้ทันที
            และคำขอที่ใช้ token เดิมจะไม่สามารถใช้งานได้
          </p>
        ) : (
          <p className="mt-2">
            การเปิดใช้งานอีกครั้งจะทำให้ Key นี้ใช้สร้าง Token และเรียก API ได้
            แต่ Refresh Token เดิมที่ถูกยกเลิกไปแล้วจะไม่กลับมา
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
