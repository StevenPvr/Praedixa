export const heroContent = {
  kicker: "Pour les Ops multi-sites",
  headline: "La sous-couverture vous coûte cher. On la détecte avant.",
  headlineHighlight: "On la détecte avant",
  subtitle:
    "Praedixa prédit les trous de couverture par site, équipe et compétence dans les 3 à 14 prochains jours. Chaque risque est chiffré, chaque arbitrage est traçable.",
  bullets: [
    {
      icon: "warning",
      text: "Early-warning : où ça va casser, avant que ça casse",
    },
    {
      icon: "euro",
      text: "Coût de l'inaction vs coût des options, chiffré en euros",
    },
    {
      icon: "check",
      text: "Preuve d'impact : décision log et mesure avant/après",
    },
  ],
  ctaPrimary: { text: "Demander un diagnostic 48h", href: "/devenir-pilote" },
  ctaSecondary: { text: "Découvrir la méthode", href: "#pipeline" },
  trustBadges: [
    "Diagnostic en 48h",
    "Sans intégration IT",
    "Hébergement France",
    "Données agrégées uniquement",
  ],
  illustrationAlt:
    "Tableau de bord Praedixa affichant une carte de risque de sous-couverture par site avec arbitrage économique et preuve d'impact",
} as const;

export type HeroContent = typeof heroContent;
