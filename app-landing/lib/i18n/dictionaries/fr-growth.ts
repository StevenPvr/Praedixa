import type { Dictionary } from "../types";

export const frGrowth: Pick<
  Dictionary,
  | "security"
  | "pilot"
  | "faq"
  | "contact"
  | "servicesPage"
  | "footer"
  | "stickyCta"
  | "form"
> = {
  security: {
    kicker: "Overlay & données",
    heading: "Fédérer les systèmes critiques sans remplacer vos outils.",
    subheading:
      "CSV, Excel, API, ERP, outils RH ou finance: Praedixa se branche en lecture seule sur les systèmes qui comptent pour une décision et les relie dans une infrastructure hébergée en France.",
    tiles: [
      {
        title: "Fédération légère",
        description:
          "Praedixa demarre sur vos exports et API existants. Pas besoin de remplacer vos outils.",
      },
      {
        title: "Cadre de décision commun",
        description:
          "Les données RH, finance, opérations et supply chain sont reliées dans un même cadre de décision.",
      },
      {
        title: "Données utiles",
        description:
          "On travaille au niveau site, équipe, activité ou réseau pour garder une lecture claire.",
      },
      {
        title: "Garde-fous métier",
        description:
          "Chaque arbitrage reste gouverne par vos regles internes, vos seuils et votre validation humaine.",
      },
      {
        title: "Sécurité",
        description:
          "Chiffrement, contrôle d'accès et journalisation des actions pour garder un cadre propre.",
      },
      {
        title: "Comparaison multi-sites",
        description:
          "Vous voyez rapidement où ça marche, où ça fuit et où agir en premier.",
      },
      {
        title: "Hébergé en France (Scaleway)",
        description:
          "Plateforme et données hébergées en France (Paris), avec une posture de transparence sur les pratiques de sécurité.",
      },
    ],
    compatibility: {
      title: "Compatible avec vos outils en place",
      description:
        "Praedixa complète l'existant et fédère les systèmes critiques pour gouverner les arbitrages.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le vrai sujet n'est pas d'avoir plus de données. C'est de transformer les arbitrages critiques en décisions calculées, exécutées et auditables.",
  },

  pilot: {
    kicker: "Déploiement Praedixa",
    heading: "Une mise en place cadrée avant l'abonnement.",
    subheading:
      "Après la preuve sur historique, Praedixa démarre par un onboarding fixe pour relier l'existant, cadrer les arbitrages prioritaires et installer le suivi des gains.",
    statusLabels: ["Preuve sur historique", "Onboarding", "Abonnement annuel"],
    included: {
      title: "Ce que vous obtenez",
      items: [
        "Preuve sur historique offerte sur vos données existantes",
        "Onboarding fixe sur un périmètre multi-sites réaliste",
        "Une fédération RH, finance, opérations et supply chain sur l'existant",
        "Les arbitrages ou sujets à plus fort potentiel de gain",
        "Un plan d'action priorisé avec impact attendu",
        "Un suivi des gains simple à relire en comité",
        "Un Decision Journal et un rythme commun Ops + Finance pour décider avec une base commune",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Refonte de vos outils existants",
        "Projet IT long avant les premiers résultats",
        "Black box incompréhensible pour les équipes",
        "Promesse irréaliste sans base historique ni méthode",
        "Usine à gaz impossible à relire en comité",
      ],
    },
    kpis: {
      title: "Ce que nous suivons",
      items: [
        "L'argent perdu aujourd'hui",
        "Le potentiel de gain objectivé pendant la preuve sur historique",
        "Les arbitrages mis en place et leur impact réel",
        "L'alignement RH / Finance / Operations",
        "La vitesse de décision et la clarté des priorités",
      ],
    },
    governance: {
      title: "Gouvernance",
      items: [
        "Point hebdomadaire opérations",
        "Revue mensuelle Opérations + Finance",
        "Sponsor opérations identifié côté client",
        "Journal de décision et preuve mensuelle partagés",
      ],
    },
    selection: {
      title: "Critères d’éligibilité",
      items: [
        "Organisation multi-sites avec arbitrages récurrents entre coût, service et risque",
        "Sponsor opérations et sponsor finance disponibles",
        "Exports ou outils exploitables côté RH, finance et opérations",
      ],
    },
    upcoming: {
      title: "Après la mise en place",
      description:
        "Praedixa tourne ensuite en abonnement annuel pour industrialiser la détection, la priorisation et la preuve d'impact dans le temps.",
    },
    urgency:
      "Réponse sous 48h ouvrées. Onboarding fixe déduit en cas d'engagement annuel.",
    ctaPrimary: "Parler du déploiement",
    ctaMeta:
      "5 jours ouvrés pour la preuve · onboarding fixe · abonnement annuel",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses claires pour COO/Ops, CFO/DAF et responsables multi-sites.",
    signalLabel: "Repères",
    signalBody:
      "Des réponses formulées pour aider une décision rapide entre Opérations, Finance et IT.",
    categoryHint: "Choisir une catégorie puis ouvrir une question",
    liveLabel: "Bloc FAQ dynamique",
    loadingLabel: "Chargement des réponses…",
    emptyTitle: "Aucune question sur cette catégorie",
    emptyBody:
      "Sélectionnez une autre catégorie pour afficher des réponses exploitables.",
    errorTitle: "La section FAQ ne peut pas être affichée",
    errorBody:
      "La catégorie active est invalide. Réinitialisez sur la première catégorie.",
    retryLabel: "Réinitialiser la catégorie",
    categories: [
      "Comprendre Praedixa",
      "Pilote & tarification",
      "Technique & données",
    ],
    items: [
      {
        question: "Praedixa, c'est quoi en une phrase ?",
        answer:
          "Praedixa aide les entreprises multi-sites à objectiver et piloter les arbitrages opérationnels qui ont le plus d'impact sur la marge, sans remplacer leurs outils.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Faut-il comprendre la data science ou un modèle compliqué pour utiliser Praedixa ?",
        answer:
          "Non. La complexité reste chez nous. Côté client, vous voyez une base claire: pertes, priorités, actions et ROI.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qu'est-ce que vous réunissez concrètement ?",
        answer:
          "Les données utiles pour décider: RH, finance, opérations, activités site par site, exports Excel/CSV, ERP, BI ou autres outils déjà en place.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Que voit-on concrètement dans Praedixa ?",
        answer:
          "Des arbitrages gouvernés: quelles options comparer, quel choix valider, quelle première action lancer et ce qui a vraiment rapporté ensuite.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qui prend la décision finale ?",
        answer:
          "Toujours vos équipes. Praedixa aide à lire, comparer et prioriser. La décision finale reste côté client.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quelle différence avec un outil de planning ou un ERP ?",
        answer:
          "Praedixa ne remplace pas vos outils. La plateforme gouverne les arbitrages qui traversent vos outils, les journalise et les relie à une preuve ROI.",
        category: "Comprendre Praedixa",
      },
      {
        question: "La preuve sur historique offerte couvre quoi ?",
        answer:
          "Une lecture en 5 jours ouvrés sur vos données pour objectiver les arbitrages prioritaires, le potentiel de gain et la pertinence d'un déploiement.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se structure la mise en place ?",
        answer:
          "On commence par la preuve sur historique. Si le potentiel est confirmé, l'onboarding fixe met Praedixa en place sur un périmètre ciblé avant l'abonnement annuel.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment prouvez-vous le ROI ?",
        answer:
          "En comparant la situation de départ, les actions lancées et les gains observés dans un dossier simple à relire par la direction, la finance et les opérations.",
        category: "Pilote & tarification",
      },
      {
        question: "Quelles données faut-il pour démarrer ?",
        answer:
          "Vos exports existants ou vos outils actuels: RH, finance, opérations, activité, coûts, planning ou autres données utiles selon votre contexte.",
        category: "Technique & données",
      },
      {
        question: "Faut-il une intégration IT lourde ?",
        answer:
          "Non. Praedixa démarre en lecture seule via exports ou API, puis s'étend seulement si cela crée de la valeur.",
        category: "Technique & données",
      },
      {
        question: "Traitez-vous des données individuelles ?",
        answer:
          "Non. Praedixa fonctionne sur des données agrégées équipe/site et n'effectue pas de prédiction individuelle.",
        category: "Technique & données",
      },
      {
        question: "Comment gérez-vous les règles internes et les garde-fous ?",
        answer:
          "Praedixa s'adapte a vos règles et garde-fous. L'idée n'est pas de forcer vos équipes, mais de leur donner une meilleure lecture pour décider.",
        category: "Technique & données",
      },
      {
        question: "Peut-on commencer petit ?",
        answer:
          "Oui. Beaucoup d'équipes commencent par une preuve sur historique sur un périmètre resserré avant de lancer le déploiement.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Contact",
    heading: "Demander la preuve sur historique.",
    subheading:
      "Partagez votre contexte. On revient avec une lecture claire des arbitrages prioritaires, du potentiel objectivable et du prochain pas recommandé.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Preuve sur historique offerte",
      "5 jours ouvrés sur données existantes",
      "Lecture seule via exports/API",
    ],
    ctaPrimary: "Demander la preuve sur historique",
    ctaSecondary: "Voir le protocole de mise en place",
  },

  servicesPage: {
    meta: {
      title: "Praedixa | Déploiement complet vs preuve sur historique",
      description:
        "Comparez la preuve sur historique et le déploiement Praedixa pour choisir le bon point d'entrée.",
      ogTitle: "Praedixa | Déploiement ou preuve sur historique",
      ogDescription:
        "Deux façons de démarrer: une preuve sur historique en 5 jours ou la mise en place Praedixa dans la durée.",
    },
    kicker: "Offre",
    heading: "Déploiement Praedixa vs preuve sur historique.",
    subheading:
      "Vous pouvez commencer par une preuve sur historique d'une semaine, puis lancer la mise en place Praedixa avec un onboarding fixe déduit en cas d'engagement annuel.",
    fullPackage: {
      badge: "Déploiement Praedixa",
      title: "Mettre Praedixa en place dans la durée",
      summary:
        "Le cœur de valeur Praedixa: une cadence de décision multi-sites suivie, relisible et orientée marge.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Onboarding fixe sur un périmètre multi-sites réaliste",
        "Systèmes RH, finance, opérations et supply chain fédérés",
        "Priorités business suivies dans le temps",
        "Cadence de revue Ops / Finance",
        "Impact prouvé arbitrage par arbitrage",
        "Extension progressive aux sites et sujets les plus rentables",
      ],
      cta: "Parler du déploiement Praedixa",
    },
    forecastsOnly: {
      badge: "Preuve sur historique",
      title: "Vérifier rapidement le potentiel",
      summary:
        "Une lecture en 5 jours ouvrés pour voir où la marge fuit et si Praedixa peut créer un gain mesurable.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Analyse de vos données existantes",
        "Objectivation des arbitrages prioritaires",
        "Estimation du potentiel de gain",
        "Démarrage lecture seule via exports/API",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas de suivi mensuel des gains",
        "Pas d'onboarding outillé",
        "Pas de cadence continue de décision",
      ],
      cta: "Demander la preuve sur historique",
    },
    comparison: {
      title: "Comparatif rapide",
      columns: [
        {
          criterion:
            "Lecture des données RH, finance, opérations et supply chain",
          fullPackage: "Inclus",
          forecastsOnly: "Inclus",
        },
        {
          criterion: "Priorités business classées par impact",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Plan d'action suivi dans le temps",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Suivi du ROI multi-sites",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Cadence direction / finance / opérations",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand choisir chaque mode",
      items: [
        "Choisissez le déploiement Praedixa si vous voulez industrialiser la décision et suivre les gains dans le temps.",
        "Choisissez la preuve sur historique si vous voulez d'abord objectiver le potentiel avant engagement.",
        "Vous pouvez commencer par la preuve puis lancer la mise en place sans changer d'outil.",
      ],
    },
    bottomNote:
      "La preuve sur historique réduit le risque d'entrée. La vraie valeur commence quand Praedixa est mis en place dans la durée.",
  },

  footer: {
    tagline:
      "Praedixa aide les équipes multi-sites à anticiper les risques business qui pèsent sur la performance, puis à suivre les décisions lancées dans le temps.",
    badges: ["Preuve sur historique", "Impact relu"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Les risques business coûtent cher quand ils sont vus trop tard.",
      cta: "Demander la preuve sur historique",
    },
  },

  stickyCta: {
    text: "Demander la preuve sur historique",
  },

  form: {
    pageTitle: "Demande de déploiement Praedixa",
    pageSubtitle:
      "Cette demande permet de cadrer la mise en place, l'onboarding et l'engagement annuel sur un périmètre réaliste.",
    pill: "Déploiement Praedixa",
    valuePoints: [
      "Cadrage de mise en place multi-sites",
      "Onboarding fixe déduit si engagement annuel",
      "Réponse sous 48h ouvrées",
    ],
    estimatedTime: "Temps estimé",
    estimatedTimeValue: "Quelques minutes",
    fieldsets: {
      organisation: "Organisation",
      contact: "Contact",
      challenges: "Enjeux",
    },
    fields: {
      companyName: { label: "Entreprise", placeholder: "Ex : Groupe Atlas" },
      sector: { label: "Secteur" },
      employeeRange: { label: "Effectif" },
      siteCount: { label: "Nombre de sites" },
      firstName: { label: "Prénom" },
      lastName: { label: "Nom" },
      role: { label: "Fonction" },
      email: {
        label: "Email professionnel",
        placeholder: "vous@entreprise.com",
      },
      phone: { label: "Téléphone", placeholder: "06 00 00 00 00" },
      timeline: { label: "Horizon projet" },
      currentStack: {
        label: "Outils actuels (optionnel)",
        placeholder: "Ex : ERP + CRM + BI",
      },
      painPoint: {
        label: "Principal arbitrage à optimiser",
        placeholder:
          "Décrivez où vous perdez aujourd'hui le plus d'argent ou de temps.",
      },
    },
    select: "Sélectionner",
    consent: "J'accepte les {cgu} et la {privacy}.",
    cguLabel: "CGU",
    privacyLabel: "politique de confidentialité",
    submit: "Envoyer ma candidature",
    submitting: "Envoi en cours…",
    success: {
      title: "Candidature transmise",
      description:
        "Nous revenons vers vous sous 48h ouvrées avec un cadrage adapté a votre contexte et une proposition de mise en place.",
      backToSite: "Retour au site",
      checkEmail: "Voir le protocole de mise en place",
    },
    error: "Une erreur est survenue. Veuillez réessayer.",
    sectors: [
      "HCR",
      "Enseignement supérieur",
      "Logistique / Transport / Retail",
      "Automobile / concessions / ateliers",
      "BTP",
      "Services",
      "Autre",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1 000", "1 000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Direction des opérations",
      "Responsable réseau multi-sites",
      "Responsable opérations / atelier",
      "Supply / Inventory manager",
      "DAF / Direction financière",
      "Direction générale",
      "Autre",
    ],
    timelines: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  },
};
