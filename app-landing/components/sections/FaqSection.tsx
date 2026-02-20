"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextReveal } from "../cinema/TextReveal";
import { MagneticButton } from "../cinema/MagneticButton";
import { blurReveal, viewportEarly } from "../../lib/animations/variants";
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
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportEarly}
        >
          <p className="section-kicker">{faq.kicker}</p>
          <TextReveal
            text={faq.heading}
            as="h2"
            className="section-title mt-4"
          />
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
                  : "bg-surface-sunken text-ink-secondary hover:bg-surface-interactive"
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
                  <motion.span
                    className="mt-1 inline-flex h-4 w-4 shrink-0 text-ink-placeholder"
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24 }}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="accordion-content overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-ink-secondary">
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
          className="mt-16 flex justify-center"
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportEarly}
        >
          <MagneticButton
            as="a"
            href={pilotHref}
            className="btn-primary px-8 py-3.5"
          >
            {dict.hero.ctaPrimary}
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
