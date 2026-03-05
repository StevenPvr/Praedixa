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
        "Non. C'est une couche d'aide à la décision au-dessus de l'existant (ERP, planning, BI, Excel). Aucun remplacement, aucun projet IT lourd pour démarrer.",
    },
    {
      question: "Quelles données faut-il pour démarrer ?",
      answer:
        "Vos exports existants (CSV/Excel/API) au niveau agrégé site/équipe — demande, capacité, absences. Lecture seule. Le premier mois d'audit historique est offert sans accès direct à vos systèmes.",
    },
    {
      question: "Qui prend la décision finale ?",
      answer:
        "Toujours le manager. Praedixa recommande et enclenche l'action assistée — OT, intérim, ajustement de service. La validation reste managériale et est tracée dans le Decision Log.",
    },
    {
      question: "Comment est prouvé le ROI ?",
      answer:
        "Decision Log mensuel avec comparatif avant / recommandé / réel et hypothèses explicites. Le pack est audit-ready et exploitable directement en comité de direction ou en revue Finance.",
    },
    {
      question: "Et si la prévision est inexacte ?",
      answer:
        "L'écart entre recommandé et réel est mesuré et documenté à chaque cycle. Le contrefactuel fait partie intégrante de la preuve — y compris quand la prévision était imparfaite. C'est la différence avec un dashboard sans trace.",
    },
    {
      question: "Quand voit-on les premiers résultats ?",
      answer:
        "Premier jalon de preuve à la semaine 8 (décisions tracées, écarts mesurés). Preuve consolidée multi-sites au mois 3. L'audit historique offert positionne le point de départ avant le lancement.",
    },
    {
      question: "Nos données sont hébergées où ? C'est conforme RGPD ?",
      answer:
        "Hébergement en France (Scaleway Paris). Praedixa traite des données agrégées site/équipe, pas de données individuelles. IA Act & RGPD by design, sans prédiction individuelle.",
    },
    {
      question: "Quel engagement après le pilote ?",
      answer:
        "Aucun engagement automatique. Vous décidez de la suite en vous appuyant sur la preuve produite pendant les 3 mois. Pas d'abonnement imposé à l'issue du pilote.",
    },
  ],
  en: [
    {
      question: "Does Praedixa replace our existing tools?",
      answer:
        "No. It's a decision layer on top of your existing stack (ERP, scheduling, BI, Excel). No replacement, no heavy IT project to get started.",
    },
    {
      question: "What data is needed to start?",
      answer:
        "Your existing exports (CSV/Excel/API) at aggregated site/team level — demand, capacity, absences. Read-only. The first month of historical audit is offered without direct access to your systems.",
    },
    {
      question: "Who keeps final decision authority?",
      answer:
        "Managers always do. Praedixa recommends and assists execution — overtime, temp staffing, service adjustments. Final sign-off stays with the manager and is logged in the Decision Journal.",
    },
    {
      question: "How is ROI proven?",
      answer:
        "Monthly Decision Journal with a before / recommended / actual comparison and explicit assumptions. The package is audit-ready and can be brought directly to steering or Finance reviews.",
    },
    {
      question: "What if a forecast turns out to be wrong?",
      answer:
        "The gap between recommended and actual is measured and logged every cycle. The counterfactual is part of the proof — including when the forecast was imperfect. That's what makes it different from a dashboard with no trace.",
    },
    {
      question: "When do we see the first results?",
      answer:
        "First proof milestone at week 8 (decisions logged, variances measured). Consolidated multi-site proof at month 3. The free historical audit sets the baseline before launch.",
    },
    {
      question: "Where is our data hosted? Is it GDPR-compliant?",
      answer:
        "Hosted in France (Scaleway Paris). Praedixa processes aggregated site/team data, not individual data. AI Act & GDPR by design, no individual prediction.",
    },
    {
      question: "What is the commitment after the pilot?",
      answer:
        "None automatically. You decide what comes next based on the proof produced during the 3-month pilot. No subscription is imposed at the end.",
    },
  ],
};

export function HomeFaqCtaSection({ locale }: HomeFaqCtaSectionProps) {
  const isFr = locale === "fr";
  const items = faqs[locale];

  const auditHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const pilotHref = getLocalizedPath(locale, "pilot");

  return (
    <SectionShell id="home-faq-cta" className="py-16 md:py-24">
      <Kicker>{isFr ? "Questions fréquentes" : "FAQ"}</Kicker>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-[1.06] tracking-tight text-ink md:text-4xl">
        {isFr
          ? "Ce que nos interlocuteurs demandent avant de démarrer"
          : "What decision-makers ask before getting started"}
      </h2>
      <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-neutral-500">
        {isFr
          ? "COO, DAF, responsables multi-sites — les objections les plus fréquentes, répondues sans détour."
          : "COO, CFO, multi-site managers — the most common objections, answered plainly."}
      </p>

      {/* Accordion — <details>/<summary>, no JS, Server Component safe */}
      <div className="mt-8 space-y-2">
        {items.map((faq, i) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-neutral-200/80 bg-white open:border-neutral-300/70"
            {...(i === 3 ? { open: true } : {})}
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
          {isFr ? "Obtenir l'audit historique (gratuit)" : "Get the free historical audit"}
          <ArrowRight size={14} weight="bold" />
        </Link>
        <Link
          href={pilotHref}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-200 hover:bg-neutral-50 active:scale-[0.98]"
        >
          {isFr ? "Candidater au pilote" : "Apply for the pilot"}
        </Link>
      </div>
    </SectionShell>
  );
}
