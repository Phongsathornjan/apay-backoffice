"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  UserRound,
  Webhook,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FullPageLoader } from "@/components/auth/require-auth";
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export default function LoginPage() {
  const { login, isHydrating, session } = useAuth();
  const router = useRouter();
  const { notifyError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrating && session) {
      router.replace(session.user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [isHydrating, session, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("กรุณากรอก username และ password");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ username: username.trim(), password });
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "เข้าสู่ระบบไม่สำเร็จ";
      setError(message);
      notifyError(cause, "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (isHydrating) return <FullPageLoader label="กำลังตรวจสอบเซสชัน..." />;

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="bg-hero-ambient relative hidden min-h-screen overflow-hidden border-r border-line px-12 py-10 lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/4 size-[420px] rounded-full bg-brand/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 bottom-0 size-[460px] rounded-full bg-info/10 blur-3xl"
        />
        <div aria-hidden="true" className="bg-grid-faint absolute inset-0 opacity-70" />

        <div className="relative">
          <Logo size="lg" priority light />
        </div>

        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-surface/70 px-3 py-1 text-[11px] font-semibold text-brand-ink backdrop-blur-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            Payment Infrastructure for Thailand
          </span>
          <h1 className="mt-6 text-[42px] font-bold leading-[1.12] tracking-[-0.035em] text-ink">
            รับชำระเงิน
            <br />
            <span className="text-gradient-brand">แม่นยำทุกสตางค์</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-ink-secondary">
            จัดการ PromptPay QR, ตรวจสอบยอดโอนผ่าน KBank LINE Webhook,
            ควบคุมโควต้าและ API Key ของร้านค้าในศูนย์กลางเดียว
          </p>

          <div className="mt-10 grid max-w-lg gap-3">
            {[
              {
                icon: QrCode,
                title: "PromptPay QR อัตโนมัติ",
                description: "จองเศษสตางค์อ้างอิง (.01–.99) และจับคู่ยอดโอนได้แม่นยำ",
              },
              {
                icon: Webhook,
                title: "KBank LINE Verification",
                description: "ตรวจข้อความเงินเข้า ป้องกันรายการซ้ำ และยืนยันยอดแบบเรียลไทม์",
              },
              {
                icon: ShieldCheck,
                title: "Prepaid & Quota Controls",
                description: "ติดตาม paid-through, โควต้า และ rate limit ต่อร้านค้า",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-panel border border-line bg-surface/70 p-4 backdrop-blur-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-brand-soft text-brand-ink">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-ink-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-line pt-5 text-[11px] text-ink-muted">
          <span>© 2026 APay Payment Gateway</span>
          <span className="font-mono">API v1 · Asia/Bangkok</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <Logo priority light />
          </div>

          <div className="rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="mb-7">
              <span className="inline-flex size-11 items-center justify-center rounded-panel border border-brand-border bg-brand-soft text-brand-ink">
                <LockKeyhole className="size-5" />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">
                เข้าสู่ Backoffice
              </h2>
              <p className="mt-1.5 text-sm text-ink-secondary">
                ใช้บัญชีแอดมินหรือบัญชีร้านค้าเพื่อจัดการระบบ APay
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-ink">
                  Username
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="ชื่อผู้ใช้งาน"
                    className="h-11 pl-10"
                    aria-invalid={Boolean(error && !username.trim())}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-ink">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="รหัสผ่าน"
                    className="h-11 pl-10 pr-11"
                    aria-describedby={error ? "login-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  id="login-error"
                  role="alert"
                  className="rounded-card border border-danger-border bg-danger-soft px-3.5 py-3 text-xs font-medium leading-5 text-danger-ink"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="w-full"
              >
                เข้าสู่ระบบ
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="mt-6 rounded-card border border-line bg-surface-subtle p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary">
                <ShieldCheck className="size-3.5 text-success-ink" />
                การเชื่อมต่อปลอดภัยด้วย JWT และ Token Rotation
              </p>
              <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                ระบบจะต่ออายุ access token อัตโนมัติ และเพิกถอน refresh token เดิมทุกครั้ง
              </p>
            </div>
          </div>

          <p className="mt-7 text-center text-[11px] leading-5 text-ink-muted">
            สำหรับร้านค้าที่ต้องการเปิดใช้งาน กรุณาติดต่อผู้ดูแลแพลตฟอร์ม
            <br />
            APay Backoffice · v0.1.0
          </p>
        </div>
      </section>
    </div>
  );
}
