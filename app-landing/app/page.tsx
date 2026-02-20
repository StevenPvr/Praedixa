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
      id="main-content"
      tabIndex={-1}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, var(--warm-bg), color-mix(in oklch, var(--brass-100) 55%, var(--warm-bg) 45%))",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "640px",
          borderRadius: "20px",
          border: "1px solid var(--warm-border)",
          background: "oklch(1 0 0 / 0.85)",
          boxShadow: "0 16px 40px oklch(0.32 0.03 250 / 0.12)",
          padding: "32px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "var(--warm-ink)",
        }}
      >
        <p
          style={{
            margin: 0,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--brass-600)",
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
              border:
                "1px solid color-mix(in oklch, var(--brass-500) 70%, transparent)",
              padding: "16px",
              textDecoration: "none",
              color: "var(--warm-ink)",
              background:
                "color-mix(in oklch, var(--brass-50) 80%, var(--warm-bg-card) 20%)",
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
              border: "1px solid var(--warm-border)",
              padding: "16px",
              textDecoration: "none",
              color: "var(--warm-ink)",
              background: "var(--warm-bg-elevated)",
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
