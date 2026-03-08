export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 2048 ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    /[\u0000-\u001F\u007F\\]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}
