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
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[#0b3b8c] text-white shadow-[0_2px_6px_rgba(11,59,140,0.28)]">
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
        <span className="block text-[13px] font-bold tracking-tight text-[#0b3b8c]">
          PromptPay
        </span>
        <span className="block text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
      <span className="text-xl font-semibold text-slate-400">฿</span>
      <span className="font-mono text-[42px] font-bold leading-none tracking-tight text-slate-950">
        {total}
      </span>
      <span className="ml-1 text-[11px] font-medium text-slate-400">บาท</span>
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
      <span className="shrink-0 text-[10px] text-slate-400">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-[11px] font-semibold text-slate-700",
          mono && "font-mono text-[10px]",
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
      className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 active:bg-slate-100"
    >
      <span className="text-[#0b3b8c]">{icon}</span>
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_60%)] px-4 py-3">
        <PromptPayMark />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          <span className={cn("size-2 rounded-full", bank.accent)} />
          {bank.shortName}
        </span>
      </div>

      <div className="px-5 pt-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          ยอดที่ต้องชำระ
        </p>
        <div className="mt-1.5">
          <Amount value={amount} />
        </div>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
          ต้องโอนให้ตรงทศนิยม
        </p>
      </div>

      <div className="relative mx-auto mt-4 w-fit">
        <span className="pointer-events-none absolute -left-1.5 -top-1.5 size-5 rounded-tl-lg border-l-2 border-t-2 border-[#0b3b8c]" />
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 size-5 rounded-tr-lg border-r-2 border-t-2 border-[#0b3b8c]" />
        <span className="pointer-events-none absolute -bottom-1.5 -left-1.5 size-5 rounded-bl-lg border-b-2 border-l-2 border-[#0b3b8c]" />
        <span className="pointer-events-none absolute -bottom-1.5 -right-1.5 size-5 rounded-br-lg border-b-2 border-r-2 border-[#0b3b8c]" />

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImage}
            alt={`PromptPay QR for order ${orderId}`}
            className={cn(
              "size-48 rounded-lg object-contain transition",
              expired && "opacity-20 grayscale",
            )}
          />

          {!expired ? (
            <span className="qr-scan-line pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.85)]" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                QR หมดอายุ
              </span>
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-slate-500">
        สแกนด้วยแอปธนาคารที่ผูก LINE ไว้
      </p>

      <div
        className={cn(
          "mx-4 mt-4 rounded-xl border px-3 py-2.5",
          expired
            ? "border-slate-200 bg-slate-50"
            : urgent
              ? "border-rose-200 bg-rose-50/70"
              : "border-amber-200 bg-amber-50/60",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold",
              expired ? "text-slate-500" : urgent ? "text-rose-700" : "text-amber-800",
            )}
          >
            <Clock3 className="size-3" />
            {expired ? "QR หมดอายุแล้ว" : "QR หมดอายุใน"}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              expired ? "text-slate-500" : urgent ? "text-rose-700" : "text-amber-900",
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
          className="mt-2 h-1 overflow-hidden rounded-full bg-white/80"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              expired ? "bg-slate-300" : urgent ? "bg-rose-500" : "bg-amber-400",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {expiresAt ? (
          <p className="mt-1.5 text-right text-[9px] text-slate-400">
            {expired ? "หมดอายุเมื่อ" : "ใช้ได้ถึง"} {formatTime(expiresAt)} น.
          </p>
        ) : null}
      </div>

      <div className="mx-4 mt-3 divide-y divide-slate-200/70 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
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

      <p className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-500">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
        โปรดตรวจสอบชื่อผู้รับและยอดเงินก่อนกดยืนยัน — ยอดต้องตรงทศนิยม 2 ตำแหน่ง
      </p>

      <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
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
    <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_10px_30px_-18px_rgba(5,150,105,0.45)]">
      <div className="bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)] px-5 pb-5 pt-6 text-center">
        <span className="animate-success-pop mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
          <CheckCircle2 className="size-7" />
        </span>
        <p className="mt-3 text-sm font-semibold text-emerald-900">ชำระเงินสำเร็จ</p>
        <p className="mt-0.5 text-[10px] text-emerald-700">
          ระบบตรวจพบยอดโอนและผูก LINE ให้ร้านค้าแล้ว
        </p>
        <div className="mt-4">
          <Amount value={amount} />
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="border-t border-dashed border-slate-200" />
        <div className="divide-y divide-slate-100">
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
        <div className="border-t border-dashed border-slate-200" />

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800">
            <Link2 className="size-3.5" />
            LINE linked
          </span>
          <span className="truncate font-mono text-[10px] font-semibold text-emerald-900">
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 animate-pulse rounded-[11px] bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-2 w-14 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 space-y-2 text-center">
        <div className="mx-auto h-2 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="mx-auto mt-5 size-48 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-5 h-10 animate-pulse rounded-xl bg-slate-100" />
      <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium text-slate-500">
        <Loader2 className="size-3.5 animate-spin text-emerald-500" />
        กำลังสร้าง QR ยืนยันสำหรับผูก LINE…
      </p>
    </div>
  );
}
