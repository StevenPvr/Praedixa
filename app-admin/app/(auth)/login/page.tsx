"use client";

import { Suspense } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";

function toLoginErrorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "oidc_config_missing") {
    return "Configuration OIDC manquante en local. Renseignez AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID et AUTH_SESSION_SECRET dans app-admin/.env.local.";
  }
  if (error === "oidc_provider_untrusted") {
    return "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints).";
  }
  if (error === "rate_limited") {
    return "Trop de tentatives de connexion. Patientez quelques instants puis reessayez.";
  }
  return "La connexion a echoue. Veuillez reessayer.";
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
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-tertiary">
          Super admin access
        </p>
        <h2 className="text-xl font-semibold text-ink">Connexion securisee</h2>
        <p className="text-sm text-ink-secondary">
          Authentification OIDC avec verification stricte des permissions admin.
        </p>
      </div>

      <div className="space-y-4">
        {isReauth && (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-sm text-warning-text">
            Session expiree ou droits insuffisants. Veuillez vous reconnecter.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-sm text-danger-text">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <LockKeyhole className="h-4 w-4" />
          Continuer vers la connexion
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
