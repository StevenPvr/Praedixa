export interface SolutionStep {
  number: string;
  title: string;
  subtitle: string;
  description: string;
}

export const SOLUTION_STEPS: readonly SolutionStep[] = [
  {
    number: "1",
    title: "Cadrage data rapide",
    subtitle: "Exports existants, sans refonte SI",
    description:
      "Nous utilisons vos données opérationnelles déjà disponibles pour construire une base de lecture fiable de la couverture.",
  },
  {
    number: "2",
    title: "Lecture anticipative des tensions",
    subtitle: "Signal, causes, niveau de criticité",
    description:
      "Chaque tension est expliquée: où, pourquoi, avec quel niveau de risque et quelles marges d'action disponibles.",
  },
  {
    number: "3",
    title: "Décision outillée et traçable",
    subtitle: "Arbitrages chiffrés + boucle d'impact",
    description:
      "Vous pilotez les options avec un cadre économique clair et une trace d'impact mobilisable pour la gouvernance.",
  },
] as const;
