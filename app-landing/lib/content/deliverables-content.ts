export const CHECKLIST_ITEMS = [
  "Carte de sous-couverture par site et compétence",
  "Facteurs explicatifs de chaque risque identifié",
  "Coût de l'inaction estimé en euros",
  "Playbook d'actions prioritaires chiffrées",
  "Hypothèses explicites et auditables",
] as const;

export interface TrustSignal {
  title: string;
  text: string;
}

export const TRUST_SIGNALS: readonly TrustSignal[] = [
  {
    title: "Crédibilité fondateur",
    text: "Expertise en data science, séries temporelles et économétrie appliquées aux opérations multi-sites.",
  },
  {
    title: "Transparence méthodologique",
    text: "Chaque chiffre est accompagné de ses hypothèses. Rien n'est une boîte noire.",
  },
  {
    title: "RGPD by design",
    text: "Données agrégées équipe/site uniquement. Hébergement France. Pas de données individuelles.",
  },
  {
    title: "Interprétabilité native",
    text: "Chaque prévision est accompagnée de ses facteurs explicatifs. Vous comprenez le pourquoi, pas juste le quoi.",
  },
] as const;
