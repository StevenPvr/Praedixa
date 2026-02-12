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
      className={cn("bg-charcoal py-24 text-white md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div
          className="premium-card border-white/10 bg-white/[0.04] px-6 py-10 md:px-10"
          variants={staggerItem}
        >
          <p className="section-kicker text-amber-300">Passer à l'action</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
            Planifiez votre qualification exécutive
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/75">
            En 30 minutes, nous cadrons un périmètre réaliste, le niveau de
            criticité, et la valeur attendue d'une première boucle de décision.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/devenir-pilote"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-amber-400"
            >
              <BoltIcon className="h-4 w-4" />
              Demander une qualification pilote
            </Link>
            <a
              href={`mailto:${siteConfig.contact.email}?subject=Programme%20pilote%20Praedixa`}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white/85 transition hover:border-white/45"
            >
              <MailIcon className="h-4 w-4" />
              Écrire à l'équipe
            </a>
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/60">
            Qualification sous 24h ouvrées • Cohorte limitée • Sans engagement
          </p>

          <div className="mt-8 grid gap-2.5 md:grid-cols-2">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-white/70">
                <CheckIcon className="h-4 w-4 text-amber-300" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
