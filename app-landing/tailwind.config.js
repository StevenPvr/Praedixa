/** @type {import('tailwindcss').Config} */
import praedixaPreset from "../packages/ui/tailwind.preset.js";

export default {
  presets: [praedixaPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Surfaces ── */
        cream: "oklch(0.975 0.008 80)",
        charcoal: "oklch(0.22 0.015 60)",
        ink: "oklch(0.20 0.018 65)",
        paper: "oklch(0.998 0.001 85)",
        stone: "oklch(0.96 0.006 78)",

        /* ── Neutral scale (warm undertone) ── */
        neutral: {
          50: "oklch(0.985 0.003 70)",
          100: "oklch(0.97 0.004 70)",
          200: "oklch(0.92 0.005 70)",
          300: "oklch(0.87 0.008 65)",
          400: "oklch(0.72 0.01 60)",
          500: "oklch(0.55 0.008 60)",
          600: "oklch(0.40 0.012 55)",
          700: "oklch(0.30 0.01 55)",
          800: "oklch(0.22 0.01 55)",
          900: "oklch(0.16 0.01 55)",
        },

        /* ── Brand: Burnished Brass ── */
        brass: {
          DEFAULT: "oklch(0.68 0.13 72)",
          50: "oklch(0.97 0.02 82)",
          100: "oklch(0.94 0.04 82)",
          200: "oklch(0.88 0.07 78)",
          300: "oklch(0.82 0.10 76)",
          400: "oklch(0.78 0.10 78)",
          500: "oklch(0.68 0.13 72)",
          600: "oklch(0.58 0.14 68)",
          700: "oklch(0.48 0.12 65)",
          800: "oklch(0.38 0.10 62)",
          900: "oklch(0.28 0.08 58)",
        },

        /* ── Legacy amber alias (for backward compat during migration) ── */
        amber: {
          50: "oklch(0.97 0.02 82)",
          200: "oklch(0.88 0.07 78)",
          400: "oklch(0.78 0.10 78)",
          500: "oklch(0.68 0.13 72)",
          700: "oklch(0.48 0.12 65)",
        },

        gray: {
          secondary: "oklch(0.40 0.012 55)",
          muted: "oklch(0.55 0.008 60)",
        },
      },

      fontFamily: {
        sans: [
          "Manrope",
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
        /* Fine-tuned typographic scale */
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
        xs: "0 1px 2px oklch(0.12 0.01 55 / 0.06)",
        sm: "0 1px 3px oklch(0.12 0.01 55 / 0.08), 0 4px 8px -2px oklch(0.12 0.01 55 / 0.04)",
        md: "0 2px 6px oklch(0.12 0.01 55 / 0.06), 0 8px 24px -4px oklch(0.12 0.01 55 / 0.08)",
        lg: "0 4px 12px oklch(0.12 0.01 55 / 0.05), 0 16px 40px -8px oklch(0.12 0.01 55 / 0.1)",
        "brass-glow":
          "0 0 20px -4px oklch(0.68 0.13 72 / 0.25), 0 0 40px -8px oklch(0.68 0.13 72 / 0.12)",
      },

      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
};
