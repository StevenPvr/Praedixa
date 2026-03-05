import type { Dictionary } from "../types";

export const fr: Dictionary = {
  meta: {
    title:
      "Praedixa | Copilote IA d’arbitrage opérationnel multi-sites",
    description:
      "Copilote IA pour PME/ETI et réseaux multi-sites : anticiper les dérives KPI, standardiser les options, déclencher la 1re étape, puis prouver l’impact chaque mois. IA Act & RGPD by design. Mois 1 offert : audit historique (lecture seule).",
    ogTitle:
      "Praedixa | Copilote IA d’arbitrage opérationnel",
    ogDescription:
      "Des décisions comparables, déclenchées et prouvées : arbitrages coût/service/risque, 1re étape automatisée, validation humaine, preuve ROI mensuelle.",
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
    kicker: "Copilote IA · Réseaux multi-sites",
    headline: "Copilote IA d’arbitrage opérationnel.",
    headlineHighlight: "Marge et service protégés.",
    subtitle:
      "Anticipez les dérives KPI, standardisez les options, déclenchez la 1re étape, puis prouvez l’impact chaque mois. IA Act & RGPD by design. Validation humaine obligatoire.",
    bullets: [
      {
        metric: "Court horizon",
        text: "dérives KPI et risques opérationnels",
      },
      {
        metric: "Coût/service/risque",
        text: "options standardisées et comparables",
      },
      {
        metric: "Preuve mensuelle",
        text: "baseline / recommandé / réel + contrefactuel",
      },
    ],
    ctaPrimary: "Obtenir l’audit historique (gratuit)",
    ctaSecondary: "Voir un exemple de Decision Log",
    previewTitle: "Un aperçu de ce qui vous attend",
    ctaMeta:
      "Complément de vos outils · Validation humaine · IA Act & RGPD by design",
    trustBadges: [
      "Anticipation des dérives KPI (court horizon)",
      "Décision optimale chiffrée (coût/service/risque)",
      "1re étape déclenchée, manager valide",
      "Mois 1 offert : audit historique (lecture seule)",
      "Decision Log + preuve ROI mensuelle (méthodo + hypothèses)",
      "Lecture seule sur l’existant (exports). Démarrage léger",
      "Complément de stack, sans remplacement d’outil",
      "IA Act & RGPD by design",
      "Hébergé en France (Scaleway)",
    ],
  },

  preview: {
    kicker: "Un avant-goût",
    heading: "L’interface Praedixa",
    subheading:
      "Voir comment le protocole de décision prend forme dans l’interface.",
    overlayTitle: "Découvrir la web app",
    overlayBody:
      "Ouvrez une version d’aperçu public (UI identique, données fictives).",
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
    kicker: "Problème",
    heading: "Quand les KPI dérivent, la marge et le service dérapent.",
    subheading:
      "Sur le terrain, on arbitre trop tard. Côté finance, l’impact est difficile à attribuer. Résultat : urgence, coût, risque, et discussions sans preuve.",
    cta: "Obtenir l’audit historique (gratuit)",
    ctaHint:
      "Réponse sous 48h ouvrées. Mois 1 d’audit historique offert. Démarrage sur exports existants (lecture seule).",
    states: {
      loadingTitle: "Lecture des signaux en cours",
      loadingBody:
        "Nous structurons les points de friction avant vos arbitrages coût/service.",
      emptyTitle: "Aucun signal remonte",
      emptyBody:
        "Ajoutez des cas opérationnels à prioriser pour composer le journal d’arbitrage.",
      errorTitle: "Section indisponible",
      errorBody:
        "Le cadrage de problème ne peut pas être affiché pour le moment.",
    },
    pains: [
      {
        title: "Trop tard",
        description:
          "Le signal arrive quand il reste peu de marge de manœuvre.",
        consequence:
          "Coûts d’urgence, renforts improvisés, service dégradé",
        cost: "L’urgence coûte",
      },
      {
        title: "Options non chiffrées",
        description:
          "Renfort, réaffectation, ajustement de service… Peu de chiffres.",
        consequence:
          "Décisions au feeling entre coût, service et risque",
        cost: "Coût et risque mal arbitrés",
      },
      {
        title: "Pas de preuve audit-ready",
        description:
          "Les actions partent. L’avant/après reste discutable.",
        consequence:
          "Comités sans preuve stable de ce qui marche",
        cost: "Priorités et budgets contestés",
      },
    ],
    diagnostic: {
      title: "Vous reconnaissez-vous ?",
      signals: [
        "Vous avez des chiffres, mais pas de protocole de décision",
        "Les arbitrages coût/service/risque varient d’un site à l’autre",
        "La 1re action est manuelle, tardive, et peu tracée",
        "La preuve ROI (avant / recommandé / réel) n’est pas audit-ready",
      ],
    },
  },

  solution: {
    kicker: "Positionnement",
    heading: "Copilote IA d’arbitrage opérationnel, au-dessus de vos outils.",
    subheading:
      "Anticiper. Arbitrer. Déclencher la 1re étape. Prouver le ROI chaque mois. Sans remplacer vos outils.",
    principles: [
      {
        title: "Anticipation des dérives KPI",
        subtitle: "Court horizon",
        description:
          "Dérives KPI et risques opérationnels par site/équipe. Seuils et alertes. Pas de données individuelles.",
      },
      {
        title: "Décision optimale chiffrée",
        subtitle: "Coût/service/risque",
        description:
          "Renfort, réaffectation, ajustement d’ouverture/service… Coût + impact service/risque. Sous vos règles.",
      },
      {
        title: "Action assistée + preuve ROI",
        subtitle: "Manager dans la boucle",
        description:
          "La 1re action est enclenchée automatiquement (OT ou intérim). Le manager valide. Decision Log + preuve ROI mensuelle, audit-ready.",
      },
    ],
    differentiators: {
      title: "Complément de votre stack (sans remplacement)",
      description:
        "Démarrage en lecture seule (exports). Décision, action, preuve. Rien à remplacer pour démarrer.",
      items: [
        {
          is: "Lecture seule sur l’existant (exports)",
          isNot: "Projet de remplacement d’outil",
        },
        {
          is: "Décision optimale + déclenchement assisté",
          isNot: "Prévision sans exécution",
        },
        {
          is: "Decision Log + preuve ROI mensuelle",
          isNot: "Dashboard sans hypothèses ni avant/après",
        },
      ],
    },
  },

  howItWorks: {
    kicker: "Boucle de décision",
    heading: "Anticiper → décider → déclencher → prouver.",
    subheading:
      "Même cadence sur chaque site. Même méthode. Même preuve.",
    steps: [
      {
        number: "01",
        title: "Anticipation (court horizon)",
        subtitle: "Dérives KPI",
        description:
          "On remonte les risques de dérive KPI par site/équipe, avec seuils et alertes.",
      },
      {
        number: "02",
        title: "Décision optimale chiffrée",
        subtitle: "Coût/service/risque",
        description:
          "Heures sup vs intérim vs réaffectation vs ajustement d’ouverture/service. Coût + impact service/risque. Sous vos règles paramétrées.",
      },
      {
        number: "03",
        title: "1re action assistée",
        subtitle: "Renfort / ajustement",
        description:
          "OT : liste éligible → appel à volontaires → réponses collectées → validation manager. Intérim : demande structurée → profils remontés → choix manager.",
      },
      {
        number: "04",
        title: "Decision Log + preuve ROI",
        subtitle: "Audit-ready (mensuel)",
        description:
          "Decision Log (recommandé, choix, raison, résultat). Preuve ROI mensuelle : avant / recommandé / réel + hypothèses. Pack exploitable en comité de direction.",
      },
    ],
  },

  useCases: {
    kicker: "Décisions couvertes",
    heading: "Des décisions qui déclenchent une action.",
    subheading:
      "Même boucle fermée pour plusieurs verticales multi-sites. Toujours : coût, service, risque. Toujours : manager dans la boucle.",
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
          "OT vs intérim vs réaffectation vs ajustement d’ouverture/service. Arbitrage chiffré. 1re action enclenchée.",
        result:
          "Moins d’urgence. Meilleure tenue de service. Coût mieux maîtrisé.",
      },
      {
        id: "absenteisme",
        title: "Compétences rares et absences",
        context:
          "Opérations fragilisées par absences, indisponibilités critiques et dépendances atelier/soins/maintenance.",
        action:
          "Options de couverture alternatives. OT ou intérim enclenchés. Choix validé et tracé.",
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
          "Comparaison d’options entre sites. Contraintes locales. Objectifs réseau. Décision chiffrée.",
        result:
          "Décisions comparables, gouvernance standardisée, arbitrages défendables en comité.",
        callout:
          "Le manager garde toujours la décision finale.",
      },
      {
        id: "roi",
        title: "Revue mensuelle Ops/Finance",
        context:
          "Difficulté à relier décisions terrain et impact économique réel.",
        action:
          "Decision Log + preuve ROI : avant / recommandé / réel + hypothèses.",
        result:
          "Dossier mensuel exploitable en comité de direction.",
      },
    ],
  },

  deliverables: {
    kicker: "Decision Log + preuve ROI",
    heading: "Une preuve mensuelle exploitable. Audit-ready.",
    subheading:
      "Avant / recommandé / réel. Méthode écrite. Hypothèses explicites.",
    roiFrames: [
      {
        label: "Avant (référence)",
        value: "Votre baseline",
        note: "Point de comparaison stable : ce qui se passerait sans changement.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Recommandé (potentiel)",
        value: "Option recommandée",
        note: "Option optimale sous vos règles. Coût + impact service/risque.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Réel (terrain)",
        value: "Décision prise",
        note: "Choix manager + action lancée + résultat. Raisons tracées.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
    ],
    checklist: [
      "Decision Log : recommandé, choix, raison, résultat",
      "Hypothèses explicites (coût, service, risque)",
      "Comparatif avant / recommandé / réel (site + réseau)",
      "Indicateurs : coût, service, urgences, stabilité opérationnelle",
      "Pack mensuel exploitable en comité de direction",
    ],
  },

  security: {
    kicker: "Overlay & données",
    heading: "Lecture seule pour démarrer. Rien à remplacer.",
    subheading:
      "Démarrage léger sur exports existants (CSV/Excel/API). Puis garde-fous et preuve. Le manager reste décisionnaire.",
    tiles: [
      {
        title: "Lecture seule via exports",
        description:
          "Démarrage sur CSV/Excel/API existants. Aucun remplacement d’outil.",
      },
      {
        title: "Court horizon",
        description:
          "Focus sur les dérives KPI et les arbitrages coût/service/risque.",
      },
      {
        title: "Données agrégées (équipe/site)",
        description:
          "Aucune prédiction individuelle. Pilotage au niveau équipe/site pour limiter l’exposition et faciliter la gouvernance.",
      },
      {
        title: "Règles et garde-fous",
        description:
          "Les actions suivent les règles paramétrées (compétences, repos, seuils). Le manager valide.",
      },
      {
        title: "Chiffrement & contrôle d’accès",
        description:
          "Chiffrement en transit et au repos. Accès par rôles (RBAC). Journalisation des actions.",
      },
      {
        title: "Multi-sites comparables",
        description:
          "Un référentiel commun pour comparer décisions et impacts entre sites, ateliers ou réseaux.",
      },
      {
        title: "Hébergé en France (Scaleway)",
        description:
          "Plateforme et données hébergées en France (Paris), avec une posture de transparence sur les pratiques de sécurité.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack",
      description:
        "Complète vos outils actuels. Ajoute décision + action assistée + preuve ROI.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le mode “prévisions d’indicateurs” uniquement existe. Le cœur de valeur reste la boucle fermée : décision + action assistée + preuve.",
  },

  pilot: {
    kicker: "Offre pilote",
    heading:
      "Pilote : boucle fermée en 3 mois.",
    subheading:
      "Démarrage léger sur vos exports. Décision, action assistée, preuve ROI. Multi-sites.",
    statusLabels: ["Audit offert (M1)", "Jalon preuve (S8)", "Consolidation (M3)"],
    included: {
      title: "Ce que vous recevez",
      items: [
        "Mois 1 offert : audit historique (lecture seule) sur vos exports",
        "Prévisions à court horizon (selon vos KPI prioritaires)",
        "Arbitrages chiffrés : coût / service / risque (sous vos règles)",
        "1re action assistée : OT (appel à volontaires) ou intérim (demande structurée)",
        "Decision Log + preuve ROI mensuelle : avant / recommandé / réel + hypothèses",
        "Rituels Ops + DAF : décisions et preuve",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Remplacement de vos outils existants",
        "100% automatique sans validation humaine",
        "Engagement de résultat chiffré public prédéfini",
        "Déploiement global multi-pays dès le démarrage",
        "Développement spécifique illimité",
      ],
    },
    kpis: {
      title: "Indicateurs suivis",
      items: [
        "Dérives KPI à court horizon (selon priorités)",
        "Coût opérationnel (renforts, réaffectations, ajustements service)",
        "Niveau de service et exposition au risque",
        "Décisions prises vs recommandé (et raisons) dans le Decision Log",
        "Écart avant / recommandé / réel (site + réseau)",
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
        "Organisation multi-sites avec variabilité de demande et arbitrages quotidiens",
        "Sponsor opérations et sponsor finance disponibles",
        "Exports exploitables (demande/charge, capacité, absences, règles internes)",
      ],
    },
    upcoming: {
      title: "Trajectoire après pilote",
      description:
        "Extension progressive à plus de sites, plus de décisions et plus de KPI, sans casser votre stack existante.",
    },
    urgency:
      "Candidatures examinées sous 48h ouvrées. Démarrage possible sur périmètre restreint.",
    ctaPrimary: "Candidater au pilote",
    ctaMeta:
      "Audit offert · Lecture seule via exports/API · Preuve ROI mensuelle",
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
          "Une boucle fermée : prévision J+3/J+7/J+14, décision optimale chiffrée, 1re action assistée, preuve ROI mensuelle audit-ready. Branché en lecture seule sur l’existant.",
        category: "Comprendre Praedixa",
      },
      {
        question:
          "Quelle différence entre Service Signature Praedixa et Prévisions KPI uniquement ?",
        answer:
          "Le Service Signature inclut décision optimale, déclenchement assisté (OT/intérim), Decision Log et preuve ROI mensuelle. Le mode “prévisions” se limite aux signaux et à la prévision.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quels KPI pouvez-vous prévoir ?",
        answer:
          "Dérives KPI à court horizon : capacité, demande, absences, stocks/offre… puis d’autres indicateurs selon vos priorités.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Déclenchez-vous vraiment la première action ?",
        answer:
          "Oui, de façon assistée. OT : liste éligible, appel à volontaires, réponses collectées, puis validation manager. Intérim : demande structurée, profils remontés, puis choix manager.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Qui prend la décision finale ?",
        answer:
          "Toujours le manager. Le système recommande et enclenche l’action assistée. Le choix final est validé et tracé dans le Decision Log.",
        category: "Comprendre Praedixa",
      },
      {
        question: "Quelle différence avec un outil de planning ou un ERP ?",
        answer:
          "Ce n’est pas un planning. C’est une couche au-dessus : décision optimale, 1re action assistée, et preuve ROI mensuelle. Aucun remplacement pour démarrer.",
        category: "Comprendre Praedixa",
      },
      {
        question: "L'audit historique offert couvre quoi ?",
        answer:
          "Un audit sur vos historiques pour estimer le potentiel et sélectionner les décisions à couvrir en priorité, par site et par équipe.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment se structure le pilote sur 3 mois ?",
        answer:
          "Démarrage en lecture seule. Semaine 8 : premier jalon de preuve. Mois 3 : preuve consolidée et standardisation multi-sites.",
        category: "Pilote & tarification",
      },
      {
        question: "Comment prouvez-vous le ROI ?",
        answer:
          "Decision Log + comparatif avant / recommandé / réel. Méthode et hypothèses explicites. Pack mensuel exploitable en comité.",
        category: "Pilote & tarification",
      },
      {
        question: "Quelles données faut-il pour démarrer ?",
        answer:
          "Vos exports existants (CSV/Excel/API) : demande/charge, capacité, absences. Et vos règles clés (compétences, repos, seuils, contraintes).",
        category: "Technique & données",
      },
      {
        question: "Faut-il une intégration IT lourde ?",
        answer:
          "Non. Démarrage en lecture seule via exports/API. Automatisation légère ensuite si nécessaire.",
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
          "Les actions suivent les règles paramétrées (compétences, repos, seuils, contraintes). Le manager valide. Le Decision Log garde la trace des choix.",
        category: "Technique & données",
      },
      {
        question: "Que se passe-t-il si nous restons en mode Prévisions KPI uniquement ?",
        answer:
          "Vous gardez les livrables de prévision. Vous pouvez activer ensuite la décision optimale, l’action assistée, le Decision Log et la preuve ROI.",
        category: "Pilote & tarification",
      },
    ],
  },

  contact: {
    kicker: "Contact",
    heading: "Obtenir l’audit historique (gratuit).",
    subheading:
      "Envoyez vos exports. On revient avec un comparatif et un plan de pilote. Puis : décision optimale, 1re action assistée, preuve ROI mensuelle.",
    trustItems: [
      "Réponse sous 48h ouvrées",
      "Mois 1 d’audit historique offert",
      "Lecture seule via exports/API",
      "Aucun engagement post-pilote imposé",
    ],
    ctaPrimary: "Obtenir l’audit historique (gratuit)",
    ctaSecondary: "Voir le protocole de preuve",
  },

  servicesPage: {
    meta: {
      title:
        "Praedixa | Service Signature vs Prévisions KPI uniquement",
      description:
        "Comparez le Service Signature Praedixa (décisions guidées + preuve mensuelle) et le mode “prévisions d’indicateurs” uniquement (capacité, demande, stock/offre…).",
      ogTitle:
        "Praedixa | Service Signature et Prévisions KPI uniquement",
      ogDescription:
        "Deux niveaux de service, un seul produit : Service Signature (décisions + journal + preuve mensuelle) ou prévisions d’indicateurs uniquement.",
    },
    kicker: "Service",
    heading:
      "Service Signature Praedixa vs Prévisions KPI uniquement.",
    subheading:
      "Un seul produit. Deux niveaux de service. Le Service Signature est l’offre complète. Le mode Prévisions KPI uniquement sert de point d’entrée.",
    fullPackage: {
      badge: "Service Signature Praedixa",
      title: "Offre complète (décisions + preuve)",
      summary:
        "Le cœur de valeur Praedixa : mieux décider au quotidien et mesurer l’impact.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Indicateurs/prévisions utiles : capacité, demande, stock/offre…",
        "Options comparées sous contraintes coût/service/règles métier.",
        "Choix recommandé avec arbitrages explicites.",
        "Journal de décision : option, choix, raison, résultat.",
        "Preuve : avant / recommandé / réel.",
        "Gouvernance multi-sites: comparabilité et standardisation.",
      ],
      cta: "Demander un pilote Signature Praedixa",
    },
    forecastsOnly: {
      badge: "Prévisions KPI uniquement",
      title: "Mode “prévisions”",
      summary:
        "Un point d’entrée pour structurer vos prévisions d’indicateurs avant d’activer la couche décision + preuve.",
      includesTitle: "Ce qui est inclus",
      includes: [
        "Prévisions d’indicateurs : capacité, demande, stock/offre…",
        "Livrables de prévision opérationnels exploitables par vos équipes.",
        "Démarrage lecture seule via exports/API.",
      ],
      limitsTitle: "Ce qui n'est pas inclus",
      limits: [
        "Pas de décisions guidées sous contraintes.",
        "Pas de journal de décision complet.",
        "Pas de preuve complète (avant / recommandé / réel).",
      ],
      cta: "Parler de mes besoins prévisionnels",
    },
    comparison: {
      title: "Comparatif rapide",
      columns: [
        {
          criterion:
            "Prévisions KPI (capacité, demande, stock/offre, autres sur demande)",
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
          criterion: "Journal de décision (option, choix, raison, résultat)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
        {
          criterion: "Preuve (avant / recommandé / réel)",
          fullPackage: "Inclus",
          forecastsOnly: "Non inclus",
        },
      ],
    },
    decisionGuide: {
      title: "Quand choisir chaque mode",
      items: [
        "Choisissez le Service Signature si votre priorité est la qualité de décision + preuve mensuelle.",
        "Choisissez Prévisions KPI uniquement si vous devez d'abord fiabiliser votre base de prévisions.",
        "Vous pouvez commencer en Prévisions KPI uniquement puis activer le Service Signature sans changer de produit.",
      ],
    },
    bottomNote:
      "Praedixa reste un seul produit décisionnel. Le mode prévisions-only est une étape, le Service Signature est le différenciant.",
  },

  footer: {
    tagline:
      "Boucle de décision : prévision, arbitrage, action assistée, preuve ROI mensuelle.",
    badges: ["Decision Log", "Preuve ROI mensuelle"],
    navigation: "Navigation",
    legalContact: "Légal & contact",
    copyright: "Conçu et hébergé en France",
    ctaBanner: {
      kicker: "Praedixa",
      heading:
        "Mois 1 d’audit historique offert, puis décision + action assistée + preuve ROI.",
      cta: "Obtenir l’audit historique (gratuit)",
    },
  },

  stickyCta: {
    text: "Obtenir l’audit historique (gratuit)",
  },

  form: {
    pageTitle: "Demande de pilote Signature Praedixa",
    pageSubtitle:
      "Cette demande qualifie votre pilote 3 mois (décisions + preuve), avec un audit historique offert.",
    pill: "Pilote Signature Praedixa (3 mois)",
    valuePoints: [
      "Audit historique offert",
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
          "Décrivez l’arbitrage coût/service le plus critique à traiter en priorité.",
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
      "Responsable opérations / atelier",
      "Supply / Inventory manager",
      "DAF / Direction financière",
      "Direction générale",
      "Autre",
    ],
    timelines: ["0-3 mois", "3-6 mois", "6-12 mois", "Exploration"],
  },
};
