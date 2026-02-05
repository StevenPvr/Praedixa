"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";
import { easingCurves } from "../../lib/animations/config";
import { landingFaq } from "../../lib/content/landing-faq";

interface FaqSectionProps {
  className?: string;
}

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easingCurves.dramatic,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.15 + i * 0.08,
      ease: easingCurves.dramatic,
    },
  }),
};

export function FaqSection({ className }: FaqSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="faq"
      className={cn("bg-cream py-24 md:py-32", className)}
    >
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          className="text-center"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headerVariants}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            FAQ
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
            Les questions essentielles
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-secondary">
            Objectif : comprendre rapidement ce que fait Praedixa, comment ça
            marche, et ce que vous recevez.
          </p>
        </motion.div>

        <div className="mt-10 space-y-4">
          {landingFaq.map((item, index) => (
            <motion.details
              key={item.question}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft transition-all hover:border-amber-200 hover:shadow-card"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={index}
              variants={itemVariants}
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
              <p className="mt-4 text-sm leading-relaxed text-gray-secondary">
                {item.answer}
              </p>
            </motion.details>
          ))}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.6,
            delay: 0.6,
            ease: easingCurves.dramatic,
          }}
        >
          <Link
            href="/devenir-pilote"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-charcoal/90 hover:shadow-lg hover:shadow-charcoal/25 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Devenir entreprise pilote
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
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
