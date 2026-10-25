"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Link2,
  Loader2,
  Share2,
  ShieldCheck,
} from "lucide-react";
import type { BankOption } from "@/lib/banks";
import { parsePromptPayAccount } from "@/lib/promptpay";
import { useCopy } from "@/lib/hooks/use-copy";
import { formatCountdown, formatDateTime, formatTime, maskLineUserId } from "@/lib/format";
import { cn } from "@/lib/utils";

/** QR validity window the backend grants for linking orders. */
const DEFAULT_TTL_SECONDS = 5 * 60;

/**
 * PromptPay wordmark used across the payment screens.
 *
 * This is a decorative in-house mark, not the official PromptPay logo asset.
 */
export function PromptPayMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-promptpay text-white shadow-card">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
          <path
            d="M5.6 15.1a6.7 6.7 0 0 1 11.3-7.5"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M13.9 7.2l3.2.1-.2 3.2"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.4 8.9A6.7 6.7 0 0 1 7.1 16.4"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M10.1 16.8l-3.2-.1.2-3.2"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] font-bold tracking-tight text-brand-ink">
          PromptPay
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Thai QR Payment
        </span>
      </span>
    </span>
  );
}

function Amount({ value }: { value: number }) {
  const total = Number(value ?? 0).toFixed(2);

  return (
    <span className="flex items-baseline justify-center tabular-nums">
      <span className="text-xl font-semibold text-ink-muted">฿</span>
      <span className="font-mono text-[42px] font-bold leading-none tracking-tight text-ink">
        {total}
      </span>
      <span className="ml-1 text-[11px] font-medium text-ink-muted">บาท</span>
    </span>
  );
}

function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-[11px] text-ink-muted">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-[11px] font-semibold text-ink",
          mono && "font-mono text-[11px]",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function SlipAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold text-ink-secondary transition hover:bg-surface-subtle active:bg-surface-muted"
    >
      <span className="text-brand-ink">{icon}</span>
      {label}
    </button>
  );
}

export interface PromptPayQrSlipProps {
  qrImage: string;
  qrPayload: string;
  amount: number;
  orderId: string;
  bank: BankOption;
  remaining: number;
  expiresAt?: string;
  expired?: boolean;
  totalSeconds?: number;
}

/**
 * "Scan to pay" panel that mirrors the PromptPay QR screen of a Thai banking
 * app: brand bar, amount, framed QR, expiry countdown, payee block and the
 * save/share/copy actions users expect at that step.
 */
export function PromptPayQrSlip({
  qrImage,
  qrPayload,
  amount,
  orderId,
  bank,
  remaining,
  expiresAt,
  expired = false,
  totalSeconds = DEFAULT_TTL_SECONDS,
}: PromptPayQrSlipProps) {
  const { copied, copy } = useCopy();
  const [shared, setShared] = useState(false);
  const account = parsePromptPayAccount(qrPayload);

  const progress = expired
    ? 0
    : Math.max(0, Math.min(100, (remaining / Math.max(totalSeconds, 1)) * 100));
  const urgent = !expired && remaining <= 60;

  const download = () => {
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `promptpay-${orderId}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const share = async () => {
    const title = "PromptPay QR";
    const text = `สแกนจ่าย ฿${amount.toFixed(2)} · ${orderId}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        let file: File | null = null;
        if (qrImage.startsWith("data:") && typeof navigator.canShare === "function") {
          try {
            const blob = await (await fetch(qrImage)).blob();
            const candidate = new File([blob], `promptpay-${orderId}.png`, {
              type: blob.type || "image/png",
            });
            if (navigator.canShare({ files: [candidate] })) file = candidate;
          } catch {
            file = null;
          }
        }

        await navigator.share(file ? { title, text, files: [file] } : { title, text });
        setShared(true);
        window.setTimeout(() => setShared(false), 1_800);
        return;
      } catch (cause) {
        // User dismissed the share sheet — don't fall back to the clipboard.
        if (cause instanceof DOMException && cause.name === "AbortError") return;
      }
    }

    await copy(text);
  };

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-[linear-gradient(135deg,var(--apay-brand-soft)_0%,var(--apay-surface)_60%)] px-4 py-3">
        <PromptPayMark />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink-secondary">
          <span className={cn("size-2 rounded-full", bank.accent)} />
          {bank.shortName}
        </span>
      </div>

      <div className="px-5 pt-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          ยอดที่ต้องชำระ
        </p>
        <div className="mt-1.5">
          <Amount value={amount} />
        </div>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning-ink">
          ต้องโอนให้ตรงทศนิยม
        </p>
      </div>

      <div className="relative mx-auto mt-4 w-fit">
        <span className="pointer-events-none absolute -left-1.5 -top-1.5 size-5 rounded-tl-control border-l-2 border-t-2 border-brand" />
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 size-5 rounded-tr-control border-r-2 border-t-2 border-brand" />
        <span className="pointer-events-none absolute -bottom-1.5 -left-1.5 size-5 rounded-bl-control border-b-2 border-l-2 border-brand" />
        <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 size-5 rounded-br-control border-b-2 border-r-2 border-brand" />

        <div className="relative overflow-hidden rounded-panel border border-line bg-surface p-4 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImage}
            alt={`PromptPay QR for order ${orderId}`}
            className={cn(
              "size-48 rounded-control object-contain transition",
              expired && "opacity-20 grayscale",
            )}
          />

          {!expired ? (
            <span className="qr-scan-line pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_var(--apay-brand-glow)]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-line-strong bg-surface/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-secondary shadow-card">
                QR หมดอายุ
              </span>
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-secondary">
        สแกนด้วยแอปธนาคารที่ผูก LINE ไว้
      </p>

      <div
        className={cn(
          "mx-4 mt-4 rounded-card border px-3 py-2.5",
          expired
            ? "border-line bg-surface-subtle"
            : urgent
              ? "border-danger-border bg-danger-soft"
              : "border-warning-border bg-warning-soft",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold",
              expired ? "text-ink-secondary" : urgent ? "text-danger-ink" : "text-warning-ink",
            )}
          >
            <Clock3 className="size-3" />
            {expired ? "QR หมดอายุแล้ว" : "QR หมดอายุใน"}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              expired ? "text-ink-secondary" : urgent ? "text-danger-ink" : "text-warning-ink",
            )}
          >
            {expired ? "00:00" : formatCountdown(remaining)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="เวลาคงเหลือของ QR"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="mt-2 h-1 overflow-hidden rounded-full bg-surface/80"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              expired ? "bg-line-strong" : urgent ? "bg-danger" : "bg-warning",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {expiresAt ? (
          <p className="mt-1.5 text-right text-[11px] text-ink-muted">
            {expired ? "หมดอายุเมื่อ" : "ใช้ได้ถึง"} {formatTime(expiresAt)} น.
          </p>
        ) : null}
      </div>

      <div className="mx-4 mt-3 divide-y divide-line/70 overflow-hidden rounded-card border border-line bg-surface-subtle">
        <DetailRow label="ผู้รับเงิน">PromptPay</DetailRow>
        <DetailRow label="พร้อมเพย์" mono>
          {account?.masked ?? "—"}
        </DetailRow>
        <DetailRow label="ธนาคาร">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", bank.accent)} />
            {bank.name}
          </span>
        </DetailRow>
        <DetailRow label="เลขที่รายการ" mono>
          {orderId}
        </DetailRow>
      </div>

      <p className="mx-4 mt-3 flex items-start gap-2 rounded-control bg-surface-subtle px-2.5 py-2 text-[11px] leading-4 text-ink-secondary">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
        โปรดตรวจสอบชื่อผู้รับและยอดเงินก่อนกดยืนยัน — ยอดต้องตรงทศนิยม 2 ตำแหน่ง
      </p>

      <div className="mt-3 grid grid-cols-3 divide-x divide-line border-t border-line">
        <SlipAction
          icon={<Download className="size-4" />}
          label="บันทึก QR"
          onClick={download}
        />
        <SlipAction
          icon={shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
          label={shared ? "แชร์แล้ว" : "แชร์"}
          onClick={() => void share()}
        />
        <SlipAction
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          label={copied ? "คัดลอกแล้ว" : "คัดลอก"}
          onClick={() => void copy(qrPayload)}
        />
      </div>
    </div>
  );
}

