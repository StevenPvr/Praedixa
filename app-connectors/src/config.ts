import { z } from "zod";
import { tmpdir } from "node:os";
import path from "node:path";

import type { AppConfig } from "./types.js";

const DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:8000",
] as const;
const HOST_PATTERN = /^[a-zA-Z0-9.:-]{1,255}$/;
const ORG_SCOPE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/;

const serviceTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  token: z.string().trim().min(32).max(512),
  allowedOrgs: z.array(z.string().trim().min(1)).min(1),
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
          throw new Error(`CORS_ORIGINS must use http(s), received "${parsed.protocol}"`);
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
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
        throw new Error(
          "CORS_ORIGINS localhost addresses are forbidden outside development",
        );
      }
    }
  }

  return normalizedOrigins;
}

function parseAllowedOrgs(rawAllowedOrgs: string | undefined): string[] {
  return dedupeAllowedOrgs((rawAllowedOrgs ?? "").split(","));
}

function parsePublicBaseUrl(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string {
  const candidate =
    rawValue?.trim() ||
    (nodeEnv === "development" ? "http://127.0.0.1:8100" : "");

  if (candidate.length === 0) {
    throw new Error("CONNECTORS_PUBLIC_BASE_URL is required outside development");
  }

  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("CONNECTORS_PUBLIC_BASE_URL must use http(s)");
  }
  if (nodeEnv !== "development" && parsed.protocol !== "https:") {
    throw new Error("CONNECTORS_PUBLIC_BASE_URL must use https outside development");
  }

  return parsed.toString().replace(/\/$/, "");
}

function parseDatabaseUrl(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) {
    return null;
  }

  const parsed = new URL(value);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }
  return value;
}

function parseObjectStoreRoot(rawValue: string | undefined): string {
  const candidate =
    rawValue?.trim() || path.join(tmpdir(), "praedixa-connectors-object-store");
  if (candidate.length === 0) {
    throw new Error("CONNECTORS_OBJECT_STORE_ROOT must not be empty");
  }
  return candidate;
}

function parseServiceTokens(
  rawTokens: string | undefined,
  legacyToken: string | undefined,
  legacyAllowedOrgs: string[],
): AppConfig["serviceTokens"] {
  if (rawTokens != null && rawTokens.trim().length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawTokens);
    } catch {
      throw new Error("CONNECTORS_SERVICE_TOKENS must be valid JSON");
    }

    return serviceTokenSchema.array().min(1).parse(parsed).map((entry) => ({
      ...entry,
      allowedOrgs: dedupeAllowedOrgs(entry.allowedOrgs),
    }));
  }

  if (legacyToken != null && legacyToken.trim().length > 0) {
    if (legacyAllowedOrgs.length === 0) {
      throw new Error(
        "CONNECTORS_ALLOWED_ORGS is required when using CONNECTORS_INTERNAL_TOKEN",
      );
    }

    return [
      serviceTokenSchema.parse({
        name: "legacy-internal-token",
        token: legacyToken.trim(),
        allowedOrgs: legacyAllowedOrgs,
      }),
    ];
  }

  throw new Error(
    "CONNECTORS_SERVICE_TOKENS is required (or CONNECTORS_INTERNAL_TOKEN with CONNECTORS_ALLOWED_ORGS)",
  );
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
  CONNECTORS_SECRET_SEALING_KEY: z.string().trim().min(32).optional(),
});

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

  const allowedOrgs = parseAllowedOrgs(parsed.CONNECTORS_ALLOWED_ORGS);
  const serviceTokens = parseServiceTokens(
    parsed.CONNECTORS_SERVICE_TOKENS,
    parsed.CONNECTORS_INTERNAL_TOKEN,
    allowedOrgs,
  );

  return {
    port: parsed.PORT,
    host,
    nodeEnv: parsed.NODE_ENV,
    publicBaseUrl: parsePublicBaseUrl(
      parsed.CONNECTORS_PUBLIC_BASE_URL,
      parsed.NODE_ENV,
    ),
    databaseUrl: parseDatabaseUrl(parsed.DATABASE_URL),
    objectStoreRoot: parseObjectStoreRoot(parsed.CONNECTORS_OBJECT_STORE_ROOT),
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV),
    serviceTokens,
    secretSealingKey: parsed.CONNECTORS_SECRET_SEALING_KEY ?? null,
  };
}
