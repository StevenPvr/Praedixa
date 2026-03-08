import type { Dictionary } from "../types";

export const frCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Réunissez toutes vos données pour mieux décider",
    description:
      "Praedixa réunit vos données RH, finance, opérations et supply chain au même endroit pour anticiper vos besoins, optimiser vos décisions et suivre le ROI sans remplacer vos outils.",
    ogTitle: "Praedixa | Toutes vos données au bon endroit",
    ogDescription:
      "Praedixa regroupe vos données RH, finance, opérations et supply chain pour anticiper vos besoins, optimiser vos décisions et prouver ce qui rapporte.",
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
    kicker: "RH · Finance · Opérations · Supply Chain",
    headline: "Réunissez toutes vos données.",
    headlineHighlight: "Anticipez vos besoins. Optimisez vos décisions.",
    subtitle:
      "Praedixa réunit vos données RH, finance, opérations et supply chain au même endroit. Vous obtenez une base claire pour anticiper les besoins, optimiser les décisions et suivre ce qui rapporte vraiment, sans remplacer vos outils. Infrastructure et hébergement des données en France, sur Scaleway.",
    manifestoLabel: "",
    manifestoQuote:
      "Accompagner la croissance des entreprises en révélant le potentiel de leurs données.",
    bullets: [
      {
        metric: "Toutes vos données",
        text: "au même endroit",
      },
      {
        metric: "Besoins visibles",
        text: "plus tôt",
      },
      {
        metric: "Décisions optimisées",
        text: "et ROI suivi",
      },
    ],
    ctaPrimary: "Obtenir le diagnostic ROI gratuit",
    ctaSecondary: "Voir comment ça marche",
    previewTitle: "Un aperçu de votre lecture business",
    ctaMeta: "",
    trustBadges: [
      "Une seule lecture RH, finance et opérations",
      "Les pertes et les gains potentiels remontent vite",
      "Des priorités business simples a relire",
      "Diagnostic ROI gratuit sur vos donnees existantes",
      "Suivi du ROI simple, lisible, exploitable en comite",
      "Lecture seule sur l'existant. Demarrage leger",
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
    kicker: "Ce que fait Praedixa",
    heading: "Une seule lecture business pour réunir RH, finance et opérations.",
    subheading:
      "Praedixa récupère vos données dispersées, les remet dans le même langage et montre où agir en premier pour gagner de l'argent. Pas de jargon. Pas un dashboard de plus.",
    principles: [
      {
        title: "Réunir les données dispersées",
        subtitle: "RH · Finance · Ops",
        description:
          "Fichiers, exports et outils existants sont rassemblés dans une vue commune, simple a relire.",
      },
      {
        title: "Faire ressortir ce qui coûte cher",
        subtitle: "Pertes et écarts",
        description:
          "Praedixa met en évidence les sites, équipes ou sujets où l'argent fuit et où le potentiel de gain est le plus concret.",
      },
      {
        title: "Prioriser les actions à plus fort ROI",
        subtitle: "Quoi faire d'abord",
        description:
          "Vous savez quoi lancer en premier, combien cela peut rapporter et comment l'expliquer simplement aux équipes.",
      },
    ],
    differentiators: {
      title: "Pas un outil de plus à nourrir",
      description:
        "Praedixa ne rajoute pas de complexité. La plateforme aligne vos équipes autour d'une même lecture business et d'un plan d'action rentable.",
      items: [
        {
          is: "Une lecture commune RH / Finance / Opérations",
          isNot: "Des chiffres dispersés dans plusieurs outils",
        },
        {
          is: "Des priorités business avec impact estimé",
          isNot: "Des analyses trop techniques à décoder",
        },
        {
          is: "Des décisions comparables et orientées ROI",
          isNot: "Des arbitrages au feeling",
        },
      ],
    },
  },
};
