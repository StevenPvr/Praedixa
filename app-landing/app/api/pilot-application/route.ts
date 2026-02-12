import { Resend } from "resend";
import { NextResponse } from "next/server";
import { siteConfig } from "../../../lib/config/site";

// NOTE: This route intentionally omits `export const runtime = "edge"` because
// the Resend SDK depends on Node.js stream APIs (via mailsplit/mailparser)
// that are not available in the edge runtime.

// ---------------------------------------------------------------------------
// Resend client (lazy init to avoid build-time errors)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, resets on deploy/restart)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;
// Prevent unbounded memory growth: cap the number of tracked IPs
const MAX_RATE_LIMIT_ENTRIES = 10_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    /* v8 ignore next 7 -- eviction requires 10k entries, impractical in unit tests */
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

// ---------------------------------------------------------------------------
// Security: HTML entity encoding to prevent XSS in email templates
// ---------------------------------------------------------------------------
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Validation constants (allowlists)
// ---------------------------------------------------------------------------
const ALLOWED_EMPLOYEE_RANGES = new Set([
  "50-100",
  "100-250",
  "250-500",
  "500-1 000",
  "1 000+",
  // Also accept the raw IDs sent from the client-side label mapping
  "500-1000",
  "1000+",
]);

const ALLOWED_SECTORS = new Set([
  "Logistique",
  "Transport",
  "Sant\u00e9",
  "Industrie",
  "Distribution",
  "Agroalimentaire",
  "BTP",
  "Services",
  "Autre",
]);

const ALLOWED_ROLES = new Set([
  "COO / Direction des opérations",
  "Responsable des opérations",
  "Direction de site",
  "DAF / Direction financière",
  "Direction générale",
  "Autre",
]);

const ALLOWED_SITE_COUNTS = new Set(["1-3", "4-10", "11-30", "31+"]);
const ALLOWED_TIMELINES = new Set([
  "0-3 mois",
  "3-6 mois",
  "6-12 mois",
  "Exploration",
]);

// Maximum field lengths to prevent abuse
const MAX_COMPANY_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_PHONE_LENGTH = 30;
const MAX_NAME_LENGTH = 100;
const MAX_ROLE_LENGTH = 80;
const MAX_STACK_LENGTH = 300;
const MAX_PAIN_POINT_LENGTH = 1_200;
const MAX_REQUEST_BODY_LENGTH = 2_000; // bytes

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Strictly validates and sanitises the incoming request body.
 * Returns a sanitised object or a string error message.
 */
