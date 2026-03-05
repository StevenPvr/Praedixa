"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface IcpCarouselSectionProps {
  locale: Locale;
}

interface IcpCard {
  title: string;
  benefit: string;
  bullets: string[];
  href: string;
}

export function IcpCarouselSection({ locale }: IcpCarouselSectionProps) {
  const railRef = useRef<HTMLUListElement | null>(null);
  const isFr = locale === "fr";

  const cards = useMemo<IcpCard[]>(
    () => [
      {
        title: isFr ? "Praedixa pour l'automobile" : "Praedixa for automotive",
        benefit: isFr
          ? "Anticiper les tensions opérationnelles sur des opérations industrielles multi-sites."
          : "Anticipate operational tension in multi-site automotive operations.",
        bullets: isFr
          ? [
              "Variabilité charge par équipe et par site",
              "Arbitrage renfort inter-sites",
              "Continuité service vs coût de renfort",
            ]
          : [
              "Workload variability by team and site",
              "Cross-site reinforcement arbitration",
              "Service continuity vs reinforcement cost",
            ],
        href: getLocalizedPath(locale, "icpAutomotive"),
      },
      {
        title: isFr
          ? "Praedixa pour les concessions et ateliers auto"
          : "Praedixa for auto dealerships and workshops",
        benefit: isFr
          ? "Sécuriser la promesse atelier sans dérive de coût."
          : "Protect workshop commitments without cost drift.",
        bullets: isFr
          ? [
              "Pics de rendez-vous atelier",
              "Absences sur compétences rares",
              "Choix OT/intérim/réaffectation",
            ]
          : [
              "Workshop booking peaks",
              "Critical-skill absences",
              "Overtime/interim/reassignment decisions",
            ],
        href: getLocalizedPath(locale, "icpDealership"),
      },
      {
        title: isFr ? "Praedixa pour la logistique" : "Praedixa for logistics",
        benefit: isFr
          ? "Décider plus tôt avant rupture de service."
          : "Decide earlier before service disruptions.",
        bullets: isFr
          ? [
              "Pics inbound/outbound",
              "Absentéisme et aléas de capacité",
              "Priorisation inter-sites",
            ]
          : [
              "Inbound/outbound peaks",
              "Absenteeism and capacity disruptions",
              "Cross-site prioritization",
            ],
        href: getLocalizedPath(locale, "bofuLogistics"),
      },
      {
        title: isFr ? "Praedixa pour le retail" : "Praedixa for retail",
        benefit: isFr
          ? "Aligner service, coût et risque à l'échelle réseau."
          : "Align service, cost, and risk at network scale.",
        bullets: isFr
          ? [
              "Saisonnalité et pics magasin",
              "Écarts capacité/charge",
              "Redéploiement entre sites",
            ]
          : [
              "Seasonality and in-store peaks",
              "Capacity vs workload gaps",
              "Cross-site redeployment",
            ],
        href: getLocalizedPath(locale, "bofuRetail"),
      },
      {
        title: isFr
          ? "Praedixa pour les réseaux multi-franchisés"
          : "Praedixa for multi-franchise networks",
        benefit: isFr
          ? "Uniformiser les arbitrages coût/service/risque dans un réseau multi-sites."
          : "Standardize cost/service/risk trade-offs across multi-site networks.",
        bullets: isFr
          ? [
              "Pratiques hétérogènes entre sites",
              "Pics localisés",
              "Rituel mensuel Ops/Finance réseau",
            ]
          : [
              "Heterogeneous site practices",
              "Localized demand peaks",
              "Monthly network-wide Ops/Finance routine",
            ],
        href: getLocalizedPath(locale, "bofuQsr"),
      },
    ],
    [isFr, locale],
  );

  const scrollCards = (direction: "prev" | "next") => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("li");
    const cardWidth = card ? card.getBoundingClientRect().width : 320;
    const gap = 20;
    const delta = (cardWidth + gap) * (direction === "next" ? 1 : -1);
    rail.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <SectionShell id="icp-carousel" className="bg-[linear-gradient(180deg,#fbfbfa_0%,#f4f2ee_100%)] py-14 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Kicker>{isFr ? "Solutions / ICP" : "Solutions / ICP"}</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {isFr
              ? "Praedixa pour votre contexte opérationnel"
              : "Praedixa for your operational context"}
          </h2>
          <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-neutral-600 md:text-base">
            {isFr
              ? "Choisissez votre contexte pour voir les décisions couvertes, les données nécessaires et le protocole de preuve."
              : "Pick your context to review covered decisions, required data, and the proof protocol."}
          </p>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollCards("prev")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition-colors duration-200 hover:bg-neutral-50"
            aria-label={isFr ? "Cartes précédentes" : "Previous cards"}
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => scrollCards("next")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition-colors duration-200 hover:bg-neutral-50"
            aria-label={isFr ? "Cartes suivantes" : "Next cards"}
          >
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      <ul
        ref={railRef}
        tabIndex={0}
        className="mt-7 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-4 focus-visible:ring-offset-cream [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label={
          isFr
            ? "Carrousel des solutions Praedixa par secteur"
            : "Praedixa industry solutions carousel"
        }
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollCards("next");
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollCards("prev");
          }
        }}
      >
        {cards.map((card, index) => (
          <li
            key={card.title}
            className="m-0 min-w-[82%] snap-start rounded-3xl border border-neutral-200/80 bg-white/95 p-5 shadow-[0_22px_42px_-38px_rgba(15,23,42,0.45)] md:min-w-[24rem] md:p-6"
            aria-label={
              isFr
                ? `Carte ${index + 1} sur ${cards.length}: ${card.title}`
                : `Card ${index + 1} of ${cards.length}: ${card.title}`
            }
          >
            <h3 className="text-lg font-semibold tracking-tight text-ink">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{card.benefit}</p>

            <ul className="mt-4 list-none space-y-2 p-0">
              {card.bullets.map((bullet) => (
                <li key={bullet} className="m-0 flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {bullet}
                </li>
              ))}
            </ul>

            <Link
              href={card.href}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink no-underline transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50"
            >
              {isFr ? "Voir la solution" : "View solution"}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
