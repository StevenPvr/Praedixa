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
});

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(rawEnv);
  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV),
  };
}
