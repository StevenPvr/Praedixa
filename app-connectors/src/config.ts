import { z } from "zod";
import { tmpdir } from "node:os";
import path from "node:path";

import type { AppConfig, ServiceTokenCapability } from "./types.js";

const DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:8000",
] as const;
const HOST_PATTERN = /^[a-zA-Z0-9.:-]{1,255}$/;
const ORG_SCOPE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;
const SERVICE_TOKEN_CAPABILITIES = [
  "catalog:read",
  "connections:read",
  "connections:write",
  "ingest_credentials:read",
  "ingest_credentials:write",
  "raw_events:read",
  "raw_events:write",
  "oauth:write",
  "connections:test",
  "sync:read",
  "sync:write",
  "audit:read",
] as const satisfies readonly ServiceTokenCapability[];

const serviceTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  token: z.string().trim().min(32).max(512),
  allowedOrgs: z.array(z.string().trim().min(1)).min(1),
  capabilities: z.array(z.enum(SERVICE_TOKEN_CAPABILITIES)).min(1),
});

function normalizeAllowedOrg(value: string): string {
  if (!ORG_SCOPE_PATTERN.test(value)) {
    throw new Error(`Invalid organization scope "${value}"`);
  }
  return value;
}

function dedupeAllowedOrgs(rawAllowedOrgs: readonly string[]): string[] {
  return Array.from(
    new Set(
      rawAllowedOrgs
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => normalizeAllowedOrg(value)),
    ),
  );
}

function parseCorsOrigins(
  rawOrigins: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string[] {
  const configuredOrigins = (rawOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const candidateOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : nodeEnv === "development"
        ? [...DEV_CORS_ORIGINS]
        : [];

  const normalizedOrigins = Array.from(
    new Set(
      candidateOrigins.map((origin) => {
        if (origin === "*") {
          throw new Error("CORS_ORIGINS wildcard '*' is forbidden");
        }
        const parsed = new URL(origin);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error(
            `CORS_ORIGINS must use http(s), received "${parsed.protocol}"`,
          );
        }
        return parsed.origin;
      }),
    ),
  );

  if (nodeEnv !== "development") {
    for (const origin of normalizedOrigins) {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:") {
        throw new Error("CORS_ORIGINS must be https outside development");
      }

      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
      ) {
        throw new Error(
          "CORS_ORIGINS localhost addresses are forbidden outside development",
        );
      }
    }
  }

  return normalizedOrigins;
}

function parseList(rawValue: string | undefined): string[] {
  const value = rawValue?.trim() ?? "";
  if (!value) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function parseAllowedOutboundHosts(
  rawHosts: string | undefined,
  label: string,
): string[] {
  return parseList(rawHosts).map((entry) => {
    const normalized = entry.toLowerCase();
    if (
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
        normalized,
      )
    ) {
      throw new Error(`${label} contains invalid host "${entry}"`);
    }
    return normalized;
  });
}

