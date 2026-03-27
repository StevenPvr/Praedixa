import type { Locale } from "../../lib/i18n/config";
import type { ContactFormData, ContactIntent } from "./contact-page.types";

export const SITE_COUNTS = ["1-3", "4-10", "11-30", "31+"] as const;

export const CONTACT_SECTORS = {
  fr: [
    "HCR",
    "Logistique / Transport / Retail",
    "BTP",
    "Services",
    "Autre",
  ],
  en: [
    "Hospitality / Food service",
    "Logistics / Transport / Retail",
    "Construction",
    "Services",
    "Other",
  ],
} as const;

export const CONTACT_TIMELINES = {
  fr: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  en: ["0-3 months", "3-6 months", "6-12 months", "Exploration"],
} as const;

export function createInitialContactForm(
  locale: Locale,
  intent: ContactIntent,
): ContactFormData {
  return {
    locale,
    intent,
    companyName: "",
    role: "",
    email: "",
    siteCount: "",
    sector: "",
    mainTradeOff: "",
    timeline: "",
    currentStack: "",
    message: "",
    consent: false,
    website: "",
    captchaAnswer: "",
    challengeToken: "",
  };
}
