"use client";

import { motion } from "framer-motion";
import { cn } from "../ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";

interface DeliverablesSectionProps {
  className?: string;
}

const CHECKLIST_ITEMS = [
  "Prévisions de sous-couverture site par site",
  "Coût évitable estimé en euros",
  "3 actions prioritaires avec ROI",
  "Hypothèses explicites et auditables",
  "Livré en 48h, sans intégration IT",
] as const;

const TRUST_SIGNALS = [
  {
    title: "Crédibilité fondateur",
    text: "Expertise en data science, séries temporelles et économétrie appliquées aux opérations.",
  },
  {
    title: "Transparence méthodologique",
    text: "Chaque chiffre est accompagné de ses hypothèses. Rien n'est une boîte noire.",
  },
  {
    title: "RGPD by design",
    text: "Données agrégées équipe/site uniquement. Hébergement France. Pas de données individuelles.",
  },
  {
    title: "Programme pilote",
    text: "Diagnostic gratuit + tarif préférentiel 1 an + support premium 1 an. Places limitées.",
  },
] as const;

export function DeliverablesSection({ className }: DeliverablesSectionProps) {
  return (
    <motion.section
      id="deliverables"
      className={cn("bg-cream py-24 md:py-32", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div className="mb-14 max-w-3xl" variants={staggerItem}>
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-amber-600">
            Les livrables
          </span>
          <h2 className="font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl lg:text-[2.75rem]">
            Ce que vous recevez
          </h2>
        </motion.div>

        {/* Part A header */}
        <motion.h3
          className="mb-8 text-xl font-bold text-charcoal"
          variants={staggerItem}
        >
          Diagnostic 48h : votre premier livrable
        </motion.h3>

        {/* Two-column layout: mockup + checklist */}
        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
          {/* Left: PDF mockup with real text */}
          <motion.div
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft"
            variants={staggerItem}
          >
            <div className="space-y-5">
              {/* Header bar */}
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/20">
                  <span className="text-sm font-bold text-amber-600">P</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal">
                    Rapport diagnostic
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Praedixa · généré le 03/02/2026
                  </p>
                </div>
              </div>

              {/* Section: Carte de sous-couverture */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Taux de couverture par site
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { h: 75, label: "Lyon" },
                      { h: 45, label: "Lille" },
                      { h: 90, label: "Paris" },
                      { h: 30, label: "Nantes" },
                      { h: 60, label: "Bdx" },
                      { h: 85, label: "Toul." },
                      { h: 40, label: "Mars." },
                      { h: 70, label: "Strasb." },
                    ] as const
                  ).map((site) => (
                    <div
                      key={site.label}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.round(site.h * 0.5)}px`,
                          backgroundColor:
                            site.h < 50
                              ? "rgb(251, 191, 36)"
                              : "rgb(229, 231, 235)",
                        }}
                      />
                      <span className="text-[9px] text-neutral-400">
                        {site.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Coût évitable */}
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="mb-0.5 text-[11px] font-medium text-amber-700/70">
                  Coût évitable estimé
                </p>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-amber-700">
                    47 000 €
                  </span>
                  <span className="text-[11px] text-amber-600/60">/mois</span>
                </p>
              </div>

              {/* Section: Actions prioritaires */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  3 actions prioritaires
                </p>
                {(
                  [
                    "Renforcer Lille S+3 (intérim ciblé)",
                    "Réorganiser Nantes S+5 (rotation)",
                    "Former 2 polyvalents Marseille",
                  ] as const
                ).map((action, i) => (
                  <div key={action} className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      {i + 1}
                    </div>
                    <span className="text-xs text-neutral-600">{action}</span>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <p className="text-center text-[10px] italic text-neutral-400">
                Aperçu schématique — données fictives
              </p>
            </div>
          </motion.div>

          {/* Right: Checklist */}
          <motion.div variants={staggerItem}>
            <ul className="space-y-5" role="list">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-base leading-relaxed text-charcoal">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Part B: Pilot program deliverables */}
        <motion.div className="mt-20" variants={staggerItem}>
          <h3 className="mb-8 text-xl font-bold text-charcoal">
            Programme pilote : le pilotage continu
          </h3>
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            {/* Left: Dashboard mockup SVG */}
            <div className="rounded-2xl border border-neutral-200 bg-charcoal p-6 shadow-soft">
              <svg
                viewBox="0 0 400 280"
                fill="none"
                className="h-auto w-full"
                role="img"
                aria-label="Aperçu du tableau de bord de pilotage continu"
              >
                {/* Header */}
                <text
                  x="16"
                  y="24"
                  fill="#f59e0b"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  Tableau de bord prédictif
                </text>
                {/* Mini line chart */}
                <rect
                  x="16"
                  y="36"
                  width="180"
                  height="100"
                  rx="8"
                  fill="#1a1a1a"
                />
                <text
                  x="26"
                  y="52"
                  fill="#737373"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Couverture J+14
                </text>
                <polyline
                  points="30,110 60,95 90,100 120,80 150,85 180,70"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  fill="none"
                />
                <polyline
                  points="30,110 60,105 90,108 120,100 150,102 180,95"
                  stroke="#737373"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  fill="none"
                  opacity="0.5"
                />
                {/* 3 Notification cards */}
                <rect
                  x="210"
                  y="36"
                  width="174"
                  height="28"
                  rx="6"
                  fill="#1a1a1a"
                />
                <circle cx="226" cy="50" r="4" fill="#f59e0b" />
                <text
                  x="236"
                  y="53"
                  fill="#d4d4d4"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Lille S12 — 3 options
                </text>
                <rect
                  x="210"
                  y="70"
                  width="174"
                  height="28"
                  rx="6"
                  fill="#1a1a1a"
                />
                <circle cx="226" cy="84" r="4" fill="#f59e0b" opacity="0.6" />
                <text
                  x="236"
                  y="87"
                  fill="#d4d4d4"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Nantes S12 — 2 options
                </text>
                <rect
                  x="210"
                  y="104"
                  width="174"
                  height="28"
                  rx="6"
                  fill="#1a1a1a"
                />
                <circle cx="226" cy="118" r="4" fill="#22c55e" />
                <text
                  x="236"
                  y="121"
                  fill="#d4d4d4"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Lyon S12 — couvert
                </text>
                {/* KPI bar */}
                <rect
                  x="16"
                  y="150"
                  width="368"
                  height="50"
                  rx="8"
                  fill="#1a1a1a"
                />
                <text
                  x="36"
                  y="172"
                  fill="#737373"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Gains réalisés
                </text>
                <text
                  x="36"
                  y="188"
                  fill="#f59e0b"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  +47 000 €
                </text>
                <text
                  x="160"
                  y="172"
                  fill="#737373"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Précision
                </text>
                <text
                  x="160"
                  y="188"
                  fill="#f59e0b"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  91%
                </text>
                <text
                  x="270"
                  y="172"
                  fill="#737373"
                  fontSize="8"
                  fontFamily="system-ui"
                >
                  Sites couverts
                </text>
                <text
                  x="270"
                  y="188"
                  fill="#22c55e"
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="system-ui"
                >
                  6/7
                </text>
                {/* Disclaimer */}
                <text
                  x="200"
                  y="270"
                  textAnchor="middle"
                  fill="#737373"
                  fontSize="8"
                  fontStyle="italic"
                  fontFamily="system-ui"
                >
                  Aperçu schématique — données fictives
                </text>
              </svg>
            </div>

            {/* Right: Ongoing checklist */}
            <ul className="space-y-5" role="list">
              {[
                "Tableau de bord prédictif multi-horizon",
                "Notifications informatives chiffrées",
                "Suivi KPIs économiques continus",
                "Rapports auditables CODIR/DAF",
                "Amélioration continue qualité données",
                "Support premium dédié",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-base leading-relaxed text-charcoal">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerItem}
        >
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal.title} className="text-center">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-charcoal">
                {signal.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                {signal.text}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
