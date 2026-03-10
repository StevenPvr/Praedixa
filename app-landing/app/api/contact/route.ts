import {
  MAX_REQUESTS_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS,
} from "../../../lib/api/pilot-application/constants";
import { getClientIp } from "../../../lib/api/pilot-application/rate-limit";
import {
  buildChallengeClientContext,
  DEFAULT_MAX_AGE_MS,
  verifyContactChallenge,
} from "../../../lib/security/contact-challenge";
import {
  logSecurityEvent,
  redactIpForLogs,
} from "../../../lib/security/audit-log";
import {
  claimSingleUseToken,
  SecurityStoreUnavailableError,
} from "../../../lib/security/security-store";
import {
  enforceFormRateLimit,
  hasFilledHoneypot,
  jsonNoStore,
  readJsonBody,
  rejectIfBodyTooLarge,
  rejectIfUntrustedOrigin,
} from "../../../lib/api/form-route";
import { getResendClient } from "../../../lib/api/resend-client";
import { sendContactEmails } from "../../../lib/api/contact/email";
import { persistContactRequest } from "../../../lib/api/contact/persistence";
import { validateContactBody } from "../../../lib/api/contact/validation";
import { hasJsonContentType } from "../../../lib/security/json-request";

const MAX_REQUEST_BODY_LENGTH = 20_000;

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
      eventPrefix: "contact",
      ip,
      max: MAX_REQUESTS_PER_WINDOW,
      requestId,
      scope: "landing-contact",
      serviceUnavailableMessage: "Service temporairement indisponible.",
      tooManyRequestsMessage: "Trop de requêtes. Veuillez réessayer plus tard.",
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const originResponse = rejectIfUntrustedOrigin(request, {
      eventPrefix: "contact",
      ip,
      requestId,
      message: "Origine de requête non autorisée.",
    });
    if (originResponse) {
      return originResponse;
    }

    if (!hasJsonContentType(request)) {
      return jsonNoStore(
        { error: "Content-Type non supporte." },
        { status: 415 },
      );
    }

    const parsedBody = await readJsonBody(request, {
      eventPrefix: "contact",
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
      return jsonNoStore({ success: true });
    }

    const validation = validateContactBody(parsedBody.body);
    if (!validation.valid) {
      logSecurityEvent("contact.validation_failed", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return jsonNoStore({ error: validation.error }, { status: 400 });
    }
    if (validation.data.website !== "") {
      return jsonNoStore({ success: true });
    }

    const challenge = verifyContactChallenge({
      challengeToken: validation.data.challengeToken,
      captchaAnswer: validation.data.captchaAnswer,
      clientContext: buildChallengeClientContext(request),
    });
    if (!challenge.valid) {
      logSecurityEvent("contact.challenge_rejected", {
        requestId,
        ip: redactIpForLogs(ip),
        reason: challenge.reason,
      });
      return jsonNoStore(
        { error: "Test anti-spam invalide." },
        { status: 400 },
      );
    }

    const claimResponse = await claimChallengeToken(
      validation.data.challengeToken,
      requestId,
      ip,
    );
    if (claimResponse) {
      return claimResponse;
    }

    await sendContactEmails(getResendClient(), validation.data, ip);

    try {
      await persistContactRequest(validation.data, request, ip, requestId);
    } catch (error) {
      logSecurityEvent("contact.persistence_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    return jsonNoStore({ success: true });
  } catch (error) {
    logSecurityEvent("contact.unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonNoStore(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}

async function claimChallengeToken(
  challengeToken: string,
  requestId: string,
  ip: string,
): Promise<Response | null> {
  try {
    const claimed = await claimSingleUseToken(
      "landing-contact-challenge",
      challengeToken,
      DEFAULT_MAX_AGE_MS,
    );

    if (claimed) {
      return null;
    }

    logSecurityEvent("contact.challenge_replayed", {
      requestId,
      ip: redactIpForLogs(ip),
    });
    return jsonNoStore({ error: "Test anti-spam invalide." }, { status: 400 });
  } catch (error) {
    if (!(error instanceof SecurityStoreUnavailableError)) {
      throw error;
    }

    logSecurityEvent("contact.security_store_unavailable", {
      requestId,
      ip: redactIpForLogs(ip),
    });
    return jsonNoStore(
      { error: "Service temporairement indisponible." },
      { status: 503 },
    );
  }
}
