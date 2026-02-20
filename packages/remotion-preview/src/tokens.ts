/* Praedixa webapp design tokens for Remotion compositions */
export const colors = {
  /* Core surfaces (aligned with app-webapp light theme) */
  pageBg: "oklch(0.965 0.012 246)",
  pageBgStrong: "oklch(0.935 0.018 246)",
  cardBg: "oklch(0.995 0.004 246)",
  cardBgMuted: "oklch(0.985 0.008 246)",
  surfaceElevated: "oklch(0.995 0.004 246)",
  surfaceSunken: "oklch(0.935 0.018 246)",
  surfaceInteractive: "oklch(0.965 0.012 246)",
  surfaceAlt: "oklch(0.985 0.008 246)",
  screenBlack: "#000000",

  /* Typography */
  ink: "oklch(0.24 0.04 248)",
  inkSecondary: "oklch(0.38 0.03 248)",
  inkTertiary: "oklch(0.53 0.02 248)",
  inkPlaceholder: "oklch(0.53 0.02 248)",

  /* Brand */
  primary: "oklch(0.54 0.155 246)",
  primaryDark: "oklch(0.45 0.13 247)",
  primaryLight: "oklch(0.72 0.13 246)",

  /* Brand ramp */
  brass: {
    50: "oklch(0.985 0.015 244)",
    100: "oklch(0.955 0.03 244)",
    200: "oklch(0.905 0.055 245)",
    300: "oklch(0.82 0.09 245)",
    400: "oklch(0.72 0.13 246)",
    500: "oklch(0.63 0.165 246)",
    600: "oklch(0.54 0.155 246)",
    700: "oklch(0.45 0.13 247)",
  },

  /* Status */
  success: "oklch(0.65 0.15 155)",
  successLight: "oklch(0.96 0.03 155)",
  successText: "oklch(0.28 0.12 155)",
  warning: "oklch(0.72 0.12 88)",
  warningLight: "oklch(0.98 0.03 90)",
  warningText: "oklch(0.42 0.09 84)",
  danger: "oklch(0.60 0.20 25)",
  dangerLight: "oklch(0.96 0.03 25)",
  dangerText: "oklch(0.28 0.16 25)",
  info: "oklch(0.62 0.11 226)",
  infoLight: "oklch(0.96 0.02 226)",
  infoText: "oklch(0.30 0.08 226)",

  /* Charts */
  chartCapacity: "oklch(0.54 0.14 245)",
  chartDemand: "oklch(0.54 0.155 246)",
  chartImpact: "oklch(0.60 0.20 25)",

  /* Borders */
  border: "oklch(0.84 0.016 247)",
  borderHover: "oklch(0.66 0.03 247)",
  borderSubtle: "oklch(0.90 0.012 247)",
  borderGlow: "oklch(0.63 0.165 246 / 0.28)",

  /* Sidebar */
  sidebarBg: "oklch(0.90 0.08 255)",
  sidebarBgHover: "oklch(0.85 0.10 256)",
  sidebarBgActive: "oklch(0.955 0.03 244)",
  sidebarText: "oklch(0.24 0.04 248)",
  sidebarMuted: "oklch(0.53 0.02 248)",
  sidebarBorder: "oklch(0.90 0.012 247)",
  sidebarAccent: "oklch(0.63 0.165 246 / 0.24)",

  /* Neutrals */
  neutral: {
    50: "oklch(0.99 0.005 246)",
    100: "oklch(0.97 0.008 246)",
    200: "oklch(0.93 0.012 247)",
    300: "oklch(0.86 0.016 247)",
    400: "oklch(0.72 0.02 248)",
    500: "oklch(0.58 0.02 248)",
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
    "0 1px 2px oklch(0.24 0.03 248 / 0.07), 0 1px 3px oklch(0.24 0.03 248 / 0.05)",
  floating:
    "0 0 0 1px oklch(0.22 0.035 255 / 0.07), 0 4px 14px -2px oklch(0.22 0.035 255 / 0.11), 0 10px 28px -6px oklch(0.22 0.035 255 / 0.09)",
  cardHover:
    "0 0 0 1px oklch(0.63 0.165 246 / 0.22), 0 4px 18px -2px oklch(0.24 0.03 248 / 0.10), 0 14px 36px -6px oklch(0.63 0.165 246 / 0.16)",
  premiumGlow:
    "0 0 0 1px oklch(0.63 0.165 246 / 0.26), 0 4px 20px -2px oklch(0.63 0.165 246 / 0.20), 0 16px 46px -10px oklch(0.63 0.165 246 / 0.26)",
} as const;

export const fonts = {
  sans: "Manrope, system-ui, sans-serif",
  serif: "Cormorant Garamond, Georgia, serif",
} as const;
