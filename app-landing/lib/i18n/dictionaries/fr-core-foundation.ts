import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Plateforme française de DecisionOps",
    description:
      "Praedixa est la plateforme française de DecisionOps: elle se branche sur vos systèmes existants, gouverne les arbitrages critiques et prouve le ROI décision par décision.",
    ogTitle: "Praedixa | DecisionOps pour les opérations",
    ogDescription:
      "Praedixa fédère les systèmes qui comptent pour une décision, calcule les options coût / service / risque et prouve le ROI décision par décision.",
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
    ctaPrimary: "Obtenir le diagnostic ROI gratuit",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "DecisionOps · RH · Finance · Opérations · Supply Chain",
    headline: "DecisionOps",
    headlineHighlight:
      "Anticiper vos besoins. Décidez plus tôt. Prouvez le ROI.",
    subtitle:
      "Praedixa se branche sur vos systèmes existants, fédère les données critiques sur une infrastructure hébergée en France, transforme vos arbitrages récurrents en décisions calculées, exécutées et auditables, puis prouve le ROI décision par décision en comité Ops / Finance.",
    manifestoLabel: "",
    manifestoQuote:
      "Accompagner la croissance des entreprises en révélant le potentiel de leurs données.",
    bullets: [
      {
        metric: "DecisionOps",
        text: "sur l'existant",
      },
      {
        metric: "Action validée",
        text: "dans vos outils",
      },
      {
        metric: "ROI prouvé",
        text: "décision par décision",
      },
    ],
    ctaPrimary: "Obtenir le diagnostic ROI gratuit",
    ctaSecondary: "Voir comment ça marche",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta: "",
    trustBadges: [
      "DecisionOps au-dessus de l'existant",
      "Fédération légère des systèmes critiques",
      "Arbitrages coût / service / risque gouvernés",
      "Première action déclenchée dans vos outils",
      "Validation humaine requise",
      "Preuve mensuelle décision par décision",
      "Diagnostic ROI gratuit sur vos donnees existantes",
      "Complement de stack, sans remplacement d'outil",
      "Gouvernance et securite integrees",
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
    heading: "Quand les données restent en silos, la marge fuit.",
    subheading:
      "RH, finance, opérations, Excel, ERP, terrain: chacun a ses chiffres. Le vrai problème, c'est qu'ils ne racontent pas la même histoire au bon moment. Résultat: argent perdu, priorités floues et décisions difficiles a défendre.",
    cta: "Obtenir le diagnostic ROI gratuit",
    ctaHint:
      "Réponse sous 48h ouvrées. Diagnostic ROI offert. Démarrage sur vos fichiers et outils existants, en lecture seule.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les points de friction avant vos arbitrages business.",
      emptyTitle: "Aucun signal remonte",
      emptyBody:
        "Ajoutez des cas concrets a prioriser pour composer votre lecture business.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage de problème ne peut pas être affiché pour le moment.",
    },
    pains: [
      {
        title: "Les chiffres sont dispersés",
        description:
          "Une partie est dans les outils RH, une autre dans la finance, une autre dans l'opérationnel.",
        consequence:
          "Personne n'a une vision complète de ce qui coûte vraiment cher.",
        cost: "La marge se dilue",
      },
      {
        title: "Chaque équipe lit autre chose",
        description:
          "Ops, RH et finance arrivent souvent en réunion avec des tableaux différents.",
        consequence:
          "Les arbitrages prennent du temps et personne n'est vraiment aligné.",
        cost: "Les décisions ralentissent",
      },
      {
        title: "Le ROI reste flou",
        description:
          "On lance des actions, mais on ne sait pas clairement ce qui rapporte vraiment.",
        consequence:
          "Les budgets restent discutés et les priorités bougent sans cesse.",
        cost: "L'argent gagné n'est pas prouvé",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez ce fonctionnement ?",
      signals: [
        "En reunion, vous commencez par reconcilier les chiffres avant de decider",
        "Un meme ecart terrain ne declenche pas la meme action selon le site",
        "Les arbitrages sont souvent justifies apres coup, rarement compares avant",
        "Apres une action, il est difficile de relier clairement le gain au choix fait",
      ],
    },
  },

  solution: {
    kicker: "DecisionOps",
    heading: "DecisionOps au-dessus de vos outils existants.",
    subheading:
      "Le marché sait déjà prévoir, planifier et simuler. Praedixa apporte autre chose: une fédération des données utiles sur l'existant, des arbitrages gouvernés, une première action déclenchée dans vos outils et une preuve finance-grade du ROI.",
    principles: [
      {
        title: "Fédérer les systèmes qui comptent pour une décision",
        subtitle: "Lecture seule · hébergé en France",
        description:
          "Exports, API, ERP, planning, BI ou Excel sont reliés sans projet de remplacement pour donner un cerveau commun aux arbitrages.",
      },
      {
        title: "Transformer l'arbitrage en décision gouvernée",
        subtitle: "Coût · Service · Risque",
        description:
          "Praedixa compare les options autorisées, rend le choix explicite, garde les garde-fous métier et prépare l'action au lieu de laisser un simple signal.",
      },
      {
        title: "Déclencher et prouver",
        subtitle: "Action validée · ROI finance-grade",
        description:
          "La première étape validée part dans les outils existants, puis la décision est relue avec baseline / recommandé / réel et hypothèses explicites.",
      },
    ],
    differentiators: {
      title: "La différence est dans la combinaison DecisionOps",
      description:
        "Praedixa ne gagne pas sur une brique isolée. Le différenciateur est la combinaison produit empaquetée comme coeur d'exécution.",
      items: [
        {
          is: "Fédération gouvernée sur l'existant",
          isNot: "Projet data ou remplacement d'outils",
        },
        {
          is: "Decision Journal + premiere action dans les outils",
          isNot: "Signal ou dashboard sans execution",
        },
        {
          is: "Preuve mensuelle decision par decision",
          isNot: "ROI marketing generique sans tracabilite",
        },
      ],
    },
  },
};
