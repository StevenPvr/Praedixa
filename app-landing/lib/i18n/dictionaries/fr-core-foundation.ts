import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Déploiement Praedixa pour réseaux multi-sites",
    description:
      "Praedixa aide les réseaux multi-sites à repérer plus tôt les arbitrages qui fragilisent la marge, à comparer les options sous contraintes, puis à relire l’impact réel des décisions prises.",
    ogTitle: "Praedixa | Déploiement Praedixa pour réseaux multi-sites",
    ogDescription:
      "Quand un réseau multi-sites voit trop tard ses arbitrages critiques, la marge part en urgence. Praedixa les fait remonter plus tôt, compare les options et relit l’impact réel des décisions.",
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
    ctaPrimary: "Voir un exemple concret",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Pour COO, directions des opérations et responsables réseau",
    headline: "Décidez plus tôt.",
    headlineHighlight: "Protégez la marge avant que l’opération ne casse.",
    subtitle:
      "Praedixa aide les réseaux multi-sites à repérer plus tôt quand renforcer, réallouer, reporter ou ajuster le niveau de service, puis à comparer les options sous contraintes et à relire l’impact réel des décisions prises.",
    manifestoLabel: "Pour qui Praedixa est fait",
    manifestoQuote:
      "COO, directions des opérations et responsables réseau qui arbitrent tous les jours sous contrainte.",
    bullets: [
      {
        metric: "Pour qui",
        text: "Réseaux multi-sites qui doivent protéger marge et service sans attendre la casse.",
      },
      {
        metric: "Décisions",
        text: "Quand renforcer, réallouer, reporter ou ajuster le niveau de service.",
      },
      {
        metric: "Résultat",
        text: "Des arbitrages comparés plus tôt puis relus sur leur impact réel.",
      },
    ],
    ctaPrimary: "Voir un exemple concret",
    ctaSecondary: "Cadrer un premier périmètre",
    ctaTertiary: "",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta: "Déploiement Praedixa · lecture seule au départ · NDA possible",
    trustBadges: [
      "Lecture seule au démarrage",
      "Données agrégées uniquement",
      "Hébergement France",
      "NDA possible dès le premier échange",
      "Premier point d’entrée: arbitrages de couverture et d’allocation les plus coûteux",
      "Logiciel + mise en place cadrée sur vos données existantes",
      "Lecture par rôle: Ops d’abord, Finance et IT ensuite",
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
    cta: "Voir un exemple concret",
    ctaHint:
      "Exemple public d’un arbitrage logistique: options comparées, décision retenue et impact relu sans passer d’abord par un formulaire.",
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
      "Praedixa ne remplace pas votre ERP, votre BI, votre outil de planning ou vos process terrain. Praedixa ajoute le cadre qui aide à arbitrer plus tôt, comparer les options et relire l’impact des décisions prises.",
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
