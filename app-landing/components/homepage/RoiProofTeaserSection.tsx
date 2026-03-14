import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface RoiProofTeaserSectionProps {
  locale: Locale;
}

function getRoiProofFrames(locale: Locale) {
  if (locale === "fr") {
    return [
      { label: "Situation", note: "Pic de charge sur 3 sites" },
      { label: "Options", note: "HS, intérim, réallocation, report" },
      { label: "Impact relu", note: "Service protégé, surcoût évité" },
    ];
  }

  return [
    { label: "Situation", note: "Demand spike across 3 sites" },
    { label: "Options", note: "Overtime, temp labor, reallocation, delay" },
    {
      label: "Impact review",
      note: "Service protected, avoidable cost reduced",
    },
  ];
}

export function RoiProofTeaserSection({ locale }: RoiProofTeaserSectionProps) {
  const isFr = locale === "fr";
  const frames = getRoiProofFrames(locale);

  return (
    <SectionShell id="roi-proof">
      <Kicker>{isFr ? "Preuve publique" : "Public proof"}</Kicker>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-5xl">
        {isFr
          ? "Voir un arbitrage complet avant de nous parler."
          : "See one full trade-off before you talk to us."}
      </h2>
      <p className="mt-4 max-w-[66ch] text-sm leading-relaxed text-neutral-600 md:text-base">
        {isFr
          ? "Nous montrons un exemple concret: situation de départ, options comparées, recommandation, décision retenue et impact relu. Pas seulement le protocole de la preuve."
          : "We show a concrete example: starting point, compared options, recommendation, chosen decision, and impact review. Not just the proof protocol."}
      </p>

      <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        {frames.map((frame) => (
          <div
            key={frame.label}
            className="rounded-2xl border border-neutral-200/80 bg-white/95 px-4 py-4 shadow-[0_18px_34px_-34px_rgba(15,23,42,0.55)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-brass-700">
              {frame.label}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{frame.note}</p>
          </div>
        ))}
      </div>

      <Link
        href={getLocalizedPath(locale, "decisionLogProof")}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50"
      >
        {isFr ? "Voir un exemple concret" : "See a concrete example"}
        <ArrowRight size={14} weight="bold" />
      </Link>
    </SectionShell>
  );
}
