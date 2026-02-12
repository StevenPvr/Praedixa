export const heroContent = {
  kicker: "SaaS premium pour COO multi-sites",
  headline:
    "Anticipez les tensions de couverture avant qu'elles ne coûtent cher.",
  headlineHighlight: "avant qu'elles ne coûtent cher",
  subtitle:
    "Praedixa convertit la sous-couverture en décisions exécutables: signaux précoces, scénarios chiffrés, et preuve d'impact défendable en comité opérations/finance.",
  bullets: [
    {
      icon: "warning",
      text: "Alertes 3 à 14 jours avant les ruptures terrain",
    },
    {
      icon: "euro",
      text: "Scénarios comparables sur coût, risque et niveau de service",
    },
    {
      icon: "check",
      text: "Décisions traçables pour CODIR, DAF et audit interne",
    },
  ],
  ctaPrimary: {
    text: "Demander une qualification pilote",
    href: "/devenir-pilote",
  },
  ctaSecondary: { text: "Voir la méthode ROI", href: "#solution" },
  ctaMeta:
    "Qualification en 20 min • Réponse sous 24h ouvrées • Cohorte limitée à 8 entreprises",
  trustBadges: [
    "Sans intégration SI lourde",
    "Données agrégées uniquement",
    "NDA possible dès le premier échange",
    "Framework ROI auditable",
  ],
  illustrationAlt:
    "Vue premium Praedixa avec pilotage des tensions de couverture, arbitrages et indicateurs d'impact.",
} as const;

export type HeroContent = typeof heroContent;
