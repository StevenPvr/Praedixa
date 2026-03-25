"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChartLineUp,
  ClockCountdown,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import {
  heroPulsorCta,
  heroPulsorHeadline,
} from "../../lib/animations/variants";

interface HeroPulsorContentProps {
  locale: Locale;
  contactHref: string;
  proofHref: string;
}

interface HeroConsoleSignal {
  action: string;
  metric: string;
  site: string;
  window: string;
}

interface HeroConsoleCopy {
  eyebrow: string;
  heading: string;
  networkLabel: string;
  stats: Array<{ label: string; value: string }>;
  signals: HeroConsoleSignal[];
}

const heroConsoleCopy: Record<Locale, HeroConsoleCopy> = {
  fr: {
    eyebrow: "Projection demande + effectifs",
    heading: "Ce que Praedixa aide à prévoir avant de figer la couverture",
    networkLabel: "18 restaurants · drive, salle, delivery",
    stats: [
      { label: "restaurants relus", value: "18" },
      { label: "services à risque", value: "3" },
      { label: "heures à couvrir projetées", value: "+42 h" },
    ],
    signals: [
      {
        site: "Lille République",
        window: "Vendredi · 12:05-13:20",
        metric: "Demande déjeuner +19 % vs base",
        action: "2 équipiers caisse / assemblage à prévoir",
      },
      {
        site: "Lyon Part-Dieu",
        window: "Vendredi · 19:00-20:40",
        metric: "Delivery +24 % · cuisine sous tension",
        action: "Renfort cuisine à planifier sur 2 shifts",
      },
      {
        site: "Paris Voltaire",
        window: "Samedi · 11:45-13:10",
        metric: "Pic comptoir + absence non couverte",
        action: "Réallocation depuis restaurant voisin à J+1",
      },
    ],
  },
  en: {
    eyebrow: "Demand + staffing forecast",
    heading: "What Praedixa helps teams predict before coverage is locked",
    networkLabel: "18 restaurants · drive-through, counter, delivery",
    stats: [
      { label: "restaurants reviewed", value: "18" },
      { label: "risky services", value: "3" },
      { label: "projected hours to cover", value: "+42 h" },
    ],
    signals: [
      {
        site: "Lille Republique",
        window: "Friday · 12:05-13:20",
        metric: "Lunch demand +19% vs baseline",
        action: "Plan 2 extra counter / assembly staff",
      },
      {
        site: "Lyon Part-Dieu",
        window: "Friday · 19:00-20:40",
        metric: "Delivery +24% · kitchen under pressure",
        action: "Plan kitchen reinforcement over 2 shifts",
      },
      {
        site: "Paris Voltaire",
        window: "Saturday · 11:45-13:10",
        metric: "Counter peak + uncovered absence",
        action: "Reallocate a shift from a nearby restaurant",
      },
    ],
  },
};

function HeroPrimaryCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-[58px] items-center justify-center gap-2.5 rounded-[29px] border border-amber-300/30 bg-amber-300 px-7 text-[16px] font-semibold text-[#17120d] shadow-[0_20px_40px_-20px_rgba(216,161,91,0.4)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-amber-200 active:scale-[0.98]"
    >
      <span>{label}</span>
      <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function HeroSecondaryCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-[58px] items-center justify-center rounded-[29px] border border-[#d8c29b] bg-[#f4ead7] px-7 text-[16px] font-semibold text-ink-950 backdrop-blur-md transition-colors duration-300 hover:border-amber-400/60 hover:bg-[#efdfc2] active:scale-[0.98]"
    >
      {label}
    </Link>
  );
}

function HeroProofRoles({ roles }: { roles: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      {roles.map((role) => (
        <span
          key={role}
          className="inline-flex items-center rounded-full border border-[#d8c29b] bg-[#f1e2c7] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5d4317]"
        >
          {role}
        </span>
      ))}
    </div>
  );
}

function HeroSignalCard({
  locale,
  signal,
}: {
  locale: Locale;
  signal: HeroConsoleSignal;
}) {
  return (
    <article className="rounded-[24px] border border-white/8 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{signal.site}</p>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.58)]">
            {signal.window}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-300/18 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-300">
          {locale === "fr" ? "Signal" : "Signal"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[rgba(255,255,255,0.82)]">
        {signal.metric}
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-white/8 bg-white/[0.05] px-3.5 py-3">
        <ClockCountdown
          size={18}
          weight="duotone"
          className="mt-0.5 shrink-0 text-amber-300"
          aria-hidden="true"
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.52)]">
            {locale === "fr" ? "Action recommandée" : "Recommended action"}
          </p>
          <p className="mt-1 text-sm text-white">{signal.action}</p>
        </div>
      </div>
    </article>
  );
}

