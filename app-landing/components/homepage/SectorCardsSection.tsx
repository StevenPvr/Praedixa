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
      title: "Prévoir où la demande va déborder avant le rush",
      body: "Voir plus tôt quels restaurants, canaux et créneaux vont saturer pour agir avant que le service ne décroche.",
    },
    {
      stat: "Stock critique",
      title: "Repérer les tensions stock avant qu\u2019elles ne cassent le service",
      body: "Identifier quand un produit, un ingrédient ou une famille critique va manquer pour arbitrer plus tôt entre réallocation, simplification d\u2019offre et protection de marge.",
    },
    {
      stat: "Multi-sites",
      title: "Calibrer les effectifs sans surcouvrir le réseau",
      body: "Projeter les besoins d\u2019effectifs restaurant par restaurant pour renforcer là où la demande monte, sans déplacer le problème ailleurs dans le réseau.",
    },
    {
      stat: "Promo + météo",
      title: "Relire les temps forts sur demande, stock et équipes",
      body: "Mesurer l\u2019effet combiné d\u2019une campagne, d\u2019un week-end météo et des absences sur la demande, le stock utile et la couverture.",
    },
  ],
  en: [
    {
      stat: "Lunch / dinner",
      title: "Forecast where demand will overflow before the rush",
      body: "See earlier which restaurants, channels, and dayparts will saturate so teams can act before service quality slips.",
    },
    {
      stat: "Critical inventory",
      title: "Spot inventory pressure before it breaks service",
      body: "Identify when a product, ingredient, or critical family will run short so teams can arbitrate earlier between reallocation, offer simplification, and protected margin.",
    },
    {
      stat: "Multi-site",
      title: "Calibrate staffing without over-covering the network",
      body: "Project staffing needs restaurant by restaurant so teams reinforce where demand rises without moving the problem elsewhere in the network.",
    },
    {
      stat: "Promo + weather",
      title: "Review peak periods across demand, inventory, and teams",
      body: "Measure the combined effect of a campaign, a weather-driven weekend, and absences on demand, useful inventory, and coverage.",
    },
  ],
};

export function SectorCardsSection({ locale }: SectorCardsSectionProps) {
  const cards = networkUseCases[locale];
  const kicker = locale === "fr" ? "Cas d\u2019usage réseau" : "Network use cases";
  const heading =
    locale === "fr"
      ? "Les prévisions qui reviennent chaque semaine dans un réseau QSR."
      : "The forecast loops that come back every week in a QSR network.";
  const body =
    locale === "fr"
      ? "La valeur n\u2019est pas de prédire pour prédire. La valeur est de rendre chaque décision de demande, de stock et d\u2019effectifs plus défendable au siège comme sur le terrain."
      : "The point is not to forecast for forecasting\u2019s sake. The point is to make each demand, inventory, and staffing decision more defensible for HQ and the field.";
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
