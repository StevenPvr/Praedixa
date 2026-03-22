import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        ink: "hsl(var(--ink))",
        limestone: "hsl(var(--limestone))",
        steel: "hsl(var(--steel))",
        oxide: {
          DEFAULT: "hsl(var(--oxide))",
          soft: "hsl(var(--oxide-soft))",
        },
        sand: "hsl(var(--sand))",
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "0.85rem",
        md: "1.15rem",
        lg: "1.75rem",
        xl: "2.5rem",
      },
      boxShadow: {
        diffusion: "0 24px 70px -28px rgba(14, 26, 37, 0.22)",
        panel: "0 18px 45px -24px rgba(14, 26, 37, 0.16)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "grid-ink":
          "linear-gradient(to right, rgba(11, 19, 29, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(11, 19, 29, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
