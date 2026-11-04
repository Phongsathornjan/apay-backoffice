"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { CreateQrData, PaymentOrderDetailData } from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import { createQrWithApiKey, getPaymentOrder } from "@/services/payments";
import { ApiError } from "@/services/api";
import {
  formatCurrency,
  formatDateTime,
  formatTime,
} from "@/lib/format";
import { validateAmount, validateHttpsUrl } from "@/lib/validators";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { loadPlaygroundApiKey, subscribePlaygroundApiKey } from "@/lib/playground-key";
import { PromptPaySlip } from "@/components/payments/promptpay-slip";
import { cn } from "@/lib/utils";

const DEFAULT_REDIRECT_URL = "https://merchant.example.com/webhooks/apay";

export default function PaymentsPage() {
  const { businessId, activeBusiness } = useAuth();
  const { notifyError, success } = useToast();

  // API Key ตัวแรกที่เคยสร้างจะถูกจำไว้และเติมให้อัตโนมัติ (อ่านจาก localStorage
  // ผ่าน external store เพื่อไม่ให้ค่าใน input ต่างกันระหว่าง SSR กับ client)
  const storedApiKey = useSyncExternalStore(
    subscribePlaygroundApiKey,
    () => loadPlaygroundApiKey(businessId),
    () => "",
  );
  const [draftApiKey, setDraftApiKey] = useState<string | null>(null);
  const apiKey = draftApiKey ?? storedApiKey;

  const [showApiKey, setShowApiKey] = useState(false);
  const [amount, setAmount] = useState("100");
  const [redirectUrl, setRedirectUrl] = useState(DEFAULT_REDIRECT_URL);
  const [errors, setErrors] = useState<{ amount?: string; redirect?: string; apiKey?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateQrData | null>(null);
  const [detailed, setDetailed] = useState<PaymentOrderDetailData | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [checkingOrder, setCheckingOrder] = useState(false);
  const paidNotified = useRef<string | null>(null);

  const [inspectId, setInspectId] = useState("");
  const [inspected, setInspected] = useState<PaymentOrderDetailData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<unknown>(null);

  const expiresAt = created ? new Date(created.expires_at).getTime() : 0;
  const remaining = created ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const status = detailed?.status ?? created?.status;
  const isPaid = status === "PAID";
  const isExpired = status === "EXPIRED" || (Boolean(created) && remaining === 0 && !isPaid);

  useEffect(() => {
    if (!created) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [created]);

  useEffect(() => {
    if (!created || isPaid) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const order = await getPaymentOrder(created.order_id);
        if (cancelled) return;
        setDetailed(order);
        setLastChecked(new Date());
        setPollError(null);

        if (order.status === "PAID") {
          if (paidNotified.current !== order.order_id) {
            paidNotified.current = order.order_id;
            success(`คำสั่งซื้อ ${order.order_id} ชำระเงินสำเร็จ`, {
              title: "Payment matched",
            });
          }
          return;
        }
        if (order.status === "EXPIRED") return;
      } catch (cause) {
        if (cancelled) return;
        setPollError(cause instanceof Error ? cause.message : "ตรวจสอบสถานะไม่สำเร็จ");
      }

      if (cancelled) return;
      if (Date.now() >= expiresAt && attempts >= 2) return;
      timer = window.setTimeout(poll, 3_000);
    };

    timer = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [created, expiresAt, isPaid, success]);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) nextErrors.amount = amountValidation.message;
    const urlValidation = validateHttpsUrl(redirectUrl);
    if (!urlValidation.valid) nextErrors.redirect = urlValidation.message;
    if (!apiKey.trim()) {
      nextErrors.apiKey = "กรุณากรอก API Key สำหรับโหมดทดสอบ";
    } else if (!apiKey.trim().startsWith("apay_live_")) {
      nextErrors.apiKey = "API Key ต้องขึ้นต้นด้วย apay_live_";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setPollError(null);
    setDetailed(null);
    setNow(Date.now());
    paidNotified.current = null;
    try {
      const payload = {
        amount: Number(amount),
        redirect_url: redirectUrl.trim(),
      };

      const result = await createQrWithApiKey(apiKey.trim(), payload);
      setCreated(result.order);
      setInspectId(result.order.order_id);

      success("สร้าง PromptPay QR สำเร็จ — เริ่มติดตามสถานะอัตโนมัติ", {
        title: "QR created",
      });
    } catch (cause) {
      notifyError(cause, "สร้าง QR ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshOrder = async () => {
    if (!created) return;
    setCheckingOrder(true);
    try {
      const order = await getPaymentOrder(created.order_id);
      setDetailed(order);
      setLastChecked(new Date());
      setPollError(null);
    } catch (cause) {
      setPollError(cause instanceof Error ? cause.message : "ตรวจสอบสถานะไม่สำเร็จ");
      notifyError(cause, "ตรวจสอบสถานะไม่สำเร็จ");
    } finally {
      setCheckingOrder(false);
    }
  };

  const runInspect = async (orderId: string) => {
    const trimmed = orderId.trim();
    if (!trimmed) return;
    setInspectLoading(true);
    setInspectError(null);
    setInspected(null);
    try {
      const order = await getPaymentOrder(trimmed);
      setInspected(order);
    } catch (cause) {
      setInspectError(cause);
    } finally {
      setInspectLoading(false);
    }
  };

  const inspect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runInspect(inspectId);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Merchant checkout"
        title="PromptPay Playground"
        description="สร้าง QR ทดสอบที่หน้าตาเหมือนแอปธนาคารจริง ตรวจสอบเศษสตางค์อ้างอิง และติดตามสถานะคำสั่งซื้อแบบเรียลไทม์"
        actions={
          <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 text-[11px] text-ink-secondary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Live polling · ทุก 3 วินาที
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-card bg-brand-soft text-brand-ink">
                  <QrCode className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">สร้าง PromptPay QR</h2>
                  <p className="text-[11px] text-ink-muted">
                    POST /api/v1/payments/qr
                  </p>
                </div>
              </div>
            </div>
          </div>

          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Authentication</p>
              <Badge tone="brand">
                <KeyRound className="size-3" />
                Raw API Key
              </Badge>
            </div>

            <FormField
              label="API Key"
              htmlFor="api-key-input"
              error={errors.apiKey}
            >
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  id="api-key-input"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => {
                    setDraftApiKey(event.target.value);
                    setErrors((current) => ({ ...current, apiKey: undefined }));
                  }}
                  placeholder="apay_live_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pl-10 pr-10 font-mono text-[11px]"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((value) => !value)}
                  aria-label={showApiKey ? "ซ่อน API Key" : "แสดง API Key"}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted"
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>

            <form onSubmit={submit} className="space-y-4">
              <FormField
                label="จำนวนเงินตั้งต้น (THB)"
                htmlFor="amount"
                error={errors.amount}
                hint="ขั้นต่ำ 1.00"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                    ฿
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setErrors((current) => ({ ...current, amount: undefined }));
                    }}
                    className="pl-8 font-mono text-base font-semibold tabular-nums"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-ink-muted">
                  ระบบจะปัดลงเป็นจำนวนเต็ม แล้วจองเศษสตางค์ .01–.99
                  เพื่อใช้จับคู่ยอดโอนโดยอัตโนมัติ
                </p>
              </FormField>

              <FormField
                label="Webhook URL (required by APay API)"
                htmlFor="redirect-url"
                error={errors.redirect}
                hint="หน้านี้ตรวจสถานะด้วย polling"
              >
                <Input
                  id="redirect-url"
                  type="url"
                  value={redirectUrl}
                  onChange={(event) => {
                    setRedirectUrl(event.target.value);
                    setErrors((current) => ({ ...current, redirect: undefined }));
                  }}
                  placeholder="https://merchant.example.com/webhooks/apay"
                  className="font-mono text-[11px]"
                />
              </FormField>

              <div className="rounded-card border border-line bg-surface-subtle p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-secondary">ยอดที่จะต้องโอนจริง</span>
                  <span className="font-mono text-sm font-bold tabular-nums text-ink">
                    {amount && Number(amount) >= 1
                      ? `${formatCurrency(Math.floor(Number(amount)))} + .01–.99`
                      : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                  ตัวอย่างเช่น ฿100.00 → ระบบอาจสร้างยอด ฿100.37
                  เพื่อไม่ให้ซ้ำกับออเดอร์อื่นในวันเดียวกัน
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full"
                icon={<QrCode className="size-4" />}
              >
                สร้าง PromptPay QR
              </Button>
            </form>

            <p className="flex items-start gap-2 text-[11px] leading-4 text-ink-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
              QR มีอายุ 5 นาที และจะถูกจับคู่กับการแจ้งเตือนเงินเข้าจากโทรศัพท์มือถือของผู้ใช้
              ที่ยอดตรงกันแบบทศนิยม 2 ตำแหน่ง
            </p>
          </CardBody>
        </Card>

        <CheckoutPanel
          created={created}
          detailed={detailed}
          status={status}
          remaining={remaining}
          isPaid={isPaid}
          isExpired={isExpired}
          payeeName={activeBusiness?.name}
          lastChecked={lastChecked}
          pollError={pollError}
          checkingOrder={checkingOrder}
          onRefresh={refreshOrder}
          onReset={() => {
            setCreated(null);
            setDetailed(null);
            setPollError(null);
            setLastChecked(null);
          }}
        />
      </div>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Search className="size-4 text-ink-muted" />
            Order Inspector
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            ค้นหาด้วย order_id เช่น YYYYMMDDHHmmss_100.01
          </p>
        </div>
        <CardBody className="space-y-4">
          <form onSubmit={inspect} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <Input
                value={inspectId}
                onChange={(event) => setInspectId(event.target.value)}
                placeholder="20261020153045_100.01"
                className="pl-10 font-mono text-[11px]"
              />
            </div>
            <Button
              type="submit"
              loading={inspectLoading}
              disabled={!inspectId.trim()}
              icon={<Search className="size-4" />}
            >
              ตรวจสอบ
            </Button>
          </form>

          {inspectLoading ? (
            <Skeleton className="h-40 w-full rounded-card" />
          ) : inspectError ? (
            <ErrorNotice
              message={inspectError instanceof Error ? inspectError.message : "ไม่พบคำสั่งซื้อ"}
              correlationId={inspectError instanceof ApiError ? inspectError.correlationId : null}
              onRetry={() => void runInspect(inspectId)}
            />
          ) : inspected ? (
            <OrderDetail inspected={inspected} />
          ) : (
            <EmptyState
              icon={Search}
              title="ยังไม่ได้เลือกคำสั่งซื้อ"
              description="สร้าง QR ใหม่หรือกรอก order_id เพื่อดูสถานะการชำระและรายละเอียดคำสั่งซื้อ"
              compact
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function CheckoutPanel({
  created,
  detailed,
  status,
  remaining,
  isPaid,
  isExpired,
  payeeName,
  lastChecked,
  pollError,
  checkingOrder,
  onRefresh,
  onReset,
}: {
  created: CreateQrData | null;
  detailed: PaymentOrderDetailData | null;
  status: string | undefined;
  remaining: number;
  isPaid: boolean;
  isExpired: boolean;
  payeeName?: string | null;
  lastChecked: Date | null;
  pollError: string | null;
  checkingOrder: boolean;
  onRefresh: () => void;
  onReset: () => void;
}) {
  if (!created) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center overflow-hidden border-dashed sm:min-h-[600px]">
        <div className="max-w-sm px-6 py-12 text-center">
          <div className="mx-auto w-[212px] rounded-panel border border-line bg-surface p-3 shadow-card">
            <div className="flex items-center justify-between rounded-control bg-promptpay px-2.5 py-1.5 text-white">
              <span className="text-[10px] font-bold tracking-tight">PromptPay</span>
              <QrCode className="size-3" />
            </div>
            <div className="mt-3 flex aspect-square items-center justify-center rounded-control border border-dashed border-line-strong bg-surface-subtle">
              <QrCode className="size-9 text-line-strong" />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="mx-auto h-2 w-20 rounded-full bg-surface-muted" />
              <div className="mx-auto h-1.5 w-14 rounded-full bg-surface-muted" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] text-ink-muted">
            {["QR Base64", "5-min expiry", "Live status"].map((item) => (
              <div key={item} className="rounded-control border border-line bg-surface-subtle px-2 py-2">
                {item}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">ตัวอย่างหน้าจอชำระเงิน</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Button variant="ghost" size="sm" onClick={onReset}>
            สร้างใหม่
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#edf3fc] via-surface-subtle to-surface-muted px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-center gap-4">
          <div className="w-full min-w-[260px] max-w-[400px] flex-1">
            <PromptPaySlip
              order={created}
              payeeName={payeeName}
              remaining={remaining}
              isPaid={isPaid}
              isExpired={isExpired}
            />
          </div>

          <aside className="w-full space-y-3 sm:w-[264px] sm:flex-none">
            <div className="rounded-card border border-line bg-surface p-3.5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Order metadata
                </p>
                <Badge tone="neutral">API</Badge>
              </div>
              <dl className="mt-3 space-y-3 text-[11px]">
                <div>
                  <dt className="text-ink-muted">order_id</dt>
                  <dd className="mt-1 flex items-start gap-1">
                    <span className="min-w-0 break-all font-mono leading-4 text-ink">
                      {created.order_id}
                    </span>
                    <CopyButton
                      value={created.order_id}
                      iconOnly
                      label="คัดลอก order id"
                      className="shrink-0"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">lookup_key</dt>
                  <dd className="mt-1 flex items-start gap-1">
                    <span className="min-w-0 break-all font-mono leading-4 text-ink">
                      {created.lookup_key}
                    </span>
                    <CopyButton
                      value={created.lookup_key}
                      iconOnly
                      label="คัดลอก lookup key"
                      className="shrink-0"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">หมดอายุ</dt>
                  <dd className="mt-1 font-mono leading-4 text-ink">
                    {formatDateTime(created.expires_at)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-card border border-line bg-surface p-3 shadow-card">
              <div className="flex items-center gap-1.5">
                <Loader2
                  className={cn(
                    "size-3 shrink-0 text-brand",
                    status === "UNVERIFIED" && !isExpired ? "animate-spin" : "hidden",
                  )}
                />
                <p className="text-[11px] font-semibold text-ink-secondary">
                  {status === "PAID"
                    ? "ยืนยันการชำระแล้ว"
                    : isExpired
                      ? "หยุดติดตามสถานะ"
                      : "กำลังติดตามสถานะทุก 3 วินาที"}
                </p>
              </div>
              {lastChecked ? (
                <p className="mt-1 font-mono text-[10px] text-ink-muted">
                  last checked {formatTime(lastChecked.toISOString())}
                </p>
              ) : null}
              {pollError ? <p className="mt-1 text-[11px] text-danger-ink">{pollError}</p> : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                loading={checkingOrder}
                icon={<RefreshCw className="size-3" />}
                className="mt-2 h-7 w-full justify-start px-2 text-[11px]"
              >
                ตรวจสอบสถานะตอนนี้
              </Button>
            </div>

            {detailed ? (
              <OrderTimeline detail={detailed} />
            ) : (
              <p className="rounded-card border border-dashed border-line p-3 text-center text-[11px] leading-4 text-ink-muted">
                สถานะจะอัปเดตอัตโนมัติทุก 3 วินาที
              </p>
            )}
          </aside>
        </div>
      </div>
    </Card>
  );
}

function OrderTimeline({ detail }: { detail: PaymentOrderDetailData }) {
  return (
    <div className="rounded-card border border-line bg-surface-subtle p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-ink-secondary">
          <span
            className={cn(
              "size-1.5 rounded-full",
              detail.status === "PAID" ? "bg-success" : "bg-warning",
            )}
          />
          {detail.status}
        </span>
        <span className="font-mono text-ink-secondary">
          {detail.paid_at ? formatDateTime(detail.paid_at) : "ยังไม่ชำระ"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-ink-secondary">
          <Clock3 className="size-3" />
          ตรวจสอบสถานะล่าสุด
        </span>
        <span className="font-mono text-ink-secondary">polling</span>
      </div>
    </div>
  );
}

function OrderDetail({ inspected }: { inspected: PaymentOrderDetailData }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-card border border-line bg-surface-subtle p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">Order status</p>
          <StatusBadge status={inspected.status} />
        </div>
        <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-ink">
          {formatCurrency(inspected.total_amount)}
        </p>
        <p className="mt-1 font-mono text-[11px] text-ink-secondary">
          {formatCurrency(inspected.base_amount)} + {inspected.decimal_ref.toFixed(2)}
        </p>
        <dl className="mt-4 space-y-2 text-[11px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">order_id</dt>
            <dd className="max-w-[65%] truncate font-mono text-ink-secondary">{inspected.order_id}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">lookup_key</dt>
            <dd className="font-mono text-ink-secondary">{inspected.lookup_key}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">created_at</dt>
            <dd className="font-mono text-ink-secondary">{formatDateTime(inspected.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">paid_at</dt>
            <dd className="font-mono text-ink-secondary">
              {inspected.paid_at ? formatDateTime(inspected.paid_at) : "—"}
            </dd>
          </div>
        </dl>
      </div>
      <div className="rounded-card border border-line p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Clock3 className="size-3.5 text-brand" />
          Payment details
        </p>
        <div className="mt-3 space-y-2.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">status</span>
            <StatusBadge status={inspected.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">expires_at</span>
            <span className="font-mono text-ink-secondary">{formatDateTime(inspected.expires_at)}</span>
          </div>
          <div>
            <span className="text-ink-muted">business_id</span>
            <p className="mt-1 break-all rounded-control bg-surface-subtle p-2 font-mono text-[11px] leading-4 text-ink-secondary">
              {inspected.business_id}
            </p>
          </div>
        </div>
        {inspected.status === "PAID" ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-control border border-success-border bg-success-soft px-2.5 py-2 text-[11px] font-medium text-success-ink">
            <CheckCircle2 className="size-3.5" />
            ยืนยันการชำระเงินจากการ polling สถานะแล้ว
          </div>
        ) : null}
      </div>
    </div>
  );
}
