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
        ink: {
          DEFAULT: "var(--ink-950)",
          950: "var(--ink-950)",
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
          600: "var(--ink-600)",
        },
        paper: "var(--card-bg)",
        stone: "var(--surface-sunken)",

        surface: {
          0: "var(--surface-0)",
          50: "var(--surface-50)",
          75: "var(--surface-75)",
          100: "var(--surface-100)",
          dark: "var(--surface-dark)",
        },

        "v2-border": {
          100: "var(--border-100)",
          200: "var(--border-200)",
          300: "var(--border-300)",
        },

        signal: {
          500: "var(--signal-500)",
          100: "var(--signal-100)",
        },

        proof: {
          500: "var(--proof-500)",
          100: "var(--proof-100)",
        },

        risk: {
          500: "var(--risk-500)",
          100: "var(--risk-100)",
        },

        danger: {
          500: "var(--danger-500)",
        },

        "v2-success": {
          500: "var(--success-500)",
        },

        /* Backward compat with existing code referencing neutral-*, brass-* */
        neutral: {
          50: "var(--surface-50)",
          100: "var(--surface-100)",
          200: "var(--border-100)",
          300: "var(--border-200)",
          400: "var(--ink-600)",
          500: "var(--ink-600)",
          600: "var(--ink-700)",
          700: "var(--ink-700)",
          800: "var(--ink-800)",
          900: "var(--ink-900)",
          950: "var(--ink-950)",
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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
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
        chip: "999px",
        input: "16px",
        card: "24px",
        panel: "28px",
      },

      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        xs: "var(--shadow-1)",
        sm: "var(--shadow-1)",
        md: "var(--shadow-2)",
        lg: "var(--shadow-3)",
        "navy-glow": "0 0 20px rgba(91, 115, 255, 0.25)",
        "amber-glow": "0 0 20px rgba(240, 179, 93, 0.25)",
      },

      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        entry: "cubic-bezier(0.22, 1, 0.36, 1)",
      },

      maxWidth: {
        content: "var(--content-max)",
        text: "var(--text-max)",
      },
    },
  },
};
