"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Link2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { LineLinkModal } from "@/components/payments/line-link-modal";
import { BankSupportChips } from "@/components/payments/bank-picker";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { maskLineUserId } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * LINE linkage status for the merchant overview.
 *
 * - Business users: shows the linked state and can link right here (same flow
 *   as the Payments page) — the session updates immediately after linking.
 * - Admin drill-down: the admin JWT is not bound to the business, so the card
 *   only explains how to link/look it up with the merchant's API key.
 */
export function LineLinkCard({ adminView = false }: { adminView?: boolean }) {
  const { lineUserId, isLineLinked, setLineUserId } = useAuth();
  const { success, info } = useToast();
  const [open, setOpen] = useState(false);

  if (adminView) {
    return (
      <Card className="border-slate-200 bg-slate-50/60">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
              <Link2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">การเชื่อมต่อ LINE ของร้านค้า</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                สถานะ LINE ของร้านค้าถูกผูกที่ระดับธุรกิจ — ตรวจสอบหรือสร้าง QR ผูก LINE
                ให้ร้านค้าได้จาก Payment Inspector ด้วย API Key ของร้านค้า (โหมด Raw API Key)
              </p>
              <BankSupportChips className="mt-1.5" />
            </div>
          </div>
          <Link href="/payments" className="shrink-0">
            <Button size="sm" variant="secondary" icon={<ArrowUpRight className="size-3.5" />}>
              ไปที่ Payment Inspector
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          isLineLinked
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-amber-200 bg-amber-50/60",
        )}
      >
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm",
                isLineLinked ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {isLineLinked ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">การเชื่อมต่อ LINE</p>
                <Badge tone={isLineLinked ? "emerald" : "amber"} dot>
                  {isLineLinked ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-600">
                {isLineLinked ? (
                  <>
                    LINE User ID <span className="font-mono">{maskLineUserId(lineUserId)}</span> ·
                    พร้อมสร้าง QR รับเงินได้แล้ว
                  </>
                ) : (
                  "ต้องผูก LINE ก่อนสร้าง QR รับเงิน — ระบบใช้ข้อความแจ้งเตือนเงินเข้าทาง LINE ของธนาคารในการยืนยันยอดโอน"
                )}
              </p>
              {!isLineLinked ? (
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  หากเคยผูกไว้แล้วแต่สถานะยังไม่ตรง กรุณาเข้าสู่ระบบใหม่เพื่อรับข้อมูลล่าสุด
                </p>
              ) : null}
              <BankSupportChips className="mt-1.5" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/payments">
              <Button size="sm" variant="secondary" icon={<ArrowUpRight className="size-3.5" />}>
                Payment Inspector
              </Button>
            </Link>
            {isLineLinked ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                พร้อมรับชำระ
              </span>
            ) : (
              <Button size="sm" onClick={() => setOpen(true)} icon={<Link2 className="size-3.5" />}>
                ผูก LINE
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {open ? (
        <LineLinkModal
          open
          onClose={() => setOpen(false)}
          onLinked={(linkedLineUserId) => {
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
            info(
              "ร้านค้านี้ผูก LINE ไว้แล้ว — กรุณาเข้าสู่ระบบใหม่หรือรีเฟรชหน้าเพื่อรับสถานะล่าสุด",
              { title: "ผูก LINE แล้ว" },
            );
          }}
        />
      ) : null}
    </>
  );
}
