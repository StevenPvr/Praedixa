import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { getClientIp } from "../api/deployment-request/rate-limit";

export const DEFAULT_MIN_SOLVE_MS = 2_500;
export const DEFAULT_MAX_AGE_MS = 1000 * 60 * 15;
const CHALLENGE_VERSION = 1;
const MAX_OPERAND = 12;

interface ChallengePayload {
  v: number;
  a: number;
  b: number;
  iat: number;
  ctx?: string;
}

export interface ContactChallenge {
  captchaA: number;
  captchaB: number;
  challengeToken: string;
}

export type VerifyContactChallengeResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "unavailable"
        | "malformed"
        | "invalid-signature"
        | "invalid-context"
        | "incorrect-answer"
        | "too-fast"
        | "expired";
    };

function resolveChallengeSecret(): string | null {
  const explicit = process.env.CONTACT_FORM_CHALLENGE_SECRET?.trim();
  if (explicit) return explicit;

  if (process.env.NODE_ENV !== "production") {
    return "praedixa-local-contact-challenge-secret";
  }

  return null;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function signPayload(payloadPart: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

function safeTokenEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "base64url");
    const right = Buffer.from(b, "base64url");
    if (left.length === 0 || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function parsePayload(tokenPayload: string): ChallengePayload | null {
  const decoded = decodeBase64Url(tokenPayload);
  if (!decoded) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as ChallengePayload).v !== "number" ||
    typeof (parsed as ChallengePayload).a !== "number" ||
    typeof (parsed as ChallengePayload).b !== "number" ||
    typeof (parsed as ChallengePayload).iat !== "number"
  ) {
    return null;
  }

  const payload = parsed as ChallengePayload;
  if (
    !Number.isInteger(payload.v) ||
    !Number.isInteger(payload.a) ||
    !Number.isInteger(payload.b) ||
    !Number.isInteger(payload.iat) ||
    payload.v !== CHALLENGE_VERSION ||
    payload.a < 0 ||
    payload.b < 0 ||
    payload.a > MAX_OPERAND ||
    payload.b > MAX_OPERAND ||
    (payload.ctx !== undefined &&
      (typeof payload.ctx !== "string" ||
        payload.ctx.length === 0 ||
        payload.ctx.length > 64))
  ) {
    return null;
  }

  return payload;
}

export function buildChallengeClientContext(request: Request): string {
  const ip = getClientIp(request);
  const userAgent =
    request.headers.get("user-agent")?.trim().slice(0, 200) ?? "";

  return createHash("sha256")
    .update(`${ip}|${userAgent}`, "utf8")
    .digest("base64url")
    .slice(0, 32);
}

export function createContactChallenge(
  nowMs = Date.now(),
  clientContext?: string | null,
): ContactChallenge | null {
  const secret = resolveChallengeSecret();
  if (!secret) return null;

  const payload: ChallengePayload = {
    v: CHALLENGE_VERSION,
    a: randomInt(0, MAX_OPERAND + 1),
    b: randomInt(0, MAX_OPERAND + 1),
    iat: nowMs,
    ...(clientContext ? { ctx: clientContext } : {}),
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadPart, secret);

  return {
    captchaA: payload.a,
    captchaB: payload.b,
    challengeToken: `${payloadPart}.${signature}`,
  };
}

export function verifyContactChallenge({
  challengeToken,
  captchaAnswer,
  clientContext,
  nowMs = Date.now(),
  minSolveMs = DEFAULT_MIN_SOLVE_MS,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}: {
  challengeToken: string;
  captchaAnswer: number;
  clientContext?: string | null;
  nowMs?: number;
  minSolveMs?: number;
  maxAgeMs?: number;
}): VerifyContactChallengeResult {
  const secret = resolveChallengeSecret();
  if (!secret) return { valid: false, reason: "unavailable" };

  const [payloadPart, signature, extra] = challengeToken.split(".");
  if (!payloadPart || !signature || extra) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = signPayload(payloadPart, secret);
  if (!safeTokenEqual(signature, expectedSignature)) {
    return { valid: false, reason: "invalid-signature" };
  }

  const payload = parsePayload(payloadPart);
  if (!payload) return { valid: false, reason: "malformed" };

  if (payload.ctx && (!clientContext || payload.ctx !== clientContext)) {
    return { valid: false, reason: "invalid-context" };
  }

  if (captchaAnswer !== payload.a + payload.b) {
    return { valid: false, reason: "incorrect-answer" };
  }

  const elapsedMs = nowMs - payload.iat;
  if (elapsedMs < minSolveMs) {
    return { valid: false, reason: "too-fast" };
  }
  if (elapsedMs > maxAgeMs) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true };
}
