const MAX_MESSAGE_LENGTH = 800;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_LOCALES = new Set(["fr", "en"]);
const INTENT_LABELS = {
  deployment: {
    tag: "SCOPE",
    fr: "Premier périmètre de décision",
    en: "First decision scope",
  },
  historical_proof: {
    tag: "HISTORICAL-PROOF",
    fr: "Preuve sur historique",
    en: "Historical proof",
  },
} as const;

export type ContactIntent = keyof typeof INTENT_LABELS;

export type ContactPayload = {
  locale: "fr" | "en";
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
  subject: string;
  consent: true;
  website: string;
  captchaAnswer: number;
  challengeToken: string;
};

const SUPPORTED_INTENTS = new Set<ContactIntent>(
  Object.keys(INTENT_LABELS) as ContactIntent[],
);

export function validateContactBody(
  body: unknown,
): { valid: true; data: ContactPayload } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }

  const input = body as Record<string, unknown>;
  const locale = normalizeLocale(readString(input, "locale", 8, false));
  if (!locale) {
    return { valid: false, error: "Locale invalide." };
  }

  const intent = readIntent(input);
  if (!intent.valid) {
    return intent;
  }

  const companyName = readString(input, "companyName", 100, true);
  if (!companyName) {
    return { valid: false, error: "Entreprise requise." };
  }

  const role = readString(input, "role", 80, true);
  if (!role) {
    return { valid: false, error: "Fonction requise." };
  }

  const email = readString(input, "email", 254, true);
  if (!email || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Adresse email invalide." };
  }

  const siteCount = readString(input, "siteCount", 40, true);
  if (!siteCount) {
    return { valid: false, error: "Nombre de sites requis." };
  }

  const sector = readString(input, "sector", 120, true);
  if (!sector) {
    return { valid: false, error: "Secteur requis." };
  }

  const mainTradeOff = readString(input, "mainTradeOff", 400, true);
  if (!mainTradeOff) {
    return { valid: false, error: "Arbitrage principal requis." };
  }

  const timeline = readString(input, "timeline", 80, true);
  if (!timeline) {
    return { valid: false, error: "Horizon projet requis." };
  }

  const currentStack = readString(input, "currentStack", 300, false);
  if (currentStack === null) {
    return { valid: false, error: "Stack actuelle invalide." };
  }

  const message = readString(input, "message", MAX_MESSAGE_LENGTH, false);
  if (message === null) {
    return { valid: false, error: "Message invalide." };
  }

  if (typeof input.consent !== "boolean" || !input.consent) {
    return {
      valid: false,
      error: "Vous devez accepter les conditions pour envoyer ce message.",
    };
  }

  const captchaAnswer = readInt(input, "captchaAnswer");
  const challengeToken = readString(input, "challengeToken", 600, true);
  if (captchaAnswer === null || challengeToken === null) {
    return { valid: false, error: "Test anti-spam invalide." };
  }

  return {
    valid: true,
    data: {
      locale,
      intent: intent.value,
      companyName,
      role,
      email: email.toLowerCase(),
      siteCount,
      sector,
      mainTradeOff,
      timeline,
      currentStack,
      message,
      subject: defaultSubjectForRequest(companyName, intent.value, locale),
      consent: true,
      website:
        typeof input.website === "string"
          ? input.website.trim().slice(0, 200)
          : "",
      captchaAnswer,
      challengeToken,
    },
  };
}

export function requestIntentLabel(
  intent: ContactIntent,
  locale: "fr" | "en",
): string {
  return INTENT_LABELS[intent][locale];
}

export function requestIntentTag(intent: ContactIntent): string {
  return INTENT_LABELS[intent].tag;
}

export function requestIntentValue(intent: ContactIntent): string {
  return intent;
}

function readIntent(
  input: Record<string, unknown>,
): { valid: true; value: ContactIntent } | { valid: false; error: string } {
  const raw = readString(input, "intent", 40, false);
  if (!raw) {
    return { valid: true, value: "deployment" };
  }

  const normalized = raw.trim() as ContactIntent;
  if (!SUPPORTED_INTENTS.has(normalized)) {
    return { valid: false, error: "Intention de contact invalide." };
  }

  return { valid: true, value: normalized };
}

function defaultSubjectForRequest(
  companyName: string,
  intent: ContactIntent,
  locale: "fr" | "en",
): string {
  const prefix = requestIntentLabel(intent, locale);
  return companyName.trim() ? `${prefix} — ${companyName.trim()}` : prefix;
}

function normalizeLocale(value: string | null): "fr" | "en" | null {
  if (!value) {
    return "fr";
  }

  const normalized = value.trim().toLowerCase();
  if (!SUPPORTED_LOCALES.has(normalized)) {
    return null;
  }

  return normalized as "fr" | "en";
}

function readString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  required = true,
): string | null {
  const value = input[key];
  if (value === undefined || value === null) {
    return required ? null : "";
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function readInt(input: Record<string, unknown>, key: string): number | null {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}
