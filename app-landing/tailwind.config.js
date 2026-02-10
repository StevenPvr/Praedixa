/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Background — warm cream (OKLCH)
        cream: "oklch(0.984 0.003 106)",
        // Text — rich black (OKLCH)
        charcoal: "oklch(0.145 0 0)",
        // Grays (OKLCH)
        gray: {
          secondary: "oklch(0.443 0 0)",
          muted: "oklch(0.556 0 0)",
        },
        // Accent — vibrant amber/gold (OKLCH, P3-enhanced chroma on 400-600)
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
        // Neutral for borders/dividers (OKLCH)
        neutral: {
          50: "oklch(0.985 0 0)",
          100: "oklch(0.970 0 0)",
          200: "oklch(0.922 0 0)",
          300: "oklch(0.871 0 0)",
          400: "oklch(0.714 0 0)",
          500: "oklch(0.556 0 0)",
        },
        // Modern ink/paper (OKLCH)
        ink: "oklch(0.117 0 0)",
        paper: "oklch(0.999 0 0)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 15px -3px oklch(0 0 0 / 0.07), 0 10px 20px -2px oklch(0 0 0 / 0.04)",
        card: "0 4px 20px -2px oklch(0 0 0 / 0.08)",
        glow: "0 0 30px -5px oklch(0.769 0.205 70 / 0.3)",
      },
    },
  },
  plugins: [],
};
