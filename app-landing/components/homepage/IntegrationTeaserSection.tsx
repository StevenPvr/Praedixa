import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface IntegrationTeaserSectionProps {
  locale: Locale;
}

export function IntegrationTeaserSection({ locale }: IntegrationTeaserSectionProps) {
  const isFr = locale === "fr";
  const points = isFr
    ? [
        "Connexion légère via exports et API existants",
        "Lecture seule pour démarrer",
        "RH, finance, opérations et supply chain dans une même base",
        "Accès contrôlés, chiffrement et journalisation",
        "Entreprise française, incubée à Euratechnologies",
        "Données hébergées en France sur Scaleway",
      ]
    : [
        "Read-only start through exports/APIs",
        "Aggregated team/site data",
        "RBAC and encryption in transit/at rest",
        "Overlay above existing tooling",
      ];

  return (
    <SectionShell id="integration-data" className="bg-[linear-gradient(180deg,var(--warm-bg-muted)_0%,var(--warm-bg-panel)_100%)]">
      <Kicker>{isFr ? "Intégration & données" : "Integration and data"}</Kicker>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-5xl">
        {isFr
          ? "Réunir vos données sans remplacer vos outils."
          : "Your data is already there. Praedixa brings it together."}
      </h2>
      <p className="mt-4 max-w-[66ch] text-sm leading-relaxed text-neutral-600 md:text-base">
        {isFr
          ? "Praedixa part de l'existant, en lecture seule, pour créer une base commune entre RH, finance, opérations et supply chain. Les données restent hébergées en France sur Scaleway, avec un ancrage français assumé."
          : "Praedixa integrates in read-only mode with explicit guardrails from day one."}
      </p>

      <ul className="mt-7 grid list-none gap-3 p-0 md:grid-cols-2">
        {points.map((point) => (
          <li
            key={point}
            className="m-0 rounded-2xl border border-neutral-200/80 bg-white/95 px-4 py-3 text-sm text-neutral-700"
          >
            {point}
          </li>
        ))}
      </ul>

      <Link
        href={getLocalizedPath(locale, "integrationData")}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50"
      >
        {isFr ? "Voir les sources de données compatibles" : "View integration details"}
        <ArrowRight size={14} weight="bold" />
      </Link>
    </SectionShell>
  );
}
