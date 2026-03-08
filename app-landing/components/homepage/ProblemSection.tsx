import { CheckCircle, WarningCircle } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { MagneticActionLink } from "../shared/motion/MagneticActionLink";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";
import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "../shared/motion/MotionReveal";

interface ProblemSectionProps {
  locale: Locale;
  dict: Dictionary;
}

export function ProblemSection({ locale, dict }: ProblemSectionProps) {
  const primaryCtaHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const problem = dict.problem;
  const hasKicker = problem.kicker.trim().length > 0;
  const pains = Array.isArray(problem.pains) ? problem.pains : null;
  const signals = Array.isArray(problem.diagnostic.signals)
    ? problem.diagnostic.signals
    : null;

  if (!pains || !signals) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          {hasKicker ? (
            <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          ) : null}
          <h2
            className={`${hasKicker ? "mt-3" : "mt-0"} max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl`}
          >
            {problem.states.loadingTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.loadingBody}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (pains.length === 0 && signals.length === 0) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          {hasKicker ? (
            <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          ) : null}
          <h2
            className={`${hasKicker ? "mt-3" : "mt-0"} max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl`}
          >
            {problem.states.emptyTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.emptyBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  if (pains.length === 0 || signals.length === 0) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          {hasKicker ? (
            <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          ) : null}
          <h2
            className={`${hasKicker ? "mt-3" : "mt-0"} max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl`}
          >
            {problem.states.errorTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.errorBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="problem" className="section-dark">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
        <div className="min-w-0">
          <MotionReveal>
            {hasKicker ? (
              <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
            ) : null}
            <h2
              className={`${hasKicker ? "mt-3" : "mt-0"} max-w-3xl text-4xl font-bold leading-none tracking-tighter text-white md:text-6xl`}
            >
              {problem.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {problem.subheading}
            </p>
            <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-amber-100/90">
              {problem.ctaHint}
            </p>
          </MotionReveal>

          <MotionStagger
            className="mt-12 divide-y divide-white/10 border-y border-white/10"
            staggerDelay={0.12}
          >
            {pains.map((pain, i) => (
              <MotionStaggerItem
                key={pain.title}
                className="grid grid-cols-1 gap-4 py-5 md:grid-cols-[4.4rem_1fr] md:gap-6"
              >
                <div className="flex items-center gap-2">
                  <WarningCircle
                    size={18}
                    weight="fill"
                    className="shrink-0 text-amber-300"
                  />
                  <span className="font-mono text-xs text-neutral-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {pain.title}
                  </h3>
                  <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-neutral-200">
                    {pain.description}
                  </p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>

        <MotionReveal
          direction="right"
          delay={0.2}
          className="md:sticky md:top-28 md:self-start"
        >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm md:p-7">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-amber-100">
              {locale === "fr" ? "Signaux à surveiller" : "Signals to watch"}
            </span>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {problem.diagnostic.title}
            </h3>
            <ul className="mt-5 list-none space-y-3.5 p-0">
              {signals.map((signal) => (
                <li
                  key={signal}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-200"
                >
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  <PulseDot className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-amber-300" />
                  {signal}
                </li>
              ))}
            </ul>
            <ShimmerTrack className="mt-6" />
            <div className="mt-6">
              <MagneticActionLink
                href={primaryCtaHref}
                label={problem.cta}
                className="border-white/15 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/[0.1]"
              />
            </div>
          </div>
        </MotionReveal>
      </div>
    </SectionShell>
  );
}
