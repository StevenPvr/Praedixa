const MIN_MESSAGE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 800;
const MAX_SUBJECT_LENGTH = 120;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{6,30}$/;
const SUPPORTED_LOCALES = new Set(["fr", "en"]);

const REQUEST_TYPE_LABELS = {
  deployment_request: {
    tag: "PILOT",
    fr: "Déploiement Praedixa",
    en: "Praedixa deployment",
  },
  product_demo: {
    tag: "DEMO",
    fr: "Demonstration produit",
    en: "Product demo",
  },
  partnership: {
    tag: "PARTNERSHIP",
    fr: "Partenariat",
    en: "Partnership",
  },
  press_other: {
    tag: "PRESS-OTHER",
    fr: "Presse / Autre",
    en: "Press / Other",
  },
} as const;

export type ContactRequestType = keyof typeof REQUEST_TYPE_LABELS;

export type ContactPayload = {
  locale: "fr" | "en";
  requestType: ContactRequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consent: true;
  website: string;
  captchaAnswer: number;
  challengeToken: string;
};

const SUPPORTED_REQUEST_TYPES = new Set<ContactRequestType>(
  Object.keys(REQUEST_TYPE_LABELS) as ContactRequestType[],
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

  const requestType = readRequestType(input);
  if (!requestType.valid) {
    return requestType;
  }

  const companyName = readString(input, "companyName", 100, true);
  if (!companyName) {
    return { valid: false, error: "Entreprise requise." };
  }

  const firstName = readOptionalField(
    input,
    "firstName",
    80,
    "Prénom invalide.",
  );
  if (!firstName.valid) {
    return firstName;
  }

  const lastName = readOptionalField(input, "lastName", 80, "Nom invalide.");
  if (!lastName.valid) {
    return lastName;
  }

  const role = readOptionalField(input, "role", 80, "Fonction invalide.");
  if (!role.valid) {
    return role;
  }

  const email = readString(input, "email", 254, true);
  if (!email || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Adresse email invalide." };
  }

  const phone = readOptionalField(input, "phone", 30, "Téléphone invalide.");
  if (!phone.valid) {
    return phone;
  }
  if (phone.value && !PHONE_REGEX.test(phone.value)) {
    return { valid: false, error: "Téléphone invalide." };
  }

  const subject = readSubject(input, locale, requestType.value, companyName);
  if (!subject.valid) {
    return subject;
  }

  const message = readString(input, "message", MAX_MESSAGE_LENGTH, true);
  if (!message || message.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message trop court (min ${MIN_MESSAGE_LENGTH} caractères).`,
    };
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
      requestType: requestType.value,
      companyName,
      firstName: firstName.value,
      lastName: lastName.value,
      role: role.value,
      email: email.toLowerCase(),
      phone: phone.value,
      subject: subject.value,
      message,
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

export function requestTypeLabel(
  type: ContactRequestType,
  locale: "fr" | "en",
): string {
  return REQUEST_TYPE_LABELS[type][locale];
}

export function requestTypeTag(type: ContactRequestType): string {
  return REQUEST_TYPE_LABELS[type].tag;
}

function readRequestType(
  input: Record<string, unknown>,
):
  | { valid: true; value: ContactRequestType }
  | { valid: false; error: string } {
  const requestTypeRaw = readString(input, "requestType", 40, false);
  if (requestTypeRaw === null) {
    return { valid: false, error: "Type de demande invalide." };
  }

  if (requestTypeRaw === "") {
    return { valid: true, value: "deployment_request" };
  }

  const normalized = requestTypeRaw.trim() as ContactRequestType;
  if (!SUPPORTED_REQUEST_TYPES.has(normalized)) {
    return { valid: false, error: "Type de demande invalide." };
  }

  return { valid: true, value: normalized };
}

function readSubject(
  input: Record<string, unknown>,
  locale: "fr" | "en",
  requestType: ContactRequestType,
  companyName: string,
): { valid: true; value: string } | { valid: false; error: string } {
  const subjectRaw = readString(input, "subject", MAX_SUBJECT_LENGTH, false);
  if (subjectRaw === null) {
    return { valid: false, error: "Objet invalide." };
  }

  if (subjectRaw.trim().length > 0) {
    return { valid: true, value: subjectRaw };
  }

  return {
    valid: true,
    value: defaultSubjectForRequest({ companyName, locale, requestType }),
  };
}

function defaultSubjectForRequest({
  companyName,
  locale,
  requestType,
}: {
  companyName: string;
  locale: "fr" | "en";
  requestType: ContactRequestType;
}): string {
  const prefix =
    requestType === "deployment_request"
      ? locale === "en"
        ? "Historical proof request"
        : "Preuve sur historique offerte"
      : requestTypeLabel(requestType, locale);

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

function readOptionalField(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  error: string,
): { valid: true; value: string } | { valid: false; error: string } {
  const value = readString(input, key, maxLength, false);
  return value === null ? { valid: false, error } : { valid: true, value };
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
  if (value.length > maxLength) {
    return null;
  }
  return value;
}

function readInt(input: Record<string, unknown>, key: string): number | null {
  const raw = input[key];
  if (typeof raw === "number" && Number.isInteger(raw)) {
    return raw;
  }
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
