import type { NextRequest, NextResponse } from "next/server";
import { resolveAdminPermissions } from "@/lib/auth/permissions";

const ROLE_PRIORITY = [
  "super_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

type KnownRole = (typeof ROLE_PRIORITY)[number];

const DEFAULT_SCOPE = "openid profile email offline_access";
const DEFAULT_DEV_AUTH_ORIGIN = "http://localhost:3002";
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const MIN_SESSION_SECRET_LENGTH = 32;
const SESSION_CLOCK_SKEW_SECONDS = 300;

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
  permissions: string[];
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
  permissions: string[];
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
  revocationEndpoint: string | null;
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

function getStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
}

function getNormalizedStringList(value: unknown): string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim().toLowerCase()];
  }

  return getStringList(value).map((entry) => entry.trim().toLowerCase());
}

function normalizeRole(rawRole: string): KnownRole | null {
  const trimmed = rawRole.trim();
  if (trimmed.length === 0) return null;
  return ROLE_PRIORITY.includes(trimmed as KnownRole)
    ? (trimmed as KnownRole)
    : null;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;
  try {
    return parseJsonObject(base64UrlDecode(segments[1]));
  } catch {
    return null;
  }
}

export function getTokenExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

function getTokenNotBefore(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const nbf = payload?.nbf;
  return typeof nbf === "number" ? nbf : null;
}

function tokenIncludesAudience(
  value: unknown,
  expectedAudience: string,
): boolean {
  if (typeof value === "string") {
    return value === expectedAudience;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => entry === expectedAudience);
  }

  return false;
}

function isTokenBoundToClient(payload: JwtPayload, clientId: string): boolean {
  const authorizedParty =
    getString(payload, "azp") ?? getString(payload, "client_id");
  if (authorizedParty) {
    return authorizedParty === clientId;
  }

  if (tokenIncludesAudience(getOwnValue(payload, "aud"), clientId)) {
    return true;
  }

  const resourceAccess = getOwnValue(payload, "resource_access");
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
    return (
      clientAccess != null &&
      typeof clientAccess === "object" &&
      !Array.isArray(clientAccess)
    );
  }

  return false;
}

export function isAccessTokenCompatible(
  token: string,
  input: { issuerUrl: string; clientId: string },
): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }

  const issuer = getString(payload, "iss");
  if (!issuer) {
    return false;
  }

  if (
    normalizeUrlForComparison(issuer) !==
    normalizeUrlForComparison(input.issuerUrl)
  ) {
    return false;
  }

  const exp = getTokenExp(token);
  if (!exp) {
    return false;
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  if (exp <= nowEpochSeconds - SESSION_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const notBefore = getTokenNotBefore(token);
  if (notBefore && notBefore > nowEpochSeconds + SESSION_CLOCK_SKEW_SECONDS) {
    return false;
  }

  return isTokenBoundToClient(payload, input.clientId);
}

export function isTokenExpired(token: string, minTtlSeconds = 0): boolean {
  const exp = getTokenExp(token);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= minTtlSeconds;
}

export function userFromAccessToken(
  token: string,
  _clientId: string,
): OidcUser | null {
  void _clientId;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const sub = getString(payload, "sub");
  const email = getString(payload, "email");
  const rawRole = getString(payload, "role");
  if (!sub || !email || !rawRole) return null;

  const role = normalizeRole(rawRole);
  if (!role) return null;

  return {
    id: sub,
    email,
    role,
    permissions: resolveAdminPermissions({
      role,
      explicitPermissions: getStringList(getOwnValue(payload, "permissions")),
      profiles: null,
    }),
    organizationId: getString(payload, "organization_id"),
    siteId: getString(payload, "site_id"),
  };
}

function getRequiredAdminAmrValues(): string[] {
  const parsed = (process.env.AUTH_ADMIN_REQUIRED_AMR?.trim() ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  if (parsed.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing AUTH_ADMIN_REQUIRED_AMR for production admin auth",
      );
    }
    return [];
  }

  return Array.from(new Set(parsed));
}

