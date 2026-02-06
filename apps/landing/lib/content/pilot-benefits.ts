export interface PilotColumn {
  id: string;
  title: string;
  items: string[];
}

export const pilotColumns: PilotColumn[] = [
  {
    id: "co-construction",
    title: "Ce qu'on livre",
    items: [
      "Carte de sous-couverture par site et compétence",
      "Coût de l'inaction estimé en euros",
      "Playbook d'actions prioritaires chiffrées",
      "Livré en 48h, sans intégration IT",
    ],
  },
  {
    id: "avantages",
    title: "Ce que vous gagnez",
    items: [
      "Early-warning opérationnel sur la couverture",
      "Arbitrages chiffrés : coût vs options",
      "Preuve économique auditable pour le CODIR",
      "Réduction du mode urgence et des coûts associés",
      "Décisions traçables avec audit trail",
    ],
  },
  {
    id: "objectif",
    title: "Comment ça marche",
    items: [
      "Exports simples (CSV/Excel), aucune intégration",
      "Données agrégées uniquement, pas de données individuelles",
      "Résultat en 48h, sans engagement",
    ],
  },
];

export const pilotUrgencyText =
  "Places limitées. Le diagnostic est réservé à un nombre restreint d'entreprises pour garantir la qualité de l'accompagnement.";
export const pilotCtaText = "Demander un diagnostic 48h";
export const pilotCtaHref = "/devenir-pilote";
