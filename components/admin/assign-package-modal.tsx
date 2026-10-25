"use client";

import { useState } from "react";
import { AlertTriangle, Layers } from "lucide-react";
import type { Package } from "@/types/api";
import { assignSubscription } from "@/services/subscriptions";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/ui/form";
import { formatCurrency, formatNumber } from "@/lib/format";

export function AssignPackageModal({
  businessId,
  businessName,
  currentPackageId,
  packages,
  onClose,
  onAssigned,
}: {
  businessId: string;
  businessName: string;
  currentPackageId?: string | null;
  packages: Package[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [packageId, setPackageId] = useState(currentPackageId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();
  const selected = packages.find((pkg) => pkg.id === packageId);

  const submit = async () => {
    if (!packageId) {
      notifyError(new Error("กรุณาเลือกแพ็กเกจ"));
      return;
    }
    setSubmitting(true);
    try {
      await assignSubscription({ business_id: businessId, package_id: packageId });
      success(`ผูกแพ็กเกจให้ "${businessName}" สำเร็จ และรีเซ็ตโควต้าแล้ว`, {
        title: "Package assigned",
      });
      onAssigned();
      onClose();
    } catch (cause) {
      notifyError(cause, "ผูกแพ็กเกจไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={submitting ? () => undefined : onClose}
      title={currentPackageId ? "เปลี่ยนแพ็กเกจร้านค้า" : "Assign Package"}
      description={businessName}
      size="md"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            loading={submitting}
            disabled={!packageId}
            icon={<Layers className="size-4" />}
          >
            {currentPackageId ? "เปลี่ยนแพ็กเกจ" : "ผูกแพ็กเกจ"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-card border border-warning-border bg-warning-soft p-3.5">
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-ink" />
            <p className="text-[11px] leading-5 text-warning-ink">
              การ Assign หรือเปลี่ยนแพ็กเกจจะเริ่มรอบบิลใหม่ทันที
              และรีเซ็ตโควต้าเป็น 0 / ตามแพ็กเกจใหม่
              โดยไม่มีการเติมโควต้าแบบ pro-rate
            </p>
          </div>
        </div>

        <FormField label="เลือกแพ็กเกจ" htmlFor="assign-package">
          <Select
            id="assign-package"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
          >
            <option value="">เลือกแพ็กเกจ...</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({pkg.code}) · {formatCurrency(pkg.price)}
              </option>
            ))}
          </Select>
        </FormField>

        {selected ? (
          <div className="rounded-card border border-brand-border bg-brand-soft p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-ink">{selected.name}</p>
              <span className="font-mono text-[11px] text-brand-ink">{selected.code}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-sm font-semibold text-brand-ink">
                  {formatNumber(selected.quota_limit)}
                </p>
                <p className="text-[11px] text-brand-ink">Quota</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-brand-ink">
                  {formatNumber(selected.max_api_keys)}
                </p>
                <p className="text-[11px] text-brand-ink">API Keys</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-brand-ink">
                  {formatNumber(selected.rate_limit_per_hour)}
                </p>
                <p className="text-[11px] text-brand-ink">Req / hour</p>
              </div>
            </div>
          </div>
        ) : null}

        <p className="break-all font-mono text-[11px] text-ink-muted">
          business_id: {businessId}
        </p>
      </div>
    </Modal>
  );
}