export function hasRequiredAdminMfa(token: string): boolean {
  const requiredAmrValues = getRequiredAdminAmrValues();
  if (requiredAmrValues.length === 0) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }

  const amrValues = getNormalizedStringList(getOwnValue(payload, "amr"));
  if (amrValues.length === 0) {
    return false;
  }

  return requiredAmrValues.some((required) => amrValues.includes(required));
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

  validateSessionSecret(sessionSecret);
  getRequiredAdminAmrValues();

  return {
    issuerUrl: issuerUrl.replace(/\/$/, ""),
    clientId,
    clientSecret,
    scope,
    sessionSecret,
  };
}

function getConfiguredAuthAppOrigin(): string | null {
  const configuredOrigin =
    process.env.AUTH_APP_ORIGIN?.trim() ??
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ??
    "";

  return configuredOrigin ? normalizeHttpOrigin(configuredOrigin) : null;
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

export function resolveAuthAppOrigin(request: NextRequest): string {
  const normalizedConfiguredOrigin = getConfiguredAuthAppOrigin();
  if (normalizedConfiguredOrigin) {
    return normalizedConfiguredOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_AUTH_ORIGIN;
  }

  const normalizedRequestOrigin = normalizeHttpOrigin(request.nextUrl.origin);
  if (normalizedRequestOrigin?.startsWith("https://")) {
    return normalizedRequestOrigin;
  }

  throw new Error(
    "Missing AUTH_APP_ORIGIN (or NEXT_PUBLIC_APP_ORIGIN) for production auth redirects",
  );
}

export function isMissingOidcEnvError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Missing OIDC env vars:") ||
      error.message.includes("Missing AUTH_APP_ORIGIN") ||
      error.message.includes("Missing AUTH_ADMIN_REQUIRED_AMR"))
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

