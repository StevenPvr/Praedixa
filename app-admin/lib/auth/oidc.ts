import type { NextRequest, NextResponse } from "next/server";

const ROLE_PRIORITY = [
  "super_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

type KnownRole = (typeof ROLE_PRIORITY)[number];

const DEFAULT_ROLE: KnownRole = "viewer";
const DEFAULT_SCOPE = "openid profile email offline_access";
const DEFAULT_DEV_AUTH_ORIGIN = "http://localhost:3002";

export const ACCESS_TOKEN_COOKIE = "prx_admin_at";
export const REFRESH_TOKEN_COOKIE = "prx_admin_rt";
export const SESSION_COOKIE = "prx_admin_sess";
export const LOGIN_STATE_COOKIE = "prx_admin_state";
export const LOGIN_VERIFIER_COOKIE = "prx_admin_verifier";
export const LOGIN_NEXT_COOKIE = "prx_admin_next";

export interface AuthSessionData {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  siteId: string | null;
  accessTokenExp: number;
  issuedAt: number;
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

interface OidcEnv {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  sessionSecret: string;
}

interface TrustedOidcEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

type JwtPayload = Record<string, unknown>;

const FORBIDDEN_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function isSafeObjectKey(key: string): boolean {
  return key.length > 0 && !FORBIDDEN_OBJECT_KEYS.has(key);
}

function getOwnValue(
  payload: Record<string, unknown>,
  key: string,
): unknown | undefined {
  if (!isSafeObjectKey(key)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(payload, key)) return undefined;
  return payload[key];
}

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function parseJsonObject(value: string): JwtPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JwtPayload)
      : null;
  } catch {
    return null;
  }
}

