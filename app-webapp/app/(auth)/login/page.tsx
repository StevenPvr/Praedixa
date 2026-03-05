"use client";

import { Suspense } from "react";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function toLoginErrorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "oidc_config_missing") {
    return "Configuration OIDC manquante en local. Renseignez AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID et AUTH_SESSION_SECRET dans app-webapp/.env.local.";
  }
  if (error === "oidc_provider_untrusted") {
    return "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints). Contactez l'administrateur.";
  }
  if (error === "rate_limited") {
    return "Trop de tentatives de connexion. Patientez quelques instants puis reessayez.";
  }
  return "La connexion a echoue. Veuillez reessayer.";
}

function sanitizeIncidentToken(
  value: string | null,
  maxLength: number,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

function toReauthMessage(
  reason: string | null,
  errorCode: string | null,
): string {
  if (reason === "api_unauthorized") {
    if (errorCode === "UNAUTHORIZED") {
      return "Votre session a bien ete ouverte, mais l'API a refuse ce token. Veuillez vous reconnecter.";
    }
    return "Votre session a ete invalidee par l'API. Veuillez vous reconnecter.";
  }
  return "Session expiree ou droits insuffisants. Veuillez vous reconnecter.";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const isReauth = searchParams.get("reauth") === "1";
  const error = searchParams.get("error");
  const errorMessage = toLoginErrorMessage(error);
  const reason = searchParams.get("reason");
  const errorCode = sanitizeIncidentToken(searchParams.get("error_code"), 64);
  const requestId = sanitizeIncidentToken(searchParams.get("request_id"), 128);
  const reauthMessage = toReauthMessage(reason, errorCode);
  const supportHint = [errorCode && `code ${errorCode}`, requestId && `incident ${requestId}`]
    .filter(Boolean)
    .join(" · ");

  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

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
        <p className="text-overline text-ink-tertiary">Client access</p>
        <h2 className="font-sans font-bold text-display-sm text-ink">
          Connexion securisee
        </h2>
        <p className="text-body-sm text-ink-secondary">
          Authentification geree par votre fournisseur d'identite entreprise.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {isReauth && (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-body-sm text-warning-text">
            <p>{reauthMessage}</p>
            {supportHint && (
              <p className="mt-2 text-xs">
                Reference support: <span className="font-semibold">{supportHint}</span>
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-body-sm text-danger-text">
            {errorMessage}
          </div>
        )}

        <Button type="button" onClick={handleLogin} className="w-full" size="lg">
          <LockKey className="mr-2 h-4 w-4" />
          Continuer vers la connexion
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
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
