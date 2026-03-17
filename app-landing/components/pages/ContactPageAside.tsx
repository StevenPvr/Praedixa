"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import {
  CheckBadgeIcon,
  DecisionGraphIcon,
} from "../shared/icons/MarketingIcons";
import type { ContactPageCopy } from "./contact-page.types";

function ContactChecklistSection({
  title,
  items,
  className = "rounded-[1.7rem] border border-neutral-200/80 bg-white/90 p-5",
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-700">
        {title}
      </h2>
      <ul className="mt-4 list-none space-y-2.5 p-0">
        {items.map((item) => (
          <li
            key={item}
            className="m-0 flex items-start gap-2.5 text-sm text-neutral-700"
          >
            <CheckBadgeIcon
              size={16}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContactPageAside({
  copy,
  locale,
}: {
  copy: ContactPageCopy;
  locale: Locale;
}) {
  const servicesHref = getLocalizedPath(locale, "services");

  return (
    <aside className="space-y-6 md:pt-2">
      <div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em] text-ink-800">
          <DecisionGraphIcon size={14} />
          {copy.kicker}
        </span>
        <h1 className="mt-4 max-w-[18ch] text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
          {copy.heading}
        </h1>
        <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-neutral-600">
          {copy.intro}
        </p>
      </div>

      <ContactChecklistSection
        title={copy.promiseTitle}
        items={copy.promiseItems}
        className="rounded-[1.7rem] border border-amber-200/80 bg-amber-50/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
      />
      <ContactChecklistSection
        title={copy.reassuranceTitle}
        items={copy.reassuranceItems}
      />

      <section className="rounded-[1.7rem] border border-neutral-200/80 bg-white/90 p-5">
        <p className="text-sm font-semibold text-ink">
          {copy.secondaryPanelTitle}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {copy.secondaryPanelBody}
        </p>
        <Link
          href={servicesHref}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.99]"
        >
          {copy.secondaryPanelCta}
          <ArrowUpRight size={16} weight="bold" />
        </Link>
      </section>
    </aside>
  );
}
