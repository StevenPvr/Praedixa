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
        /* ── Landing-matching surfaces ── */
        cream: "oklch(0.975 0.005 85)",
        charcoal: "oklch(0.16 0.01 55)",
        ink: "oklch(0.16 0.01 55)",
        paper: "oklch(0.998 0.001 85)",
        stone: "oklch(0.96 0.004 80)",

        /* ── Brand: Burnished Brass (matching landing identity) ── */
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

        /* ── Warm neutral scale (matching landing) ── */
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

        /* ── Sidebar ── */
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          hover: "var(--sidebar-bg-hover)",
          active: "var(--sidebar-bg-active)",
          text: "var(--sidebar-text)",
          muted: "var(--sidebar-muted)",
          border: "var(--sidebar-border)",
          accent: "var(--sidebar-accent)",
        },

        /* ── Glows ── */
        glow: {
          brand: "var(--glow-brand)",
          accent: "var(--glow-accent)",
          success: "var(--glow-success)",
          warning: "var(--glow-warning)",
          danger: "var(--glow-danger)",
        },
      },

      spacing: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-collapsed-width)",
        topbar: "var(--topbar-height)",
        "page-x": "var(--page-padding-x)",
        "page-y": "var(--page-padding-y)",
      },

      maxWidth: {
        page: "var(--page-max-width)",
      },

      boxShadow: {
        /* app-specific aliases */
        soft: "var(--shadow-raised)",
        card: "var(--shadow-raised)",
        elevated: "var(--shadow-floating)",
        sidebar: "1px 0 0 var(--sidebar-border)",
        command: "var(--shadow-modal)",
        float: "var(--shadow-floating)",
        premium: "var(--shadow-premium-glow)",
      },

      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
        "shimmer-pearl": "shimmerPearl 2.4s ease-in-out infinite",
        "fade-in": "fadeIn 400ms var(--ease-smooth)",
        "fade-in-scale": "fadeInScale 400ms var(--ease-smooth)",
        "slide-up": "slideUp 500ms var(--ease-smooth)",
        "slide-down": "slideDown 300ms var(--ease-smooth)",
        "slide-in-right": "slideInRight 300ms var(--ease-smooth)",
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "count-up": "countUp 400ms var(--ease-smooth)",
        draw: "draw 1000ms ease forwards",
        "draw-line":
          "drawLine var(--duration-cinematic) var(--ease-smooth) forwards",
        checkmark: "checkmark 300ms ease forwards",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "glow-breath": "glowBreath 2s ease-in-out infinite",
        "glow-in": "glowIn var(--duration-fast) var(--ease-smooth) forwards",
        "scale-in": "scaleIn 300ms var(--ease-smooth)",
        "expand-width":
          "expandWidth var(--duration-slow) var(--ease-smooth) forwards",
        "progress-gradient": "progressGradient 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        ripple: "ripple 600ms ease-out",
        "mesh-gradient": "meshGradient 20s ease-in-out infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand":
          "linear-gradient(135deg, var(--brand) 0%, var(--brand-300) 100%)",
        "gradient-accent":
          "linear-gradient(135deg, var(--accent) 0%, var(--accent-300) 100%)",
        "gradient-page":
          "linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-strong) 100%)",
        "gradient-card": "var(--gradient-card)",
        "gradient-glass": "var(--gradient-glass)",
      },
    },
  },
  safelist: [
    /* Minimal safelist — only dynamically-constructed classes */
    {
      pattern:
        /^(bg|text|border)-(success|warning|danger|info)(-(light|text))?$/,
    },
  ],
  plugins: [],
};
