import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface HomeFaqCtaSectionProps {
  locale: Locale;
}

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: Record<"fr" | "en", FaqItem[]> = {
  fr: [
    {
      question: "Praedixa remplace-t-il nos outils existants ?",
      answer:
        "Non. Praedixa lit les données utiles dans vos outils existants et renvoie une recommandation priorisée. Ce n'est ni un nouvel ERP, ni une BI de plus, ni un projet IT lourd pour démarrer.",
    },
    {
      question: "Praedixa exécute-t-il à notre place ?",
      answer:
        "Praedixa recommande et prépare la première action. Vos équipes valident puis lancent l'action dans leurs outils ; nous ne promettons pas une automatisation aveugle.",
    },
    {
      question: "Qu'est-ce que Praedixa fait concrètement ?",
      answer:
        "Praedixa détecte les risques business qui menacent la performance et recommande les meilleures décisions pour les réduire sur les effectifs, la demande, les stocks, les approvisionnements et la rétention client. En pratique, nous commençons par le risque le plus coûteux sur votre périmètre.",
    },
    {
      question: "Quand voit-on les premiers résultats ?",
      answer:
        "En 5 jours ouvrés, la preuve sur historique montre si un gain mesurable est réaliste. Ensuite, Praedixa cadre la mise en place pour suivre les décisions lancées et leur impact dans le temps.",
    },
  ],
  en: [
    {
      question: "Does Praedixa replace our existing tools?",
      answer:
        "No. Praedixa reads the useful data in your current tools and returns a prioritized recommendation. It is not a new ERP, another BI layer, or a heavy IT project to get started.",
    },
    {
      question: "Does Praedixa execute on our behalf?",
      answer:
        "Praedixa recommends and prepares the first action. Your teams validate it and launch it in their tools; this is not blind automation.",
    },
    {
      question: "What does Praedixa actually do?",
      answer:
        "Praedixa detects the business risks threatening performance and recommends the best decisions to reduce them across staffing, demand, inventory, supply, and customer retention. In practice, we start with the most costly risk in your perimeter.",
    },
    {
      question: "When do we see the first results?",
      answer:
        "Within 5 business days, the historical proof shows whether a measurable gain is realistic. Deployment then tracks the decisions launched and their impact over time.",
    },
  ],
};

export function HomeFaqCtaSection({ locale }: HomeFaqCtaSectionProps) {
  const isFr = locale === "fr";
  const items = faqs[locale];

  const proofHref = `${getLocalizedPath(locale, "contact")}?intent=proof`;
  const deploymentHref = getLocalizedPath(locale, "deployment");

  return (
    <SectionShell id="home-faq-cta">
      <Kicker>{isFr ? "Questions fréquentes" : "FAQ"}</Kicker>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-[1.06] tracking-tight text-ink md:text-4xl">
        {isFr
          ? "Les questions avant de démarrer"
          : "What decision-makers ask before getting started"}
      </h2>
      <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-neutral-500">
        {isFr
          ? "Des réponses simples sur la preuve sur historique, l'existant, la mise en place et le ROI."
          : "COO, CFO, multi-site managers — the most common objections, answered plainly."}
      </p>

      {/* Accordion — <details>/<summary>, no JS, Server Component safe */}
      <div className="mt-8 space-y-2">
        {items.map((faq, i) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-neutral-200/80 bg-white open:border-neutral-300/70"
            {...(i === 2 ? { open: true } : {})}
          >
            <summary className="flex cursor-pointer select-none list-none items-start justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold leading-snug tracking-tight text-ink">
                {faq.question}
              </span>
              <span
                aria-hidden="true"
                className="mt-[1px] shrink-0 text-base font-light leading-none text-neutral-400 transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="border-t border-neutral-100 px-5 pb-5 pt-3.5 text-sm leading-relaxed text-neutral-600">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={proofHref}
          className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:scale-[0.98]"
        >
          {isFr
            ? "Demander la preuve sur historique"
            : "Request the historical proof"}
          <ArrowRight size={14} weight="bold" />
        </Link>
        <Link
          href={deploymentHref}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50 active:scale-[0.98]"
        >
          {isFr ? "Parler du déploiement" : "Discuss deployment"}
        </Link>
      </div>
    </SectionShell>
  );
}
