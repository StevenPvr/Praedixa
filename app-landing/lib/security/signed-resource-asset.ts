import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PARAM = "sig";
const EXPIRES_AT_PARAM = "exp";
const DEFAULT_SIGNED_ASSET_TTL_MS = 2 * 60_000;
const LOCAL_FALLBACK_SECRET = "landing-local-dev-asset-signing-secret";

type VerificationReason =
  | "expired"
  | "missing_expiry"
  | "missing_signature"
  | "secret_unavailable"
  | "signature_mismatch";

function resolveAssetSigningSecret(): string | null {
  const configuredSecret = process.env.LANDING_ASSET_SIGNING_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return LOCAL_FALLBACK_SECRET;
}

function createPayload(
  locale: string,
  slug: string,
  expiresAt: number,
): string {
  return `landing-resource-asset:${locale}:${slug}:${expiresAt}`;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function hasMatchingSignature(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (
    expectedBuffer.length === 0 ||
    expectedBuffer.length !== providedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function buildSignedResourceAssetHref(
  locale: string,
  slug: string,
  options?: { now?: number; ttlMs?: number },
): string | null {
  const secret = resolveAssetSigningSecret();
  if (!secret) {
    return null;
  }

  const now = options?.now ?? Date.now();
  const ttlMs = options?.ttlMs ?? DEFAULT_SIGNED_ASSET_TTL_MS;
  const expiresAt = now + ttlMs;
  const payload = createPayload(locale, slug, expiresAt);
  const signature = signPayload(payload, secret);
  const params = new URLSearchParams({
    [EXPIRES_AT_PARAM]: String(expiresAt),
    [SIGNATURE_PARAM]: signature,
  });

  return `/${locale}/ressources/${slug}/asset?${params.toString()}`;
}

export function verifySignedResourceAssetRequest(input: {
  locale: string;
  slug: string;
  expiresAt: string | null;
  signature: string | null;
  now?: number;
}): { valid: true } | { valid: false; reason: VerificationReason } {
  const secret = resolveAssetSigningSecret();
  if (!secret) {
    return { valid: false, reason: "secret_unavailable" };
  }

  if (!input.expiresAt) {
    return { valid: false, reason: "missing_expiry" };
  }

  if (!input.signature) {
    return { valid: false, reason: "missing_signature" };
  }

  const expiresAt = Number.parseInt(input.expiresAt, 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return { valid: false, reason: "missing_expiry" };
  }

  const now = input.now ?? Date.now();
  if (expiresAt <= now) {
    return { valid: false, reason: "expired" };
  }

  const payload = createPayload(input.locale, input.slug, expiresAt);
  const expectedSignature = signPayload(payload, secret);
  if (!hasMatchingSignature(expectedSignature, input.signature)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return { valid: true };
}
