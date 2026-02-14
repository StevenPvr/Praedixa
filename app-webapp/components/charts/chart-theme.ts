/**
 * Chart theme tokens and constants for D3 visualizations.
 * Uses CSS custom properties for automatic dark/light mode support.
 */

export const CHART_COLORS = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  quaternary: "var(--chart-4)",
  quinary: "var(--chart-5)",
  senary: "var(--chart-6)",
} as const;

export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const CHART_GRID = {
  color: "var(--chart-grid)",
  dashArray: "4 4",
} as const;

export const CHART_AXIS = {
  color: "var(--chart-axis)",
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  tickPadding: 8,
  tickSize: 0,
} as const;

export const CHART_CROSSHAIR = {
  color: "var(--chart-crosshair)",
  dashArray: "3 3",
  width: 1,
} as const;

export const CHART_TOOLTIP = {
  bg: "var(--card-bg)",
  border: "var(--border)",
  text: "var(--ink)",
  textSecondary: "var(--ink-secondary)",
  shadow: "var(--shadow-overlay)",
  radius: "var(--radius-md)",
  padding: { x: 14, y: 10 },
} as const;

export const CHART_CONFIDENCE = {
  fill: "var(--chart-1)",
  opacity: 0.08,
  strokeOpacity: 0.2,
} as const;

export const CHART_THRESHOLD = {
  strokeWidth: 1.5,
  dashArray: "6 4",
  labelFontSize: 10,
} as const;

export const CHART_GRADIENT = {
  areaOpacityStart: 0.25,
  areaOpacityEnd: 0.02,
  barOpacityStart: 0.9,
  barOpacityEnd: 0.7,
} as const;

export const CHART_GLOW = {
  pointRadius: 6,
  pointGlowRadius: 12,
  pointGlowOpacity: 0.3,
} as const;

export const CHART_A11Y = {
  role: "img" as const,
  minPointSize: 24,
} as const;

/** Animation durations for chart transitions */
export const CHART_ANIMATION = {
  drawDuration: 1200,
  fadeInDuration: 500,
  fadeInDelay: 300,
  staggerDelay: 50,
  tooltipDuration: 150,
} as const;

/** Standard margins for chart layout */
export const CHART_MARGIN = {
  top: 16,
  right: 16,
  bottom: 32,
  left: 48,
} as const;

/** Get a color from the series palette by index (wraps around) */
export function getSeriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}
