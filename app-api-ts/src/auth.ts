import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import type { AppConfig, JWTPayload, UserRole } from "./types.js";

const DEFAULT_ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111";

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

function pickKnownRoleFromList(candidates: readonly string[]): UserRole | null {
  const known = candidates
    .map((candidate) => normalizeRole(candidate))
    .filter((role): role is UserRole => role != null);

  for (const role of roles) {
    if (known.includes(role)) {
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

function getRole(raw: z.infer<typeof claimSchema>): UserRole {
  const directCandidate = raw.role ?? raw.app_metadata?.role;
  if (directCandidate != null) {
    const normalizedDirect = normalizeRole(directCandidate);
    if (normalizedDirect != null) {
      return normalizedDirect;
    }
  }

  const topLevelRole = pickKnownRoleFromList(raw.roles ?? []);
  if (topLevelRole != null) {
    return topLevelRole;
  }

  const groupsRole = pickKnownRoleFromList(raw.groups ?? []);
  if (groupsRole != null) {
    return groupsRole;
  }

  const appMetadataRoles = pickKnownRoleFromList(raw.app_metadata?.roles ?? []);
  if (appMetadataRoles != null) {
    return appMetadataRoles;
  }

  const realmRole = pickKnownRoleFromList(raw.realm_access?.roles ?? []);
  if (realmRole != null) {
    return realmRole;
  }

  const resourceRoles = Object.values(raw.resource_access ?? {}).flatMap(
    (resource) => resource.roles ?? [],
  );
  return pickKnownRoleFromList(resourceRoles) ?? "viewer";
}

function getOrganizationId(raw: z.infer<typeof claimSchema>): string | null {
  return (
    raw.org_id ??
    raw.organization_id ??
    raw.organizationId ??
    raw.app_metadata?.organization_id ??
    raw.app_metadata?.org_id ??
    null
  );
}

function getSiteIds(raw: z.infer<typeof claimSchema>): string[] {
  if (raw.siteIds != null && raw.siteIds.length > 0) {
    return raw.siteIds;
  }

  if (raw.site_ids != null && raw.site_ids.length > 0) {
    return raw.site_ids;
  }

  if (raw.app_metadata?.site_ids != null && raw.app_metadata.site_ids.length > 0) {
    return raw.app_metadata.site_ids;
  }

  const singleSite = raw.site_id ?? raw.siteId ?? raw.app_metadata?.site_id;
  return singleSite == null ? [] : [singleSite];
}

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

function normalizePermissions(permissions: readonly string[]): string[] {
  return Array.from(
    new Set(
      permissions
        .map((permission) => normalizePermission(permission))
        .filter((permission) => permission.length > 0),
    ),
  );
}

function getProfiles(raw: z.infer<typeof claimSchema>): string[] {
  const profiles = [
    raw.profile,
    ...(raw.profiles ?? []),
    raw.app_metadata?.profile,
    ...(raw.app_metadata?.profiles ?? []),
  ].filter((value): value is string => typeof value === "string");

  return Array.from(
    new Set(
      profiles
        .map((profile) =>
          profile
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_"),
        )
        .filter((profile) => profile.length > 0),
    ),
  );
}

function getPermissions(raw: z.infer<typeof claimSchema>, role: UserRole): string[] {
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
  const parsed = claimSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return null;
  }

  const payload = parsed.data;
  const role = getRole(payload);
  const organizationId = getOrganizationId(payload) ?? DEFAULT_ORGANIZATION_ID;
  const userId = payload.sub ?? payload.user_id;
  const email = payload.email ?? payload.preferred_username;

  if (userId == null || email == null) {
    return null;
  }

  return {
    userId,
    email,
    role,
    organizationId,
    siteIds: getSiteIds(payload),
    permissions: getPermissions(payload, role),
  };
}

export async function decodeJwtPayload(
  token: string,
  jwtConfig: JwtConfig,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwksResolver(jwtConfig.jwksUrl), {
      issuer: jwtConfig.issuerUrl,
      audience: jwtConfig.audience,
      algorithms: [...jwtConfig.algorithms],
      clockTolerance: 5,
    });
    return normalizeJwtClaims(payload);
  } catch {
    return null;
  }
}
