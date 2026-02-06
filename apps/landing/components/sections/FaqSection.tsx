"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "../ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { landingFaq, faqCategories } from "../../lib/content/landing-faq";

interface FaqSectionProps {
  className?: string;
}

export function FaqSection({ className }: FaqSectionProps) {
  return (
    <motion.section
      id="faq"
      className={cn("bg-neutral-50 py-24 md:py-32", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-4xl px-6">
        <motion.div className="text-center" variants={staggerItem}>
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-amber-600">
            FAQ
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal sm:text-4xl md:text-[2.75rem]">
            Questions frequentes sur Praedixa
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Tout ce qu&apos;un Dir. d&apos;exploitation, responsable Ops ou DAF
            doit savoir avant de demarrer.
          </p>
        </motion.div>

        <div className="mt-10 space-y-10">
          {faqCategories.map((category) => {
            const items = landingFaq.filter((q) => q.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <motion.h3
                  className="text-xs font-semibold uppercase tracking-widest text-amber-600"
                  variants={staggerItem}
                >
                  {category}
                </motion.h3>

                {items.map((item) => (
                  <motion.details
                    key={item.question}
                    className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft transition-all hover:border-amber-200 hover:shadow-card"
                    variants={staggerItem}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                      <span className="text-left text-base font-semibold text-charcoal">
                        {item.question}
                      </span>
                      <span
                        className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v14m7-7H5"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                      {item.answer}
                    </p>
                  </motion.details>
                ))}
              </div>
            );
          })}
        </div>

        <motion.div className="mt-12 text-center" variants={staggerItem}>
          <p className="mb-4 text-sm text-neutral-500">
            Une question qui n&apos;est pas ici ?
          </p>
          <Link
            href="/devenir-pilote"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-charcoal/90 hover:shadow-lg hover:shadow-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Demander un diagnostic 48h
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
