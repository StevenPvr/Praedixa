import type { Dictionary } from "../types";

export const frCoreConversion: Partial<Dictionary> = {
  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses courtes pour décider si le wedge Praedixa mérite d’être ouvert maintenant.",
    signalLabel: "Ce que la FAQ clarifie",
    signalBody:
      "De quoi comprendre le point d’entrée, le démarrage et le cadre data sans jargon de plomberie.",
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
    categories: ["Comprendre Praedixa", "Démarrage", "Données & sécurité"],
    items: [
      {
        question: "Praedixa, c'est quoi en une phrase ?",
        answer:
          "Praedixa est une couche de décision pour organisations multi-sites qui aide à arbitrer entre coût, capacité, service et risque, puis à relire l’impact des décisions prises.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Praedixa remplace-t-il nos outils existants ?",
        answer:
          "Non. Praedixa s’appuie sur l’existant et structure la décision au-dessus des outils déjà en place.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Faut-il lancer une grosse intégration pour démarrer ?",
        answer:
          "Non. Praedixa peut démarrer en lecture seule sur vos exports ou API existants, puis s’étendre seulement si cela crée de la valeur.",
        category: "Démarrage",
      },
      {
        question: "Traitez-vous des données individuelles ?",
        answer:
          "Non pour le wedge présenté ici. Le démarrage se fait sur des données agrégées par site, équipe ou activité.",
        category: "Données & sécurité",
      },
      {
        question: "Quel est l’objectif du pilote ?",
        answer:
          "Construire un premier cadre de décision utile: tensions prioritaires, hypothèses explicites, arbitrages comparés et relecture d’impact.",
        category: "Démarrage",
      },
      {
        question: "Que voit-on concrètement dans Praedixa ?",
        answer:
          "Une lecture commune entre opérations, finance et réseau: où la marge se fragilise, quelles options comparer, quelle décision cadrer et ce qui a vraiment changé ensuite.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Comment Praedixa calcule les arbitrages ?",
        answer:
          "Praedixa combine prévision, apprentissage statistique et optimisation sous contrainte pour comparer les options dans un cadre exploitable par les équipes. La relecture des résultats mobilise aussi des modèles économétriques pour distinguer plus proprement ce qui relève du contexte, de la décision prise et de l’impact observé.",
        category: "Comprendre Praedixa",
      },
    ],
  },

  contact: {
    kicker: "Dernier pas",
    heading: "Vos équipes décident déjà tous les jours sous contrainte.",
    subheading:
      "La question est simple: vos arbitrages sont-ils encore pilotés à vue ? Qualification rapide, lecture seule au départ, NDA possible dès le premier échange.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Lecture seule au démarrage",
      "NDA possible dès le premier échange",
      "Premier wedge resserré sur les arbitrages qui coûtent cher",
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
      "Praedixa aide les organisations multi-sites à arbitrer plus tôt entre demande, capacité, coût, service et risque, puis à relire l’impact réel.",
    badges: ["Décisions cadrées", "Preuve ROI relisible"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Les arbitrages qui détruisent la marge sont souvent vus trop tard.",
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
