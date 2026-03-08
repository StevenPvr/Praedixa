import { NextResponse } from "next/server";
import {
  MAX_REQUESTS_PER_WINDOW,
  MAX_REQUEST_BODY_LENGTH,
  RATE_LIMIT_WINDOW_MS,
} from "../../../lib/api/pilot-application/constants";
import { sendPilotEmails } from "../../../lib/api/pilot-application/email";
import { getClientIp } from "../../../lib/api/pilot-application/rate-limit";
import { validateRequestBody } from "../../../lib/api/pilot-application/validation";
import {
  enforceFormRateLimit,
  hasFilledHoneypot,
  readJsonBody,
  rejectIfBodyTooLarge,
  rejectIfUntrustedOrigin,
} from "../../../lib/api/form-route";
import { getResendClient } from "../../../lib/api/resend-client";
import { hasJsonContentType } from "../../../lib/security/json-request";
import { logSecurityEvent, redactIpForLogs } from "../../../lib/security/audit-log";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const ip = getClientIp(request);

  try {
    const tooLargeResponse = rejectIfBodyTooLarge(
      request,
      MAX_REQUEST_BODY_LENGTH,
      "Corps de requête trop volumineux.",
    );
    if (tooLargeResponse) {
      return tooLargeResponse;
    }

    const rateLimitResponse = await enforceFormRateLimit(request, {
      eventPrefix: "pilot",
      ip,
      max: MAX_REQUESTS_PER_WINDOW,
      requestId,
      scope: "landing-pilot-application",
      serviceUnavailableMessage: "Service temporairement indisponible.",
      tooManyRequestsMessage: "Trop de requêtes. Veuillez réessayer plus tard.",
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const originResponse = rejectIfUntrustedOrigin(request, {
      eventPrefix: "pilot",
      ip,
      requestId,
      message: "Origine de requête non autorisée.",
    });
    if (originResponse) {
      return originResponse;
    }

    if (!hasJsonContentType(request)) {
      return NextResponse.json(
        { error: "Content-Type non supporte." },
        { status: 415 },
      );
    }

    const parsedBody = await readJsonBody(request, {
      eventPrefix: "pilot",
      invalidJsonMessage: "JSON invalide.",
      ip,
      maxBodyLength: MAX_REQUEST_BODY_LENGTH,
      requestId,
      tooLargeMessage: "Corps de requête trop volumineux.",
    });
    if (parsedBody.response) {
      return parsedBody.response;
    }

    if (hasFilledHoneypot(parsedBody.body)) {
      return NextResponse.json({ success: true });
    }

    const validation = validateRequestBody(parsedBody.body);
    if (!validation.valid) {
      logSecurityEvent("pilot.validation_failed", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return NextResponse.json({ success: true });
    }

    await sendPilotEmails(getResendClient(), validation.data, ip);
    return NextResponse.json({ success: true });
  } catch (error) {
    logSecurityEvent("pilot.unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
