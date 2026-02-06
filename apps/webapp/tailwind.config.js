/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Dashboard backgrounds (OKLCH)
        page: "oklch(0.975 0.001 250)",
        card: "oklch(1 0 0)",
        sidebar: {
          DEFAULT: "oklch(1 0 0)",
          hover: "oklch(0.985 0 0)",
        },
        // Text (OKLCH)
        charcoal: "oklch(0.145 0 0)",
        // Grays (OKLCH)
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
        // Use rgba for shadows — oklch in box-shadow is unsupported on Safari < 17.4
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)",
        sidebar: "1px 0 0 #e5e5ea",
      },
    },
  },
  plugins: [],
};
