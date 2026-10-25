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
import { CHART_AXIS, CHART_COLORS, CHART_CURSOR, CHART_GRID, CHART_MUTED_TRACK, CHART_TOOLTIP_CURSOR, SEMANTIC_COLORS } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

export { CHART_COLORS };

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
    <div className="min-w-36 rounded-card border border-line bg-surface p-3 shadow-raised">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: entry.color ?? CHART_COLORS[index] }}
              />
              {entry.name}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-ink">
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
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={`กราฟ ${series.map((item) => item.label).join(", ")}`}
    >
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
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            width={currency ? 56 : 40}
            tickFormatter={(value: number) =>
              currency ? formatCurrencyCompact(value) : formatCompact(value)
            }
          />
          <Tooltip
            content={<ChartTooltip formatter={format} />}
            cursor={{ stroke: CHART_CURSOR, strokeDasharray: "3 3" }}
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
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={`กราฟ GMV และ Average Order Value`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            width={58}
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={52}
            tick={{ fontSize: 10, fill: CHART_AXIS }}
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
              fill={CHART_COLORS[0]}
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
              stroke={CHART_COLORS[1]}
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
  color = CHART_COLORS[2],
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
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={`กราฟ ${currency ? "ยอดเงิน" : "จำนวน"}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rate-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: CHART_AXIS }}
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
      <div
        className="h-full w-full"
        role="img"
        aria-label={`สัดส่วน ${data.map((item) => item.name).join(", ")}`}
      >
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
                <div className="rounded-card border border-line bg-surface p-3 shadow-raised">
                  <p className="text-[11px] font-medium text-ink-secondary">{item.name}</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatNumber(value)}{" "}
                    <span className="text-[11px] font-normal text-ink-muted">
                      ({formatPercent(value / total, 0)})
                    </span>
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-ink">
          {centerValue ?? formatNumber(total)}
        </span>
        <span className="mt-0.5 text-[11px] font-medium text-ink-muted">
          {centerLabel ?? "รายการทั้งหมด"}
        </span>
      </div>
    </div>
  );
}

export function CategoryBarChart({
  data,
  height = 240,
  color = CHART_COLORS[2],
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
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={`กราฟแท่ง ${valueLabel} ${data.map((item) => item.name).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            axisLine={false}
            tickLine={false}
            width={currency ? 56 : 38}
            tickFormatter={(value: number) =>
              currency ? formatCurrencyCompact(value) : formatCompact(value)
            }
          />
          <Tooltip
            content={<ChartTooltip formatter={currency ? formatCurrency : formatNumber} />}
            cursor={{ fill: CHART_TOOLTIP_CURSOR }}
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
  const color =
    percent >= 0.8
      ? SEMANTIC_COLORS.danger
      : percent >= 0.5
        ? SEMANTIC_COLORS.warning
        : CHART_COLORS[0];

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg
        viewBox="0 0 140 82"
        className="w-full max-w-[210px]"
        role="img"
        aria-label={`${label} ${formatPercent(percent)}`}
      >
        <path
          d="M 14 72 A 56 56 0 0 1 126 72"
          fill="none"
          stroke={CHART_MUTED_TRACK}
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
        <text x="70" y="62" textAnchor="middle" className="fill-ink text-[18px] font-bold">
          {formatPercent(percent)}
        </text>
      </svg>
      <p className="-mt-1 text-xs font-semibold text-ink-secondary">{label}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-ink-muted">{detail}</p> : null}
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
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
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
