import { isIP } from "node:net";
import { z } from "zod";

import type { AppConfig } from "./types.js";

const DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
] as const;

const JWT_ALGORITHM_ALLOWLIST = new Set([
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
]);
const CONNECTORS_RUNTIME_HOST_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

function parseAbsoluteUrl(
  value: string,
  label: string,
  nodeEnv: AppConfig["nodeEnv"],
): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use http(s)`);
  }

  if (nodeEnv !== "development" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use https outside development`);
  }

  return parsed.toString().replace(/\/$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isLoopbackHost(hostname: string): boolean {
  if (isLoopbackHostname(hostname)) {
    return true;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return hostname.startsWith("127.");
  }
  if (ipVersion === 6) {
    return hostname === "::1";
  }
  return false;
}

function normalizeAllowedHost(host: string): string {
  const normalized = host.trim().toLowerCase();
  if (!normalized) {
    throw new Error(
      "CONNECTORS_RUNTIME_ALLOWED_HOSTS must not contain empty entries",
    );
  }
  if (
    normalized.includes("/") ||
    normalized.includes("?") ||
    normalized.includes("#")
  ) {
    throw new Error(
      "CONNECTORS_RUNTIME_ALLOWED_HOSTS entries must be bare hostnames without paths",
    );
  }
  if (normalized.includes(":")) {
    throw new Error(
      "CONNECTORS_RUNTIME_ALLOWED_HOSTS entries must not include ports or credentials",
    );
  }
  if (isIP(normalized) !== 0) {
    return normalized;
  }
  if (!CONNECTORS_RUNTIME_HOST_PATTERN.test(normalized)) {
    throw new Error(
      `CONNECTORS_RUNTIME_ALLOWED_HOSTS contains an invalid hostname: "${host}"`,
    );
  }
  return normalized;
}

function normalizeListValues(
  raw: string | undefined,
  label: string,
  normalize: (value: string) => string = (value) => value,
): string[] {
  const value = raw?.trim() ?? "";
  if (!value) {
    return [];
  }

  const rawValues = value.startsWith("[")
    ? (() => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          throw new Error(
            `${label} must be a comma-separated list or JSON array of strings`,
          );
        }

        if (
          !Array.isArray(parsed) ||
          parsed.some((item) => typeof item !== "string")
        ) {
          throw new Error(`${label} JSON array entries must all be strings`);
        }

        return parsed;
      })()
    : value.split(",");

  return Array.from(
    new Set(
      rawValues
        .map((entry) => normalize(String(entry).trim()))
        .filter((entry) => entry.length > 0),
    ),
  );
}

function parseJwtAlgorithms(raw: string | undefined): readonly string[] {
  const parsed = normalizeListValues(
    raw ?? "RS256",
    "AUTH_JWT_ALGORITHMS",
    (value) => value.toUpperCase(),
  );

  if (parsed.length === 0) {
    throw new Error("AUTH_JWT_ALGORITHMS must contain at least one value");
  }

  for (const algorithm of parsed) {
    if (!JWT_ALGORITHM_ALLOWLIST.has(algorithm)) {
      throw new Error(
        `AUTH_JWT_ALGORITHMS contains unsupported value: "${algorithm}"`,
      );
    }
  }

  return parsed;
}

