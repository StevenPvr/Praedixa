import type { Locale } from "../../i18n/locale";
import type { SectorDifferentiationCard, SectorSourceLink } from "./types";

export const praedixaMethodSources: Record<
  Locale,
  readonly SectorSourceLink[]
> = {
  fr: [
    { label: "Praedixa — plateforme", url: "https://www.praedixa.com/fr" },
    {
      label: "Praedixa — offre",
      url: "https://www.praedixa.com/fr/services",
    },
  ],
  en: [
    { label: "Praedixa — platform", url: "https://www.praedixa.com/en" },
    {
      label: "Praedixa — offer",
      url: "https://www.praedixa.com/en/services",
    },
  ],
};

const sectorDifferentiationCardsByLocale: Record<
  Locale,
  readonly SectorDifferentiationCard[]
> = {
  fr: [
    {
      title: "Fédération gouvernée sur l'existant",
      body: "Praedixa se branche au-dessus de l'ERP, du planning, de la BI et d'Excel pour relier les systèmes qui comptent pour une décision, sans projet de remplacement.",
    },
    {
      title: "Decision Journal + première action",
      body: "Le signal ne reste pas dans un dashboard: le choix est comparé, journalisé, puis la première action utile est enclenchée dans les outils existants.",
    },
    {
      title: "Preuve mensuelle décision par décision",
      body: "La valeur est relue avec une logique baseline / recommandé / réel, des hypothèses explicites et une lecture exploitable en revue Ops / Finance.",
    },
  ],
  en: [
    {
      title: "Governed federation on top of the stack",
      body: "Praedixa sits above ERP, scheduling, BI, and spreadsheets to connect the systems that matter to a decision, without a replacement project.",
    },
    {
      title: "Decision Journal + first action",
      body: "The signal does not stay in a dashboard: the choice is compared, logged, and the first useful move is triggered inside the existing tools.",
    },
    {
      title: "Decision-by-decision monthly proof",
      body: "Value is reviewed through a baseline / recommended / actual frame with explicit assumptions and a format that works for Ops / Finance reviews.",
    },
  ],
};

export function getSectorDifferentiationCards(
  locale: Locale,
): readonly SectorDifferentiationCard[] {
  return sectorDifferentiationCardsByLocale[locale];
}
