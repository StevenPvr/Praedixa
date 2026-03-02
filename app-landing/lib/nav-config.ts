import type { Locale } from "./i18n/config";

export const navAnchors = [
  "problem",
  "method",
  "howItWorks",
  "useCases",
  "security",
  "faq",
] as const;

export const anchorIds: Record<(typeof navAnchors)[number], string> = {
  problem: "problem",
  method: "solution",
  howItWorks: "how-it-works",
  useCases: "use-cases",
  security: "security",
  faq: "faq",
};

export function resolveNavLabel(
  locale: Locale,
  key: (typeof navAnchors)[number],
  label: string,
): string {
  if (key !== "howItWorks" && key !== "useCases") {
    return label;
  }

  const cleaned = label
    .replace(/\bUI\s*\/\s*front-?end\b/gi, "")
    .replace(/\bfront-?end\b/gi, "")
    .replace(/\bback-?end\b/gi, "")
    .replace(/\s+[|/·]\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length > 0) {
    return cleaned;
  }

  if (key === "howItWorks") {
    return locale === "fr" ? "Comment ça marche" : "How it works";
  }
  return locale === "fr" ? "Décisions couvertes" : "Decisions covered";
}
