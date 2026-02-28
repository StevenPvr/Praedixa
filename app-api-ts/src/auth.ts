import { z } from "zod";

import type { JWTPayload, UserRole } from "./types.js";

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
    })
    .optional(),
});

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return null;
  }
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

function getPermissions(raw: z.infer<typeof claimSchema>): string[] {
  if (raw.permissions != null) {
    return raw.permissions;
  }
  if (raw.app_metadata?.permissions != null) {
    return raw.app_metadata.permissions;
  }
  return [];
}

export function parseBearerToken(authorization: string | undefined): string | null {
  if (authorization == null) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || token == null || token.length === 0) {
    return null;
  }

  return token;
}

export function decodeJwtPayload(token: string): JWTPayload | null {
  const chunks = token.split(".");
  if (chunks.length !== 3) {
    return null;
  }

  const payloadChunk = chunks[1];
  if (payloadChunk == null) {
    return null;
  }

  const rawPayload = decodeBase64Url(payloadChunk);
  if (rawPayload == null) {
    return null;
  }

  let unknownPayload: unknown;
  try {
    unknownPayload = JSON.parse(rawPayload);
  } catch {
    return null;
  }

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
    permissions: getPermissions(payload),
  };
}
