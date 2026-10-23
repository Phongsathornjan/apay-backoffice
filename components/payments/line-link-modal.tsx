"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, RefreshCw, ShieldCheck, TimerReset } from "lucide-react";
import type { LinkLineQrData } from "@/types/api";
import {
  createLineLinkQr,
  getPaymentOrder,
  isAlreadyLinkedError,
  isDecimalSlotConflict,
} from "@/services/payments";
import { ApiError, getApiErrorMessage } from "@/services/api";
import {
  getBankOption,
  getDefaultBank,
  isSupportedBank,
  supportedBankLabel,
  type BankCode,
} from "@/lib/banks";
import { BankPicker } from "@/components/payments/bank-picker";
import {
  PromptPayPaidSlip,
  PromptPayQrSlip,
  PromptPaySlipSkeleton,
} from "@/components/payments/promptpay-slip";
import { formatCountdown } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Phase = "loading" | "ready" | "paid" | "expired" | "error";

const POLL_INTERVAL_MS = 3_000;
const TICK_INTERVAL_MS = 1_000;

export interface LineLinkModalProps {
  open: boolean;
  onClose: () => void;
  onLinked: (lineUserId: string | null) => void;
  onAlreadyLinked?: () => void;
  /**
   * When set, use this JWT instead of the current session.
   * Used by admin in Raw API Key mode after exchanging the business API key.
   */
  accessToken?: string;
  /**
   * Optional order already created by the caller (admin Raw API Key mode).
   * When present and the modal is freshly opened, no extra link order is created.
   */
  initialOrder?: LinkLineQrData | null;
  /** Bank preselected in the picker; falls back to the first supported bank. */
  defaultBank?: BankCode;
}

/**
 * Runs the full LINE linking flow: 0.01–0.99 verification QR → 5-minute
 * countdown → polling `GET /payments/orders/:id` every 3 seconds until the bank
 * marks the order as PAID and the business gets its `line_user_id`.
 *
 * The bank picker is bank-aware but currently only KBank can verify transfers;
 * the selection only drives the on-screen instructions until the backend ships
 * per-bank webhooks.
 */
