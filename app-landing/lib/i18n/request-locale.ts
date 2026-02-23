import { defaultLocale, isValidLocale, type Locale } from "./config";

type HeaderLookup = Pick<Headers, "get">;

const FRENCH_COUNTRY_CODES = new Set<string>([
  "FR",
  "BE",
  "CH",
  "LU",
  "MC",
  "GF",
  "GP",
  "MQ",
  "RE",
  "YT",
  "PM",
  "WF",
  "PF",
  "NC",
  "BL",
  "MF",
]);

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

function parseCountryCode(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  if (normalized === "XX" || normalized === "ZZ") return null;
  return normalized;
}

function getCountryFromHeaders(headers: HeaderLookup): string | null {
  for (const header of COUNTRY_HEADERS) {
    const value = parseCountryCode(headers.get(header));
    if (value) return value;
  }
  return null;
}

function parsePreferredLanguage(raw: string | null): string | null {
  if (!raw) return null;

  let bestLanguage: string | null = null;
  let bestWeight = Number.NEGATIVE_INFINITY;

  for (const segment of raw.split(",")) {
    const [tagPart, ...params] = segment.trim().split(";");
    const tag = tagPart?.trim().toLowerCase();
    if (!tag || tag === "*") continue;

    let weight = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q" && value) {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) weight = parsed;
      }
    }

    if (weight > bestWeight) {
      bestWeight = weight;
      bestLanguage = tag;
    }
  }

  return bestLanguage;
}

export function detectRequestLocale(headers: HeaderLookup): Locale {
  const countryCode = getCountryFromHeaders(headers);
  if (countryCode) {
    return FRENCH_COUNTRY_CODES.has(countryCode) ? "fr" : "en";
  }

  const preferredLanguage = parsePreferredLanguage(
    headers.get("accept-language"),
  );
  if (preferredLanguage?.startsWith("fr")) return "fr";
  if (preferredLanguage?.startsWith("en")) return "en";

  return defaultLocale;
}

export function resolveLocaleFromPathname(pathname: string): Locale {
  const [, localeCandidate] = pathname.split("/");
  if (localeCandidate && isValidLocale(localeCandidate)) {
    return localeCandidate;
  }
  return defaultLocale;
}
