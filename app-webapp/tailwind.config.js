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
        // Webapp-specific backgrounds (OKLCH)
        page: "oklch(0.984 0.003 106)",
        card: "oklch(1 0 0)",
        sidebar: {
          DEFAULT: "oklch(0.145 0 0)",
          hover: "oklch(0.21 0.006 250)",
        },
        cream: "oklch(0.984 0.003 106)",
        ink: "oklch(0.117 0 0)",
        paper: "oklch(0.999 0 0)",
        charcoal: "oklch(0.145 0 0)",
      },
      spacing: {
        sidebar: "260px",
        "sidebar-collapsed": "72px",
        topbar: "64px",
      },
      borderRadius: {
        card: "12px",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.03)",
        soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
        card: "0 4px 20px -2px rgba(0,0,0,0.08)",
        "card-hover":
          "0 8px 30px -4px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.04)",
        "card-active":
          "0 1px 2px rgba(0,0,0,0.06), 0 0 0 2px rgba(245,158,11,0.15)",
        elevated:
          "0 12px 40px -8px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)",
        glow: "0 0 30px -5px oklch(0.769 0.205 70 / 0.3)",
        "glow-sm": "0 0 15px -3px oklch(0.769 0.205 70 / 0.2)",
        "glow-amber":
          "0 0 0 1px rgba(245,158,11,0.15), 0 4px 12px rgba(245,158,11,0.1)",
        sidebar: "1px 0 0 #e5e5ea",
        topbar: "0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
      },
      animation: {
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
      },
    },
  },
  safelist: [
    // Tremor uses dynamic class names for chart colors
    {
      pattern:
        /^(bg|border|ring|text|stroke|fill)-(amber|success|warning|danger|gray)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
  ],
  plugins: [],
};
