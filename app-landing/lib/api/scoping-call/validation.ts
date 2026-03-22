import { validateSemanticEmailAddress } from "../../security/email-address";

const MAX_NOTES_LENGTH = 800;
const MAX_COMPANY_LENGTH = 100;
const MAX_SOURCE_LENGTH = 60;
const MAX_TIMEZONE_LENGTH = 64;
const MAX_SLOT_COUNT = 3;
const SLOT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const MAX_REQUEST_BODY_LENGTH = 12_000;

export type ScopingCallPayload = {
  locale: "fr" | "en";
  email: string;
  companyName: string;
  timezone: string;
  slots: [string, string, string];
  notes: string;
  website: string;
  source: string;
};

export function validateScopingCallBody(
  body: unknown,
): { valid: true; data: ScopingCallPayload } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }

  const input = body as Record<string, unknown>;
  const locale = normalizeLocale(readString(input, "locale", 8, false));
  if (!locale) {
    return { valid: false, error: "Locale invalide." };
  }

  const email = readString(input, "email", 254, true);
  const validatedEmail = email
    ? validateSemanticEmailAddress(email)
    : { valid: false as const };
  if (!email || !validatedEmail.valid) {
    return {
      valid: false,
      error: localize(
        locale,
        "Adresse email invalide.",
        "Invalid email address.",
      ),
    };
  }

  const companyName = readString(
    input,
    "companyName",
    MAX_COMPANY_LENGTH,
    true,
  );
  if (!companyName) {
    return {
      valid: false,
      error: localize(locale, "Entreprise requise.", "Company is required."),
    };
  }

  const timezone = readString(input, "timezone", MAX_TIMEZONE_LENGTH, true);
  if (!timezone) {
    return {
      valid: false,
      error: localize(
        locale,
        "Fuseau horaire requis.",
        "Timezone is required.",
      ),
    };
  }

  const slots = readSlots(input["slots"], locale);
  if (!slots.valid) {
    return slots;
  }

  const notes = readString(input, "notes", MAX_NOTES_LENGTH, false);
  if (notes === null) {
    return {
      valid: false,
      error: localize(locale, "Notes invalides.", "Invalid notes."),
    };
  }

  const source = readString(input, "source", MAX_SOURCE_LENGTH, false);
  if (source === null) {
    return {
      valid: false,
      error: localize(locale, "Source invalide.", "Invalid source."),
    };
  }

  return {
    valid: true,
    data: {
      locale,
      email: validatedEmail.normalized,
      companyName,
      timezone,
      slots: slots.value,
      notes,
      website:
        typeof input["website"] === "string"
          ? input["website"].trim().slice(0, 200)
          : "",
      source,
    },
  };
}

function readSlots(
  raw: unknown,
  locale: "fr" | "en",
):
  | { valid: true; value: [string, string, string] }
  | { valid: false; error: string } {
  if (!Array.isArray(raw) || raw.length !== MAX_SLOT_COUNT) {
    return {
      valid: false,
      error: localize(
        locale,
        "3 créneaux sont requis.",
        "3 time slots are required.",
      ),
    };
  }

  const slots: string[] = [];
  for (const slot of raw) {
    if (typeof slot !== "string") {
      return {
        valid: false,
        error: localize(locale, "Créneau invalide.", "Invalid time slot."),
      };
    }

    const trimmed = slot.trim();
    if (!SLOT_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: localize(locale, "Créneau invalide.", "Invalid time slot."),
      };
    }
    slots.push(trimmed);
  }

  if (new Set(slots).size !== slots.length) {
    return {
      valid: false,
      error: localize(
        locale,
        "Les créneaux doivent être différents.",
        "Time slots must be different.",
      ),
    };
  }

  return { valid: true, value: slots as [string, string, string] };
}

function readString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  required = true,
): string | null {
  const raw = input[key];
  if (raw === undefined || raw === null) {
    return required ? null : "";
  }
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  if (required && value.length === 0) {
    return null;
  }
  return value.length > maxLength ? null : value;
}

function normalizeLocale(value: string | null): "fr" | "en" | null {
  if (!value) {
    return "fr";
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "fr" || normalized === "en" ? normalized : null;
}

function localize(locale: "fr" | "en", fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}
