import type { Locale } from "../../lib/i18n/config";
import type { ContactFormData, RequestTypeOption } from "./contact-page.types";

export const MIN_MESSAGE_LENGTH = 30;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUEST_TYPES: RequestTypeOption[] = [
  {
    value: "founding_pilot",
    fr: "Pilote ROI Praedixa",
    en: "Praedixa Signature pilot",
  },
  { value: "product_demo", fr: "Démonstration produit", en: "Product demo" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
  { value: "press_other", fr: "Presse / Autre", en: "Press / Other" },
];

export function createInitialContactForm(
  locale: Locale,
  isAuditIntent: boolean,
): ContactFormData {
  return {
    locale,
    requestType: "founding_pilot",
    companyName: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    subject: getInitialSubject(locale, isAuditIntent),
    message: "",
    consent: false,
    website: "",
    captchaAnswer: "",
    challengeToken: "",
  };
}

function getInitialSubject(locale: Locale, isAuditIntent: boolean): string {
  if (!isAuditIntent) {
    return "";
  }

  return locale === "fr" ? "Diagnostic ROI gratuit" : "Free ROI diagnostic";
}
