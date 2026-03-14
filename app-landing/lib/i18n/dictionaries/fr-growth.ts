import { frCoreConversion } from "./fr-core-conversion";
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
    kicker: "Sécurité & IT",
    heading:
      "Déploiement sobre au départ, compatible avec une revue IT sérieuse.",
    subheading:
      "Praedixa commence en lecture seule sur vos exports, API ou outils existants. L’objectif est de créer vite une première lecture utile sans ouvrir un chantier SI lourd avant la preuve d’intérêt.",
    tiles: [
      {
        title: "Connexion à l’existant",
        description:
          "Le premier périmètre se branche sur l’existant pour objectiver les arbitrages avant toute intégration plus poussée.",
      },
      {
        title: "Données agrégées",
        description:
          "Le démarrage présenté ici travaille au niveau site, équipe ou activité, pas au niveau individuel.",
      },
      {
        title: "Exports CSV / Excel ou API",
        description:
          "Praedixa démarre sur ce que vous avez déjà, sans exiger un remplacement d’outil ou une refonte de process.",
      },
      {
        title: "Cadre de sécurité clair",
        description:
          "Chiffrement, contrôle d’accès et journalisation sont pensés pour entrer dans une discussion IT sérieuse sans lourdeur inutile.",
      },
      {
        title: "Hébergement France",
        description:
          "La plateforme et les données sont hébergées en France sur Scaleway.",
      },
      {
        title: "Montée en charge progressive",
        description:
          "L’intégration s’élargit seulement quand la valeur business est prouvée et que le contexte le justifie.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack actuelle",
      description:
        "Praedixa se branche au-dessus de l’existant pour structurer la décision, pas pour imposer un remplacement.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "L’intégration doit rassurer la revue IT, pas monopoliser la conversation avant que la valeur business soit prouvée.",
  },

  pilot: {
    kicker: "Pilote",
    heading: "3 mois pour construire un premier cadre de décision utile.",
    subheading:
      "Le pilote ne vend pas une transformation floue. Il installe une première lecture, calibre les hypothèses, documente les arbitrages et prépare la suite sans lourdeur inutile.",
    statusLabels: ["Lecture initiale", "Calibration", "Cadence pilote"],
    included: {
      title: "Ce que le pilote construit",
      items: [
        "Une première lecture utile sur vos données existantes",
        "Les arbitrages prioritaires rendus visibles",
        "Des hypothèses coût / service / risque explicites",
        "Un dossier de décision relisible par Ops et Finance",
        "Une méthode réutilisable pour la suite",
      ],
    },
    excluded: {
      title: "Ce que le pilote n’est pas",
      items: [
        "Une refonte de votre stack",
        "Un projet SI avant la preuve de valeur",
        "Un audit sans suite opérable",
        "Un tableau de bord de plus",
        "Une promesse d’optimiser toute l’entreprise d’un coup",
      ],
    },
    kpis: {
      title: "Ce que le pilote cadre",
      items: [
        "Tensions prioritaires",
        "Hypothèses économiques",
        "Options comparées",
        "Décisions prises",
        "Impacts relus",
      ],
    },
    governance: {
      title: "Rythme de travail",
      items: [
        "Référent opérationnel identifié",
        "Point court hebdomadaire",
        "Relecture Ops / Finance structurée",
        "Journal de décision partagé",
      ],
    },
    selection: {
      title: "Pré-requis",
      items: [
        "Organisation multi-sites",
        "Exports ou API exploitables",
        "Sponsor opérationnel disponible",
      ],
    },
    upcoming: {
      title: "Après le pilote",
      description:
        "Si la preuve est là, Praedixa s’étend progressivement aux arbitrages où la marge gagne le plus à être protégée.",
    },
    urgency:
      "Réponse sous 48h ouvrées. Démarrage possible sans intégration SI lourde.",
    ctaPrimary: "Parler du pilote",
    ctaMeta: "Référent identifié · rythme hebdomadaire · mise en place cadrée",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses courtes pour décider si le point d’entrée Praedixa mérite d’être ouvert maintenant.",
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
          "Non pour le point d’entrée présenté ici. Le démarrage se fait sur des données agrégées par site, équipe ou activité.",
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
      "Premier point d’entrée resserré sur les arbitrages qui coûtent cher",
    ],
    ctaPrimary: "Demander la preuve sur historique",
    ctaSecondary: "Voir le protocole de mise en place",
  },

  servicesPage: frCoreConversion.servicesPage as Dictionary["servicesPage"],

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
