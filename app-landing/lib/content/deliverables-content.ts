export const CHECKLIST_ITEMS = [
  "Cartographie des points de tension couverture par périmètre",
  "Hypothèses de coûts explicites pour chaque scénario d'action",
  "Priorisation opérationnelle par niveau de criticité",
  "Cadre de revue hebdomadaire prêt pour comité opérations",
  "Traçabilité des décisions et des impacts observés",
] as const;

export interface TrustSignal {
  title: string;
  text: string;
}

export const TRUST_SIGNALS: readonly TrustSignal[] = [
  {
    title: "Design orienté direction opérations",
    text: "Une interface conçue pour piloter vite, sans bruit visuel inutile.",
  },
  {
    title: "Méthode explicitable",
    text: "Chaque arbitrage repose sur des hypothèses visibles et discutables.",
  },
  {
    title: "Niveau de gouvernance enterprise",
    text: "Documentation des décisions pour sécuriser les revues CODIR/DAF.",
  },
  {
    title: "Cadre privacy-by-design",
    text: "Travail sur données agrégées uniquement, sans prédiction individuelle.",
  },
] as const;
