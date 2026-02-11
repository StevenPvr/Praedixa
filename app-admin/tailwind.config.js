/** @type {import('tailwindcss').Config} */
import praedixaPreset from "../packages/ui/tailwind.preset.js";

export default {
  presets: [praedixaPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    // Tremor — allow Tailwind to scan Tremor's classes
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Admin-specific backgrounds (OKLCH)
        page: "oklch(0.975 0.001 250)",
        card: "oklch(1 0 0)",

        // Admin dark sidebar (OKLCH) — KEY visual differentiator from client webapp
        sidebar: {
          DEFAULT: "oklch(0.2 0.02 250)",
          hover: "oklch(0.25 0.02 250)",
          active: "oklch(0.28 0.02 250)",
          text: "oklch(0.85 0.01 250)",
          "text-muted": "oklch(0.6 0.01 250)",
          border: "oklch(0.3 0.02 250)",
        },

        // Admin surface tokens
        admin: {
          primary: "oklch(0.769 0.205 70)",
          surface: "oklch(0.2 0.02 250)",
          "on-surface": "oklch(0.95 0 0)",
        },

        charcoal: "oklch(0.145 0 0)",

        // Plan badge colors (OKLCH)
        plan: {
          free: "oklch(0.556 0.014 250)",
          starter: "oklch(0.588 0.158 241)",
          professional: "oklch(0.769 0.205 70)",
          enterprise: "oklch(0.541 0.19 293)",
        },

        // Blue — for info badges and plan-starter
        blue: {
          50: "oklch(0.97 0.014 241)",
          100: "oklch(0.932 0.032 241)",
          500: "oklch(0.588 0.158 241)",
          600: "oklch(0.546 0.158 241)",
          700: "oklch(0.488 0.143 241)",
        },

        // Violet — for enterprise plan badge
        violet: {
          50: "oklch(0.969 0.016 293)",
          100: "oklch(0.943 0.04 293)",
          500: "oklch(0.541 0.19 293)",
          600: "oklch(0.491 0.185 293)",
          700: "oklch(0.432 0.165 293)",
        },
      },
      spacing: {
        sidebar: "260px",
        "sidebar-collapsed": "72px",
        topbar: "64px",
      },
      borderRadius: {
        card: "8px",
        "2xl": "1rem",
      },
      boxShadow: {
        // Use rgba for shadows — oklch in box-shadow is unsupported on Safari < 17.4
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)",
        // Admin sidebar: subtle light glow instead of dark border
        sidebar: "1px 0 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "toast-slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "toast-slide-out": {
          from: { transform: "translateX(0)", opacity: "1" },
          to: { transform: "translateX(100%)", opacity: "0" },
        },
      },
      animation: {
        "toast-in": "toast-slide-in 300ms ease-out",
        "toast-out": "toast-slide-out 200ms ease-in forwards",
      },
    },
  },
  safelist: [
    // Tremor + plan/status badges use dynamic class names
    {
      pattern:
        /^(bg|border|ring|text|stroke|fill)-(amber|success|warning|danger|gray|blue|violet)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
  ],
  plugins: [],
};
