import type { Locale } from "../i18n/config";

export function formatBlogDate(locale: Locale, date: Date): string {
  const formatter = new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      dateStyle: "long",
    },
  );

  return formatter.format(date);
}

export function formatReadingTime(locale: Locale, minutes: number): string {
  if (locale === "fr") {
    return `${minutes} min de lecture`;
  }

  return `${minutes} min read`;
}

export function formatTagLabel(tag: string): string {
  return tag
    .split("-")
    .map((segment) =>
      segment.length === 0
        ? segment
        : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`,
    )
    .join(" ");
}
