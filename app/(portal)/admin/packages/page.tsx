"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Layers,
  Package as PackageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Package } from "@/types/api";
import { deletePackage, listPackages } from "@/services/packages";
import { ApiError } from "@/services/api";
import { useApiData } from "@/lib/hooks/use-api-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { PackageFormModal } from "@/components/admin/package-form-modal";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPackagesPage() {
  const [onlyActive, setOnlyActive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { notifyError, success } = useToast();

  const query = useApiData(`admin-packages:${onlyActive}`, () => listPackages(onlyActive));
  const packages = query.data ?? [];
  const activeCount = packages.filter((pkg) => pkg.is_active).length;
  const inactiveCount = packages.filter((pkg) => !pkg.is_active).length;

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePackage(deleteTarget.id);
      success(`ลบแพ็กเกจ "${deleteTarget.name}" สำเร็จ`, {
        title: "Package deleted",
      });
      setDeleteTarget(null);
      query.refetch();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        notifyError(
          new ApiError(
            "ไม่สามารถลบแพ็กเกจนี้ได้ เนื่องจากยังมี Subscription สถานะ ACTIVE หรือ PAST_DUE ผูกอยู่",
            {
              status: cause.status,
              correlationId: cause.correlationId,
              payload: cause.payload,
            },
          ),
          "ไม่สามารถลบแพ็กเกจได้",
        );
      } else {
        notifyError(cause, "ลบแพ็กเกจไม่สำเร็จ");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (query.error) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Catalog"
          title="Master Packages"
          description="จัดการราคา โควต้า Rate Limit และจำนวน API Key ของแต่ละแพ็กเกจ"
        />
        <ErrorNotice
          message={query.error instanceof Error ? query.error.message : "โหลดแพ็กเกจไม่สำเร็จ"}
          correlationId={query.error instanceof ApiError ? query.error.correlationId : null}
          onRetry={query.refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog"
        title="Master Packages"
        description="กำหนดสินค้า Prepaid ที่ใช้ควบคุมโควต้าและสิทธิ์ของร้านค้า"
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
            <Button
              size="sm"
              onClick={() => {
                setEditingPackage(null);
                setFormOpen(true);
              }}
              icon={<Plus className="size-3.5" />}
            >
              สร้างแพ็กเกจ
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Packages"
          value={formatNumber(packages.length)}
          hint={onlyActive ? "แสดงเฉพาะแพ็กเกจที่ Active" : "Showing all non-deleted packages"}
          icon={Layers}
          tone="indigo"
        />
        <KpiCard
          label="Active"
          value={formatNumber(activeCount)}
          hint="ร้านค้าสามารถเลือกใช้งานได้"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Inactive"
          value={formatNumber(inactiveCount)}
          hint="ซ่อนจาก Business แต่ยังจัดการได้"
          icon={XCircle}
          tone="slate"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">รายการแพ็กเกจ</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatNumber(packages.length)} แพ็กเกจ · Soft-deleted ไม่ถูกแสดง
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(event) => setOnlyActive(event.target.checked)}
              className="size-3.5 accent-emerald-600"
            />
            แสดงเฉพาะ Active
          </label>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={PackageIcon}
              title={onlyActive ? "ไม่มีแพ็กเกจที่ Active" : "ยังไม่มี Master Package"}
              description="สร้างแพ็กเกจแรกเพื่อเริ่มต้นขาย Subscription ให้ร้านค้า"
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPackage(null);
                    setFormOpen(true);
                  }}
                  icon={<Plus className="size-3.5" />}
                >
                  สร้างแพ็กเกจ
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  <th className="px-4 py-2.5 sm:px-5">Package</th>
                  <th className="px-3 py-2.5 text-right">Price</th>
                  <th className="px-3 py-2.5 text-right">Quota</th>
                  <th className="px-3 py-2.5 text-right">Rate / hr</th>
                  <th className="px-3 py-2.5 text-right">API Keys</th>
                  <th className="px-3 py-2.5 text-right">Cycle</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Updated</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            pkg.is_active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <PackageIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{pkg.name}</p>
                          <p className="mt-0.5 font-mono text-[9px] font-semibold uppercase text-slate-400">
                            {pkg.code}
                          </p>
                          {pkg.description ? (
                            <p className="mt-1 max-w-[260px] truncate text-[9px] text-slate-400">
                              {pkg.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-slate-800">
                      {formatCurrency(pkg.price)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-600">
                      {formatNumber(pkg.quota_limit)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-600">
                      {formatNumber(pkg.rate_limit_per_hour)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-600">
                      {formatNumber(pkg.max_api_keys)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-600">
                      {pkg.billing_cycle_months} mo
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={pkg.is_active ? "emerald" : "slate"} dot>
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">
                      {formatDate(pkg.updated_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPackage(pkg);
                            setFormOpen(true);
                          }}
                          aria-label={`แก้ไข ${pkg.name}`}
                          title="แก้ไข"
                          className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(pkg)}
                          aria-label={`ลบ ${pkg.name}`}
                          title="Soft delete"
                          className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[9px] text-slate-400">
          การลบจะถูกปฏิเสธหากยังมี Subscription ที่ ACTIVE หรือ PAST_DUE
          ผูกกับแพ็กเกจนี้อยู่
        </div>
      </Card>

      {formOpen ? (
        <PackageFormModal
          key={editingPackage?.id ?? "new-package"}
          packageItem={editingPackage}
          onClose={() => {
            setFormOpen(false);
            setEditingPackage(null);
          }}
          onSaved={query.refetch}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        loading={deleting}
        destructive
        title="Soft delete Master Package"
        description={deleteTarget ? `${deleteTarget.name} · ${deleteTarget.code}` : undefined}
        confirmLabel="ลบแพ็กเกจ"
      >
        <p className="mt-2">
          แพ็กเกจจะถูก Soft Delete และไม่แสดงในรายการอีก
          แต่ประวัติ Subscription เดิมจะยังคงอยู่
        </p>
      </ConfirmDialog>
    </div>
  );
}
