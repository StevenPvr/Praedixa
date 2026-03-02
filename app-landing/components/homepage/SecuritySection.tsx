import { Database, Plugs, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";
import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "../shared/motion/MotionReveal";

interface SecuritySectionProps {
  dict: Dictionary;
}

export function SecuritySection({ dict }: SecuritySectionProps) {
  const security = dict.security;
  const tiles = Array.isArray(security.tiles) ? security.tiles : null;
  const tools = Array.isArray(security.compatibility.tools)
    ? security.compatibility.tools
    : null;
  const isFrench = dict.nav.problem === "Problème";

  if (!tiles || !tools) {
    return (
      <SectionShell id="security">
        <div className="max-w-3xl">
          <Kicker>{security.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {isFrench
              ? "Chargement de l’intégration & des données"
              : "Loading integration and data"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Connexion des briques de gouvernance en cours."
              : "Connecting governance layers."}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (tiles.length === 0) {
    return (
      <SectionShell id="security">
        <div className="max-w-3xl">
          <Kicker>{security.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {isFrench
              ? "Aucune brique d’intégration"
              : "No integration blocks available"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Ajoutez des capacités techniques pour afficher cette section."
              : "Add technical capabilities to render this section."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="security"
      className="bg-[linear-gradient(180deg,var(--warm-bg-muted)_0%,var(--warm-bg-panel)_100%)]"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.18fr_0.82fr] md:gap-14">
        <div className="min-w-0">
          <MotionReveal>
            <Kicker>{security.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {security.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
              {security.subheading}
            </p>
          </MotionReveal>

          <MotionStagger className="mt-12 space-y-3" staggerDelay={0.1}>
            {tiles.map((tile) => (
              <MotionStaggerItem
                key={tile.title}
                className="rounded-2xl border border-neutral-200/80 bg-white/85 p-5 shadow-[0_20px_36px_-30px_rgba(15,23,42,0.3)] md:p-6"
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={20}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-ink">
                      {tile.title}
                    </h3>
                    <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-neutral-600">
                      {tile.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                  <PulseDot className="h-1.5 w-1.5 bg-amber-500" />
                  {isFrench ? "Contrôle actif" : "Active controls"}
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
          <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-6 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] md:p-7">
            <div className="flex items-start gap-3">
              <Plugs size={20} weight="fill" className="mt-1 shrink-0 text-brass-700" />
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  {security.compatibility.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {security.compatibility.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tools.map((tool, index) => (
                <span
                  key={tool}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-300/70 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 ${
                    index % 2 === 1 ? "translate-y-[1px]" : ""
                  }`}
                >
                  <Database size={12} weight="fill" className="text-brass-600" />
                  {tool}
                </span>
              ))}
            </div>

            <ShimmerTrack
              className="mt-5 bg-neutral-100"
              indicatorClassName="via-amber-300/55"
            />

            <p className="mt-5 border-l-2 border-amber-300/70 pl-4 text-xs leading-relaxed text-neutral-600">
              {security.honesty}
            </p>
          </div>
        </MotionReveal>
      </div>
    </SectionShell>
  );
}