function getString(payload: JwtPayload, key: string): string | null {
  const value = getOwnValue(payload, key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNestedString(
  payload: JwtPayload,
  parentKey: string,
  childKey?: string,
): string | null {
  const parentValue = getOwnValue(payload, parentKey);
  if (childKey === undefined) {
    return typeof parentValue === "string" && parentValue.length > 0
      ? parentValue
      : null;
  }
  if (
    !parentValue ||
    typeof parentValue !== "object" ||
    Array.isArray(parentValue)
  ) {
    return null;
  }
  const childValue = getOwnValue(
    parentValue as Record<string, unknown>,
    childKey,
  );
  return typeof childValue === "string" && childValue.length > 0
    ? childValue
    : null;
}

function normalizeRoleValue(rawRole: string): string {
  const trimmed = rawRole.trim();
  if (trimmed.length === 0) return "";

  const withoutPath = trimmed.includes("/")
    ? (trimmed.split("/").at(-1) ?? "")
    : trimmed;

  return withoutPath
    .toLowerCase()
    .replace(/^role[_:-]?/, "")
    .replace(/[\s-]+/g, "_");
}

function mapToKnownRole(rawRole: string): KnownRole | null {
  const normalized = normalizeRoleValue(rawRole);
  if (normalized.length === 0) return null;

  if (
    normalized === "admin" ||
    normalized === "orgadmin" ||
    normalized === "organization_admin" ||
    normalized === "org_administrator"
  ) {
    return "org_admin";
  }

  if (
    normalized === "superadmin" ||
    normalized === "super_administrator"
  ) {
    return "super_admin";
  }

  if (normalized === "hrmanager") {
    return "hr_manager";
  }

  return ROLE_PRIORITY.includes(normalized as KnownRole)
    ? (normalized as KnownRole)
    : null;
}

function getRoleFromList(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const roles = value.filter(
    (entry): entry is string => typeof entry === "string",
  );
  if (roles.length === 0) return null;

  const knownRoles = roles
    .map((role) => mapToKnownRole(role))
    .filter((role): role is KnownRole => role != null);

  for (const candidate of ROLE_PRIORITY) {
    if (knownRoles.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

function extractRole(payload: JwtPayload, clientId: string): string {
  const directRole =
    getString(payload, "role") ??
    getNestedString(payload, "app_metadata", "role");
  if (directRole) return directRole;

  const topLevelRoles = getRoleFromList(getOwnValue(payload, "roles"));
  if (topLevelRoles) return topLevelRoles;

  const groupsRole = getRoleFromList(getOwnValue(payload, "groups"));
  if (groupsRole) return groupsRole;

  const realmAccess = getOwnValue(payload, "realm_access");
  const realmRoles = getRoleFromList(
    realmAccess &&
      typeof realmAccess === "object" &&
      !Array.isArray(realmAccess)
      ? getOwnValue(realmAccess as Record<string, unknown>, "roles")
      : undefined,
  );
  if (realmRoles) return realmRoles;

  const resourceAccess = getOwnValue(payload, "resource_access");
  let resourceRoles: string | null = null;
  if (
    resourceAccess &&
    typeof resourceAccess === "object" &&
    !Array.isArray(resourceAccess) &&
    isSafeObjectKey(clientId)
  ) {
    const clientAccess = getOwnValue(
      resourceAccess as Record<string, unknown>,
      clientId,
    );
    if (
      clientAccess &&
      typeof clientAccess === "object" &&
      !Array.isArray(clientAccess)
    ) {
      resourceRoles = getRoleFromList(
        getOwnValue(clientAccess as Record<string, unknown>, "roles"),
      );
    }
  }

  if (resourceRoles) return resourceRoles;

  return DEFAULT_ROLE;
}

function toKnownRole(role: string): string {
  return mapToKnownRole(role) ?? DEFAULT_ROLE;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  return parseJsonObject(base64UrlDecode(segments[1]));
}

export function getTokenExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

export function isTokenExpired(token: string, minTtlSeconds = 0): boolean {
  const exp = getTokenExp(token);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= minTtlSeconds;
}

export function userFromAccessToken(
  token: string,
  clientId: string,
): OidcUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const sub = getString(payload, "sub");
  const email =
    getString(payload, "email") ??
    getNestedString(payload, "preferred_username");
  if (!sub || !email) return null;

  const organizationId =
    getString(payload, "organization_id") ??
    getNestedString(payload, "app_metadata", "organization_id") ??
    getNestedString(payload, "app_metadata", "org_id");

  const siteId =
    getString(payload, "site_id") ??
    getNestedString(payload, "app_metadata", "site_id");

  return {
    id: sub,
    email,
    role: toKnownRole(extractRole(payload, clientId)),
    organizationId,
    siteId,
  };
}

export function getOidcEnv(): OidcEnv {
  const issuerUrl = process.env.AUTH_OIDC_ISSUER_URL?.trim() ?? "";
  const clientId = process.env.AUTH_OIDC_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.AUTH_OIDC_CLIENT_SECRET?.trim() ?? "";
  const scope = process.env.AUTH_OIDC_SCOPE?.trim() || DEFAULT_SCOPE;
  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() ?? "";

  if (!issuerUrl || !clientId || !sessionSecret) {
    throw new Error(
      "Missing OIDC env vars: AUTH_OIDC_ISSUER_URL, AUTH_OIDC_CLIENT_ID, AUTH_SESSION_SECRET",
    );
  }

  return {
    issuerUrl: issuerUrl.replace(/\/$/, ""),
    clientId,
    clientSecret,
    scope,
    sessionSecret,
  };
}

function normalizeHttpOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function readForwardedOrigin(request: NextRequest): string | null {
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";

  if (!forwardedHost || !forwardedProto) return null;
  return normalizeHttpOrigin(`${forwardedProto}://${forwardedHost}`);
}

export function resolveAuthAppOrigin(request: NextRequest): string {
  const configuredOrigin =
    process.env.AUTH_APP_ORIGIN?.trim() ??
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ??
    "";
  const normalizedConfiguredOrigin = configuredOrigin
    ? normalizeHttpOrigin(configuredOrigin)
    : null;
  if (normalizedConfiguredOrigin) {
    return normalizedConfiguredOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_AUTH_ORIGIN;
  }

  const forwardedOrigin = readForwardedOrigin(request);
  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  return request.nextUrl.origin;
}

export function isMissingOidcEnvError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("Missing OIDC env vars:")
  );
}

export function buildAuthEndpoint(issuerUrl: string): string {
  return `${issuerUrl}/protocol/openid-connect/auth`;
}

export function buildTokenEndpoint(issuerUrl: string): string {
  return `${issuerUrl}/protocol/openid-connect/token`;
}

function normalizeUrlForComparison(value: string): string {
  return value.replace(/\/$/, "");
}

function parseHttpsUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid OIDC ${label}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`OIDC ${label} must use HTTPS`);
  }

  return parsed;
}

