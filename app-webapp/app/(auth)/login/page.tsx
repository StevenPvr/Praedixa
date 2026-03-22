import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    return "Configuration OIDC invalide. Renseignez AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_APP_ORIGIN et un AUTH_SESSION_SECRET fort (32+ caracteres aleatoires) dans app-webapp/.env.local ou l’environnement de deploiement.";
  }
  if (error === "oidc_provider_untrusted") {
    return "Le fournisseur OIDC est non fiable ou mal configure (TLS/certificat/endpoints). Contactez l'administrateur.";
  }
  if (error === "oidc_config_insecure") {
    return "Le secret de session OIDC est trop faible ou laisse en valeur d'exemple. Remplacez AUTH_SESSION_SECRET par un secret aleatoire unique d'au moins 32 caracteres.";
  }
  if (error === "rate_limited") {
    return "Trop de tentatives de connexion. Patientez quelques instants puis reessayez.";
  }
  if (error === "wrong_role") {
    return "Ce compte super admin doit utiliser la console admin Praedixa. Ouvrez l'application admin puis reconnectez-vous avec le meme fournisseur d'identite.";
  }
  if (error === "auth_claims_invalid") {
    return "Le fournisseur d'identite a bien authentifie la session, mais le token d'acces ne porte pas encore le contrat canonique attendu par Praedixa. Verifiez les claims top-level `sub`, `email`, `role`, `organization_id` et `site_id` selon le role utilisateur, ainsi que les attributs utilisateur et protocol mappers Keycloak associes.";
  }
  if (error === "auth_token_incompatible") {
    return "Le fournisseur d'identite a bien authentifie la session, mais le token d'acces ne contient pas les claims requis par l'API Praedixa. Verifiez l'audience `praedixa-api` ainsi que les claims `organization_id` et `site_id` selon le role utilisateur.";
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

function sanitizeNextPath(next: string | null): string {
  if (!next) {
    return "/dashboard";
  }

  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const isReauth = readSearchParam(resolvedSearchParams, "reauth") === "1";
  const error = readSearchParam(resolvedSearchParams, "error");
  const tokenReason = sanitizeIncidentToken(
    readSearchParam(resolvedSearchParams, "token_reason"),
    64,
  );
  const errorMessage = toLoginErrorMessage(error);
  const reason = readSearchParam(resolvedSearchParams, "reason");
  const errorCode = sanitizeIncidentToken(
    readSearchParam(resolvedSearchParams, "error_code"),
    64,
  );
  const requestId = sanitizeIncidentToken(
    readSearchParam(resolvedSearchParams, "request_id"),
    128,
  );
  const reauthMessage = toReauthMessage(reason, errorCode);
  const supportHint = [
    errorCode && `code ${errorCode}`,
    requestId && `incident ${requestId}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const safeNext = sanitizeNextPath(
    readSearchParam(resolvedSearchParams, "next"),
  );

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
                Reference support:{" "}
                <span className="font-semibold">{supportHint}</span>
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-danger-light bg-danger-light/50 px-4 py-3 text-body-sm text-danger-text">
            <p>{errorMessage}</p>
            {(error === "auth_token_incompatible" ||
              error === "auth_claims_invalid") &&
              tokenReason && (
                <p className="mt-2 text-xs">
                  Detail technique:{" "}
                  <span className="font-semibold">{tokenReason}</span>
                </p>
              )}
          </div>
        )}

        <form action="/auth/login" method="get" className="w-full">
          <input type="hidden" name="next" value={safeNext} />
          {isReauth ? (
            <input type="hidden" name="prompt" value="login" />
          ) : null}
          <Button type="submit" className="w-full" size="lg">
            <LockKeyhole className="mr-2 h-4 w-4" />
            Continuer vers la connexion
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
