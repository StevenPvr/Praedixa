export const landingFaq = [
  {
    question: "Praedixa, c'est quoi ?",
    answer:
      "Praedixa est un logiciel B2B qui aide les PME/ETI multi-sites à piloter la sous-couverture des équipes terrain. L'objectif : anticiper l'écart capacité vs charge, chiffrer les options (HS, intérim, réallocation) et décider vite, avec une preuve économique.",
  },
  {
    question: "Quelles données faut-il pour démarrer ?",
    answer:
      "On démarre avec des exports que vous avez déjà : planning, activité/volumes et absences (format CSV/Excel). On s'adapte à vos outils et à votre niveau de maturité data. L'objectif est de produire un diagnostic actionnable sans projet d'intégration.",
  },
  {
    question: "Faut-il une intégration IT ?",
    answer:
      "Non pour le diagnostic. Des exports suffisent, sans connecteur à installer. Après validation, on peut automatiser progressivement les flux pour passer au suivi continu (dashboard + alertes).",
  },
  {
    question: "Qu'est-ce que je reçois en 48h ?",
    answer:
      "Un plan de couverture actionnable : carte de sous-couverture, coût évitable estimé, options chiffrées et 3 actions prioritaires. Les hypothèses (coûts unitaires, règles) sont explicites et validables.",
  },
  {
    question: "RGPD : est-ce que vous utilisez des données individuelles ?",
    answer:
      "Le diagnostic est conçu privacy-by-design : on travaille au niveau agrégé (équipe/site) et on limite les données au strict nécessaire. Les données sont hébergées en France.",
  },
] as const;

export type LandingFaqItem = (typeof landingFaq)[number];
