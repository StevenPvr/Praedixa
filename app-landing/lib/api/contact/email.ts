import { Resend } from "resend";
import { siteConfig } from "../../config/site";
import { redactIpForLogs } from "../../security/audit-log";
import type { ContactPayload } from "./validation";
import { requestIntentLabel, requestIntentTag } from "./validation";

const DEFAULT_FROM_EMAIL = "Praedixa <noreply@praedixa.com>";
const EMAIL_COLORS = {
  border: "#e5e7eb",
  title: "#111827",
  body: "#1f2937",
  muted: "#374151",
  subtle: "#6b7280",
} as const;

export async function sendContactEmails(
  resend: Resend,
  data: ContactPayload,
  ip: string,
): Promise<void> {
  const fromEmail = process.env["RESEND_FROM_EMAIL"] || DEFAULT_FROM_EMAIL;
  const replyToEmail =
    process.env["RESEND_REPLY_TO_EMAIL"] || siteConfig.contact.email;
  const safeData = sanitizeContactPayload(data, ip);

  const adminPrefix = data.locale === "en" ? "New contact" : "Nouveau contact";
  const adminSubject = safeSubject(
    `[${requestIntentTag(data.intent)}] ${adminPrefix} - ${data.subject}`,
  );
  const confirmSubject =
    data.locale === "en"
      ? "Request received - Praedixa"
      : "Demande reçue - Praedixa";

  const [adminResult, confirmResult] = await Promise.all([
    resend.emails.send({
      from: fromEmail,
      to: [siteConfig.contact.email],
      subject: adminSubject,
      html: buildAdminHtml(safeData),
      replyTo: data.email,
    }),
    resend.emails.send({
      from: fromEmail,
      to: [data.email],
      subject: confirmSubject,
      html: buildConfirmHtml(safeData),
      text: buildConfirmText(data),
      replyTo: replyToEmail,
    }),
  ]);

  if (adminResult.error || confirmResult.error) {
    throw new Error(adminResult.error?.message ?? confirmResult.error?.message);
  }
}

function sanitizeContactPayload(data: ContactPayload, ip: string) {
  return {
    companyName: escapeHtml(data.companyName),
    intent: escapeHtml(requestIntentLabel(data.intent, data.locale)),
    locale: escapeHtml(data.locale.toUpperCase()),
    role: escapeHtml(data.role),
    email: escapeHtml(data.email),
    siteCount: escapeHtml(data.siteCount),
    sector: escapeHtml(data.sector),
    mainTradeOff: escapeHtml(data.mainTradeOff).replace(/\n/g, "<br />"),
    timeline: escapeHtml(data.timeline),
    currentStack: escapeHtml(data.currentStack || "Non renseigné"),
    message: escapeHtml(data.message || "Non renseigné").replace(
      /\n/g,
      "<br />",
    ),
    ip: escapeHtml(redactIpForLogs(ip)),
    subject: escapeHtml(data.subject),
  };
}

function buildAdminHtml(
  data: ReturnType<typeof sanitizeContactPayload>,
): string {
  return `
    <h2>Nouveau message de contact</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Type</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.intent}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Locale</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.locale}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.role}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><a href="mailto:${data.email}">${data.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Nombre de sites</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.siteCount}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Secteur</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.sector}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Horizon projet</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.timeline}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Arbitrage principal</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.mainTradeOff}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Stack actuelle</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.currentStack}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Message libre</td><td style="padding: 10px;">${data.message}</td></tr>
    </table>
    <p style="margin-top: 14px; color: ${EMAIL_COLORS.subtle}; font-size: 12px;">Objet interne: ${data.subject}</p>
    <p style="margin-top: 6px; color: ${EMAIL_COLORS.subtle}; font-size: 12px;">IP pseudonymisée: ${data.ip}</p>
  `;
}

function buildConfirmHtml(
  data: ReturnType<typeof sanitizeContactPayload>,
): string {
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const brandEmailColor = siteConfig.brand?.primaryEmailColor ?? "#2563eb";

  if (data.locale === "EN") {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${EMAIL_COLORS.title};">Thanks, your request has been received.</h1>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
          We received your request for <strong>${data.intent}</strong>.
        </p>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
          Our team will reply within 48 business hours with a concrete next step.
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
      <h1 style="color: ${EMAIL_COLORS.title};">Merci, votre demande a bien été envoyée.</h1>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
        Nous avons bien reçu votre demande pour <strong>${data.intent}</strong>.
      </p>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
        Notre équipe vous répond sous 48h ouvrées avec un prochain pas concret.
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
  const typeLabel = requestIntentLabel(data.intent, data.locale);

  if (data.locale === "en") {
    return [
      "Hello,",
      "",
      "We received your request.",
      `Request type: ${typeLabel}`,
      `Company: ${data.companyName}`,
      "",
      "Our team will reply within 48 business hours with a concrete next step.",
      "",
      `Contact: ${siteConfig.contact.email}`,
    ].join("\n");
  }

  return [
    "Bonjour,",
    "",
    "Nous avons bien reçu votre demande.",
    `Type de demande : ${typeLabel}`,
    `Entreprise : ${data.companyName}`,
    "",
    "Notre équipe vous répond sous 48h ouvrées avec un prochain pas concret.",
    "",
    `Contact : ${siteConfig.contact.email}`,
  ].join("\n");
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
