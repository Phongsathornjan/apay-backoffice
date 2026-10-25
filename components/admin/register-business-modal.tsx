"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Building2, UserPlus } from "lucide-react";
import type { Package, RegisterBusinessRequest } from "@/types/api";
import { registerBusiness } from "@/services/auth";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/form";
import {
  validateEmail,
  validateMaxLength,
  validatePassword,
  validatePromptPayId,
  validateRequired,
} from "@/lib/validators";
import { formatCurrency, formatNumber } from "@/lib/format";

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  business_name?: string;
  email?: string;
  promptpay_id?: string;
}

export function RegisterBusinessModal({
  packages,
  onClose,
  onCreated,
}: {
  packages: Package[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [promptpayId, setPromptpayId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();

  const validate = (): boolean => {
    const next: FormErrors = {};
    const usernameRequired = validateRequired(username, " username");
    if (!usernameRequired.valid) next.username = usernameRequired.message;
    else {
      const max = validateMaxLength(username, 100, "Username");
      if (!max.valid) next.username = max.message;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) next.password = passwordCheck.message;
    if (password !== confirmPassword) next.confirmPassword = "รหัสผ่านยืนยันไม่ตรงกัน";

    const businessRequired = validateRequired(businessName, "ชื่อธุรกิจ");
    if (!businessRequired.valid) next.business_name = businessRequired.message;
    else {
      const max = validateMaxLength(businessName, 150, "ชื่อธุรกิจ");
      if (!max.valid) next.business_name = max.message;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) next.email = emailCheck.message;

    const promptpayCheck = validatePromptPayId(promptpayId);
    if (!promptpayCheck.valid) next.promptpay_id = promptpayCheck.message;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: RegisterBusinessRequest = {
        username: username.trim(),
        password,
        business_name: businessName.trim(),
        email: email.trim().toLowerCase(),
        promptpay_id: promptpayId.trim(),
        ...(packageId ? { package_id: packageId } : {}),
      };
      const created = await registerBusiness(payload);
      success(`สร้างบัญชี "${created.business_name}" สำเร็จ`, {
        title: "Register business",
      });
      success(
        packageId
          ? "ผูกแพ็กเกจเริ่มต้นแล้ว — ขั้นต่อไปคือสร้าง API Key ให้ร้านค้า"
          : "ยังไม่ได้ผูกแพ็กเกจ — กรุณา Assign Package และสร้าง API Key",
        { title: "ขั้นตอนถัดไป" },
      );
      onCreated();
      onClose();
    } catch (cause) {
      notifyError(cause, "สร้างบัญชีร้านค้าไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={submitting ? () => undefined : onClose}
      title="Register New Business"
      description="สร้างบัญชีร้านค้าและผูกแพ็กเกจเริ่มต้นได้ในขั้นตอนเดียว"
      size="lg"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              const form = document.getElementById("register-business-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            loading={submitting}
            icon={<UserPlus className="size-4" />}
          >
            สร้างบัญชีร้านค้า
          </Button>
        </>
      }
    >
      <form id="register-business-form" onSubmit={submit} className="space-y-5">
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface-subtle p-3.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-ink-secondary" />
          <p className="text-[11px] leading-5 text-ink-secondary">
            ระบบจะสร้าง User (role = business) และ Business ใน transaction เดียวกัน
            แต่จะยังไม่ออก API Key จนกว่าจะสร้างจากหน้า API Keys
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Username" htmlFor="reg-username" error={errors.username} hint="ห้ามซ้ำ">
            <Input
              id="reg-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((current) => ({ ...current, username: undefined }));
              }}
              maxLength={100}
              autoFocus
              autoComplete="off"
              placeholder="merchant_shop01"
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="reg-email"
            error={errors.email}
            hint="ใช้ติดต่อและกู้คืนบัญชี"
          >
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              maxLength={255}
              autoComplete="email"
              placeholder="owner@coffee-shop.com"
            />
          </FormField>
          <FormField label="Business Name" htmlFor="reg-business-name" error={errors.business_name}>
            <Input
              id="reg-business-name"
              value={businessName}
              onChange={(event) => {
                setBusinessName(event.target.value);
                setErrors((current) => ({ ...current, business_name: undefined }));
              }}
              maxLength={150}
              placeholder="APay Demo Coffee Shop"
            />
          </FormField>
          <FormField
            label="PromptPay ID"
            htmlFor="reg-promptpay"
            error={errors.promptpay_id}
            hint="10 หรือ 13 หลัก"
          >
            <Input
              id="reg-promptpay"
              value={promptpayId}
              onChange={(event) => {
                setPromptpayId(event.target.value.replace(/\D/g, ""));
                setErrors((current) => ({ ...current, promptpay_id: undefined }));
              }}
              inputMode="numeric"
              maxLength={13}
              className="font-mono tracking-wide"
              placeholder="0812345678"
            />
          </FormField>
          <FormField
            label="Password"
            htmlFor="reg-password"
            error={errors.password}
            hint="อย่างน้อย 8 ตัวอักษร"
          >
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Confirm Password" htmlFor="reg-confirm" error={errors.confirmPassword}>
            <Input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrors((current) => ({ ...current, confirmPassword: undefined }));
              }}
              autoComplete="new-password"
            />
          </FormField>
        </div>

        <FormField
          label="Initial Package"
          htmlFor="reg-package"
          optional
          hint="ผูกแพ็กเกจและเริ่มรอบบิลทันที"
        >
          <Select
            id="reg-package"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
          >
            <option value="">ไม่ผูกแพ็กเกจตอนนี้</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({pkg.code}) · {formatCurrency(pkg.price)} ·{" "}
                {formatNumber(pkg.quota_limit)} QR / {pkg.billing_cycle_months} เดือน
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-start gap-2 rounded-card border border-warning-border bg-warning-soft p-3">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-ink" />
          <p className="text-[11px] leading-5 text-warning-ink">
            หากสร้างบัญชีไม่สำเร็จ ระบบจะ Rollback ทั้ง User และ Business
            (รวมถึงการผูกแพ็กเกจ) ทั้งหมด
          </p>
        </div>
      </form>
    </Modal>
  );
}
