import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Praedixa | Language Selection",
  description:
    "Select your language to access the official Praedixa website in French or English.",
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/fr",
      en: "/en",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLanguageSelectorPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, oklch(0.97 0.02 85), oklch(0.94 0.015 72))",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "640px",
          borderRadius: "20px",
          border: "1px solid oklch(0.85 0.01 70)",
          background: "oklch(1 0 0 / 0.85)",
          boxShadow: "0 16px 40px oklch(0.35 0.02 70 / 0.12)",
          padding: "32px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "oklch(0.24 0.01 65)",
        }}
      >
        <p
          style={{
            margin: 0,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "12px",
            fontWeight: 700,
            color: "oklch(0.62 0.14 75)",
          }}
        >
          Praedixa
        </p>
        <h1
          style={{
            margin: "12px 0 10px",
            fontFamily: "Georgia, Cambria, serif",
            fontSize: "42px",
            lineHeight: 1.1,
          }}
        >
          Choose your language
        </h1>
        <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.6 }}>
          Select your preferred version of the official Praedixa website.
        </p>

        <div
          style={{
            marginTop: "28px",
            display: "grid",
            gap: "12px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <Link
            href="/fr"
            style={{
              display: "block",
              borderRadius: "14px",
              border: "1px solid oklch(0.68 0.13 72 / 0.5)",
              padding: "16px",
              textDecoration: "none",
              color: "oklch(0.26 0.01 65)",
              background: "oklch(0.97 0.02 84)",
            }}
          >
            <strong style={{ display: "block", fontSize: "16px" }}>
              Continuer en français
            </strong>
            <span style={{ fontSize: "13px", opacity: 0.82 }}>
              Version prioritaire pour la France
            </span>
          </Link>

          <Link
            href="/en"
            style={{
              display: "block",
              borderRadius: "14px",
              border: "1px solid oklch(0.8 0.01 70)",
              padding: "16px",
              textDecoration: "none",
              color: "oklch(0.26 0.01 65)",
              background: "oklch(1 0 0)",
            }}
          >
            <strong style={{ display: "block", fontSize: "16px" }}>
              Continue in English
            </strong>
            <span style={{ fontSize: "13px", opacity: 0.82 }}>
              International version
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
