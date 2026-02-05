import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { siteConfig } from "../../../lib/config/site";

// Lazy initialization to avoid build-time errors when env var is not set
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

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

interface PilotApplicationRequest {
  companyName: string;
  email: string;
  phone: string;
  employeeRange: string;
  sector: string;
  website?: string; // Honeypot field - should always be empty
  consent: boolean;
}

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Rate limiting check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer plus tard." },
        { status: 429 },
      );
    }

    const body: PilotApplicationRequest = await request.json();
    const {
      companyName,
      email,
      phone,
      employeeRange,
      sector,
      website,
      consent,
    } = body;

    // Honeypot check - if website field is filled, it's likely a bot
    if (website && website.trim() !== "") {
      // Silently reject but return success to not alert the bot
      return NextResponse.json({ success: true });
    }

    // Consent check
    if (!consent) {
      return NextResponse.json(
        {
          error:
            "Vous devez accepter les conditions pour envoyer votre candidature.",
        },
        { status: 400 },
      );
    }

    // Validation
    if (!companyName || !email || !employeeRange || !sector) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 },
      );
    }

    // Email to admin (you)
    await getResend().emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [siteConfig.contact.email],
      subject: `Nouvelle candidature pilote - ${companyName}`,
      html: `
        <h2>Nouvelle candidature entreprise pilote</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Entreprise</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Téléphone</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="tel:${phone}">${phone || "Non renseigné"}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Effectif</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${employeeRange} salariés</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Secteur</td>
            <td style="padding: 10px;">${sector}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">Recontacter sous 24-48h.</p>
        <p style="margin-top: 10px; color: #999; font-size: 12px;">IP: ${ip}</p>
      `,
    });

    // Confirmation email to applicant
    await getResend().emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [email],
      subject: "Candidature entreprise pilote reçue - Praedixa",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Merci pour votre candidature !</h1>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            Bonjour,
          </p>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            Nous avons bien reçu votre candidature pour devenir entreprise pilote de Praedixa.
          </p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Récapitulatif</h3>
            <ul style="color: #78350f; padding-left: 20px;">
              <li><strong>Entreprise :</strong> ${companyName}</li>
              <li><strong>Effectif :</strong> ${employeeRange} salariés</li>
              <li><strong>Secteur :</strong> ${sector}</li>
            </ul>
          </div>
          <h3 style="color: #1a1a1a;">Prochaines étapes</h3>
          <ol style="color: #525252; font-size: 16px; line-height: 1.8;">
            <li>Nous analysons votre candidature</li>
            <li>Vous recevrez un appel de notre part sous 24-48h</li>
            <li>Un premier échange pour comprendre vos besoins</li>
          </ol>
          <p style="color: #525252; font-size: 16px; line-height: 1.6;">
            En tant qu'entreprise pilote, vous bénéficierez d'un <strong style="color: #d97706;">rabais exclusif</strong>
            lors du déploiement du service.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #737373; font-size: 14px;">
            À très bientôt,<br>
            L'équipe Praedixa
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Vous recevez cet email car vous avez soumis une candidature sur praedixa.com.<br>
            Pour toute question : <a href="mailto:${siteConfig.contact.email}" style="color: #d97706;">${siteConfig.contact.email}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
