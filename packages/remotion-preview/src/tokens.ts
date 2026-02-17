/* Praedixa webapp design tokens for Remotion compositions */
export const colors = {
  /* Core surfaces */
  pageBg: "oklch(0.975 0.005 85)",
  pageBgStrong: "oklch(0.96 0.004 80)",
  cardBg: "oklch(0.998 0.001 85)",
  cardBgMuted: "oklch(0.97 0.003 80)",
  surfaceElevated: "oklch(0.998 0.001 85)",
  surfaceSunken: "oklch(0.96 0.004 80)",
  surfaceInteractive: "oklch(0.975 0.005 85)",
  surfaceAlt: "oklch(0.97 0.003 80)",

  /* Typography */
  ink: "oklch(0.16 0.01 55)",
  inkSecondary: "oklch(0.40 0.012 55)",
  inkTertiary: "oklch(0.55 0.008 60)",
  inkPlaceholder: "oklch(0.55 0.008 60)",

  /* Brand */
  primary: "oklch(0.68 0.13 72)",
  primaryDark: "oklch(0.58 0.14 68)",
  primaryLight: "oklch(0.94 0.04 82)",

  /* Brass brand ramp */
  brass: {
    50: "oklch(0.97 0.02 82)",
    100: "oklch(0.94 0.04 82)",
    200: "oklch(0.88 0.07 78)",
    300: "oklch(0.82 0.10 76)",
    400: "oklch(0.78 0.10 78)",
    500: "oklch(0.68 0.13 72)",
    600: "oklch(0.58 0.14 68)",
    700: "oklch(0.48 0.12 65)",
  },

  /* Status */
  success: "oklch(0.65 0.15 155)",
  successLight: "oklch(0.96 0.03 155)",
  successText: "oklch(0.28 0.12 155)",
  warning: "oklch(0.75 0.15 85)",
  warningLight: "oklch(0.97 0.04 70)",
  warningText: "oklch(0.32 0.13 70)",
  danger: "oklch(0.60 0.20 25)",
  dangerLight: "oklch(0.96 0.03 25)",
  dangerText: "oklch(0.28 0.16 25)",
  info: "oklch(0.58 0.16 240)",
  infoLight: "oklch(0.96 0.02 240)",
  infoText: "oklch(0.28 0.12 240)",

  /* Charts */
  chartCapacity: "oklch(0.41 0.095 253)",
  chartDemand: "oklch(0.71 0.135 78)",
  chartImpact: "oklch(0.62 0.18 27)",

  /* Borders */
  border: "oklch(0.87 0.008 65)",
  borderHover: "oklch(0.80 0.01 62)",
  borderSubtle: "oklch(0.92 0.005 70)",
  borderGlow: "oklch(0.68 0.13 72 / 0.15)",

  /* Sidebar */
  sidebarBg: "oklch(0.97 0.004 80)",
  sidebarBgHover: "oklch(0.955 0.006 78)",
  sidebarBgActive: "oklch(0.94 0.04 82)",
  sidebarText: "oklch(0.16 0.01 55)",
  sidebarMuted: "oklch(0.55 0.008 60)",
  sidebarBorder: "oklch(0.92 0.005 70)",
  sidebarAccent: "oklch(0.68 0.13 72 / 0.08)",

  /* Neutrals */
  neutral: {
    50: "oklch(0.985 0.003 70)",
    100: "oklch(0.97 0.004 70)",
    200: "oklch(0.92 0.005 70)",
    300: "oklch(0.87 0.008 65)",
    400: "oklch(0.55 0.008 60)",
    500: "oklch(0.40 0.012 55)",
  },
} as const;

export const layout = {
  logicalWidth: 1920,
  logicalHeight: 1200,
  sidebarWidth: 260,
  topbarHeight: 64,
  contextBarHeight: 46,
  maxPageWidth: 1320,
  pagePaddingX: 32,
  pagePaddingY: 32,
} as const;

export const shadows = {
  raised:
    "0 1px 2px oklch(0.12 0.01 55 / 0.06), 0 1px 3px oklch(0.12 0.01 55 / 0.04)",
  floating:
    "0 0 0 1px oklch(0.12 0.01 55 / 0.04), 0 4px 12px -2px oklch(0.12 0.01 55 / 0.06), 0 8px 24px -4px oklch(0.12 0.01 55 / 0.05)",
  cardHover:
    "0 0 0 1px oklch(0.68 0.13 72 / 0.08), 0 4px 16px -2px oklch(0.12 0.01 55 / 0.06), 0 12px 32px -4px oklch(0.68 0.13 72 / 0.06)",
  premiumGlow:
    "0 0 0 1px oklch(0.68 0.13 72 / 0.10), 0 4px 16px -2px oklch(0.68 0.13 72 / 0.08), 0 12px 40px -8px oklch(0.68 0.13 72 / 0.12)",
} as const;

export const fonts = {
  sans: "Manrope, system-ui, sans-serif",
  serif: "Cormorant Garamond, Georgia, serif",
} as const;
