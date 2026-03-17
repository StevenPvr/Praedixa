import { validateSemanticEmailAddress } from "../../security/email-address";
import {
  MAX_COMPANY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ROLE_LENGTH,
  MAX_STACK_LENGTH,
  MAX_PAIN_POINT_LENGTH,
  PHONE_REGEX,
  ALLOWED_EMPLOYEE_RANGES,
  ALLOWED_SECTORS,
  ALLOWED_ROLES,
  ALLOWED_SITE_COUNTS,
  ALLOWED_TIMELINES,
} from "./constants";

export interface ValidatedData {
  companyName: string;
  email: string;
  phone: string;
  employeeRange: string;
  sector: string;
  website: string;
  firstName: string;
  lastName: string;
  role: string;
  siteCount: string;
  timeline: string;
  currentStack: string;
  painPoint: string;
  consent: true;
  acquisitionSource: string;
  acquisitionSlug: string;
  acquisitionQuery: string;
}

type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string };

function requireString(
  obj: Record<string, unknown>,
  key: string,
  maxLen: number,
  requiredMsg: string,
  tooLongMsg: string,
): ValidationResult<string> {
  const raw = obj[key];
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, error: requiredMsg };
  }
  const value = raw.trim();
  if (value.length > maxLen) return { valid: false, error: tooLongMsg };
  return { valid: true, value };
}

function requireAllowlist(
  obj: Record<string, unknown>,
  key: string,
  allowed: Set<string>,
  requiredMsg: string,
  invalidMsg: string,
): ValidationResult<string> {
  const raw = obj[key];
  if (typeof raw !== "string") return { valid: false, error: requiredMsg };
  const value = raw.trim();
  if (!allowed.has(value)) return { valid: false, error: invalidMsg };
  return { valid: true, value };
}

function optionalAllowlist(
  value: string | null,
  allowed: Set<string>,
  invalidMsg: string,
): ValidationResult<string> {
  if (value === null) return { valid: false, error: invalidMsg };
  if (value !== "" && !allowed.has(value))
    return { valid: false, error: invalidMsg };
  return { valid: true, value };
}

function normaliseOptionalField(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

function optionalTrackingField(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return "";
  return trimmed;
}

export function validateRequestBody(
  body: unknown,
): { valid: true; data: ValidatedData } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Corps de requête invalide." };
  }
  const obj = body as Record<string, unknown>;

  const r1 = requireString(
    obj,
    "companyName",
    MAX_COMPANY_NAME_LENGTH,
    "Nom d'entreprise requis.",
    `Nom d'entreprise trop long (max ${MAX_COMPANY_NAME_LENGTH} caractères).`,
  );
  if (!r1.valid) return r1;

  const r2 = requireString(
    obj,
    "email",
    MAX_EMAIL_LENGTH,
    "Email requis.",
    "Adresse email trop longue.",
  );
  if (!r2.valid) return r2;
  const validatedEmail = validateSemanticEmailAddress(r2.value);
  if (!validatedEmail.valid) {
    return { valid: false, error: "Adresse email invalide." };
  }

  let phone = "";
  if (obj.phone !== undefined && obj.phone !== null) {
    if (typeof obj.phone !== "string") {
      return { valid: false, error: "Numéro de téléphone invalide." };
    }
    phone = obj.phone.trim();
    if (phone.length > MAX_PHONE_LENGTH) {
      return { valid: false, error: "Numéro de téléphone trop long." };
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return {
        valid: false,
        error:
          "Numéro de téléphone invalide (chiffres, +, -, espaces uniquement).",
      };
    }
  }

  const r3 = requireAllowlist(
    obj,
    "employeeRange",
    ALLOWED_EMPLOYEE_RANGES,
    "Effectif requis.",
    "Tranche d'effectif invalide.",
  );
  if (!r3.valid) return r3;

  const r4 = requireAllowlist(
    obj,
    "sector",
    ALLOWED_SECTORS,
    "Secteur requis.",
    "Secteur invalide.",
  );
  if (!r4.valid) return r4;

  const website = typeof obj.website === "string" ? obj.website.trim() : "";

  const firstName = normaliseOptionalField(obj.firstName, MAX_NAME_LENGTH);
  if (firstName === null) return { valid: false, error: "Prénom invalide." };

  const lastName = normaliseOptionalField(obj.lastName, MAX_NAME_LENGTH);
  if (lastName === null) return { valid: false, error: "Nom invalide." };

  const role = normaliseOptionalField(obj.role, MAX_ROLE_LENGTH);
  if (role === null) return { valid: false, error: "Fonction invalide." };
  const rRole = optionalAllowlist(role, ALLOWED_ROLES, "Fonction invalide.");
  if (!rRole.valid) return rRole;

  const siteCount = normaliseOptionalField(obj.siteCount, 20);
  if (siteCount === null)
    return { valid: false, error: "Nombre de sites invalide." };
  const rSite = optionalAllowlist(
    siteCount,
    ALLOWED_SITE_COUNTS,
    "Nombre de sites invalide.",
  );
  if (!rSite.valid) return rSite;

  const timeline = normaliseOptionalField(obj.timeline, 20);
  if (timeline === null)
    return { valid: false, error: "Horizon projet invalide." };
  const rTimeline = optionalAllowlist(
    timeline,
    ALLOWED_TIMELINES,
    "Horizon projet invalide.",
  );
  if (!rTimeline.valid) return rTimeline;

  const currentStack = normaliseOptionalField(
    obj.currentStack,
    MAX_STACK_LENGTH,
  );
  if (currentStack === null)
    return { valid: false, error: "Stack actuelle invalide." };

  const painPoint = normaliseOptionalField(
    obj.painPoint,
    MAX_PAIN_POINT_LENGTH,
  );
  if (painPoint === null)
    return { valid: false, error: "Enjeu principal invalide." };

  if (typeof obj.consent !== "boolean") {
    return { valid: false, error: "Consentement requis." };
  }
  if (!obj.consent) {
    return {
      valid: false,
      error:
        "Vous devez accepter les conditions pour envoyer votre candidature.",
    };
  }

  const acquisitionSource = optionalTrackingField(obj.acquisitionSource, 64);
  const acquisitionSlug = optionalTrackingField(obj.acquisitionSlug, 120);
  const acquisitionQuery = optionalTrackingField(obj.acquisitionQuery, 240);

  return {
    valid: true,
    data: {
      companyName: r1.value,
      email: validatedEmail.normalized,
      phone,
      employeeRange: r3.value,
      sector: r4.value,
      website,
      firstName,
      lastName,
      role: rRole.value,
      siteCount: rSite.value,
      timeline: rTimeline.value,
      currentStack,
      painPoint,
      consent: true,
      acquisitionSource,
      acquisitionSlug,
      acquisitionQuery,
    },
  };
}
