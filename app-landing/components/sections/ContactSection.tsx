"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { siteConfig } from "../../lib/config/site";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { TRUST_ITEMS } from "../../lib/content/contact-content";
import { BoltIcon, MailIcon, CheckIcon } from "../icons";

interface ContactSectionProps {
  className?: string;
}

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
            Rejoignez le programme pilote
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Un partenariat de co-construction : vos données, nos modèles
            prédictifs, une interprétabilité native. Carte des risques, facteurs
            explicatifs, playbook d&apos;actions chiffré. Sans intégration, sans
            données individuelles.
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
            <BoltIcon className="h-5 w-5" />
            Devenir entreprise pilote
          </Link>

          {/* Secondary CTA - Direct mailto */}
          <a
            href={`mailto:${siteConfig.contact.email}?subject=Programme%20pilote%20Praedixa`}
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 underline underline-offset-4 transition-colors hover:text-amber-400"
          >
            <MailIcon className="h-4 w-4" />
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
              <CheckIcon className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white/60">{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
