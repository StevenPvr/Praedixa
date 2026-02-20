"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function toLoginErrorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "oidc_config_missing") {
    return "Configuration OIDC manquante en local. Renseignez AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID et AUTH_SESSION_SECRET dans app-admin/.env.local.";
  }
  if (error === "oidc_provider_untrusted") {
    return "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints).";
  }
  return `La connexion a echoue (${error}). Veuillez reessayer.`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const isReauth = searchParams.get("reauth") === "1";
  const error = searchParams.get("error");
  const errorMessage = toLoginErrorMessage(error);

  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  function handleLogin(): void {
    const loginUrl = new URL("/auth/login", window.location.origin);
    loginUrl.searchParams.set("next", safeNext);
    if (isReauth) {
      loginUrl.searchParams.set("prompt", "login");
    }
    window.location.href = loginUrl.toString();
  }

  return (
    <>
      <p className="mb-6 text-center text-sm text-ink-tertiary">
        Espace administration
      </p>

      <div className="space-y-4">
        {isReauth && (
          <div className="rounded-md bg-primary-50 p-3 text-sm text-primary-700">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          className="min-h-[44px] w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          Continuer vers la connexion
        </button>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
