interface HeroBentoPreviewProps {
  locale?: "fr" | "en";
}

export function HeroBentoPreview({ locale = "fr" }: HeroBentoPreviewProps) {
  const isFr = locale === "fr";
  const t = isFr
    ? {
        kicker: "Extrait (format illustratif)",
        decisionLog: "Decision Log",
        proofPack: "Dossier de preuve (mensuel)",
        constraints: "Contraintes",
        rituals: "Rituels de gouvernance",
        note: "Format anonymisé — le livrable final est construit sur vos données.",
      }
    : {
        kicker: "Excerpt (illustrative format)",
        decisionLog: "Decision journal",
        proofPack: "Monthly proof pack",
        constraints: "Constraints",
        rituals: "Governance rituals",
        note: "Anonymized format — final deliverables are built on your data.",
      };

  return (
    <div className="w-full">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {t.kicker}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(32,24,4,0.25)]">
          <p className="text-xs font-semibold tracking-[-0.01em] text-ink">
            {t.decisionLog}
          </p>
          <div className="mt-3 divide-y divide-neutral-200/70 text-[12px] text-neutral-600">
            <div className="flex items-start justify-between gap-3 py-2">
              <span className="font-medium text-neutral-700">
                {isFr ? "Décision" : "Decision"}
              </span>
              <span className="text-right">
                {isFr ? "Renfort site B (J+7)" : "Reinforce site B (W+1)"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 py-2">
              <span className="font-medium text-neutral-700">
                {isFr ? "Justification" : "Rationale"}
              </span>
              <span className="text-right">
                {isFr ? "Risque service + pénalités" : "Service risk + penalties"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 py-2">
              <span className="font-medium text-neutral-700">
                {isFr ? "Validation" : "Approval"}
              </span>
              <span className="text-right">
                {isFr ? "Manager validé" : "Manager approved"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(32,24,4,0.25)]">
          <p className="text-xs font-semibold tracking-[-0.01em] text-ink">
            {t.proofPack}
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200/70">
            <div className="grid grid-cols-3 bg-neutral-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              <span>{isFr ? "Option" : "Option"}</span>
              <span className="text-center">{isFr ? "Coût" : "Cost"}</span>
              <span className="text-right">{isFr ? "Service" : "Service"}</span>
            </div>
            {[
              { label: isFr ? "Avant" : "Baseline", tone: "text-neutral-700" },
              { label: isFr ? "Recommandé" : "Recommended", tone: "text-brass-800" },
              { label: isFr ? "Réel" : "Actual", tone: "text-neutral-700" },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 items-center px-3 py-2 text-[12px] text-neutral-600"
              >
                <span className={`font-medium ${row.tone}`}>{row.label}</span>
                <span className="text-center font-mono text-neutral-500">—</span>
                <span className="text-right font-mono text-neutral-500">—</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(32,24,4,0.25)]">
          <p className="text-xs font-semibold tracking-[-0.01em] text-ink">
            {t.constraints}
          </p>
          <ul className="mt-3 list-none space-y-2 p-0 text-[12px] text-neutral-600">
            {[
              isFr ? "Lecture seule (exports/API)" : "Read-only (exports/APIs)",
              isFr ? "Multi-sites, contraintes terrain" : "Multi-site, field constraints",
              isFr ? "Données WFM/ERP/CRM" : "WFM/ERP/CRM inputs",
            ].map((item) => (
              <li key={item} className="m-0 flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(32,24,4,0.25)]">
          <p className="text-xs font-semibold tracking-[-0.01em] text-ink">
            {t.rituals}
          </p>
          <div className="mt-3 space-y-2 text-[12px] text-neutral-600">
            <div className="rounded-xl border border-neutral-200/70 bg-white px-3 py-2">
              {isFr ? "Cadrage 30 min (J+2)" : "30-min framing (D+2)"}
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-white px-3 py-2">
              {isFr ? "Revue mensuelle Ops/Finance" : "Monthly Ops/Finance review"}
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-white px-3 py-2">
              {isFr ? "Preuve mensuelle & arbitrages" : "Monthly proof & trade-offs"}
            </div>
          </div>
        </div>
      </div>

      <p className="px-2 pt-3 text-[11px] leading-relaxed text-neutral-500">
        {t.note}
      </p>
    </div>
  );
}
