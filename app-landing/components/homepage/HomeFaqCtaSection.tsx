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
        "Non. Praedixa réunit la donnée utile au-dessus de l'existant (ERP, planning, BI, Excel, autres outils), sans remplacement ni projet IT lourd pour démarrer.",
    },
    {
      question: "Faut-il comprendre la data science pour utiliser Praedixa ?",
      answer:
        "Non. La complexité reste chez nous. Côté client, vous voyez l'essentiel: les données réunies, les besoins qui remontent, les priorités et l'impact business.",
    },
    {
      question: "Qu'est-ce que Praedixa fait concrètement ?",
      answer:
        "Praedixa est la plateforme française de DecisionOps. Elle se branche sur vos outils existants pour transformer des arbitrages récurrents en décisions calculées, exécutées et auditables.",
    },
    {
      question: "Quand voit-on les premiers résultats ?",
      answer:
        "Une première lecture utile arrive rapidement. Ensuite, Praedixa aide à prioriser les premières actions, à les déclencher proprement et à suivre le ROI dans le temps.",
    },
  ],
  en: [
    {
      question: "Does Praedixa replace our existing tools?",
      answer:
        "No. It is a DecisionOps layer on top of your existing stack (ERP, scheduling, BI, Excel). No replacement, no heavy IT project to get started.",
    },
    {
      question: "Who keeps final decision authority?",
      answer:
        "Managers always do. Praedixa recommends and assists execution. Final sign-off stays with the manager and is logged in the Decision Journal.",
    },
    {
      question: "How is ROI proven?",
      answer:
        "Through a monthly Decision Journal with baseline / recommended / actual comparison and explicit assumptions. Audit-ready for steering or Finance reviews.",
    },
    {
      question: "When do we see the first results?",
      answer:
        "First proof milestone at week 8. Consolidated multi-site proof at month 3. The free historical audit sets the baseline before launch.",
    },
  ],
};

export function HomeFaqCtaSection({ locale }: HomeFaqCtaSectionProps) {
  const isFr = locale === "fr";
  const items = faqs[locale];

  const auditHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const pilotHref = getLocalizedPath(locale, "pilot");

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
          ? "Des réponses simples sur l'intégration, l'existant, le délai de mise en route et le ROI."
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
          href={auditHref}
          className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:scale-[0.98]"
        >
          {isFr
            ? "Obtenir le diagnostic ROI gratuit"
            : "Get the free historical audit"}
          <ArrowRight size={14} weight="bold" />
        </Link>
        <Link
          href={pilotHref}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50 active:scale-[0.98]"
        >
          {isFr ? "Demander un pilote ROI" : "Apply for the pilot"}
        </Link>
      </div>
    </SectionShell>
  );
}
