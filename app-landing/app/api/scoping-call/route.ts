import {
  MAX_REQUESTS_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS,
} from "../../../lib/api/pilot-application/constants";
import { getClientIp } from "../../../lib/api/pilot-application/rate-limit";
import {
  consumeFormRateLimit,
  hasFilledHoneypot,
  jsonNoStore,
  readJsonBody,
  rejectOversizedContentLength,
  rejectUnsupportedJsonContentType,
  rejectUntrustedFormOrigin,
} from "../../../lib/api/form-route";
import { getResendClient } from "../../../lib/api/resend-client";
import { sendScopingCallEmails } from "../../../lib/api/scoping-call/email";
import {
  MAX_REQUEST_BODY_LENGTH,
  validateScopingCallBody,
} from "../../../lib/api/scoping-call/validation";
import {
  logSecurityEvent,
  redactIpForLogs,
} from "../../../lib/security/audit-log";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const sizeError = rejectOversizedContentLength(
      request,
      MAX_REQUEST_BODY_LENGTH,
    );
    if (sizeError) {
      return sizeError;
    }

    const ip = getClientIp(request);
    const rateLimitError = await consumeFormRateLimit(request, {
      eventPrefix: "scoping_call",
      ip,
      max: MAX_REQUESTS_PER_WINDOW,
      requestId,
      scope: "landing-scoping-call",
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    const originError = rejectUntrustedFormOrigin(request, {
      eventPrefix: "scoping_call",
      ip,
      requestId,
    });
    if (originError) {
      return originError;
    }

    const contentTypeError = rejectUnsupportedJsonContentType(request);
    if (contentTypeError) {
      return contentTypeError;
    }

    const parsedBody = await readJsonBody(request, {
      eventPrefix: "scoping_call",
      ip,
      maxBodyLength: MAX_REQUEST_BODY_LENGTH,
      requestId,
    });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    if (hasFilledHoneypot(parsedBody.body)) {
      return jsonNoStore({ success: true });
    }

    const validation = validateScopingCallBody(parsedBody.body);
    if (!validation.valid) {
      logSecurityEvent("scoping_call.validation_failed", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return jsonNoStore({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return jsonNoStore({ success: true });
    }

    await sendScopingCallEmails(getResendClient(), validation.data, ip);
    return jsonNoStore({ success: true });
  } catch (error) {
    logSecurityEvent("scoping_call.unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonNoStore(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
