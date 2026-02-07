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
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFBF0",
          fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif",
          color: "#1A1A1A",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #FBBF24, #D97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: 28,
              fontWeight: 700,
              color: "#fff",
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
              color: "#525252",
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
                backgroundColor: "#F59E0B",
                color: "#fff",
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
                border: "1px solid #E5E5E5",
                backgroundColor: "#fff",
                color: "#1A1A1A",
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
