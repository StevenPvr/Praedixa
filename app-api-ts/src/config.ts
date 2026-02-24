import { z } from "zod";

import type { AppConfig } from "./types.js";

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
});

export function loadConfig(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.parse(rawEnv);
  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
  };
}
