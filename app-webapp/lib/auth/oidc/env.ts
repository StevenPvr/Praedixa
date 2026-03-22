import {
  DEFAULT_SCOPE,
  MIN_SESSION_SECRET_LENGTH,
  type OidcEnv,
} from "./types";

function isPlaceholderSessionSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return (
    normalized.includes("change-me") ||
    normalized.includes("changeme") ||
    normalized.includes("replace-with") ||
    normalized.includes("generate-a-unique") ||
    normalized.includes("example") ||
    normalized.includes("placeholder")
  );
}

function validateSessionSecret(secret: string): void {
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `Invalid AUTH_SESSION_SECRET: must contain at least ${MIN_SESSION_SECRET_LENGTH} characters`,
    );
  }
  if (isPlaceholderSessionSecret(secret)) {
    throw new Error(
      "Invalid AUTH_SESSION_SECRET: replace the placeholder with a unique random secret",
    );
  }
}

export function getOidcEnv(): OidcEnv {
  const issuerUrl = process.env["AUTH_OIDC_ISSUER_URL"]?.trim() ?? "";
  const clientId = process.env["AUTH_OIDC_CLIENT_ID"]?.trim() ?? "";
  const clientSecret = process.env["AUTH_OIDC_CLIENT_SECRET"]?.trim() ?? "";
  const scope = process.env["AUTH_OIDC_SCOPE"]?.trim() || DEFAULT_SCOPE;
  const sessionSecret = process.env["AUTH_SESSION_SECRET"]?.trim() ?? "";

  if (!issuerUrl || !clientId || !sessionSecret) {
    throw new Error(
      "Missing OIDC env vars: AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_SESSION_SECRET",
    );
  }

  validateSessionSecret(sessionSecret);

  return {
    issuerUrl: issuerUrl.replace(/\/$/, ""),
    clientId,
    clientSecret,
    scope,
    sessionSecret,
  };
}

export function isMissingOidcEnvError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Missing OIDC env vars:") ||
      error.message.includes("Missing AUTH_APP_ORIGIN"))
  );
}

export function isInsecureOidcEnvError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith("Invalid AUTH_SESSION_SECRET:")
  );
}

export function buildAuthEndpoint(issuerUrl: string): string {
  return `${issuerUrl}/protocol/openid-connect/auth`;
}

export function buildTokenEndpoint(issuerUrl: string): string {
  return `${issuerUrl}/protocol/openid-connect/token`;
}