function validateRequestBody(
  body: unknown,
): { valid: true; data: ValidatedData } | { valid: false; error: string } {
  // Ensure body is an object
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }

  const obj = body as Record<string, unknown>;

  // --- companyName ---
  if (typeof obj.companyName !== "string" || !obj.companyName.trim()) {
    return { valid: false, error: "Nom d'entreprise requis." };
  }
  const companyName = obj.companyName.trim();
  if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Nom d'entreprise trop long (max ${String(MAX_COMPANY_NAME_LENGTH)} caractères).`,
    };
  }

  // --- email ---
  if (typeof obj.email !== "string" || !obj.email.trim()) {
    return { valid: false, error: "Email requis." };
  }
  const email = obj.email.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: "Adresse email trop longue." };
  }
  // RFC 5322 simplified but safe pattern (no ReDoS risk)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Adresse email invalide." };
  }

  // --- phone (optional) ---
  let phone = "";
  if (obj.phone !== undefined && obj.phone !== null) {
    if (typeof obj.phone !== "string") {
      return { valid: false, error: "Numéro de téléphone invalide." };
    }
    phone = obj.phone.trim();
    if (phone.length > MAX_PHONE_LENGTH) {
      return { valid: false, error: "Numéro de téléphone trop long." };
    }
    // Allow only digits, spaces, +, -, (, )
    if (phone && !/^[0-9+\-() ]+$/.test(phone)) {
      return {
        valid: false,
        error:
          "Numéro de téléphone invalide (chiffres, +, -, espaces uniquement).",
      };
    }
  }

  // --- employeeRange (allowlist) ---
  if (typeof obj.employeeRange !== "string") {
    return { valid: false, error: "Effectif requis." };
  }
  const employeeRange = obj.employeeRange.trim();
  if (!ALLOWED_EMPLOYEE_RANGES.has(employeeRange)) {
    return { valid: false, error: "Tranche d'effectif invalide." };
  }

  // --- sector (allowlist) ---
  if (typeof obj.sector !== "string") {
    return { valid: false, error: "Secteur requis." };
  }
  const sector = obj.sector.trim();
  if (!ALLOWED_SECTORS.has(sector)) {
    return { valid: false, error: "Secteur invalide." };
  }

  // --- website (honeypot) ---
  const website = typeof obj.website === "string" ? obj.website.trim() : "";

  // --- Optional premium qualification fields ---
  const firstName = normaliseOptionalField(obj.firstName, MAX_NAME_LENGTH);
  if (firstName === null) {
    return { valid: false, error: "Prénom invalide." };
  }

  const lastName = normaliseOptionalField(obj.lastName, MAX_NAME_LENGTH);
  if (lastName === null) {
    return { valid: false, error: "Nom invalide." };
  }

  const role = normaliseOptionalField(obj.role, MAX_ROLE_LENGTH);
  if (role === null) {
    return { valid: false, error: "Fonction invalide." };
  }
  if (role !== "" && !ALLOWED_ROLES.has(role)) {
    return { valid: false, error: "Fonction invalide." };
  }

  const siteCount = normaliseOptionalField(obj.siteCount, 20);
  if (siteCount === null) {
    return { valid: false, error: "Nombre de sites invalide." };
  }
  if (siteCount !== "" && !ALLOWED_SITE_COUNTS.has(siteCount)) {
    return { valid: false, error: "Nombre de sites invalide." };
  }

  const timeline = normaliseOptionalField(obj.timeline, 20);
  if (timeline === null) {
    return { valid: false, error: "Horizon projet invalide." };
  }
  if (timeline !== "" && !ALLOWED_TIMELINES.has(timeline)) {
    return { valid: false, error: "Horizon projet invalide." };
  }

  const currentStack = normaliseOptionalField(
    obj.currentStack,
    MAX_STACK_LENGTH,
  );
  if (currentStack === null) {
    return { valid: false, error: "Stack actuelle invalide." };
  }

  const painPoint = normaliseOptionalField(
    obj.painPoint,
    MAX_PAIN_POINT_LENGTH,
  );
  if (painPoint === null) {
    return { valid: false, error: "Enjeu principal invalide." };
  }

  // --- consent ---
  if (typeof obj.consent !== "boolean") {
    return { valid: false, error: "Consentement requis." };
  }
  if (!obj.consent) {
    return {
      valid: false,
      error:
        "Vous devez accepter les conditions pour envoyer votre candidature.",
    };
  }

  return {
    valid: true,
    data: {
      companyName,
      email,
      phone,
      employeeRange,
      sector,
      website,
      firstName,
      lastName,
      role,
      siteCount,
      timeline,
      currentStack,
      painPoint,
      consent: true,
    },
  };
}

