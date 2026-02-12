export interface PainPoint {
  title: string;
  description: string;
  consequence: string;
}

export const PAIN_POINTS: readonly PainPoint[] = [
  {
    title: "Décisions prises trop tard",
    description:
      "Les signaux de tension sont détectés au moment où les marges de manœuvre sont déjà réduites.",
    consequence:
      "Effet domino: surcoûts, dégradation de service, stress managérial",
  },
  {
    title: "Arbitrages insuffisamment cadrés",
    description:
      "Sans scénario économique structuré, les décisions reposent sur l'urgence et non sur une logique de portefeuille.",
    consequence: "Budget opérationnel moins prévisible et moins défendable",
  },
  {
    title: "Impact difficile à prouver",
    description:
      "Les actions sont rarement reliées à une preuve mesurable de leur effet réel sur la couverture.",
    consequence:
      "Difficulté à sécuriser des budgets ou des priorités en comité",
  },
] as const;
