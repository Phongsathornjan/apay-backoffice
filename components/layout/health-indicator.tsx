"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { getHealth } from "@/services/health";
import { cn } from "@/lib/utils";
import type { HealthData } from "@/types/api";

type HealthState = "checking" | "online" | "offline";

export function HealthIndicator() {
  const [state, setState] = useState<HealthState>("checking");
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const result = await getHealth();
        if (!active) return;
        setHealth(result);
        setState("online");
      } catch {
        if (!active) return;
        setState("offline");
      }
    };

    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 md:flex"
      title={health ? `${health.service_name} · ${health.message}` : "ตรวจสอบสถานะระบบ"}
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-50",
            state === "online"
              ? "bg-emerald-500"
              : state === "offline"
                ? "bg-rose-500"
                : "bg-amber-500",
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            state === "online"
              ? "bg-emerald-500"
              : state === "offline"
                ? "bg-rose-500"
                : "bg-amber-500",
          )}
        />
      </span>
      <Activity className="size-3" />
      {state === "online" ? "ระบบทำงานปกติ" : state === "offline" ? "API ขัดข้อง" : "กำลังตรวจสอบ"}
    </div>
  );
}
