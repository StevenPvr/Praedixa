import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | L\u2019IA au service de vos décisions opérationnelles",
    description:
      "Praedixa anticipe vos besoins, optimise vos décisions et prouve votre ROI. Opérationnel en 30 jours.",
    ogTitle: "Praedixa | L\u2019IA au service de vos décisions opérationnelles",
    ogDescription:
      "Praedixa anticipe vos besoins, optimise vos décisions et prouve votre ROI. Opérationnel en 30 jours.",
  },

  nav: {
    problem: "Problème",
    method: "Méthode",
    services: "Offre",
    howItWorks: "Comment ça marche",
    useCases: "Cas d\u2019usage",
    security: "Sécurité",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Voir une démo",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Pour les décideurs opérations",
    headline: "Anticipez. Optimisez.",
    headlineHighlight: "Prouvez votre ROI.",
    subtitle:
      "L\u2019IA au service de vos décisions opérationnelles. Des résultats mesurables, pas des promesses.",
    manifestoLabel: "Le point de départ",
    manifestoQuote:
      "Des équipes opérationnelles qui veulent anticiper plutôt que subir.",
    bullets: [
      {
        metric: "Pour qui",
        text: "Réseaux multi-sites, toutes industries.",
      },
      {
        metric: "Comment",
        text: "L\u2019IA anticipe et optimise vos décisions au quotidien.",
      },
      {
        metric: "Résultat",
        text: "Un ROI mesuré et prouvé.",
      },
    ],
    ctaPrimary: "Voir une démo",
    ctaSecondary: "Nous contacter",
    ctaTertiary: "",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta: "Déploiement en 30 jours · lecture seule · NDA possible",
    trustBadges: [
      "Lecture seule au démarrage",
      "Données agrégées uniquement",
      "Hébergement France",
      "NDA possible dès le premier échange",
    ],
  },

  preview: {
    kicker: "Un avant-goût",
    heading: "L\u2019interface Praedixa",
    subheading:
      "Découvrez comment Praedixa structure vos décisions au quotidien.",
    overlayTitle: "Découvrir la web app",
    overlayBody:
      "Ouvrez une version d\u2019aperçu public (UI identique, données fictives).",
    overlayCta: "Découvrir la web app",
    overlayBackCta: "Revenir à la vidéo",
    loadingLabel: "Chargement de l\u2019aperçu vidéo…",
    liveBadge: "Aperçu public",
  },

  problem: {
    kicker: "Le constat",
    heading:
      "Vous avez les données. Il vous manque un cadre pour décider vite.",
    subheading:
      "Dans les opérations multi-sites, les décisions critiques arrivent souvent trop tard. Résultat\u00a0: des coûts évitables et des opportunités manquées.",
    cta: "Voir une démo",
    ctaHint: "Exemple concret\u00a0: une décision optimisée de bout en bout.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les signaux avant les décisions critiques.",
      emptyTitle: "Aucun signal structuré",
      emptyBody:
        "Ajoutez les situations métier à prioriser pour composer cette lecture.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage du problème ne peut pas être affiché pour le moment.",
    },
    pains: [
      {
        title: "Les signaux arrivent trop tard",
        description:
          "Quand le risque devient visible, il coûte déjà plus cher à traiter.",
        consequence:
          "La marge de manœuvre se réduit avant même que la discussion commence.",
        cost: "Le coût d\u2019urgence monte plus vite que la qualité de décision.",
      },
      {
        title: "Les options ne sont pas comparées",
        description:
          "Les équipes décident sous pression, sans base commune pour comparer les scénarios.",
        consequence:
          "Les décisions deviennent difficiles à expliquer et à reproduire.",
        cost: "On choisit la vitesse plutôt que la meilleure option.",
      },
      {
        title: "L\u2019impact n\u2019est jamais mesuré",
        description:
          "Les décisions s\u2019enchaînent, mais personne ne sait ce qu\u2019elles ont réellement coûté ou protégé.",
        consequence: "Les réunions repartent de zéro à chaque fois.",
        cost: "Le ROI est estimé, jamais prouvé.",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez cette situation\u00a0?",
      signals: [
        "Un problème est visible sur le terrain bien avant qu\u2019il remonte dans les tableaux de bord",
        "Les corrections arrivent quand le coût est déjà engagé",
        "Deux équipes comparables prennent des décisions différentes face au même problème",
        "Après une action, personne ne sait ce qu\u2019elle a réellement changé",
      ],
    },
  },

  solution: {
    kicker: "Notre approche",
    heading: "L\u2019IA qui anticipe, compare et prouve.",
    subheading:
      "Praedixa ne remplace pas vos outils. Il ajoute l\u2019intelligence qui manque pour décider plus vite et mieux.",
    principles: [
      {
        title: "Anticiper",
        subtitle: "Risques et opportunités",
        description:
          "Praedixa détecte les signaux importants avant qu\u2019ils ne deviennent des urgences coûteuses.",
      },
      {
        title: "Comparer",
        subtitle: "Coût · impact · risque",
        description:
          "Chaque option est chiffrée pour que vous choisissiez en connaissance de cause.",
      },
      {
        title: "Prouver",
        subtitle: "ROI mesuré",
        description:
          "Chaque décision garde sa trace et son impact réel pour construire un vrai historique de performance.",
      },
    ],
    differentiators: {
      title: "Ce que Praedixa apporte",
      description:
        "Vos outils stockent et reportent. Praedixa ajoute l\u2019anticipation, la comparaison et la preuve.",
      items: [
        {
          is: "Une couche d\u2019intelligence sur l\u2019existant",
          isNot: "Un outil de plus",
        },
        {
          is: "Un focus sur ce qui coûte le plus",
          isNot: "Une promesse d\u2019optimiser tout d\u2019un coup",
        },
        {
          is: "Un ROI mesuré dans le temps",
          isNot: "Une recommandation sans preuve",
        },
      ],
    },
  },
};
