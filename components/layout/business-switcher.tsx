"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, Search, Store, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { getAdminBusinesses } from "@/services/dashboard";
import { useApiData } from "@/lib/hooks/use-api-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BusinessSwitcher() {
  const { role, activeBusiness, setActiveBusiness } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const router = useRouter();
  const pathname = usePathname();

  const canUse = role === "admin";
  const { data, isLoading } = useApiData(
    canUse && open ? `business-switcher:${debouncedSearch}` : null,
    () =>
      getAdminBusinesses({
        search: debouncedSearch.trim() || undefined,
        limit: 8,
        sort_by: "created_at",
        sort_order: "desc",
      }),
    { enabled: canUse && open },
  );

  if (!canUse) return null;

  const selectBusiness = (business: { id: string; name: string }) => {
    setActiveBusiness(business);
    setOpen(false);
    setSearch("");
    if (pathname.startsWith("/admin")) {
      router.push("/dashboard");
    }
  };

  const clear = () => {
    setActiveBusiness(null);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-10 max-w-[230px] items-center gap-2 rounded-card border px-2.5 text-xs font-semibold transition-colors",
          activeBusiness
            ? "border-brand-border bg-brand-soft text-brand-ink hover:bg-brand-border/50"
            : "border-line bg-surface text-ink-secondary hover:bg-surface-subtle",
        )}
      >
        <Store className="size-3.5 shrink-0" />
        <span className="truncate">
          {activeBusiness ? activeBusiness.name : "เลือกธุรกิจ"}
        </span>
        <ChevronsUpDown className="size-3 shrink-0 opacity-60" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="ปิดรายการธุรกิจ"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-popover-in absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
            <div className="border-b border-line p-3">
              <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Business Context
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาชื่อร้านค้า..."
                  className="h-9 w-full rounded-control border border-line bg-surface-subtle pl-8 pr-3 text-xs text-ink outline-none focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            {activeBusiness ? (
              <div className="border-b border-line p-2">
                <button
                  type="button"
                  onClick={clear}
                  className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                >
                  <X className="size-3.5" />
                  ล้างธุรกิจที่เลือก
                </button>
              </div>
            ) : null}

            <div className="scrollbar-thin max-h-72 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-1.5 p-1">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 animate-pulse rounded-control bg-surface-muted"
                    />
                  ))}
                </div>
              ) : data && data.items.length > 0 ? (
                data.items.map((business) => {
                  const selected = activeBusiness?.id === business.business_id;
                  return (
                    <button
                      key={business.business_id}
                      type="button"
                      onClick={() =>
                        selectBusiness({
                          id: business.business_id,
                          name: business.business_name,
                        })
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-2 text-left transition-colors",
                        selected ? "bg-brand-soft" : "hover:bg-surface-subtle",
                      )}
                    >
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-xs font-semibold",
                            selected ? "text-brand-ink" : "text-ink",
                          )}
                        >
                          {business.business_name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-muted">
                          {business.package_name ?? "ยังไม่มีแพ็กเกจ"}
                        </span>
                      </span>
                      <StatusBadge status={business.subscription_status} dot={false} />
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-xs text-ink-muted">
                  ไม่พบธุรกิจที่ตรงกับคำค้น
                </p>
              )}
            </div>
            <div className="border-t border-line bg-surface-subtle px-3 py-2 text-[11px] leading-4 text-ink-muted">
              เลือกธุรกิจเพื่อดู Dashboard / Subscription / API Keys ในนามร้านค้านั้น
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
