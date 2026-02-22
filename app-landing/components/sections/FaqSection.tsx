"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CircleNotch,
  Plus,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { MagneticButton } from "../cinema/MagneticButton";
import { blurReveal, viewportEarly } from "../../lib/animations/variants";
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
  const [isLoading, setIsLoading] = useState(true);
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const hasCategoryError = faq.categories.length === 0;

  const filteredItems = useMemo(
    () => faq.items.filter((item) => item.category === activeCategory),
    [faq.items, activeCategory],
  );

  return (
    <section id="faq" className="section-spacing border-t border-[var(--line)]">
      <div className="section-shell">
        <motion.div
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportEarly}
        >
          <p className="section-kicker">{faq.kicker}</p>
          <h2 className="section-title">{faq.heading}</h2>
          <p className="section-lead">{faq.subheading}</p>
        </motion.div>

        {hasCategoryError ? (
          <div className="mt-8 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--ink-soft)]">
            <p className="inline-flex items-center gap-2 font-medium text-[var(--ink)]">
              <WarningCircle
                size={16}
                weight="duotone"
                className="text-[var(--accent-700)]"
              />
              No FAQ category configured
            </p>
            <p className="mt-2">
              The FAQ configuration is currently unavailable.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              {faq.categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setOpenIndex(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    activeCategory === category
                      ? "border-[var(--accent-500)] bg-[var(--accent-50)] text-[var(--accent-700)]"
                      : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
              {isLoading ? (
                <div className="grid gap-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="h-11 animate-pulse rounded-xl bg-[var(--panel-muted)]"
                    />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--ink-soft)]">
                  <p className="inline-flex items-center gap-2 font-medium text-[var(--ink)]">
                    <WarningCircle
                      size={16}
                      weight="duotone"
                      className="text-[var(--accent-700)]"
                    />
                    Nothing in this category yet
                  </p>
                  <p className="mt-2">
                    Select another category to explore available answers.
                  </p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div
                      key={item.question}
                      className="border-t border-[var(--line)] first:border-t-0"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base font-medium text-[var(--ink)]">
                          {item.question}
                        </span>
                        <motion.span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--line)]"
                          animate={{ rotate: isOpen ? 45 : 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                          }}
                        >
                          <Plus
                            size={14}
                            weight="bold"
                            className="text-[var(--ink-soft)]"
                          />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.24,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
                              {item.answer}
                            </p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <motion.div
          className="mt-8 flex flex-wrap items-center gap-3"
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportEarly}
        >
          <MagneticButton as="a" href={pilotHref} className="btn-primary">
            {isLoading ? (
              <>
                <CircleNotch size={15} weight="bold" className="animate-spin" />
                Preparing quick access
              </>
            ) : (
              <>
                <Sparkle size={15} weight="fill" />
                {dict.hero.ctaPrimary}
                <ArrowUpRight size={16} weight="bold" />
              </>
            )}
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
