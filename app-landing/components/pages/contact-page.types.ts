import type { Locale } from "../../lib/i18n/config";

export type RequestType =
  | "deployment_request"
  | "product_demo"
  | "partnership"
  | "press_other";

export interface ContactFormData {
  locale: Locale;
  requestType: RequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: boolean;
  website: string;
  captchaAnswer: string;
  challengeToken: string;
}

export interface ContactChallenge {
  captchaA: number;
  captchaB: number;
  challengeToken: string;
}

export type ContactFieldErrorKey =
  | "companyName"
  | "email"
  | "message"
  | "captchaAnswer"
  | "consent";

export type FieldErrors = Partial<Record<ContactFieldErrorKey, string>>;

export interface RequestTypeOption {
  value: RequestType;
  fr: string;
  en: string;
}

export interface ContactPageCopy {
  kicker: string;
  heading: string;
  intro: string;
  promiseTitle: string;
  promiseItems: string[];
  pilotHint: string;
  pilotCta: string;
  pilotMeta: string;
  formTitle: string;
  formSubtitle: string;
  requestType: string;
  company: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  messageHint: string;
  messagePlaceholder: string;
  optionalDetails: string;
  antiSpam: string;
  consentPrefix: string;
  termsLabel: string;
  consentJoin: string;
  privacyLabel: string;
  send: string;
  sending: string;
  fixErrors: string;
  successTitle: string;
  successBody: string;
  successCta: string;
  unknownError: string;
  networkError: string;
  challengeLoading: string;
  challengeUnavailable: string;
  challengeRetry: string;
  requiredCompany: string;
  requiredEmail: string;
  invalidEmail: string;
  requiredMessage: string;
  requiredConsent: string;
  requiredCaptcha: string;
}
