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
  const kicker = locale === "fr" ? "Le constat" : "The reality";
  const heading =
    locale === "fr"
      ? "Vous avez les données. Il vous manque un cadre pour décider vite."
      : "You have the data. You need a framework to decide fast.";

  return (
    <SectionShellV2 id="probleme">
      <ProblemBlockHeader kicker={kicker} heading={heading} />
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <ProblemCard key={card.number} card={card} />
        ))}
      </div>
    </SectionShellV2>
  );
}

function ProblemBlockHeader({
  kicker,
  heading,
}: {
  kicker: string;
  heading: string;
}) {
  return (
    <div className="mx-auto max-w-text">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 md:text-4xl">
        {heading}
      </h2>
    </div>
  );
}

function ProblemCard({
  card,
}: {
  card: ReturnType<typeof getValuePropContent>["problemCards"][number];
}) {
  return (
    <article className="light-card group relative rounded-card border border-v2-border-200 bg-surface-0 p-6 transition-transform duration-300 hover:-translate-y-1.5">
      <span className="font-mono text-4xl font-medium leading-none text-proof-500">
        {card.number}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink-950">
        {card.title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-700">
        {card.consequence}
      </p>
      <div
        className="absolute bottom-0 left-6 right-6 h-0.5 origin-left scale-x-0 bg-signal-500 transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </article>
  );
}
