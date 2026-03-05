import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface RoiProofTeaserSectionProps {
  locale: Locale;
}

export function RoiProofTeaserSection({ locale }: RoiProofTeaserSectionProps) {
  const isFr = locale === "fr";
  const frames = isFr
    ? [
        { label: "Baseline", note: "Référence stable" },
        { label: "Recommandé", note: "Option proposée" },
        { label: "Réel", note: "Décision exécutée" },
      ]
    : [
        { label: "Baseline", note: "Stable reference" },
        { label: "Recommended", note: "Proposed option" },
        { label: "Actual", note: "Executed decision" },
      ];

  return (
    <SectionShell id="roi-proof" className="py-16 md:py-20">
      <Kicker>{isFr ? "Decision Log & preuve ROI" : "Decision Log and ROI proof"}</Kicker>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-5xl">
        {isFr
          ? "Une preuve mensuelle exploitable en comité"
          : "Monthly proof ready for committee reviews"}
      </h2>
      <p className="mt-4 max-w-[66ch] text-sm leading-relaxed text-neutral-600 md:text-base">
        {isFr
          ? "Chaque arbitrage est tracé. La lecture baseline/recommandé/réel est consolidée avec hypothèses explicites."
          : "Each trade-off is logged. Baseline/recommended/actual views are consolidated with explicit assumptions."}
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
        {isFr ? "Voir la méthode de preuve" : "See the proof method"}
        <ArrowRight size={14} weight="bold" />
      </Link>
    </SectionShell>
  );
}
