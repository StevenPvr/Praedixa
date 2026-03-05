import { createHash, timingSafeEqual } from "node:crypto";

const SENSITIVE_KEYS = [
  "secret",
  "token",
  "password",
  "api_key",
  "client_secret",
  "private_key",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase().replace(/-/g, "_");
  return SENSITIVE_KEYS.some((marker) => normalized.includes(marker));
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
  requestedAtIso: string,
): string {
  const material = `${organizationId}|${connectionId}|${trigger}|${requestedAtIso}`;
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
