"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { CheckBadgeIcon } from "../shared/icons/MarketingIcons";
import { ScopingCallRequestPanel } from "../shared/ScopingCallRequestPanel";
import type { ContactPageCopy } from "./contact-page.types";

export function ContactPageSuccessState({
  companyName,
  copy,
  email,
  locale,
}: {
  companyName: string;
  copy: ContactPageCopy;
  email: string;
  locale: Locale;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(165deg,rgba(244,231,198,0.62)_0%,rgba(252,248,238,0.9)_72%,rgba(255,255,255,0.95)_100%)] p-8 text-center shadow-[0_22px_46px_-38px_rgba(32,24,4,0.45),inset_0_1px_0_rgba(255,255,255,0.82)]">
          <CheckBadgeIcon size={54} className="mx-auto text-amber-700" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            {copy.successTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-[54ch] text-base leading-relaxed text-neutral-700">
            {copy.successBody}
          </p>
        </div>

        <ScopingCallRequestPanel
          locale={locale}
          defaultCompanyName={companyName}
          defaultEmail={email}
          source="contact_success"
        />

        <div className="text-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-xl border border-brass-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-brass-800 no-underline transition-all duration-200 [transition-timing-function:var(--ease-snappy)] hover:border-brass-400 hover:bg-white active:-translate-y-[1px] active:scale-[0.99]"
          >
            <ArrowLeft size={16} />
            {copy.successCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
