"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ApiError } from "@/services/api";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  correlationId?: string | null;
}

interface ToastOptions {
  title?: string;
  correlationId?: string | null;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, options?: ToastOptions) => number;
  success: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  notifyError: (error: unknown, fallback?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-success-border",
  error: "border-danger-border",
  info: "border-info-border",
};

const TONE_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONE_ICON_STYLES: Record<ToastTone, string> = {
  success: "bg-success-soft text-success-ink",
  error: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info-ink",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info", options: ToastOptions = {}) => {
      const id = ++nextId.current;
      const item: ToastItem = {
        id,
        tone,
        title:
          options.title ??
          (tone === "success" ? "สำเร็จ" : tone === "error" ? "เกิดข้อผิดพลาด" : "แจ้งเตือน"),
        message,
        correlationId: options.correlationId,
      };
      setToasts((items) => [...items.slice(-3), item]);
      const timeout = tone === "error" ? 9_000 : 5_500;
      const timer = window.setTimeout(() => dismiss(id), timeout);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => toast(message, "success", options),
    [toast],
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => toast(message, "info", options),
    [toast],
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => toast(message, "error", options),
    [toast],
  );

  const notifyError = useCallback(
    (cause: unknown, fallback = "ไม่สามารถดำเนินการได้") => {
      if (cause instanceof ApiError) {
        const titles: Record<number, string> = {
          400: "ข้อมูลไม่ถูกต้อง",
          401: "เซสชันหมดอายุ",
          403: "ไม่มีสิทธิ์ดำเนินการ",
          404: "ไม่พบข้อมูล",
          409: "ข้อมูลขัดแย้ง",
          429: "โควต้าหรือ Rate Limit เต็ม",
        };
        return toast(cause.message || fallback, "error", {
          title: titles[cause.status] ?? "เกิดข้อผิดพลาด",
          correlationId: cause.correlationId,
        });
      }
      const message = cause instanceof Error ? cause.message : fallback;
      return toast(message, "error");
    },
    [toast],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider
      value={{ toast, success, info, error, notifyError, dismiss }}
    >
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:top-4"
      >
        {toasts.map((item) => {
          const Icon = TONE_ICONS[item.tone];
          return (
            <div
              key={item.id}
              className={cn(
                "animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-surface p-3.5 shadow-raised",
                TONE_STYLES[item.tone],
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control",
                  TONE_ICON_STYLES[item.tone],
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.message ? (
                  <p className="mt-0.5 break-words text-xs leading-5 text-ink-secondary">
                    {item.message}
                  </p>
                ) : null}
                {item.correlationId ? (
                  <p className="mt-1.5 break-all font-mono text-[11px] leading-4 text-ink-muted">
                    correlation_id: {item.correlationId}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="ปิดการแจ้งเตือน"
                className="flex size-6 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ErrorNotice({
  message,
  correlationId,
  onRetry,
}: {
  message: string;
  correlationId?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-danger-border bg-danger-soft p-4 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-surface text-danger-ink">
        <AlertTriangle className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-danger-ink">{message}</p>
        {correlationId ? (
          <p className="mt-0.5 break-all font-mono text-[11px] text-danger-ink/80">
            correlation_id: {correlationId}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control border border-danger-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger-ink hover:bg-danger-soft"
        >
          ลองใหม่
        </button>
      ) : null}
    </div>
  );
}
