import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-5">
      <Logo />
      <div className="mt-8 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Compass className="size-6" />
        </div>
        <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          404 · Page not found
        </p>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
          ไม่พบหน้าที่คุณกำลังมองหา
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          ลิงก์อาจถูกเปลี่ยนหรือหน้านี้ถูกย้ายแล้ว
          กรุณากลับไปยัง Dashboard เพื่อดำเนินการต่อ
        </p>
        <Link href="/" className="mt-5 inline-flex">
          <Button>กลับหน้าหลัก</Button>
        </Link>
      </div>
    </div>
  );
}
