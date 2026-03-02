import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title:
      "Praedixa | Décisions de couverture multi-sites | Preuve ROI mensuelle",
    description:
      "Audit historique offert, décisions sous contraintes, Decision Log et proof pack ROI mensuel. Praedixa se branche en lecture seule (exports/API) au-dessus de votre WFM/ERP/CRM.",
    ogTitle:
      "Praedixa | Décisions de couverture multi-sites | Preuve ROI",
    ogDescription:
      "Praedixa rend vos décisions défendables: comparaison BAU/0 % vs recommandé vs réel, arbitrages tracés et preuve économique mensuelle.",
  },

  nav: {
    problem: "Problème",
    method: "Méthode",
    services: "Service",
    howItWorks: "Comment ça marche",
    useCases: "Décisions couvertes",
    security: "Intégration & données",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Obtenir l’audit historique (gratuit)",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Service Signature Praedixa · Multi-sites",
    headline: "Décidez mieux sur la couverture.",
    headlineHighlight: "Prouvez le ROI chaque mois.",
    subtitle:
      "Praedixa s’ajoute en lecture seule au-dessus de votre stack (WFM/planning/ERP/CRM). Nous comparons vos options sous contraintes, traçons les arbitrages (Decision Log) et produisons un proof pack ROI mensuel.",
    bullets: [
      {
        metric: "1 mois offert",
        text: "audit historique: ce que vous auriez économisé",
      },
      {
        metric: "3 mois",
        text: "pour installer la boucle décision + preuve ROI",
      },
      {
        metric: "Lecture seule",
        text: "exports/API, sans projet IT lourd",
      },
    ],
    ctaPrimary: "Obtenir l’audit historique (gratuit)",
    ctaSecondary: "Voir le protocole ROI",
    previewTitle: "Un aperçu de ce qui vous attend",
    ctaMeta:
      "COO/Ops et CFO/DAF alignés dès le cadrage · Démarrage sur périmètre restreint",
    trustBadges: [
      "Service Signature: décisions + Decision Log + proof pack ROI",
      "Mode alternatif: prévisions KPI uniquement",
      "Prévisions KPI: Workforce, demande, stock, offre, autres sur demande",
      "Lecture seule via exports/API",
      "Multi-sites: comparabilité, gouvernance, standardisation",
      "Hébergement 100 % Scaleway, 100 % français",
    ],
  },

  preview: {
    kicker: "Un avant-goût",
    heading: "L'interface Praedixa",
    subheading:
      "Découvrez comment l'intelligence de décision se matérialise pour vos opérations.",
    overlayTitle: "Découvrir la web app",
    overlayBody:
      "Ouvrez la vraie interface web app en mode aperçu public, avec une UI identique.",
    overlayCta: "Découvrir la web app",
    overlayBackCta: "Revenir à la vidéo",
    loadingLabel: "Chargement de l’aperçu vidéo…",
    liveBadge: "Aperçu public",
  },

  demo: {
    title: "Aperçu interactif Praedixa",
    subtitle:
      "Parcours produit en environnement d’aperçu, alimenté uniquement par des données fictives.",
    mockBanner:
      "Environnement d’aperçu — toutes les données sont fictives, aucune donnée client n’est utilisée.",
    backToLanding: "Retour à la landing",
    screenAriaLabel: "Aperçu interactif de l'interface Praedixa",
    updatedAtLabel: "Dernière mise à jour de l’aperçu",
    loading: "Chargement des données d’aperçu…",
    empty: "Aucune donnée d’aperçu disponible pour cet écran.",
    error: "Impossible de charger cet écran d’aperçu.",
    retry: "Réessayer",
    openAction: "Ouvrir",
    nav: {
      dashboard: "Dashboard",
      forecasts: "Prévisions",
      actions: "Actions",
      datasets: "Données",
      settings: "Paramètres",
    },
    sections: {
      kpis: "Indicateurs clés",
      alerts: "Alertes prioritaires",
      forecastWindow: "Fenêtre de prévision (7 jours)",
      decisions: "Décisions recommandées",
      datasetsHealth: "Santé des datasets",
      governance: "Cadre de gouvernance",
    },
  },

  problem: {
    kicker: "Problème opérationnel",
    heading:
      "Les décisions coût/service sont prises chaque jour, mais rarement prouvées.",
    subheading:
      "Sans protocole commun COO/CFO, les arbitrages restent défensifs, hétérogènes entre sites et difficiles à justifier économiquement.",
    cta: "Obtenir l’audit historique (gratuit)",
    ctaHint:
      "Réponse sous 48h ouvrées. Audit historique offert. Cadrage COO/Ops + CFO/DAF dès la première semaine.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les points de friction avant arbitrage coût/service.",
      emptyTitle: "Aucun signal remonte",
      emptyBody:
        "Ajoutez des cas opérationnels à prioriser pour composer le journal d’arbitrage.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage de problème ne peut pas être affiché pour le moment.",
    },
    pains: [
      {
        title: "Arbitrages trop tardifs",
        description:
          "Les signaux utiles arrivent quand les marges de manœuvre sont déjà faibles.",
        consequence:
          "Recours d’urgence, surcharge des équipes, qualité de service instable",
        cost: "Le coût de la réaction dépasse le coût de l’anticipation",
      },
      {
        title: "Décision hétérogène selon les sites",
        description:
          "Chaque site applique ses propres règles, sans référentiel commun.",
        consequence:
          "Comparaisons impossibles et gouvernance difficile à standardiser",
        cost: "Budget opérations peu pilotable au niveau réseau",
      },
      {
        title: "Impact économique non attribuable",
        description:
          "Les actions sont lancées, mais l’effet réel reste flou.",
        consequence:
          "Comités COO/DAF sans preuve claire de ce qui fonctionne",
        cost: "Priorités et budgets contestés faute de preuve",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez-vous ?",
      signals: [
        "Vous avez des prévisions, mais pas de protocole de décision tracé",
        "Les overrides sont peu documentés ou non exploitables",
        "Vous ne comparez pas clairement BAU/0 %, recommandé et réel",
        "Les revues multi-sites reposent sur des explications ad hoc",
      ],
    },
  },

  solution: {
    kicker: "Méthode Praedixa",
    heading: "Nous optimisons des décisions, pas des prédictions.",
    subheading:
      "La prévision est un composant. La valeur centrale vient de l'optimisation sous contraintes, de la traçabilité et de la preuve ROI.",
    principles: [
      {
        title: "Prévisions multi-KPI comme input",
        subtitle: "Lire la réalité opérationnelle",
        description:
          "Workforce, demande, stock, offre et autres KPI sur demande : des signaux utiles pour agir, pas une fin en soi.",
      },
      {
        title: "Options comparées sous contraintes",
        subtitle: "Choisir en coût/service/règles",
        description:
          "Chaque option est évaluée selon vos contraintes métier pour expliciter les arbitrages avant exécution.",
      },
      {
        title: "Decision Log + proof pack ROI",
        subtitle: "Tracer et prouver",
        description:
          "Recommandation, override, raison, résultat puis comparaison BAU/0% vs 100% vs réel dans un cadre mensuel exploitable.",
      },
    ],
    differentiators: {
      title: "Ce que nous optimisons / ce que nous utilisons",
      description:
        "Un seul produit Praedixa, avec un Service Signature complet et un mode prévisions KPI uniquement.",
      items: [
        {
          is: "Service Signature Praedixa (full package)",
          isNot: "Module de prévision isolé sans couche décisionnelle",
        },
        {
          is: "Couche décisionnelle au-dessus de votre stack",
          isNot: "Remplacement WFM/planning/ERP",
        },
        {
          is: "Preuve ROI BAU/0% vs 100% vs réel",
          isNot: "Reporting sans attribution décisionnelle",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocole pilote",
    heading: "Pilote Signature Praedixa en 4 étapes.",
    subheading:
      "1 mois d’audit historique offert, jalon de preuve en S8, consolidation à 3 mois.",
    steps: [
      {
        number: "01",
        title: "Cadrage + audit offert",
        subtitle: "Historique & baseline BAU/0%",
        description:
          "Mois 1 : audit sur vos données historiques pour estimer ce que vous auriez économisé avec les recommandations Praedixa.",
      },
      {
        number: "02",
        title: "Initialisation lecture seule",
        subtitle: "Exports/API existants",
        description:
          "Connexion en lecture seule via CSV/Excel/API. Mise en place des prévisions KPI (Workforce, demande, stock, offre, autres sur demande).",
      },
      {
        number: "03",
        title: "Optimisation & Decision Log",
        subtitle: "Options, overrides, raisons",
        description:
          "Comparaison d'options sous contraintes coût/service/règles métier. Chaque décision est tracée : recommandation, override, raison, résultat.",
      },
      {
        number: "04",
        title: "Preuve ROI & gouvernance",
        subtitle: "S8 puis M3",
        description:
          "Proof pack BAU/0% vs 100% vs réel, revues COO/Ops + CFO/DAF, standardisation multi-sites et plan de passage à l'échelle.",
      },
    ],
  },

  useCases: {
    kicker: "Décisions couvertes",
    heading: "Un produit, plusieurs outcomes opérationnels.",
    subheading:
      "Même moteur de décision pour plusieurs verticales : restauration, retail, hôtellerie, concessions/atelier, logistique, santé, industrie, centres d’appels.",
    labels: {
      context: "Contexte",
      action: "Levier décisionnel",
      impact: "Preuve attendue",
    },
    cases: [
      {
        id: "volatilite",
        title: "Pics de demande multi-sites",
        context:
          "Rush et variations de volumes qui déstabilisent la capacité terrain.",
        action:
          "Prévisions demande + Workforce, options de renfort/réaffectation, arbitrage coût/service explicite.",
        result:
          "Moins de décisions de dernière minute et meilleure tenue du niveau de service.",
      },
      {
        id: "absenteisme",
        title: "Compétences rares et absences",
        context:
          "Planning fragilisé par absences, indisponibilités critiques et dépendances atelier/soins/maintenance.",
        action:
          "Priorisation par criticité, recommandations de couverture alternatives, overrides tracés.",
        result:
          "Continuité opérationnelle plus robuste et réduction du mode urgence.",
        callout:
          "Aucune donnée individuelle — pilotage au niveau équipe/site uniquement.",
      },
      {
        id: "intersite",
        title: "Arbitrages de capacité inter-sites",
        context:
          "Ressources limitées à distribuer entre sites ou ateliers en concurrence.",
        action:
          "Comparaison d'options entre sites avec contraintes locales et objectifs réseau.",
        result:
          "Décisions comparables, gouvernance standardisée, arbitrages défendables en comité.",
        callout:
          "Praedixa structure la décision. L'entreprise garde toujours la décision finale.",
      },
      {
        id: "roi",
        title: "Revue mensuelle COO/CFO",
        context:
          "Difficulté à relier décisions terrain et impact économique réel.",
        action:
          "Decision Log + protocole de comparaison BAU/0%, 100% recommandé, réel.",
        result:
          "Proof pack mensuel exploitable pour priorités, budgets et renouvellement.",
      },
    ],
  },

  deliverables: {
    kicker: "Preuve ROI",
    heading: "Le différenciant : Decision Log + protocole de preuve.",
    subheading:
      "Pas de claim opaque : trois référentiels comparés dans un cadre explicite et reproductible.",
    roiFrames: [
      {
        label: "BAU / 0% (baseline)",
        value: "Référence historique de vos décisions habituelles",
        note: "Ce scénario sert de point de comparaison stable : ce qui se serait passé sans recommandations Praedixa.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Scenario 100% recommande",
        value: "Impact théorique si les recommandations étaient suivies",
        note: "Ce scénario mesure le potentiel de l'optimisation de décision sous vos contraintes métier.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Scénario réel observé",
        value: "Décisions appliquées + overrides et raisons tracés",
        note: "Le réel capte ce qui a vraiment été fait sur le terrain pour prouver l'impact économique net.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
    ],
    checklist: [
      "Decision Log complet : recommandation, override, raison, résultat",
      "KPI de preuve : coût opérationnel, service level, recours d'urgence, stabilité planning",
      "Comparaison BAU/0% vs 100% vs réel au niveau site et réseau",
      "Rituel mensuel COO/Ops + CFO/DAF",
      "Proof pack exploitable en comité de direction",
    ],
  },

  security: {
    kicker: "Intégration & données",
    heading: "Lecture seule, démarrage rapide, gouvernance claire.",
    subheading:
      "Praedixa s'installe au-dessus de l'existant sans projet IT lourd, puis standardise la lecture décisionnelle multi-sites.",
    tiles: [
      {
        title: "Connexion lecture seule via exports/API",
        description:
          "Démarrage sur CSV/Excel/API existants. Pas de remplacement de vos outils WFM/planning/ERP/CRM.",
      },
      {
        title: "Prévisions multi-KPI comme composant",
        description:
          "Workforce, demande, stock, offre et autres KPI sur demande selon vos priorités opérationnelles.",
      },
      {
        title: "Données agrégées uniquement",
        description:
          "Aucune prédiction individuelle. Pilotage au niveau équipe/site pour limiter l'exposition et faciliter la gouvernance.",
      },
      {
        title: "Chiffrement & contrôle d’accès",
        description:
          "Chiffrement en transit et au repos. Accès par rôles (RBAC). Journalisation des actions.",
      },
      {
        title: "Multi-sites comparables",
        description:
          "Référentiel commun pour comparer décisions et impacts entre sites, ateliers ou réseaux.",
      },
      {
        title: "Hébergement 100 % Scaleway — France",
        description:
          "Plateforme et données hébergées en France (Paris), avec posture de transparence sur les pratiques de sécurité.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack",
      description:
        "Praedixa complète vos outils actuels et ajoute une couche Decision Intelligence & Optimization orientée COO/CFO.",
      tools: ["WFM", "Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le mode Prévisions KPI uniquement est disponible, mais le différenciant Praedixa reste le Service Signature : optimisation de décision + preuve ROI + Decision Log.",
  },

  pilot: {
    kicker: "Offre pilote",
    heading:
      "Pilote Signature Praedixa : 1 mois d’audit offert, puis preuve sur 3 mois.",
    subheading:
      "Programme multi-verticales pour entreprises multi-sites : restauration, retail, hôtellerie, concessions/atelier, logistique, santé, industrie, centres d’appels.",
    statusLabels: ["Audit offert (M1)", "Jalon preuve (S8)", "Consolidation (M3)"],
    included: {
      title: "Ce que vous recevez",
      items: [
        "Mois 1 offert : audit historique et estimation des gains potentiels",
        "Prévisions multi-KPI (Workforce, demande, stock, offre, autres sur demande)",
        "Recommandations de décision sous contraintes coût/service/règles",
        "Decision Log partagé : recommandation, override, raison, résultat",
        "Proof pack ROI : BAU/0% vs 100% recommandé vs réel",
        "Rituels de gouvernance COO/Ops + CFO/DAF",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Remplacement de votre outil de planning/WFM",
        "Engagement de résultat chiffré public prédéfini",
        "Déploiement global multi-pays dès le démarrage",
        "Développement spécifique illimité",
      ],
    },
    kpis: {
      title: "Indicateurs suivis",
      items: [
        "Qualité de couverture et tenue du service level",
        "Coût opérationnel (urgence, réaffectations, options de renfort)",
        "Taux et motifs d'overrides dans le Decision Log",
        "Écart BAU/0% vs 100% vs réel par site et au niveau réseau",
      ],
    },
    governance: {
      title: "Gouvernance",
      items: [
        "Point hebdomadaire opérations",
        "Revue mensuelle COO/Ops + CFO/DAF",
        "Sponsor opérations identifié côté client",
        "Decision Log et proof pack partagés",
      ],
    },
    selection: {
      title: "Critères d’éligibilité",
      items: [
        "Organisation multi-sites avec variabilité de demande et arbitrages quotidiens",
        "Sponsor opérations et sponsor finance disponibles",
        "Exports exploitables (charge/demande, capacité/workforce, stock/offre, absences)",
      ],
    },
    upcoming: {
      title: "Trajectoire après pilote",
      description:
        "Extension progressive à plus de sites, plus de décisions et plus de KPI sans casser votre stack existante.",
    },
    urgency:
      "Candidatures examinées sous 48h ouvrées. Démarrage possible sur périmètre restreint.",
    ctaPrimary: "Demander un pilote Signature Praedixa",
    ctaMeta:
      "Audit historique 1 mois offert · Lecture seule via exports/API · Proof pack ROI mensuel",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses claires pour COO/Ops, CFO/DAF et responsables multi-sites.",
    signalLabel: "Cadence FAQ",
    signalBody:
      "Chaque réponse est formulée pour aider une décision rapide entre opérations, finance et IT.",
    categoryHint: "Choisir un angle puis ouvrir une question",
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
          "Une couche Decision Intelligence & Optimization qui transforme des prévisions multi-KPI en décisions optimisées et preuve ROI mensuelle.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Quelle différence entre Service Signature Praedixa et Prévisions KPI uniquement ?",
        answer:
          "Le Service Signature inclut prévisions + optimisation de décision + Decision Log + proof pack ROI. Le mode Prévisions KPI uniquement fournit seulement la partie forecasting.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quels KPI pouvez-vous prévoir ?",
        answer:
          "Workforce, demande, stock, offre, et autres KPI sur demande selon votre contexte métier.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qui prend la décision finale ?",
        answer:
          "Toujours votre entreprise. Praedixa propose des options comparées et trace les choix effectifs dans le Decision Log.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quelle différence avec un outil de planning/WFM ou un ERP ?",
        answer:
          "Praedixa ne remplace pas ces outils. La plateforme ajoute une couche décisionnelle et de preuve ROI au-dessus de l'existant.",
        category: "Comprendre Praedixa",
      },
      {
        question: "L'audit 1 mois offert couvre quoi ?",
        answer:
          "Un audit de vos historiques pour établir le baseline BAU/0% et estimer ce que vous auriez pu économiser avec les recommandations Praedixa.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se structure le pilote sur 3 mois ?",
        answer:
          "M1 audit offert + initialisation, S8 jalon de preuve intermédiaire, M3 consolidation et proof pack complet.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment prouvez-vous le ROI ?",
        answer:
          "Par comparaison BAU/0%, 100% recommandé et réel observé, avec overrides et raisons tracés dans le Decision Log.",
        category: "Pilote & tarification",
      },
      {
        question: "Quelles données faut-il pour démarrer ?",
        answer:
          "Exports existants : charge/demande, capacité/workforce, stock/offre, absences, plus règles métier essentielles.",
        category: "Technique & données",
      },
      {
        question: "Faut-il une intégration IT lourde ?",
        answer:
          "Non. Le démarrage se fait en lecture seule via exports/API, puis automatisation légère si nécessaire.",
        category: "Technique & données",
      },
      {
        question: "Traitez-vous des données individuelles ?",
        answer:
          "Non. Praedixa fonctionne sur des données agrégées équipe/site et n'effectue pas de prédiction individuelle.",
        category: "Technique & données",
      },
      {
        question: "Que se passe-t-il si nous restons en mode Prévisions KPI uniquement ?",
        answer:
          "Vous gardez la partie forecasting. Vous pouvez ensuite activer le Service Signature pour ajouter optimisation de décision, Decision Log et preuve ROI.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Passer à l’action",
    heading: "Demandez l’audit historique (gratuit).",
    subheading:
      "Nous cadrons votre périmètre multi-sites, lançons l’audit historique, puis déroulons la boucle décision + preuve ROI.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "1 mois d'audit historique offert",
      "Lecture seule via exports/API",
      "Aucun engagement post-pilote imposé",
    ],
    ctaPrimary: "Obtenir l’audit historique (gratuit)",
    ctaSecondary: "Voir le protocole ROI",
  },

  servicesPage: {
    meta: {
      title:
        "Praedixa | Service Signature vs Prévisions KPI uniquement",
      description:
        "Comparez clairement le Service Signature Praedixa (full package) et le mode Prévisions KPI uniquement : Workforce, demande, stock, offre, autres sur demande.",
      ogTitle:
        "Praedixa | Service Signature et Prévisions KPI uniquement",
      ogDescription:
        "Deux niveaux de service, un seul produit : Service Signature Praedixa (décision + ROI + Decision Log) ou prévisions KPI uniquement.",
    },
    kicker: "Service",
    heading:
      "Service Signature Praedixa vs Prévisions KPI uniquement.",
    subheading:
      "Un seul produit. Deux niveaux de service. Le Service Signature est l'offre complète. Le mode Prévisions KPI uniquement sert de point d'entrée.",
    fullPackage: {
      badge: "Service Signature Praedixa",
      title: "Full package Decision Intelligence & Optimization",
      summary:
        "Le cœur de valeur Praedixa : optimiser les décisions opérationnelles sous contraintes et prouver l'impact économique.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Prévisions multi-KPI : Workforce, demande, stock, offre, autres sur demande.",
        "Options comparées sous contraintes coût/service/règles métier.",
        "Décision optimale recommandée avec arbitrages explicites.",
        "Decision Log : recommandation, override, raison, résultat.",
        "Proof pack ROI : baseline BAU/0% vs 100% recommandé vs réel.",
        "Gouvernance multi-sites: comparabilité et standardisation.",
      ],
      cta: "Demander un pilote Signature Praedixa",
    },
    forecastsOnly: {
      badge: "Prévisions KPI uniquement",
      title: "Mode forecasting cible",
      summary:
        "Un point d'entrée pour structurer vos prévisions KPI avant d'activer la couche décisionnelle complète.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Prévisions KPI : Workforce, demande, stock, offre, autres sur demande.",
        "Livrables de prévision opérationnels exploitables par vos équipes.",
        "Démarrage lecture seule via exports/API.",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas d'optimisation complète des décisions sous contraintes.",
        "Pas de Decision Log complet avec overrides et raisons.",
        "Pas de proof pack ROI complet BAU/0% vs 100% vs réel.",
      ],
      cta: "Parler de mes besoins prévisionnels",
    },
    comparison: {
      title: "Comparatif rapide",
      columns: [
        {
          criterion:
            "Prévisions KPI (Workforce, demande, stock, offre, autres sur demande)",
          fullPackage: "Inclus",
          forecastsOnly: "Inclus",
        },
        {
          criterion: "Options comparées sous contraintes coût/service",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Décision optimale recommandée",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Decision Log (recommandation, override, raison, résultat)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Proof pack ROI (BAU/0%, 100%, réel)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand choisir chaque mode",
      items: [
        "Choisissez le Service Signature si votre priorité est la qualité de décision + preuve ROI mensuelle.",
        "Choisissez Prévisions KPI uniquement si vous devez d'abord fiabiliser votre base de forecasting.",
        "Vous pouvez commencer en Prévisions KPI uniquement puis activer le Service Signature sans changer de produit.",
      ],
    },
    bottomNote:
      "Praedixa reste un seul produit décisionnel. Le mode previsions-only est une étape, le Service Signature est le différenciant.",
  },

  footer: {
    tagline:
      "Décisions de couverture pour opérations multi-sites, Decision Log et proof pack ROI mensuel.",
    badges: ["Decision Log natif", "Proof pack ROI mensuel"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Audit historique offert, puis boucle décision + preuve ROI mensuelle.",
      cta: "Obtenir l’audit historique (gratuit)",
    },
  },

  stickyCta: {
    text: "Obtenir l’audit historique (gratuit)",
  },

  form: {
    pageTitle: "Demande de pilote Signature Praedixa",
    pageSubtitle:
      "Cette demande qualifie votre pilote 3 mois Decision Intelligence & Optimization, avec audit historique 1 mois offert.",
    pill: "Pilote Signature Praedixa (3 mois)",
    valuePoints: [
      "Audit historique 1 mois offert",
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
        placeholder: "Ex : WFM + ERP + CRM",
      },
      painPoint: {
        label: "Principal arbitrage à optimiser",
        placeholder:
          "Décrivez la décision coût/service la plus critique à traiter en priorité.",
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
        "Nous revenons vers vous sous 48h ouvrées avec un cadrage adapté à votre contexte et un plan d’audit historique.",
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
      "Responsable planning / atelier",
      "Supply / Inventory manager",
      "DAF / Direction financière",
      "Direction générale",
      "Autre",
    ],
    timelines: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  },
};
