import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-card shadow-brand/25 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-brand",
  secondary:
    "border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-surface-subtle focus-visible:outline-brand",
  ghost:
    "text-ink-secondary hover:bg-surface-muted hover:text-ink focus-visible:outline-brand",
  danger:
    "bg-danger text-white shadow-card shadow-danger/20 hover:bg-danger-ink focus-visible:outline-danger",
  dark: "bg-ink text-white hover:bg-ink/90 focus-visible:outline-ink",
  outline:
    "border border-brand-border bg-brand-soft text-brand-ink hover:bg-brand-border/60 focus-visible:outline-brand",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-control px-3 text-xs",
  md: "h-10 gap-2 rounded-card px-4 text-sm",
  lg: "h-11 gap-2 rounded-card px-5 text-sm",
  icon: "size-9 rounded-control",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
