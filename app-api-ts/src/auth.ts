import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import type { AppConfig, JWTPayload, UserRole } from "./types.js";

const GLOBAL_SUPER_ADMIN_ORGANIZATION_ID = "global-super-admin";

const roles: readonly UserRole[] = [
  "super_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

const roleSet = new Set<UserRole>(roles);

const claimSchema = z.object({
  sub: z.string().optional(),
  user_id: z.string().optional(),
  email: z.string().optional(),
  preferred_username: z.string().optional(),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  org_id: z.string().optional(),
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
  site_id: z.string().optional(),
  siteId: z.string().optional(),
  site_ids: z.array(z.string()).optional(),
  siteIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  exp: z.number().finite().positive().optional(),
  iat: z.number().finite().positive().optional(),
  profile: z.string().optional(),
  profiles: z.array(z.string()).optional(),
  realm_access: z
    .object({
      roles: z.array(z.string()).optional(),
    })
    .optional(),
  resource_access: z
    .record(
      z.string(),
      z.object({
        roles: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  app_metadata: z
    .object({
      role: z.string().optional(),
      roles: z.array(z.string()).optional(),
      organization_id: z.string().optional(),
      org_id: z.string().optional(),
      site_id: z.string().optional(),
      site_ids: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional(),
      profile: z.string().optional(),
      profiles: z.array(z.string()).optional(),
    })
    .optional(),
});
type JwtClaims = z.infer<typeof claimSchema>;

const ROLE_PERMISSION_FALLBACK: Record<UserRole, readonly string[]> = {
  super_admin: [
    "admin:console:access",
    "admin:monitoring:read",
    "admin:org:read",
    "admin:org:write",
    "admin:users:read",
    "admin:users:write",
    "admin:billing:read",
    "admin:billing:write",
    "admin:audit:read",
    "admin:onboarding:read",
    "admin:onboarding:write",
    "admin:messages:read",
    "admin:messages:write",
    "admin:integrations:read",
    "admin:integrations:write",
    "admin:support:read",
    "admin:support:write",
  ],
  org_admin: [
  ],
  hr_manager: [
  ],
  manager: [
  ],
  employee: [],
  viewer: [],
} as const;

const PROFILE_PERMISSION_FALLBACK: Record<string, readonly string[]> = {
  admin_ops: [
    "admin:console:access",
    "admin:monitoring:read",
    "admin:org:read",
    "admin:messages:read",
    "admin:messages:write",
    "admin:integrations:read",
    "admin:support:read",
  ],
  admin_compliance: [
    "admin:console:access",
    "admin:audit:read",
    "admin:billing:read",
    "admin:org:read",
    "admin:onboarding:read",
    "admin:integrations:read",
  ],
} as const;

type JwtConfig = AppConfig["jwt"];
const jwksResolverCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface JwtDecodeFailure {
  stage: "verify" | "claims";
  reason: string;
  tokenSummary: Record<string, unknown>;
}

export interface JwtDecodeResult {
  user: JWTPayload | null;
  failure: JwtDecodeFailure | null;
}

function getJwksResolver(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksResolverCache.get(jwksUrl);
  if (cached) {
    return cached;
  }

  const resolver = createRemoteJWKSet(new URL(jwksUrl), {
    timeoutDuration: 5000,
    cooldownDuration: 60_000,
    cacheMaxAge: 5 * 60_000,
  });
  jwksResolverCache.set(jwksUrl, resolver);
  return resolver;
}

function normalizeDistinctStrings(
  values: readonly string[],
  normalize: (value: string) => string = (value) => value.trim(),
): string[] {
  return Array.from(
    new Set(values.map((value) => normalize(value)).filter((value) => value.length > 0)),
  );
}

function pickKnownRoleFromList(candidates: readonly string[]): UserRole | null {
  const known = new Set(
    candidates
      .map((candidate) => normalizeRole(candidate))
      .filter((role): role is UserRole => role != null),
  );

  for (const role of roles) {
    if (known.has(role)) {
      return role;
    }
  }

  return null;
}

function pickKnownRoleFromSources(
  ...candidateGroups: Array<readonly string[] | undefined>
): UserRole | null {
  for (const candidateGroup of candidateGroups) {
    if (candidateGroup == null) {
      continue;
    }

    const role = pickKnownRoleFromList(candidateGroup);
    if (role != null) {
      return role;
    }
  }

  return null;
}

function normalizeRole(rawRole: string): UserRole | null {
  const trimmed = rawRole.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutPath = trimmed.includes("/")
    ? (trimmed.split("/").at(-1) ?? "")
    : trimmed;
  const normalized = withoutPath
    .toLowerCase()
    .replace(/^role[_:-]?/, "")
    .replace(/[\s-]+/g, "_");

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

  return roleSet.has(normalized as UserRole) ? (normalized as UserRole) : null;
}

function normalizeClientIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function resolveAcceptedResourceClients(
  acceptedResourceClients: readonly string[] | undefined,
): Set<string> {
  return new Set(
    (acceptedResourceClients ?? ["praedixa-api"])
      .map((value) => normalizeClientIdentifier(value))
      .filter((value) => value.length > 0),
  );
}

function getScopedResourceRoles(
  raw: JwtClaims,
  acceptedResourceClients: Set<string>,
): string[] {
  if (acceptedResourceClients.size === 0) {
    return [];
  }

  return Object.entries(raw.resource_access ?? {}).flatMap(([clientId, resource]) =>
    acceptedResourceClients.has(normalizeClientIdentifier(clientId))
      ? (resource.roles ?? [])
      : [],
  );
}

function getRole(
  raw: JwtClaims,
  acceptedResourceClients?: readonly string[],
): UserRole {
  const directCandidate = raw.role ?? raw.app_metadata?.role;
  if (directCandidate != null) {
    const normalizedDirect = normalizeRole(directCandidate);
    if (normalizedDirect != null) {
      return normalizedDirect;
    }
  }

  const resourceRoles = getScopedResourceRoles(
    raw,
    resolveAcceptedResourceClients(acceptedResourceClients),
  );
  return (
    pickKnownRoleFromSources(
      raw.roles,
      raw.groups,
      raw.app_metadata?.roles,
      raw.realm_access?.roles,
      resourceRoles,
    ) ?? "viewer"
  );
}

function getOrganizationId(raw: JwtClaims): string | null {
  return (
    raw.org_id ??
    raw.organization_id ??
    raw.organizationId ??
    raw.app_metadata?.organization_id ??
    raw.app_metadata?.org_id ??
    null
  );
}

function getSiteIds(raw: JwtClaims): string[] {
  const siteIds = raw.siteIds ?? raw.site_ids ?? raw.app_metadata?.site_ids;
  if (siteIds != null && siteIds.length > 0) {
    return normalizeDistinctStrings(siteIds);
  }

  const singleSite = raw.site_id ?? raw.siteId ?? raw.app_metadata?.site_id;
  if (singleSite != null) {
    return normalizeDistinctStrings([singleSite]);
  }
  return [];
}

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

function normalizePermissions(permissions: readonly string[]): string[] {
  return normalizeDistinctStrings(permissions, normalizePermission);
}

function summarizeUnknownToken(token: string): Record<string, unknown> {
  const [, payloadSegment] = token.split(".");
  if (!payloadSegment) {
    return { parseable: false };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    const aud = payload.aud;
    return {
      parseable: true,
      iss: typeof payload.iss === "string" ? payload.iss : null,
      azp: typeof payload.azp === "string" ? payload.azp : null,
      aud:
        typeof aud === "string"
          ? [aud]
          : Array.isArray(aud)
            ? aud.filter((value): value is string => typeof value === "string")
            : [],
      hasSub: typeof payload.sub === "string" && payload.sub.length > 0,
      hasEmail: typeof payload.email === "string" && payload.email.length > 0,
      hasPreferredUsername:
        typeof payload.preferred_username === "string" &&
        payload.preferred_username.length > 0,
      hasOrganizationId:
        typeof payload.organization_id === "string" ||
        typeof payload.organizationId === "string" ||
        typeof payload.org_id === "string",
      hasIat: typeof payload.iat === "number",
      hasExp: typeof payload.exp === "number",
    };
  } catch {
    return { parseable: false };
  }
}

function explainInvalidClaims(
  unknownPayload: unknown,
  acceptedResourceClients?: readonly string[],
): JwtDecodeFailure {
  const parsed = claimSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return {
      stage: "claims",
      reason: "JWT payload shape is invalid",
      tokenSummary: { parseableClaims: false },
    };
  }

  const payload = parsed.data;
  const role = getRole(payload, acceptedResourceClients);
  const organizationId = getOrganizationId(payload);
  const userId = payload.sub ?? payload.user_id;
  const email = payload.email ?? payload.preferred_username;
  const siteIds = getSiteIds(payload);

  let reason = "JWT claims are incompatible with the API contract";
  if (userId == null) {
    reason = "JWT is missing subject claims";
  } else if (email == null) {
    reason = "JWT is missing email or preferred_username";
  } else if (!hasValidJwtLifetime(payload)) {
    reason = "JWT is missing a valid exp/iat lifetime";
  } else if (organizationId == null && role !== "super_admin") {
    reason = "JWT is missing organization_id for a non-super-admin user";
  }

  return {
    stage: "claims",
    reason,
    tokenSummary: {
      parseableClaims: true,
      derivedRole: role,
      hasUserId: userId != null,
      hasEmail: email != null,
      hasOrganizationId: organizationId != null,
      hasIat: payload.iat != null,
      hasExp: payload.exp != null,
      siteIdCount: siteIds.length,
    },
  };
}

function normalizeProfile(profile: string): string {
  return profile
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getProfiles(raw: JwtClaims): string[] {
  return normalizeDistinctStrings(
    [
      raw.profile,
      ...(raw.profiles ?? []),
      raw.app_metadata?.profile,
      ...(raw.app_metadata?.profiles ?? []),
    ].filter((value): value is string => typeof value === "string"),
    normalizeProfile,
  );
}

function getPermissions(raw: JwtClaims, role: UserRole): string[] {
  const explicitPermissions = normalizePermissions([
    ...(raw.permissions ?? []),
    ...(raw.app_metadata?.permissions ?? []),
  ]);
  if (explicitPermissions.length > 0) {
    return explicitPermissions;
  }

  const profilePermissions = getProfiles(raw).flatMap(
    (profile) => PROFILE_PERMISSION_FALLBACK[profile] ?? [],
  );

  return normalizePermissions([
    ...profilePermissions,
    ...(ROLE_PERMISSION_FALLBACK[role] ?? []),
  ]);
}

function hasValidJwtLifetime(payload: JwtClaims): boolean {
  return (
    payload.exp != null &&
    payload.iat != null &&
    payload.exp > payload.iat
  );
}

export function parseBearerToken(authorization: string | undefined): string | null {
  if (authorization == null) {
    return null;
  }

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme !== "Bearer" || rest.length !== 1) {
    return null;
  }

  const token = rest[0];
  if (token == null || token.length === 0) {
    return null;
  }

  return token;
}

export function normalizeJwtClaims(unknownPayload: unknown): JWTPayload | null {
  return normalizeJwtClaimsWithAudience(unknownPayload);
}

function normalizeJwtClaimsWithAudience(
  unknownPayload: unknown,
  acceptedResourceClients?: readonly string[],
): JWTPayload | null {
  const parsed = claimSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return null;
  }

  const payload = parsed.data;
  const role = getRole(payload, acceptedResourceClients);
  const organizationId = getOrganizationId(payload);
  const userId = payload.sub ?? payload.user_id;
  const email = payload.email ?? payload.preferred_username;
  const siteIds = getSiteIds(payload);

  if (userId == null || email == null || !hasValidJwtLifetime(payload)) {
    return null;
  }

  if (organizationId == null && role !== "super_admin") {
    return null;
  }

  return {
    userId,
    email,
    role,
    organizationId: organizationId ?? GLOBAL_SUPER_ADMIN_ORGANIZATION_ID,
    siteIds,
    permissions: getPermissions(payload, role),
  };
}

export async function decodeJwtPayload(
  token: string,
  jwtConfig: JwtConfig,
): Promise<JWTPayload | null> {
  const result = await decodeJwtPayloadDetailed(token, jwtConfig);
  return result.user;
}

export async function decodeJwtPayloadDetailed(
  token: string,
  jwtConfig: JwtConfig,
): Promise<JwtDecodeResult> {
  const unknownTokenSummary = summarizeUnknownToken(token);
  const acceptedResourceClients = [jwtConfig.audience];

  try {
    const { payload } = await jwtVerify(token, getJwksResolver(jwtConfig.jwksUrl), {
      issuer: jwtConfig.issuerUrl,
      audience: jwtConfig.audience,
      algorithms: [...jwtConfig.algorithms],
      clockTolerance: 5,
    });

    const normalized = normalizeJwtClaimsWithAudience(
      payload,
      acceptedResourceClients,
    );
    if (normalized == null) {
      return {
        user: null,
        failure: explainInvalidClaims(payload, acceptedResourceClients),
      };
    }

    return { user: normalized, failure: null };
  } catch (error) {
    return {
      user: null,
      failure: {
        stage: "verify",
        reason:
          error instanceof Error ? error.message : "JWT verification failed",
        tokenSummary: unknownTokenSummary,
      },
    };
  }
}
