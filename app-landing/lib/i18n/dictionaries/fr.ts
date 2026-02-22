import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title: "Praedixa | Prévision d'effectifs et arbitrages multi-sites",
    description:
      "Anticipez les tensions d'effectifs multi-sites avec un pilote de prévision d'effectifs, puis étendez si besoin vers un socle décisionnel complet.",
    ogTitle:
      "Praedixa | Pilote prévision effectifs pour opérations multi-sites",
    ogDescription:
      "Programme pilote sur 3 mois pour fiabiliser la prévision d'effectifs, comparer les options de couverture et sécuriser les décisions ops/finance.",
  },

  nav: {
    problem: "Problème",
    method: "Solution",
    howItWorks: "Comment ça marche",
    useCases: "Cas d'usage",
    security: "Sécurité",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Demander un pilote prévision effectifs",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "Pilote prévision effectifs",
    headline: "Anticipez vos tensions d'effectifs multi-sites",
    headlineHighlight: "avec un pilote d'entrée cadré.",
    subtitle:
      "Praedixa lance un pilote sur 3 mois pour fiabiliser la prévision d'effectifs, cadrer les arbitrages ops/finance et préparer, si besoin, une extension vers un socle décisionnel plus large.",
    bullets: [
      {
        metric: "3 mois",
        text: "pour sécuriser la prévision d'effectifs",
      },
      {
        metric: "Mois 1",
        text: "démarrage sur exports existants",
      },
      {
        metric: "Décisions",
        text: "arbitrages ops/finance tracés",
      },
    ],
    ctaPrimary: "Demander un pilote prévision effectifs",
    ctaSecondary: "Voir le protocole du pilote",
    previewTitle: "Un aperçu de ce qui vous attend",
    ctaMeta:
      "NDA possible dès le premier échange · Démarrage possible sur un périmètre restreint",
    trustBadges: [
      "Données agrégées uniquement",
      "NDA possible dès le premier échange",
      "Démarrage possible sur un périmètre restreint",
      "Hébergement 100 % Scaleway, 100 % français",
    ],
  },

  preview: {
    kicker: "Un avant-goût",
    heading: "L'interface Praedixa",
    subheading:
      "Découvrez comment l'intelligence de couverture se matérialise pour vos opérations.",
    overlayTitle: "Découvrir la web app",
    overlayBody:
      "Ouvrez la vraie interface web app en mode aperçu public, avec une UI identique.",
    overlayCta: "Découvrir la web app",
    overlayBackCta: "Revenir à la vidéo",
    loadingLabel: "Chargement de l'aperçu vidéo…",
    liveBadge: "Aperçu public",
  },

  demo: {
    title: "Aperçu interactif Praedixa",
    subtitle:
      "Parcours produit en environnement d'aperçu, alimenté uniquement par des données fictives.",
    mockBanner:
      "Environnement d'aperçu — toutes les données sont fictives, aucune donnée client n'est utilisée.",
    backToLanding: "Retour à la landing",
    screenAriaLabel: "Aperçu interactif de l'interface Praedixa",
    updatedAtLabel: "Dernière mise à jour de l'aperçu",
    loading: "Chargement des données d'aperçu…",
    empty: "Aucune donnée d'aperçu disponible pour cet écran.",
    error: "Impossible de charger cet écran d'aperçu.",
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
    kicker: "Pourquoi maintenant",
    heading: "Le coût de la sous-couverture n'est plus un sujet secondaire.",
    subheading:
      "Sans cadre d'anticipation, les arbitrages deviennent plus chers, plus défensifs et moins démontrables.",
    pains: [
      {
        title: "Décisions prises trop tard",
        description:
          "Les signaux de tension sont détectés quand les marges de manœuvre sont déjà réduites.",
        consequence: "Surcoûts, dégradation de service, stress managérial",
        cost: "Surcoût sensible en mode urgence",
      },
      {
        title: "Arbitrages insuffisamment cadrés",
        description:
          "Sans scénario économique structuré, les décisions reposent sur l'urgence.",
        consequence: "Budget opérationnel moins prévisible et moins défendable",
        cost: "Cycle de décision ralenti en absence de cadre",
      },
      {
        title: "Impact difficile à prouver",
        description:
          "Les actions sont rarement reliées à une preuve mesurable de leur effet.",
        consequence: "Difficulté à sécuriser budgets et priorités en comité",
        cost: "Budgets revus à la baisse faute de données",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez-vous ?",
      signals: [
        "Vos arbitrages de couverture reposent sur l'expérience, pas sur des données",
        "Les coûts d'urgence (intérim, heures sup) sont difficiles à anticiper",
        "Vous ne pouvez pas chiffrer le coût de l'inaction en comité",
        "Chaque site gère sa couverture de manière isolée",
      ],
    },
  },

  solution: {
    kicker: "Méthode auditable",
    heading: "Une approche sobre, exigeante, orientée décision.",
    subheading:
      "Praedixa n'ajoute pas du bruit. La plateforme structure un cycle clair : lire, prioriser, arbitrer, prouver.",
    principles: [
      {
        title: "Lecture anticipative",
        subtitle: "Voir avant d'agir",
        description:
          "Signaux de sous-couverture détectés en amont, avec facteurs explicatifs et niveau de criticité.",
      },
      {
        title: "Arbitrage économique",
        subtitle: "Comparer pour décider",
        description:
          "Chaque option chiffrée : coût d'intervention vs coût de non-action, avec hypothèses transparentes.",
      },
      {
        title: "Preuve d'impact",
        subtitle: "Documenter pour convaincre",
        description:
          "Journal de décisions, mesure avant/après, preuves auditables pour gouvernance et comité.",
      },
    ],
    differentiators: {
      title: "Ce que Praedixa n'est pas",
      description:
        "Approche orientée décisions critiques multi-sites : lecture du risque, comparaison d'options et justification de l'action.",
      items: [
        {
          is: "Outil de décision opérationnel",
          isNot: "SIRH ou outil de paie",
        },
        {
          is: "Cadre d'arbitrage économique",
          isNot: "Dashboard BI supplémentaire",
        },
        {
          is: "Early-warning couverture",
          isNot: "Outil de planification terrain",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Protocole",
    heading: "Pilote prévision effectifs en 4 étapes.",
    subheading:
      "Un déroulé sur 3 mois, avec initialisation sans intégration SI lourde et gouvernance explicite.",
    steps: [
      {
        number: "01",
        title: "Cadrage",
        subtitle: "Atelier de cadrage",
        description:
          "Objectifs de prévision d'effectifs, périmètre, rôles et critères de validation co-définis.",
      },
      {
        number: "02",
        title: "Initialisation",
        subtitle: "Exports existants",
        description:
          "Mois 1 : exports CSV/Excel (capacité, charge, absences), lecture seule et données agrégées. Sans intégration SI pour l'initialisation.",
      },
      {
        number: "03",
        title: "Construction",
        subtitle: "Pipelines & calibration",
        description:
          "Construction des pipelines de prévision et calibration progressive selon vos données disponibles, avec comptes-rendus hebdomadaires.",
      },
      {
        number: "04",
        title: "Consolidation",
        subtitle: "Gouvernance & suite",
        description:
          "Stabilisation du pilote, documentation des arbitrages et options d'extension vers un socle décisionnel complet.",
      },
    ],
  },

  useCases: {
    kicker: "Cas d'usage",
    heading: "Des scénarios réels traités avec un cadre de décision structuré.",
    subheading:
      "Chaque cas suit la même logique : visibilité anticipée, options comparables, décision défendable, impact mesurable.",
    cases: [
      {
        id: "volatilite",
        title: "Volatilité de charge",
        context:
          "Pics ponctuels qui déséquilibrent les équipes et déclenchent des arbitrages en urgence.",
        action:
          "Lecture hebdomadaire des tendances, alerte amont, options selon criticité.",
        result:
          "Réduction des décisions de dernière minute et des surcoûts associés.",
      },
      {
        id: "absenteisme",
        title: "Absentéisme et dérive de couverture",
        context:
          "Fragilités structurelles masquées, plans de dernière minute coûteux.",
        action:
          "Analyse des motifs récurrents, hiérarchisation des zones exposées et lecture de court horizon.",
        result:
          "Anticipation des dérives et réduction du recours à l'intérim de dernière minute.",
        callout:
          "Aucune donnée individuelle — lecture au niveau équipe et site uniquement.",
      },
      {
        id: "intersite",
        title: "Arbitrages inter-sites",
        context:
          "Allocation de ressources entre sites sans cadre de comparaison économique.",
        action:
          "Comparaison d'options en coût, risque et impact. Cadre de décision partagé COO/DAF.",
        result: "Arbitrages documentés et défendables en comité de direction.",
        callout:
          "Praedixa ne décide pas — structure les options et clarifie les conséquences.",
      },
      {
        id: "roi",
        title: "Boucle ROI et gouvernance",
        context:
          "Absence de preuve économique sur les décisions opérationnelles passées.",
        action:
          "Journal de décisions, mesure avant/après, traçabilité pour audit.",
        result:
          "Preuve d'impact utilisable pour sécuriser budgets et priorités.",
      },
    ],
  },

  deliverables: {
    kicker: "Framework ROI",
    heading: "Des livrables calibrés pour décider, pas pour présenter.",
    subheading:
      "La valeur ne vient pas d'un dashboard de plus, mais d'une capacité à produire des arbitrages structurés et défendables.",
    roiFrames: [
      {
        label: "Coût de non-action",
        value: "Élevé",
        note: "Pénalités, heures supplémentaires, qualité de service",
      },
      {
        label: "Options d'intervention",
        value: "Comparées",
        note: "Scénarios documentés avec hypothèses transparentes",
      },
      {
        label: "Impact démontré",
        value: "Traçable",
        note: "Mesure avant/après en revue de gouvernance",
      },
    ],
    checklist: [
      "Cartographie des points de tension couverture",
      "Hypothèses de coûts explicites par scénario",
      "Priorisation par niveau de criticité",
      "Cadre de revue hebdomadaire pour comité opérations",
      "Traçabilité des décisions et impacts observés",
    ],
  },

  security: {
    kicker: "Sécurité & IT",
    heading: "Cadre sécurité et données pour la revue IT.",
    subheading:
      "Les éléments présentés ci-dessous décrivent le périmètre actuel de mise en service et les informations partagées en phase de qualification.",
    tiles: [
      {
        title: "Hébergement 100 % Scaleway — Paris (France)",
        description:
          "L'intégralité de la plateforme et des données est hébergée sur Scaleway, en France (Paris). Aucun sous-traitant hors souveraineté française.",
      },
      {
        title: "Données agrégées uniquement",
        description:
          "Aucune prédiction individuelle, aucun traitement nominatif. Lecture au niveau équipe et site uniquement.",
      },
      {
        title: "Chiffrement & accès",
        description:
          "Chiffrement en transit et au repos. Contrôle d'accès par rôle (RBAC). Logs d'activité.",
      },
      {
        title: "Sous-traitants data principaux",
        description:
          "Scaleway — hébergement intégral de la plateforme et des données (serveurs Paris, France). 100 % français.",
      },
      {
        title: "Initialisation sans intégration SI lourde",
        description:
          "Démarrage sur exports en lecture seule. Automatisation d'exports planifiés possible ensuite selon votre contexte.",
      },
      {
        title: "NDA & confidentialité",
        description:
          "NDA possible dès le premier échange. Politique de rétention en formalisation.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack",
      description:
        "Exports CSV/Excel depuis vos outils existants pour l'initialisation, puis automatisation légère possible des exports planifiés.",
      tools: ["ERP", "SIRH", "Planning", "BI", "Excel"],
    },
    honesty:
      "Pratiques de sécurité documentées sur demande. Hébergement intégral sur Scaleway — infrastructure 100 % française, serveurs à Paris.",
  },

  pilot: {
    kicker: "Pilote prévision effectifs",
    heading: "Un pilote d'entrée pour fiabiliser la prévision d'effectifs.",
    subheading:
      "Programme de 3 mois avec initialisation, calibration et gouvernance. Le périmètre peut rester ciblé sur la prévision d'effectifs puis s'étendre si nécessaire.",
    statusLabels: ["Actif aujourd'hui", "En extension", "À venir"],
    included: {
      title: "Ce que couvre le pilote prévision effectifs (3 mois)",
      items: [
        "Mois 1 : initialisation et construction des pipelines sur vos exports",
        "Mois 2 : calibration des lectures charge/capacité et des hypothèses",
        "Mois 3 : stabilisation du pilote et recommandations opérationnelles",
        "1 point hebdomadaire avec un référent opérationnel côté client",
        "Plan de suite formalisé, avec extension optionnelle",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Engagement de résultat chiffré prédéfini",
        "Déploiement global multi-pays",
        "Développement custom illimité",
        "Déploiement full service imposé dès le démarrage",
      ],
    },
    kpis: {
      title: "Objectifs de construction et de validation",
      items: [
        "Fiabiliser la lecture charge/capacité à court horizon",
        "Valider la qualité des pipelines selon les données disponibles",
        "Stabiliser les rituels de décision et la traçabilité",
        "Documenter les conditions d'extension vers un socle décisionnel complet",
      ],
    },
    governance: {
      title: "Gouvernance",
      items: [
        "Point hebdomadaire de pilotage",
        "Sponsor opérations identifié côté client",
        "Référent opérationnel dédié côté client",
        "Journal de décisions partagé",
      ],
    },
    selection: {
      title: "Critères de sélection (pilotage ciblé)",
      items: [
        "Organisation multi-sites (logistique, retail, restauration rapide, industrie, services)",
        "Sponsor opérations engagé",
        "Exports data exploitables (capacité, charge, absences)",
      ],
    },
    upcoming: {
      title: "Extension socle décision complet — optionnelle",
      description:
        "Après le pilote d'entrée, extension possible vers des usages plus larges selon vos priorités.",
    },
    urgency:
      "Candidatures examinées sous 48h ouvrées. Démarrage possible sur un périmètre restreint.",
    ctaPrimary: "Demander un pilote prévision effectifs",
    ctaMeta:
      "Tarif d'entrée pour périmètre prévision d'effectifs · Sans engagement commercial post-pilote",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions fréquentes",
    subheading:
      "Réponses institutionnelles sur le pilote prévision effectifs, ses modalités de démarrage et ses options d'extension.",
    categories: [
      "Comprendre Praedixa",
      "Pilote & tarification",
      "Technique & données",
    ],
    items: [
      {
        question: "Praedixa, c'est quoi en une phrase ?",
        answer:
          "Une couche d'intelligence de couverture : on prédit les risques de sous-couverture par site et équipe, on chiffre le coût de l'inaction vs le coût des options, puis on trace l'impact pour produire une preuve économique auditable.",
        category: "Comprendre Praedixa",
      },
      {
        question: "À qui s'adresse Praedixa ?",
        answer:
          "Dir. d'exploitation, responsables Ops et DAF d'entreprises multi-sites avec des équipes terrain. Exemples de secteurs: logistique, retail/distribution, transport, restauration rapide, industrie, santé et services. Point commun: charge fluctuante, capacité qui ne suit pas, coûts d'urgence qui explosent.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Quelle différence avec un SIRH ou un outil de planification ?",
        answer:
          "On ne fait pas le planning. On se branche dessus. Un SIRH gère les processus RH. Un outil de planification gère les rotations. Praedixa prédit l'écart capacité vs charge, chiffre les scénarios et propose un playbook d'actions avec impact économique. C'est un outil de décision.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Praedixa donne-t-il des conseils ?",
        answer:
          "Non. Praedixa présente des options avec leur impact économique chiffré. La décision appartient entièrement à l'entreprise. Chaque décision est tracée pour alimenter la preuve économique.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Combien coûte Praedixa ?",
        answer:
          "Le pilote prévision effectifs fait l'objet d'un cadrage commercial adapté au périmètre. Il peut démarrer sur un scope ciblé avant extension.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se déroule le pilote ?",
        answer:
          "Le pilote dure 3 mois. Mois 1: initialisation et construction des pipelines à partir de vos exports. Mois 2: calibration selon vos données disponibles. Mois 3: stabilisation des rituels de décision et documentation de gouvernance.",
        category: "Pilote & tarification",
      },
      {
        question: "Que mesurez-vous pendant le pilote ?",
        answer:
          "Le pilote mesure la qualité des signaux de prévision d'effectifs, la robustesse des options proposées et la traçabilité des décisions. Aucun résultat chiffré prédéfini n'est promis publiquement.",
        category: "Pilote & tarification",
      },
      {
        question: "Quelles données pour démarrer ?",
        answer:
          "Exports existants : capacité, charge/volumes et absences (CSV ou Excel). On s'adapte à vos outils et à votre maturité data. Objectif : diagnostic actionnable sans projet d'intégration.",
        category: "Technique & données",
      },
      {
        question: "Faut-il une intégration IT ?",
        answer:
          "Pas pour l'initialisation du pilote. Le démarrage se fait sur exports simples (CSV/Excel). Ensuite, une automatisation légère d'exports planifiés peut être mise en place selon votre contexte.",
        category: "Technique & données",
      },
      {
        question: "RGPD : données individuelles ?",
        answer:
          "Non. Privacy-by-design : niveau agrégé (équipe/site), données limitées au strict nécessaire. Aucune prédiction individuelle, aucun traitement nominatif. Hébergement 100 % Scaleway, en France.",
        category: "Technique & données",
      },
      {
        question: "Quels éléments sécurité partagez-vous en qualification ?",
        answer:
          "Nous partageons le cadre sécurité applicable au périmètre du pilote (chiffrement, contrôles d'accès, journalisation, périmètre d'hébergement et sous-traitants). Hébergement intégral sur Scaleway — 100 % français.",
        category: "Technique & données",
      },
      {
        question: "Que se passe-t-il si le pilote ne donne pas de résultat ?",
        answer:
          "Le pilote inclut un cadre de validation et une documentation de fin de phase. Vous disposez d'un plan de suite formalisé et d'aucun engagement commercial post-pilote.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Passer à l'action",
    heading: "Demandez un pilote prévision effectifs.",
    subheading:
      "Nous cadrons un périmètre de démarrage ciblé (prévision d'effectifs), puis les options d'extension selon vos priorités.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "NDA possible dès le premier échange",
      "Données agrégées uniquement",
      "Sans engagement commercial post-pilote",
    ],
    ctaPrimary: "Demander un pilote prévision effectifs",
    ctaSecondary: "Écrire à l'équipe",
  },

  footer: {
    tagline: "Intelligence de couverture pour opérations multi-sites.",
    badges: ["Gouvernance COO / DAF", "Privacy-by-design"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Pilote d'entrée",
      heading:
        "Pilote prévision effectifs — démarrage possible en périmètre ciblé.",
      cta: "Demander un pilote prévision effectifs",
    },
  },

  stickyCta: {
    text: "Demander un pilote prévision effectifs",
  },

  form: {
    pageTitle: "Demande de pilote prévision effectifs",
    pageSubtitle:
      "Cette demande permet de qualifier votre périmètre de prévision d'effectifs sur 3 mois.",
    pill: "Pilote prévision effectifs (3 mois)",
    valuePoints: [
      "Qualification orientée enjeux effectifs, Ops et finance",
      "Réponse sous 48h ouvrées",
      "Réponse de l'équipe produit",
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
        placeholder: "Ex : ERP + planning interne",
      },
      painPoint: {
        label: "Principal enjeu de couverture",
        placeholder:
          "Décrivez le problème opérationnel que vous voulez traiter en priorité.",
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
        "Nous analysons votre dossier et revenons vers vous sous 48h ouvrées avec un cadrage adapté à votre contexte.",
      backToSite: "Retour au site",
      checkEmail: "Voir le protocole pilote",
    },
    error: "Une erreur est survenue. Veuillez réessayer.",
    sectors: [
      "Logistique",
      "Transport",
      "Restauration rapide",
      "Santé",
      "Industrie",
      "Distribution",
      "Agroalimentaire",
      "BTP",
      "Services",
      "Autre",
    ],
    employeeRanges: ["50-100", "100-250", "250-500", "500-1 000", "1 000+"],
    siteCounts: ["1-3", "4-10", "11-30", "31+"],
    roles: [
      "COO / Direction des opérations",
      "Responsable des opérations",
      "Direction de site",
      "DAF / Direction financière",
      "Direction générale",
      "Autre",
    ],
    timelines: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  },
};
