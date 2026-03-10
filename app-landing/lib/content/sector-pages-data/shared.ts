import type { Locale } from "../../i18n/config";
import type { SectorDifferentiationCard, SectorSourceLink } from "./types";

export const praedixaMethodSources: Record<
  Locale,
  readonly SectorSourceLink[]
> = {
  fr: [
    { label: "Praedixa — plateforme", url: "https://www.praedixa.com/fr" },
    {
      label: "Praedixa — protocole pilote",
      url: "https://www.praedixa.com/fr/pilot-protocol",
    },
  ],
  en: [
    { label: "Praedixa — platform", url: "https://www.praedixa.com/en" },
    {
      label: "Praedixa — pilot protocol",
      url: "https://www.praedixa.com/en/pilot-protocol",
    },
  ],
};

const sectorDifferentiationCardsByLocale: Record<
  Locale,
  readonly SectorDifferentiationCard[]
> = {
  fr: [
    {
      title: "Federation gouvernee sur l'existant",
      body: "Praedixa se branche au-dessus de l'ERP, du planning, de la BI et d'Excel pour relier les systemes qui comptent pour une decision, sans projet de remplacement.",
    },
    {
      title: "Decision Journal + premiere action",
      body: "Le signal ne reste pas dans un dashboard: le choix est compare, journalise, puis la premiere action utile est enclenchee dans les outils existants.",
    },
    {
      title: "Preuve mensuelle decision par decision",
      body: "La valeur est relue avec une logique baseline / recommande / reel, des hypotheses explicites et une lecture exploitable en revue Ops / Finance.",
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
