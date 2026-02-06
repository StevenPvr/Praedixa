"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "../ui";
import { siteConfig } from "../../lib/config/site";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";

interface ContactSectionProps {
  className?: string;
}

const TRUST_ITEMS = [
  "Diagnostic gratuit",
  "Résultat en 48h",
  "Sans intégration IT",
  "Données agrégées uniquement",
  "Sans engagement",
] as const;

export function ContactSection({ className }: ContactSectionProps) {
  return (
    <motion.section
      id="contact"
      className={cn("bg-charcoal py-24 md:py-32", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        {/* Section Header */}
        <motion.div variants={staggerItem}>
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-amber-400">
            Passez à l&apos;action
          </span>
          <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Demandez votre diagnostic de couverture
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            En 48h, une carte des risques de sous-couverture, le coût de
            l&apos;inaction et un playbook d&apos;actions. Sans intégration.
            Sans données individuelles.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4"
          variants={staggerItem}
        >
          {/* Primary CTA - Devenir pilote */}
          <Link
            href="/devenir-pilote"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-10 py-5 text-lg font-bold text-charcoal shadow-lg transition-all duration-200 hover:bg-amber-400 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-charcoal sm:w-auto"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Demander un diagnostic 48h
          </Link>

          {/* Secondary CTA - Direct mailto */}
          <a
            href={`mailto:${siteConfig.contact.email}?subject=Diagnostic%20couverture%2048h`}
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 underline underline-offset-4 transition-colors hover:text-amber-400"
          >
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Ou écrivez-nous directement
          </a>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          variants={staggerItem}
        >
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm text-white/60">{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
