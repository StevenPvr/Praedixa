export type SerpIntent =
  | "Info"
  | "Info/Decision"
  | "Decision"
  | "Tool"
  | "Achat"
  | "Commercial/Decision";

export type SerpSchemaType = "Article" | "WebPage";

export interface SerpResourceAsset {
  title: string;
  description: string;
  type: "calculateur" | "template" | "playbook" | "comparatif" | "guide";
}

export interface SerpResourceEntry {
  id: number;
  query: string;
  slug: string;
  title: string;
  intent: SerpIntent;
  description: string;
  openingSnippet: string;
  asset: SerpResourceAsset;
  sections: Array<{
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
}

export const sharedExecutionSection = {
  title: "Application opérationnelle Praedixa",
  paragraphs: [
    "La page applique le même cadre: signal early-warning 3 à 14 jours, facteurs explicatifs lisibles, arbitrage économique chiffré, et journal des décisions.",
    "L'objectif est d'outiller la revue Ops/DAF avec une méthode actionnable, pas un contenu éditorial abstrait.",
  ],
};
