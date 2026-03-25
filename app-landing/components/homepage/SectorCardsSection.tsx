import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "../../lib/i18n/config";
import { buildContactIntentHref } from "../../lib/i18n/config";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";

interface SectorCardsSectionProps {
  locale: Locale;
}

interface NetworkUseCaseCard {
  stat: string;
  title: string;
  body: string;
}

const networkUseCases: Record<Locale, NetworkUseCaseCard[]> = {
  fr: [
    {
      stat: "Midi / soir",
      title: "Arbitrer le staffing avant les rushs service par service",
      body: "Décider plus tôt où renforcer la salle, le drive ou la cuisine pour éviter que le service ne décroche au pire moment.",
    },
    {
      stat: "Drive + delivery",
      title: "Choisir quand ralentir un canal plutôt que brûler la marge",
      body: "Comparer renfort, throttling delivery ou simplification de promesse de service quand plusieurs canaux se tendent en même temps.",
    },
    {
      stat: "Multi-sites",
      title: "Réallouer intelligemment entre restaurants proches",
      body: "Voir quels restaurants peuvent absorber un manque voisin sans déplacer le problème ailleurs dans le réseau.",
    },
    {
      stat: "Promo + météo",
      title: "Relire les temps forts avant qu\u2019ils n\u2019abîment vos équipes",
      body: "Mesurer l\u2019effet combiné d\u2019une campagne, d\u2019un week-end météo et des absences sur la couverture et la marge.",
    },
  ],
  en: [
    {
      stat: "Lunch / dinner",
      title: "Arbitrate staffing before the rush, service by service",
      body: "Decide earlier where to reinforce front counter, drive-through, or kitchen before service quality starts slipping.",
    },
    {
      stat: "Drive + delivery",
      title: "Choose when to slow one channel instead of burning margin",
      body: "Compare reinforcement, delivery throttling, or service simplification when several channels tighten at once.",
    },
    {
      stat: "Multi-site",
      title: "Reallocate intelligently across nearby restaurants",
      body: "See which restaurants can absorb a nearby gap without moving the problem elsewhere in the network.",
    },
    {
      stat: "Promo + weather",
      title: "Review peak periods before they wear down your teams",
      body: "Measure the combined effect of a campaign, a weather-driven weekend, and absences on coverage and margin.",
    },
  ],
};

export function SectorCardsSection({ locale }: SectorCardsSectionProps) {
  const cards = networkUseCases[locale];
  const kicker = locale === "fr" ? "Cas d\u2019usage réseau" : "Network use cases";
  const heading =
    locale === "fr"
      ? "Les arbitrages qui reviennent chaque semaine dans un réseau QSR."
      : "The trade-offs that come back every week in a QSR network.";
  const body =
    locale === "fr"
      ? "La valeur n\u2019est pas de prédire pour prédire. La valeur est de rendre chaque arbitrage service / staffing / marge plus défendable au siège comme sur le terrain."
      : "The point is not to predict for prediction\u2019s sake. The point is to make each service / staffing / margin trade-off more defensible for HQ and the field.";
  const contactHref = buildContactIntentHref(locale, "deployment");

  return (
    <SectionShellV2 id="secteurs">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="max-w-[34rem]">
          <Kicker>{kicker}</Kicker>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-700">{body}</p>
          <Link
            href={contactHref}
            className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:text-proof-500"
          >
            {locale === "fr"
              ? "Cadrer un premier cas réseau"
              : "Scope a first network case"}
            <ArrowRight
              size={15}
              weight="bold"
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {cards.map((card, index) => (
            <article
              key={card.title}
              className={`light-card rounded-card border border-v2-border-200 bg-surface-0 p-6 transition-transform duration-300 hover:-translate-y-1 ${
                index === 0 ? "md:row-span-2 md:min-h-[21rem]" : ""
              }`}
            >
              <p className="font-mono text-sm text-proof-500">{card.stat}</p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink-950">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionShellV2>
  );
}
