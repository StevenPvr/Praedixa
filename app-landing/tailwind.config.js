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
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        serif: [
          "Cormorant Garamond",
          "ui-serif",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.625rem" }],
        lg: ["1.0625rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
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
        xs: "0 1px 2px oklch(0.24 0.03 248 / 0.06)",
        sm: "0 1px 3px oklch(0.24 0.03 248 / 0.08), 0 4px 8px -2px oklch(0.24 0.03 248 / 0.04)",
        md: "0 2px 6px oklch(0.24 0.03 248 / 0.06), 0 8px 24px -4px oklch(0.24 0.03 248 / 0.08)",
        lg: "0 4px 12px oklch(0.24 0.03 248 / 0.05), 0 16px 40px -8px oklch(0.24 0.03 248 / 0.1)",
        "brass-glow": "var(--shadow-brass-glow)",
      },

      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
};