function normalizeCorsOrigin(origin: string): string {
  if (origin === "*") {
    throw new Error("CORS_ORIGINS wildcard '*' is forbidden");
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid URL origin: "${origin}"`);
  }

  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    throw new Error(
      `CORS_ORIGINS must use http(s), received "${parsedOrigin.protocol}"`,
    );
  }

  return parsedOrigin.origin;
}

function validateNonDevelopmentCorsOrigin(origin: string): void {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "https:") {
    throw new Error("CORS_ORIGINS must be https outside development");
  }

  const hostname = parsedOrigin.hostname.toLowerCase();
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

function parseCorsOrigins(
  rawOrigins: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string[] {
  const configuredOrigins = normalizeListValues(rawOrigins, "CORS_ORIGINS");

  const candidateOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : nodeEnv === "development"
        ? [...DEV_CORS_ORIGINS]
        : [];

  const normalizedOrigins = Array.from(
    new Set(candidateOrigins.map((origin) => normalizeCorsOrigin(origin))),
  );

  if (nodeEnv !== "development") {
    for (const origin of normalizedOrigins) {
      validateNonDevelopmentCorsOrigin(origin);
    }
  }

  return normalizedOrigins;
}

function parseConnectorsRuntimeAllowedHosts(
  rawHosts: string | undefined,
): string[] {
  return normalizeListValues(
    rawHosts,
    "CONNECTORS_RUNTIME_ALLOWED_HOSTS",
    normalizeAllowedHost,
  );
}

function isAllowedRuntimeHost(
  hostname: string,
  allowedHosts: readonly string[],
): boolean {
  return allowedHosts.some(
    (allowedHost) =>
      hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
  );
}

function parseConnectorsRuntimeUrl(
  rawValue: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
  allowedHosts: readonly string[],
): string {
  const candidate = rawValue?.trim() ?? "";
  if (candidate.length === 0) {
    if (nodeEnv === "development") {
      return "http://127.0.0.1:8100";
    }
    throw new Error("CONNECTORS_RUNTIME_URL is required outside development");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("CONNECTORS_RUNTIME_URL must be an absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("CONNECTORS_RUNTIME_URL must use http(s)");
  }
  if (parsed.username || parsed.password) {
    throw new Error("CONNECTORS_RUNTIME_URL must not embed credentials");
  }
  if (parsed.search || parsed.hash) {
    throw new Error(
      "CONNECTORS_RUNTIME_URL must not include query or fragment",
    );
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname) {
    throw new Error("CONNECTORS_RUNTIME_URL must include a hostname");
  }

  const isLocalHost = isLoopbackHost(hostname);
  if (nodeEnv === "development") {
    if (parsed.protocol === "http:" && !isLocalHost) {
      throw new Error(
        "CONNECTORS_RUNTIME_URL may use http only for localhost in development",
      );
    }
    return parsed.toString().replace(/\/$/, "");
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      "CONNECTORS_RUNTIME_URL must use https outside development",
    );
  }
  if (isLocalHost) {
    throw new Error(
      "CONNECTORS_RUNTIME_URL must not target localhost outside development",
    );
  }
  if (allowedHosts.length === 0) {
    throw new Error(
      "CONNECTORS_RUNTIME_ALLOWED_HOSTS must be configured outside development",
    );
  }
  if (!isAllowedRuntimeHost(hostname, allowedHosts)) {
    throw new Error("CONNECTORS_RUNTIME_URL host is not on the allowlist");
  }

  return parsed.toString().replace(/\/$/, "");
}

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((v) => (v == null ? 8000 : Number(v)))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .optional()
    .default("development"),
  CORS_ORIGINS: z.string().optional(),
  AUTH_ISSUER_URL: z.string().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_JWKS_URL: z.string().optional(),
  AUTH_JWT_ALGORITHMS: z.string().optional(),
  DEMO_MODE: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CONNECTORS_RUNTIME_URL: z.string().optional(),
  CONNECTORS_RUNTIME_ALLOWED_HOSTS: z.string().optional(),
  CONNECTORS_RUNTIME_TOKEN: z.string().optional(),
  CONNECTORS_INTERNAL_TOKEN: z.string().optional(),
});

function rejectLegacyConnectorsRuntimeToken(
  rawLegacyToken: string | undefined,
): void {
  if ((rawLegacyToken?.trim() ?? "").length === 0) {
    return;
  }

  throw new Error(
    "CONNECTORS_INTERNAL_TOKEN is no longer supported; use CONNECTORS_RUNTIME_TOKEN",
  );
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

function parseDatabaseUrl(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  const normalizedValue = value
    .replace(/^postgresql\+[^:]+:\/\//i, "postgresql://")
    .replace(/^postgres\+[^:]+:\/\//i, "postgres://");

  let parsed: URL;
  try {
    parsed = new URL(normalizedValue);
  } catch {
    throw new Error("DATABASE_URL must be a valid absolute URL");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }

  return normalizedValue;
}

function resolveJwksUrl(
  issuerUrl: string,
  rawJwksUrl: string | undefined,
  nodeEnv: AppConfig["nodeEnv"],
): string {
  const defaultJwksUrl = `${issuerUrl}/protocol/openid-connect/certs`;
  const explicitJwksUrl = rawJwksUrl?.trim();
  if (!explicitJwksUrl) {
    return defaultJwksUrl;
  }

  const parsedExplicitUrl = parseAbsoluteUrl(
    explicitJwksUrl,
    "AUTH_JWKS_URL",
    nodeEnv,
  );
  if (nodeEnv !== "development") {
    return parsedExplicitUrl;
  }

  const issuerHost = new URL(issuerUrl).host;
  const jwksHost = new URL(parsedExplicitUrl).host;
  return jwksHost === issuerHost ? parsedExplicitUrl : defaultJwksUrl;
}

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(rawEnv);
  const demoMode = parseBooleanEnv(parsed.DEMO_MODE, "DEMO_MODE", false);
  const trustProxy = parseBooleanEnv(parsed.TRUST_PROXY, "TRUST_PROXY", false);
  const databaseUrl = parseDatabaseUrl(parsed.DATABASE_URL);
  const connectorsRuntimeAllowedHosts = parseConnectorsRuntimeAllowedHosts(
    parsed.CONNECTORS_RUNTIME_ALLOWED_HOSTS,
  );
  const issuerRaw =
    parsed.AUTH_ISSUER_URL?.trim() ||
    (parsed.NODE_ENV === "development"
      ? "https://auth.praedixa.com/realms/praedixa"
      : "");
  const audience =
    parsed.AUTH_AUDIENCE?.trim() ||
    (parsed.NODE_ENV === "development" ? "praedixa-api" : "");

  if (!issuerRaw) {
    throw new Error("AUTH_ISSUER_URL is required");
  }
  if (!audience) {
    throw new Error("AUTH_AUDIENCE is required");
  }
  if (parsed.NODE_ENV !== "development" && demoMode) {
    throw new Error("DEMO_MODE is only supported in development");
  }
  if (parsed.NODE_ENV !== "development" && databaseUrl == null) {
    throw new Error("DATABASE_URL is required outside development");
  }

  const issuerUrl = parseAbsoluteUrl(
    issuerRaw,
    "AUTH_ISSUER_URL",
    parsed.NODE_ENV,
  );
  const jwksUrl = resolveJwksUrl(
    issuerUrl,
    parsed.AUTH_JWKS_URL,
    parsed.NODE_ENV,
  );
  const connectorsRuntimeUrl = parseConnectorsRuntimeUrl(
    parsed.CONNECTORS_RUNTIME_URL,
    parsed.NODE_ENV,
    connectorsRuntimeAllowedHosts,
  );
  rejectLegacyConnectorsRuntimeToken(parsed.CONNECTORS_INTERNAL_TOKEN);
  const connectorsRuntimeToken =
    parsed.CONNECTORS_RUNTIME_TOKEN?.trim() || null;
  if (parsed.NODE_ENV !== "development" && connectorsRuntimeToken == null) {
    throw new Error("CONNECTORS_RUNTIME_TOKEN is required outside development");
  }

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    trustProxy,
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV),
    databaseUrl,
    connectors: {
      runtimeUrl: connectorsRuntimeUrl,
      runtimeAllowedHosts: connectorsRuntimeAllowedHosts,
      runtimeToken: connectorsRuntimeToken,
    },
    jwt: {
      issuerUrl,
      audience,
      jwksUrl,
      algorithms: parseJwtAlgorithms(parsed.AUTH_JWT_ALGORITHMS),
    },
  };
}