function readOptionalDiscoveryString(
  doc: Record<string, unknown>,
  key: string,
): string | null {
  const value = doc[key];
  return typeof value === "string" && value.length > 0 ? value : null;
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
  const revocationEndpointValue = readOptionalDiscoveryString(
    discovery,
    "revocation_endpoint",
  );
  const revocationEndpoint = revocationEndpointValue
    ? parseHttpsUrl(revocationEndpointValue, "revocation endpoint")
    : null;

  if (
    authorizationEndpoint.origin !== configuredIssuer.origin ||
    tokenEndpoint.origin !== configuredIssuer.origin ||
    (revocationEndpoint != null &&
      revocationEndpoint.origin !== configuredIssuer.origin)
  ) {
    throw new Error("OIDC endpoints must share issuer origin");
  }

  return {
    authorizationEndpoint: authorizationEndpoint.toString(),
    tokenEndpoint: tokenEndpoint.toString(),
    revocationEndpoint: revocationEndpoint?.toString() ?? null,
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

export function timingSafeEqual(a: string, b: string): boolean {
  return constantTimeEqual(a, b);
}

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

async function hashTokenBinding(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

function computeSessionExpiresAt(
  nowEpochSeconds: number,
  refreshTokenMaxAgeSeconds: number | null | undefined,
): number {
  const maxAgeSeconds =
    typeof refreshTokenMaxAgeSeconds === "number" &&
    Number.isFinite(refreshTokenMaxAgeSeconds) &&
    refreshTokenMaxAgeSeconds > 0
      ? refreshTokenMaxAgeSeconds
      : DEFAULT_SESSION_MAX_AGE_SECONDS;
  return nowEpochSeconds + Math.max(300, Math.floor(maxAgeSeconds));
}

export async function buildSessionData(
  user: OidcUser,
  accessTokenExp: number,
  accessToken: string,
  refreshToken: string | null,
  refreshTokenMaxAgeSeconds?: number | null,
): Promise<AuthSessionData> {
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const [accessTokenHash, refreshTokenHash] = await Promise.all([
    hashTokenBinding(accessToken),
    refreshToken ? hashTokenBinding(refreshToken) : Promise.resolve(null),
  ]);

  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    organizationId: user.organizationId,
    siteId: user.siteId,
    accessTokenExp,
    issuedAt: nowEpochSeconds,
    sessionExpiresAt: computeSessionExpiresAt(
      nowEpochSeconds,
      refreshTokenMaxAgeSeconds,
    ),
    accessTokenHash,
    refreshTokenHash,
  };
}

export async function doesSessionMatchAccessToken(
  session: AuthSessionData,
  accessToken: string | null | undefined,
): Promise<boolean> {
  if (!accessToken || !session.accessTokenHash) {
    return false;
  }
  return constantTimeEqual(
    await hashTokenBinding(accessToken),
    session.accessTokenHash,
  );
}

export async function doesSessionMatchRefreshToken(
  session: AuthSessionData,
  refreshToken: string | null | undefined,
): Promise<boolean> {
  if (!refreshToken || !session.refreshTokenHash) {
    return false;
  }
  return constantTimeEqual(
    await hashTokenBinding(refreshToken),
    session.refreshTokenHash,
  );
}

export async function signSession(
  session: AuthSessionData,
  secret: string,
): Promise<string> {
  validateSessionSecret(secret);
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

  let decodedPayload: string;
  try {
    decodedPayload = base64UrlDecode(payload);
  } catch {
    return null;
  }

  const parsed = parseJsonObject(decodedPayload);
  if (!parsed) return null;

  const sub = getString(parsed, "sub");
  const email = getString(parsed, "email");
  const rawRole = getString(parsed, "role");
  const permissions = getStringList(getOwnValue(parsed, "permissions"));
  const accessTokenExp = parsed.accessTokenExp;
  const issuedAt = parsed.issuedAt;
  const sessionExpiresAt = parsed.sessionExpiresAt;
  const accessTokenHash = getString(parsed, "accessTokenHash");
  const rawRefreshTokenHash = getOwnValue(parsed, "refreshTokenHash");
  const refreshTokenHash =
    typeof rawRefreshTokenHash === "string" && rawRefreshTokenHash.length > 0
      ? rawRefreshTokenHash
      : rawRefreshTokenHash === null
        ? null
        : null;

  if (
    !sub ||
    !email ||
    !rawRole ||
    typeof accessTokenExp !== "number" ||
    typeof issuedAt !== "number" ||
    typeof sessionExpiresAt !== "number" ||
    !accessTokenHash
  ) {
    return null;
  }

  const normalizedRole = normalizeRole(rawRole);
  if (!normalizedRole) {
    return null;
  }

  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  if (
    issuedAt > nowEpochSeconds + SESSION_CLOCK_SKEW_SECONDS ||
    sessionExpiresAt <= nowEpochSeconds - SESSION_CLOCK_SKEW_SECONDS ||
    sessionExpiresAt <= issuedAt
  ) {
    return null;
  }

  return {
    sub,
    email,
    role: normalizedRole,
    permissions: resolveAdminPermissions({
      role: normalizedRole,
      explicitPermissions: permissions,
      profiles: null,
    }),
    organizationId: getString(parsed, "organizationId"),
    siteId: getString(parsed, "siteId"),
    accessTokenExp,
    issuedAt,
    sessionExpiresAt,
    accessTokenHash,
    refreshTokenHash,
  };
}

export function isSessionExpired(
  session: AuthSessionData,
  minTtlSeconds = 0,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (
    session.sessionExpiresAt <= now ||
    session.accessTokenExp - now <= minTtlSeconds
  );
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

export async function revokeTokens(input: {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<void> {
  const { revocationEndpoint } = await getTrustedOidcEndpoints(input.issuerUrl);
  if (!revocationEndpoint) {
    return;
  }

  const tokens = [
    {
      value: input.refreshToken?.trim() ?? "",
      typeHint: "refresh_token",
    },
    {
      value: input.accessToken?.trim() ?? "",
      typeHint: "access_token",
    },
  ].filter((entry) => entry.value.length > 0);

  for (const token of tokens) {
    const body = new URLSearchParams({
      token: token.value,
      token_type_hint: token.typeHint,
      client_id: input.clientId,
    });

    if (input.clientSecret) {
      body.set("client_secret", input.clientSecret);
    }

    try {
      await fetch(revocationEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      });
    } catch {
      // Best effort: local cookies are still cleared by the logout route.
    }
  }
}

export function secureCookie(request: NextRequest): boolean {
  const configuredOrigin = getConfiguredAuthAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin.startsWith("https://");
  }

  const forwardedProto =
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase() ?? "";
  if (forwardedProto === "https") {
    return true;
  }

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
