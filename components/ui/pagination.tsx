"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit?: number;
  onChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const from = total === 0 ? 0 : (page - 1) * (limit ?? 0) + 1;
  const to = limit ? Math.min(page * limit, total) : total;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-ink-secondary">
        แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(total)} รายการ
      </p>
      <div className="flex items-center gap-2">
        {onLimitChange && limit ? (
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            aria-label="จำนวนรายการต่อหน้า"
            className="h-8 rounded-control border border-line bg-surface px-2 text-xs text-ink-secondary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} / หน้า
              </option>
            ))}
          </select>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          icon={<ChevronLeft className="size-3.5" />}
        >
          ก่อนหน้า
        </Button>
        <span className="min-w-16 text-center text-xs font-semibold text-ink-secondary">
          {page} / {safeTotalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= safeTotalPages}
          onClick={() => onChange(page + 1)}
        >
          ถัดไป
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
