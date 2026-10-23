const THB_FORMAT = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMAT = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

const COMPACT_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const DATE_FORMAT = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_SHORT_FORMAT = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const TIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const INPUT_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatCurrency(value: number | null | undefined): string {
  return `฿${THB_FORMAT.format(Number(value ?? 0))}`;
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  return `฿${COMPACT_FORMAT.format(Number(value ?? 0))}`;
}

export function formatNumber(value: number | null | undefined): string {
  return NUMBER_FORMAT.format(Number(value ?? 0));
}

export function formatCompact(value: number | null | undefined): string {
  return COMPACT_FORMAT.format(Number(value ?? 0));
}

/** API rate fields are ratios (0.83 = 83%). */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatPlainPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMAT.format(date);
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_SHORT_FORMAT.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATETIME_FORMAT.format(date).replace(",", " ·");
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return TIME_FORMAT.format(date);
}

export function formatDateInput(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = INPUT_FORMAT.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function bangkokInputToIso(value: string): string | null {
  if (!value) return null;
  // datetime-local values represent wall-clock time in Thailand (UTC+7).
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

export function quotaTone(ratio: number): "emerald" | "amber" | "rose" {
  if (ratio >= 0.8) return "rose";
  if (ratio >= 0.5) return "amber";
  return "emerald";
}

export function maskKeyPrefix(prefix: string | null | undefined): string {
  if (!prefix) return "—";
  return `${prefix}${"•".repeat(12)}`;
}

/** Masks a LINE User ID for display: `U••••••a1b2`. */
export function maskLineUserId(lineUserId: string | null | undefined): string {
  if (!lineUserId) return "—";
  if (lineUserId.length <= 5) return lineUserId;
  return `${lineUserId.slice(0, 1)}••••••${lineUserId.slice(-4)}`;
}

/** `mm:ss` (or `hh:mm:ss` when an hour or more remains) for QR TTL countdowns. */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function truncateMiddle(value: string, max = 32): string {
  if (value.length <= max) return value;
  const side = Math.floor((max - 1) / 2);
  return `${value.slice(0, side)}…${value.slice(-side)}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
