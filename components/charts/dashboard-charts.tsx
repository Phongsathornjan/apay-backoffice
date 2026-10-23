"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { DashboardSeries, DashboardSeriesPoint } from "@/types/api";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "#059669",
  "#4f46e5",
  "#0ea5e9",
  "#f59e0b",
  "#e11d48",
  "#14b8a6",
  "#8b5cf6",
  "#64748b",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: ReactNode;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: entry.color ?? CHART_COLORS[index] }}
              />
              {entry.name}
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-800">
              {formatter
                ? formatter(Number(entry.value ?? 0))
                : formatNumber(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function mergeDashboardSeries(series: DashboardSeries[]) {
  const rows = new Map<string, Record<string, string | number>>();

  for (const item of series) {
    for (const point of item.points) {
      const key = point.bucket_start || point.label;
      const row = rows.get(key) ?? {
        label: point.label,
        __sort: new Date(point.bucket_start).getTime(),
      };
      row[item.key] = point.value;
      rows.set(key, row);
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) => Number(a.__sort ?? 0) - Number(b.__sort ?? 0),
  );
}

export function hasSeriesData(series: DashboardSeries[]): boolean {
  return series.some((item) => item.points.length > 0);
}

export function SeriesChart({
  series,
  height = 280,
  currency = false,
  stacked = false,
}: {
  series: DashboardSeries[];
  height?: number;
  currency?: boolean;
  stacked?: boolean;
}) {
  if (!hasSeriesData(series)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มีข้อมูลในช่วงเวลานี้"
        description="ลองเปลี่ยนช่วงวันที่หรือรอให้มีธุรกรรมใหม่"
        compact
        className="mx-3 mb-2"
      />
    );
  }

  const data = mergeDashboardSeries(series);
  const format = currency ? formatCurrency : formatNumber;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {series.map((item, index) => (
              <linearGradient
                key={item.key}
                id={`area-${item.key.replace(/[^a-zA-Z0-9_-]/g, "")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                  stopOpacity={0.24}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                  stopOpacity={0.01}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={currency ? 56 : 40}
            tickFormatter={(value: number) =>
              currency ? formatCurrencyCompact(value) : formatCompact(value)
            }
          />
          <Tooltip
            content={<ChartTooltip formatter={format} />}
            cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
          />
          {series.map((item, index) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stackId={stacked ? "1" : undefined}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              fill={`url(#area-${item.key.replace(/[^a-zA-Z0-9_-]/g, "")})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinancialChart({ series, height = 280 }: { series: DashboardSeries[]; height?: number }) {
  if (!hasSeriesData(series)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มียอดรับชำระ"
        description="ข้อมูล GMV และ AOV จะแสดงเมื่อมีคำสั่งซื้อที่ชำระแล้ว"
        compact
        className="mx-3 mb-2"
      />
    );
  }

  const data = mergeDashboardSeries(series);
  const gmv = series.find((item) => item.key === "gmv");
  const aov = series.find((item) => item.key === "average_order_value");

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            width={58}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={52}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
          {gmv ? (
            <Bar
              yAxisId="left"
              dataKey={gmv.key}
              name={gmv.label}
              fill="#10b981"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
          ) : null}
          {aov ? (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={aov.key}
              name={aov.label}
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PointsAreaChart({
  points,
  height = 240,
  color = "#4f46e5",
  currency = false,
}: {
  points: DashboardSeriesPoint[];
  height?: number;
  color?: string;
  currency?: boolean;
}) {
  if (!points.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มีข้อมูล Rate Limit"
        description="ระบบจะเริ่มบันทึกเมื่อมีการสร้าง QR"
        compact
        className="mx-3 mb-2"
      />
    );
  }

  const data = points.map((point) => ({
    label: point.label,
    value: point.value,
    __sort: new Date(point.bucket_start).getTime(),
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rate-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) =>
              currency ? formatCurrencyCompact(value) : formatCompact(value)
            }
          />
          <Tooltip content={<ChartTooltip formatter={currency ? formatCurrency : formatNumber} />} />
          <Area
            type="monotone"
            dataKey="value"
            name="Requests"
            stroke={color}
            strokeWidth={2}
            fill="url(#rate-area)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มีข้อมูล"
        description="ยังไม่มีรายการในช่วงเวลานี้"
        compact
        className="mx-3 mb-2"
      />
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="86%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              const value = Number(item.value ?? 0);
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="text-[11px] font-medium text-slate-500">{item.name}</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {formatNumber(value)}{" "}
                    <span className="text-[10px] font-normal text-slate-400">
                      ({formatPercent(value / total, 0)})
                    </span>
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-slate-900">
          {centerValue ?? formatNumber(total)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-slate-400">
          {centerLabel ?? "รายการทั้งหมด"}
        </span>
      </div>
    </div>
  );
}

export function CategoryBarChart({
  data,
  height = 240,
  color = "#4f46e5",
  currency = false,
  valueLabel = "จำนวน",
}: {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  color?: string;
  currency?: boolean;
  valueLabel?: string;
}) {
  if (!data.length || data.every((item) => item.value === 0)) {
    return (
      <EmptyState
        icon={BarChart3}
        title="ยังไม่มีข้อมูล"
        description="ข้อมูลจะแสดงเมื่อมีการใช้งาน"
        compact
        className="mx-3 mb-2"
      />
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={currency ? 56 : 38}
            tickFormatter={(value: number) =>
              currency ? formatCurrencyCompact(value) : formatCompact(value)
            }
          />
          <Tooltip
            content={<ChartTooltip formatter={currency ? formatCurrency : formatNumber} />}
            cursor={{ fill: "#f8fafc" }}
          />
          <Bar dataKey="value" name={valueLabel} radius={[6, 6, 0, 0]} maxBarSize={42}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color ?? color ?? CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RadialGauge({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  const percent = Math.max(0, Math.min(1, value));
  const color = percent >= 0.8 ? "#e11d48" : percent >= 0.5 ? "#f59e0b" : "#10b981";

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg viewBox="0 0 140 82" className="w-full max-w-[210px]" aria-label={`${label} ${formatPercent(percent)}`}>
        <path
          d="M 14 72 A 56 56 0 0 1 126 72"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 14 72 A 56 56 0 0 1 126 72"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent * 100} 100`}
          className="transition-all duration-700"
        />
        <text x="70" y="62" textAnchor="middle" className="fill-slate-900 text-[18px] font-bold">
          {formatPercent(percent)}
        </text>
      </svg>
      <p className="-mt-1 text-xs font-semibold text-slate-700">{label}</p>
      {detail ? <p className="mt-0.5 text-[10px] text-slate-400">{detail}</p> : null}
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: Array<{ label: string; color?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: item.color ?? CHART_COLORS[index % CHART_COLORS.length] }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
