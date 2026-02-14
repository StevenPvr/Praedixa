import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title:
      "Praedixa | Intelligence de couverture premium pour opérations multi-sites",
    description:
      "Anticipez la sous-couverture, cadrez vos arbitrages économiques et produisez une preuve auditable de l'impact. SaaS premium pour COO multi-sites.",
    ogTitle:
      "Praedixa | SaaS premium de couverture opérationnelle pour COO multi-sites",
    ogDescription:
      "Anticipez vos tensions de couverture, cadrez vos arbitrages et rendez vos décisions auditables avec une méthodologie orientée impact.",
  },

  nav: {
    method: "Méthode",
    security: "Sécurité",
    faq: "FAQ",
    ctaPrimary: "Demander un pilote",
    backToSite: "Retour au site",
  },

  hero: {
    kicker: "SaaS premium pour COO multi-sites",
    headline: "Anticipez les tensions de couverture",
    headlineHighlight: "avant qu'elles ne coûtent cher.",
    subtitle:
      "Praedixa convertit la sous-couverture en décisions exécutables : signaux précoces, scénarios chiffrés, preuve d'impact défendable en comité.",
    bullets: [
      {
        metric: "3–14 j",
        text: "d'anticipation avant les ruptures terrain",
      },
      {
        metric: "Coût vs risque",
        text: "scénarios comparables pour chaque arbitrage",
      },
      {
        metric: "Traçable",
        text: "décisions auditables pour CODIR, DAF et audit",
      },
    ],
    ctaPrimary: "Demander un pilote",
    ctaSecondary: "Voir le protocole du pilote",
    ctaMeta: "Réponse sous 24h ouvrées · NDA possible · Aucune obligation",
    trustBadges: [
      "Hébergement France",
      "Données agrégées uniquement",
      "NDA possible dès le 1er échange",
      "Framework ROI auditable",
    ],
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
        cost: "15–25% de surcoût moyen en mode urgence",
      },
      {
        title: "Arbitrages insuffisamment cadrés",
        description:
          "Sans scénario économique structuré, les décisions reposent sur l'urgence.",
        consequence: "Budget opérationnel moins prévisible et moins défendable",
        cost: "2 à 5 jours par cycle de décision non outillé",
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
          "Signaux de sous-couverture détectés 3 à 14 jours en amont, avec facteurs explicatifs et niveau de criticité.",
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
    heading: "Du cadrage au résultat en 4 étapes.",
    subheading:
      "Un processus structuré pour démontrer la valeur avant tout engagement.",
    steps: [
      {
        number: "01",
        title: "Cadrage",
        subtitle: "45 minutes",
        description:
          "Objectifs, KPI cibles, périmètre du pilote et critères de succès co-définis.",
      },
      {
        number: "02",
        title: "Connexion data",
        subtitle: "Exports existants",
        description:
          "CSV ou Excel de capacité, charge et absences. Lecture seule, données agrégées, zéro intégration SI.",
      },
      {
        number: "03",
        title: "Diagnostic",
        subtitle: "Carte des risques",
        description:
          "Tensions identifiées, facteurs explicatifs, chiffrage du coût de non-action, playbook d'actions.",
      },
      {
        number: "04",
        title: "Pilote",
        subtitle: "Mesure d'impact",
        description:
          "Boucle ROI sur vos KPI réels. Décision go/no-go basée sur des résultats mesurés, pas des promesses.",
      },
    ],
  },

  useCases: {
    kicker: "Cas d'usage",
    heading: "Des scénarios réels traités avec un cadre de décision premium.",
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
          "Analyse des motifs récurrents, hiérarchisation des zones exposées, fenêtres 3/7/14 j.",
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
      "Le niveau premium ne vient pas d'un dashboard de plus, mais d'une capacité à produire des arbitrages structurés et défendables.",
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
    heading: "Conçu pour passer la due diligence.",
    subheading:
      "La sécurité et la conformité ne sont pas une note de bas de page. Elles sont au centre de l'architecture.",
    tiles: [
      {
        title: "Hébergement France",
        description:
          "Infrastructure hébergée en France. Data residency contrôlée.",
      },
      {
        title: "Données agrégées uniquement",
        description:
          "Aucune prédiction individuelle. Lecture au niveau équipe et site. Privacy-by-design.",
      },
      {
        title: "Chiffrement & accès",
        description:
          "Chiffrement en transit et au repos. Contrôle d'accès par rôle (RBAC). Logs d'activité.",
      },
      {
        title: "DPA & sous-traitants",
        description:
          "Accord de traitement disponible. Liste des sous-traitants communiquée sur demande.",
      },
      {
        title: "Lecture seule",
        description:
          "Connexion en lecture seule sur vos exports. Aucune écriture dans vos systèmes.",
      },
      {
        title: "NDA & confidentialité",
        description:
          "NDA signable dès le premier échange. Politique de rétention documentée.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack",
      description:
        "Exports CSV/Excel depuis vos outils existants. Aucune intégration SI requise pour démarrer.",
      tools: ["ERP", "SIRH", "Planning", "BI", "Excel"],
    },
    honesty:
      "Nous n'avons pas encore de certification SOC 2 ou ISO 27001. Nos pratiques de sécurité sont documentées et auditables. La transparence fait partie du produit.",
  },

  pilot: {
    kicker: "Offre pilote",
    heading: "Un pilote encadré pour prouver la valeur, pas la promettre.",
    subheading:
      "Cohorte fondatrice limitée à 8 entreprises. Chaque pilote est cadré pour produire une preuve de valeur mesurable.",
    included: {
      title: "Ce que le pilote inclut",
      items: [
        "Atelier de cadrage (objectifs, KPI, périmètre)",
        "Diagnostic couverture sur vos données réelles",
        "Carte des risques avec facteurs explicatifs",
        "Playbook d'actions chiffrées",
        "Boucle de mesure d'impact (avant/après)",
        "Rapport final avec recommandations",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Déploiement global multi-pays",
        "Développement custom illimité",
        "Migration de données à grande échelle",
      ],
    },
    kpis: {
      title: "KPI mesurés pendant le pilote",
      items: [
        "Taux de prédiction couverture (précision)",
        "Coûts évités vs coûts d'urgence historiques",
        "Délai moyen de décision (avant/après)",
        "Taux d'adoption par les managers terrain",
        "Qualité des arbitrages documentés",
      ],
    },
    governance: {
      title: "Gouvernance",
      items: [
        "Point hebdomadaire de 30 min",
        "Sponsor exécutif identifié côté client",
        "Champion opérationnel dédié",
        "Critères go/no-go définis au cadrage",
      ],
    },
    urgency:
      "Cohorte limitée à 8 entreprises. Candidatures qualifiées sous 24h ouvrées.",
    ctaPrimary: "Demander un pilote",
    ctaMeta: "Qualification : 20 min · Formulaire : 4–5 min · NDA possible",
  },

  faq: {
    kicker: "FAQ",
    heading: "Questions directes, réponses directes.",
    subheading:
      "Pas de langue de bois. Les questions que posent réellement les directions opérations et finance.",
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
          "Dir. d'exploitation, responsables Ops et DAF d'entreprises multi-sites avec des équipes terrain. Secteur d'entrée : logistique, entrepôts, transport. Point commun : charge fluctuante, capacité qui ne suit pas, coûts d'urgence qui explosent.",
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
          "Modèle premium, généralement plusieurs milliers d'euros par mois selon la complexité (nombre de sites, variabilité, niveau d'accompagnement). La cohorte fondatrice bénéficie d'un cadre commercial dédié. La qualification permet d'établir une trajectoire tarifaire claire avant engagement.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se déroule le pilote ?",
        answer:
          "Étape 1 : exports existants (capacité, charge, absences — CSV ou Excel). Étape 2 : calcul du risque, facteurs explicatifs, chiffrage. Étape 3 : carte des risques, playbook d'actions, hypothèses validables. On itère ensemble pour calibrer le système sur vos contraintes réelles.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment mesurez-vous le ROI ?",
        answer:
          "Chaque décision est tracée. Praedixa mesure l'avant/après : coûts évités, écart prévision vs réel, impact économique. Données auditables, présentables en CODIR ou au DAF.",
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
          "Non pour le diagnostic initial. Exports simples (CSV, Excel), sans connecteur. Pour le pilotage continu, Praedixa peut intégrer progressivement vos flux de données.",
        category: "Technique & données",
      },
      {
        question: "RGPD : données individuelles ?",
        answer:
          "Non. Privacy-by-design : niveau agrégé (équipe/site), données limitées au strict nécessaire. Aucune prédiction individuelle, aucun traitement nominatif. Hébergement France.",
        category: "Technique & données",
      },
      {
        question: "Avez-vous SOC 2 ou ISO 27001 ?",
        answer:
          "Pas encore. Nos pratiques de sécurité sont documentées et auditables : chiffrement, RBAC, logs, hébergement France, DPA disponible. Nous privilégions la transparence sur les labels prématurés.",
        category: "Technique & données",
      },
      {
        question: "Que se passe-t-il si le pilote ne donne pas de résultat ?",
        answer:
          "Les critères de succès sont définis au cadrage. Si les KPI ne sont pas atteints, vous avez un rapport factuel sur pourquoi, et aucune obligation de poursuivre. Le pilote est conçu pour produire une réponse claire, pas pour engager.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Passer à l'action",
    heading: "Demandez un pilote.",
    subheading:
      "En 20 minutes, nous cadrons périmètre, criticité, et valeur attendue d'une première boucle de décision.",
    trustItems: [
      "Réponse sous 24h ouvrées",
      "NDA possible dès le premier échange",
      "Données agrégées uniquement",
      "Aucune obligation",
    ],
    ctaPrimary: "Demander un pilote",
    ctaSecondary: "Écrire à l'équipe",
  },

  footer: {
    tagline: "Intelligence de couverture premium pour opérations multi-sites.",
    badges: ["Gouvernance COO / DAF", "Privacy-by-design"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu en France",
    ctaBanner: {
      kicker: "Cohorte fondatrice",
      heading: "Prenez l'avantage avant la standardisation du marché.",
      cta: "Candidater à la cohorte",
    },
  },

  stickyCta: {
    text: "Demander un pilote",
  },

  form: {
    pageTitle: "Candidature pilote premium",
    pageSubtitle:
      "Cette candidature nous permet de qualifier votre périmètre et de structurer une première boucle de décision.",
    pill: "Cohorte fondatrice",
    valuePoints: [
      "Qualification orientée enjeux COO et finance",
      "Processus structuré en moins de 5 minutes",
      "Réponse sous 24h ouvrées par l'équipe fondatrice",
    ],
    estimatedTime: "Temps estimé",
    estimatedTimeValue: "4 à 5 minutes",
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
        "Nous analysons votre dossier et revenons vers vous sous 24h ouvrées avec un cadrage adapté à votre contexte.",
      backToSite: "Retour au site",
      checkEmail: "Vérifier ma boîte email",
    },
    error: "Une erreur est survenue. Veuillez réessayer.",
    sectors: [
      "Logistique",
      "Transport",
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
