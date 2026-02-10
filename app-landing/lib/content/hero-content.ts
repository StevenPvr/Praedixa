export const heroContent = {
  kicker: "Pour les Ops multi-sites",
  headline: "La sous-couverture vous coûte cher. On la détecte avant.",
  headlineHighlight: "On la détecte avant",
  subtitle:
    "Praedixa prédit les trous de couverture par site, équipe et compétence dans les 3 à 14 prochains jours. Chaque risque est expliqué, chaque arbitrage est chiffré, chaque décision est traçable.",
  bullets: [
    {
      icon: "warning",
      text: "Early-warning : où ça va casser, avant que ça casse",
    },
    {
      icon: "euro",
      text: "Comprendre pourquoi le risque existe, pas juste qu'il va arriver",
    },
    {
      icon: "check",
      text: "Preuve d'impact : décision log et mesure avant/après",
    },
  ],
  ctaPrimary: { text: "Devenir entreprise pilote", href: "/devenir-pilote" },
  ctaSecondary: { text: "Découvrir la méthode", href: "#pipeline" },
  trustBadges: [
    "Interprétabilité native",
    "Sans intégration IT",
    "Hébergement France",
    "Données agrégées uniquement",
  ],
  illustrationAlt:
    "Tableau de bord Praedixa affichant une carte de risque de sous-couverture par site avec arbitrage économique et preuve d'impact",
} as const;

export type HeroContent = typeof heroContent;
