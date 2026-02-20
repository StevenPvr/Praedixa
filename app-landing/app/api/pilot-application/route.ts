import { Resend } from "resend";
import { NextResponse } from "next/server";
import { MAX_REQUEST_BODY_LENGTH } from "../../../lib/api/pilot-application/constants";
import { validateRequestBody } from "../../../lib/api/pilot-application/validation";
import {
  getClientIp,
  isRateLimited,
} from "../../../lib/api/pilot-application/rate-limit";
import {
  hasTrustedFormOrigin,
  isCrossSiteRequest,
} from "../../../lib/security/request-origin";
import { sendPilotEmails } from "../../../lib/api/pilot-application/email";

let resend: Resend | null = null;

function getResend(): Resend {
  /* v8 ignore next 5 -- lazy singleton init, mocked in tests */
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      parseInt(contentLength, 10) > MAX_REQUEST_BODY_LENGTH
    ) {
      return NextResponse.json(
        { error: "Corps de requête trop volumineux." },
        { status: 413 },
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 },
      );
    }

    if (isCrossSiteRequest(request) || !hasTrustedFormOrigin(request)) {
      return NextResponse.json(
        { error: "Origine de requête non autorisée." },
        { status: 403 },
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_REQUEST_BODY_LENGTH) {
      return NextResponse.json(
        { error: "Corps de requête trop volumineux." },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return NextResponse.json({ success: true });
    }

    const resendClient = getResend();
    await sendPilotEmails(resendClient, validation.data, ip);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez r\u00e9essayer." },
      { status: 500 },
    );
  }
}
