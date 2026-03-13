import {
  DEFAULT_API_AUDIENCE,
  DEFAULT_ROLE,
  FORBIDDEN_OBJECT_KEYS,
  ROLE_PRIORITY,
  type ApiAccessTokenCompatibilityReason,
  type JwtPayload,
  type KnownRole,
  type OidcUser,
} from "./types";

function isSafeObjectKey(key: string): boolean {
  return key.length > 0 && !FORBIDDEN_OBJECT_KEYS.has(key);
}

export function getOwnValue(
  payload: Record<string, unknown>,
  key: string,
): unknown | undefined {
  if (!isSafeObjectKey(key)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(payload, key)) return undefined;
  return payload[key];
}

export function base64UrlEncode(input: Uint8Array): string {
  let binary = "";
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): string {
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

export function parseJsonObject(value: string): JwtPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JwtPayload)
      : null;
  } catch {
    return null;
  }
}

export function getString(payload: JwtPayload, key: string): string | null {
  const value = getOwnValue(payload, key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeRole(rawRole: string): KnownRole | null {
  const trimmed = rawRole.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return ROLE_PRIORITY.includes(trimmed as KnownRole)
    ? (trimmed as KnownRole)
    : null;
}

export function normalizeKnownRole(role: string): string {
  return normalizeRole(role) ?? DEFAULT_ROLE;
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
    organizationId: getString(payload, "organization_id"),
    siteId: getString(payload, "site_id"),
  };
}

function getAudienceValues(payload: JwtPayload): string[] {
  const aud = getOwnValue(payload, "aud");
  if (typeof aud === "string" && aud.length > 0) {
    return [aud];
  }
  if (!Array.isArray(aud)) {
    return [];
  }
  return aud.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
}

export function getApiAccessTokenCompatibilityReason(
  token: string,
  clientId: string,
  expectedAudience = DEFAULT_API_AUDIENCE,
): ApiAccessTokenCompatibilityReason | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return "invalid_claims";
  }

  const user = userFromAccessToken(token, clientId);
  if (!user) {
    return "invalid_claims";
  }

  const audiences = getAudienceValues(payload);
  if (!audiences.includes(expectedAudience)) {
    return "missing_api_audience";
  }

  if (user.role !== "super_admin" && !user.organizationId) {
    return "missing_organization_id";
  }

  if ((user.role === "manager" || user.role === "hr_manager") && !user.siteId) {
    return "missing_site_id";
  }

  return null;
}
