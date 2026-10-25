import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  light = false,
  size = "md",
  priority = false,
  className,
}: {
  compact?: boolean;
  light?: boolean;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
}) {
  const height = size === "sm" ? 26 : size === "lg" ? 40 : 32;
  const fullWidth = Math.round(height * (720 / 239));

  const logo = compact ? (
    <Image
      src="/brand/apay-mark.png"
      alt="APay"
      width={height}
      height={height}
      priority={priority}
      className="block"
    />
  ) : (
    <Image
      src="/brand/apay-horizontal.png"
      alt="APay"
      width={fullWidth}
      height={height}
      priority={priority}
      className="block h-auto w-auto"
      style={{ height }}
    />
  );

  if (!light) {
    return <span className={cn("inline-flex items-center", className)}>{logo}</span>;
  }

  // Official logo artwork sits on white; use a white plate on dark surfaces
  // instead of recolouring the asset.
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-card bg-surface px-2.5 py-1.5 shadow-card",
        className,
      )}
    >
      {logo}
    </span>
  );
}
