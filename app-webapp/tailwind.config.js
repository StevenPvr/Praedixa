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
        /* ── Premium blue surfaces ── */
        cream: "var(--warm-bg)",
        charcoal: "var(--warm-ink)",
        ink: "var(--warm-ink)",
        paper: "var(--warm-bg-elevated)",
        stone: "var(--warm-bg-muted)",

        /* ── Brand (mapped to shared tokens) ── */
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

        /* ── Blue-neutral scale ── */
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
