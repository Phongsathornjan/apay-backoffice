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
    <div className="flex min-h-[70vh] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-panel bg-danger-soft text-danger-ink">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-ink">เกิดข้อผิดพลาดบางอย่าง</h1>
        <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
          หน้าจอนี้ไม่สามารถแสดงผลได้ในขณะนี้ กรุณาลองโหลดใหม่
          หากยังพบปัญหาให้ตรวจสอบ log ของระบบ
        </p>
        {error.digest ? (
          <p className="mt-3 break-all font-mono text-[11px] text-ink-muted">
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
