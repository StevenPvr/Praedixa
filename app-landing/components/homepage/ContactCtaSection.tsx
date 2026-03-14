"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import type { MouseEventHandler } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import {
  buildContactIntentHref,
  getLocalizedPath,
  type Locale,
} from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import {
  AlertDiamondIcon,
  CheckBadgeIcon,
  ClockPulseIcon,
} from "../shared/icons/MarketingIcons";
import { SPRING, VP } from "../../lib/animations/variants";

interface ContactCtaSectionProps {
  locale: Locale;
  dict: Dictionary;
}
const EASE_SNAPPY = [0.16, 1, 0.3, 1] as const;

const ctaGroup = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const ctaItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_SNAPPY },
  },
};

const trustList = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const trustListItem = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: SPRING },
};

interface MagneticCtaLinkProps {
  href: string;
  label: string;
  icon: "arrow" | "mail";
  variant: "primary" | "secondary";
}

interface TrustSignalPanelProps {
  locale: Locale;
  items: string[];
}

const MagneticCtaLink = memo(function MagneticCtaLink({
  href,
  label,
  icon,
  variant,
}: MagneticCtaLinkProps) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useTransform(pointerX, [-72, 72], [-7, 7]);
  const y = useTransform(pointerY, [-72, 72], [-5, 5]);

  const handleMove: MouseEventHandler<HTMLAnchorElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    pointerX.set(Math.max(-72, Math.min(72, offsetX)));
    pointerY.set(Math.max(-72, Math.min(72, offsetY)));
  };

  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const baseClasses =
    "group relative inline-flex w-full items-center justify-center gap-2.5 rounded-xl border px-6 py-3.5 text-sm font-semibold no-underline transition-[transform,background-color,border-color,color] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] active:-translate-y-[1px] sm:w-auto";
  const variantClasses =
    variant === "primary"
      ? "border-white/70 bg-white text-ink hover:border-white hover:bg-neutral-100"
      : "border-white/20 bg-white/[0.04] text-white hover:border-white/45 hover:bg-white/[0.08]";

  return (
    <motion.div
      layout
      style={{ x, y }}
      transition={SPRING}
      className="inline-flex will-change-transform"
    >
      <Link
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        onBlur={reset}
        className={`${baseClasses} ${variantClasses}`}
      >
        <span
          className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 ${
            variant === "primary"
              ? "bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.34),transparent_58%)]"
              : "bg-[radial-gradient(circle_at_32%_0%,rgba(255,255,255,0.2),transparent_60%)]"
          }`}
          aria-hidden="true"
        />
        <span className="relative">{label}</span>
        {icon === "arrow" ? (
          <ArrowRight size={16} weight="bold" className="relative shrink-0" />
        ) : (
          <EnvelopeSimple
            size={16}
            weight="bold"
            className="relative shrink-0"
          />
        )}
      </Link>
    </motion.div>
  );
});

const TrustSignalPanel = memo(function TrustSignalPanel({
  locale,
  items,
}: TrustSignalPanelProps) {
  const cleanedItems = useMemo(
    () =>
      items.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    [items],
  );

  const hasInvalidItem =
    cleanedItems.length > 0 && cleanedItems.length !== items.length;
  const isEmpty = cleanedItems.length === 0;
  const localeLabel = locale === "fr";
  const panelTitle = localeLabel ? "Prochaines étapes" : "Next steps";
  const panelSubtitle = localeLabel
    ? "Réponse sous 48h ouvrées"
    : "Reply within 48 business hours";

  return (
    <motion.aside
      layout
      initial={{ opacity: 0, x: 18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VP}
      transition={{ ...SPRING, delay: 0.12 }}
      className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_42px_-26px_rgba(0,0,0,0.62)] md:-mt-8 md:p-8"
    >
      <div
        className="absolute inset-0 rounded-3xl border border-white/10"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <motion.span
              animate={{ scale: [1, 1.22, 1], opacity: [0.72, 1, 0.72] }}
              transition={{
                duration: 2.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="h-2.5 w-2.5 rounded-full bg-amber-300"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
              {panelTitle}
            </p>
          </div>
          <ClockPulseIcon
            size={16}
            className="shrink-0 text-amber-200"
            aria-hidden="true"
          />
        </div>

        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-neutral-100/95">
          {panelSubtitle}
        </p>

        <div className="mt-7 border-t border-white/15 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                layout
                layoutId="contact-trust-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_SNAPPY }}
                className="rounded-xl border border-white/15 bg-white/[0.04] p-4"
              >
                <p className="text-sm font-medium text-white">
                  {localeLabel
                    ? "Les modalités de démarrage sont confirmées lors du cadrage."
                    : "Kickoff details are confirmed during the scoping call."}
                </p>
              </motion.div>
            ) : hasInvalidItem ? (
              <motion.div
                key="error"
                layout
                layoutId="contact-trust-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE_SNAPPY }}
                className="rounded-xl border border-red-200/35 bg-red-500/10 p-4"
                role="status"
              >
                <p className="flex items-start gap-2 text-sm leading-relaxed text-red-50">
                  <AlertDiamondIcon
                    size={16}
                    className="mt-0.5 shrink-0 text-red-200"
                    aria-hidden="true"
                  />
                  {localeLabel
                    ? "Un élément de confiance est invalide. Nous affichons la version vérifiée."
                    : "One trust item is invalid. Showing verified entries only."}
                </p>
                <ul className="mt-3 space-y-2">
                  {cleanedItems.slice(0, 2).map((item) => (
                    <li key={item} className="text-sm text-red-50/90">
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <motion.ul
                key="ready"
                layout
                layoutId="contact-trust-state"
                variants={trustList}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {cleanedItems.map((item) => (
                  <motion.li
                    key={item}
                    layout
                    variants={trustListItem}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-neutral-100"
                  >
                    <CheckBadgeIcon
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div
          className="mt-7 h-px w-full overflow-hidden bg-white/12"
          aria-hidden="true"
        >
          <motion.span
            className="block h-full w-1/3 bg-amber-300/70"
            animate={{ x: ["-20%", "260%"] }}
            transition={{
              duration: 3.8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
    </motion.aside>
  );
});

export function ContactCtaSection({ locale, dict }: ContactCtaSectionProps) {
  const valueProp = getValuePropContent(locale);
  const scopingHref = buildContactIntentHref(locale, "deployment");
  const exampleHref = getLocalizedPath(locale, "decisionLogProof");

  return (
    <SectionShell id="contact" className="section-dark overflow-hidden">
      <div className="relative">
        <div
          className="pointer-events-none absolute -left-28 top-[-7rem] h-72 w-72 rounded-full bg-amber-400/14 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-[-8rem] h-80 w-80 rounded-full bg-amber-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 gap-14 lg:grid-cols-[1.68fr_minmax(290px,1fr)] lg:items-start lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
            className="md:pr-16 lg:pr-24"
          >
            <div className="flex items-center gap-3">
              <Kicker className="text-amber-100">{dict.contact.kicker}</Kicker>
              <span className="h-px w-16 bg-amber-200/50" aria-hidden="true" />
            </div>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tighter text-white md:text-6xl">
              {dict.contact.heading}
            </h2>
            <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {dict.contact.subheading}
            </p>

            <motion.div
              variants={ctaGroup}
              initial="hidden"
              whileInView="visible"
              viewport={VP}
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap"
            >
              <motion.div variants={ctaItem} layout>
                <MagneticCtaLink
                  href={scopingHref}
                  label={valueProp.ctaSecondary}
                  icon="arrow"
                  variant="primary"
                />
              </motion.div>
              <motion.div variants={ctaItem} layout>
                <MagneticCtaLink
                  href={exampleHref}
                  label={valueProp.ctaPrimary}
                  icon="arrow"
                  variant="secondary"
                />
              </motion.div>
            </motion.div>
          </motion.div>

          <TrustSignalPanel locale={locale} items={dict.contact.trustItems} />
        </div>
      </div>
    </SectionShell>
  );
}
