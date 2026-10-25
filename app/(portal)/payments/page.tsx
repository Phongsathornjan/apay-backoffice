"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import type { CreateQrData, LinkLineQrData, PaymentOrderDetailData } from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createLineLinkQrWithApiKey,
  createQr,
  createQrWithApiKey,
  getPaymentOrder,
  isAlreadyLinkedError,
  isLineNotLinkedError,
} from "@/services/payments";
import { ApiError } from "@/services/api";
import {
  formatCountdown,
  formatCurrency,
  formatDateTime,
  formatTime,
  maskLineUserId,
} from "@/lib/format";
import { validateAmount, validateHttpsUrl } from "@/lib/validators";
import { LineLinkModal } from "@/components/payments/line-link-modal";
import { BankSupportChips } from "@/components/payments/bank-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorNotice, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TokenMode = "session" | "api_key";

const DEFAULT_REDIRECT_URL = "https://merchant.example.com/webhooks/apay";

export default function PaymentsPage() {
  const { role, lineUserId, isLineLinked, setLineUserId } = useAuth();
  const { notifyError, success, info } = useToast();
  const isAdmin = role === "admin";

  const [tokenMode, setTokenMode] = useState<TokenMode>(isAdmin ? "api_key" : "session");
  const [apiKey, setApiKey] = useState("");
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

  // LINE linking (business session mode + admin Raw API Key mode).
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [adminLink, setAdminLink] = useState<{
    order: LinkLineQrData;
    accessToken: string;
  } | null>(null);
  const [adminLinkStarting, setAdminLinkStarting] = useState(false);
  const [showAdminLinkCta, setShowAdminLinkCta] = useState(false);

  const [inspectId, setInspectId] = useState("");
  const [inspected, setInspected] = useState<PaymentOrderDetailData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<unknown>(null);

  // Only the business' own JWT is gated: a raw API key may belong to another shop.
  const lineGateActive = role === "business" && tokenMode === "session" && !isLineLinked;

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
    if (tokenMode === "api_key") {
      if (!apiKey.trim()) {
        nextErrors.apiKey = "กรุณากรอก API Key สำหรับโหมดทดสอบ";
      } else if (!apiKey.trim().startsWith("apay_live_")) {
        nextErrors.apiKey = "API Key ต้องขึ้นต้นด้วย apay_live_";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lineGateActive) {
      setLinkModalOpen(true);
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    setPollError(null);
    setDetailed(null);
    setNow(Date.now());
    paidNotified.current = null;
    setShowAdminLinkCta(false);
    try {
      const payload = {
        amount: Number(amount),
        redirect_url: redirectUrl.trim(),
      };

      if (tokenMode === "api_key") {
        const result = await createQrWithApiKey(apiKey.trim(), payload);
        setCreated(result.order);
        setInspectId(result.order.order_id);
        setApiKey("");
      } else {
        const order = await createQr(payload);
        setCreated(order);
        setInspectId(order.order_id);
      }

      success("สร้าง PromptPay QR สำเร็จ — เริ่มติดตามสถานะอัตโนมัติ", {
        title: "QR created",
      });
    } catch (cause) {
      if (isLineNotLinkedError(cause)) {
        if (role === "business" && tokenMode === "session") {
          setLinkModalOpen(true);
          info("ต้องผูก LINE ก่อนสร้าง QR รับเงิน", { title: "LINE ยังไม่ผูก" });
        } else {
          setShowAdminLinkCta(true);
          info(
            "ร้านค้านี้ยังไม่ได้ผูก LINE — สร้าง QR ยืนยันเพื่อผูก LINE ให้ร้านค้าก่อน",
            { title: "LINE ยังไม่ผูก" },
          );
        }
      } else if (isAlreadyLinkedError(cause)) {
        setShowAdminLinkCta(false);
        info("ร้านค้านี้ผูก LINE ไว้แล้ว — กรุณาสร้าง QR อีกครั้ง", {
          title: "ผูก LINE แล้ว",
        });
      } else {
        notifyError(cause, "สร้าง QR ไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Admin Raw API Key mode: create the 0.01–0.99 linking QR for the merchant. */
  const startAdminLink = async () => {
    if (!apiKey.trim()) {
      setErrors((current) => ({ ...current, apiKey: "กรุณากรอก API Key ก่อนสร้าง QR ผูก LINE" }));
      return;
    }
    setAdminLinkStarting(true);
    try {
      const result = await createLineLinkQrWithApiKey(apiKey.trim());
      setAdminLink(result);
      setShowAdminLinkCta(false);
      setLinkModalOpen(true);
    } catch (cause) {
      if (isAlreadyLinkedError(cause)) {
        setShowAdminLinkCta(false);
        info("ร้านค้านี้ผูก LINE ไว้แล้ว — กรุณาสร้าง QR อีกครั้ง", {
          title: "ผูก LINE แล้ว",
        });
      } else {
        notifyError(cause, "สร้าง QR ผูก LINE ไม่สำเร็จ");
      }
    } finally {
      setAdminLinkStarting(false);
    }
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setAdminLink(null);
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
        eyebrow="PromptPay playground"
        title="Payment Inspector"
        description="สร้าง QR ทดสอบ ตรวจสอบเศษสตางค์อ้างอิง และติดตามสถานะคำสั่งซื้อแบบเรียลไทม์"
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

      {role === "business" && !isLineLinked ? (
        <Card className="border-warning-border bg-warning-soft">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-surface text-warning-ink shadow-card">
                <Link2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warning-ink">
                  ยังไม่ได้ผูก LINE — ต้องผูก LINE ก่อนสร้าง QR รับเงิน
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-warning-ink">
                  สแกนจ่าย QR ยืนยันยอด 0.01–0.99 ด้วยบัญชีธนาคารที่ผูก LINE ไว้กับ APay
                  ระบบจะเชื่อม LINE ของคุณกับร้านค้าอัตโนมัติ
                </p>
                <BankSupportChips className="mt-1.5" />
              </div>
            </div>
            <Button
              onClick={() => setLinkModalOpen(true)}
              icon={<Link2 className="size-4" />}
            >
              ผูก LINE
            </Button>
          </CardBody>
        </Card>
      ) : null}

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
              {role === "business" && isLineLinked ? (
                <Badge tone="success" dot>
                  LINE linked · {maskLineUserId(lineUserId)}
                </Badge>
              ) : null}
            </div>
          </div>

          <CardBody className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">โหมด Authentication</p>
              <SegmentedControl
                value={tokenMode}
                onChange={setTokenMode}
                options={
                  isAdmin
                    ? [{ value: "api_key", label: "Raw API Key" }]
                    : [
                        { value: "session", label: "ใช้ JWT ปัจจุบัน" },
                        { value: "api_key", label: "Raw API Key" },
                      ]
                }
                className="w-full"
              />
              {isAdmin ? (
                <p className="mt-2 rounded-control border border-brand-border bg-brand-soft px-2.5 py-2 text-[11px] leading-4 text-brand-ink">
                  Admin ต้องใช้ Raw API Key เพื่อทดสอบในนามของร้านค้า
                  เนื่องจาก JWT ของ Admin ไม่ผูกกับธุรกิจ
                </p>
              ) : null}
            </div>

            {tokenMode === "api_key" ? (
              <FormField
                label="API Key"
                htmlFor="api-key-input"
                error={errors.apiKey}
                hint="ไม่ถูกบันทึกหรือส่งออกนอกเบราว์เซอร์"
              >
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    id="api-key-input"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => {
                      setApiKey(event.target.value);
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
            ) : (
              <div className="rounded-card border border-info-border bg-info-soft px-3.5 py-3 text-[11px] leading-5 text-info-ink">
                ระบบจะใช้ JWT ของบัญชีที่ล็อกอินอยู่
                และคำสั่งซื้อจะไม่ผูกกับ API Key ใด (api_key_id = null)
              </div>
            )}

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
                disabled={lineGateActive}
                className="w-full"
                icon={<QrCode className="size-4" />}
              >
                สร้าง PromptPay QR
              </Button>

              {lineGateActive ? (
                <p className="flex items-start gap-2 rounded-card border border-warning-border bg-warning-soft px-3 py-2.5 text-[11px] leading-4 text-warning-ink">
                  <Link2 className="mt-0.5 size-3.5 shrink-0" />
                  ยังไม่ได้ผูก LINE — ต้องผูก LINE ก่อนจึงจะสร้าง QR รับเงินได้
                  (กดปุ่ม &quot;ผูก LINE&quot; ด้านบน)
                </p>
              ) : null}
            </form>

            {showAdminLinkCta ? (
              <div className="rounded-card border border-warning-border bg-warning-soft p-3.5">
                <p className="text-[11px] font-semibold text-warning-ink">
                  ร้านค้านี้ยังไม่ได้ผูก LINE
                </p>
                <p className="mt-1 text-[11px] leading-4 text-warning-ink">
                  สร้าง QR ยืนยันยอด 0.01–0.99 ให้ร้านค้าสแกนจ่ายด้วยบัญชีที่ผูก LINE ไว้กับ APay
                  ระบบจะผูก LINE ให้อัตโนมัติ จากนั้นจึงสร้าง QR รับเงินได้
                </p>
                <BankSupportChips className="mt-1.5" />
                <Button
                  size="sm"
                  className="mt-2.5"
                  onClick={() => void startAdminLink()}
                  loading={adminLinkStarting}
                  icon={<Link2 className="size-3.5" />}
                >
                  สร้าง QR ผูก LINE ให้ร้านค้านี้
                </Button>
              </div>
            ) : null}
            <p className="flex items-start gap-2 text-[11px] leading-4 text-ink-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
              QR มีอายุ 5 นาที และจะถูกจับคู่กับข้อความ KBank LINE
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

      {linkModalOpen ? (
        <LineLinkModal
          key={adminLink?.order.order_id ?? "session"}
          open
          accessToken={adminLink?.accessToken}
          initialOrder={adminLink?.order ?? null}
          onClose={closeLinkModal}
          onLinked={(linkedLineUserId) => {
            if (adminLink) {
              // Raw API Key mode: the session belongs to someone else, nothing to sync.
              info("ผูก LINE ให้ร้านค้าสำเร็จ — กรุณากดสร้าง QR อีกครั้ง", {
                title: "LINE linked",
              });
              return;
            }
            if (linkedLineUserId) {
              setLineUserId(linkedLineUserId);
              success("ผูก LINE สำเร็จ — คุณสามารถสร้าง QR รับเงินได้แล้ว", {
                title: "LINE linked",
              });
            } else {
              info("ผูก LINE สำเร็จ แต่ยังไม่ได้รับ LINE User ID — กรุณาเข้าสู่ระบบใหม่", {
                title: "LINE linked",
              });
            }
          }}
          onAlreadyLinked={() => {
            setShowAdminLinkCta(false);
            info(
              "ร้านค้านี้ผูก LINE ไว้แล้ว — หากสถานะยังไม่ตรง กรุณาเข้าสู่ระบบใหม่หรือรีเฟรชหน้า",
              { title: "ผูก LINE แล้ว" },
            );
          }}
        />
      ) : null}
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
  lastChecked: Date | null;
  pollError: string | null;
  checkingOrder: boolean;
  onRefresh: () => void;
  onReset: () => void;
}) {
  if (!created) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center border-dashed sm:min-h-[580px]">
        <div className="max-w-sm px-6 py-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-panel border border-brand-border bg-brand-soft text-brand-ink">
            <QrCode className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ink">Checkout preview</h2>
          <p className="mt-1.5 text-xs leading-6 text-ink-secondary">
            ผลลัพธ์ QR, ยอดโอนสุทธิ, Decimal Reference และสถานะการชำระ
            จะแสดงที่นี่แบบหน้า Checkout จริง
          </p>
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
          <h2 className="text-sm font-semibold text-ink">Checkout preview</h2>
          <p className="font-mono text-[11px] text-ink-muted">{created.order_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Button variant="ghost" size="sm" onClick={onReset}>
            สร้างใหม่
          </Button>
        </div>
      </div>

      <div className="relative">
        {isPaid ? (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-success px-4 py-2 text-xs font-semibold text-white animate-success-pop">
            <CheckCircle2 className="size-4" />
            ชำระเงินสำเร็จแล้ว
          </div>
        ) : null}
        {isExpired && !isPaid ? (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-ink/80 px-4 py-2 text-xs font-semibold text-white">
            <TimerReset className="size-4" />
            QR หมดอายุแล้ว
          </div>
        ) : null}

        <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-line bg-gradient-to-b from-surface-subtle to-surface p-5 sm:border-b-0 sm:border-r">
            <div
              className={cn(
                "rounded-panel border-4 p-2 transition-all",
                isPaid
                  ? "border-success bg-surface shadow-[0_0_0_8px_var(--apay-success-soft)]"
                  : isExpired
                    ? "border-line-strong bg-surface opacity-60 grayscale"
                    : "border-ink bg-surface",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={created.qr_image}
                alt={`PromptPay QR for order ${created.order_id}`}
                className="size-40 rounded-control object-contain"
              />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              PromptPay · Thai QR
            </p>
            <div className="mt-2 flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
              <Clock3 className="size-3 text-warning" />
              {isPaid ? "ชำระแล้ว" : isExpired ? "หมดอายุ" : `เหลือ ${formatCountdown(remaining)}`}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                ยอดโอนสุทธิ
              </p>
              <Badge tone="warning">ต้องโอนให้ตรงทศนิยม</Badge>
            </div>
            <p className="mt-1 font-mono text-[38px] font-bold leading-none tracking-tight tabular-nums text-ink">
              {formatCurrency(created.total_amount)}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-secondary">
              <span>
                base <span className="font-semibold text-ink">{formatCurrency(created.base_amount)}</span>
              </span>
              <span>
                decimal_ref{" "}
                <span className="font-semibold text-warning-ink">
                  +{created.decimal_ref.toFixed(2)}
                </span>
              </span>
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-muted">order_id</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-mono text-[11px] text-ink-secondary">
                    {created.order_id}
                  </span>
                  <CopyButton value={created.order_id} iconOnly label="คัดลอก order id" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-muted">lookup_key</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-mono text-[11px] text-ink-secondary">
                    {created.lookup_key}
                  </span>
                  <CopyButton value={created.lookup_key} iconOnly label="คัดลอก lookup key" />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-muted">หมดอายุ</span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  {formatDateTime(created.expires_at)} · {formatTime(created.expires_at)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-card border border-line bg-surface-subtle p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                  <Loader2
                    className={cn(
                      "size-3 text-brand",
                      status === "UNVERIFIED" && !isExpired ? "animate-spin" : "hidden",
                    )}
                  />
                  {status === "PAID"
                    ? "ยืนยันการชำระแล้ว"
                    : isExpired
                      ? "หยุดติดตามสถานะ"
                      : "กำลังติดตามสถานะทุก 3 วินาที"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  loading={checkingOrder}
                  icon={<RefreshCw className="size-3" />}
                  className="h-7 px-2 text-[11px]"
                >
                  ตรวจตอนนี้
                </Button>
              </div>
              {lastChecked ? (
                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                  last checked {formatTime(lastChecked.toISOString())}
                </p>
              ) : null}
              {pollError ? (
                <p className="mt-1 text-[11px] text-danger-ink">{pollError}</p>
              ) : null}
            </div>

            {detailed ? (
              <OrderTimeline detail={detailed} />
            ) : (
              <p className="mt-3 text-center text-[11px] leading-4 text-ink-muted">
                สถานะจะอัปเดตอัตโนมัติจากการ polling ทุก 3 วินาที
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OrderTimeline({ detail }: { detail: PaymentOrderDetailData }) {
  return (
    <div className="mt-4 space-y-2 border-t border-line pt-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-ink-secondary">
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
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-ink-secondary">
          <Clock3 className="size-3" />
          ตรวจสอบสถานะล่าสุด
        </span>
        <span className="font-mono text-ink-secondary">polling</span>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-ink-secondary">
          <Link2 className="size-3" />
          LINE User ID
        </span>
        <span className="font-mono text-[11px] text-ink-secondary">
          {maskLineUserId(detail.line_user_id)}
        </span>
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
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">is_line_link</span>
            <Badge tone={inspected.is_line_link ? "brand" : "neutral"}>
              {inspected.is_line_link ? "true" : "false"}
            </Badge>
          </div>
          <div>
            <span className="text-ink-muted">line_user_id</span>
            <p className="mt-1 break-all rounded-control bg-surface-subtle p-2 font-mono text-[11px] leading-4 text-ink-secondary">
              {maskLineUserId(inspected.line_user_id)}
            </p>
          </div>
          <div>
            <span className="text-ink-muted">business_id</span>
            <p className="mt-1 break-all rounded-control bg-surface-subtle p-2 font-mono text-[11px] leading-4 text-ink-secondary">
              {inspected.business_id}
            </p>
          </div>
        </div>
        {inspected.is_line_link ? (
          <div className="mt-3 flex items-start gap-1.5 rounded-control border border-brand-border bg-brand-soft px-2.5 py-2 text-[11px] leading-4 text-brand-ink">
            <Link2 className="mt-0.5 size-3.5 shrink-0" />
            คำสั่งซื้อนี้ใช้ผูก LINE (ยอด 0.01–0.99) — ไม่ตัดโควต้า
            และตรวจพบผลด้วย polling สถานะทุก 3 วินาที
          </div>
        ) : inspected.status === "PAID" ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-control border border-success-border bg-success-soft px-2.5 py-2 text-[11px] font-medium text-success-ink">
            <CheckCircle2 className="size-3.5" />
            ยืนยันการชำระเงินจากการ polling สถานะแล้ว
          </div>
        ) : null}
      </div>
    </div>
  );
}