function readDiscoveryString(
  doc: Record<string, unknown>,
  key: string,
): string {
  const value = doc[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`OIDC discovery missing ${key}`);
  }
  return value;
}

async function fetchOidcDiscovery(
  issuerUrl: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${issuerUrl}/.well-known/openid-configuration`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("OIDC discovery request failed");
    }

    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid OIDC discovery payload");
    }

    return parsed as Record<string, unknown>;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getTrustedOidcEndpoints(
  issuerUrl: string,
): Promise<TrustedOidcEndpoints> {
  const configuredIssuer = parseHttpsUrl(issuerUrl, "issuer URL");
  const normalizedConfiguredIssuer = normalizeUrlForComparison(
    configuredIssuer.toString(),
  );

  const discovery = await fetchOidcDiscovery(normalizedConfiguredIssuer);
  const discoveredIssuer = parseHttpsUrl(
    readDiscoveryString(discovery, "issuer"),
    "discovery issuer",
  );
  const normalizedDiscoveredIssuer = normalizeUrlForComparison(
    discoveredIssuer.toString(),
  );

  if (normalizedConfiguredIssuer !== normalizedDiscoveredIssuer) {
    throw new Error("OIDC issuer mismatch between config and discovery");
  }

  const authorizationEndpoint = parseHttpsUrl(
    readDiscoveryString(discovery, "authorization_endpoint"),
    "authorization endpoint",
  );
  const tokenEndpoint = parseHttpsUrl(
    readDiscoveryString(discovery, "token_endpoint"),
    "token endpoint",
  );

  if (
    authorizationEndpoint.origin !== configuredIssuer.origin ||
    tokenEndpoint.origin !== configuredIssuer.origin
  ) {
    throw new Error("OIDC endpoints must share issuer origin");
  }

  return {
    authorizationEndpoint: authorizationEndpoint.toString(),
    tokenEndpoint: tokenEndpoint.toString(),
  };
}

export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

function randomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export async function createPkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

async function hmacSign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signSession(
  session: AuthSessionData,
  secret: string,
): Promise<string> {
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<AuthSessionData | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await hmacSign(payload, secret);
  if (!constantTimeEqual(signature, expected)) {
    return null;
  }

  const parsed = parseJsonObject(base64UrlDecode(payload));
  if (!parsed) return null;

  const sub = getString(parsed, "sub");
  const email = getString(parsed, "email");
  const role = getString(parsed, "role") ?? DEFAULT_ROLE;
  const accessTokenExp = parsed.accessTokenExp;
  const issuedAt = parsed.issuedAt;

  if (
    !sub ||
    !email ||
    typeof accessTokenExp !== "number" ||
    typeof issuedAt !== "number"
  ) {
    return null;
  }

  return {
    sub,
    email,
    role: toKnownRole(role),
    organizationId: getString(parsed, "organizationId"),
    siteId: getString(parsed, "siteId"),
    accessTokenExp,
    issuedAt,
  };
}

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

export function secureCookie(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

export function setAuthCookies(
  response: NextResponse,
  request: NextRequest,
  payload: {
    accessToken: string;
    refreshToken: string | null;
    sessionToken: string;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
  },
): void {
  const secure = secureCookie(request);
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, payload.accessTokenMaxAge),
  });

  if (payload.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(300, payload.refreshTokenMaxAge),
    });
  } else {
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }

  response.cookies.set(SESSION_COOKIE, payload.sessionToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(300, payload.refreshTokenMaxAge),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(LOGIN_STATE_COOKIE);
  response.cookies.delete(LOGIN_VERIFIER_COOKIE);
  response.cookies.delete(LOGIN_NEXT_COOKIE);
}