export interface PromptPayPaidSlipProps {
  amount: number;
  orderId: string;
  bank: BankOption;
  lineUserId: string | null;
  paidAt?: string | null;
}

/** Receipt-style confirmation shown once the transfer has been matched. */
export function PromptPayPaidSlip({
  amount,
  orderId,
  bank,
  lineUserId,
  paidAt,
}: PromptPayPaidSlipProps) {
  return (
    <div className="overflow-hidden rounded-panel border border-success-border bg-surface shadow-raised">
      <div className="bg-[linear-gradient(180deg,var(--apay-success-soft)_0%,var(--apay-surface)_100%)] px-5 pb-5 pt-6 text-center">
        <span className="animate-success-pop mx-auto grid size-14 place-items-center rounded-full bg-success text-white shadow-raised ">
          <CheckCircle2 className="size-7" />
        </span>
        <p className="mt-3 text-sm font-semibold text-success-ink">ชำระเงินสำเร็จ</p>
        <p className="mt-0.5 text-[11px] text-success-ink">
          ระบบตรวจพบยอดโอนและผูก LINE ให้ร้านค้าแล้ว
        </p>
        <div className="mt-4">
          <Amount value={amount} />
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="border-t border-dashed border-line" />
        <div className="divide-y divide-line">
          <DetailRow label="ผู้รับเงิน">PromptPay</DetailRow>
          <DetailRow label="ช่องทาง">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", bank.accent)} />
              {bank.name}
            </span>
          </DetailRow>
          <DetailRow label="วันที่" mono>
            {formatDateTime(paidAt ?? new Date().toISOString())}
          </DetailRow>
          <DetailRow label="เลขที่รายการ" mono>
            {orderId}
          </DetailRow>
        </div>
        <div className="border-t border-dashed border-line" />

        <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-success-border bg-success-soft px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success-ink">
            <Link2 className="size-3.5" />
            LINE linked
          </span>
          <span className="truncate font-mono text-[11px] font-semibold text-success-ink">
            {maskLineUserId(lineUserId)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder shaped like the slip so the modal never jumps. */
export function PromptPaySlipSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 animate-pulse rounded-control bg-line" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 animate-pulse rounded bg-line" />
            <div className="h-2 w-14 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-surface-muted" />
      </div>
      <div className="mt-6 space-y-2 text-center">
        <div className="mx-auto h-2 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="mx-auto h-9 w-36 animate-pulse rounded-control bg-line" />
      </div>
      <div className="mx-auto mt-5 size-48 animate-pulse rounded-panel bg-surface-muted" />
      <div className="mt-5 h-10 animate-pulse rounded-card bg-surface-muted" />
      <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-ink-secondary">
        <Loader2 className="size-3.5 animate-spin text-brand" />
        กำลังสร้าง QR ยืนยันสำหรับผูก LINE…
      </p>
    </div>
  );
}
