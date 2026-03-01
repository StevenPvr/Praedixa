import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title:
      "Praedixa | Intelligence de l'optimisation de la decision | ROI prouve",
    description:
      "Service Signature Praedixa: previsions multi-KPI (Workforce, demande, stock, offre), optimisation des decisions sous contraintes, Decision Log et preuve ROI mensuelle. Option: previsions KPI uniquement.",
    ogTitle:
      "Praedixa | Intelligence de l'optimisation de la decision | Prouve le ROI",
    ogDescription:
      "Praedixa optimise vos decisions operationnelles et prouve l'impact economique: BAU/0%, 100% recommande, reel avec overrides traces.",
  },

  nav: {
    problem: "Probleme",
    method: "Methode",
    services: "Service",
    howItWorks: "Comment ca marche",
    useCases: "Decisions couvertes",
    security: "Integration & data",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Demander un pilote Signature Praedixa",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Service Signature Praedixa · Multi-sites",
    headline: "Intelligence de l'optimisation de la decision",
    headlineHighlight: " | Prouve le ROI.",
    subtitle:
      "Praedixa est une couche decisionnelle au-dessus de vos outils WFM/planning/ERP/CRM. Les previsions multi-KPI servent d'inputs, puis nous comparons les options sous contraintes, tracons les overrides et prouvons l'impact economique.",
    bullets: [
      {
        metric: "1 mois offert",
        text: "audit historique: ce que vous auriez economise",
      },
      {
        metric: "3 mois",
        text: "pour installer la boucle decision + preuve ROI",
      },
      {
        metric: "Lecture seule",
        text: "exports/API, sans projet IT lourd",
      },
    ],
    ctaPrimary: "Demander un pilote Signature Praedixa",
    ctaSecondary: "Voir le protocole de preuve ROI",
    previewTitle: "Un apercu de ce qui vous attend",
    ctaMeta:
      "COO/Ops et CFO/DAF alignes des le cadrage · Demarrage sur perimetre restreint",
    trustBadges: [
      "Service Signature: decision optimale + Decision Log + preuve ROI",
      "Mode alternatif: previsions KPI uniquement",
      "Previsions KPI: Workforce, demande, stock, offre, autres sur demande",
      "Lecture seule via exports/API",
      "Multi-sites: comparabilite, gouvernance, standardisation",
      "Hebergement 100 % Scaleway, 100 % francais",
    ],
  },

  preview: {
    kicker: "Un avant-gout",
    heading: "L'interface Praedixa",
    subheading:
      "Decouvrez comment l'intelligence de decision se materialise pour vos operations.",
    overlayTitle: "Decouvrir la web app",
    overlayBody:
      "Ouvrez la vraie interface web app en mode apercu public, avec une UI identique.",
    overlayCta: "Decouvrir la web app",
    overlayBackCta: "Revenir a la video",
    loadingLabel: "Chargement de l'apercu video...",
    liveBadge: "Apercu public",
  },

  demo: {
    title: "Apercu interactif Praedixa",
    subtitle:
      "Parcours produit en environnement d'apercu, alimente uniquement par des donnees fictives.",
    mockBanner:
      "Environnement d'apercu — toutes les donnees sont fictives, aucune donnee client n'est utilisee.",
    backToLanding: "Retour a la landing",
    screenAriaLabel: "Apercu interactif de l'interface Praedixa",
    updatedAtLabel: "Derniere mise a jour de l'apercu",
    loading: "Chargement des donnees d'apercu...",
    empty: "Aucune donnee d'apercu disponible pour cet ecran.",
    error: "Impossible de charger cet ecran d'apercu.",
    retry: "Reessayer",
    openAction: "Ouvrir",
    nav: {
      dashboard: "Dashboard",
      forecasts: "Previsions",
      actions: "Actions",
      datasets: "Donnees",
      settings: "Parametres",
    },
    sections: {
      kpis: "Indicateurs cles",
      alerts: "Alertes prioritaires",
      forecastWindow: "Fenetre de prevision (7 jours)",
      decisions: "Decisions recommandees",
      datasetsHealth: "Sante des datasets",
      governance: "Cadre de gouvernance",
    },
  },

  problem: {
    kicker: "Probleme operationnel",
    heading:
      "Les decisions cout/service sont prises chaque jour, mais rarement prouvees.",
    subheading:
      "Sans protocole commun COO/CFO, les arbitrages restent defensifs, heterogenes entre sites et difficiles a justifier economiquement.",
    cta: "Lancer un pilote decisionnel",
    ctaHint:
      "Audit historique offert, cadrage COO/Ops + CFO/DAF des la premiere semaine.",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les points de friction avant arbitrage cout/service.",
      emptyTitle: "Aucun signal remonte",
      emptyBody:
        "Ajoutez des cas operationnels a prioriser pour composer le journal d'arbitrage.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage de probleme ne peut pas etre affiche pour le moment.",
    },
    pains: [
      {
        title: "Arbitrages trop tardifs",
        description:
          "Les signaux utiles arrivent quand les marges de manoeuvre sont deja faibles.",
        consequence:
          "Recours d'urgence, surcharge des equipes, qualite de service instable",
        cost: "Le cout de la reaction depasse le cout de l'anticipation",
      },
      {
        title: "Decision heterogene selon les sites",
        description:
          "Chaque site applique ses propres regles, sans referentiel commun.",
        consequence:
          "Comparaisons impossibles et gouvernance difficile a standardiser",
        cost: "Budget operations peu pilotable au niveau reseau",
      },
      {
        title: "Impact economique non attribuable",
        description:
          "Les actions sont lancees, mais l'effet reel reste flou.",
        consequence:
          "Comites COO/DAF sans preuve claire de ce qui fonctionne",
        cost: "Priorites et budgets contestes faute de preuve",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez-vous ?",
      signals: [
        "Vous avez des previsions, mais pas de protocole de decision trace",
        "Les overrides sont peu documentes ou non exploitables",
        "Vous ne comparez pas clairement BAU/0%, 100% recommande et reel",
        "Les revues multi-sites reposent sur des explications ad hoc",
      ],
    },
  },

  solution: {
    kicker: "Methode Praedixa",
    heading: "Nous optimisons des decisions, pas des predictions.",
    subheading:
      "La prevision est un composant. La valeur centrale vient de l'optimisation sous contraintes, de la tracabilite et de la preuve ROI.",
    principles: [
      {
        title: "Previsions multi-KPI comme input",
        subtitle: "Lire la realite operationnelle",
        description:
          "Workforce, demande, stock, offre et autres KPI sur demande: des signaux utiles pour agir, pas une fin en soi.",
      },
      {
        title: "Options comparees sous contraintes",
        subtitle: "Choisir en cout/service/regles",
        description:
          "Chaque option est evaluee selon vos contraintes metier pour expliciter les arbitrages avant execution.",
      },
      {
        title: "Decision Log + proof pack ROI",
        subtitle: "Tracer et prouver",
        description:
          "Recommandation, override, raison, resultat puis comparaison BAU/0% vs 100% vs reel dans un cadre mensuel exploitable.",
      },
    ],
    differentiators: {
      title: "Ce que nous optimisons / ce que nous utilisons",
      description:
        "Un seul produit Praedixa, avec un Service Signature complet et un mode previsions KPI uniquement.",
      items: [
        {
          is: "Service Signature Praedixa (full package)",
          isNot: "Module de prevision isole sans couche decisionnelle",
        },
        {
          is: "Couche decisionnelle au-dessus de votre stack",
          isNot: "Remplacement WFM/planning/ERP",
        },
        {
          is: "Preuve ROI BAU/0% vs 100% vs reel",
          isNot: "Reporting sans attribution decisionnelle",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocole pilote",
    heading: "Pilote Signature Praedixa en 4 etapes.",
    subheading:
      "1 mois d'audit historique offert, jalon de preuve en S8, consolidation a 3 mois.",
    steps: [
      {
        number: "01",
        title: "Cadrage + audit offert",
        subtitle: "Historique & baseline BAU/0%",
        description:
          "Mois 1: audit sur vos donnees historiques pour estimer ce que vous auriez economise avec les recommandations Praedixa.",
      },
      {
        number: "02",
        title: "Initialisation lecture seule",
        subtitle: "Exports/API existants",
        description:
          "Connexion en lecture seule via CSV/Excel/API. Mise en place des previsions KPI (Workforce, demande, stock, offre, autres sur demande).",
      },
      {
        number: "03",
        title: "Optimisation & Decision Log",
        subtitle: "Options, overrides, raisons",
        description:
          "Comparaison d'options sous contraintes cout/service/regles metier. Chaque decision est tracee: recommandation, override, raison, resultat.",
      },
      {
        number: "04",
        title: "Preuve ROI & gouvernance",
        subtitle: "S8 puis M3",
        description:
          "Proof pack BAU/0% vs 100% vs reel, revues COO/Ops + CFO/DAF, standardisation multi-sites et plan de passage a l'echelle.",
      },
    ],
  },

  useCases: {
    kicker: "Decisions couvertes",
    heading: "Un produit, plusieurs outcomes operationnels.",
    subheading:
      "Meme moteur de decision pour plusieurs verticales: restauration, retail, hotellerie, concessions/atelier, logistique, sante, industrie, centres d'appels.",
    labels: {
      context: "Contexte",
      action: "Levier decisionnel",
      impact: "Preuve attendue",
    },
    cases: [
      {
        id: "volatilite",
        title: "Pics de demande multi-sites",
        context:
          "Rush et variations de volumes qui destabilisent la capacite terrain.",
        action:
          "Previsions demande + Workforce, options de renfort/reaffectation, arbitrage cout/service explicite.",
        result:
          "Moins de decisions de derniere minute et meilleure tenue du niveau de service.",
      },
      {
        id: "absenteisme",
        title: "Competences rares et absences",
        context:
          "Planning fragilise par absences, indisponibilites critiques et dependances atelier/soins/maintenance.",
        action:
          "Priorisation par criticite, recommandations de couverture alternatives, overrides traces.",
        result:
          "Continuite operationnelle plus robuste et reduction du mode urgence.",
        callout:
          "Aucune donnee individuelle — pilotage au niveau equipe/site uniquement.",
      },
      {
        id: "intersite",
        title: "Arbitrages capacite inter-sites",
        context:
          "Ressources limitees a distribuer entre sites ou ateliers en concurrence.",
        action:
          "Comparaison d'options entre sites avec contraintes locales et objectifs reseau.",
        result:
          "Decisions comparables, gouvernance standardisee, arbitrages defendables en comite.",
        callout:
          "Praedixa structure la decision. L'entreprise garde toujours la decision finale.",
      },
      {
        id: "roi",
        title: "Revue mensuelle COO/CFO",
        context:
          "Difficulte a relier decisions terrain et impact economique reel.",
        action:
          "Decision Log + protocole de comparaison BAU/0%, 100% recommande, reel.",
        result:
          "Proof pack mensuel exploitable pour priorites, budgets et renouvellement.",
      },
    ],
  },

  deliverables: {
    kicker: "Preuve ROI",
    heading: "Le differenciant: Decision Log + protocole de preuve.",
    subheading:
      "Pas de claim opaque: trois referentiels compares dans un cadre explicite et reproductible.",
    roiFrames: [
      {
        label: "BAU / 0% (baseline)",
        value: "Reference historique de vos decisions habituelles",
        note: "Ce scenario sert de point de comparaison stable: ce qui se serait passe sans recommandations Praedixa.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Scenario 100% recommande",
        value: "Impact theorique si les recommandations etaient suivies",
        note: "Ce scenario mesure le potentiel de l'optimisation de decision sous vos contraintes metier.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Scenario reel observe",
        value: "Decisions appliquees + overrides et raisons traces",
        note: "Le reel capte ce qui a vraiment ete fait sur le terrain pour prouver l'impact economique net.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
    ],
    checklist: [
      "Decision Log complet: recommandation, override, raison, resultat",
      "KPI de preuve: cout operationnel, service level, recours d'urgence, stabilite planning",
      "Comparaison BAU/0% vs 100% vs reel au niveau site et reseau",
      "Rituel mensuel COO/Ops + CFO/DAF",
      "Proof pack exploitable en comite de direction",
    ],
  },

  security: {
    kicker: "Integration & data",
    heading: "Lecture seule, demarrage rapide, gouvernance claire.",
    subheading:
      "Praedixa s'installe au-dessus de l'existant sans projet IT lourd, puis standardise la lecture decisionnelle multi-sites.",
    tiles: [
      {
        title: "Connexion lecture seule via exports/API",
        description:
          "Demarrage sur CSV/Excel/API existants. Pas de remplacement de vos outils WFM/planning/ERP/CRM.",
      },
      {
        title: "Previsions multi-KPI comme composant",
        description:
          "Workforce, demande, stock, offre et autres KPI sur demande selon vos priorites operationnelles.",
      },
      {
        title: "Donnees agregees uniquement",
        description:
          "Aucune prediction individuelle. Pilotage au niveau equipe/site pour limiter l'exposition et faciliter la gouvernance.",
      },
      {
        title: "Chiffrement & controle d'acces",
        description:
          "Chiffrement en transit et au repos. Acces par roles (RBAC). Journalisation des actions.",
      },
      {
        title: "Multi-sites comparables",
        description:
          "Referentiel commun pour comparer decisions et impacts entre sites, ateliers ou reseaux.",
      },
      {
        title: "Hebergement 100 % Scaleway — France",
        description:
          "Plateforme et donnees hebergees en France (Paris), avec posture de transparence sur les pratiques de securite.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack",
      description:
        "Praedixa complete vos outils actuels et ajoute une couche Decision Intelligence & Optimization orientee COO/CFO.",
      tools: ["WFM", "Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le mode Previsions KPI uniquement est disponible, mais le differenciant Praedixa reste le Service Signature: optimisation de decision + preuve ROI + Decision Log.",
  },

  pilot: {
    kicker: "Offre pilote",
    heading:
      "Pilote Signature Praedixa: 1 mois d'audit offert, puis preuve sur 3 mois.",
    subheading:
      "Programme multi-verticales pour entreprises multi-sites: restauration, retail, hotellerie, concessions/atelier, logistique, sante, industrie, centres d'appels.",
    statusLabels: ["Audit offert (M1)", "Jalon preuve (S8)", "Consolidation (M3)"],
    included: {
      title: "Ce que vous recevez",
      items: [
        "Mois 1 offert: audit historique et estimation des gains potentiels",
        "Previsions multi-KPI (Workforce, demande, stock, offre, autres sur demande)",
        "Recommandations de decision sous contraintes cout/service/regles",
        "Decision Log partage: recommandation, override, raison, resultat",
        "Proof pack ROI: BAU/0% vs 100% recommande vs reel",
        "Rituels de gouvernance COO/Ops + CFO/DAF",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Remplacement de votre outil de planning/WFM",
        "Engagement de resultat chiffre public predefini",
        "Deploiement global multi-pays des le demarrage",
        "Developpement specifique illimite",
      ],
    },
    kpis: {
      title: "Indicateurs suivis",
      items: [
        "Qualite de couverture et tenue du service level",
        "Cout operationnel (urgence, reaffectations, options de renfort)",
        "Taux et motifs d'overrides dans le Decision Log",
        "Ecart BAU/0% vs 100% vs reel par site et au niveau reseau",
      ],
    },
    governance: {
      title: "Gouvernance",
      items: [
        "Point hebdomadaire operations",
        "Revue mensuelle COO/Ops + CFO/DAF",
        "Sponsor operations identifie cote client",
        "Decision Log et proof pack partages",
      ],
    },
    selection: {
      title: "Criteres d'eligibilite",
      items: [
        "Organisation multi-sites avec variabilite de demande et arbitrages quotidiens",
        "Sponsor operations et sponsor finance disponibles",
        "Exports exploitables (charge/demande, capacite/workforce, stock/offre, absences)",
      ],
    },
    upcoming: {
      title: "Trajectoire apres pilote",
      description:
        "Extension progressive a plus de sites, plus de decisions et plus de KPI sans casser votre stack existante.",
    },
    urgency:
      "Candidatures examinees sous 48h ouvrees. Demarrage possible sur perimetre restreint.",
    ctaPrimary: "Demander un pilote Signature Praedixa",
    ctaMeta:
      "Audit historique 1 mois offert · Lecture seule via exports/API · Proof pack ROI mensuel",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions frequentes",
    subheading:
      "Reponses claires pour COO/Ops, CFO/DAF et responsables multi-sites.",
    signalLabel: "Cadence FAQ",
    signalBody:
      "Chaque reponse est formulee pour aider une decision rapide entre operations, finance et IT.",
    categoryHint: "Choisir un angle puis ouvrir une question",
    liveLabel: "Bloc FAQ dynamique",
    loadingLabel: "Chargement des reponses...",
    emptyTitle: "Aucune question sur cette categorie",
    emptyBody:
      "Selectionnez une autre categorie pour afficher des reponses exploitables.",
    errorTitle: "La section FAQ ne peut pas etre affichee",
    errorBody:
      "La categorie active est invalide. Reinitialisez sur la premiere categorie.",
    retryLabel: "Reinitialiser la categorie",
    categories: [
      "Comprendre Praedixa",
      "Pilote & tarification",
      "Technique & donnees",
    ],
    items: [
      {
        question: "Praedixa, c'est quoi en une phrase ?",
        answer:
          "Une couche Decision Intelligence & Optimization qui transforme des previsions multi-KPI en decisions optimisees et preuve ROI mensuelle.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Quelle difference entre Service Signature Praedixa et Previsions KPI uniquement ?",
        answer:
          "Le Service Signature inclut previsions + optimisation de decision + Decision Log + proof pack ROI. Le mode Previsions KPI uniquement fournit seulement la partie forecasting.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quels KPI pouvez-vous prevoir ?",
        answer:
          "Workforce, demande, stock, offre, et autres KPI sur demande selon votre contexte metier.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qui prend la decision finale ?",
        answer:
          "Toujours votre entreprise. Praedixa propose des options comparees et trace les choix effectifs dans le Decision Log.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quelle difference avec un outil de planning/WFM ou un ERP ?",
        answer:
          "Praedixa ne remplace pas ces outils. La plateforme ajoute une couche decisionnelle et de preuve ROI au-dessus de l'existant.",
        category: "Comprendre Praedixa",
      },
      {
        question: "L'audit 1 mois offert couvre quoi ?",
        answer:
          "Un audit de vos historiques pour etablir le baseline BAU/0% et estimer ce que vous auriez pu economiser avec les recommandations Praedixa.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se structure le pilote sur 3 mois ?",
        answer:
          "M1 audit offert + initialisation, S8 jalon de preuve intermediaire, M3 consolidation et proof pack complet.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment prouvez-vous le ROI ?",
        answer:
          "Par comparaison BAU/0%, 100% recommande et reel observe, avec overrides et raisons traces dans le Decision Log.",
        category: "Pilote & tarification",
      },
      {
        question: "Quelles donnees faut-il pour demarrer ?",
        answer:
          "Exports existants: charge/demande, capacite/workforce, stock/offre, absences, plus regles metier essentielles.",
        category: "Technique & donnees",
      },
      {
        question: "Faut-il une integration IT lourde ?",
        answer:
          "Non. Le demarrage se fait en lecture seule via exports/API, puis automatisation legere si necessaire.",
        category: "Technique & donnees",
      },
      {
        question: "Traitez-vous des donnees individuelles ?",
        answer:
          "Non. Praedixa fonctionne sur des donnees agregees equipe/site et n'effectue pas de prediction individuelle.",
        category: "Technique & donnees",
      },
      {
        question: "Que se passe-t-il si nous restons en mode Previsions KPI uniquement ?",
        answer:
          "Vous gardez la partie forecasting. Vous pouvez ensuite activer le Service Signature pour ajouter optimisation de decision, Decision Log et preuve ROI.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Passer a l'action",
    heading: "Demandez un pilote Signature Praedixa.",
    subheading:
      "Nous cadrons votre perimetre multi-sites, lancons l'audit historique offert, puis deroulons la boucle decision + preuve ROI.",
    trustItems: [
      "Reponse sous 48h ouvrees",
      "1 mois d'audit historique offert",
      "Lecture seule via exports/API",
      "Aucun engagement post-pilote impose",
    ],
    ctaPrimary: "Demander un pilote Signature Praedixa",
    ctaSecondary: "Parler des previsions KPI uniquement",
  },

  servicesPage: {
    meta: {
      title:
        "Praedixa | Service Signature vs Previsions KPI uniquement",
      description:
        "Comparez clairement le Service Signature Praedixa (full package) et le mode Previsions KPI uniquement: Workforce, demande, stock, offre, autres sur demande.",
      ogTitle:
        "Praedixa | Service Signature et Previsions KPI uniquement",
      ogDescription:
        "Deux niveaux de service, un seul produit: Service Signature Praedixa (decision + ROI + Decision Log) ou previsions KPI uniquement.",
    },
    kicker: "Service",
    heading:
      "Service Signature Praedixa vs Previsions KPI uniquement.",
    subheading:
      "Un seul produit. Deux niveaux de service. Le Service Signature est l'offre complete. Le mode Previsions KPI uniquement sert de point d'entree.",
    fullPackage: {
      badge: "Service Signature Praedixa",
      title: "Full package Decision Intelligence & Optimization",
      summary:
        "Le coeur de valeur Praedixa: optimiser les decisions operationnelles sous contraintes et prouver l'impact economique.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Previsions multi-KPI: Workforce, demande, stock, offre, autres sur demande.",
        "Options comparees sous contraintes cout/service/regles metier.",
        "Decision optimale recommandee avec arbitrages explicites.",
        "Decision Log: recommandation, override, raison, resultat.",
        "Proof pack ROI: baseline BAU/0% vs 100% recommande vs reel.",
        "Gouvernance multi-sites: comparabilite et standardisation.",
      ],
      cta: "Demander un pilote Signature Praedixa",
    },
    forecastsOnly: {
      badge: "Previsions KPI uniquement",
      title: "Mode forecasting cible",
      summary:
        "Un point d'entree pour structurer vos previsions KPI avant d'activer la couche decisionnelle complete.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Previsions KPI: Workforce, demande, stock, offre, autres sur demande.",
        "Livrables de prevision operationnels exploitables par vos equipes.",
        "Demarrage lecture seule via exports/API.",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas d'optimisation complete des decisions sous contraintes.",
        "Pas de Decision Log complet avec overrides et raisons.",
        "Pas de proof pack ROI complet BAU/0% vs 100% vs reel.",
      ],
      cta: "Parler de mes besoins previsionnels",
    },
    comparison: {
      title: "Comparatif rapide",
      columns: [
        {
          criterion:
            "Previsions KPI (Workforce, demande, stock, offre, autres sur demande)",
          fullPackage: "Inclus",
          forecastsOnly: "Inclus",
        },
        {
          criterion: "Options comparees sous contraintes cout/service",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Decision optimale recommandee",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Decision Log (recommandation, override, raison, resultat)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Proof pack ROI (BAU/0%, 100%, reel)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand choisir chaque mode",
      items: [
        "Choisissez le Service Signature si votre priorite est la qualite de decision + preuve ROI mensuelle.",
        "Choisissez Previsions KPI uniquement si vous devez d'abord fiabiliser votre base de forecasting.",
        "Vous pouvez commencer en Previsions KPI uniquement puis activer le Service Signature sans changer de produit.",
      ],
    },
    bottomNote:
      "Praedixa reste un seul produit decisionnel. Le mode previsions-only est une etape, le Service Signature est le differenciant.",
  },

  footer: {
    tagline:
      "Intelligence de l'optimisation de la decision pour operations multi-sites.",
    badges: ["Decision Log natif", "Proof pack ROI mensuel"],
    navigation: "Navigation",
    legalContact: "Legal & contact",
    copyright: "Concu et heberge en France",
    ctaBanner: {
      kicker: "Service Signature Praedixa",
      heading:
        "Pilote 3 mois avec audit historique 1 mois offert et preuve ROI mensuelle.",
      cta: "Demander un pilote Signature Praedixa",
    },
  },

  stickyCta: {
    text: "Demander un pilote Signature Praedixa",
  },

  form: {
    pageTitle: "Demande de pilote Signature Praedixa",
    pageSubtitle:
      "Cette demande qualifie votre pilote 3 mois Decision Intelligence & Optimization, avec audit historique 1 mois offert.",
    pill: "Pilote Signature Praedixa (3 mois)",
    valuePoints: [
      "Audit historique 1 mois offert",
      "Qualification orientee COO/Ops et CFO/DAF",
      "Reponse sous 48h ouvrees",
    ],
    estimatedTime: "Temps estime",
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
      firstName: { label: "Prenom" },
      lastName: { label: "Nom" },
      role: { label: "Fonction" },
      email: {
        label: "Email professionnel",
        placeholder: "vous@entreprise.com",
      },
      phone: { label: "Telephone", placeholder: "06 00 00 00 00" },
      timeline: { label: "Horizon projet" },
      currentStack: {
        label: "Stack actuelle (optionnel)",
        placeholder: "Ex : WFM + ERP + CRM",
      },
      painPoint: {
        label: "Principal arbitrage a optimiser",
        placeholder:
          "Decrivez la decision cout/service la plus critique a traiter en priorite.",
      },
    },
    select: "Selectionner",
    consent: "J'accepte les {cgu} et la {privacy}.",
    cguLabel: "CGU",
    privacyLabel: "politique de confidentialite",
    submit: "Envoyer ma candidature",
    submitting: "Envoi en cours...",
    success: {
      title: "Candidature transmise",
      description:
        "Nous revenons vers vous sous 48h ouvrees avec un cadrage adapte a votre contexte et un plan d'audit historique.",
      backToSite: "Retour au site",
      checkEmail: "Voir le protocole pilote",
    },
    error: "Une erreur est survenue. Veuillez reessayer.",
    sectors: [
      "Restauration / Retail / Hotellerie",
      "Concessions auto / Atelier",
      "Logistique / Entrepots",
      "Sante / Cliniques",
      "Industrie / Maintenance",
      "Centres d'appels",
      "Transport",
      "Services",
      "Autre",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1 000", "1 000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Direction des operations",
      "Responsable reseau multi-sites",
      "Responsable planning / atelier",
      "Supply / Inventory manager",
      "DAF / Direction financiere",
      "Direction generale",
      "Autre",
    ],
    timelines: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  },
};
