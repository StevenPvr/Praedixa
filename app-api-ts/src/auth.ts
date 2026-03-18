import { ADMIN_PERMISSION_NAMES } from "@praedixa/shared-types";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import type { AppConfig, JWTPayload, UserRole } from "./types.js";

const roles: readonly UserRole[] = [
  "super_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
] as const;

const roleSet = new Set<UserRole>(roles);
const SUPER_ADMIN_ORGANIZATION_ID = "11111111-1111-1111-1111-111111111111";

const claimSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  organization_id: z.string().optional(),
  site_id: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  exp: z.number().finite().positive().optional(),
  iat: z.number().finite().positive().optional(),
});
type JwtClaims = z.infer<typeof claimSchema>;

type JwtConfig = AppConfig["jwt"];
const jwksResolverCache = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

export interface JwtDecodeFailure {
  stage: "verify" | "claims";
  reason: string;
  tokenSummary: Record<string, unknown>;
}

export interface JwtDecodeResult {
  user: JWTPayload | null;
  failure: JwtDecodeFailure | null;
}

function getJwksResolver(
  jwksUrl: string,
): ReturnType<typeof createRemoteJWKSet> {
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

function normalizeRole(rawRole: string): UserRole | null {
  const trimmed = rawRole.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return roleSet.has(trimmed as UserRole) ? (trimmed as UserRole) : null;
}

function getRole(raw: JwtClaims): UserRole | null {
  if (raw.role == null) {
    return null;
  }

  return normalizeRole(raw.role);
}

function getOrganizationId(raw: JwtClaims): string | null {
  return raw.organization_id?.trim() || null;
}

function getSiteIds(raw: JwtClaims): string[] {
  const siteId = raw.site_id?.trim() || "";
  return siteId.length > 0 ? [siteId] : [];
}

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

function normalizePermissions(
  permissions: readonly string[],
  role?: UserRole | null,
): string[] {
  const explicitPermissions = Array.from(
    new Set(
      permissions
        .map((permission) => normalizePermission(permission))
        .filter((permission) => permission.length > 0),
    ),
  );

  if (role === "super_admin") {
    return Array.from(
      new Set([...ADMIN_PERMISSION_NAMES, ...explicitPermissions]),
    );
  }

  return explicitPermissions;
}

function requiresSiteId(role: UserRole): boolean {
  return role === "manager" || role === "hr_manager";
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
      hasRole: typeof payload.role === "string" && payload.role.length > 0,
      hasOrganizationId: typeof payload.organization_id === "string",
      hasSiteId: typeof payload.site_id === "string",
      hasPermissions: Array.isArray(payload.permissions),
      hasIat: typeof payload.iat === "number",
      hasExp: typeof payload.exp === "number",
    };
  } catch {
    return { parseable: false };
  }
}

function explainInvalidClaims(unknownPayload: unknown): JwtDecodeFailure {
  const parsed = claimSchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return {
      stage: "claims",
      reason: "JWT payload shape is invalid",
      tokenSummary: { parseableClaims: false },
    };
  }

  const payload = parsed.data;
  const role = getRole(payload);
  const organizationId = getOrganizationId(payload);
  const userId = payload.sub?.trim() || null;
  const email = payload.email?.trim() || null;
  const siteIds = getSiteIds(payload);

  let reason = "JWT claims are incompatible with the API contract";
  if (userId == null) {
    reason = "JWT is missing sub";
  } else if (email == null) {
    reason = "JWT is missing email";
  } else if (payload.role == null) {
    reason = "JWT is missing role";
  } else if (role == null) {
    reason = "JWT role must use a canonical top-level value";
  } else if (!hasValidJwtLifetime(payload)) {
    reason = "JWT is missing a valid exp/iat lifetime";
  } else if (role !== "super_admin" && organizationId == null) {
    reason = "JWT is missing organization_id";
  } else if (requiresSiteId(role) && siteIds.length === 0) {
    reason = "JWT is missing site_id for a scoped manager role";
  }

  return {
    stage: "claims",
    reason,
    tokenSummary: {
      parseableClaims: true,
      derivedRole: role,
      hasUserId: userId != null,
      hasEmail: email != null,
      hasRole: payload.role != null,
      hasOrganizationId: organizationId != null,
      hasIat: payload.iat != null,
      hasExp: payload.exp != null,
      siteIdCount: siteIds.length,
    },
  };
}

function hasValidJwtLifetime(payload: JwtClaims): boolean {
  return (
    payload.exp != null && payload.iat != null && payload.exp > payload.iat
  );
}

export function parseBearerToken(
  authorization: string | undefined,
): string | null {
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
  const organizationId = getOrganizationId(payload);
  const userId = payload.sub?.trim() || null;
  const email = payload.email?.trim() || null;
  const siteIds = getSiteIds(payload);

  if (
    userId == null ||
    email == null ||
    role == null ||
    !hasValidJwtLifetime(payload)
  ) {
    return null;
  }

  if (organizationId == null && role !== "super_admin") {
    return null;
  }

  if (requiresSiteId(role) && siteIds.length === 0) {
    return null;
  }

  return {
    userId,
    email,
    role,
    organizationId: organizationId ?? SUPER_ADMIN_ORGANIZATION_ID,
    siteIds,
    permissions: normalizePermissions(payload.permissions ?? [], role),
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

  try {
    const { payload } = await jwtVerify(
      token,
      getJwksResolver(jwtConfig.jwksUrl),
      {
        issuer: jwtConfig.issuerUrl,
        audience: jwtConfig.audience,
        algorithms: [...jwtConfig.algorithms],
        clockTolerance: 5,
      },
    );

    const normalized = normalizeJwtClaims(payload);
    if (normalized == null) {
      return {
        user: null,
        failure: explainInvalidClaims(payload),
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
