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
import { verifyContactChallenge } from "../../../lib/security/contact-challenge";

const MAX_REQUEST_BODY_LENGTH = 20_000;
const MIN_MESSAGE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 800;
const MAX_SUBJECT_LENGTH = 120;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{6,30}$/;
const DEFAULT_FROM_EMAIL = "Praedixa <noreply@praedixa.com>";
const CONTACT_PERSIST_TIMEOUT_MS = 8_000;
const CONTACT_API_PATH = "/api/v1/public/contact-requests";
const SUPPORTED_LOCALES = new Set(["fr", "en"]);
const EMAIL_COLORS = {
  border: "#d9e3f6",
  title: "#162c5b",
  body: "#2f3e5c",
  muted: "#62708c",
  subtle: "#7c879f",
} as const;

const REQUEST_TYPE_LABELS = {
  founding_pilot: {
    tag: "PILOT",
    fr: "Pilote Workforce & ProofOps",
    en: "Workforce & ProofOps pilot",
  },
  product_demo: {
    tag: "DEMO",
    fr: "Demonstration produit",
    en: "Product demo",
  },
  partnership: {
    tag: "PARTNERSHIP",
    fr: "Partenariat",
    en: "Partnership",
  },
  press_other: {
    tag: "PRESS-OTHER",
    fr: "Presse / Autre",
    en: "Press / Other",
  },
} as const;

type ContactRequestType = keyof typeof REQUEST_TYPE_LABELS;
const SUPPORTED_REQUEST_TYPES = new Set<ContactRequestType>(
  Object.keys(REQUEST_TYPE_LABELS) as ContactRequestType[],
);

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
  return text.replace(/[\r\n]/g, " ").slice(0, 100);
}

type ContactPayload = {
  locale: "fr" | "en";
  requestType: ContactRequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: true;
  website: string;
  captchaAnswer: number;
  challengeToken: string;
};

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

