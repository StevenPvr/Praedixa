const KNOWN_EXTERNAL_RUNTIME_ERROR_PATTERNS = [
  /i18n\.detectLanguage is not a function/i,
  /i18n\.detectLanguage'.*undefined/i,
  /u\(\)\.i18n\.detectLanguage/i,
];

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  return null;
}

export function isKnownExternalRuntimeError(value: unknown): boolean {
  const message = extractErrorMessage(value);
  if (!message) return false;
  return KNOWN_EXTERNAL_RUNTIME_ERROR_PATTERNS.some((pattern) =>
    pattern.test(message),
  );
}
