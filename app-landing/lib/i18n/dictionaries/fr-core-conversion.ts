import type { Dictionary } from "../types";

export const frCoreConversion: Partial<Dictionary> = {
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
          "Praedixa anticipe les risques business qui dégradent la performance et recommande les meilleures décisions pour les réduire, en commençant par le risque prioritaire de votre périmètre.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Faut-il comprendre la data science ou un modèle compliqué pour utiliser Praedixa ?",
        answer:
          "Non. La complexité reste chez nous. Côté client, vous voyez une lecture business simple: pertes, priorités, actions et ROI.",
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
          "Une lecture commune entre RH, finance et opérations: où l'argent fuit, quels sites ou sujets prioriser, quel gain attendre et ce qui a vraiment rapporté.",
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
          "Praedixa s'adapte à vos règles et garde-fous. L'idée n'est pas de forcer vos équipes, mais de leur donner une meilleure lecture pour décider.",
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
    heading: "Demander la preuve sur historique.",
    subheading:
      "Envoyez vos données ou vos exports. On revient avec une lecture simple: quels arbitrages prioriser, quel potentiel objectiver et quel prochain pas recommander.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Preuve sur historique offerte",
      "Lecture seule via exports/API",
      "5 jours ouvrés sur données existantes",
    ],
    ctaPrimary: "Demander la preuve sur historique",
    ctaSecondary: "Voir le protocole de mise en place",
  },

  servicesPage: {
    meta: {
      title: "Praedixa | Plateforme ROI complète vs diagnostic ROI initial",
      description:
        "Comparez la plateforme Praedixa complète et le diagnostic ROI initial pour choisir votre meilleur point d'entrée.",
      ogTitle: "Praedixa | Praedixa complet ou diagnostic ROI",
      ogDescription:
        "Deux façons de démarrer: un diagnostic ROI rapide ou la plateforme complète pour réunir les données, prioriser et suivre les gains.",
    },
    kicker: "Service",
    heading: "Praedixa complet vs diagnostic ROI initial.",
    subheading:
      "Vous pouvez démarrer par un diagnostic ROI sur vos données, puis activer la couche complète de priorisation et de suivi.",
    fullPackage: {
      badge: "Praedixa complet",
      title: "Réunir les données, prioriser, suivre le ROI",
      summary:
        "Le cœur de valeur Praedixa: une lecture business commune et un plan d'action rentable.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Données RH, finance et opérations réunies",
        "Priorités business classées par impact",
        "Plan d'action site par site",
        "Suivi du ROI dans le temps",
        "Lecture commune pour comités et équipes",
        "Comparaison multi-sites et standardisation",
      ],
      cta: "Parler du déploiement Praedixa",
    },
    forecastsOnly: {
      badge: "Preuve sur historique",
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
          criterion: "Lecture des données RH, finance et opérations",
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
        "Choisissez Praedixa complet si votre priorité est d'aligner les équipes et de suivre le ROI dans le temps.",
        "Choisissez le diagnostic ROI si vous voulez d'abord objectiver où l'argent se perd.",
        "Vous pouvez commencer petit puis activer Praedixa complet sans changer d'outil.",
      ],
    },
    bottomNote:
      "Le diagnostic ROI est un point de départ. La vraie valeur est dans la lecture commune, la priorisation et le suivi des gains dans le temps.",
  },

  footer: {
    tagline:
      "Praedixa réunit RH, finance et opérations pour montrer où l'argent se perd, quoi prioriser et ce qui rapporte.",
    badges: ["Lecture business commune", "ROI lisible"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Vos données dispersées peuvent rapporter plus. Encore faut-il les faire parler.",
      cta: "Demander la preuve sur historique",
    },
  },

  stickyCta: {
    text: "Demander la preuve sur historique",
  },

  form: {
    pageTitle: "Demande de déploiement Praedixa",
    pageSubtitle:
      "Cette demande permet de cadrer un pilote court, centré sur vos données, vos priorités et votre ROI.",
    pill: "Pilote ROI Praedixa",
    valuePoints: [
      "Preuve sur historique offerte",
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
        label: "Stack actuelle (optionnel)",
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
