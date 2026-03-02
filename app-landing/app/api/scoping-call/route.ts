import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getClientIp,
  isRateLimited,
} from "../../../lib/api/pilot-application/rate-limit";
import { siteConfig } from "../../../lib/config/site";
import {
  hasTrustedFormOrigin,
  isCrossSiteRequest,
} from "../../../lib/security/request-origin";
import { logSecurityEvent, redactIpForLogs } from "../../../lib/security/audit-log";

const MAX_REQUEST_BODY_LENGTH = 12_000;
const MAX_NOTES_LENGTH = 800;
const MAX_COMPANY_LENGTH = 100;
const MAX_SOURCE_LENGTH = 60;
const MAX_TIMEZONE_LENGTH = 64;
const DEFAULT_FROM_EMAIL = "Praedixa <noreply@praedixa.com>";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type ScopingCallPayload = {
  locale: "fr" | "en";
  email: string;
  companyName: string;
  timezone: string;
  slots: [string, string, string];
  notes: string;
  website: string;
  source: string;
};

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeSubject(text: string): string {
  return text.replace(/[\r\n]/g, " ").slice(0, 120);
}

function readString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  required = true,
): string | null {
  const raw = input[key];
  if (raw === undefined || raw === null) {
    return required ? null : "";
  }
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (required && value.length === 0) return null;
  if (value.length > maxLength) return null;
  return value;
}

function normalizeLocale(value: string | null): "fr" | "en" | null {
  if (!value) return "fr";
  const normalized = value.trim().toLowerCase();
  return normalized === "fr" || normalized === "en" ? (normalized as "fr" | "en") : null;
}

function validateScopingCallBody(
  body: unknown,
): { valid: true; data: ScopingCallPayload } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }
  const input = body as Record<string, unknown>;

  const locale = normalizeLocale(readString(input, "locale", 8, false));
  if (!locale) return { valid: false, error: "Locale invalide." };

  const email = readString(input, "email", 254, true);
  if (!email || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: locale === "en" ? "Invalid email address." : "Adresse email invalide." };
  }

  const companyName = readString(input, "companyName", MAX_COMPANY_LENGTH, true);
  if (!companyName) {
    return { valid: false, error: locale === "en" ? "Company is required." : "Entreprise requise." };
  }

  const timezone = readString(input, "timezone", MAX_TIMEZONE_LENGTH, true);
  if (!timezone) {
    return { valid: false, error: locale === "en" ? "Timezone is required." : "Fuseau horaire requis." };
  }

  const slotsRaw = input.slots;
  if (!Array.isArray(slotsRaw) || slotsRaw.length !== 3) {
    return { valid: false, error: locale === "en" ? "3 time slots are required." : "3 créneaux sont requis." };
  }

  const slots: string[] = [];
  for (const slot of slotsRaw) {
    if (typeof slot !== "string") {
      return { valid: false, error: locale === "en" ? "Invalid time slot." : "Créneau invalide." };
    }
    const trimmed = slot.trim();
    if (!SLOT_REGEX.test(trimmed)) {
      return { valid: false, error: locale === "en" ? "Invalid time slot." : "Créneau invalide." };
    }
    slots.push(trimmed);
  }

  const uniqueSlots = new Set(slots);
  if (uniqueSlots.size !== slots.length) {
    return { valid: false, error: locale === "en" ? "Time slots must be different." : "Les créneaux doivent être différents." };
  }

  const notes = readString(input, "notes", MAX_NOTES_LENGTH, false);
  if (notes === null) {
    return { valid: false, error: locale === "en" ? "Invalid notes." : "Notes invalides." };
  }

  const source = readString(input, "source", MAX_SOURCE_LENGTH, false);
  if (source === null) {
    return { valid: false, error: locale === "en" ? "Invalid source." : "Source invalide." };
  }

  const websiteRaw = input.website;
  const website =
    typeof websiteRaw === "string" ? websiteRaw.trim().slice(0, 200) : "";

  return {
    valid: true,
    data: {
      locale,
      email: email.toLowerCase(),
      companyName,
      timezone,
      slots: slots as [string, string, string],
      notes,
      website,
      source,
    },
  };
}

function buildAdminHtml(data: ScopingCallPayload, ip: string): string {
  const safe = {
    companyName: escapeHtml(data.companyName),
    email: escapeHtml(data.email),
    timezone: escapeHtml(data.timezone),
    source: escapeHtml(data.source || "unknown"),
    notes: escapeHtml(data.notes || "").replace(/\n/g, "<br />"),
    ip: escapeHtml(ip),
  };

  const slots = data.slots
    .map((slot) => `<li style="margin: 0 0 6px 0;">${escapeHtml(slot)}</li>`)
    .join("");

  return `
    <h2>Demande de cadrage (30 min)</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${safe.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Fuseau horaire</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${safe.timezone}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Source</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${safe.source}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold; vertical-align: top;">Créneaux proposés</td><td style="padding: 10px;"><ul style="margin: 0; padding-left: 18px;">${slots}</ul></td></tr>
    </table>
    ${
      safe.notes
        ? `<p style="margin-top: 16px;"><strong>Notes</strong><br />${safe.notes}</p>`
        : ""
    }
    <p style="margin-top: 14px; color: #6b7280; font-size: 12px;">IP: ${safe.ip}</p>
  `;
}

