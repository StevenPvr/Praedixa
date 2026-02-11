/** @type {import('tailwindcss').Config} */
import praedixaPreset from "../packages/ui/tailwind.preset.js";

export default {
  presets: [praedixaPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--page-bg)",
        card: "var(--card-bg)",
        surface: {
          DEFAULT: "var(--card-bg)",
          muted: "var(--card-bg-muted)",
        },
        charcoal: "oklch(0.23 0.018 255)",
        ink: {
          DEFAULT: "var(--ink)",
          secondary: "var(--ink-secondary)",
          tertiary: "var(--ink-tertiary)",
          inverted: "oklch(0.97 0.006 95)",
        },
        primary: {
          DEFAULT: "var(--brand)",
          light: "oklch(0.93 0.03 253)",
          dark: "var(--brand-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          hover: "var(--sidebar-bg-hover)",
          active: "var(--sidebar-bg-active)",
          text: "var(--sidebar-text)",
          muted: "var(--sidebar-muted)",
        },
        success: {
          DEFAULT: "oklch(0.67 0.13 160)",
          light: "oklch(0.96 0.03 160)",
          text: "oklch(0.42 0.102 160)",
        },
        warning: {
          DEFAULT: "oklch(0.75 0.15 78)",
          light: "oklch(0.97 0.045 78)",
          text: "oklch(0.47 0.11 78)",
        },
        danger: {
          DEFAULT: "oklch(0.62 0.18 27)",
          light: "oklch(0.96 0.03 27)",
          text: "oklch(0.41 0.12 27)",
        },
      },
      spacing: {
        sidebar: "300px",
        "sidebar-collapsed": "88px",
        topbar: "76px",
      },
      borderRadius: {
        card: "22px",
        button: "12px",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 3px 12px rgba(20, 25, 38, 0.05)",
        card: "0 0 0 1px rgba(24, 32, 54, 0.06), 0 8px 24px rgba(24, 32, 54, 0.06)",
        "card-hover":
          "0 0 0 1px rgba(24, 32, 54, 0.09), 0 18px 36px rgba(24, 32, 54, 0.12)",
        elevated: "0 24px 30px -10px rgba(24, 32, 54, 0.22)",
        sidebar:
          "1px 0 0 rgba(255,255,255,0.06), 16px 0 30px rgba(6,12,22,0.2)",
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "fade-in": "fadeIn 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 420ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "240ms",
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg|border|ring|text|stroke|fill)-(amber|success|warning|danger|gray|slate|blue|emerald|rose)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
  ],
  plugins: [],
};
