import type { Dictionary } from "../types";

export const frGrowth: Pick<Dictionary, 'security' | 'pilot' | 'faq' | 'contact' | 'servicesPage' | 'footer' | 'stickyCta' | 'form'> = {
  security: {
    kicker: "Overlay & données",
    heading: "Vos données sont déjà là. Praedixa les réunit sans projet lourd.",
    subheading:
      "CSV, Excel, API, ERP, outils RH ou finance: Praedixa part de l'existant, en lecture seule, pour créer une base commune simple à relire.",
    tiles: [
      {
        title: "Connexion légère",
        description:
          "Praedixa démarre sur vos exports et API existants. Pas besoin de remplacer vos outils.",
      },
      {
        title: "Lecture commune",
        description:
          "Les données RH, finance, opérations et supply chain sont regroupées dans un même cadre.",
      },
      {
        title: "Données utiles",
        description:
          "On travaille au niveau site, équipe, activité ou réseau pour garder une lecture claire.",
      },
      {
        title: "Priorités partagées",
        description:
          "Chaque équipe retrouve les mêmes chiffres, le même langage et les mêmes priorités.",
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
        "Praedixa complète l'existant et remet tous vos chiffres dans une même base commune.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le vrai sujet n'est pas d'avoir plus de données. C'est de relier les données déjà là à des décisions qui rapportent.",
  },


  pilot: {
    kicker: "Pilote ROI",
    heading:
      "Un pilote court pour prouver vite que vos données peuvent rapporter plus.",
    subheading:
      "En quelques semaines, Praedixa réunit vos données, sort les priorités et met le ROI au centre des décisions.",
    statusLabels: ["Cadrage", "Premiers gains", "Preuve consolidée"],
    included: {
      title: "Ce que vous obtenez",
      items: [
        "Diagnostic ROI offert sur vos données existantes",
        "Une base commune RH, finance, opérations et supply chain",
        "Les sites, équipes ou sujets à plus fort potentiel de gain",
        "Un plan d'action priorisé avec impact attendu",
        "Un suivi du ROI simple a relire en comite",
        "Un rythme commun Ops + Finance pour décider plus vite",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Refonte de vos outils existants",
        "Projet IT long avant les premiers résultats",
        "Black box incompréhensible pour les équipes",
        "Promesse irréaliste sans cadre ni méthode",
        "Usine a gaz impossible a relire en comité",
      ],
    },
    kpis: {
      title: "Ce que nous suivons",
      items: [
        "L'argent perdu aujourd'hui",
        "Le potentiel de gain par site, équipe ou sujet",
        "Les actions lancées et leur impact réel",
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
        "Organisation multi-sites avec donnees dispersees entre equipes",
        "Sponsor operations et sponsor finance disponibles",
        "Exports ou outils exploitables cote RH, finance et operations",
      ],
    },
    upcoming: {
      title: "Après le pilote",
      description:
        "Vous élargissez progressivement Praedixa aux sites et sujets qui créent le plus de valeur.",
    },
    urgency:
      "Candidatures examinées sous 48h ouvrées. Objectif du pilote: une preuve simple, lisible et orientée ROI x3.",
    ctaPrimary: "Demander un pilote ROI",
    ctaMeta:
      "Diagnostic offert · lecture seule · objectif ROI x3",
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
          "Praedixa relie vos données RH, finance, opérations et supply chain pour rendre les besoins visibles plus tôt, prioriser les actions et suivre le ROI.",
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
          "Une base commune entre RH, finance, opérations et supply chain: où l'argent fuit, quels sites ou sujets prioriser, quel gain attendre et ce qui a vraiment rapporté.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qui prend la décision finale ?",
        answer:
          "Toujours vos équipes. Praedixa aide a lire, comparer et prioriser. La décision finale reste côté client.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quelle différence avec un outil de planning ou un ERP ?",
        answer:
          "Praedixa ne remplace pas vos outils. La plateforme s'appuie dessus pour créer une base commune et un suivi du ROI.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Le diagnostic ROI offert couvre quoi ?",
        answer:
          "Une première lecture sur vos données pour repérer où l'argent se perd, quels sujets ont le plus de potentiel et comment cadrer le pilote.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se structure le pilote sur 3 mois ?",
        answer:
          "On démarre sur l'existant, on aligne les données, on sort les premières priorités, puis on consolide la preuve de valeur site par site et au niveau réseau.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment prouvez-vous le ROI ?",
        answer:
          "En comparant la situation de départ, les actions lancées et les gains observés dans un dossier simple a relire par la direction, la finance et les operations.",
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
          "Oui. Beaucoup d'équipes démarrent par un diagnostic ROI et un périmètre resserré avant d'étendre Praedixa aux sites et sujets les plus rentables.",
        category: "Pilote & tarification",
      },
    ],
  },


  contact: {
    kicker: "Contact",
    heading: "Obtenir le diagnostic ROI gratuit.",
    subheading:
      "Envoyez vos données ou vos exports. On revient avec une lecture simple: où vous perdez de l'argent, quoi prioriser et comment cadrer le pilote.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Diagnostic ROI offert",
      "Lecture seule via exports/API",
      "Aucun engagement post-pilote imposé",
    ],
    ctaPrimary: "Obtenir le diagnostic ROI gratuit",
    ctaSecondary: "Voir le protocole pilote",
  },


  servicesPage: {
    meta: {
      title:
        "Praedixa | Offre Praedixa vs diagnostic ROI",
      description:
        "Comparez l'offre Praedixa complète et le diagnostic ROI pour choisir votre meilleur point d'entrée.",
      ogTitle:
        "Praedixa | Offre Praedixa ou diagnostic ROI",
      ogDescription:
        "Deux façons de démarrer: un diagnostic ROI rapide ou l'offre complète pour réunir les données, prioriser et suivre les gains.",
    },
    kicker: "Offre",
    heading:
      "Offre Praedixa vs diagnostic ROI.",
    subheading:
      "Vous pouvez démarrer par un diagnostic ROI sur vos données, puis passer à l'offre complète pour prioriser les actions et suivre le ROI dans le temps.",
    fullPackage: {
      badge: "Praedixa complet",
      title: "Réunir les données, prioriser, suivre le ROI",
      summary:
        "Le cœur de valeur Praedixa: une base commune, des priorités claires et un plan d'action rentable.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Données RH, finance, opérations et supply chain réunies",
        "Priorités business classées par impact",
        "Plan d'action site par site",
        "Suivi du ROI dans le temps",
        "Base commune pour comités et équipes",
        "Comparaison multi-sites et standardisation",
      ],
      cta: "Demander un pilote ROI Praedixa",
    },
    forecastsOnly: {
      badge: "Diagnostic ROI",
      title: "Point de départ rapide",
      summary:
        "Une première lecture pour voir où l'argent se perd et où Praedixa peut créer le plus de valeur.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Analyse de vos données existantes",
        "Repérage des pertes et des gains potentiels",
        "Démarrage lecture seule via exports/API.",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas de suivi continu du ROI",
        "Pas de priorisation détaillée dans le temps",
        "Pas de cadre multi-sites complet",
      ],
      cta: "Demander un diagnostic ROI",
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
          criterion: "Cadence direction / finance / operations",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand choisir chaque mode",
      items: [
        "Choisissez Praedixa complet si votre priorité est d'aligner les équipes et de suivre le ROI dans le temps.",
        "Choisissez le diagnostic ROI si vous voulez d'abord objectiver où l'argent se perd.",
        "Vous pouvez commencer petit puis activer Praedixa complet sans changer d'outil.",
      ],
    },
    bottomNote:
      "Le diagnostic ROI est un point de départ. La vraie valeur est dans la base commune, la priorisation et le suivi des gains dans le temps.",
  },


  footer: {
    tagline:
      "Une base commune pour anticiper les besoins, optimiser les décisions et suivre le ROI site par site.",
    badges: ["Base commune", "ROI suivi"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Toutes vos données au bon endroit. Des décisions plus claires.",
      cta: "Obtenir le diagnostic ROI gratuit",
    },
  },


  stickyCta: {
    text: "Obtenir le diagnostic ROI gratuit",
  },


  form: {
    pageTitle: "Demande de pilote ROI Praedixa",
    pageSubtitle:
      "Cette demande permet de cadrer un pilote court, centré sur vos données, vos priorités et votre ROI.",
    pill: "Pilote ROI Praedixa",
    valuePoints: [
      "Diagnostic ROI offert",
      "Qualification orientée COO/Ops et CFO/DAF",
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
        "Nous revenons vers vous sous 48h ouvrées avec un cadrage adapté a votre contexte et un plan de diagnostic ROI.",
      backToSite: "Retour au site",
      checkEmail: "Voir le protocole pilote",
    },
    error: "Une erreur est survenue. Veuillez réessayer.",
    sectors: [
      "Restauration / Retail / Hôtellerie",
      "Concessions auto / Atelier",
      "Logistique / Entrepôts",
      "Santé / Cliniques",
      "Industrie / Maintenance",
      "Centres d’appels",
      "Transport",
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
