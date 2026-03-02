/** @type {import('tailwindcss').Config} */
import praedixaPreset from "../packages/ui/tailwind.preset.js";

export default {
  presets: [praedixaPreset],
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "var(--page-bg)",
        charcoal: "var(--ink)",
        ink: "var(--ink)",
        paper: "var(--card-bg)",
        stone: "var(--surface-sunken)",

        neutral: {
          50: "var(--warm-neutral-50)",
          100: "var(--warm-neutral-100)",
          200: "var(--warm-neutral-200)",
          300: "var(--warm-neutral-300)",
          400: "var(--warm-neutral-400)",
          500: "var(--warm-neutral-500)",
          600: "var(--warm-neutral-600)",
          700: "var(--warm-neutral-700)",
          800: "var(--warm-neutral-800)",
          900: "var(--warm-neutral-900)",
        },

        brass: {
          DEFAULT: "var(--brand)",
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-800)",
        },

        gray: {
          secondary: "var(--ink-secondary)",
          muted: "var(--ink-tertiary)",
        },
      },

      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.625rem" }],
        lg: ["1.0625rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "5xl": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },

      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
      },

      boxShadow: {
        xs: "var(--shadow-warm-xs)",
        sm: "var(--shadow-warm-sm)",
        md: "var(--shadow-warm-md)",
        lg: "var(--shadow-warm-lg)",
        "navy-glow": "var(--shadow-navy-glow)",
        "amber-glow": "var(--shadow-amber-glow)",
      },

      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
};
