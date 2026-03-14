import Link from "next/link";

import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getKnowledgePage } from "../../lib/content/knowledge-pages";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface PillarLinksSectionProps {
  locale: Locale;
  dict: Dictionary;
}

function getPageLinks(locale: Locale, dict: Dictionary) {
  return [
    {
      href: getLocalizedPath(locale, "productMethod"),
      title: getKnowledgePage(locale, "productMethod").title,
      description: getKnowledgePage(locale, "productMethod").description,
    },
    {
      href: getLocalizedPath(locale, "howItWorksPage"),
      title: getKnowledgePage(locale, "howItWorksPage").title,
      description: getKnowledgePage(locale, "howItWorksPage").description,
    },
    {
      href: getLocalizedPath(locale, "decisionLogProof"),
      title: getKnowledgePage(locale, "decisionLogProof").title,
      description: getKnowledgePage(locale, "decisionLogProof").description,
    },
    {
      href: getLocalizedPath(locale, "integrationData"),
      title: getKnowledgePage(locale, "integrationData").title,
      description: getKnowledgePage(locale, "integrationData").description,
    },
    {
      href: getLocalizedPath(locale, "services"),
      title: dict.nav.services,
      description:
        locale === "fr"
          ? "Une offre publique: premier périmètre de décision, preuve sur historique si nécessaire."
          : "One public offer: first decision scope, with historical proof if needed.",
    },
    {
      href: getLocalizedPath(locale, "about"),
      title: getKnowledgePage(locale, "about").title,
      description: getKnowledgePage(locale, "about").description,
    },
  ];
}

function getSectionCopy(locale: Locale) {
  return locale === "fr"
    ? {
        kicker: "Pages clés",
        heading: "Les pages à parcourir pour comprendre Praedixa rapidement.",
        body: "Chaque page répond à une intention claire: comprendre la méthode, voir les cas d’usage, cadrer un premier périmètre ou vérifier la crédibilité du dispositif.",
        cta: "Ouvrir la page",
      }
    : {
        kicker: "Key pages",
        heading: "The pages to browse to understand Praedixa quickly.",
        body: "Each page answers one clear intent: understand the method, see use cases, frame a first scope, or verify the credibility of the setup.",
        cta: "Open page",
      };
}

export function PillarLinksSection({ locale, dict }: PillarLinksSectionProps) {
  const pageLinks = getPageLinks(locale, dict);
  const copy = getSectionCopy(locale);

  return (
    <SectionShell
      id="pillar-pages"
      className="bg-[linear-gradient(180deg,var(--warm-bg-panel)_0%,var(--warm-bg-muted)_100%)]"
    >
      <div className="max-w-6xl">
        <Kicker>{copy.kicker}</Kicker>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-5xl">
          {copy.heading}
        </h2>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
          {copy.body}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-neutral-200/80 bg-white/90 p-5 text-left no-underline shadow-[0_18px_40px_-34px_rgba(15,23,42,0.4)] transition-all duration-200 hover:-translate-y-[1px] hover:border-neutral-300 hover:bg-white"
            >
              <p className="text-base font-semibold tracking-tight text-ink">
                {link.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {link.description}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-brass-700">
                {copy.cta}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
