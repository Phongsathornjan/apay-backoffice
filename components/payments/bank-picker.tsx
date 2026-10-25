"use client";

import { Check, Clock3 } from "lucide-react";
import {
  BANK_OPTIONS,
  SUPPORTED_BANKS,
  type BankCode,
} from "@/lib/banks";
import { cn } from "@/lib/utils";

/**
 * Bank selector for the LINE linking flow.
 *
 * Only banks whose LINE alert parser exists on the backend can be picked; the
 * rest stay visible but disabled so merchants can see what is coming.
 */
export function BankPicker({
  value,
  onChange,
  disabled = false,
  label = "เลือกธนาคารที่ใช้แจ้งเตือนเงินเข้า",
  hint,
}: {
  value: BankCode;
  onChange: (code: BankCode) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id="bank-picker-label" className="text-[11px] font-semibold text-ink">
          {label}
        </p>
        {hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
      </div>
      <div
        role="radiogroup"
        aria-labelledby="bank-picker-label"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {BANK_OPTIONS.map((bank) => {
          const selected = bank.code === value;
          const bankDisabled = disabled || !bank.supported;
          return (
            <button
              key={bank.code}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={bankDisabled}
              disabled={bankDisabled}
              title={bank.supported ? bank.name : `${bank.name} — เร็ว ๆ นี้`}
              onClick={() => onChange(bank.code)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-card border px-2.5 py-2 text-left transition",
                selected
                  ? "border-brand-border bg-brand-soft text-brand-ink shadow-card"
                  : "border-line bg-surface text-ink",
                bankDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-line-strong hover:bg-surface-subtle",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", bank.accent)} />
                <span className="truncate text-[11px] font-semibold">{bank.shortName}</span>
              </span>
              {!bank.supported ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
                  <Clock3 className="size-2.5" />
                  เร็ว ๆ นี้
                </span>
              ) : selected ? (
                <Check className="size-3.5 shrink-0 text-brand-ink" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact summary of the banks APay can verify today, plus how many more are
 * planned. Safe to drop anywhere the LINE linking flow is explained.
 */
export function BankSupportChips({ className }: { className?: string }) {
  const upcoming = BANK_OPTIONS.length - SUPPORTED_BANKS.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[11px] text-ink-muted">รองรับ:</span>
      {SUPPORTED_BANKS.map((bank) => (
        <span
          key={bank.code}
          title={`${bank.name} — รองรับแล้ว`}
          className="inline-flex items-center gap-1 rounded-full border border-success-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-secondary"
        >
          <span className={cn("size-1.5 rounded-full", bank.accent)} />
          {bank.shortName}
        </span>
      ))}
      {upcoming > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
          <Clock3 className="size-2.5" />
          อีก {upcoming} ธนาคารเร็ว ๆ นี้
        </span>
      ) : null}
    </div>
  );
}
