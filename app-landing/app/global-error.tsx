"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Error is already visible to the user via the UI below.
  // Re-enable Sentry here when monitoring is restored.
  void error;

  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--warm-bg)",
          fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif",
          color: "var(--warm-ink)",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, var(--brass-400), var(--brass-600))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--warm-bg-card)",
            }}
          >
            P
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Une erreur inattendue est survenue
          </h1>
          <p
            style={{
              color: "var(--warm-ink-secondary)",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            Nous en avons été informés et travaillons à la résoudre. Veuillez
            réessayer.
          </p>
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
          >
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: 12,
                border: "none",
                backgroundColor: "var(--brass-600)",
                color: "var(--warm-bg-card)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: 12,
                border: "1px solid var(--warm-border)",
                backgroundColor: "var(--warm-bg-elevated)",
                color: "var(--warm-ink)",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
