// Chart color utilities for Tremor charts
// Maps semantic color names to hex values (recharts requires hex, not oklch)

export const chartColors = {
  amber: {
    bg: "var(--tremor-chart-amber)",
    stroke: "var(--tremor-chart-amber)",
    fill: "var(--tremor-chart-amber)",
  },
  success: {
    bg: "var(--tremor-chart-success)",
    stroke: "var(--tremor-chart-success)",
    fill: "var(--tremor-chart-success)",
  },
  warning: {
    bg: "var(--tremor-chart-warning)",
    stroke: "var(--tremor-chart-warning)",
    fill: "var(--tremor-chart-warning)",
  },
  danger: {
    bg: "var(--tremor-chart-danger)",
    stroke: "var(--tremor-chart-danger)",
    fill: "var(--tremor-chart-danger)",
  },
  blue: {
    bg: "var(--tremor-chart-blue)",
    stroke: "var(--tremor-chart-blue)",
    fill: "var(--tremor-chart-blue)",
  },
  gray: {
    bg: "var(--tremor-chart-gray)",
    stroke: "var(--tremor-chart-gray)",
    fill: "var(--tremor-chart-gray)",
  },
} as const;

export type ChartColorKey = keyof typeof chartColors;

/**
 * Risk score to color mapping.
 * green <=0.3, orange 0.3-0.6, red >0.6
 */
export function getRiskColor(score: number): "success" | "warning" | "danger" {
  if (score <= 0.3) return "success";
  if (score <= 0.6) return "warning";
  return "danger";
}

/**
 * Risk score to Tailwind text color class
 */
export function getRiskTextClass(score: number): string {
  if (score <= 0.3) return "text-success-600";
  if (score <= 0.6) return "text-warning-600";
  return "text-danger-600";
}

/**
 * Risk score to Tailwind background color class
 */
export function getRiskBgClass(score: number): string {
  if (score <= 0.3) return "bg-success-50";
  if (score <= 0.6) return "bg-warning-50";
  return "bg-danger-50";
}
