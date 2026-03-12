import { motion } from "framer-motion";
import {
  Buildings,
  CalendarDots,
  Circuitry,
  GraduationCap,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { MagneticButton } from "@/components/MagneticButton";
import { evidenceLabels, skolaeMessaging } from "@/content/skolaeMessaging";

const statIcons = [Buildings, CalendarDots, Circuitry, UsersThree] as const;

export function HeroSection() {
  const { hero } = skolaeMessaging;

  return (
    <section
      id="top"
      className="relative min-h-[100dvh] overflow-hidden px-4 pb-12 pt-20 sm:px-6 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(58,137,141,0.18),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(11,19,29,0.12),transparent_24%),linear-gradient(180deg,rgba(245,244,238,0.9)_0%,rgba(245,244,238,0.98)_45%,rgba(238,236,228,0.98)_100%)]"
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.28em] text-oxide"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05 }}
            className="text-balance font-display text-5xl tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            {hero.title}
            <span className="block text-steel">{hero.highlighted}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-8 space-y-5"
          >
            <p className="max-w-[64ch] text-lg leading-relaxed text-ink/84">{hero.intro}</p>
            <p className="max-w-[64ch] text-base leading-relaxed text-muted-foreground">
              {hero.summary}
            </p>
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
                className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
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
            <MagneticButton href={hero.ctaPrimaryHref}>{hero.ctaPrimary}</MagneticButton>
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
                className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground"
              >
                <span className="font-medium text-ink">{claim.value}</span>
                <span className="mx-2 text-oxide">|</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-oxide">
                  {evidenceLabels[claim.evidence]}
                </span>
                <span className="mx-2 text-oxide">|</span>
                <span>{claim.qualifier}</span>
                {claim.href ? (
                  <>
                    <span className="mx-2 text-oxide">|</span>
                    <a
                      href={claim.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-ink/30 underline-offset-4 transition-colors duration-300 hover:text-ink"
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
          className="relative lg:pl-10"
        >
          <div className="rounded-[2.5rem] border border-white/55 bg-white/62 p-5 shadow-diffusion shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md sm:p-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {hero.boardStats.map((stat, index) => {
                const Icon = statIcons[index];
                return (
                  <div
                    key={stat.label}
                    className="rounded-[1.75rem] border border-ink/8 bg-limestone/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {stat.label}
                      </span>
                      <Icon size={18} className="text-oxide" weight="duotone" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{stat.value}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[2rem] border border-ink/8 bg-ink p-5 text-limestone shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                    Premier bénéfice concret
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Couverture pédagogique multi-sites
                  </h2>
                </div>
                <Warning size={20} className="mt-1 text-oxide-soft" weight="fill" />
              </div>

              <ul className="mt-5 space-y-3">
                {hero.boardSignals.map((signal) => (
                  <li
                    key={signal}
                    className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm text-limestone/80 last:border-b-0 last:pb-0"
                  >
                    <span>{signal}</span>
                    <GraduationCap size={16} className="text-oxide-soft" weight="duotone" />
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-oxide-soft">
                  Ce que ce pilote apporte
                </p>
                <p className="mt-2 text-sm leading-relaxed text-limestone/78">
                  Le pilote devient évident quand Ops voit moins de feu, Finance moins de coût
                  subi et DSI aucun chantier lourd.
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
