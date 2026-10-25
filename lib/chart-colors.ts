/**
 * Chart palette mirrors the APay design tokens in `app/globals.css`.
 * Recharts needs concrete hex values for SVG fills, so keep this list as the
 * single source for chart colours and update it together with the tokens.
 */
export const CHART_COLORS = [
  "#6554F0", // brand
  "#9B4DF0", // brand purple
  "#6877EE", // brand blue
  "#2563EB", // info
  "#06B6D4", // cyan
  "#059669", // success
  "#D97706", // warning
  "#DC2626", // danger
  "#5F6F86", // muted
];

/** Recharts needs concrete hex values for SVG strokes and grids. */
export const CHART_GRID = "#E2E8F0";
export const CHART_AXIS = "#5F6F86";
export const CHART_CURSOR = "#CBD5E1";
export const CHART_MUTED_TRACK = "#F1F5F9";
export const CHART_TOOLTIP_CURSOR = "#F8F9FF";

/** Status colours stay semantic — never brand-tinted. */
export const STATUS_COLORS = {
  paid: "#059669",
  unverifiedActive: "#D97706",
  unverifiedExpired: "#94A3B8",
  expired: "#DC2626",
} as const;

/** Semantic colours for charts that are not tied to payment status. */
export const SEMANTIC_COLORS = {
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  neutral: "#94A3B8",
  brand: "#6554F0",
} as const;
