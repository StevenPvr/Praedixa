import { motion } from "framer-motion";
import {
  CalendarDots,
  ChartLineUp,
  CookingPot,
  Storefront,
  Warning,
} from "@phosphor-icons/react";
import { MagneticButton } from "@/components/MagneticButton";
import { evidenceLabels, greekiaMessaging } from "@/content/greekiaMessaging";

const statIcons = [CalendarDots, ChartLineUp, Storefront, CookingPot] as const;

export function HeroSection() {
  const { hero } = greekiaMessaging;

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-ink px-4 pb-14 pt-28 text-limestone sm:px-6 lg:px-8 lg:pt-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(246,180,76,0.24),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(255,255,255,0.14),transparent_16%),linear-gradient(180deg,rgba(6,22,138,0.98)_0%,rgba(5,18,112,1)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-16 right-[10%] hidden h-24 w-24 rounded-full border border-oxide-soft/40 bg-oxide/16 blur-[1px] lg:block"
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.28em] text-oxide-soft"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05 }}
            className="max-w-[12ch] font-display text-5xl uppercase leading-[0.92] tracking-[0.03em] text-white sm:text-6xl lg:text-7xl"
          >
            {hero.title}
            <span className="mt-4 block text-oxide-soft">
              {hero.highlighted}
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-8 space-y-5"
          >
            <p className="max-w-[52ch] text-xl leading-relaxed text-limestone/92 sm:text-2xl">
              {hero.intro}
            </p>
            <p className="max-w-[60ch] text-base leading-relaxed text-limestone/72">
              {hero.summary}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
            className="mt-7 grid gap-3 sm:grid-cols-3"
          >
            {hero.quickRead.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/14 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-oxide-soft">
                  En clair
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white">
                  {item}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-2.5"
          >
            {hero.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-limestone/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                {chip}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <MagneticButton href={hero.ctaPrimaryHref}>
              {hero.ctaPrimary}
            </MagneticButton>
            <MagneticButton href={hero.ctaSecondaryHref} variant="secondary">
              {hero.ctaSecondary}
            </MagneticButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 space-y-3"
          >
            {hero.claims.map((claim) => (
              <p
                key={claim.label}
                className="max-w-[72ch] text-sm leading-relaxed text-limestone/74"
              >
                <span className="font-semibold text-white">{claim.value}</span>
                <span className="mx-2 text-oxide-soft">|</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-oxide-soft">
                  {evidenceLabels[claim.evidence]}
                </span>
                <span className="mx-2 text-oxide-soft">|</span>
                <span>{claim.qualifier}</span>
                {claim.href ? (
                  <>
                    <span className="mx-2 text-oxide-soft">|</span>
                    <a
                      href={claim.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-white/24 underline-offset-4 transition-colors duration-300 hover:text-white"
                    >
                      Source
                    </a>
                  </>
                ) : null}
              </p>
            ))}
          </motion.div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 20, y: 16 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
          className="relative lg:pl-6"
        >
          <div className="rotate-[-2deg] rounded-[2.4rem] bg-limestone p-4 text-ink shadow-[0_34px_90px_-34px_rgba(0,0,0,0.62)] sm:p-6">
            <div className="rounded-[2rem] border border-ink/10 bg-white/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="grid gap-3 sm:grid-cols-2">
                {hero.boardStats.map((stat, index) => {
                  const Icon = statIcons[index] ?? CalendarDots;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-[1.6rem] border border-ink/8 bg-limestone p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                          {stat.label}
                        </span>
                        <Icon size={18} className="text-ink" weight="duotone" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-steel">
                        {stat.note}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[1.9rem] bg-ink p-5 text-limestone">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                      Premiere lecture business
                    </p>
                    <h2 className="mt-2 max-w-[12ch] font-display text-3xl uppercase leading-[0.94] tracking-[0.04em] text-white">
                      Ou Greekia perd de la marge
                    </h2>
                  </div>
                  <Warning
                    size={20}
                    className="mt-1 text-oxide-soft"
                    weight="fill"
                  />
                </div>

                <ul className="mt-5 space-y-3">
                  {hero.boardSignals.map((signal) => (
                    <li
                      key={signal}
                      className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm text-limestone/84 last:border-b-0 last:pb-0"
                    >
                      <span>{signal}</span>
                      <CookingPot
                        size={16}
                        className="text-oxide-soft"
                        weight="duotone"
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                    Ce que l'audit apporte
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-limestone/78">
                    Une lecture simple: ou agir, quelle option choisir et
                    comment prouver ensuite le gain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
