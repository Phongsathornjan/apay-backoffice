"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  QrCode,
  Share2,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import type { CreateQrData } from "@/types/api";
import { parsePromptPayAccount } from "@/lib/promptpay";
import { useCopy } from "@/lib/hooks/use-copy";
import { formatCountdown, formatCurrency, formatDateTime, formatTime } from "@/lib/format";
import { CopyButton } from "@/components/ui/copy-button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** PromptPay QRs issued by APay live for five minutes. */
const QR_TTL_SECONDS = 300;

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
      className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-ink-secondary transition hover:bg-surface-muted active:bg-surface-muted"
    >
      <span className="text-promptpay">{icon}</span>
      {label}
    </button>
  );
}

/**
 * Bank-app style PromptPay QR slip.
 *
 * Mirrors what a customer sees after scanning: payee header, the exact amount
 * to transfer, a quiet-zone QR block and the reference/expiry block. Kept
 * presentational — polling and order state stay with the page.
 */
export function PromptPaySlip({
  order,
  payeeName,
  remaining,
  isPaid,
  isExpired,
}: {
  order: CreateQrData;
  payeeName?: string | null;
  remaining: number;
  isPaid: boolean;
  isExpired: boolean;
}) {
  const account = parsePromptPayAccount(order.qr_payload);
  const { copied, copy } = useCopy();
  const [shared, setShared] = useState(false);
  const progress = Math.max(0, Math.min(100, (remaining / QR_TTL_SECONDS) * 100));
  const scanning = !isPaid && !isExpired;
  const statusLabel = isPaid ? "ชำระแล้ว" : isExpired ? "หมดอายุ" : "รอชำระ";

  const download = () => {
    const link = document.createElement("a");
    link.href = order.qr_image;
    link.download = `promptpay-${order.order_id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const share = async () => {
    const title = "PromptPay QR";
    const text = `สแกนจ่าย ${formatCurrency(order.total_amount)} · ${order.order_id}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
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
    <div className="mx-auto w-full max-w-[400px]">
      <div
        className={cn(
          "overflow-hidden rounded-panel border bg-surface shadow-raised",
          isPaid
            ? "border-success-border"
            : isExpired
              ? "border-line-strong"
              : "border-line",
        )}
      >
        {/* Bank-style header */}
        <div
          className={cn(
            "relative overflow-hidden px-5 py-4 text-white",
            isPaid ? "bg-success" : isExpired ? "bg-ink-secondary" : "bg-promptpay",
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-control bg-white/15 ring-1 ring-white/25">
                <QrCode className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                  Thai QR Payment
                </p>
                <p className="text-lg font-bold leading-tight tracking-tight">{payeeName}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold ring-1 ring-white/25">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full bg-white",
                  !isPaid && !isExpired && "animate-pulse",
                )}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-5">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              ยอดที่ต้องชำระ
            </p>
            <p className="mt-1.5 font-mono text-[34px] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[40px]">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          {/* QR block with bank-style framing */}
          <div
            className={cn(
              "relative mt-4 rounded-panel border bg-white p-4",
              isPaid ? "border-success-border" : "border-line",
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-2 size-4 rounded-tl border-l-2 border-t-2 border-promptpay/35"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-2 size-4 rounded-tr border-r-2 border-t-2 border-promptpay/35"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-2 size-4 rounded-bl border-b-2 border-l-2 border-promptpay/35"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 right-2 size-4 rounded-br border-b-2 border-r-2 border-promptpay/35"
            />

            <div className="relative mx-auto aspect-square w-full max-w-[236px] overflow-hidden rounded-control bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.qr_image}
                alt={`PromptPay QR สำหรับคำสั่งซื้อ ${order.order_id} ยอด ${formatCurrency(
                  order.total_amount,
                )}`}
                className={cn(
                  "size-full object-contain transition duration-300",
                  isExpired && "opacity-30 grayscale",
                  isPaid && "opacity-20 blur-[2px]",
                )}
              />

              {scanning ? (
                <span
                  aria-hidden="true"
                  className="qr-scan-line pointer-events-none absolute inset-x-2 h-10 rounded-full bg-gradient-to-b from-brand/25 via-brand/10 to-transparent"
                />
              ) : null}

              {isPaid ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-success-ink">
                  <span className="animate-success-pop flex size-14 items-center justify-center rounded-full bg-success-soft ring-4 ring-success-border/60">
                    <CheckCircle2 className="size-8" />
                  </span>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-[11px] font-bold">
                    ชำระเงินสำเร็จ
                  </span>
                </div>
              ) : null}

              {isExpired && !isPaid ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-secondary">
                  <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted ring-4 ring-surface">
                    <TimerReset className="size-6" />
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold">
                    QR หมดอายุแล้ว
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <dl className="mt-4 divide-y divide-dashed divide-line border-t border-dashed border-line text-[11px]">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-ink-muted">พร้อมเพย์</dt>
              <dd className="font-mono text-ink-secondary">
                {account?.masked ?? "บัญชีร้านค้า PromptPay"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-ink-muted">เลขอ้างอิง</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className="truncate font-mono text-ink-secondary">{order.order_id}</span>
                <CopyButton
                  value={order.order_id}
                  iconOnly
                  label="คัดลอกเลขอ้างอิง"
                  className="size-6 shrink-0 border-0 bg-transparent p-0 hover:bg-surface-muted"
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-ink-muted">หมดอายุ</dt>
              <dd className="font-mono text-ink-secondary">{formatDateTime(order.expires_at)}</dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-card border border-line bg-surface-subtle">
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
              label={copied ? "คัดลอกแล้ว" : "คัดลอก payload"}
              onClick={() => void copy(order.qr_payload)}
            />
          </div>
        </div>

        <div className="border-t border-line bg-surface-subtle px-5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
              <Clock3
                className={cn(
                  "size-3.5",
                  isPaid ? "text-success" : isExpired ? "text-ink-muted" : "text-warning",
                )}
              />
              {isPaid ? (
                "ยืนยันการชำระแล้ว"
              ) : isExpired ? (
                "สิ้นสุดเวลาชำระ"
              ) : (
                <>
                  เหลือเวลา{" "}
                  <span className="font-mono tabular-nums text-ink">
                    {formatCountdown(remaining)}
                  </span>
                </>
              )}
            </span>
            {!isPaid && !isExpired ? (
              <span className="font-mono text-[10px] text-ink-muted">
                ถึง {formatTime(order.expires_at)} น.
              </span>
            ) : null}
          </div>

          <Progress
            value={progress}
            tone={isPaid ? "success" : isExpired ? "neutral" : remaining <= 60 ? "danger" : "warning"}
            className="mt-2.5 h-1"
            ariaLabel="เวลาคงเหลือของ QR"
          />
        </div>
      </div>
    </div>
  );
}
