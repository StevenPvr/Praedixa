import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { cn } from "../../lib/utils";

interface LocaleSwitcherProps {
  locale: Locale;
  className?: string;
}

export function LocaleSwitcher({ locale, className }: LocaleSwitcherProps) {
  const otherLocale = locale === "fr" ? "en" : "fr";
  const label = otherLocale.toUpperCase();

  return (
    <Link
      href={`/${otherLocale}`}
      className={cn(
        "hdr-locale inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold uppercase tracking-wider text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:text-ink",
        className,
      )}
      aria-label={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      {label}
    </Link>
  );
}