function normaliseOptionalField(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

interface ValidatedData {
  companyName: string;
  email: string;
  phone: string;
  employeeRange: string;
  sector: string;
  website: string;
  firstName: string;
  lastName: string;
  role: string;
  siteCount: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  consent: true;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    // Reject oversized bodies early to prevent resource abuse
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

    // Get IP for rate limiting (Cloudflare sets CF-Connecting-IP)
    const cfIp = request.headers.get("cf-connecting-ip");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = cfIp || forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Rate limiting check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 },
      );
    }

    // Parse body with a size-limited text read to guard against large payloads
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

    // Strict validation with allowlists and length limits
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      companyName,
      email,
      phone,
      employeeRange,
      sector,
      website,
      firstName,
      lastName,
      role,
      siteCount,
      timeline,
      currentStack,
      painPoint,
    } = validation.data;

    // Honeypot check: if website field is filled, it is likely a bot.
    // Return success silently so the bot cannot adapt.
    if (website !== "") {
      return NextResponse.json({ success: true });
    }

    // HTML-escape ALL user-controlled values before interpolating into email templates.
    // This prevents stored XSS that could execute in email clients.
    const safeCompanyName = escapeHtml(companyName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeEmployeeRange = escapeHtml(employeeRange);
    const safeSector = escapeHtml(sector);
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeRole = escapeHtml(role);
    const safeSiteCount = escapeHtml(siteCount);
    const safeTimeline = escapeHtml(timeline);
    const safeCurrentStack = escapeHtml(currentStack);
    const safePainPoint = escapeHtml(painPoint);
    const safeIp = escapeHtml(ip);

    // Sanitise the email subject: strip newlines to prevent header injection
    const safeSubjectCompany = companyName
      .replace(/[\r\n]/g, " ")
      .slice(0, 100);

    // Email to admin
    await getResend().emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [siteConfig.contact.email],
      subject: `Nouvelle candidature pilote - ${safeSubjectCompany}`,
      html: `
        <h2>Nouvelle candidature entreprise pilote</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Entreprise</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeCompanyName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Contact</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeFirstName || "N/A"} ${safeLastName || ""}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Fonction</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeRole || "Non renseignée"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">T\u00e9l\u00e9phone</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safePhone || "Non renseign\u00e9"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Effectif</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${safeEmployeeRange} salari\u00e9s</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Secteur</td>
            <td style="padding: 10px;">${safeSector}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Nombre de sites</td>
            <td style="padding: 10px;">${safeSiteCount || "Non renseigné"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Horizon projet</td>
            <td style="padding: 10px;">${safeTimeline || "Non renseigné"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Stack actuelle</td>
            <td style="padding: 10px;">${safeCurrentStack || "Non renseignée"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Enjeu prioritaire</td>
            <td style="padding: 10px;">${safePainPoint || "Non renseigné"}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">Recontacter dans les prochains jours.</p>
        <p style="margin-top: 10px; color: #999; font-size: 12px;">IP: ${safeIp}</p>
      `,
    });

    // Confirmation email to applicant
    await getResend().emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [email],
      subject: "Candidature entreprise pilote re\u00e7ue - Praedixa",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Merci pour votre candidature !</h1>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            Bonjour,
          </p>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            Nous avons bien re\u00e7u votre candidature pour devenir entreprise pilote de Praedixa.
          </p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">R\u00e9capitulatif</h3>
            <ul style="color: #78350f; padding-left: 20px;">
              <li><strong>Entreprise :</strong> ${safeCompanyName}</li>
              <li><strong>Effectif :</strong> ${safeEmployeeRange} salari\u00e9s</li>
              <li><strong>Secteur :</strong> ${safeSector}</li>
              <li><strong>Horizon :</strong> ${safeTimeline || "À préciser"}</li>
            </ul>
          </div>
          <h3 style="color: #1a1a1a;">Prochaines \u00e9tapes</h3>
          <ol style="color: #525252; font-size: 16px; line-height: 1.8;">
            <li>Nous analysons votre candidature</li>
            <li>Nous vous contacterons dans les prochains jours</li>
            <li>Un premier \u00e9change pour comprendre vos besoins</li>
          </ol>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            En tant qu'entreprise pilote, vous b\u00e9n\u00e9ficierez d'un <strong style="color: #d97706;">rabais exclusif</strong>
            lors du d\u00e9ploiement du service.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #737373; font-size: 14px;">
            \u00c0 tr\u00e8s bient\u00f4t,<br>
            L'\u00e9quipe Praedixa
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Vous recevez cet email car vous avez soumis une candidature sur praedixa.com.<br>
            Pour toute question : <a href="mailto:${escapeHtml(siteConfig.contact.email)}" style="color: #d97706;">${escapeHtml(siteConfig.contact.email)}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    // Generic error message -- never expose internal details to the client
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez r\u00e9essayer." },
      { status: 500 },
    );
  }
}
