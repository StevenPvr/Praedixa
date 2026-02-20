import { Resend } from "resend";
import { siteConfig } from "../../config/site";
import type { ValidatedData } from "./validation";

const EMAIL_COLORS = {
  border: "#d9e3f6",
  title: "#162c5b",
  body: "#2f3e5c",
  muted: "#62708c",
  subtle: "#7c879f",
} as const;
const DEFAULT_FROM_EMAIL = "Praedixa <noreply@praedixa.com>";

export function escapeHtml(unsafe: string): string {
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

function buildAdminHtml(data: {
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  employeeRange: string;
  sector: string;
  siteCount: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  ip: string;
}): string {
  const na = "Non renseigné";
  const naRole = "Non renseignée";
  return `
    <h2>Nouvelle candidature entreprise pilote</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};"><a href="mailto:${data.email}">${data.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Contact</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.firstName || "N/A"} ${data.lastName || ""}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.role || naRole}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">T\u00e9l\u00e9phone</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.phone || na}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border}; font-weight: bold;">Effectif</td><td style="padding: 10px; border-bottom: 1px solid ${EMAIL_COLORS.border};">${data.employeeRange} salari\u00e9s</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Secteur</td><td style="padding: 10px;">${data.sector}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Nombre de sites</td><td style="padding: 10px;">${data.siteCount || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Horizon projet</td><td style="padding: 10px;">${data.timeline || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Stack actuelle</td><td style="padding: 10px;">${data.currentStack || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Enjeu prioritaire</td><td style="padding: 10px;">${data.painPoint || na}</td></tr>
    </table>
    <p style="margin-top: 20px; color: ${EMAIL_COLORS.muted};">Recontacter dans les prochains jours.</p>
    <p style="margin-top: 10px; color: ${EMAIL_COLORS.subtle}; font-size: 12px;">IP: ${data.ip}</p>
  `;
}

function buildConfirmHtml(data: {
  firstName: string;
  companyName: string;
  employeeRange: string;
  sector: string;
  timeline: string;
}): string {
  const contactEmail = escapeHtml(siteConfig.contact.email);
  const firstName = data.firstName || "Bonjour";
  const timeline = data.timeline || "À préciser";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: ${EMAIL_COLORS.body};">
      <h1 style="color: ${EMAIL_COLORS.title}; font-size: 24px; margin-bottom: 20px;">Confirmation de réception</h1>
      <p style="font-size: 16px; line-height: 1.6;">${firstName},</p>
      <p style="font-size: 16px; line-height: 1.6;">
        Nous confirmons la bonne réception de votre demande de programme pilote Praedixa.
      </p>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 6px;"><strong>Récapitulatif transmis :</strong></p>
      <ul style="font-size: 15px; line-height: 1.7; margin-top: 6px; margin-bottom: 22px;">
        <li>Entreprise : ${data.companyName}</li>
        <li>Effectif : ${data.employeeRange} salariés</li>
        <li>Secteur : ${data.sector}</li>
        <li>Horizon : ${timeline}</li>
      </ul>
      <p style="font-size: 16px; line-height: 1.6;">
        Notre équipe revient vers vous rapidement pour organiser la suite.
      </p>
      <hr style="border: none; border-top: 1px solid ${EMAIL_COLORS.border}; margin: 28px 0;" />
      <p style="font-size: 14px; color: ${EMAIL_COLORS.muted}; margin: 0;">
        Praedixa<br />
        Contact : <a href="mailto:${contactEmail}" style="color: ${EMAIL_COLORS.title};">${contactEmail}</a>
      </p>
      <p style="font-size: 12px; color: ${EMAIL_COLORS.subtle}; margin-top: 16px;">
        Ce message confirme uniquement la réception de votre demande.
      </p>
    </div>
  `;
}

function buildConfirmText(data: {
  firstName: string;
  companyName: string;
  employeeRange: string;
  sector: string;
  timeline: string;
}): string {
  const firstName = data.firstName || "Bonjour";
  const timeline = data.timeline || "À préciser";
  return [
    `${firstName},`,
    "",
    "Nous confirmons la bonne réception de votre demande de programme pilote Praedixa.",
    "",
    "Récapitulatif transmis :",
    `- Entreprise : ${data.companyName}`,
    `- Effectif : ${data.employeeRange} salariés`,
    `- Secteur : ${data.sector}`,
    `- Horizon : ${timeline}`,
    "",
    "Notre équipe revient vers vous rapidement pour organiser la suite.",
    "",
    `Contact : ${siteConfig.contact.email}`,
  ].join("\n");
}

export async function sendPilotEmails(
  resend: Resend,
  data: ValidatedData,
  ip: string,
): Promise<void> {
  const safe = {
    companyName: escapeHtml(data.companyName),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone),
    employeeRange: escapeHtml(data.employeeRange),
    sector: escapeHtml(data.sector),
    firstName: escapeHtml(data.firstName),
    lastName: escapeHtml(data.lastName),
    role: escapeHtml(data.role),
    siteCount: escapeHtml(data.siteCount),
    timeline: escapeHtml(data.timeline),
    currentStack: escapeHtml(data.currentStack),
    painPoint: escapeHtml(data.painPoint),
    ip: escapeHtml(ip),
  };

  const subjectCompany = safeSubject(data.companyName);
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const replyToEmail =
    process.env.RESEND_REPLY_TO_EMAIL || siteConfig.contact.email;

  const [adminResult, confirmResult] = await Promise.all([
    resend.emails.send({
      from: fromEmail,
      to: [siteConfig.contact.email],
      subject: `Nouvelle candidature pilote - ${subjectCompany}`,
      html: buildAdminHtml(safe),
      replyTo: replyToEmail,
    }),
    resend.emails.send({
      from: fromEmail,
      to: [data.email],
      subject: "Candidature entreprise pilote re\u00e7ue - Praedixa",
      html: buildConfirmHtml(safe),
      text: buildConfirmText(safe),
      replyTo: replyToEmail,
    }),
  ]);

  if (adminResult.error || confirmResult.error) {
    throw new Error(adminResult.error?.message ?? confirmResult.error?.message);
  }
}
