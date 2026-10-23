"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BusinessContextNotice({
  feature = "ข้อมูลร้านค้า",
}: {
  feature?: string;
}) {
  const { role, activeBusiness } = useAuth();

  if (role !== "admin") {
    return (
      <EmptyState
        icon={Store}
        title="ไม่พบบัญชีธุรกิจในเซสชันนี้"
        description="กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบการผูกบัญชีธุรกิจ"
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Store className="size-5" />
        </div>
        <Badge tone="indigo" className="mt-4">
          Admin drill-down
        </Badge>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          เลือกธุรกิจเพื่อดู{feature}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          คุณกำลังใช้งานในมุมมอง Admin กรุณาเลือกธุรกิจจาก Business Switcher
          ที่มุมขวาบน หรือเข้าไปเลือกจากหน้ารายการร้านค้า
        </p>
        {activeBusiness ? (
          <p className="mt-3 font-mono text-xs text-slate-400">
            active business: {activeBusiness.id}
          </p>
        ) : null}
        <Link href="/admin/businesses" className="mt-5 inline-flex">
          <Button icon={<ArrowRight className="size-4" />}>ไปที่รายการร้านค้า</Button>
        </Link>
        <p className="mt-3 text-[10px] text-slate-400">
          หรือใช้ Business Switcher ที่แถบด้านบนเพื่อสลับบริบทได้ทันที
        </p>
      </div>
    </div>
  );
}
