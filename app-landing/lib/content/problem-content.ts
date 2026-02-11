export interface PainPoint {
  title: string;
  description: string;
  consequence: string;
}

export const PAIN_POINTS: readonly PainPoint[] = [
  {
    title: "La sous-couverture se révèle trop tard",
    description:
      "Aucun early-warning : l'écart capacité vs charge apparaît le jour J, quand il ne reste que des solutions d'urgence.",
    consequence: "Surcoût intérim urgence : +40 à +80 % vs anticipé",
  },
  {
    title: "Le coût de l'inaction est invisible",
    description:
      "Heures sup, intérim, dégradation de service — le coût réel de la sous-couverture est rarement mesuré, jamais consolidé.",
    consequence: "Pas de visibilité financière pour arbitrer",
  },
  {
    title: "Aucune preuve pour le CODIR",
    description:
      "Sans données consolidées, impossible de prouver l'impact des décisions. Pas de trace, pas de preuve économique auditable.",
    consequence: "Pas d'audit trail pour le DAF",
  },
] as const;
