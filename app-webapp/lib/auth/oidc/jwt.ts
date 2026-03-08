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

function getStringArray(payload: JwtPayload, key: string): string[] {
  const value = getOwnValue(payload, key);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
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

function getClientResourceRole(
  payload: JwtPayload,
  clientId: string,
): string | null {
  const resourceAccess = getOwnValue(payload, "resource_access");
  if (
    !resourceAccess ||
    typeof resourceAccess !== "object" ||
    Array.isArray(resourceAccess) ||
    !isSafeObjectKey(clientId)
  ) {
    return null;
  }

  const clientAccess = getOwnValue(
    resourceAccess as Record<string, unknown>,
    clientId,
  );
  if (
    !clientAccess ||
    typeof clientAccess !== "object" ||
    Array.isArray(clientAccess)
  ) {
    return null;
  }

  return getRoleFromList(
    getOwnValue(clientAccess as Record<string, unknown>, "roles"),
  );
}

function extractRole(payload: JwtPayload, clientId: string): string {
  const clientResourceRole = getClientResourceRole(payload, clientId);
  if (clientResourceRole) return clientResourceRole;

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

  return DEFAULT_ROLE;
}

function toKnownRole(role: string): string {
  return mapToKnownRole(role) ?? DEFAULT_ROLE;
}

export function normalizeKnownRole(role: string): string {
  return toKnownRole(role);
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
    getString(payload, "org_id") ??
    getString(payload, "organization_id") ??
    getString(payload, "organizationId") ??
    getNestedString(payload, "app_metadata", "organization_id") ??
    getNestedString(payload, "app_metadata", "org_id");

  const siteIdCandidates = [
    getString(payload, "site_id"),
    getString(payload, "siteId"),
    getNestedString(payload, "app_metadata", "site_id"),
    getStringArray(payload, "site_ids").length === 1
      ? getStringArray(payload, "site_ids")[0]
      : null,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return {
    id: sub,
    email,
    role: toKnownRole(extractRole(payload, clientId)),
    organizationId,
    siteId: siteIdCandidates[0] ?? null,
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
