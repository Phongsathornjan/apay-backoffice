"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/layout/logo";
import { HealthIndicator } from "@/components/layout/health-indicator";
import { BusinessSwitcher } from "@/components/layout/business-switcher";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const MERCHANT_NAV: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวมร้านค้า", icon: LayoutDashboard, exact: true },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/subscription", label: "แพ็กเกจ & โควต้า", icon: CreditCard },
  { href: "/payments", label: "PromptPay Playground", icon: QrCode },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Platform Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "ร้านค้า & Subscription", icon: Building2 },
  { href: "/admin/packages", label: "Master Packages", icon: Package },
  { href: "/admin/webhook-simulator", label: "Webhook Simulator", icon: Webhook },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
        active
          ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition",
          active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300",
        )}
      />
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto size-1.5 rounded-full bg-emerald-400" /> : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, activeBusiness, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = role === "admin";
  const currentItem = [...MERCHANT_NAV, ...ADMIN_NAV]
    .filter((item) => isActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const onLogout = () => {
    logout();
    router.replace("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0b1220]">
      <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
        <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} onClick={() => setMobileOpen(false)}>
          <Logo light />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="ปิดเมนู"
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {isAdmin ? (
          <div>
            <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Platform
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1.5 flex items-center justify-between px-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Merchant
            </p>
            {isAdmin && activeBusiness ? (
              <span className="max-w-[110px] truncate text-[9px] font-medium text-emerald-400/80">
                {activeBusiness.name}
              </span>
            ) : null}
          </div>
          <div className="space-y-0.5">
            {MERCHANT_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-xl bg-white/[0.035] p-3">
          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            API v1 · Asia/Bangkok
          </div>
          <p className="mt-1 text-[10px] text-slate-600">UTC+7 · THB · PromptPay</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-drawer-in absolute inset-y-0 left-0 w-[270px] shadow-2xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="เปิดเมนู"
              className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {isAdmin ? "Admin Console" : "Merchant Portal"}
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {currentItem?.label ?? "APay Backoffice"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HealthIndicator />
            <BusinessSwitcher />
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white pl-1.5 pr-2 transition hover:bg-slate-50"
              >
                <span className="flex size-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
                  {getInitials(user?.username ?? "APay")}
                </span>
                <span className="hidden max-w-[110px] truncate text-xs font-semibold text-slate-700 sm:block">
                  {user?.username}
                </span>
                <Badge
                  tone={isAdmin ? "indigo" : "emerald"}
                  className="hidden px-1.5 py-0 text-[9px] uppercase sm:inline-flex"
                >
                  {role}
                </Badge>
                <ChevronDown className="size-3 text-slate-400" />
              </button>

              {profileOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="ปิดเมนูผู้ใช้"
                    onClick={() => setProfileOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="animate-popover-in absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 p-4">
                      <p className="text-sm font-semibold text-slate-900">{user?.username}</p>
                      <p className="mt-0.5 break-all font-mono text-[10px] text-slate-400">
                        {user?.user_id}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge tone={isAdmin ? "indigo" : "emerald"}>{role}</Badge>
                        {user?.business_id ? (
                          <span className="max-w-[150px] truncate text-[10px] text-slate-400">
                            {user.business_id}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="size-3.5" />
                      ออกจากระบบ
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1640px] px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
