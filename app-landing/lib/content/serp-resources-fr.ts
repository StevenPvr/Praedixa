import { serpResourceTargetsFrCore } from "./serp-resources-fr.core";
import { serpResourceTargetsFrMid } from "./serp-resources-fr.mid";
import { serpResourceTargetsFrTail } from "./serp-resources-fr.tail";
import type {
  SerpResourceEntry,
  SerpSchemaType,
} from "./serp-resources-fr.shared";

export type {
  SerpIntent,
  SerpResourceAsset,
  SerpResourceEntry,
  SerpSchemaType,
} from "./serp-resources-fr.shared";

export const serpResourceTargetsFr: readonly SerpResourceEntry[] = [
  ...serpResourceTargetsFrCore,
  ...serpResourceTargetsFrMid,
  ...serpResourceTargetsFrTail,
];

const SERP_SCHEMA_TYPE_BY_ID: Partial<Record<number, SerpSchemaType>> = {
  11: "WebPage",
};

const SERP_PRIMARY_CTA_BY_ID: Record<number, string> = {
  1: "Telecharger la checklist diagnostic",
  2: "Voir un exemple de carte des risques",
  3: "Telecharger le template de revue hebdo",
  4: "Telecharger le modele capacite/charge",
  5: "Lancer le calculateur de couverture",
  6: "Tester le mini-diagnostic early-warning",
  7: "Obtenir la checklist de scoring",
  8: "Telecharger le modele de carte des risques",
  9: "Telecharger la checklist revue planning",
  10: "Ouvrir le simulateur FTE",
  11: "Lancer le calculateur FTE",
  12: "Telecharger le dataset d'exemple",
  13: "Telecharger le template revue capacite",
  14: "Telecharger le playbook multi-sites",
  15: "Telecharger la matrice de decision",
  16: "Calculer le cout de l'inaction",
  17: "Telecharger le tableau de couts",
  18: "Lancer le simulateur interim vs anticipe",
  19: "Lancer le calculateur heures sup",
  20: "Voir le comparatif OT vs interim",
  21: "Telecharger le modele absentéisme",
  22: "Telecharger le benchmark turnover",
  23: "Voir le guide masse salariale",
  24: "Calculer le cout de l'inaction",
  25: "Telecharger le playbook de reponse",
  26: "Voir le registre de decision",
  27: "Telecharger le template avant/apres",
  28: "Comparer les logiciels WFM",
  29: "Voir le comparatif WFM",
  30: "Telecharger la checklist service",
};

const SERP_INTERNAL_LINK_GRAPH_BY_ID: Partial<Record<number, number[]>> = {
  1: [16, 24, 25],
  2: [1, 7, 25],
  3: [1, 9, 25],
  4: [5, 10, 13],
  5: [4, 6, 16],
  6: [1, 5, 9],
  7: [2, 6, 25],
  8: [2, 7, 15],
  9: [3, 6, 13],
  10: [4, 11, 12],
  11: [10, 12, 13],
  12: [10, 11, 13],
  13: [4, 9, 14],
  14: [13, 15, 25],
  15: [14, 19, 26],
  16: [24, 23, 26],
  17: [16, 18, 19],
  18: [17, 19, 24],
  19: [17, 18, 20],
  20: [19, 18, 26],
  21: [17, 23, 24],
  22: [21, 23, 24],
  23: [16, 21, 24],
  24: [16, 23, 26],
  25: [1, 6, 26],
  26: [15, 24, 27],
  27: [24, 25, 26],
  28: [29, 14, 15],
  29: [28, 14, 30],
  30: [19, 24, 29],
};

const SERP_RESOURCES_BY_ID = new Map(
  serpResourceTargetsFr.map((entry) => [entry.id, entry]),
);

function fallbackRelatedResources(
  current: SerpResourceEntry,
  take: number,
): SerpResourceEntry[] {
  return serpResourceTargetsFr
    .filter((entry) => entry.slug !== current.slug)
    .slice(Math.max(0, current.id - 2), Math.max(0, current.id - 2) + take);
}

export function getSerpResourceBySlug(
  slug: string,
): SerpResourceEntry | undefined {
  return serpResourceTargetsFr.find((entry) => entry.slug === slug);
}

export function getSerpResourceSlugs(): string[] {
  return serpResourceTargetsFr.map((entry) => entry.slug);
}

export function getSerpResourceSchemaType(slug: string): SerpSchemaType {
  const entry = getSerpResourceBySlug(slug);
  if (!entry) return "Article";
  return SERP_SCHEMA_TYPE_BY_ID[entry.id] ?? "Article";
}

export function getSerpResourcePrimaryCta(slug: string): string {
  const entry = getSerpResourceBySlug(slug);
  if (!entry) return "Demander un pilote prevision effectifs";
  return (
    SERP_PRIMARY_CTA_BY_ID[entry.id] ?? "Demander un pilote prevision effectifs"
  );
}

export function getSerpResourceInternalLinks(
  slug: string,
  take = 3,
): SerpResourceEntry[] {
  const current = getSerpResourceBySlug(slug);
  if (!current) return [];

  const linkedIds = SERP_INTERNAL_LINK_GRAPH_BY_ID[current.id] ?? [];
  const linkedEntries = linkedIds
    .map((id) => SERP_RESOURCES_BY_ID.get(id))
    .filter((entry): entry is SerpResourceEntry => Boolean(entry))
    .filter((entry) => entry.slug !== slug);

  if (linkedEntries.length > 0) {
    return linkedEntries.slice(0, take);
  }

  return fallbackRelatedResources(current, take);
}

export function getRelatedSerpResources(
  slug: string,
  take = 3,
): SerpResourceEntry[] {
  return getSerpResourceInternalLinks(slug, take);
}
