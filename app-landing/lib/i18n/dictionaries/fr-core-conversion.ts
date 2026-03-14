import type { Dictionary } from "../types";

export const frCoreConversion: Partial<Dictionary> = {
  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses courtes pour décider si Déploiement Praedixa mérite d’être ouvert maintenant.",
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
          "Praedixa aide les réseaux multi-sites à repérer plus tôt les arbitrages qui fragilisent la marge, à comparer les options sous contraintes, puis à relire l’impact réel des décisions prises.",
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
          "Non pour le périmètre présenté ici. Le démarrage se fait sur des données agrégées par site, équipe ou activité.",
        category: "Données & sécurité",
      },
      {
        question: "À quoi sert la preuve sur historique ?",
        answer:
          "Elle sert à objectiver un premier arbitrage sur vos données existantes, à montrer ce que Praedixa rendrait visible, et à cadrer le déploiement si le sujet mérite d’aller plus loin.",
        category: "Démarrage",
      },
      {
        question: "Que voit-on concrètement dans Praedixa ?",
        answer:
          "Une lecture utile pour les opérations et le réseau: où la marge se fragilise, quelles options comparer, quelle décision cadrer et ce qui a réellement changé ensuite.",
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
    heading:
      "Vous savez déjà où la marge se fragilise. Voyons quelle décision couvrir en premier.",
    subheading:
      "Parlez-nous du réseau, des arbitrages qui reviennent le plus souvent et du prochain pas utile. Déploiement Praedixa d’abord, preuve sur historique si elle aide à objectiver le point de départ.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Lecture seule au démarrage",
      "NDA possible dès le premier échange",
      "Premier périmètre resserré sur les arbitrages qui coûtent cher",
    ],
    ctaPrimary: "Parler du déploiement",
    ctaSecondary: "Demander la preuve sur historique",
  },

  servicesPage: {
    meta: {
      title: "Praedixa | Déploiement Praedixa et preuve sur historique",
      description:
        "Comprendre ce qu’inclut Déploiement Praedixa, quand commencer par la preuve sur historique, et comment cadrer une mise en place logicielle sobre sur vos données existantes.",
      ogTitle: "Praedixa | Déploiement Praedixa et preuve sur historique",
      ogDescription:
        "Une seule offre publique: Déploiement Praedixa. La preuve sur historique sert à objectiver un premier arbitrage et à cadrer la mise en place.",
    },
    kicker: "Offre",
    heading: "Déploiement Praedixa et preuve sur historique.",
    subheading:
      "Une seule offre publique: Déploiement Praedixa. La preuve sur historique sert à objectiver un premier arbitrage sur vos données existantes et à cadrer la mise en place si le sujet mérite d’aller plus loin.",
    fullPackage: {
      badge: "Déploiement Praedixa",
      title: "Logiciel + mise en place cadrée",
      summary:
        "Le cœur de valeur Praedixa: voir plus tôt les arbitrages critiques, comparer les options sous contraintes et relire l’impact dans le temps.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Lecture utile sur vos données existantes",
        "Arbitrages comparés avec hypothèses explicites",
        "Cadre commun Ops / Finance / Réseau",
        "Déploiement logiciel et montée en charge cadrée",
        "Relecture d’impact avant / recommandé / réel",
        "Extension progressive aux arbitrages les plus coûteux",
      ],
      cta: "Parler du déploiement",
    },
    forecastsOnly: {
      badge: "Preuve sur historique",
      title: "Point d’entrée pour objectiver le sujet",
      summary:
        "Une première lecture en lecture seule pour montrer un arbitrage concret, estimer le potentiel, et décider si Déploiement Praedixa mérite d’être lancé.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Lecture en lecture seule sur vos données existantes",
        "Repérage des arbitrages prioritaires",
        "Synthèse simple: options, potentiel, prochain pas",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas de déploiement logiciel complet",
        "Pas de boucle de relecture installée dans le temps",
        "Pas d’extension réseau au-delà du premier périmètre cadré",
      ],
      cta: "Demander la preuve sur historique",
    },
    comparison: {
      title: "Ce qui change réellement",
      columns: [
        {
          criterion: "Lecture utile sur vos données existantes",
          fullPackage: "Inclus",
          forecastsOnly: "Inclus",
        },
        {
          criterion: "Arbitrages comparés sous contraintes",
          fullPackage: "Inclus",
          forecastsOnly: "Partiel",
        },
        {
          criterion: "Déploiement logiciel et cadre de mise en place",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Relecture d’impact dans le temps",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Extension progressive du périmètre multi-sites",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand commencer par la preuve sur historique",
      items: [
        "Commencez par la preuve sur historique si vous devez d’abord objectiver un arbitrage ou convaincre un comité.",
        "Passez directement au déploiement si le besoin, le périmètre et le sponsor sont déjà clairs.",
        "La preuve sur historique n’est pas une autre offre: c’est un point d’entrée vers Déploiement Praedixa.",
      ],
    },
    bottomNote:
      "La preuve sur historique qualifie le démarrage. La vraie valeur est dans Déploiement Praedixa: logiciel, arbitrages comparés, et impact relu dans le temps.",
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
      cta: "Parler du déploiement",
    },
  },

  stickyCta: {
    text: "Parler du déploiement",
  },

  form: {
    pageTitle: "Demande de déploiement Praedixa",
    pageSubtitle:
      "Cette demande permet de cadrer Déploiement Praedixa, le premier périmètre à couvrir et la mise en place sur vos données existantes.",
    pill: "Déploiement Praedixa",
    valuePoints: [
      "Logiciel + mise en place cadrée",
      "Qualification orientée COO / Ops / Réseau",
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
      title: "Demande transmise",
      description:
        "Nous revenons vers vous sous 48h ouvrées avec un cadrage adapté à votre contexte et un prochain pas clair pour le déploiement.",
      backToSite: "Retour au site",
      checkEmail: "Voir l’offre",
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
