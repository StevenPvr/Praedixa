import type { Locale } from "../../lib/i18n/config";
import type { ContactFormData, ContactIntent } from "./contact-page.types";

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
