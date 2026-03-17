export const ACCESS_TOKEN_COOKIE = "prx_web_at";
export const REFRESH_TOKEN_COOKIE = "prx_web_rt";
export const SESSION_COOKIE = "prx_web_sess";
export const LOGIN_STATE_COOKIE = "prx_web_state";
export const LOGIN_VERIFIER_COOKIE = "prx_web_verifier";
export const LOGIN_NEXT_COOKIE = "prx_web_next";

export interface AuthSessionData {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  siteId: string | null;
  accessTokenExp: number;
  issuedAt: number;
  sessionExpiresAt: number;
  accessTokenHash: string;
  refreshTokenHash: string | null;
}

export interface OidcUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  siteId: string | null;
}

export interface OidcTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  id_token?: string;
  token_type?: string;
}

export interface OidcEnv {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  sessionSecret: string;
}

export interface TrustedOidcEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | null;
}

export const ROLE_PRIORITY = [
  "super_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

export type KnownRole = (typeof ROLE_PRIORITY)[number];

export const DEFAULT_ROLE: KnownRole = "viewer";
export const DEFAULT_SCOPE = "openid profile email offline_access";
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
export const MIN_SESSION_SECRET_LENGTH = 32;
export const SESSION_CLOCK_SKEW_SECONDS = 300;
export const DEFAULT_API_AUDIENCE = "praedixa-api";

export const FORBIDDEN_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export type JwtPayload = Record<string, unknown>;
export type AccessTokenClaimsIssue =
  | "invalid_payload"
  | "missing_sub"
  | "missing_email"
  | "missing_role"
  | "invalid_role"
  | "missing_exp";
export type ApiAccessTokenCompatibilityReason =
  | "invalid_claims"
  | "missing_api_audience"
  | "missing_organization_id"
  | "missing_site_id";
