export interface SolutionStep {
  number: string;
  title: string;
  subtitle: string;
  description: string;
}

export const SOLUTION_STEPS: readonly SolutionStep[] = [
  {
    number: "1",
    title: "Envoyez vos exports existants",
    subtitle: "10 min, aucune intégration",
    description:
      "Capacité, charge, absences : des fichiers que vous avez déjà. CSV ou Excel, aucun connecteur à installer.",
  },
  {
    number: "2",
    title: "On détecte et on explique",
    subtitle: "Prédiction + facteurs explicatifs",
    description:
      "On prédit les trous à venir par site, équipe et compétence. Pour chaque risque, Praedixa identifie les facteurs explicatifs : vous comprenez pourquoi, pas juste où.",
  },
  {
    number: "3",
    title: "Vous recevez votre carte des risques",
    subtitle: "Risques + causes + playbook d'actions",
    description:
      "Une carte de sous-couverture par site, les causes identifiées, le coût évitable estimé et un playbook d'actions prioritaires avec hypothèses transparentes.",
  },
] as const;
