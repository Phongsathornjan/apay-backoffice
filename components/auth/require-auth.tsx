"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import type { UserRole } from "@/types/api";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function FullPageLoader({ label = "กำลังโหลดข้อมูล..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-emerald-600 shadow-sm">
          <Loader2 className="size-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function AccessDenied({ allowed }: { allowed: UserRole[] }) {
  const { role } = useAuth();
  const home = role === "admin" ? "/admin/dashboard" : "/dashboard";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          หน้านี้สำหรับผู้ใช้บทบาท {allowed.join(", ")} เท่านั้น
          กรุณากลับไปยังหน้าหลักของบัญชีคุณ
        </p>
        <Link href={home} className="mt-5 inline-block">
          <Button variant="primary">กลับหน้าหลัก</Button>
        </Link>
      </div>
    </div>
  );
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { isHydrating, isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrating && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrating, isAuthenticated, router]);

  if (isHydrating) return <FullPageLoader />;
  if (!isAuthenticated) return <FullPageLoader label="กำลังพากลับไปหน้าเข้าสู่ระบบ..." />;
  if (roles && role && !roles.includes(role)) return <AccessDenied allowed={roles} />;

  return <>{children}</>;
}
