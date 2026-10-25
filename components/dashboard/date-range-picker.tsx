"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import type { Interval } from "@/types/api";
import {
  buildPresetRange,
  DATE_PRESETS,
  dateRangeInputs,
  formatRangeLabel,
  makeCustomRange,
  validateDateRange,
  type DatePreset,
  type DateRangeValue,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [inputs, setInputs] = useState(() => dateRangeInputs(value));
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(value.preset);
  const [error, setError] = useState<string | null>(null);

  const openPanel = () => {
    setDraft(value);
    setInputs(dateRangeInputs(value));
    setSelectedPreset(value.preset);
    setError(null);
    setOpen(true);
  };

  const choosePreset = (key: Exclude<DatePreset, "custom">) => {
    const next = buildPresetRange(key);
    setDraft(next);
    setInputs(dateRangeInputs(next));
    setSelectedPreset(key);
    setError(null);
  };

  const changeInterval = (interval: Interval) => {
    setDraft((current) => ({ ...current, interval }));
  };

  const apply = () => {
    const range =
      selectedPreset === "custom"
        ? makeCustomRange(inputs.from, inputs.to, draft.interval)
        : { ...draft, preset: selectedPreset };

    if (!range) {
      setError("กรุณาระบุวันที่และเวลาให้ครบถ้วน");
      return;
    }

    const validation = validateDateRange(range);
    if (validation) {
      setError(validation);
      return;
    }

    onChange(range);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink-secondary shadow-card transition-colors hover:border-line-strong hover:bg-surface-subtle"
      >
        <CalendarDays className="size-3.5 text-ink-muted" />
        <span className="max-w-[190px] truncate">{formatRangeLabel(value)}</span>
        <span className="rounded-control bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] uppercase text-ink-muted">
          {value.interval}
        </span>
        <ChevronDown className="size-3 text-ink-muted" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="ปิดตัวเลือกช่วงเวลา"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-popover-in absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
            <div className="border-b border-line px-4 py-3">
              <p className="text-xs font-semibold text-ink">ช่วงเวลาและ Interval</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">เวลาไทย Asia/Bangkok (UTC+7)</p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-3">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => choosePreset(preset.key)}
                  className={cn(
                    "flex items-center justify-between rounded-control border px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                    selectedPreset === preset.key
                      ? "border-brand-border bg-brand-soft text-brand-ink"
                      : "border-line text-ink-secondary hover:bg-surface-subtle",
                  )}
                >
                  {preset.label}
                  {selectedPreset === preset.key ? <Check className="size-3" /> : null}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPreset("custom")}
                className={cn(
                  "col-span-2 flex items-center justify-between rounded-control border px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                  selectedPreset === "custom"
                    ? "border-brand-border bg-brand-soft text-brand-ink"
                    : "border-line text-ink-secondary hover:bg-surface-subtle",
                )}
              >
                กำหนดเอง
                {selectedPreset === "custom" ? <Check className="size-3" /> : null}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold text-ink-secondary">เริ่มต้น</span>
                <input
                  type="datetime-local"
                  value={inputs.from}
                  disabled={selectedPreset !== "custom"}
                  onChange={(event) => {
                    setInputs((current) => ({ ...current, from: event.target.value }));
                    setSelectedPreset("custom");
                  }}
                  className="h-9 w-full rounded-control border border-line px-2 text-[11px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-surface-muted disabled:text-ink-muted"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] font-semibold text-ink-secondary">สิ้นสุด</span>
                <input
                  type="datetime-local"
                  value={inputs.to}
                  disabled={selectedPreset !== "custom"}
                  onChange={(event) => {
                    setInputs((current) => ({ ...current, to: event.target.value }));
                    setSelectedPreset("custom");
                  }}
                  className="h-9 w-full rounded-control border border-line px-2 text-[11px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-surface-muted disabled:text-ink-muted"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-3">
              <div className="inline-flex rounded-control border border-line bg-surface-muted p-0.5">
                {(["hour", "day"] as const).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => changeInterval(interval)}
                    aria-pressed={draft.interval === interval}
                    className={cn(
                      "rounded-control px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
                      draft.interval === interval
                        ? "bg-surface text-brand-ink shadow-card"
                        : "text-ink-secondary",
                    )}
                  >
                    {interval}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={apply}
                className="h-8 rounded-control bg-brand px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                ใช้งานช่วงเวลานี้
              </button>
            </div>

            {error ? (
              <p
                role="alert"
                className="border-t border-danger-border bg-danger-soft px-3 py-2 text-[11px] font-medium text-danger-ink"
              >
                {error}
              </p>
            ) : (
              <p className="border-t border-line bg-surface-subtle px-3 py-2 text-[11px] text-ink-muted">
                ช่วงรวมไม่เกิน 365 วัน และโหมด hour ไม่เกิน 31 วัน
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
