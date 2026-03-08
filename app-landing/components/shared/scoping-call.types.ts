import type { Locale } from "../../lib/i18n/config";

export type ScopingFieldErrorKey =
  | "companyName"
  | "email"
  | "timezone"
  | "slots"
  | "notes";

export type ScopingFieldErrors = Partial<Record<ScopingFieldErrorKey, string>>;

export interface ScopingCallRequestPanelProps {
  locale: Locale;
  defaultCompanyName?: string;
  defaultEmail?: string;
  source?: "contact_success" | "pilot_success" | string;
  className?: string;
}

export interface ScopingCallFormData {
  companyName: string;
  email: string;
  timezone: string;
  slot1: string;
  slot2: string;
  slot3: string;
  notes: string;
  website: string;
}

export interface ScopingCallCopy {
  title: string;
  subtitle: string;
  company: string;
  email: string;
  timezone: string;
  timezoneHint: string;
  slots: string;
  slotsHint: string;
  notes: string;
  notesHint: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  errorPrefix: string;
  invalidEmail: string;
  requiredCompany: string;
  requiredTimezone: string;
  requiredSlots: string;
  unknownError: string;
  networkError: string;
}
