export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Route slugs that differ between locales */
export const localizedSlugs = {
  pilot: { fr: "devenir-pilote", en: "pilot-application" },
  contact: { fr: "contact", en: "contact" },
  legal: { fr: "mentions-legales", en: "legal-notice" },
  privacy: { fr: "confidentialite", en: "privacy-policy" },
  terms: { fr: "cgu", en: "terms" },
} as const;
