import { z } from "zod";

import type { JWTPayload, UserRole } from "./types.js";

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
  role: z.string().optional(),
  org_id: z.string().optional(),
  organization_id: z.string().optional(),
  site_id: z.string().optional(),
  site_ids: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  app_metadata: z
    .object({
      role: z.string().optional(),
      organization_id: z.string().optional(),
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

function getRole(raw: z.infer<typeof claimSchema>): UserRole | null {
  const candidate = raw.role ?? raw.app_metadata?.role;
  if (candidate == null || !roleSet.has(candidate as UserRole)) {
    return null;
  }
  return candidate as UserRole;
}

function getOrganizationId(raw: z.infer<typeof claimSchema>): string | null {
  return raw.org_id ?? raw.organization_id ?? raw.app_metadata?.organization_id ?? null;
}

function getSiteIds(raw: z.infer<typeof claimSchema>): string[] {
  if (raw.site_ids != null && raw.site_ids.length > 0) {
    return raw.site_ids;
  }

  if (raw.app_metadata?.site_ids != null && raw.app_metadata.site_ids.length > 0) {
    return raw.app_metadata.site_ids;
  }

  const singleSite = raw.site_id ?? raw.app_metadata?.site_id;
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
  const organizationId = getOrganizationId(payload);
  const userId = payload.sub ?? payload.user_id;
  const email = payload.email;

  if (role == null || organizationId == null || userId == null || email == null) {
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
