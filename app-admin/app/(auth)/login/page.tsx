import { ArrowRight, LockKeyhole } from "lucide-react";
import { ProviderAutoRetry } from "./provider-auto-retry";

const AUTO_RETRY_QUERY_PARAM = "provider_retry_at";
const AUTO_RETRY_SUPPRESSION_MS = 10_000;

interface LoginSearchParams {
  [key: string]: string | string[] | undefined;
}

async function resolveSearchParams(
  searchParams?: Promise<LoginSearchParams>,
): Promise<LoginSearchParams> {
  return searchParams ? await searchParams : {};
}

function readSearchParam(
  searchParams: LoginSearchParams,
  key: string,
): string | null {
  const value = searchParams[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return null;
}

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

function sanitizeNextPath(next: string | null): string {
  if (!next) {
    return "/";
  }

  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function shouldAttemptAutoRetry(params: {
  autoRetryAt: number;
  error: string | null;
}): boolean {
  if (params.error !== "oidc_provider_untrusted") {
    return false;
  }

  if (!Number.isFinite(params.autoRetryAt)) {
    return true;
  }

  return Date.now() - params.autoRetryAt >= AUTO_RETRY_SUPPRESSION_MS;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const isReauth = readSearchParam(resolvedSearchParams, "reauth") === "1";
  const error = readSearchParam(resolvedSearchParams, "error");
  const errorMessage = toLoginErrorMessage(error);
  const safeNext = sanitizeNextPath(
    readSearchParam(resolvedSearchParams, "next"),
  );
  const autoRetryAtRaw = readSearchParam(
    resolvedSearchParams,
    AUTO_RETRY_QUERY_PARAM,
  );
  const autoRetryAt = autoRetryAtRaw ? Number(autoRetryAtRaw) : Number.NaN;
  const autoRetry = shouldAttemptAutoRetry({
    autoRetryAt,
    error,
  });

  return (
    <div className="space-y-6">
      <ProviderAutoRetry
        isReauth={isReauth}
        safeNext={safeNext}
        shouldAttempt={autoRetry}
      />

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

        {autoRetry && error === "oidc_provider_untrusted" ? (
          <div className="rounded-lg border border-warning-light bg-warning-light/50 px-4 py-3 text-sm text-warning-text">
            Verification du fournisseur OIDC en cours avant nouvelle
            tentative...
          </div>
        ) : null}

        {errorMessage &&
          !(error === "oidc_provider_untrusted" && autoRetry) && (
            <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-sm text-danger-text">
              {errorMessage}
            </div>
          )}

        <form action="/auth/login" method="get">
          <input type="hidden" name="next" value={safeNext} />
          {isReauth ? (
            <input type="hidden" name="prompt" value="login" />
          ) : null}
          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <LockKeyhole className="h-4 w-4" />
            Continuer vers la connexion
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
