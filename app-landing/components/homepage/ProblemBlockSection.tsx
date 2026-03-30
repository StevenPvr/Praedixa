import type { Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShellV2 } from "../shared/SectionShellV2";
import { Kicker } from "../shared/Kicker";

interface ProblemBlockSectionProps {
  locale: Locale;
}

export function ProblemBlockSection({ locale }: ProblemBlockSectionProps) {
  const vp = getValuePropContent(locale);
  const cards = vp.problemCards;
  const kicker =
    locale === "fr" ? "Là où le rush vous surprend" : "Where the rush catches teams late";
  const heading =
    locale === "fr"
      ? "Vos restaurants n\u2019ont pas un problème de données. Ils ont un problème d\u2019anticipation réseau."
      : "Your restaurants do not have a data problem. They have a network anticipation problem.";
  const body =
    locale === "fr"
      ? "Quand le rush accélère, le vrai sujet n\u2019est ni le dashboard ni le planning seuls. C\u2019est de prévoir plus tôt la demande, le stock et les effectifs pour décider où agir avant que service et marge ne décrochent."
      : "When the rush accelerates, the real issue is not another dashboard or schedule on its own. It is forecasting demand, inventory, and staffing earlier so teams can act before service and margin slip.";
  const [firstCard, ...otherCards] = cards;

  return (
    <SectionShellV2 id="probleme">
      <ProblemBlockHeader kicker={kicker} heading={heading} body={body} />
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-stretch">
        {firstCard ? <ProblemCard card={firstCard} featured /> : null}
        <div className="grid gap-6">
          {otherCards.map((card) => (
            <ProblemCard key={card.number} card={card} />
          ))}
        </div>
      </div>
    </SectionShellV2>
  );
}

function ProblemBlockHeader({
  kicker,
  heading,
  body,
}: {
  kicker: string;
  heading: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-text">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
        {heading}
      </h2>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-700">
        {body}
      </p>
    </div>
  );
}

function ProblemCard({
  card,
  featured = false,
}: {
  card: ReturnType<typeof getValuePropContent>["problemCards"][number];
  featured?: boolean;
}) {
  return (
    <article
      className={`light-card group relative rounded-card border border-v2-border-200 bg-surface-0 p-6 transition-transform duration-300 hover:-translate-y-1.5 ${
        featured ? "min-h-[20rem] md:p-8" : ""
      }`}
    >
      <span className="font-mono text-4xl font-medium leading-none text-proof-500 md:text-5xl">
        {card.number}
      </span>
      <h3
        className={`mt-4 font-semibold tracking-tight text-ink-950 ${
          featured ? "text-2xl md:text-[1.9rem]" : "text-lg"
        }`}
      >
        {card.title}
      </h3>
      <p
        className={`mt-3 leading-relaxed text-ink-700 ${
          featured ? "max-w-[34ch] text-base" : "text-sm"
        }`}
      >
        {card.consequence}
      </p>
      <div
        className="absolute bottom-0 left-6 right-6 h-0.5 origin-left scale-x-0 bg-signal-500 transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </article>
  );
}
