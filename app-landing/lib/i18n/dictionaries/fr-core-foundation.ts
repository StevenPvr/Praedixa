import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Risques business et décisions multi-sites",
    description:
      "Praedixa anticipe les risques business qui dégradent la performance et recommande les meilleures décisions pour les réduire sur les effectifs, la demande, les stocks, les approvisionnements et la rétention client.",
    ogTitle: "Praedixa | Risques business et décisions multi-sites",
    ogDescription:
      "En 5 jours ouvrés, Praedixa montre quels écarts menacent la performance et quelles décisions lancer d'abord pour protéger marge, service et croissance.",
  },

  nav: {
    problem: "Problème",
    method: "Méthode",
    services: "Offre",
    howItWorks: "Comment ça marche",
    useCases: "Cas business",
    security: "Intégration & données",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Demander la preuve sur historique",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Pour COO, DAF et directions réseau",
    headline: "Anticipez",
    headlineHighlight: "les risques business qui détruisent la marge.",
    subtitle:
      "Praedixa détecte les écarts qui menacent votre activité et recommande les meilleures décisions à prendre sur les effectifs, la demande, les stocks, les approvisionnements et la rétention client. Nous commençons par le risque le plus coûteux sur votre périmètre.",
    manifestoLabel: "",
    manifestoQuote:
      "Voir plus tôt les risques qui dégradent la performance, décider quoi corriger, relire ce qui a marché.",
    bullets: [
      {
        metric: "5 jours",
        text: "pour faire remonter le signal",
      },
      {
        metric: "Lecture seule",
        text: "sur vos données existantes",
      },
      {
        metric: "Du staffing au churn",
        text: "un même moteur de décision",
      },
    ],
    ctaPrimary: "Demander la preuve sur historique",
    ctaSecondary: "Voir la méthode",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta: "5 jours ouvrés · lecture seule · validation humaine",
    trustBadges: [
      "Preuve sur historique en 5 jours ouvrés",
      "Effectifs, demande, stocks, approvisionnements, rétention",
      "Lecture seule sur vos données existantes",
      "Validation humaine de chaque action",
      "Premier périmètre resserré sur le risque prioritaire",
      "Sans remplacement d'outil",
      "Premières actions recommandées avant déploiement",
      "Impact relu site par site",
      "Onboarding fixe déduit si engagement annuel",
      "Cadre Ops / Finance partagé",
      "Hébergé en France (Scaleway)",
    ],
  },

  preview: {
    kicker: "Un avant-goût",
    heading: "L’interface Praedixa",
    subheading:
      "Voir comment le protocole de décision prend forme dans l’interface.",
    overlayTitle: "Découvrir la web app",
    overlayBody:
      "Ouvrez une version d’aperçu public (UI identique, données fictives).",
    overlayCta: "Découvrir la web app",
    overlayBackCta: "Revenir à la vidéo",
    loadingLabel: "Chargement de l’aperçu vidéo…",
    liveBadge: "Aperçu public",
  },

  problem: {
    kicker: "",
    heading:
      "Quand les écarts business remontent trop tard, la performance décroche.",
    subheading:
      "Sur les effectifs, la demande, les stocks, les approvisionnements ou la rétention, le même problème revient : les signaux utiles n'arrivent pas assez tôt ni dans un langage commun. Résultat : coût subi, service fragilisé et arbitrages tardifs.",
    cta: "Demander la preuve sur historique",
    ctaHint:
      "Réponse sous 48h ouvrées. Preuve sur historique offerte. Démarrage en lecture seule sur vos fichiers et outils existants.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les points de friction avant vos arbitrages business.",
      emptyTitle: "Aucun signal remonte",
      emptyBody:
        "Ajoutez des cas concrets à prioriser pour composer votre lecture business.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage de problème ne peut pas être affiché pour le moment.",
    },
    pains: [
      {
        title: "Les signaux critiques sont dispersés",
        description:
          "Charge, demande, stock, disponibilité matière, churn ou couverture vivent chacun dans des outils et des rythmes différents.",
        consequence:
          "Le signal utile apparaît souvent quand la marge de manoeuvre est déjà faible.",
        cost: "Les corrections coûtent plus cher",
      },
      {
        title: "Chaque fonction arbitre dans sa propre vue",
        description:
          "Ops, finance, supply, commerce ou terrain voient chacun une partie du problème, rarement le compromis complet au bon moment.",
        consequence:
          "Les arbitrages prennent du temps et restent difficiles à défendre.",
        cost: "Les décisions ralentissent",
      },
      {
        title: "Les corrections arrivent en urgence",
        description:
          "Renfort, réallocation, ajustement de stock, approvisionnement ou action de rétention sont lancés trop tard et sans lecture commune de leur impact.",
        consequence:
          "Les budgets restent discutés et les priorités changent selon le contexte local.",
        cost: "La marge protégée reste floue",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez ce fonctionnement ?",
      signals: [
        "Un même écart métier est visible localement avant d'apparaître clairement dans une lecture commune",
        "Les corrections arrivent quand la marge, le service ou le stock sont déjà sous pression",
        "Deux équipes comparables ne prennent pas la même décision face au même signal",
        "Après une action, il reste difficile de savoir ce qu'elle a réellement protégé",
      ],
    },
  },

  solution: {
    kicker: "La méthode Praedixa",
    heading:
      "Anticiper les risques. Comparer les arbitrages. Lancer la bonne première action.",
    subheading:
      "Praedixa ne remplace ni votre ERP, ni votre planning, ni votre BI. La plateforme relie les signaux utiles pour anticiper les risques business à court terme, comparer les arbitrages coût / service / risque et documenter le résultat des décisions prises sur les effectifs, la demande, les stocks, les approvisionnements ou la rétention.",
    principles: [
      {
        title: "Repérer tôt les écarts qui menacent la performance",
        subtitle: "Données existantes · lecture seule",
        description:
          "Exports, API, ERP, planning, BI ou Excel sont reliés sans projet de remplacement pour faire remonter les écarts utiles avant qu'ils ne coûtent plus cher.",
      },
      {
        title: "Comparer les arbitrages sur vos leviers métiers",
        subtitle: "Coût · Service · Risque",
        description:
          "Praedixa met les options à plat, chiffre leurs effets attendus et garde vos garde-fous métier visibles avant validation, qu'il s'agisse d'effectifs, de demande, de stock, d'approvisionnement ou de rétention.",
      },
      {
        title: "Lancer une première action puis relire l'impact",
        subtitle: "Validation humaine · impact relu",
        description:
          "Vos équipes gardent la décision finale. Praedixa prépare la première action dans vos outils, puis relit baseline, recommandé, réel et hypothèses explicites.",
      },
    ],
    differentiators: {
      title: "Ce qui rend Praedixa crédible",
      description:
        "La valeur n'est pas dans un mot de catégorie. Elle est dans un mécanisme simple : voir plus tôt, comparer clairement, agir avec garde-fous, puis relire l'impact.",
      items: [
        {
          is: "Un même moteur pour plusieurs risques business",
          isNot: "Un outil mono-usage limité à un seul levier",
        },
        {
          is: "Un premier périmètre resserré sur le risque prioritaire",
          isNot: "Une promesse floue qui prétend tout faire d'un coup",
        },
        {
          is: "Action validée + impact relu",
          isNot: "Promesse ROI sans traçabilité",
        },
      ],
    },
  },
};
