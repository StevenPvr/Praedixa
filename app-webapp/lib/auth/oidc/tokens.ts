import type { OidcTokenResponse } from "./types";
import { getTrustedOidcEndpoints } from "./discovery";

export async function exchangeCodeForTokens(input: {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OidcTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  });

  if (input.clientSecret) {
    body.set("client_secret", input.clientSecret);
  }

  const { tokenEndpoint } = await getTrustedOidcEndpoints(input.issuerUrl);

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) return null;
  const parsed = (await response.json()) as OidcTokenResponse;
  return parsed.access_token ? parsed : null;
}

export async function refreshTokens(input: {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<OidcTokenResponse | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
  });

  if (input.clientSecret) {
    body.set("client_secret", input.clientSecret);
  }

  const { tokenEndpoint } = await getTrustedOidcEndpoints(input.issuerUrl);

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) return null;
  const parsed = (await response.json()) as OidcTokenResponse;
  return parsed.access_token ? parsed : null;
}

export async function revokeOidcToken(input: {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  token: string;
  tokenTypeHint?: "access_token" | "refresh_token";
}): Promise<boolean> {
  const { revocationEndpoint } = await getTrustedOidcEndpoints(input.issuerUrl);
  if (!revocationEndpoint) {
    return false;
  }

  const body = new URLSearchParams({
    token: input.token,
    client_id: input.clientId,
  });

  if (input.clientSecret) {
    body.set("client_secret", input.clientSecret);
  }

  if (input.tokenTypeHint) {
    body.set("token_type_hint", input.tokenTypeHint);
  }

  const response = await fetch(revocationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  return response.ok;
}
