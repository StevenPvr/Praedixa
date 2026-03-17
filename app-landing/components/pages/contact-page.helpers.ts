import { isSemanticallyValidEmailAddress } from "../../lib/security/email-address";
import type {
  ContactChallenge,
  ContactFieldErrorKey,
  ContactFormData,
  ContactPageCopy,
  FieldErrors,
} from "./contact-page.types";

const CONTACT_FIELD_IDS: Record<ContactFieldErrorKey, string> = {
  companyName: "contact-companyName",
  role: "contact-role",
  email: "contact-email",
  siteCount: "contact-siteCount",
  sector: "contact-sector",
  mainTradeOff: "contact-mainTradeOff",
  timeline: "contact-timeline",
  captchaAnswer: "contact-captcha",
  consent: "contact-consent",
};

const CONTACT_FIELD_ORDER: ContactFieldErrorKey[] = [
  "companyName",
  "role",
  "email",
  "siteCount",
  "sector",
  "mainTradeOff",
  "timeline",
  "captchaAnswer",
  "consent",
];

export function clearFieldError(
  current: FieldErrors,
  key: keyof ContactFormData,
): FieldErrors {
  if (!(key in current)) {
    return current;
  }

  const next = { ...current };
  delete next[key as keyof FieldErrors];
  return next;
}

export function validateContactForm(
  form: ContactFormData,
  copy: ContactPageCopy,
  captcha: ContactChallenge | null,
  captchaLoading: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.companyName.trim()) {
    errors.companyName = copy.requiredCompany;
  }
  if (!form.role.trim()) {
    errors.role = copy.requiredRole;
  }

  const email = form.email.trim();
  if (!email) {
    errors.email = copy.requiredEmail;
  } else if (!isSemanticallyValidEmailAddress(email)) {
    errors.email = copy.invalidEmail;
  }

  if (!form.siteCount.trim()) {
    errors.siteCount = copy.requiredSiteCount;
  }

  if (!form.sector.trim()) {
    errors.sector = copy.requiredSector;
  }

  if (!form.mainTradeOff.trim()) {
    errors.mainTradeOff = copy.requiredMainTradeOff;
  }

  if (!form.timeline.trim()) {
    errors.timeline = copy.requiredTimeline;
  }

  if (!form.challengeToken || captchaLoading || !captcha) {
    errors.captchaAnswer = copy.challengeUnavailable;
  } else if (!form.captchaAnswer.trim()) {
    errors.captchaAnswer = copy.requiredCaptcha;
  }

  if (!form.consent) {
    errors.consent = copy.requiredConsent;
  }

  return errors;
}

export function focusFirstContactError(errors: FieldErrors): void {
  for (const key of CONTACT_FIELD_ORDER) {
    if (!errors[key]) {
      continue;
    }

    const node = document.getElementById(CONTACT_FIELD_IDS[key]);
    if (node && "focus" in node) {
      (node as HTMLElement).focus();
    }
    return;
  }
}

export function canSubmitContactForm(
  form: ContactFormData,
  captcha: ContactChallenge | null,
  captchaLoading: boolean,
): boolean {
  return !(
    captchaLoading ||
    !captcha ||
    !form.challengeToken ||
    !form.companyName.trim() ||
    !form.role.trim() ||
    !isSemanticallyValidEmailAddress(form.email) ||
    !form.siteCount.trim() ||
    !form.sector.trim() ||
    !form.mainTradeOff.trim() ||
    !form.timeline.trim() ||
    !form.consent ||
    !form.captchaAnswer.trim()
  );
}
