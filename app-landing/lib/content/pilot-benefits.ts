export interface PilotColumn {
  id: string;
  title: string;
  items: string[];
}

export const pilotColumns: PilotColumn[] = [
  {
    id: "co-construction",
    title: "Ce qu'on co-construit ensemble",
    items: [
      "Carte de sous-couverture par site et compétence",
      "Facteurs explicatifs de chaque risque détecté",
      "Playbook d'actions prioritaires chiffrées",
      "Calibration sur vos données réelles et vos contraintes métier",
    ],
  },
  {
    id: "avantages",
    title: "Ce que vous gagnez",
    items: [
      "Comprendre pourquoi les trous de couverture arrivent",
      "Early-warning opérationnel sur la couverture",
      "Arbitrages chiffrés : coût vs options",
      "Preuve économique auditable pour le CODIR",
      "Amélioration continue de vos processus",
    ],
  },
  {
    id: "objectif",
    title: "Comment ça marche",
    items: [
      "Exports simples (CSV/Excel), aucune intégration",
      "Données agrégées uniquement, pas de données individuelles",
      "Premiers résultats en jours, sans engagement",
    ],
  },
];

export const pilotUrgencyText =
  "Places limitées. Le programme pilote est réservé à un nombre restreint d'entreprises pour garantir un vrai partenariat de co-construction.";
export const pilotCtaText = "Devenir entreprise pilote";
export const pilotCtaHref = "/devenir-pilote";