function HeroSignalBoard({ locale }: { locale: Locale }) {
  const copy = heroConsoleCopy[locale];

  return (
    <motion.aside
      variants={heroPulsorCta}
      className="rounded-[32px] border border-[#192230]/10 bg-[#141c27] p-5 shadow-[0_28px_90px_rgba(12,17,23,0.18)] backdrop-blur-xl lg:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[32rem]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.7)]">
            <Storefront size={14} weight="duotone" aria-hidden="true" />
            {copy.eyebrow}
          </div>
          <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
            {copy.heading}
          </h2>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-[rgba(255,255,255,0.78)]">
          {copy.networkLabel}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {copy.signals.map((signal) => (
            <HeroSignalCard
              key={`${signal.site}-${signal.window}`}
              locale={locale}
              signal={signal}
            />
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.52)]">
              {locale === "fr"
                ? "Lecture siège + terrain"
                : "HQ + field readout"}
            </p>
            <div className="mt-4 space-y-3">
              {copy.stats.map((stat, index) => {
                const icons = [Storefront, UsersThree, ChartLineUp];
                const Icon = icons[index] ?? ChartLineUp;

                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.05] px-3.5 py-3"
                  >
                    <Icon
                      size={18}
                      weight="duotone"
                      className="shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-lg font-semibold text-white">
                        {stat.value}
                      </p>
                      <p className="text-xs text-[rgba(255,255,255,0.58)]">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-300/18 bg-amber-300/10 p-4 text-sm leading-relaxed text-[rgba(255,248,240,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="font-semibold text-white">
              {locale === "fr"
                ? "Le but n\u2019est pas de montrer encore un dashboard."
                : "The goal is not to show one more dashboard."}
            </p>
            <p className="mt-2">
              {locale === "fr"
                ? "Le but est de donner au réseau une lecture actionnable de la demande à venir et des heures à couvrir avant que le sous-effectif ne dégrade le service."
                : "The goal is to give the network an actionable read on upcoming demand and hours to cover before understaffing erodes service."}
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export function HeroPulsorContent({
  locale,
  contactHref,
  proofHref,
}: HeroPulsorContentProps) {
  const vp = getValuePropContent(locale);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="relative z-10 mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-8"
      initial={reduced ? "visible" : "hidden"}
      animate="visible"
      transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-end">
        <div className="pb-2 text-left">
          <motion.p
            variants={heroPulsorCta}
            className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[rgba(28,38,51,0.6)]"
          >
            {vp.heroKicker}
          </motion.p>

          <motion.div variants={heroPulsorHeadline} className="mt-5">
            <h1 className="max-w-[14ch] text-[2.8rem] font-semibold leading-[0.94] tracking-[-0.055em] text-ink-950 min-[480px]:text-[3.2rem] md:text-[4.2rem] lg:text-[4.8rem] xl:text-[5.4rem]">
              {vp.heroHeading}
              <br />
              <span className="text-amber-700">{vp.heroHeadingHighlight}</span>
            </h1>
          </motion.div>

          <motion.p
            variants={heroPulsorCta}
            className="mt-7 max-w-[34rem] text-[1rem] leading-7 text-[rgba(28,38,51,0.74)] sm:text-[1.08rem]"
          >
            {vp.heroSubheading}
          </motion.p>

          <motion.div
            variants={heroPulsorCta}
            className="mt-9 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <HeroPrimaryCta href={contactHref} label={vp.ctaSecondary} />
            <HeroSecondaryCta href={proofHref} label={vp.ctaPrimary} />
          </motion.div>

          <motion.div
            variants={heroPulsorCta}
            className="mt-7 flex flex-wrap gap-2.5"
          >
            {vp.reassurance.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-ink-950/8 bg-[#f5efe4] px-3.5 py-2 text-[12px] font-semibold text-[rgba(28,38,51,0.78)]"
              >
                {item}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={heroPulsorCta}
            className="mt-9 rounded-[28px] border border-[#dcc7a2] bg-[#f4ead7] p-5 shadow-[0_20px_50px_-40px_rgba(120,87,18,0.32)]"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              {vp.heroBadgeText}
            </p>
            <p className="mt-3 max-w-[32rem] text-[15px] leading-7 text-[rgba(28,38,51,0.8)]">
              {vp.heroProofBlockText ?? ""}
            </p>
            <HeroProofRoles roles={vp.heroProofRoles ?? []} />
            {vp.heroProofMicropill ? (
              <div className="mt-4 inline-flex rounded-full border border-amber-300/24 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-800">
                {vp.heroProofMicropill}
              </div>
            ) : null}
          </motion.div>
        </div>

        <HeroSignalBoard locale={locale} />
      </div>
    </motion.div>
  );
}
