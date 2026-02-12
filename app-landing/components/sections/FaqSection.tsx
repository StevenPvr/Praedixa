"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
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
      className={cn("py-24 md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div className="max-w-4xl" variants={staggerItem}>
          <p className="section-kicker">FAQ</p>
          <h2 className="section-title mt-4">
            Réponses pour directions opérations et finance
          </h2>
          <p className="section-lead">
            Cette section est pensée pour la due diligence métier d'un SaaS
            premium: périmètre, données, gouvernance, modèle de valeur.
          </p>
        </motion.div>

        <div className="mt-10 space-y-10">
          {faqCategories.map((category) => {
            const items = landingFaq.filter(
              (item) => item.category === category,
            );
            if (items.length === 0) return null;

            return (
              <section key={category} className="space-y-4">
                <motion.h3
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700"
                  variants={staggerItem}
                >
                  {category}
                </motion.h3>

                {items.map((item) => (
                  <motion.details
                    key={item.question}
                    className="premium-card group p-6"
                    variants={staggerItem}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                      <span className="text-left text-base font-semibold text-charcoal">
                        {item.question}
                      </span>
                      <span
                        className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition-transform group-open:rotate-45"
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
              </section>
            );
          })}
        </div>

        <motion.div className="mt-10" variants={staggerItem}>
          <p className="mb-4 text-sm text-neutral-600">
            Vous voulez évaluer l'adéquation sur votre contexte ?
          </p>
          <Link href="/devenir-pilote" className="gold-cta">
            Rejoindre la cohorte pilote
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
