/** @type {import('tailwindcss').Config} */
import praedixaPreset from "../packages/ui/tailwind.preset.js";

export default {
  presets: [praedixaPreset],
  darkMode: "class",
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
        charcoal: "var(--text-primary)",
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          hover: "var(--sidebar-hover)",
          active: "var(--sidebar-active)",
          text: "var(--sidebar-text)",
          "text-muted": "var(--sidebar-text-muted)",
          border: "var(--sidebar-border)",
        },
        admin: {
          primary: "var(--brand)",
          surface: "var(--sidebar-bg)",
          "on-surface": "var(--sidebar-text)",
        },
        plan: {
          free: "var(--ink-tertiary)",
          starter: "var(--info)",
          professional: "var(--brand)",
          enterprise: "var(--brand-700)",
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
        soft: "var(--shadow-raised)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)",
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
    {
      pattern:
        /^(bg|border|ring|text|stroke|fill)-(primary|success|warning|danger|info|gray)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
  ],
  plugins: [],
};
