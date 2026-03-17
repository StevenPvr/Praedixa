"use client";

import { useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { AccordionItem } from "../shared/v2/AccordionItem";

interface FaqSectionV2Props {
  locale: Locale;
}

export function FaqSectionV2({ locale }: FaqSectionV2Props) {
  const vp = getValuePropContent(locale);
  const faq = vp.faqV2;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionShellV2 id="faq">
      <div className="mx-auto max-w-[58rem]">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
          {faq.heading}
        </h2>

        <div className="mt-10 divide-y divide-v2-border-100">
          {faq.items.map((item, i) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

        {/* Mini contact card */}
        <div className="mt-12 rounded-card border border-v2-border-200 bg-surface-50 p-6 text-center">
          <p className="text-sm text-ink-700">{faq.contactBody}</p>
          <a
            href={`/${locale}/contact`}
            className="mt-3 inline-flex rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink-800"
          >
            {faq.contactCta}
          </a>
        </div>
      </div>
    </SectionShellV2>
  );
}
