import type { Interval } from "@/types/api";
import { bangkokInputToIso, formatDateInput } from "@/lib/format";

export type DatePreset = "last_24h" | "last_7d" | "last_30d" | "last_90d" | "custom";

export interface DateRangeValue {
  from: string;
  to: string;
  interval: Interval;
  preset: DatePreset;
}

export const DATE_PRESETS: Array<{ key: Exclude<DatePreset, "custom">; label: string; short: string }> = [
  { key: "last_24h", label: "24 ชั่วโมงล่าสุด", short: "24 ชม." },
  { key: "last_7d", label: "7 วันล่าสุด", short: "7 วัน" },
  { key: "last_30d", label: "30 วันล่าสุด", short: "30 วัน" },
  { key: "last_90d", label: "90 วันล่าสุด", short: "90 วัน" },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_RANGE_MS = 365 * DAY;
const MAX_HOURLY_RANGE_MS = 31 * DAY;

export function buildPresetRange(preset: Exclude<DatePreset, "custom">, now = Date.now()): DateRangeValue {
  const durations: Record<Exclude<DatePreset, "custom">, number> = {
    last_24h: DAY,
    last_7d: 7 * DAY,
    last_30d: 30 * DAY,
    last_90d: 90 * DAY,
  };
  const interval: Interval = preset === "last_24h" ? "hour" : "day";
  return {
    from: new Date(now - durations[preset]).toISOString(),
    to: new Date(now).toISOString(),
    interval,
    preset,
  };
}

export function validateDateRange(range: Pick<DateRangeValue, "from" | "to" | "interval">): string | null {
  const from = new Date(range.from).getTime();
  const to = new Date(range.to).getTime();

  if (Number.isNaN(from) || Number.isNaN(to)) return "กรุณาระบุช่วงวันที่ให้ครบถ้วน";
  if (from >= to) return "เวลาเริ่มต้นต้องอยู่ก่อนเวลาสิ้นสุด";
  if (to > Date.now() + 5 * 60_000) return "เวลาสิ้นสุดต้องไม่เกินเวลาปัจจุบัน";

  const span = to - from;
  if (span > MAX_RANGE_MS) return "ช่วงวันที่ต้องไม่เกิน 365 วัน";
  if (range.interval === "hour" && span > MAX_HOURLY_RANGE_MS) {
    return "โหมดรายชั่วโมงเลือกช่วงได้ไม่เกิน 31 วัน";
  }
  return null;
}

export function makeCustomRange(fromInput: string, toInput: string, interval: Interval): DateRangeValue | null {
  const from = bangkokInputToIso(fromInput);
  const to = bangkokInputToIso(toInput);
  if (!from || !to) return null;
  return { from, to, interval, preset: "custom" };
}

export function dateRangeInputs(range: DateRangeValue) {
  return {
    from: formatDateInput(range.from),
    to: formatDateInput(range.to),
  };
}

export function formatRangeLabel(range: DateRangeValue): string {
  if (range.preset !== "custom") {
    return DATE_PRESETS.find((item) => item.key === range.preset)?.short ?? "กำหนดเอง";
  }
  const from = new Date(range.from);
  const to = new Date(range.to);
  const formatter = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${formatter.format(from)} – ${formatter.format(to)}`;
}

export function rangeQuery(range: DateRangeValue) {
  return { from: range.from, to: range.to, interval: range.interval };
}
