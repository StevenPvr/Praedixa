import { NextResponse } from "next/server";
import { hasJsonContentType } from "../security/json-request";
import {
  hasTrustedFormOrigin,
  isCrossSiteRequest,
} from "../security/request-origin";
import {
  RequestBodyTooLargeError,
  readTextBodyWithLimit,
} from "../security/request-body";
import { logSecurityEvent, redactIpForLogs } from "../security/audit-log";
import {
  consumeSecurityRateLimit,
  SecurityStoreUnavailableError,
} from "../security/security-store";

export function rejectIfBodyTooLarge(
  request: Request,
  maxBodyLength: number,
  message: string,
): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > maxBodyLength) {
    return NextResponse.json({ error: message }, { status: 413 });
  }
  return null;
}

export async function enforceFormRateLimit(request: Request, options: {
  eventPrefix: string;
  ip: string;
  max: number;
  requestId: string;
  scope: string;
  serviceUnavailableMessage: string;
  tooManyRequestsMessage: string;
  windowMs: number;
}): Promise<Response | null> {
  let rateLimit;

  try {
    rateLimit = await consumeSecurityRateLimit(request, {
      scope: options.scope,
      max: options.max,
      windowMs: options.windowMs,
    });
  } catch (error) {
    if (!(error instanceof SecurityStoreUnavailableError)) {
      throw error;
    }

    logSecurityEvent(`${options.eventPrefix}.security_store_unavailable`, {
      requestId: options.requestId,
      ip: redactIpForLogs(options.ip),
    });

    return NextResponse.json(
      { error: options.serviceUnavailableMessage },
      { status: 503 },
    );
  }

  if (rateLimit.allowed) {
    return null;
  }

  logSecurityEvent(`${options.eventPrefix}.rate_limited`, {
    requestId: options.requestId,
    ip: redactIpForLogs(options.ip),
  });

  return NextResponse.json(
    { error: options.tooManyRequestsMessage },
    {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    },
  );
}

export function rejectIfUntrustedOrigin(request: Request, options: {
  eventPrefix: string;
  ip: string;
  requestId: string;
  message: string;
}): Response | null {
  if (
    !isCrossSiteRequest(request) &&
    hasTrustedFormOrigin(request, { requireSource: true })
  ) {
    return null;
  }

  logSecurityEvent(`${options.eventPrefix}.origin_rejected`, {
    requestId: options.requestId,
    ip: redactIpForLogs(options.ip),
    origin: request.headers.get("origin") ?? "",
  });

  return NextResponse.json({ error: options.message }, { status: 403 });
}

export async function readJsonBody(
  request: Request,
  options: {
    eventPrefix: string;
    ip: string;
    requestId: string;
    invalidJsonMessage?: string;
    maxBodyLength?: number;
    maxLength?: number;
    tooLargeMessage?: string;
  },
): Promise<
  | { ok: true; body: unknown; response: null }
  | { ok: false; body: null; response: Response }
> {
  let rawText: string;
  const maxBodyLength = options.maxBodyLength ?? options.maxLength ?? 0;
  const invalidJsonMessage = options.invalidJsonMessage ?? "JSON invalide.";
  const tooLargeMessage = options.tooLargeMessage ?? "Corps de requête trop volumineux.";

  try {
    rawText = await readTextBodyWithLimit(request, maxBodyLength);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return {
        ok: false,
        body: null,
        response: NextResponse.json(
          { error: tooLargeMessage },
          { status: 413 },
        ),
      };
    }
    throw error;
  }

  if (rawText.length > maxBodyLength) {
    return {
      ok: false,
      body: null,
      response: NextResponse.json(
        { error: tooLargeMessage },
        { status: 413 },
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(rawText), response: null };
  } catch {
    logSecurityEvent(`${options.eventPrefix}.invalid_json`, {
      requestId: options.requestId,
      ip: redactIpForLogs(options.ip),
    });
    return {
      ok: false,
      body: null,
      response: NextResponse.json(
        { error: invalidJsonMessage },
        { status: 400 },
      ),
    };
  }
}

export function hasFilledHoneypot(body: unknown): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const rawWebsite = (body as Record<string, unknown>).website;
  return typeof rawWebsite === "string" && rawWebsite.trim() !== "";
}

export function rejectOversizedContentLength(
  request: Request,
  maxLength: number,
): Response | null {
  return rejectIfBodyTooLarge(
    request,
    maxLength,
    "Corps de requête trop volumineux.",
  );
}

export async function consumeFormRateLimit(request: Request, options: {
  eventPrefix: string;
  ip: string;
  max: number;
  requestId: string;
  scope: string;
  windowMs: number;
}): Promise<Response | null> {
  return enforceFormRateLimit(request, {
    ...options,
    serviceUnavailableMessage: "Service temporairement indisponible.",
    tooManyRequestsMessage: "Trop de requêtes. Veuillez réessayer plus tard.",
  });
}

export function rejectUntrustedFormOrigin(request: Request, options: {
  eventPrefix: string;
  ip: string;
  requestId: string;
}): Response | null {
  return rejectIfUntrustedOrigin(request, {
    ...options,
    message: "Origine de requête non autorisée.",
  });
}

export function rejectUnsupportedJsonContentType(request: Request): Response | null {
  if (hasJsonContentType(request)) {
    return null;
  }

  return NextResponse.json(
    { error: "Content-Type non supporte." },
    { status: 415 },
  );
}