export function LineLinkModal({
  open,
  onClose,
  onLinked,
  onAlreadyLinked,
  accessToken,
  initialOrder = null,
  defaultBank,
}: LineLinkModalProps) {
  const [order, setOrder] = useState<LinkLineQrData | null>(initialOrder);
  const [status, setStatus] = useState<Phase>(initialOrder ? "ready" : "loading");
  const [error, setError] = useState<unknown>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [nonce, setNonce] = useState(0);
  const [bank, setBank] = useState<BankCode>(() =>
    defaultBank && isSupportedBank(defaultBank)
      ? defaultBank
      : getDefaultBank().code,
  );
  const bankOption = getBankOption(bank);

  /** In-flight/created request, shared across React StrictMode re-invocations. */
  const requestRef = useRef<Promise<LinkLineQrData> | null>(null);
  /** Whether the next `open` should request a QR (false while a caller-provided order is shown). */
  const shouldCreateRef = useRef(!initialOrder);
  const linkedNotifiedRef = useRef(false);

  const onLinkedRef = useRef(onLinked);
  const onAlreadyLinkedRef = useRef(onAlreadyLinked);
  const mountedRef = useRef(true);
  useEffect(() => {
    onLinkedRef.current = onLinked;
  }, [onLinked]);
  useEffect(() => {
    onAlreadyLinkedRef.current = onAlreadyLinked;
  }, [onAlreadyLinked]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Restarting the flow (expired/error retry) is user driven, so state updates
  // stay out of effects.
  const retry = useCallback(() => {
    requestRef.current = null;
    shouldCreateRef.current = true;
    linkedNotifiedRef.current = false;
    setStatus("loading");
    setError(null);
    setPollError(null);
    setLinkedUserId(null);
    setPaidAt(null);
    setNonce((value) => value + 1);
  }, []);

  /** Re-reads the order; success is only shown for data confirmed by the API. */
  const verifyOrder = useCallback(async () => {
    if (!order) return;

    try {
      const detail = await getPaymentOrder(order.order_id, accessToken);
      if (!mountedRef.current) return;
      setPollError(null);

      if (detail.status === "PAID") {
        setLinkedUserId(detail.line_user_id ?? null);
        setPaidAt(detail.paid_at ?? new Date().toISOString());
        setStatus("paid");
        if (!linkedNotifiedRef.current) {
          linkedNotifiedRef.current = true;
          onLinkedRef.current(detail.line_user_id ?? null);
        }
        return;
      }
      if (detail.status === "EXPIRED") {
        setStatus("expired");
      }
    } catch (cause) {
      if (!mountedRef.current) return;
      setPollError(getApiErrorMessage(cause));
    }
  }, [order, accessToken]);

  // Create the verification order exactly once per open/retry. The shared
  // promise keeps React StrictMode's double effect invocation from creating
  // two 0.01–0.99 orders.
  useEffect(() => {
    if (!open || !shouldCreateRef.current) return;

    let cancelled = false;
    if (!requestRef.current) {
      requestRef.current = createLineLinkQr(accessToken);
    }

    requestRef.current
      .then((created) => {
        if (cancelled) return;
        setOrder(created);
        setNow(Date.now());
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        requestRef.current = null;
        setError(cause);
        setStatus("error");
        if (isAlreadyLinkedError(cause)) onAlreadyLinkedRef.current?.();
      });

    return () => {
      cancelled = true;
    };
  }, [open, nonce, accessToken]);

  const expiresAt = order ? new Date(order.expires_at).getTime() : 0;
  const remaining = order ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const clockExpired = status === "ready" && Boolean(order) && remaining <= 0;
  const phase: Phase = clockExpired ? "expired" : status;

  // 1s ticker for the countdown; it stops as soon as the QR is expired.
  useEffect(() => {
    if (!open || !order || status !== "ready" || clockExpired) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [open, order, status, clockExpired]);

  // Polling fallback: keeps the flow correct even when SSE is unavailable.
  useEffect(() => {
    if (!open || !order || phase !== "ready") return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      if (cancelled) return;
      await verifyOrder();
      if (cancelled) return;
      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [open, order, phase, verifyOrder]);

  const alreadyLinked = isAlreadyLinkedError(error);
  const slotConflict = isDecimalSlotConflict(error);

  const errorMessage = (() => {
    if (!error) return null;
    if (alreadyLinked) return "ธุรกิจนี้ผูก LINE ไว้แล้ว";
    if (slotConflict) return "ยอดยืนยันไม่ว่าง กรุณาลองใหม่";
    if (error instanceof ApiError && error.status === 401) {
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง";
    }
    return getApiErrorMessage(error);
  })();

  const statusText =
    phase === "loading"
      ? "กำลังสร้าง QR ยืนยันสำหรับผูก LINE"
      : phase === "paid"
        ? "ผูก LINE สำเร็จ"
        : phase === "expired"
          ? "QR หมดอายุแล้ว กรุณาสร้างใหม่"
          : phase === "error"
            ? (errorMessage ?? "สร้าง QR ไม่สำเร็จ")
            : `รอการชำระเงิน เหลือเวลา ${formatCountdown(remaining)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="สแกนจ่ายเพื่อผูก LINE"
      description={`ชำระยอดยืนยันผ่าน PromptPay จากบัญชีที่ผูก LINE ไว้ — ระบบตรวจการแจ้งเตือนเงินเข้าแล้วผูกบัญชีให้อัตโนมัติ (รองรับ: ${supportedBankLabel()})`}
      size="md"
      footer={
        <>
          {phase === "expired" || phase === "error" ? (
            <Button
              variant="secondary"
              onClick={retry}
              icon={<RefreshCw className="size-4" />}
            >
              สร้าง QR ใหม่
            </Button>
          ) : null}
          <Button variant={phase === "paid" ? "primary" : "secondary"} onClick={onClose}>
            ปิด
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p aria-live="polite" className="sr-only">
          {statusText}
        </p>

        {phase !== "error" ? <LinkSteps phase={phase} /> : null}

        {phase === "loading" || phase === "ready" || phase === "expired" ? (
          <BankPicker
            value={bank}
            onChange={setBank}
            disabled={phase === "loading"}
            label="สแกนจ่ายจากบัญชีธนาคาร"
            hint={`ยืนยันอัตโนมัติ: ${supportedBankLabel()}`}
          />
        ) : null}

        {phase === "loading" ? <PromptPaySlipSkeleton /> : null}

        {phase === "error" ? (
          <div className="space-y-3">
            <ErrorNotice
              message={errorMessage ?? "สร้าง QR ไม่สำเร็จ"}
              correlationId={error instanceof ApiError ? error.correlationId : null}
              onRetry={alreadyLinked ? undefined : retry}
            />
            {alreadyLinked ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-600">
                ร้านค้านี้ผูก LINE User ID ไว้แล้ว — กรุณากด &quot;ปิด&quot; แล้วเข้าสู่ระบบใหม่
                หรือรีเฟรชหน้าเพื่อรับสถานะล่าสุด
              </p>
            ) : null}
            {slotConflict ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
                เศษสตางค์ยืนยัน 0.01–0.99 ถูกใช้งานครบชั่วคราว
                กรุณารอให้ QR ที่ค้างอยู่หมดอายุ (5 นาที) แล้วกด &quot;สร้าง QR ใหม่&quot;
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === "paid" && order ? (
          <PromptPayPaidSlip
            amount={order.total_amount}
            orderId={order.order_id}
            bank={bankOption}
            lineUserId={linkedUserId}
            paidAt={paidAt}
          />
        ) : null}

        {order && (phase === "ready" || phase === "expired") ? (
          <PromptPayQrSlip
            qrImage={order.qr_image}
            qrPayload={order.qr_payload}
            amount={order.total_amount}
            orderId={order.order_id}
            bank={bankOption}
            remaining={remaining}
            expiresAt={order.expires_at}
            expired={phase === "expired"}
          />
        ) : null}

        {phase === "ready" ? (
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
            <Loader2 className="size-3 animate-spin text-emerald-500" />
            กำลังตรวจสอบยอดโอนอัตโนมัติทุก 3 วินาที
          </p>
        ) : null}

        {pollError ? (
          <p className="text-center text-[10px] leading-4 text-rose-600">
            {pollError} — ระบบจะลองใหม่ให้อัตโนมัติ
          </p>
        ) : null}

        {phase === "expired" ? (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
            <TimerReset className="mt-0.5 size-3.5 shrink-0" />
            <span>
              QR หมดอายุ กรุณากด &quot;สร้าง QR ใหม่&quot; — ระบบจะจองเศษสตางค์ 0.01–0.99 ให้ใหม่
            </span>
          </p>
        ) : null}

        <p className="flex items-start gap-2 text-[10px] leading-4 text-slate-400">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          <span>
            QR มีอายุ 5 นาที · 1 LINE User ID ผูกได้กับ 1 ธุรกิจเท่านั้น
            <span className="mt-1 block">
              สแกนจากแอปธนาคารที่เปิดแจ้งเตือน LINE ให้ APay · รองรับ {supportedBankLabel()}
            </span>
          </span>
        </p>
      </div>
    </Modal>
  );
}

/**
 * Three-step rail that keeps the modal readable as a real payment flow:
 * scan → transfer the exact amount → LINE gets linked automatically.
 */
function LinkSteps({ phase }: { phase: Phase }) {
  const complete = phase === "paid";
  const current = phase === "ready";
  const steps = [
    { title: "สแกน QR", hint: "ด้วยแอปธนาคาร" },
    { title: "โอนยอดยืนยัน", hint: "ตรงทศนิยม 2 ตำแหน่ง" },
    { title: "ผูก LINE", hint: "อัตโนมัติ" },
  ];

  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const done = complete;
        const active = !complete && current && index === 0;
        return (
          <li
            key={step.title}
            aria-current={active ? "step" : undefined}
            className={cn(
              "rounded-xl border px-2 py-1.5 transition-colors",
              done
                ? "border-emerald-200 bg-emerald-50/70"
                : active
                  ? "border-[#0b3b8c]/25 bg-[#eef4ff]"
                  : "border-slate-200 bg-white",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-[#0b3b8c] text-white"
                      : "bg-slate-100 text-slate-500",
                )}
              >
                {done ? <Check className="size-2.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[10px] font-semibold",
                  done
                    ? "text-emerald-800"
                    : active
                      ? "text-[#0b3b8c]"
                      : "text-slate-500",
                )}
              >
                {step.title}
              </span>
            </span>
            <p className="mt-0.5 truncate pl-[22px] text-[9px] text-slate-400">{step.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
