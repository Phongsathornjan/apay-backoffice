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
        className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <CalendarDays className="size-3.5 text-slate-400" />
        <span className="max-w-[190px] truncate">{formatRangeLabel(value)}</span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
          {value.interval}
        </span>
        <ChevronDown className="size-3 text-slate-400" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="ปิดตัวเลือกช่วงเวลา"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="animate-popover-in absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-800">ช่วงเวลาและ Interval</p>
              <p className="mt-0.5 text-[10px] text-slate-400">เวลาไทย Asia/Bangkok (UTC+7)</p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-3">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => choosePreset(preset.key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition",
                    selectedPreset === preset.key
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
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
                  "col-span-2 flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition",
                  selectedPreset === "custom"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                กำหนดเอง
                {selectedPreset === "custom" ? <Check className="size-3" /> : null}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
              <label className="space-y-1">
                <span className="block text-[10px] font-semibold text-slate-500">เริ่มต้น</span>
                <input
                  type="datetime-local"
                  value={inputs.from}
                  disabled={selectedPreset !== "custom"}
                  onChange={(event) => {
                    setInputs((current) => ({ ...current, from: event.target.value }));
                    setSelectedPreset("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px] text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] font-semibold text-slate-500">สิ้นสุด</span>
                <input
                  type="datetime-local"
                  value={inputs.to}
                  disabled={selectedPreset !== "custom"}
                  onChange={(event) => {
                    setInputs((current) => ({ ...current, to: event.target.value }));
                    setSelectedPreset("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px] text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                {(["hour", "day"] as const).map((interval) => (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => changeInterval(interval)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase transition",
                      draft.interval === interval
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500",
                    )}
                  >
                    {interval}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={apply}
                className="h-8 rounded-lg bg-emerald-600 px-3.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
              >
                ใช้งานช่วงเวลานี้
              </button>
            </div>

            {error ? (
              <p className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-medium text-rose-600">
                {error}
              </p>
            ) : (
              <p className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-[10px] text-slate-400">
                ช่วงรวมไม่เกิน 365 วัน และโหมด hour ไม่เกิน 31 วัน
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
