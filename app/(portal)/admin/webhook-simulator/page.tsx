"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Braces,
  CheckCircle2,
  FileJson,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import type { LineWebhookRequest, PaymentOrderDetailData } from "@/types/api";
import { getPaymentOrder } from "@/services/payments";
import { simulateLineWebhook } from "@/services/webhooks";
import type { ApiResult } from "@/services/api";
import { ApiError } from "@/services/api";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorNotice, useToast } from "@/components/ui/toast";

function bangkokMessageDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = Number(get("year"));
  const buddhistYear = String(year + 543).slice(-2);
  return {
    date: `${get("day")}/${get("month")}/${buddhistYear}`,
    time: `${get("hour")}:${get("minute")}`,
    timestamp: date.getTime(),
  };
}

function buildMessage(amount: number, date = new Date()): string {
  const parts = bangkokMessageDate(date);
  return `รายการเงินเข้า บัญชี xxx-x-x1234-x จำนวน ${amount.toFixed(
    2,
  )} บาท วันที่ ${parts.date} เวลา ${parts.time} น.`;
}

function buildWebhookPayload(
  amount: number,
  destination: string,
  sourceUserId: string,
  messageId?: string,
): LineWebhookRequest {
  const now = new Date();
  const parts = bangkokMessageDate(now);
  return {
    ...(destination.trim() ? { destination: destination.trim() } : {}),
    events: [
      {
        type: "message",
        timestamp: parts.timestamp,
        source: {
          type: "user",
          ...(sourceUserId.trim() ? { userId: sourceUserId.trim() } : {}),
        },
        message: {
          type: "text",
          id: messageId ?? `${parts.timestamp}${Math.floor(Math.random() * 1000)}`,
          text: buildMessage(amount, now),
        },
      },
    ],
  };
}

const INITIAL_PAYLOAD: LineWebhookRequest = {
  destination: "U1234567890abcdef1234567890abcdef",
  events: [
    {
      type: "message",
      timestamp: 1792485072000,
      source: {
        type: "user",
        userId: "Uabcdef1234567890abcdef1234567890",
      },
      message: {
        type: "text",
        id: "529384756102938475",
        text: "รายการเงินเข้า บัญชี xxx-x-x1234-x จำนวน 100.01 บาท วันที่ 20/10/69 เวลา 15:31 น.",
      },
    },
  ],
};

interface SimulationResult {
  response: ApiResult<{ processed: number }>;
  at: Date;
  raw: unknown;
}

