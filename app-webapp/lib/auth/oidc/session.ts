import {
  DEFAULT_ROLE,
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  SESSION_CLOCK_SKEW_SECONDS,
  type AuthSessionData,
  type JwtPayload,
  type OidcUser,
} from "./types";
import {
  base64UrlDecode,
  base64UrlEncode,
  getOwnValue,
  getString,
  normalizeKnownRole,
  parseJsonObject,
} from "./jwt";

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
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

function parseRefreshTokenHash(parsed: JwtPayload): string | null {
  const rawRefreshTokenHash = getOwnValue(parsed, "refreshTokenHash");
  return typeof rawRefreshTokenHash === "string" && rawRefreshTokenHash.length > 0
    ? rawRefreshTokenHash
    : rawRefreshTokenHash === null
      ? null
      : null;
}

function isValidSessionWindow(
  issuedAt: number,
  sessionExpiresAt: number,
): boolean {
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  return !(
    issuedAt > nowEpochSeconds + SESSION_CLOCK_SKEW_SECONDS ||
    sessionExpiresAt <= nowEpochSeconds - SESSION_CLOCK_SKEW_SECONDS ||
    sessionExpiresAt <= issuedAt
  );
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
  const sessionExpiresAt = parsed.sessionExpiresAt;
  const accessTokenHash = getString(parsed, "accessTokenHash");
  const refreshTokenHash = parseRefreshTokenHash(parsed);

  if (
    !sub ||
    !email ||
    typeof accessTokenExp !== "number" ||
    typeof issuedAt !== "number" ||
    typeof sessionExpiresAt !== "number" ||
    !accessTokenHash
  ) {
    return null;
  }

  if (!isValidSessionWindow(issuedAt, sessionExpiresAt)) {
    return null;
  }

  return {
    sub,
    email,
    role: normalizeKnownRole(role),
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
