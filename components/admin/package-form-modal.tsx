"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Package as PackageIcon, Save } from "lucide-react";
import type { CreatePackageRequest, Package } from "@/types/api";
import { createPackage, updatePackage } from "@/services/packages";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/form";

export function PackageFormModal({
  packageItem,
  onClose,
  onSaved,
}: {
  packageItem?: Package | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(packageItem);
  const [code, setCode] = useState(packageItem?.code ?? "");
  const [name, setName] = useState(packageItem?.name ?? "");
  const [description, setDescription] = useState(packageItem?.description ?? "");
  const [price, setPrice] = useState(String(packageItem?.price ?? ""));
  const [maxApiKeys, setMaxApiKeys] = useState(
    packageItem ? String(packageItem.max_api_keys) : "3",
  );
  const [quotaLimit, setQuotaLimit] = useState(
    packageItem ? String(packageItem.quota_limit) : "1000",
  );
  const [rateLimit, setRateLimit] = useState(
    packageItem ? String(packageItem.rate_limit_per_hour) : "300",
  );
  const [cycleMonths, setCycleMonths] = useState(
    packageItem ? String(packageItem.billing_cycle_months) : "1",
  );
  const [isActive, setIsActive] = useState(packageItem?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();

  const validate = (): string | null => {
    if (!code.trim()) return "กรุณากรอก Package Code";
    if (code.length > 50) return "Package Code ต้องไม่เกิน 50 ตัวอักษร";
    if (!name.trim()) return "กรุณากรอกชื่อแพ็กเกจ";
    if (name.length > 150) return "ชื่อแพ็กเกจต้องไม่เกิน 150 ตัวอักษร";
    if (price === "" || Number(price) < 0) return "ราคาต้องไม่ติดลบ";
    if (!Number.isInteger(Number(maxApiKeys)) || Number(maxApiKeys) < 1)
      return "จำนวน API Key ต้องเป็นจำนวนเต็มตั้งแต่ 1";
    if (!Number.isInteger(Number(quotaLimit)) || Number(quotaLimit) < 1)
      return "Quota Limit ต้องเป็นจำนวนเต็มตั้งแต่ 1";
    if (!Number.isInteger(Number(rateLimit)) || Number(rateLimit) < 1)
      return "Rate Limit ต้องเป็นจำนวนเต็มตั้งแต่ 1";
    if (!Number.isInteger(Number(cycleMonths)) || Number(cycleMonths) < 1)
      return "Billing Cycle ต้องเป็นจำนวนเต็มตั้งแต่ 1 เดือน";
    return null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const payload: CreatePackageRequest = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      max_api_keys: Number(maxApiKeys),
      quota_limit: Number(quotaLimit),
      rate_limit_per_hour: Number(rateLimit),
      billing_cycle_months: Number(cycleMonths),
      is_active: isActive,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (packageItem) {
        await updatePackage(packageItem.id, payload);
        success(`อัปเดตแพ็กเกจ "${payload.name}" สำเร็จ`);
      } else {
        await createPackage(payload);
        success(`สร้างแพ็กเกจ "${payload.name}" สำเร็จ`, { title: "Package created" });
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกแพ็กเกจไม่สำเร็จ");
      notifyError(cause, "บันทึกแพ็กเกจไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={submitting ? () => undefined : onClose}
      title={editing ? "แก้ไข Master Package" : "สร้าง Master Package"}
      description={
        editing
          ? `${packageItem?.code} · ${packageItem?.name}`
          : "กำหนดราคา โควต้า Rate Limit และจำนวน API Key"
      }
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              const form = document.getElementById("package-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            loading={submitting}
            icon={<Save className="size-4" />}
          >
            {editing ? "บันทึกการแก้ไข" : "สร้างแพ็กเกจ"}
          </Button>
        </>
      }
    >
      <form id="package-form" onSubmit={submit} className="space-y-5">
        {error ? (
          <div className="flex items-start gap-2 rounded-card border border-danger-border bg-danger-soft p-3 text-[11px] leading-5 text-danger-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Package Code" htmlFor="pkg-code" hint="ไม่เกิน 50 ตัวอักษร">
            <Input
              id="pkg-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError(null);
              }}
              maxLength={50}
              className="font-mono uppercase"
              placeholder="STARTER"
              autoFocus
            />
          </FormField>
          <FormField label="Package Name" htmlFor="pkg-name" hint="ไม่เกิน 150 ตัวอักษร">
            <Input
              id="pkg-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              maxLength={150}
              placeholder="Starter"
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="pkg-description" optional>
          <Textarea
            id="pkg-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="แพ็กเกจเริ่มต้นสำหรับร้านค้าขนาดเล็ก"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Price (THB)" htmlFor="pkg-price" hint="0 = ฟรี">
            <Input
              id="pkg-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="font-mono tabular-nums"
            />
          </FormField>
          <FormField label="Billing Cycle (months)" htmlFor="pkg-cycle">
            <Input
              id="pkg-cycle"
              type="number"
              min={1}
              step={1}
              value={cycleMonths}
              onChange={(event) => setCycleMonths(event.target.value)}
              className="font-mono tabular-nums"
            />
          </FormField>
          <FormField label="Max API Keys" htmlFor="pkg-keys">
            <Input
              id="pkg-keys"
              type="number"
              min={1}
              step={1}
              value={maxApiKeys}
              onChange={(event) => setMaxApiKeys(event.target.value)}
              className="font-mono tabular-nums"
            />
          </FormField>
          <FormField label="Monthly Quota" htmlFor="pkg-quota">
            <Input
              id="pkg-quota"
              type="number"
              min={1}
              step={1}
              value={quotaLimit}
              onChange={(event) => setQuotaLimit(event.target.value)}
              className="font-mono tabular-nums"
            />
          </FormField>
          <FormField label="Rate Limit / hour" htmlFor="pkg-rate">
            <Input
              id="pkg-rate"
              type="number"
              min={1}
              step={1}
              value={rateLimit}
              onChange={(event) => setRateLimit(event.target.value)}
              className="font-mono tabular-nums"
            />
          </FormField>
          <div className="flex items-end">
            <Checkbox
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              label="เปิดใช้งานแพ็กเกจ"
              description="Business จะเห็นเฉพาะแพ็กเกจที่ Active"
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-card border border-line bg-surface-subtle p-3">
          <PackageIcon className="mt-0.5 size-3.5 shrink-0 text-ink-muted" />
          <p className="text-[11px] leading-5 text-ink-secondary">
            การลบแพ็กเกจเป็นแบบ Soft Delete และจะถูกปฏิเสธด้วย 409
            หากยังมี Subscription สถานะ ACTIVE หรือ PAST_DUE ผูกอยู่
          </p>
        </div>
      </form>
    </Modal>
  );
}
