import { Resend } from "resend";
import { siteConfig } from "../../config/site";
import type { ScopingCallPayload } from "./validation";

const DEFAULT_FROM_EMAIL = "Praedixa <noreply@praedixa.com>";

export async function sendScopingCallEmails(
  resend: Resend,
  data: ScopingCallPayload,
  ip: string,
): Promise<void> {
  const fromEmail = process.env["RESEND_FROM_EMAIL"] || DEFAULT_FROM_EMAIL;
  const replyToEmail =
    process.env["RESEND_REPLY_TO_EMAIL"] || siteConfig.contact.email;
  const confirmSubject =
    data.locale === "en"
      ? "Scoping call request received - Praedixa"
      : "Créneaux reçus - Praedixa";

  const [adminResult, confirmResult] = await Promise.all([
    resend.emails.send({
      from: fromEmail,
      to: [siteConfig.contact.email],
      subject: safeSubject(`[BOOKING] Cadrage 30 min — ${data.companyName}`),
      html: buildAdminHtml(data, ip),
      replyTo: data.email,
    }),
    resend.emails.send({
      from: fromEmail,
      to: [data.email],
      subject: confirmSubject,
      html: buildConfirmHtml(data),
      text: buildConfirmText(data),
      replyTo: replyToEmail,
    }),
  ]);

  if (adminResult.error || confirmResult.error) {
    throw new Error(adminResult.error?.message ?? confirmResult.error?.message);
  }
}

function buildAdminHtml(data: ScopingCallPayload, ip: string): string {
  const slots = data.slots
    .map((slot) => `<li style="margin: 0 0 6px 0;">${escapeHtml(slot)}</li>`)
    .join("");
  const safeNotes = escapeHtml(data.notes || "").replace(/\n/g, "<br />");

  return `
    <h2>Demande de cadrage (30 min)</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Entreprise</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.companyName)}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Fuseau horaire</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.timezone)}</td></tr>
      <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Source</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(data.source || "unknown")}</td></tr>
      <tr><td style="padding: 10px; font-weight: bold; vertical-align: top;">Créneaux proposés</td><td style="padding: 10px;"><ul style="margin: 0; padding-left: 18px;">${slots}</ul></td></tr>
    </table>
    ${safeNotes ? `<p style="margin-top: 16px;"><strong>Notes</strong><br />${safeNotes}</p>` : ""}
    <p style="margin-top: 14px; color: #6b7280; font-size: 12px;">IP: ${escapeHtml(ip)}</p>
  `;
}

function buildConfirmHtml(data: ScopingCallPayload): string {
  const slots = data.slots
    .map((slot) => `<li style="margin: 0 0 6px 0;">${escapeHtml(slot)}</li>`)
    .join("");
  const safeNotes = escapeHtml(data.notes || "").replace(/\n/g, "<br />");
  const contactEmail = escapeHtml(siteConfig.contact.email);

  if (data.locale === "en") {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
        <h1 style="margin: 0 0 12px 0;">Request received</h1>
        <p style="font-size: 16px; line-height: 1.6;">Thanks. We received your proposed 30-minute scoping call slots for <strong>${escapeHtml(data.companyName)}</strong>.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #374151;">Timezone: <strong>${escapeHtml(data.timezone)}</strong></p>
        <ul style="margin: 12px 0 0 0; padding-left: 18px;">${slots}</ul>
        ${safeNotes ? `<p style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: #374151;"><strong>Notes</strong><br />${safeNotes}</p>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
        <p style="margin: 0; font-size: 14px; color: #374151;">We will confirm one slot by email within 48 business hours.</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Questions: <a href="mailto:${contactEmail}">${contactEmail}</a></p>
      </div>
    `;
  }

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
      <h1 style="margin: 0 0 12px 0;">Demande reçue</h1>
      <p style="font-size: 16px; line-height: 1.6;">Merci. Nous avons reçu vos créneaux de cadrage (30 min) pour <strong>${escapeHtml(data.companyName)}</strong>.</p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151;">Fuseau horaire : <strong>${escapeHtml(data.timezone)}</strong></p>
      <ul style="margin: 12px 0 0 0; padding-left: 18px;">${slots}</ul>
      ${safeNotes ? `<p style="margin-top: 16px; font-size: 14px; line-height: 1.6; color: #374151;"><strong>Notes</strong><br />${safeNotes}</p>` : ""}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
      <p style="margin: 0; font-size: 14px; color: #374151;">Nous confirmons un créneau par email sous 48h ouvrées.</p>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Questions : <a href="mailto:${contactEmail}">${contactEmail}</a></p>
    </div>
  `;
}

function buildConfirmText(data: ScopingCallPayload): string {
  const lines = [
    data.locale === "en"
      ? `Company: ${data.companyName}`
      : `Entreprise : ${data.companyName}`,
    data.locale === "en"
      ? `Timezone: ${data.timezone}`
      : `Fuseau horaire : ${data.timezone}`,
    "",
    data.locale === "en" ? "Proposed slots:" : "Créneaux proposés :",
    ...data.slots.map((slot) => `- ${slot}`),
  ];

  if (data.notes) {
    lines.push("", data.locale === "en" ? "Notes:" : "Notes :", data.notes);
  }

  lines.push(
    "",
    data.locale === "en"
      ? "We will confirm one slot by email within 48 business hours."
      : "Nous confirmons un créneau par email sous 48h ouvrées.",
    `Contact: ${siteConfig.contact.email}`,
  );

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeSubject(value: string): string {
  return value.replace(/[\r\n]/g, " ").slice(0, 120);
}
