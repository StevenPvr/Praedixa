export interface PilotColumn {
  id: string;
  title: string;
  items: string[];
}

export const pilotColumns: PilotColumn[] = [
  {
    id: "co-construction",
    title: "Co-construction",
    items: [
      "Vous participez à la définition des fonctionnalités",
      "Vos retours orientent le produit",
      "Premiers à utiliser chaque nouvelle version",
      "Accompagnement dédié pour le déploiement",
    ],
  },
  {
    id: "avantages",
    title: "Avantages exclusifs",
    items: [
      "Tarif préférentiel pendant 1 an",
      "Support premium pendant 1 an",
      "Diagnostic initial gratuit",
      "Accès prioritaire aux nouvelles fonctionnalités",
      "Influence directe sur la roadmap",
    ],
  },
  {
    id: "objectif",
    title: "Objectif final",
    items: [
      "Implémenter la boucle complète avec vous",
      "Données → Prédictions → Notifications → KPIs",
      "Un cycle vertueux d'amélioration continue",
    ],
  },
];

export const pilotUrgencyText =
  "Places limitées. Le programme pilote est réservé à un nombre restreint d'entreprises pour garantir la qualité de l'accompagnement.";
export const pilotCtaText = "Candidater au programme pilote";
export const pilotCtaHref = "/devenir-pilote";
