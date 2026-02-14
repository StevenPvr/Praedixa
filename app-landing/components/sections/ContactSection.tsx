"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import { ArrowRightIcon, MailIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface ContactSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export function ContactSection({ dict, locale }: ContactSectionProps) {
  const { contact } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const contactHref = `/${locale}/${localizedSlugs.contact[locale]}`;

  return (
    <section id="contact" className="section-spacing">
      <div className="section-shell">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker justify-center">{contact.kicker}</p>
          <h2 className="section-title mt-4">{contact.heading}</h2>
          <p className="section-lead mx-auto">{contact.subheading}</p>

          {/* Trust items */}
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {contact.trustItems.map((item) => (
              <li key={item} className="trust-badge">
                {item}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={pilotHref} className="btn-primary">
              {contact.ctaPrimary}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href={contactHref} className="btn-ghost">
              <MailIcon className="h-4 w-4" />
              {contact.ctaSecondary}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
