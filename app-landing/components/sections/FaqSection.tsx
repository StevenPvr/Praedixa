"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import { PlusIcon, ArrowRightIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface FaqSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export function FaqSection({ dict, locale }: FaqSectionProps) {
  const { faq } = dict;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    faq.categories[0] ?? "",
  );
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  const filteredItems = faq.items.filter(
    (item) => item.category === activeCategory,
  );

  return (
    <section id="faq" className="section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{faq.kicker}</p>
          <h2 className="section-title mt-4">{faq.heading}</h2>
          <p className="section-lead">{faq.subheading}</p>
        </motion.div>

        {/* Category tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {faq.categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setOpenIndex(null);
              }}
              className={`rounded px-3.5 py-2 text-sm font-medium transition ${
                activeCategory === category
                  ? "bg-charcoal text-cream"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div className="mt-6 divide-y divide-neutral-200">
          {filteredItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-start justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-charcoal">
                    {item.question}
                  </span>
                  <PlusIcon
                    className={`mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-neutral-600">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* CTA after FAQ */}
        <motion.div
          className="mt-10 flex justify-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <Link href={pilotHref} className="btn-primary">
            {dict.hero.ctaPrimary}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
