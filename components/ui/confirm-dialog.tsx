"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  destructive = false,
  loading = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 rounded-card border border-warning-border bg-warning-soft p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-ink" />
        <div className="min-w-0 text-xs leading-5 text-warning-ink">
          <p className="font-semibold">โปรดตรวจสอบก่อนยืนยัน</p>
          <p className="mt-1">
            การดำเนินการนี้อาจมีผลกับ API Key หรือการเรียกใช้งานของร้านค้าแบบทันที
          </p>
          {children}
        </div>
      </div>
    </Modal>
  );
}