export default function WebhookSimulatorPage() {
  const { notifyError, success } = useToast();
  const [amount, setAmount] = useState("100.01");
  const [destination, setDestination] = useState("U1234567890abcdef1234567890abcdef");
  const [sourceUserId, setSourceUserId] = useState("Uabcdef1234567890abcdef1234567890");
  const [signature, setSignature] = useState("");
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(INITIAL_PAYLOAD, null, 2));
  const [messageId, setMessageId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [orderId, setOrderId] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [loadedOrder, setLoadedOrder] = useState<PaymentOrderDetailData | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      const payload = JSON.parse(payloadText) as LineWebhookRequest;
      return {
        payload,
        error: null as string | null,
        message: payload.events?.[0]?.message?.text ?? "",
        eventCount: payload.events?.length ?? 0,
      };
    } catch (cause) {
      return {
        payload: null,
        error: cause instanceof Error ? cause.message : "JSON ไม่ถูกต้อง",
        message: "",
        eventCount: 0,
      };
    }
  }, [payloadText]);

  const generate = (amountOverride?: number) => {
    const numeric = amountOverride ?? Number(amount);
    if (!Number.isFinite(numeric) || numeric < 1) {
      setError(new Error("จำนวนเงินต้องมีค่าอย่างน้อย 1.00 บาท"));
      return;
    }
    setError(null);
    const nextId = messageId.trim() || undefined;
    const payload = buildWebhookPayload(numeric, destination, sourceUserId, nextId);
    setPayloadText(JSON.stringify(payload, null, 2));
    if (amountOverride !== undefined) setAmount(amountOverride.toFixed(2));
  };

  const loadFromOrder = async () => {
    const id = orderId.trim();
    if (!id) return;
    setOrderLoading(true);
    setOrderError(null);
    setLoadedOrder(null);
    try {
      const order = await getPaymentOrder(id);
      setLoadedOrder(order);
      setAmount(order.total_amount.toFixed(2));
      generate(order.total_amount);
      success(`โหลดยอด ${formatCurrency(order.total_amount)} จาก order สำเร็จ`);
    } catch (cause) {
      setOrderError(cause instanceof Error ? cause.message : "ไม่พบคำสั่งซื้อ");
    } finally {
      setOrderLoading(false);
    }
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let payload: LineWebhookRequest;
    try {
      payload = JSON.parse(payloadText) as LineWebhookRequest;
    } catch (cause) {
      setError(cause);
      return;
    }

    if (!payload.events || !Array.isArray(payload.events) || payload.events.length === 0) {
      setError(new Error("Payload ต้องมี events อย่างน้อย 1 รายการ"));
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);
    try {
      const response = await simulateLineWebhook(payload, signature);
      setResult({
        response,
        at: new Date(),
        raw: {
          ok: true,
          status: response.status,
          correlation_id: response.correlationId,
          data: response.data,
        },
      });
      if (response.data.processed > 0) {
        success(
          `ประมวลผล ${formatNumber(response.data.processed)} event — ตรวจสอบว่า order เปลี่ยนเป็น PAID หรือไม่`,
          { title: "Webhook processed" },
        );
      } else {
        success(
          "ไม่พบ event ใหม่ (อาจเป็นข้อความซ้ำ หรือยอดไม่ตรงกับ order ที่ยังไม่หมดอายุ)",
          { title: "Processed 0 events" },
        );
      }
    } catch (cause) {
      setError(cause);
      notifyError(cause, "ส่ง Webhook ไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Developer utility"
        title="KBank LINE Webhook Simulator"
        description="ทดสอบ payload แจ้งเงินเข้าจาก LINE OA และตรวจสอบ flow การจับคู่ยอด → PAID → Callback"
        actions={
          <Badge tone="indigo" className="gap-1.5">
            <Webhook className="size-3" />
            POST /api/v1/webhooks/kbank/line
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageSquareText className="size-4 text-emerald-600" />
                  Message Generator
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  สร้างข้อความ KBank จากยอดโอนหรือดึงจากคำสั่งซื้อจริง
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generate()}
                icon={<Braces className="size-3.5" />}
              >
                สร้างข้อความตัวอย่าง
              </Button>
            </div>
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Total Amount (THB)" htmlFor="sim-amount" hint="ใช้ทศนิยม 2 ตำแหน่ง">
                  <Input
                    id="sim-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="font-mono font-semibold tabular-nums"
                  />
                </FormField>
                <FormField label="LINE Destination" htmlFor="sim-destination" optional>
                  <Input
                    id="sim-destination"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    className="font-mono text-[11px]"
                    placeholder="U1234567890abcdef..."
                  />
                </FormField>
                <FormField label="Source User ID" htmlFor="sim-source" optional>
                  <Input
                    id="sim-source"
                    value={sourceUserId}
                    onChange={(event) => setSourceUserId(event.target.value)}
                    className="font-mono text-[11px]"
                  />
                </FormField>
                <FormField
                  label="LINE Message ID"
                  htmlFor="sim-message-id"
                  optional
                  hint="ใช้ทดสอบ Idempotency"
                >
                  <Input
                    id="sim-message-id"
                    value={messageId}
                    onChange={(event) => setMessageId(event.target.value)}
                    className="font-mono text-[11px]"
                    placeholder="เว้นว่างเพื่อสร้างใหม่"
                  />
                </FormField>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center gap-2">
                  <Search className="size-3.5 text-slate-400" />
                  <p className="text-[11px] font-semibold text-slate-700">ดึงยอดจาก Order</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={orderId}
                    onChange={(event) => setOrderId(event.target.value)}
                    placeholder="20261020153045_100.01"
                    className="h-9 flex-1 font-mono text-[10px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9"
                    loading={orderLoading}
                    onClick={loadFromOrder}
                    disabled={!orderId.trim()}
                  >
                    Load
                  </Button>
                </div>
                {orderError ? (
                  <p className="mt-1.5 text-[10px] text-rose-600">{orderError}</p>
                ) : loadedOrder ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <StatusBadge status={loadedOrder.status} />
                    <span className="font-mono font-semibold text-slate-700">
                      {formatCurrency(loadedOrder.total_amount)}
                    </span>
                    <span>· {formatDateTime(loadedOrder.created_at)}</span>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[9px] text-slate-400">
                    คำสั่งซื้อต้องมีอยู่ในระบบ — ระบบจะใช้ยอด total_amount รวม decimal_ref
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileJson className="size-4 text-indigo-500" />
                  Raw Payload
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  แก้ไข JSON ได้โดยตรงก่อนส่ง
                </p>
              </div>
              <div className="flex items-center gap-2">
                {parsed.error ? (
                  <Badge tone="rose">Invalid JSON</Badge>
                ) : (
                  <Badge tone="emerald" dot>
                    {parsed.eventCount} event{parsed.eventCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
            </div>
            <CardBody className="space-y-4">
              <Textarea
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                rows={16}
                spellCheck={false}
                className="min-h-[330px] resize-y bg-slate-950 font-mono text-[11px] leading-6 text-emerald-200 focus:border-indigo-400 focus:ring-indigo-500/20"
              />
              {parsed.error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700">
                  JSON Error: {parsed.error}
                </p>
              ) : null}

              <FormField
                label="x-line-signature"
                htmlFor="sim-signature"
                optional
                hint="บังคับเมื่อ VERIFY_LINE_SIGNATURE=true"
              >
                <Input
                  id="sim-signature"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  className="font-mono text-[11px]"
                  placeholder="Base64 HMAC-SHA256 signature"
                />
              </FormField>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                <p className="text-[10px] leading-5 text-amber-800">
                  หาก Backend เปิดตรวจ signature ระบบจะปฏิเสธ payload ที่ไม่มี HMAC
                  ที่ถูกต้องด้วย 401 พร้อม correlation_id
                  สำหรับการทดสอบควรปิดการตรวจหรือใช้ signature ที่คำนวณจาก channel secret
                </p>
              </div>

              <form onSubmit={send}>
                <Button
                  type="submit"
                  size="lg"
                  loading={sending}
                  disabled={Boolean(parsed.error) || parsed.eventCount === 0}
                  icon={<Send className="size-4" />}
                  className="w-full"
                >
                  ส่ง Webhook เข้า APay
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-[#06c755] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">KBank Live</p>
                  <p className="text-[9px] text-emerald-950/60">LINE Official Account</p>
                </div>
                <MessageSquareText className="size-5 text-white/90" />
              </div>
            </div>
            <div className="min-h-[210px] bg-[#8cabd9] p-4">
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm">
                <p className="whitespace-pre-wrap break-words text-[12px] leading-6 text-slate-800">
                  {parsed.message || "— ยังไม่มีข้อความใน payload —"}
                </p>
                <p className="mt-1.5 text-right text-[8px] text-slate-400">
                  {parsed.payload?.events?.[0]?.timestamp
                    ? formatTime(new Date(parsed.payload.events[0].timestamp ?? 0).toISOString())
                    : "now"}
                </p>
              </div>
              <div className="mt-3 flex justify-center">
                <span className="rounded-full bg-black/10 px-2.5 py-1 text-[8px] font-medium text-white/80">
                  ข้อความตัวอย่างจาก KBank LINE
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Webhook className="size-4 text-slate-400" />
                Send result
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                ผลลัพธ์จากการยิง API จริง
              </p>
            </div>
            <CardBody>
              {error ? (
                <ErrorNotice
                  message={error instanceof Error ? error.message : "ส่ง Webhook ไม่สำเร็จ"}
                  correlationId={error instanceof ApiError ? error.correlationId : null}
                />
              ) : result ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-900">
                        Processed {formatNumber(result.response.data.processed)} event
                        {result.response.data.processed === 1 ? "" : "s"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-emerald-700">
                        HTTP {result.response.status} · {formatDateTime(result.at.toISOString())}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-slate-500">correlation_id</p>
                      <CopyButton
                        value={result.response.correlationId ?? ""}
                        label="คัดลอก"
                      />
                    </div>
                    <p className="break-all rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[10px] leading-5 text-slate-600">
                      {result.response.correlationId ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold text-slate-500">Response</p>
                    <pre className="max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-5 text-emerald-200 scrollbar-thin">
                      {JSON.stringify(result.raw, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <p className="text-[10px] font-semibold text-indigo-800">
                      ตรวจสอบผลลัพธ์แบบครบวงจร
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-indigo-700/80">
                      กลับไปที่ Payment Inspector และค้นหา order_id
                      เพื่อดูว่า status เปลี่ยนเป็น PAID, quota ถูกหัก และ callback
                      ถูกส่งไปยัง redirect_url หรือไม่
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    <Webhook className="size-5" />
                  </span>
                  <p className="mt-3 text-xs font-semibold text-slate-600">ยังไม่ได้ส่ง Webhook</p>
                  <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-400">
                    สร้าง payload แล้วกด “ส่ง Webhook เข้า APay”
                    ผลลัพธ์และ correlation_id จะแสดงที่นี่
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
