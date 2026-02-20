import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

interface DemoTopbarProps {
  locale: Locale;
  dict: Dictionary["demo"];
  generatedAt: string | null;
}

function formatGeneratedAt(locale: Locale, isoDate: string | null) {
  if (!isoDate) return "—";
  const formatter = new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  return formatter.format(new Date(isoDate));
}

export function DemoTopbar({ locale, dict, generatedAt }: DemoTopbarProps) {
  return (
    <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-serif text-2xl tracking-tight text-white sm:text-3xl">
            {dict.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-blue-100/75">
            {dict.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 text-xs text-blue-100/70 sm:items-end">
          <p>
            {dict.updatedAtLabel}:{" "}
            <span className="font-semibold text-blue-100">
              {formatGeneratedAt(locale, generatedAt)}
            </span>
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-blue-200/40 hover:bg-white/[0.08]"
          >
            {dict.backToLanding}
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}
