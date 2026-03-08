import { EMAIL_REGEX, MIN_MESSAGE_LENGTH } from "./contact-page.constants";
import type {
  ContactChallenge,
  ContactFieldErrorKey,
  ContactFormData,
  ContactPageCopy,
  FieldErrors,
} from "./contact-page.types";

const CONTACT_FIELD_IDS: Record<ContactFieldErrorKey, string> = {
  companyName: "contact-companyName",
  email: "contact-email",
  message: "contact-message",
  captchaAnswer: "contact-captcha",
  consent: "contact-consent",
};

const CONTACT_FIELD_ORDER: ContactFieldErrorKey[] = [
  "companyName",
  "email",
  "message",
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

  const email = form.email.trim();
  if (!email) {
    errors.email = copy.requiredEmail;
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = copy.invalidEmail;
  }

  if (form.message.trim().length < MIN_MESSAGE_LENGTH) {
    errors.message = copy.requiredMessage;
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
    !form.email.trim() ||
    form.message.trim().length < MIN_MESSAGE_LENGTH ||
    !form.consent ||
    !form.captchaAnswer.trim()
  );
}
