import { createPkceChallenge } from "./security.js";
import type { AuthorizationSession, CredentialInput } from "./types.js";

export interface OAuthTokenBundle {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string[];
  tokenType: string;
  raw: Record<string, unknown>;
}

type OAuthClientCredentials = {
  clientId: string;
  clientSecret: string;
};

const FETCH_TIMEOUT_MS = 8_000;

function normalizeScope(scope: unknown): string[] {
  if (typeof scope !== "string" || scope.trim().length === 0) {
    return [];
  }
  return scope
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function fetchToken(
  tokenEndpoint: string,
  body: URLSearchParams,
): Promise<OAuthTokenBundle> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok || payload == null) {
      throw new Error("OAuth token exchange failed");
    }

    const accessToken = payload["access_token"];
    const tokenType =
      typeof payload["token_type"] === "string" &&
      payload["token_type"].length > 0
        ? payload["token_type"]
        : "Bearer";
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new Error("OAuth token response is missing access_token");
    }

    const expiresIn =
      typeof payload["expires_in"] === "number"
        ? payload["expires_in"]
        : typeof payload["expires_in"] === "string"
          ? Number(payload["expires_in"])
          : null;
    const expiresAt =
      expiresIn != null && Number.isFinite(expiresIn) && expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

    return {
      accessToken,
      refreshToken:
        typeof payload["refresh_token"] === "string"
          ? payload["refresh_token"]
          : null,
      expiresAt,
      scope: normalizeScope(payload["scope"]),
      tokenType,
      raw: payload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildAuthorizationUrl(
  session: AuthorizationSession,
  clientCredentials: OAuthClientCredentials,
): string {
  const url = new URL(session.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientCredentials.clientId);
  url.searchParams.set("redirect_uri", session.redirectUri);
  url.searchParams.set("state", session.state);
  url.searchParams.set(
    "code_challenge",
    createPkceChallenge(session.codeVerifier),
  );
  url.searchParams.set("code_challenge_method", "S256");
  if (session.scopes.length > 0) {
    url.searchParams.set("scope", session.scopes.join(" "));
  }
  return url.toString();
}

export async function exchangeAuthorizationCode(
  session: AuthorizationSession,
  clientCredentials: OAuthClientCredentials,
  code: string,
): Promise<OAuthTokenBundle> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientCredentials.clientId,
    client_secret: clientCredentials.clientSecret,
    redirect_uri: session.redirectUri,
    code_verifier: session.codeVerifier,
  });
  return await fetchToken(session.tokenEndpoint, body);
}

export async function refreshAccessToken(
  tokenEndpoint: string,
  clientCredentials: OAuthClientCredentials,
  refreshToken: string,
): Promise<OAuthTokenBundle> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientCredentials.clientId,
    client_secret: clientCredentials.clientSecret,
    refresh_token: refreshToken,
  });
  return await fetchToken(tokenEndpoint, body);
}

export async function exchangeClientCredentials(
  tokenEndpoint: string,
  clientCredentials: OAuthClientCredentials,
  scopes: string[],
  options?: {
    audience?: string | null;
  },
): Promise<OAuthTokenBundle> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientCredentials.clientId,
    client_secret: clientCredentials.clientSecret,
  });
  if (scopes.length > 0) {
    body.set("scope", scopes.join(" "));
  }
  const audience = options?.audience?.trim() ?? "";
  if (audience.length > 0) {
    body.set("audience", audience);
  }
  return await fetchToken(tokenEndpoint, body);
}

export function getOAuthClientCredentials(
  payload: CredentialInput,
): OAuthClientCredentials {
  const clientId =
    typeof payload["clientId"] === "string" ? payload["clientId"].trim() : "";
  const clientSecret =
    typeof payload["clientSecret"] === "string"
      ? payload["clientSecret"].trim()
      : "";
  if (clientId.length === 0 || clientSecret.length < 8) {
    throw new Error("OAuth clientId and clientSecret are required");
  }
  return {
    clientId,
    clientSecret,
  };
}
