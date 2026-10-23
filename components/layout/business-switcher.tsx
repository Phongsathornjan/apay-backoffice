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
          "flex h-9 max-w-[230px] items-center gap-2 rounded-xl border px-2.5 text-xs font-semibold transition",
          activeBusiness
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
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
          <div className="animate-popover-in absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
            <div className="border-b border-slate-100 p-3">
              <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Business Context
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาชื่อร้านค้า..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            {activeBusiness ? (
              <div className="border-b border-slate-100 p-2">
                <button
                  type="button"
                  onClick={clear}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <X className="size-3.5" />
                  ล้างธุรกิจที่เลือก
                </button>
              </div>
            ) : null}

            <div className="max-h-72 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-1.5 p-1">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-11 animate-pulse rounded-lg bg-slate-100" />
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
                        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition",
                        selected ? "bg-emerald-50" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">
                          {business.business_name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {business.package_name ?? "ยังไม่มีแพ็กเกจ"}
                        </span>
                      </span>
                      <StatusBadge status={business.subscription_status} dot={false} />
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-xs text-slate-400">
                  ไม่พบธุรกิจที่ตรงกับคำค้น
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] leading-4 text-slate-400">
              เลือกธุรกิจเพื่อดู Dashboard / Subscription / API Keys ในนามร้านค้านั้น
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
