const isProd = process.env.NODE_ENV === "production";

export function sanitizeHttpHref(
  href: string | null | undefined,
): string | null {
  if (!href) return null;

  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      return parsed.toString();
    }
    if (!isProd && parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function buildMailtoHref(
  email: string | null | undefined,
): string | null {
  if (!email) return null;

  const trimmed = email.trim();
  if (!trimmed) return null;

  return `mailto:${encodeURIComponent(trimmed)}`;
}
