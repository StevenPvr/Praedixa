"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface FaqSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

export function FaqSection({ dict }: FaqSectionProps) {
  const [activeCategory, setActiveCategory] = useState(
    dict.faq.categories[0] ?? "",
  );
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredItems = dict.faq.items.filter(
    (item) => item.category === activeCategory,
  );

  return (
    <SectionShell id="faq">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker>{dict.faq.kicker}</Kicker>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-ink md:text-5xl" style={{ lineHeight: 1.05 }}>
          {dict.faq.heading}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
          {dict.faq.subheading}
        </p>
      </motion.div>

      <div className="mt-8 flex flex-wrap gap-2">
        {dict.faq.categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setActiveCategory(cat);
              setOpenIndex(null);
            }}
            className={`relative rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "border-brass-200 bg-brass-50 text-brass-700"
                : "border-border-subtle bg-white text-neutral-500 hover:border-border-hover hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-8 divide-y divide-border-subtle">
        <AnimatePresence>
          {filteredItems.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className="py-1">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between bg-transparent px-2 py-4 text-left transition-colors hover:bg-neutral-50/30"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 text-sm font-semibold text-ink">
                    {item.question}
                  </span>
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { type: "spring", stiffness: 200, damping: 28 },
                        opacity: { duration: 0.25 },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-4 pt-1">
                        <p className="max-w-[65ch] text-sm leading-relaxed text-neutral-600">
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
