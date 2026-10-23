"use client";

import { useState } from "react";
import { CalendarClock, Layers, RefreshCw } from "lucide-react";
import type { Package } from "@/types/api";
import { renewSubscription } from "@/services/subscriptions";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/ui/form";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export function RenewSubscriptionModal({
  open,
  businessName,
  subscriptionId,
  packages,
  onClose,
  onRenewed,
}: {
  open: boolean;
  businessName: string;
  subscriptionId: string;
  packages: Package[];
  onClose: () => void;
  onRenewed: () => void;
}) {
  const [packageId, setPackageId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();

  const selectedPackage = packages.find((pkg) => pkg.id === packageId);

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await renewSubscription(subscriptionId, {
        package_id: packageId || null,
      });
      success(`ต่ออายุ "${businessName}" ถึง ${formatDate(result.current_period_end)}`, {
        title: "ต่ออายุ Subscription สำเร็จ",
      });
      onRenewed();
      onClose();
    } catch (cause) {
      notifyError(cause, "ต่ออายุ Subscription ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="ต่ออายุ / เปลี่ยนแพ็กเกจ"
      description={businessName}
      size="sm"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            loading={submitting}
            icon={<RefreshCw className="size-4" />}
          >
            ยืนยันต่ออายุ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <CalendarClock className="size-3.5" />
            การต่ออายุก่อนครบกำหนดจะรักษา Paid-through เดิม
          </p>
          <p className="mt-1 text-[10px] leading-5 text-emerald-700/80">
            รอบบิลใหม่จะเริ่มต่อจากวันสิ้นสุดรอบเดิม และรีเซ็ตโควต้าตามแพ็กเกจที่เลือก
          </p>
        </div>

        <FormField
          label="แพ็กเกจสำหรับรอบถัดไป"
          htmlFor="renew-package"
          hint="เว้นว่างเพื่อใช้แพ็กเกจเดิม"
        >
          <div className="relative">
            <Layers className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Select
              id="renew-package"
              value={packageId}
              onChange={(event) => setPackageId(event.target.value)}
              className="pl-10"
            >
              <option value="">ใช้แพ็กเกจเดิม</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.code}) · {formatCurrency(pkg.price)} / {pkg.billing_cycle_months} เดือน
                </option>
              ))}
            </Select>
          </div>
        </FormField>

        {selectedPackage ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Package summary
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-800">
                  {formatNumber(selectedPackage.quota_limit)}
                </p>
                <p className="text-[9px] text-slate-400">Quota</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-slate-800">
                  {formatNumber(selectedPackage.max_api_keys)}
                </p>
                <p className="text-[9px] text-slate-400">API Keys</p>
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-slate-800">
                  {formatNumber(selectedPackage.rate_limit_per_hour)}
                </p>
                <p className="text-[9px] text-slate-400">Req / hour</p>
              </div>
            </div>
          </div>
        ) : null}

        <p className="break-all font-mono text-[9px] text-slate-400">
          subscription_id: {subscriptionId}
        </p>
      </div>
    </Modal>
  );
}
