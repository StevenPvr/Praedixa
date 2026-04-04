import { CALENDLY_EXPERT_BOOKING_URL } from "../../lib/external-links";
import type { Locale } from "../../lib/i18n/config";

function calendlyOpensNewTabPhrase(locale: Locale): string {
  return locale === "fr"
    ? " (s\u2019ouvre dans un nouvel onglet)"
    : " (opens in a new tab)";
}

export function CalendlyExpertLink({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={CALENDLY_EXPERT_BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`${label}${calendlyOpensNewTabPhrase(locale)}`}
    >
      {label}
    </a>
  );
}