function parsePublicBaseUrl(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string {
  const candidate =
    rawValue?.trim() ||
    (nodeEnv === "development" ? "http://127.0.0.1:8100" : "");

  if (candidate.length === 0) {
    throw new Error(
      "CONNECTORS_PUBLIC_BASE_URL is required outside development",
    );
  }

  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("CONNECTORS_PUBLIC_BASE_URL must use http(s)");
  }
  if (parsed.username || parsed.password) {
    throw new Error("CONNECTORS_PUBLIC_BASE_URL must not embed credentials");
  }
  if (parsed.search || parsed.hash) {
    throw new Error(
      "CONNECTORS_PUBLIC_BASE_URL must not include query or fragment",
    );
  }
  if (nodeEnv !== "development" && parsed.protocol !== "https:") {
    throw new Error(
      "CONNECTORS_PUBLIC_BASE_URL must use https outside development",
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

function parseDatabaseUrl(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string | null {
  const value = rawValue?.trim();
  if (!value) {
    if (nodeEnv === "development") {
      return null;
    }
    throw new Error("DATABASE_URL is required outside development");
  }

  const parsed = new URL(value);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }
  return value;
}

function parseBooleanEnv(
  rawValue: string | undefined,
  label: string,
  defaultValue = false,
): boolean {
  const value = rawValue?.trim().toLowerCase();
  if (!value) {
    return defaultValue;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${label} must be either "true" or "false"`);
}

function parseObjectStoreRoot(rawValue: string | undefined): string {
  const candidate = rawValue?.trim() ?? "";
  if (candidate.length > 0) {
    return candidate;
  }

  return path.join(tmpdir(), "praedixa-connectors-object-store");
}

function parseServiceTokens(
  rawTokens: string | undefined,
): AppConfig["serviceTokens"] {
  if (rawTokens != null && rawTokens.trim().length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawTokens);
    } catch {
      throw new Error("CONNECTORS_SERVICE_TOKENS must be valid JSON");
    }

    return serviceTokenSchema
      .array()
      .min(1)
      .parse(parsed)
      .map((entry) => ({
        ...entry,
        allowedOrgs: dedupeAllowedOrgs(entry.allowedOrgs),
        capabilities: Array.from(new Set(entry.capabilities)),
      }));
  }

  throw new Error("CONNECTORS_SERVICE_TOKENS is required");
}

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((v) => (v == null ? 8100 : Number(v)))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .optional()
    .default("development"),
  HOST: z.string().trim().optional(),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CONNECTORS_OBJECT_STORE_ROOT: z.string().optional(),
  CONNECTORS_PUBLIC_BASE_URL: z.string().optional(),
  CONNECTORS_SERVICE_TOKENS: z.string().optional(),
  CONNECTORS_INTERNAL_TOKEN: z.string().optional(),
  CONNECTORS_ALLOWED_ORGS: z.string().optional(),
  CONNECTORS_ALLOWED_CAPABILITIES: z.string().optional(),
  CONNECTORS_ALLOWED_OUTBOUND_HOSTS: z.string().optional(),
  CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS: z.string().optional(),
  CONNECTORS_SECRET_SEALING_KEY: z.string().trim().min(32).optional(),
  TRUST_PROXY: z.string().optional(),
});

function rejectLegacyServiceTokenEnv(rawEnv: {
  CONNECTORS_INTERNAL_TOKEN?: string | undefined;
  CONNECTORS_ALLOWED_ORGS?: string | undefined;
  CONNECTORS_ALLOWED_CAPABILITIES?: string | undefined;
}): void {
  const legacyKeys = [
    ["CONNECTORS_INTERNAL_TOKEN", rawEnv.CONNECTORS_INTERNAL_TOKEN],
    ["CONNECTORS_ALLOWED_ORGS", rawEnv.CONNECTORS_ALLOWED_ORGS],
    ["CONNECTORS_ALLOWED_CAPABILITIES", rawEnv.CONNECTORS_ALLOWED_CAPABILITIES],
  ]
    .filter(([, value]) => (value?.trim() ?? "").length > 0)
    .map(([key]) => key);

  if (legacyKeys.length === 0) {
    return;
  }

  const verb = legacyKeys.length === 1 ? "is" : "are";
  throw new Error(
    `${legacyKeys.join(", ")} ${verb} no longer supported; use CONNECTORS_SERVICE_TOKENS`,
  );
}

function parseRequiredObjectStoreRoot(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string {
  const objectStoreRoot = parseObjectStoreRoot(rawValue);
  if (nodeEnv !== "development" && (rawValue?.trim() ?? "").length === 0) {
    throw new Error(
      "CONNECTORS_OBJECT_STORE_ROOT is required outside development",
    );
  }
  return objectStoreRoot;
}

function parseSecretSealingKey(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string | null {
  const value = rawValue?.trim() ?? "";
  if (value.length > 0) {
    return value;
  }
  if (nodeEnv === "development") {
    return null;
  }
  throw new Error(
    "CONNECTORS_SECRET_SEALING_KEY is required outside development",
  );
}

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(rawEnv);
  const host =
    parsed.HOST != null && parsed.HOST.length > 0
      ? parsed.HOST
      : parsed.NODE_ENV === "development"
        ? "127.0.0.1"
        : "0.0.0.0";

  if (!HOST_PATTERN.test(host)) {
    throw new Error(`Invalid HOST value "${host}"`);
  }

  rejectLegacyServiceTokenEnv(parsed);
  const serviceTokens = parseServiceTokens(parsed.CONNECTORS_SERVICE_TOKENS);
  const allowedOutboundHosts = parseAllowedOutboundHosts(
    parsed.CONNECTORS_ALLOWED_OUTBOUND_HOSTS,
    "CONNECTORS_ALLOWED_OUTBOUND_HOSTS",
  );
  const allowedSandboxOutboundHosts = parseAllowedOutboundHosts(
    parsed.CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS,
    "CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS",
  );
  if (parsed.NODE_ENV !== "development" && allowedOutboundHosts.length === 0) {
    throw new Error(
      "CONNECTORS_ALLOWED_OUTBOUND_HOSTS is required outside development",
    );
  }

  return {
    port: parsed.PORT,
    host,
    nodeEnv: parsed.NODE_ENV,
    trustProxy: parseBooleanEnv(parsed.TRUST_PROXY, "TRUST_PROXY", false),
    publicBaseUrl: parsePublicBaseUrl(
      parsed.CONNECTORS_PUBLIC_BASE_URL,
      parsed.NODE_ENV,
    ),
    databaseUrl: parseDatabaseUrl(parsed.DATABASE_URL, parsed.NODE_ENV),
    objectStoreRoot: parseRequiredObjectStoreRoot(
      parsed.CONNECTORS_OBJECT_STORE_ROOT,
      parsed.NODE_ENV,
    ),
    allowedOutboundHosts,
    allowedSandboxOutboundHosts,
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV),
    serviceTokens,
    secretSealingKey: parseSecretSealingKey(
      parsed.CONNECTORS_SECRET_SEALING_KEY,
      parsed.NODE_ENV,
    ),
  };
}
