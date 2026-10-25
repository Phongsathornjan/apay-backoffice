"use client";

import { KeyRound, RefreshCw } from "lucide-react";
import { getApiKeyUsage } from "@/services/api-keys";
import { useApiData } from "@/lib/hooks/use-api-data";
import { formatDateTime, formatNumber, maskKeyPrefix } from "@/lib/format";
import { Drawer } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorNotice } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/services/api";

export function KeyUsageDrawer({
  open,
  apiKeyId,
  apiKeyName,
  onClose,
}: {
  open: boolean;
  apiKeyId: string | null;
  apiKeyName: string;
  onClose: () => void;
}) {
  const usage = useApiData(
    open && apiKeyId ? `api-key-usage:${apiKeyId}` : null,
    () => getApiKeyUsage(apiKeyId!),
  );
  const data = usage.data;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <KeyRound className="size-4 text-ink-muted" />
          {data?.name ?? apiKeyName ?? "API Key usage"}
        </span>
      }
      description={data ? maskKeyPrefix(data.key_prefix) : "Usage และ log ล่าสุดของ API Key"}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-muted">แสดง log ล่าสุดสูงสุด 20 รายการ</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={usage.refetch}
            loading={usage.isRefreshing}
            icon={<RefreshCw className="size-3.5" />}
          >
            รีเฟรช
          </Button>
        </div>
      }
    >
      {usage.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      ) : usage.error ? (
        <ErrorNotice
          message={usage.error instanceof Error ? usage.error.message : "โหลด Usage ไม่สำเร็จ"}
          correlationId={usage.error instanceof ApiError ? usage.error.correlationId : null}
          onRetry={usage.refetch}
        />
      ) : data ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={data.deleted_at ? "REVOKED" : data.is_active ? "ACTIVE" : "INACTIVE"}
              label={data.deleted_at ? "Revoked" : data.is_active ? "Active" : "Inactive"}
            />
            {data.deleted_at ? (
              <span className="text-[11px] text-ink-muted">
                ลบเมื่อ {formatDateTime(data.deleted_at)}
              </span>
            ) : null}
            <CopyButton value={data.key_prefix} label="คัดลอก prefix" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "QR Created", value: data.total_qr_created, tone: "text-ink" },
              {
                label: "QR Paid",
                value: data.total_qr_paid_and_deducted,
                tone: "text-success-ink",
              },
              {
                label: "Requests / hr",
                value: data.current_hour_requests,
                tone: "text-brand-ink",
              },
              {
                label: "Last used",
                value: data.last_used_at ? formatDateTime(data.last_used_at) : "—",
                tone: "text-ink-secondary text-xs",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-card border border-line bg-surface-subtle p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {item.label}
                </p>
                <p className={`mt-1 truncate font-mono font-bold tabular-nums ${item.tone}`}>
                  {typeof item.value === "number" ? formatNumber(item.value) : item.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-ink">Recent logs</h3>
              <Badge tone="neutral">{data.recent_logs.length} รายการ</Badge>
            </div>
            {data.recent_logs.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="ยังไม่มี Usage Log"
                description="เมื่อ Key นี้ถูกใช้สร้างหรือชำระ QR รายการจะปรากฏที่นี่"
                compact
              />
            ) : (
              <div className="overflow-hidden rounded-card border border-line">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-surface-subtle text-[11px] uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Action</th>
                      <th className="px-3 py-2 font-semibold">Order</th>
                      <th className="px-3 py-2 font-semibold">Quota</th>
                      <th className="px-3 py-2 text-right font-semibold">เวลา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {data.recent_logs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-subtle">
                        <td className="px-3 py-2">
                          <Badge tone={log.action === "QR_PAID" ? "success" : "info"}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="max-w-[150px] truncate px-3 py-2 font-mono text-[11px] text-ink-secondary">
                          {log.payment_order_id ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {log.quota_deducted ? (
                            <span className="font-semibold text-danger-ink">-1</span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-ink-secondary">
                          {formatDateTime(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
