const LOCAL_PART_REGEX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

const PLACEHOLDER_LOCAL_PARTS = new Set([
  "test",
  "testing",
  "example",
  "fake",
  "dummy",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
]);

const RESERVED_EXACT_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
  "localhost",
  "local",
  "invalid",
  "test",
]);

const RESERVED_DOMAIN_SUFFIXES = [
  ".example",
  ".invalid",
  ".localhost",
  ".local",
  ".test",
] as const;

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "trashmail.com",
  "yopmail.com",
]);

export type SemanticEmailValidationReason =
  | "empty"
  | "too_long"
  | "invalid_format"
  | "placeholder_local_part"
  | "reserved_domain"
  | "disposable_domain";

export type SemanticEmailValidationResult =
  | { valid: true; normalized: string }
  | {
      valid: false;
      normalized: string;
      reason: SemanticEmailValidationReason;
    };

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function isSemanticallyValidEmailAddress(value: string): boolean {
  return validateSemanticEmailAddress(value).valid;
}

export function validateSemanticEmailAddress(
  value: string,
): SemanticEmailValidationResult {
  const normalized = normalizeEmailAddress(value);
  if (normalized.length === 0) {
    return { valid: false, normalized, reason: "empty" };
  }

  if (normalized.length > 254) {
    return { valid: false, normalized, reason: "too_long" };
  }

  const parts = normalized.split("@");
  if (parts.length !== 2) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  const [localPart = "", domain = ""] = parts;
  if (
    localPart.length === 0 ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !LOCAL_PART_REGEX.test(localPart)
  ) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  if (PLACEHOLDER_LOCAL_PARTS.has(localPart)) {
    return {
      valid: false,
      normalized,
      reason: "placeholder_local_part",
    };
  }

  if (
    domain.length === 0 ||
    domain.length > 253 ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  if (
    RESERVED_EXACT_DOMAINS.has(domain) ||
    RESERVED_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  ) {
    return { valid: false, normalized, reason: "reserved_domain" };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, normalized, reason: "disposable_domain" };
  }

  const labels = domain.split(".");
  if (labels.length < 2) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  if (!labels.every((label) => DOMAIN_LABEL_REGEX.test(label))) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  const tld = labels.at(-1) ?? "";
  if (tld.length < 2 || !/[A-Za-z]/.test(tld)) {
    return { valid: false, normalized, reason: "invalid_format" };
  }

  return { valid: true, normalized };
}