function buildConfirmHtml(data: ScopingCallPayload): string {
  const isEnglish = data.locale === "en";
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const safeCompany = escapeHtml(data.companyName);
  const safeTimezone = escapeHtml(data.timezone);
  const safeNotes = escapeHtml(data.notes || "").replace(/\n/g, "<br />");
  const slots = data.slots
    .map((slot) => `<li style="margin: 0 0 6px 0;">${escapeHtml(slot)}</li>`)
    .join("");

  if (isEnglish) {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
        <h1 style="margin: 0 0 12px 0;">Request received</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          Thanks. We received your proposed 30-minute scoping call slots for <strong>${safeCompany}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Timezone: <strong>${safeTimezone}</strong>
        </p>
        <ul style="margin: 12px 0 0 0; padding-left: 18px;">
          ${slots}
        </ul>
        ${
          safeNotes
            ? `<p style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: #374151;"><strong>Notes</strong><br />${safeNotes}</p>`
            : ""
        }
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
        <p style="margin: 0; font-size: 14px; color: #374151;">
          We will confirm one slot by email within 48 business hours.
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
          Questions: <a href="mailto:${contactEmail}">${contactEmail}</a>
        </p>
      </div>
    `;
  }

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
      <h1 style="margin: 0 0 12px 0;">Demande reçue</h1>
      <p style="font-size: 16px; line-height: 1.6;">
        Merci. Nous avons reçu vos créneaux de cadrage (30 min) pour <strong>${safeCompany}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">
        Fuseau horaire : <strong>${safeTimezone}</strong>
      </p>
      <ul style="margin: 12px 0 0 0; padding-left: 18px;">
        ${slots}
      </ul>
      ${
        safeNotes
          ? `<p style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: #374151;"><strong>Notes</strong><br />${safeNotes}</p>`
          : ""
      }
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
      <p style="margin: 0; font-size: 14px; color: #374151;">
        Nous confirmons un créneau par email sous 48h ouvrées.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
        Questions : <a href="mailto:${contactEmail}">${contactEmail}</a>
      </p>
    </div>
  `;
}

function buildConfirmText(data: ScopingCallPayload): string {
  const isEnglish = data.locale === "en";
  const lines = [
    isEnglish
      ? `Company: ${data.companyName}`
      : `Entreprise : ${data.companyName}`,
    isEnglish ? `Timezone: ${data.timezone}` : `Fuseau horaire : ${data.timezone}`,
    "",
    isEnglish ? "Proposed slots:" : "Créneaux proposés :",
    ...data.slots.map((slot) => `- ${slot}`),
  ];

  if (data.notes) {
    lines.push("");
    lines.push(isEnglish ? "Notes:" : "Notes :");
    lines.push(data.notes);
  }

  lines.push("");
  lines.push(
    isEnglish
      ? "We will confirm one slot by email within 48 business hours."
      : "Nous confirmons un créneau par email sous 48h ouvrées.",
  );
  lines.push(`Contact: ${siteConfig.contact.email}`);

  return lines.join("\n");
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      Number.parseInt(contentLength, 10) > MAX_REQUEST_BODY_LENGTH
    ) {
      return NextResponse.json(
        { error: "Corps de requête trop volumineux." },
        { status: 413 },
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      logSecurityEvent("scoping_call.rate_limited", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 },
      );
    }

    if (
      isCrossSiteRequest(request) ||
      !hasTrustedFormOrigin(request, { requireSource: true })
    ) {
      logSecurityEvent("scoping_call.origin_rejected", {
        requestId,
        ip: redactIpForLogs(ip),
        origin: request.headers.get("origin") ?? "",
      });
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
      logSecurityEvent("scoping_call.invalid_json", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      const rawWebsite = (body as Record<string, unknown>).website;
      if (typeof rawWebsite === "string" && rawWebsite.trim() !== "") {
        return NextResponse.json({ success: true });
      }
    }

    const validation = validateScopingCallBody(body);
    if (!validation.valid) {
      logSecurityEvent("scoping_call.validation_failed", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return NextResponse.json({ success: true });
    }

    const resendClient = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
    const replyToEmail =
      process.env.RESEND_REPLY_TO_EMAIL || siteConfig.contact.email;

    const adminSubject = safeSubject(
      `[BOOKING] Cadrage 30 min — ${validation.data.companyName}`,
    );
    const confirmSubject =
      validation.data.locale === "en"
        ? "Scoping call request received - Praedixa"
        : "Créneaux reçus - Praedixa";

    const [adminResult, confirmResult] = await Promise.all([
      resendClient.emails.send({
        from: fromEmail,
        to: [siteConfig.contact.email],
        subject: adminSubject,
        html: buildAdminHtml(validation.data, ip),
        replyTo: validation.data.email,
      }),
      resendClient.emails.send({
        from: fromEmail,
        to: [validation.data.email],
        subject: confirmSubject,
        html: buildConfirmHtml(validation.data),
        text: buildConfirmText(validation.data),
        replyTo: replyToEmail,
      }),
    ]);

    if (adminResult.error || confirmResult.error) {
      throw new Error(
        adminResult.error?.message ?? confirmResult.error?.message,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logSecurityEvent("scoping_call.unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
