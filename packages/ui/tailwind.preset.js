/** @type {import('tailwindcss').Config} */

/*
 * Praedixa shared Tailwind preset — DRY extraction of design tokens
 * used across webapp, admin, and (partially) landing.
 *
 * Usage in each app's tailwind.config.js:
 *   import praedixaPreset from "@praedixa/ui/tailwind.preset";
 *   export default { presets: [praedixaPreset], ... }
 */

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Accent — amber/gold (OKLCH, P3-enhanced chroma on 400-600)
        amber: {
          50: "oklch(0.987 0.022 95)",
          100: "oklch(0.962 0.059 95)",
          200: "oklch(0.924 0.12 96)",
          300: "oklch(0.879 0.169 91.6)",
          400: "oklch(0.828 0.208 84)",
          500: "oklch(0.769 0.205 70)",
          600: "oklch(0.666 0.195 58)",
          700: "oklch(0.555 0.163 49)",
        },
        // Grays (OKLCH) — full scale for webapp/admin
        gray: {
          50: "oklch(0.985 0.001 250)",
          100: "oklch(0.968 0.001 250)",
          200: "oklch(0.922 0.004 250)",
          300: "oklch(0.871 0.006 250)",
          400: "oklch(0.714 0.01 250)",
          500: "oklch(0.556 0.014 250)",
          600: "oklch(0.446 0.014 250)",
          700: "oklch(0.373 0.012 250)",
          800: "oklch(0.278 0.008 250)",
          900: "oklch(0.21 0.006 250)",
        },
        // Status colors (OKLCH)
        success: {
          50: "oklch(0.982 0.018 155)",
          100: "oklch(0.962 0.044 155)",
          500: "oklch(0.723 0.219 149)",
          600: "oklch(0.627 0.194 149)",
          700: "oklch(0.527 0.154 150)",
        },
        warning: {
          50: "oklch(0.987 0.022 80)",
          100: "oklch(0.962 0.059 75)",
          500: "oklch(0.702 0.183 55)",
          600: "oklch(0.646 0.178 50)",
          700: "oklch(0.553 0.152 46)",
        },
        danger: {
          50: "oklch(0.971 0.013 17)",
          100: "oklch(0.936 0.032 17)",
          500: "oklch(0.577 0.245 27)",
          600: "oklch(0.522 0.227 25)",
          700: "oklch(0.450 0.193 24)",
        },
        // Tremor internals — map to our OKLCH palette
        tremor: {
          brand: {
            faint: "oklch(0.987 0.022 95)",
            muted: "oklch(0.924 0.12 96)",
            subtle: "oklch(0.828 0.208 84)",
            DEFAULT: "oklch(0.769 0.205 70)",
            emphasis: "oklch(0.666 0.195 58)",
            inverted: "oklch(1 0 0)",
          },
          background: {
            muted: "oklch(0.985 0.001 250)",
            subtle: "oklch(0.968 0.001 250)",
            DEFAULT: "oklch(1 0 0)",
            emphasis: "oklch(0.373 0.012 250)",
          },
          border: {
            DEFAULT: "oklch(0.922 0.004 250)",
          },
          ring: {
            DEFAULT: "oklch(0.922 0.004 250)",
          },
          content: {
            subtle: "oklch(0.556 0.014 250)",
            DEFAULT: "oklch(0.446 0.014 250)",
            emphasis: "oklch(0.373 0.012 250)",
            strong: "oklch(0.21 0.006 250)",
            inverted: "oklch(1 0 0)",
          },
        },
      },
      borderRadius: {
        "tremor-small": "4px",
        "tremor-default": "8px",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      boxShadow: {
        // Tremor shadows
        "tremor-input": "0 1px 2px 0 rgba(0,0,0,0.05)",
        "tremor-card": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "tremor-dropdown":
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
      },
    },
  },
};