function readInt(input: Record<string, unknown>, key: string): number | null {
  const raw = input[key];
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeLocale(value: string | null): "fr" | "en" | null {
  if (!value) return "fr";
  const normalized = value.trim().toLowerCase();
  if (!SUPPORTED_LOCALES.has(normalized)) return null;
  return normalized as "fr" | "en";
}

function normalizeRequestType(value: string | null): ContactRequestType | null {
  if (!value) return null;
  const normalized = value.trim() as ContactRequestType;
  if (!SUPPORTED_REQUEST_TYPES.has(normalized)) return null;
  return normalized;
}

function validateContactBody(
  body: unknown,
): { valid: true; data: ContactPayload } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }
  const input = body as Record<string, unknown>;

  const locale = normalizeLocale(readString(input, "locale", 8, false));
  if (!locale) return { valid: false, error: "Locale invalide." };

  const requestType = normalizeRequestType(
    readString(input, "requestType", 40, true),
  );
  if (!requestType) {
    return { valid: false, error: "Type de demande invalide." };
  }

  const companyName = readString(input, "companyName", 100, true);
  if (!companyName) return { valid: false, error: "Entreprise requise." };

  const firstName = readString(input, "firstName", 80, true);
  if (!firstName) return { valid: false, error: "Prénom requis." };

  const lastName = readString(input, "lastName", 80, true);
  if (!lastName) return { valid: false, error: "Nom requis." };

  const role = readString(input, "role", 80, false);
  if (role === null) return { valid: false, error: "Fonction invalide." };

  const email = readString(input, "email", 254, true);
  if (!email || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Adresse email invalide." };
  }

  const phone = readString(input, "phone", 30, false);
  if (phone === null) return { valid: false, error: "Téléphone invalide." };
  if (phone && !PHONE_REGEX.test(phone)) {
    return { valid: false, error: "Téléphone invalide." };
  }

  const subject = readString(input, "subject", MAX_SUBJECT_LENGTH, true);
  if (!subject) return { valid: false, error: "Objet requis." };

  const message = readString(input, "message", MAX_MESSAGE_LENGTH, true);
  if (!message || message.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message trop court (min ${MIN_MESSAGE_LENGTH} caractères).`,
    };
  }

  const websiteRaw = input.website;
  const website =
    typeof websiteRaw === "string" ? websiteRaw.trim().slice(0, 200) : "";

  if (typeof input.consent !== "boolean" || !input.consent) {
    return {
      valid: false,
      error: "Vous devez accepter les conditions pour envoyer ce message.",
    };
  }

  const captchaAnswer = readInt(input, "captchaAnswer");
  const challengeToken = readString(input, "challengeToken", 600, true);
  if (
    captchaAnswer === null ||
    challengeToken === null
  ) {
    return { valid: false, error: "Test anti-spam invalide." };
  }

  return {
    valid: true,
    data: {
      locale,
      requestType,
      companyName,
      firstName,
      lastName,
      role,
      email: email.toLowerCase(),
      phone,
      subject,
      message,
      consent: true,
      website,
      captchaAnswer,
      challengeToken,
    },
  };
}

function requestTypeLabel(
  type: ContactRequestType,
  locale: "fr" | "en",
): string {
  return REQUEST_TYPE_LABELS[type][locale];
}

function requestTypeTag(type: ContactRequestType): string {
  return REQUEST_TYPE_LABELS[type].tag;
}

function buildAdminHtml(data: ContactPayload, ip: string): string {
  const safe = {
    companyName: escapeHtml(data.companyName),
    requestType: escapeHtml(requestTypeLabel(data.requestType, data.locale)),
    locale: escapeHtml(data.locale.toUpperCase()),
    firstName: escapeHtml(data.firstName),
    lastName: escapeHtml(data.lastName),
    role: escapeHtml(data.role || "Non renseignée"),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone || "Non renseigné"),
    subject: escapeHtml(data.subject),
    message: escapeHtml(data.message).replace(/\n/g, "<br />"),
    ip: escapeHtml(ip),
  };

  return `
    <h2>Nouveau message de contact</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Type</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.requestType}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Locale</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.locale}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Contact</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.firstName} ${safe.lastName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.role}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Téléphone</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.phone}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Objet</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${safe.subject}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Message</td><td style="padding: 10px;">${safe.message}</td></tr>
    </table>
    <p style="margin-top: 14px; color: ${EMAIL_COLORS.subtle}; font-size: 12px;">IP: ${safe.ip}</p>
  `;
}

function buildConfirmHtml(data: ContactPayload): string {
  const isEnglish = data.locale === "en";
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const brandEmailColor = siteConfig.brand?.primaryEmailColor ?? "#2563eb";
  const safeFirstName = escapeHtml(data.firstName);
  const safeSubjectText = escapeHtml(data.subject);
  const safeType = escapeHtml(requestTypeLabel(data.requestType, data.locale));

  if (isEnglish) {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${EMAIL_COLORS.title};">Thanks, your message has been received.</h1>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">Hello ${safeFirstName},</p>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
          We received your request (<strong>${safeType}</strong>) with subject <strong>${safeSubjectText}</strong>.
        </p>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
          Our team will reply within 48 business hours.
        </p>
        <hr style="border: none; border-top: 1px solid ${EMAIL_COLORS.border}; margin: 24px 0;" />
        <p style="color: ${EMAIL_COLORS.muted}; font-size: 14px;">Praedixa team</p>
        <p style="color: ${EMAIL_COLORS.subtle}; font-size: 12px;">
          Questions: <a href="mailto:${contactEmail}" style="color: ${brandEmailColor};">${contactEmail}</a>
        </p>
      </div>
    `;
  }

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: ${EMAIL_COLORS.title};">Merci, votre message a bien été envoyé.</h1>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">Bonjour ${safeFirstName},</p>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
        Nous avons bien reçu votre demande (<strong>${safeType}</strong>) avec l'objet <strong>${safeSubjectText}</strong>.
      </p>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
        Notre équipe vous répond sous 48h ouvrées.
      </p>
      <hr style="border: none; border-top: 1px solid ${EMAIL_COLORS.border}; margin: 24px 0;" />
      <p style="color: ${EMAIL_COLORS.muted}; font-size: 14px;">L'équipe Praedixa</p>
      <p style="color: ${EMAIL_COLORS.subtle}; font-size: 12px;">
        Pour toute question : <a href="mailto:${contactEmail}" style="color: ${brandEmailColor};">${contactEmail}</a>
      </p>
    </div>
  `;
}

function buildConfirmText(data: ContactPayload): string {
  const isEnglish = data.locale === "en";
  const typeLabel = requestTypeLabel(data.requestType, data.locale);

  if (isEnglish) {
    return [
      `Hello ${data.firstName},`,
      "",
      "We received your message.",
      `Request type: ${typeLabel}`,
      `Subject: ${data.subject}`,
      "",
      "Our team will reply within 48 business hours.",
      "",
      `Contact: ${siteConfig.contact.email}`,
    ].join("\n");
  }

  return [
    `Bonjour ${data.firstName},`,
    "",
    "Nous avons bien reçu votre message.",
    `Type de demande : ${typeLabel}`,
    `Objet : ${data.subject}`,
    "",
    "Notre équipe vous répond sous 48h ouvrées.",
    "",
    `Contact : ${siteConfig.contact.email}`,
  ].join("\n");
}

function readContactApiConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.CONTACT_API_BASE_URL?.trim();
  const token = process.env.CONTACT_API_INGEST_TOKEN?.trim();

  if (!baseUrl) {
    throw new Error("CONTACT_API_BASE_URL is not configured");
  }
  if (!token) {
    throw new Error("CONTACT_API_INGEST_TOKEN is not configured");
  }

  const parsedBaseUrl = new URL(baseUrl);
  const isLocalHttp =
    parsedBaseUrl.protocol === "http:" && parsedBaseUrl.hostname === "localhost";
  if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("CONTACT_API_BASE_URL must use HTTPS in non-local environments");
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error("CONTACT_API_BASE_URL must not include credentials");
  }

  return { baseUrl: parsedBaseUrl.toString(), token };
}

async function extractApiErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (
      payload.error &&
      typeof payload.error === "object" &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim()
    ) {
      return payload.error.message;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Ignore parsing errors and fallback to HTTP status.
  }

  return `HTTP ${response.status}`;
}

async function persistContactRequest(
  data: ContactPayload,
  request: Request,
  ip: string,
  requestId: string,
): Promise<void> {
  const { baseUrl, token } = readContactApiConfig();
  const endpoint = new URL(CONTACT_API_PATH, baseUrl).toString();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CONTACT_PERSIST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Contact-Ingest-Token": token,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        locale: data.locale,
        requestType: data.requestType,
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        consent: data.consent,
        sourceIp: ip,
        metadataJson: {
          source: "landing-contact-form",
          requestType: data.requestType,
          locale: data.locale,
          userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? "",
          referer: request.headers.get("referer")?.slice(0, 400) ?? "",
          forwardedFor:
            request.headers.get("x-forwarded-for")?.slice(0, 250) ?? "",
          submittedAt: new Date().toISOString(),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await extractApiErrorMessage(response);
      throw new Error(`contact persistence failed: ${message}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("contact persistence timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
      logSecurityEvent("contact.rate_limited", {
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
      logSecurityEvent("contact.origin_rejected", {
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
      logSecurityEvent("contact.invalid_json", {
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

    const validation = validateContactBody(body);
    if (!validation.valid) {
      logSecurityEvent("contact.validation_failed", {
        requestId,
        ip: redactIpForLogs(ip),
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return NextResponse.json({ success: true });
    }

    const challenge = verifyContactChallenge({
      challengeToken: validation.data.challengeToken,
      captchaAnswer: validation.data.captchaAnswer,
    });
    if (!challenge.valid) {
      logSecurityEvent("contact.challenge_rejected", {
        requestId,
        ip: redactIpForLogs(ip),
        reason: challenge.reason,
      });
      return NextResponse.json({ error: "Test anti-spam invalide." }, { status: 400 });
    }

    const resendClient = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
    const replyToEmail =
      process.env.RESEND_REPLY_TO_EMAIL || siteConfig.contact.email;

    const typeTag = requestTypeTag(validation.data.requestType);
    const adminPrefix =
      validation.data.locale === "en" ? "New contact" : "Nouveau contact";
    const adminSubject = safeSubject(
      `[${typeTag}] ${adminPrefix} - ${validation.data.subject}`,
    );

    const confirmSubject =
      validation.data.locale === "en"
        ? "Message received - Praedixa"
        : "Message reçu - Praedixa";

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

    try {
      await persistContactRequest(validation.data, request, ip, requestId);
    } catch (error) {
      logSecurityEvent("contact.persistence_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
      // Persistence is best-effort; email delivery is the primary SLA path.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logSecurityEvent("contact.unhandled_error", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
