"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the error visible for debugging without leaking sensitive data.
    console.error("APay UI error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">เกิดข้อผิดพลาดบางอย่าง</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          หน้าจอนี้ไม่สามารถแสดงผลได้ในขณะนี้ กรุณาลองโหลดใหม่
          หากยังพบปัญหาให้ตรวจสอบ log ของระบบ
        </p>
        {error.digest ? (
          <p className="mt-3 break-all font-mono text-[10px] text-slate-400">
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} icon={<RefreshCw className="size-4" />}>
            ลองอีกครั้ง
          </Button>
          <Link href="/">
            <Button variant="secondary">กลับหน้าหลัก</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
