import { Resend } from "resend";
import { siteConfig } from "../../config/site";
import type { ValidatedData } from "./validation";

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
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.companyName}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid #eee;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Contact</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.firstName || "N/A"} ${data.lastName || ""}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Fonction</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.role || naRole}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">T\u00e9l\u00e9phone</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.phone || na}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Effectif</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${data.employeeRange} salari\u00e9s</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Secteur</td><td style="padding: 10px;">${data.sector}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Nombre de sites</td><td style="padding: 10px;">${data.siteCount || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Horizon projet</td><td style="padding: 10px;">${data.timeline || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Stack actuelle</td><td style="padding: 10px;">${data.currentStack || na}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold;">Enjeu prioritaire</td><td style="padding: 10px;">${data.painPoint || na}</td></tr>
    </table>
    <p style="margin-top: 20px; color: #666;">Recontacter dans les prochains jours.</p>
    <p style="margin-top: 10px; color: #999; font-size: 12px;">IP: ${data.ip}</p>
  `;
}

function buildConfirmHtml(data: {
  companyName: string;
  employeeRange: string;
  sector: string;
  timeline: string;
}): string {
  const contactEmail = escapeHtml(siteConfig.contact.email);
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Merci pour votre candidature !</h1>
      <p style="color: #525252; font-size: 16px; line-height: 1.6;">Bonjour,</p>
      <p style="color: #525252; font-size: 16px; line-height: 1.6;">
        Nous avons bien re\u00e7u votre candidature pour devenir entreprise pilote de Praedixa.
      </p>
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #92400e; margin-top: 0;">R\u00e9capitulatif</h3>
        <ul style="color: #78350f; padding-left: 20px;">
          <li><strong>Entreprise :</strong> ${data.companyName}</li>
          <li><strong>Effectif :</strong> ${data.employeeRange} salari\u00e9s</li>
          <li><strong>Secteur :</strong> ${data.sector}</li>
          <li><strong>Horizon :</strong> ${data.timeline || "À préciser"}</li>
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
      <p style="color: #737373; font-size: 14px;">\u00c0 tr\u00e8s bient\u00f4t,<br>L'\u00e9quipe Praedixa</p>
      <p style="color: #999; font-size: 12px; margin-top: 20px;">
        Vous recevez cet email car vous avez soumis une candidature sur praedixa.com.<br>
        Pour toute question : <a href="mailto:${contactEmail}" style="color: #d97706;">${contactEmail}</a>
      </p>
    </div>
  `;
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

  const [adminResult, confirmResult] = await Promise.all([
    resend.emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [siteConfig.contact.email],
      subject: `Nouvelle candidature pilote - ${subjectCompany}`,
      html: buildAdminHtml(safe),
    }),
    resend.emails.send({
      from: "Praedixa <noreply@praedixa.com>",
      to: [data.email],
      subject: "Candidature entreprise pilote re\u00e7ue - Praedixa",
      html: buildConfirmHtml(safe),
    }),
  ]);

  if (adminResult.error || confirmResult.error) {
    throw new Error(adminResult.error?.message ?? confirmResult.error?.message);
  }
}
