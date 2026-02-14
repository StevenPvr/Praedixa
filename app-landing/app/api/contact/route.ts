import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getClientIp,
  isRateLimited,
} from "../../../lib/api/pilot-application/rate-limit";
import { siteConfig } from "../../../lib/config/site";

const MAX_REQUEST_BODY_LENGTH = 20_000;
const MIN_MESSAGE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 800;
const MAX_SUBJECT_LENGTH = 120;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{6,30}$/;
const MIN_FORM_FILL_TIME_MS = 2_500;
const MAX_FORM_AGE_MS = 1000 * 60 * 60 * 4;

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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeSubject(text: string): string {
  return text.replace(/[\r\n]/g, " ").slice(0, 100);
}

type ContactPayload = {
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
  captchaA: number;
  captchaB: number;
  captchaAnswer: number;
  formStartedAt: number;
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
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function validateContactBody(
  body: unknown,
): { valid: true; data: ContactPayload } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }
  const input = body as Record<string, unknown>;

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

  const captchaA = readInt(input, "captchaA");
  const captchaB = readInt(input, "captchaB");
  const captchaAnswer = readInt(input, "captchaAnswer");
  if (
    captchaA === null ||
    captchaB === null ||
    captchaAnswer === null ||
    captchaA < 0 ||
    captchaB < 0 ||
    captchaA > 30 ||
    captchaB > 30 ||
    captchaAnswer !== captchaA + captchaB
  ) {
    return { valid: false, error: "Test anti-spam invalide." };
  }

  const formStartedAt = readInt(input, "formStartedAt");
  if (formStartedAt === null) {
    return { valid: false, error: "Test anti-spam invalide." };
  }
  const elapsed = Date.now() - formStartedAt;
  if (elapsed < MIN_FORM_FILL_TIME_MS || elapsed > MAX_FORM_AGE_MS) {
    return { valid: false, error: "Test anti-spam invalide." };
  }

  return {
    valid: true,
    data: {
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
      captchaA,
      captchaB,
      captchaAnswer,
      formStartedAt,
    },
  };
}

function buildAdminHtml(data: ContactPayload, ip: string): string {
  const safe = {
    companyName: escapeHtml(data.companyName),
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
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Contact</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.firstName} ${safe.lastName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.role}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Téléphone</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.phone}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Objet</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${safe.subject}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Message</td><td style="padding: 10px;">${safe.message}</td></tr>
    </table>
    <p style="margin-top: 14px; color: #999; font-size: 12px;">IP: ${safe.ip}</p>
  `;
}

function buildConfirmHtml(data: ContactPayload): string {
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const safeFirstName = escapeHtml(data.firstName);
  const safeSubjectText = escapeHtml(data.subject);
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Merci, votre message a bien été envoyé.</h1>
      <p style="color: #525252; font-size: 16px; line-height: 1.6;">Bonjour ${safeFirstName},</p>
      <p style="color: #525252; font-size: 16px; line-height: 1.6;">
        Nous avons bien reçu votre message (objet : <strong>${safeSubjectText}</strong>).
      </p>
      <p style="color: #525252; font-size: 16px; line-height: 1.6;">
        Notre équipe vous répond sous 24h ouvrées.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #737373; font-size: 14px;">L'équipe Praedixa</p>
      <p style="color: #999; font-size: 12px;">
        Pour toute question : <a href="mailto:${contactEmail}" style="color: #d97706;">${contactEmail}</a>
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 },
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

    const validation = validateContactBody(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (validation.data.website !== "") {
      return NextResponse.json({ success: true });
    }

    const resendClient = getResend();
    const adminSubject = safeSubject(
      `Nouveau contact - ${validation.data.subject}`,
    );

    const [adminResult, confirmResult] = await Promise.all([
      resendClient.emails.send({
        from: "Praedixa <noreply@praedixa.com>",
        to: [siteConfig.contact.email],
        subject: adminSubject,
        html: buildAdminHtml(validation.data, ip),
      }),
      resendClient.emails.send({
        from: "Praedixa <noreply@praedixa.com>",
        to: [validation.data.email],
        subject: "Message reçu - Praedixa",
        html: buildConfirmHtml(validation.data),
      }),
    ]);

    if (adminResult.error || confirmResult.error) {
      throw new Error(
        adminResult.error?.message ?? confirmResult.error?.message,
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
