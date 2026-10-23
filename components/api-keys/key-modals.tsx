"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, ShieldAlert } from "lucide-react";
import type { ApiKeySummary, CreateApiKeyData } from "@/types/api";
import { createApiKey, updateApiKey } from "@/services/api-keys";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox, FormField, Input } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";

export function CreateKeyModal({
  open,
  businessId,
  isAdmin,
  onClose,
  onCreated,
}: {
  open: boolean;
  businessId: string;
  isAdmin: boolean;
  onClose: () => void;
  onCreated: (key: CreateApiKeyData) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();

  const close = () => {
    if (submitting) return;
    setName("");
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("กรุณากรอกชื่อ API Key");
      return;
    }
    if (trimmed.length > 100) {
      setError("ชื่อ API Key ต้องไม่เกิน 100 ตัวอักษร");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createApiKey({
        name: trimmed,
        ...(isAdmin ? { business_id: businessId } : {}),
      });
      success(`สร้าง API Key "${created.name}" สำเร็จ`, {
        title: "สร้าง Key เรียบร้อย",
      });
      setName("");
      onCreated(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้าง API Key ไม่สำเร็จ");
      notifyError(cause, "สร้าง API Key ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="สร้าง API Key ใหม่"
      description="ตั้งชื่อที่สื่อถึงอุปกรณ์หรือระบบที่จะใช้ Key นี้"
      size="sm"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              const form = document.getElementById("create-api-key-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            loading={submitting}
          >
            สร้าง API Key
          </Button>
        </>
      }
    >
      <form id="create-api-key-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3.5">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-indigo-600" />
          <p className="text-[11px] leading-5 text-indigo-800">
            ระบบจะแสดง Raw API Key เพียงครั้งเดียวหลังสร้างเสร็จ
            กรุณาเตรียมเก็บรักษาในที่ปลอดภัย
          </p>
        </div>
        <FormField
          label="ชื่อ API Key"
          htmlFor="api-key-name"
          error={error}
          hint={`${name.length}/100`}
        >
          <Input
            id="api-key-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="เช่น POS Front Desk, Mobile App"
            maxLength={100}
            autoFocus
            disabled={submitting}
          />
        </FormField>
        {businessId ? (
          <p className="break-all font-mono text-[10px] text-slate-400">
            business_id: {businessId}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

export function OneTimeKeyModal({
  created,
  onClose,
}: {
  created: CreateApiKeyData;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { success } = useToast();

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </span>
          API Key ถูกสร้างแล้ว
        </span>
      }
      description="นี่เป็นครั้งเดียวที่ระบบจะแสดง Raw API Key นี้"
      footer={
        <Button
          disabled={!acknowledged}
          onClick={() => {
            success("บันทึก API Key เรียบร้อย", { title: "ปิดหน้าต่างยืนยัน" });
            onClose();
          }}
          icon={<ShieldAlert className="size-4" />}
        >
          ฉันได้บันทึก Key แล้ว
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <div className="text-[11px] leading-5 text-rose-800">
              <p className="font-semibold">กรุณาคัดลอกและเก็บ Key นี้ทันที</p>
              <p className="mt-1">
                ระบบเก็บเฉพาะ hash ของ Key และจะไม่แสดง raw key ซ้ำอีก
                หากทำหายต้องเพิกถอนและสร้างใหม่เท่านั้น
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-600">Raw API Key</p>
            <CopyButton value={created.api_key} label="คัดลอก API Key" />
          </div>
          <div className="relative rounded-xl border border-slate-300 bg-slate-950 p-4">
            <code className="block break-all pr-8 font-mono text-[12px] leading-6 text-emerald-300">
              {created.api_key}
            </code>
            <Copy className="pointer-events-none absolute right-3 top-3 size-4 text-slate-600" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-slate-400">Name</p>
            <p className="mt-0.5 truncate font-semibold text-slate-700">{created.name}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-slate-400">Prefix</p>
            <p className="mt-0.5 truncate font-mono font-semibold text-slate-700">
              {created.key_prefix}
            </p>
          </div>
        </div>

        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          label="ฉันได้คัดลอกและจัดเก็บ API Key นี้อย่างปลอดภัยแล้ว"
          description="ยืนยันเพื่อเปิดใช้งานปุ่มปิดหน้าต่าง"
          className={acknowledged ? "border-emerald-300 bg-emerald-50/50" : undefined}
        />
      </div>
    </Modal>
  );
}

export function EditKeyModal({
  apiKey,
  onClose,
  onSaved,
}: {
  apiKey: Pick<ApiKeySummary, "id" | "name" | "key_prefix">;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(apiKey.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notifyError, success } = useToast();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("กรุณากรอกชื่อ API Key");
      return;
    }
    if (trimmed === apiKey.name.trim()) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateApiKey(apiKey.id, { name: trimmed });
      success("อัปเดตชื่อ API Key สำเร็จ");
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตไม่สำเร็จ");
      notifyError(cause, "อัปเดต API Key ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={submitting ? () => undefined : onClose}
      title="แก้ไขชื่อ API Key"
      description={apiKey.key_prefix}
      size="sm"
      dismissible={!submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              const form = document.getElementById("edit-api-key-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            loading={submitting}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <form id="edit-api-key-form" onSubmit={submit}>
        <FormField label="ชื่อ API Key" htmlFor="edit-key-name" error={error} hint={`${name.length}/100`}>
          <Input
            id="edit-key-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            maxLength={100}
            autoFocus
          />
        </FormField>
      </form>
    </Modal>
  );
}
