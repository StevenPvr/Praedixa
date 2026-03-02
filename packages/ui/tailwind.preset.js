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
        /* ── Semantic surfaces (CSS var driven — auto dark mode) ── */
        page: "var(--page-bg)",
        card: "var(--card-bg)",
        cream: "var(--page-bg)",
        surface: {
          DEFAULT: "var(--card-bg)",
          alt: "var(--card-bg-muted)",
          muted: "var(--card-bg-muted)",
          elevated: "var(--surface-elevated)",
          sunken: "var(--surface-sunken)",
          interactive: "var(--surface-interactive)",
          overlay: "var(--surface-overlay)",
        },
        glass: {
          DEFAULT: "var(--glass-bg)",
          strong: "var(--glass-bg-strong)",
          border: "var(--glass-border)",
        },

        /* ── Typography ── */
        ink: {
          DEFAULT: "var(--ink)",
          secondary: "var(--ink-secondary)",
          tertiary: "var(--ink-tertiary)",
          placeholder: "var(--ink-placeholder)",
          "on-color": "var(--ink-on-color)",
        },
        charcoal: "var(--ink)",

        /* ── Brand ── */
        primary: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          DEFAULT: "var(--brand)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          light: "var(--brand-subtle)",
          dark: "var(--brand-strong)",
          glow: "var(--glow-primary)",
        },

        /* ── Navy (Praedixa primary — direct primitive access) ── */
        navy: {
          50: "var(--navy-50)",
          100: "var(--navy-100)",
          200: "var(--navy-200)",
          300: "var(--navy-300)",
          400: "var(--navy-400)",
          500: "var(--navy-500)",
          DEFAULT: "var(--navy-500)",
          600: "var(--navy-600)",
          700: "var(--navy-700)",
          800: "var(--navy-800)",
          900: "var(--navy-900)",
        },

        /* ── Amber (Praedixa accent — maps to semantic accent vars) ── */
        amber: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent)",
          DEFAULT: "var(--accent)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
        },

        /* ── Accent (semantic alias) ── */
        accent: {
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          DEFAULT: "var(--accent)",
          500: "var(--accent)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
          strong: "var(--accent-strong)",
        },

        /* ── Borders ── */
        border: {
          DEFAULT: "var(--border)",
          hover: "var(--border-hover)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          glow: "var(--border-glow)",
        },

        /* ── Status ── */
        success: {
          50: "var(--success-light)",
          100: "color-mix(in oklch, var(--success-light) 80%, var(--card-bg) 20%)",
          200: "color-mix(in oklch, var(--success) 28%, var(--card-bg) 72%)",
          500: "var(--success)",
          600: "var(--success)",
          700: "var(--success-text)",
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
          text: "var(--success-text)",
        },
        warning: {
          50: "var(--warning-light)",
          100: "color-mix(in oklch, var(--warning-light) 80%, var(--card-bg) 20%)",
          200: "color-mix(in oklch, var(--warning) 28%, var(--card-bg) 72%)",
          500: "var(--warning)",
          600: "var(--warning)",
          700: "var(--warning-text)",
          DEFAULT: "var(--warning)",
          light: "var(--warning-light)",
          text: "var(--warning-text)",
        },
        danger: {
          50: "var(--danger-light)",
          100: "color-mix(in oklch, var(--danger-light) 80%, var(--card-bg) 20%)",
          200: "color-mix(in oklch, var(--danger) 28%, var(--card-bg) 72%)",
          500: "var(--danger)",
          600: "var(--danger)",
          700: "var(--danger-text)",
          DEFAULT: "var(--danger)",
          light: "var(--danger-light)",
          text: "var(--danger-text)",
        },
        info: {
          50: "var(--info-light)",
          100: "color-mix(in oklch, var(--info-light) 80%, var(--card-bg) 20%)",
          200: "color-mix(in oklch, var(--info) 28%, var(--card-bg) 72%)",
          500: "var(--info)",
          600: "var(--info)",
          700: "var(--info-text)",
          DEFAULT: "var(--info)",
          light: "var(--info-light)",
          text: "var(--info-text)",
        },

        /* ── Charts ── */
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          6: "var(--chart-6)",
          grid: "var(--chart-grid)",
          axis: "var(--chart-axis)",
          crosshair: "var(--chart-crosshair)",
        },

        /* ── Grays (OKLCH) — blue-neutral scale ── */
        gray: {
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

        /* ── Tremor compatibility (CSS var driven) ── */
        tremor: {
          brand: {
            faint: "var(--brand-50)",
            muted: "var(--brand-200)",
            subtle: "var(--brand-300)",
            DEFAULT: "var(--brand)",
            emphasis: "var(--brand-600)",
            inverted: "var(--ink-on-color)",
          },
          background: {
            muted: "var(--card-bg-muted)",
            subtle: "var(--surface-sunken)",
            DEFAULT: "var(--card-bg)",
            emphasis: "var(--ink-secondary)",
          },
          border: {
            DEFAULT: "var(--border)",
          },
          ring: {
            DEFAULT: "var(--border)",
          },
          content: {
            subtle: "var(--ink-tertiary)",
            DEFAULT: "var(--ink-secondary)",
            emphasis: "var(--ink)",
            strong: "var(--ink)",
            inverted: "var(--ink-on-color)",
          },
        },
      },

      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        card: "var(--radius-lg)",
        button: "var(--radius-md)",
        full: "var(--radius-full)",
        /* tremor compat */
        "tremor-small": "var(--radius-xs)",
        "tremor-default": "var(--radius-md)",
        "tremor-full": "var(--radius-full)",
      },

      fontSize: {
        /* Praedixa type scale */
        "display-lg": [
          "3rem",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" },
        ],
        display: [
          "2.25rem",
          { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "700" },
        ],
        "display-sm": [
          "1.875rem",
          { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "heading-lg": [
          "1.5rem",
          { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        heading: [
          "1.25rem",
          { lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "heading-sm": [
          "1.125rem",
          { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        title: [
          "1rem",
          { lineHeight: "1.4", letterSpacing: "-0.006em", fontWeight: "600" },
        ],
        "title-sm": [
          "0.875rem",
          { lineHeight: "1.4", letterSpacing: "0em", fontWeight: "600" },
        ],
        body: [
          "0.9375rem",
          { lineHeight: "1.6", letterSpacing: "-0.006em", fontWeight: "400" },
        ],
        "body-sm": [
          "0.8125rem",
          { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" },
        ],
        caption: [
          "0.75rem",
          { lineHeight: "1.4", letterSpacing: "0em", fontWeight: "400" },
        ],
        overline: [
          "0.6875rem",
          {
            lineHeight: "1.3",
            letterSpacing: "0.06em",
            fontWeight: "600",
            textTransform: "uppercase",
          },
        ],
        "body-compact": [
          "0.8125rem",
          { lineHeight: "1.35", letterSpacing: "0em", fontWeight: "400" },
        ],
        "caption-compact": [
          "0.6875rem",
          { lineHeight: "1.25", letterSpacing: "0em", fontWeight: "400" },
        ],
        metric: [
          "2rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "metric-sm": [
          "1.5rem",
          { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" },
        ],
        "metric-xs": [
          "1.125rem",
          { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        /* tremor compat */
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },

      boxShadow: {
        flat: "var(--shadow-flat)",
        raised: "var(--shadow-raised)",
        floating: "var(--shadow-floating)",
        overlay: "var(--shadow-overlay)",
        modal: "var(--shadow-modal)",
        "card-hover": "var(--shadow-card-hover)",
        "premium-glow": "var(--shadow-premium-glow)",
        glow: "0 0 24px -6px var(--glow-brand)",
        glass: "0 0 0 1px var(--glass-border), var(--shadow-raised)",
        /* tremor compat */
        "tremor-input": "var(--shadow-raised)",
        "tremor-card": "var(--shadow-raised)",
        "tremor-dropdown": "var(--shadow-floating)",
      },

      transitionDuration: {
        instant: "var(--duration-instant)",
        micro: "var(--duration-micro)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        cinematic: "var(--duration-cinematic)",
      },

      transitionTimingFunction: {
        snappy: "var(--ease-snappy)",
        smooth: "var(--ease-smooth)",
        bounce: "var(--ease-bounce)",
        dramatic: "var(--ease-dramatic)",
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        ".shine-effect": {
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 35%, var(--shine-40, oklch(1 0 0 / 0.04)) 40%, var(--shine-50, oklch(1 0 0 / 0.10)) 45%, var(--shine-60, oklch(1 0 0 / 0.14)) 50%, var(--shine-50, oklch(1 0 0 / 0.10)) 55%, var(--shine-40, oklch(1 0 0 / 0.04)) 60%, transparent 65%)",
            transform: "translateX(-120%)",
            transition:
              "transform var(--duration-cinematic, 400ms) var(--ease-smooth, cubic-bezier(0.33, 1, 0.68, 1))",
            pointerEvents: "none",
            borderRadius: "inherit",
          },
          "&:hover::after": {
            transform: "translateX(120%)",
          },
        },
      });
    },
  ],
};
