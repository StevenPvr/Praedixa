import type { Locale } from "../../lib/i18n/config";
import type { ContactFormData, RequestTypeOption } from "./contact-page.types";

export const MIN_MESSAGE_LENGTH = 30;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUEST_TYPES: RequestTypeOption[] = [
  {
    value: "deployment_request",
    fr: "Déploiement Praedixa",
    en: "Praedixa deployment",
  },
  { value: "product_demo", fr: "Démonstration produit", en: "Product demo" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
  { value: "press_other", fr: "Presse / Autre", en: "Press / Other" },
];

export function createInitialContactForm(
  locale: Locale,
  isProofIntent: boolean,
): ContactFormData {
  return {
    locale,
    requestType: "deployment_request",
    companyName: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    phone: "",
    subject: getInitialSubject(locale, isProofIntent),
    message: "",
    consent: false,
    website: "",
    captchaAnswer: "",
    challengeToken: "",
  };
}

function getInitialSubject(locale: Locale, isProofIntent: boolean): string {
  if (!isProofIntent) {
    return "";
  }

  return locale === "fr"
    ? "Preuve sur historique offerte"
    : "Historical proof request";
}
