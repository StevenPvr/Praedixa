"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Re-enable Sentry here when monitoring is restored.
  void error;

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1a1a2e" }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
            Le site a rencontré un problème inattendu.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#3b5998",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
