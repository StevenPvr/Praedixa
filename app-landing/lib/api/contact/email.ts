import { Resend } from "resend";
import { siteConfig } from "../../config/site";
import type { ContactPayload } from "./validation";
import { requestTypeLabel, requestTypeTag } from "./validation";

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
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const replyToEmail =
    process.env.RESEND_REPLY_TO_EMAIL || siteConfig.contact.email;
  const safeData = sanitizeContactPayload(data, ip);

  const adminPrefix = data.locale === "en" ? "New contact" : "Nouveau contact";
  const adminSubject = safeSubject(
    `[${requestTypeTag(data.requestType)}] ${adminPrefix} - ${data.subject}`,
  );
  const confirmSubject =
    data.locale === "en"
      ? "Message received - Praedixa"
      : "Message reçu - Praedixa";

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
  const contactName = [data.firstName, data.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  return {
    companyName: escapeHtml(data.companyName),
    requestType: escapeHtml(requestTypeLabel(data.requestType, data.locale)),
    locale: escapeHtml(data.locale.toUpperCase()),
    contactName: escapeHtml(contactName || "Non renseigné"),
    role: escapeHtml(data.role || "Non renseigné"),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone || "Non renseigné"),
    subject: escapeHtml(data.subject),
    message: escapeHtml(data.message).replace(/\n/g, "<br />"),
    ip: escapeHtml(ip),
  };
}

function buildAdminHtml(data: ReturnType<typeof sanitizeContactPayload>): string {
  return `
    <h2>Nouveau message de contact</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Type</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.requestType}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Locale</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.locale}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Contact</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.contactName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.role}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><a href="mailto:${data.email}">${data.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Téléphone</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.phone}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Objet</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.subject}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Message</td><td style="padding: 10px;">${data.message}</td></tr>
    </table>
    <p style="margin-top: 14px; color: ${EMAIL_COLORS.subtle}; font-size: 12px;">IP: ${data.ip}</p>
  `;
}

function buildConfirmHtml(data: ReturnType<typeof sanitizeContactPayload>): string {
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const brandEmailColor = siteConfig.brand?.primaryEmailColor ?? "#2563eb";

  if (data.locale === "EN") {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${EMAIL_COLORS.title};">Thanks, your message has been received.</h1>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">${data.contactName === "Non renseigné" ? "Hello," : `Hello ${data.contactName},`}</p>
        <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
          We received your request (<strong>${data.requestType}</strong>) with subject <strong>${data.subject}</strong>.
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
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">${data.contactName === "Non renseigné" ? "Bonjour," : `Bonjour ${data.contactName},`}</p>
      <p style="color: ${EMAIL_COLORS.body}; font-size: 16px; line-height: 1.6;">
        Nous avons bien reçu votre demande (<strong>${data.requestType}</strong>) avec l'objet <strong>${data.subject}</strong>.
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
  const typeLabel = requestTypeLabel(data.requestType, data.locale);
  const name = [data.firstName, data.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

  if (data.locale === "en") {
    return [
      name ? `Hello ${name},` : "Hello,",
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
    name ? `Bonjour ${name},` : "Bonjour,",
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
