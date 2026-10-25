"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 items-center gap-2.5 rounded-card px-3 py-2.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-brand-soft text-brand-ink"
          : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand"
        />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-brand" : "text-ink-muted group-hover:text-ink-secondary",
        )}
      />
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto size-1.5 rounded-full bg-brand" /> : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, activeBusiness, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = role === "admin";
  const currentItem = [...MERCHANT_NAV, ...ADMIN_NAV]
    .filter((item) => isActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  };

  const onLogout = () => {
    logout();
    router.replace("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 items-center justify-between border-b border-line px-5">
        <Link
          href={isAdmin ? "/admin/dashboard" : "/dashboard"}
          onClick={() => setMobileOpen(false)}
          aria-label="APay หน้าหลัก"
        >
          <Logo size="sm" />
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeMobile}
          aria-label="ปิดเมนู"
          className="-mr-1 flex size-9 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {isAdmin ? (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Platform
            </p>
            <div className="space-y-1">
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
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Merchant
            </p>
            {isAdmin && activeBusiness ? (
              <span className="max-w-[110px] truncate text-[11px] font-medium text-brand-ink">
                {activeBusiness.name}
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
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

      <div className="border-t border-line p-3">
        <div className="rounded-card border border-line bg-surface-subtle p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-secondary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            API v1 · Asia/Bangkok
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">UTC+7 · THB · PromptPay</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-card focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-ink focus:shadow-raised"
      >
        ข้ามไปเนื้อหาหลัก
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เมนูนำทาง"
            className="animate-drawer-in absolute inset-y-0 left-0 w-[280px] shadow-raised"
          >
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="เปิดเมนู"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="flex size-10 items-center justify-center rounded-control border border-line bg-surface text-ink-secondary hover:bg-surface-subtle lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {isAdmin ? "Admin Console" : "Merchant Portal"}
              </p>
              <p className="truncate text-sm font-semibold text-ink">
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
                aria-haspopup="menu"
                className="flex h-10 items-center gap-2 rounded-card border border-line bg-surface pl-1.5 pr-2 transition-colors hover:bg-surface-subtle"
              >
                <span className="flex size-8 items-center justify-center rounded-control bg-brand-soft text-[11px] font-bold text-brand-ink">
                  {getInitials(user?.username ?? "APay")}
                </span>
                <span className="hidden max-w-[110px] truncate text-xs font-semibold text-ink sm:block">
                  {user?.username}
                </span>
                <Badge
                  tone={isAdmin ? "brand" : "neutral"}
                  className="hidden px-1.5 py-0 text-[11px] uppercase sm:inline-flex"
                >
                  {role}
                </Badge>
                <ChevronDown className="size-3 text-ink-muted" />
              </button>

              {profileOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="ปิดเมนูผู้ใช้"
                    onClick={() => setProfileOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div
                    role="menu"
                    className="animate-popover-in absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-panel border border-line bg-surface shadow-raised"
                  >
                    <div className="border-b border-line p-4">
                      <p className="text-sm font-semibold text-ink">{user?.username}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-ink-muted">
                        {user?.user_id}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge tone={isAdmin ? "brand" : "neutral"}>{role}</Badge>
                        {user?.business_id ? (
                          <span className="max-w-[150px] truncate text-[11px] text-ink-muted">
                            {user.business_id}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-semibold text-danger-ink transition-colors hover:bg-danger-soft"
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

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] px-3 py-5 outline-none sm:px-5 sm:py-6 lg:px-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
