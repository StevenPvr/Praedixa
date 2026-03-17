import { isSemanticallyValidEmailAddress } from "../../lib/security/email-address";
import type { Locale } from "../../lib/i18n/config";
import type {
  ScopingCallCopy,
  ScopingCallFormData,
  ScopingFieldErrors,
} from "./scoping-call.types";

const SLOT_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function createScopingCallCopy(locale: Locale): ScopingCallCopy {
  return locale === "fr"
    ? {
        title: "Proposer un cadrage (30 min)",
        subtitle:
          "Proposez 3 créneaux. Nous confirmons un créneau par email sous 48h ouvrées.",
        company: "Entreprise",
        email: "Email",
        timezone: "Fuseau horaire",
        timezoneHint: "Auto-détecté, modifiable si besoin.",
        slots: "3 créneaux",
        slotsHint: "Choisissez 3 créneaux différents (format local).",
        notes: "Notes (optionnel)",
        notesHint:
          "Ex : contraintes d’agenda, participants (Ops/Finance/IT), urgence, etc.",
        submit: "Proposer mes créneaux",
        submitting: "Envoi en cours…",
        successTitle: "Créneaux envoyés",
        successBody:
          "Merci. Nous revenons par email pour confirmer un créneau.",
        errorPrefix: "Erreur :",
        invalidEmail: "Adresse email invalide.",
        requiredCompany: "Entreprise requise.",
        requiredTimezone: "Fuseau horaire requis.",
        requiredSlots: "3 créneaux valides sont requis.",
        unknownError: "Erreur inconnue.",
        networkError: "Erreur réseau. Veuillez réessayer.",
      }
    : {
        title: "Propose a scoping call (30 min)",
        subtitle:
          "Propose 3 time slots. We confirm one slot by email within 48 business hours.",
        company: "Company",
        email: "Email",
        timezone: "Timezone",
        timezoneHint: "Auto-detected, editable if needed.",
        slots: "3 time slots",
        slotsHint: "Pick 3 different time slots (local format).",
        notes: "Notes (optional)",
        notesHint:
          "Example: calendar constraints, attendees (Ops/Finance/IT), urgency, etc.",
        submit: "Send my slots",
        submitting: "Sending…",
        successTitle: "Slots sent",
        successBody: "Thanks. We will confirm one slot by email.",
        errorPrefix: "Error:",
        invalidEmail: "Invalid email address.",
        requiredCompany: "Company is required.",
        requiredTimezone: "Timezone is required.",
        requiredSlots: "3 valid time slots are required.",
        unknownError: "Unknown error.",
        networkError: "Network error. Please try again.",
      };
}

export function createInitialScopingCallForm(
  defaultCompanyName?: string,
  defaultEmail?: string,
): ScopingCallFormData {
  return {
    companyName: defaultCompanyName ?? "",
    email: defaultEmail ?? "",
    timezone: "",
    slot1: "",
    slot2: "",
    slot3: "",
    notes: "",
    website: "",
  };
}

export function clearScopingFieldError(
  current: ScopingFieldErrors,
  key: keyof ScopingCallFormData,
): ScopingFieldErrors {
  if (!(key in current)) {
    return current;
  }

  const next = { ...current };
  delete next[key as keyof ScopingFieldErrors];
  return next;
}

export function validateScopingCallForm(
  copy: ScopingCallCopy,
  form: ScopingCallFormData,
): ScopingFieldErrors {
  const errors: ScopingFieldErrors = {};

  if (!form.companyName.trim()) {
    errors.companyName = copy.requiredCompany;
  }

  const email = form.email.trim();
  if (!email || !isSemanticallyValidEmailAddress(email)) {
    errors.email = copy.invalidEmail;
  }

  if (!form.timezone.trim()) {
    errors.timezone = copy.requiredTimezone;
  }

  const slots = [form.slot1, form.slot2, form.slot3].map((slot) => slot.trim());
  const allValid = slots.every((slot) => SLOT_REGEX.test(slot));
  const unique = new Set(slots).size === slots.length;
  if (!allValid || !unique) {
    errors.slots = copy.requiredSlots;
  }

  return errors;
}
