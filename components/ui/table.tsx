import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TableShell({
  children,
  label,
  className,
  minWidth = 720,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto">
      <table
        aria-label={label}
        className={cn("w-full border-collapse text-sm", className)}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={cn(
        "bg-surface-subtle text-[11px] uppercase tracking-[0.06em] text-ink-muted",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-surface-subtle/70", className)} {...props}>
      {children}
    </tr>
  );
}

export function Th({
  children,
  className,
  align = "left",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-line px-4 py-3 font-semibold",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
