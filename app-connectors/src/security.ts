import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type { EncryptedSecretEnvelope } from "./types.js";

const SENSITIVE_KEYS = [
  "secret",
  "token",
  "password",
  "api_key",
  "client_secret",
  "private_key",
  "refresh_token",
  "access_token",
  "authorization_code",
  "passphrase",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase().replace(/-/g, "_");
  if (
    (normalized.includes("endpoint") || normalized.endsWith("url")) &&
    (normalized.includes("token") || normalized.includes("authorization"))
  ) {
    return false;
  }
  return SENSITIVE_KEYS.some((marker) => normalized.includes(marker));
}

export function containsSensitiveKeys(payload: unknown): boolean {
  if (Array.isArray(payload)) {
    return payload.some((item) => containsSensitiveKeys(item));
  }
  if (!isObject(payload)) {
    return false;
  }

  return Object.entries(payload).some(([key, value]) => {
    if (shouldRedact(key)) {
      return true;
    }
    return containsSensitiveKeys(value);
  });
}

export function maskSecret(value: string | null | undefined): string {
  if (value == null || value.length === 0) {
    return "***REDACTED***";
  }
  if (value.length <= 6) {
    return "***REDACTED***";
  }
  return `${value.slice(0, 3)}...${value.slice(-2)}`;
}

export function redactSensitive<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => redactSensitive(item)) as T;
  }

  if (!isObject(payload)) {
    return payload;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (shouldRedact(key)) {
      next[key] = "***REDACTED***";
      continue;
    }
    next[key] = redactSensitive(value);
  }
  return next as T;
}

export function makeIdempotencyKey(
  organizationId: string,
  connectionId: string,
  trigger: string,
  keyMaterial: string,
): string {
  const material = `${organizationId}|${connectionId}|${trigger}|${keyMaterial}`;
  return createHash("sha256").update(material).digest("hex");
}

export function safeEqualSecret(
  expected: string,
  actual: string | null | undefined,
): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(actual ?? "", "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    const padded = Buffer.alloc(expectedBuffer.length);
    receivedBuffer.copy(padded, 0, 0, Math.min(receivedBuffer.length, padded.length));
    timingSafeEqual(expectedBuffer, padded);
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function deriveSealingKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function sealSecretPayload(
  payload: Record<string, unknown>,
  sealingKey: string,
): EncryptedSecretEnvelope {
  const key = deriveSealingKey(sealingKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    authTag: authTag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

export function openSecretPayload<T extends Record<string, unknown>>(
  envelope: EncryptedSecretEnvelope,
  sealingKey: string,
): T {
  const key = deriveSealingKey(sealingKey);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export function createOpaqueStateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createPkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function createPkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function createSecretRef(
  organizationId: string,
  connectionId: string,
  kind: string,
  version: number,
): string {
  return `memory://connectors/${organizationId}/${connectionId}/${kind}/v${version}-${randomUUID()}`;
}

export function createOpaqueApiKey(prefix = "prdx_live"): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

export function computeHmacSha256(
  payload: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function verifyHmacSha256(
  payload: string,
  providedSignature: string | null | undefined,
  secret: string,
): boolean {
  if (providedSignature == null || providedSignature.trim().length === 0) {
    return false;
  }
  const expected = computeHmacSha256(payload, secret);
  return safeEqualSecret(expected, providedSignature.trim().toLowerCase());
}

export function isFreshUnixTimestamp(
  timestamp: string | null | undefined,
  toleranceSeconds = 300,
): boolean {
  if (timestamp == null || timestamp.trim().length === 0) {
    return false;
  }

  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - parsed) <= toleranceSeconds;
}

export function payloadSha256(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
