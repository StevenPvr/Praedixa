"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";

const AUTO_RETRY_QUERY_PARAM = "provider_retry_at";
const AUTO_RETRY_SUPPRESSION_MS = 10_000;

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
  if (error === "admin_mfa_required") {
    return "La console admin exige une authentification MFA valide. Reconnectez-vous avec un facteur admin autorise.";
  }
  return "La connexion a echoue. Veuillez reessayer.";
}

function buildLoginUrl(
  origin: string,
  safeNext: string,
  isReauth: boolean,
  autoRetryAt?: number,
): string {
  const loginUrl = new URL("/auth/login", origin);
  loginUrl.searchParams.set("next", safeNext);
  if (isReauth) {
    loginUrl.searchParams.set("prompt", "login");
  }
  if (typeof autoRetryAt === "number" && Number.isFinite(autoRetryAt)) {
    loginUrl.searchParams.set(AUTO_RETRY_QUERY_PARAM, String(autoRetryAt));
  }
  return loginUrl.toString();
}

function resolveClientAuthOrigin(): string {
  const configuredOrigin = process.env["NEXT_PUBLIC_APP_ORIGIN"]?.trim() ?? "";

  if (configuredOrigin.length === 0) {
    return globalThis.location.origin;
  }

  try {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    // Fall through to the current browser origin.
  }

  return globalThis.location.origin;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const isReauth = searchParams.get("reauth") === "1";
  const error = searchParams.get("error");
  const errorMessage = toLoginErrorMessage(error);
  const autoRetryAtRaw = searchParams.get(AUTO_RETRY_QUERY_PARAM);

  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const autoRetryAt = autoRetryAtRaw ? Number(autoRetryAtRaw) : NaN;
  const shouldSuppressAutoRetry =
    Number.isFinite(autoRetryAt) &&
    Date.now() - autoRetryAt < AUTO_RETRY_SUPPRESSION_MS;
  const shouldAttemptAutoRetry =
    error === "oidc_provider_untrusted" && !shouldSuppressAutoRetry;
  const [isCheckingProvider, setIsCheckingProvider] = useState(
    shouldAttemptAutoRetry,
  );

  function handleLogin(): void {
    globalThis.location.href = buildLoginUrl(
      resolveClientAuthOrigin(),
      safeNext,
      isReauth,
    );
  }

  useEffect(() => {
    if (!shouldAttemptAutoRetry) {
      setIsCheckingProvider(false);
      return;
    }

    let cancelled = false;
    setIsCheckingProvider(true);

    void globalThis
      .fetch("/auth/provider-status", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const parsed = (await response.json()) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return null;
        }

        return parsed as { healthy?: boolean };
      })
      .then((payload) => {
        if (cancelled || payload?.healthy !== true) {
          return;
        }

        globalThis.location.href = buildLoginUrl(
          resolveClientAuthOrigin(),
          safeNext,
          isReauth,
          Date.now(),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsCheckingProvider(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReauth, safeNext, shouldAttemptAutoRetry]);

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

        {errorMessage &&
          !(error === "oidc_provider_untrusted" && isCheckingProvider) && (
            <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-sm text-danger-text">
              {errorMessage}
            </div>
          )}

        {isCheckingProvider && error === "oidc_provider_untrusted" && (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-sm text-warning-text">
            Verification du fournisseur OIDC en cours avant nouvelle
            tentative...
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={isCheckingProvider}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <LockKeyhole className="h-4 w-4" />
          {isCheckingProvider
            ? "Verification de la connexion..."
            : "Continuer vers la connexion"}
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
