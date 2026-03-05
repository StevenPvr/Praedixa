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

function parseJwtAlgorithms(raw: string | undefined): readonly string[] {
  const parsed = (raw ?? "RS256")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0);

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

  return Array.from(new Set(parsed));
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

        let parsedOrigin: URL;
        try {
          parsedOrigin = new URL(origin);
        } catch {
          throw new Error(
            `CORS_ORIGINS contains an invalid URL origin: "${origin}"`,
          );
        }

        if (
          parsedOrigin.protocol !== "http:" &&
          parsedOrigin.protocol !== "https:"
        ) {
          throw new Error(
            `CORS_ORIGINS must use http(s), received "${parsedOrigin.protocol}"`,
          );
        }

        return parsedOrigin.origin;
      }),
    ),
  );

  if (nodeEnv !== "development") {
    for (const origin of normalizedOrigins) {
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
  }

  return normalizedOrigins;
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
});

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(rawEnv);
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

  const issuerUrl = parseAbsoluteUrl(
    issuerRaw,
    "AUTH_ISSUER_URL",
    parsed.NODE_ENV,
  );
  const defaultJwksUrl = `${issuerUrl}/protocol/openid-connect/certs`;
  const jwksUrl = parseAbsoluteUrl(
    parsed.AUTH_JWKS_URL?.trim() || defaultJwksUrl,
    "AUTH_JWKS_URL",
    parsed.NODE_ENV,
  );

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV),
    jwt: {
      issuerUrl,
      audience,
      jwksUrl,
      algorithms: parseJwtAlgorithms(parsed.AUTH_JWT_ALGORITHMS),
    },
  };
}
