"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import { ArrowRightIcon, MailIcon } from "../icons";
import { TextReveal } from "../cinema/TextReveal";
import { MagneticButton } from "../cinema/MagneticButton";
import { CheckDraw } from "../cinema/CheckDraw";
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
    <section
      id="contact"
      className="section-dark section-spacing"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.14 0.025 247) 0%, oklch(0.10 0.018 248) 100%)",
      }}
    >
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="section-kicker justify-center"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {contact.kicker}
          </motion.p>

          <TextReveal
            text={contact.heading}
            className="section-title mt-4"
            as="h2"
            staggerMs={40}
          />

          <motion.p
            className="section-lead mx-auto mt-4"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {contact.subheading}
          </motion.p>

          {/* Trust items with CheckDraw */}
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {contact.trustItems.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-center gap-2 text-sm font-medium text-white/80"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: 0.3 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <CheckDraw className="h-3.5 w-3.5 text-brass-400" />
                {item}
              </motion.li>
            ))}
          </ul>

          {/* CTAs */}
          <motion.div
            className="mt-8 flex flex-wrap justify-center gap-3"
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            <MagneticButton
              as="a"
              href={pilotHref}
              className="btn-primary px-10 py-4 text-base animate-glow-pulse"
            >
              {contact.ctaPrimary}
              <ArrowRightIcon className="h-4 w-4" />
            </MagneticButton>
            <Link href={contactHref} className="btn-ghost px-8 py-4">
              <MailIcon className="h-4 w-4" />
              {contact.ctaSecondary}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
