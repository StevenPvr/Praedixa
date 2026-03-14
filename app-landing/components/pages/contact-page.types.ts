import type { Locale } from "../../lib/i18n/config";

export type ContactIntent = "deployment" | "historical_proof";

export interface ContactFormData {
  locale: Locale;
  intent: ContactIntent;
  companyName: string;
  role: string;
  email: string;
  siteCount: string;
  sector: string;
  mainTradeOff: string;
  timeline: string;
  currentStack: string;
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
  | "role"
  | "email"
  | "siteCount"
  | "sector"
  | "mainTradeOff"
  | "timeline"
  | "captchaAnswer"
  | "consent";

export type FieldErrors = Partial<Record<ContactFieldErrorKey, string>>;

export interface ContactPageCopy {
  kicker: string;
  heading: string;
  intro: string;
  promiseTitle: string;
  promiseItems: string[];
  reassuranceTitle: string;
  reassuranceItems: string[];
  secondaryPanelTitle: string;
  secondaryPanelBody: string;
  secondaryPanelCta: string;
  formTitle: string;
  formSubtitle: string;
  company: string;
  role: string;
  email: string;
  siteCount: string;
  sector: string;
  mainTradeOff: string;
  timeline: string;
  currentStack: string;
  message: string;
  mainTradeOffPlaceholder: string;
  currentStackPlaceholder: string;
  messagePlaceholder: string;
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
  requiredRole: string;
  requiredEmail: string;
  invalidEmail: string;
  requiredSiteCount: string;
  requiredSector: string;
  requiredMainTradeOff: string;
  requiredTimeline: string;
  requiredConsent: string;
  requiredCaptcha: string;
}
