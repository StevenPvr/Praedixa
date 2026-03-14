import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Décisions multi-sites et preuve ROI",
    description:
      "Praedixa aide les organisations multi-sites à arbitrer plus tôt entre demande, capacité, coût, service et risque, puis à prouver l’impact réel des décisions prises.",
    ogTitle: "Praedixa | Décisions multi-sites et preuve ROI",
    ogDescription:
      "Praedixa aide les organisations multi-sites à voir plus tôt les arbitrages qui menacent la marge, à comparer les options et à relire l’impact réel des décisions prises.",
  },

  nav: {
    problem: "Problème",
    method: "Méthode",
    services: "Offre",
    howItWorks: "Comment ça marche",
    useCases: "Cas d’usage",
    security: "Sécurité",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Demander la preuve sur historique",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Couche de décision pour opérations multi-sites",
    headline: "Décidez plus tôt.",
    headlineHighlight: "Protégez la marge avant que l’opération ne casse.",
    subtitle:
      "Praedixa aide les organisations multi-sites à arbitrer entre demande, capacité, coût, service et risque à partir des données déjà présentes dans leurs outils. Nous commençons par les décisions de couverture et d’allocation les plus coûteuses.",
    manifestoLabel: "Raison d’être",
    manifestoQuote:
      "Accompagner la croissance des entreprises françaises en révélant le potentiel dans leurs données, tout en gardant leur souveraineté.",
    bullets: [
      {
        metric: "Lecture seule",
        text: "pour démarrer sans projet SI lourd",
      },
      {
        metric: "Arbitrage",
        text: "coût, service, risque sur une même base",
      },
      {
        metric: "Preuve ROI",
        text: "impact relu dans le temps",
      },
    ],
    ctaPrimary: "Demander la preuve sur historique",
    ctaSecondary: "Voir comment ça marche",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta:
      "Point d’entrée resserré · lecture commune Ops / Finance · NDA possible",
    trustBadges: [
      "Lecture seule au démarrage",
      "Données agrégées uniquement",
      "Hébergement France",
      "NDA possible dès le premier échange",
      "Premier point d’entrée: arbitrages de couverture et d’allocation",
      "Pas de remplacement d’outil au départ",
      "Cadre commun Ops / Finance / Réseau",
      "Impact relu avant / recommandé / réel",
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
    kicker: "Pourquoi maintenant",
    heading:
      "Le problème n’est pas le manque de données. Le problème, c’est le manque de cadre pour arbitrer.",
    subheading:
      "Dans les opérations multi-sites, les arbitrages critiques sont souvent pris trop tard, trop vite et sans preuve économique solide. Résultat: plus de coûts d’urgence, moins de marge de manœuvre et des décisions difficiles à défendre.",
    cta: "Demander la preuve sur historique",
    ctaHint:
      "Lecture seule sur vos exports et API existants. Objectif: rendre visible en quelques jours le conflit économique qui coûte déjà de la marge.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les tensions avant les arbitrages critiques.",
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
          "Quand le risque devient visible, il est souvent déjà plus cher à traiter et les équipes disposent de moins d’options crédibles.",
        consequence:
          "La marge de manœuvre se réduit avant même que la discussion commence.",
        cost: "Le coût d’urgence monte plus vite que la qualité de décision.",
      },
      {
        title: "Les options ne sont pas comparées proprement",
        description:
          "Ops, finance et réseau arbitrent souvent sous pression, sans base commune pour comparer coût, service, capacité et risque.",
        consequence:
          "Les décisions deviennent difficiles à expliquer et à tenir dans la durée.",
        cost: "On choisit plus souvent la vitesse que le meilleur arbitrage.",
      },
      {
        title: "L’impact est rarement relu",
        description:
          "Les décisions s’enchaînent, mais la preuve de ce qu’elles ont réellement protégé ou coûté manque au moment de refaire le même arbitrage.",
        consequence:
          "Les réunions repartent de zéro et les hypothèses restent implicites.",
        cost: "Le ROI est décrit, pas démontré.",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez ce fonctionnement ?",
      signals: [
        "Un même écart métier est visible localement avant d’apparaître clairement dans une lecture commune",
        "Les corrections arrivent quand la marge ou le service sont déjà sous pression",
        "Deux équipes comparables ne prennent pas la même décision face au même signal",
        "Après une action, il reste difficile de savoir ce qu’elle a réellement protégé",
      ],
    },
  },

  solution: {
    kicker: "Produit",
    heading: "Une couche de décision au-dessus de vos outils existants.",
    subheading:
      "Praedixa ne remplace pas votre ERP, votre BI, votre outil de planning ou vos process terrain. Praedixa structure ce qui manque entre eux: un cadre de lecture, de comparaison et de justification des décisions.",
    principles: [
      {
        title: "Voir",
        subtitle: "Tensions et conflits plus tôt",
        description:
          "Praedixa détecte plus tôt les tensions, dérives et conflits opérationnels avant qu’ils ne se transforment en coûts d’urgence.",
      },
      {
        title: "Comparer",
        subtitle: "Coût · service · risque",
        description:
          "Les options sont mises à plat avec des hypothèses explicites pour arbitrer proprement entre niveau de service, capacité, coût et exposition.",
      },
      {
        title: "Prouver",
        subtitle: "Décision documentée · impact relu",
        description:
          "Les décisions gardent leur contexte, leurs hypothèses et leur impact observé pour construire une vraie boucle ROI.",
      },
    ],
    differentiators: {
      title: "Ce que Praedixa ajoute réellement",
      description:
        "Vos outils stockent, reportent, planifient et exécutent. Praedixa ajoute la couche qui aide à arbitrer, comparer, justifier et relire l’impact.",
      items: [
        {
          is: "Une couche d’arbitrage au-dessus de l’existant",
          isNot: "Un planning de plus",
        },
        {
          is: "Un point d’entrée resserré sur les arbitrages qui coûtent cher",
          isNot: "Un outil qui prétend optimiser toute l’entreprise d’un coup",
        },
        {
          is: "Une décision cadrée puis relue dans le temps",
          isNot: "Une recommandation opaque sans preuve après coup",
        },
      ],
    },
  },
};
