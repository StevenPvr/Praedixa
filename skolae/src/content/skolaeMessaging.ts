export type EvidenceLevel = "official" | "job" | "market" | "hypothesis";

export interface EvidenceClaim {
  label: string;
  value: string;
  qualifier: string;
  evidence: EvidenceLevel;
  href?: string;
}

export interface DecisionExtension {
  title: string;
  forecast: string;
  optimize: string;
}

export interface ValueBenefit {
  title: string;
  description: string;
}

export interface StakeholderView {
  id: "marie" | "ops" | "finance" | "dsi";
  label: string;
  title: string;
  summary: string;
  bullets: string[];
  objection: string;
  response: string;
  proofMetric: string;
  nextStep: string;
}

export const evidenceLabels: Record<EvidenceLevel, string> = {
  official: "Source officielle",
  job: "Signal métier",
  market: "Source marché",
  hypothesis: "Hypothèse de travail",
};

export const skolaeMessaging = {
  hero: {
    eyebrow: "Praedixa pour Skolae",
    title: "Objectiver les arbitrages de capacité",
    highlighted: "qui protègent la continuité pédagogique et la marge",
    intro:
      "Praedixa se branche en lecture seule sur le planning, les absences, les salles, les examens et les coûts déjà suivis par Skolae pour montrer où le potentiel de gain est réel. L'objectif n'est pas d'ajouter un dashboard, mais d'aider le réseau à décider plus tôt sur les arbitrages qui comptent.",
    summary:
      "Praedixa commence par une preuve sur historique en 5 jours ouvrés sur un périmètre réaliste. Si le signal est confirmé, Skolae déploie ensuite une boucle DecisionOps légère pour comparer les options, déclencher la bonne action et prouver le ROI dans le temps.",
    ctaPrimary: "Demander la preuve sur historique",
    ctaPrimaryHref: "#cta",
    ctaSecondary: "Voir la méthode",
    ctaSecondaryHref: "#loop",
    chips: [
      "5 jours ouvrés",
      "Lecture seule",
      "Sans remplacement",
      "ROI lisible",
    ],
    claims: [
      {
        label: "Empreinte groupe",
        value: "23 écoles, 37 villes, plus de 21 000 étudiants et 150 000 apprenants",
        qualifier: "portefeuille public SKOLAE Education et SKOLAE Formation",
        evidence: "official",
        href: "https://www.skolae.fr/le-groupe",
      },
      {
        label: "Signal opérations",
        value: "Goulots d'étranglement, absences, optimisation des salles et modifications d'emplois du temps",
        qualifier: "éléments explicitement demandés dans le poste de Chargé de planification",
        evidence: "job",
        href: "https://reseaugeseteductive.flatchr.io/fr/company/reseaugeseteductive/vacancy/jkj0mpzog5adxngx-charge-de-planification-h-f/",
      },
    ] satisfies EvidenceClaim[],
    boardStats: [
      { label: "Preuve d'entrée", value: "5 jours ouvrés", note: "où le potentiel de gain est réel" },
      { label: "Mode de départ", value: "Lecture seule", note: "sur planning, absences, salles et coûts" },
      { label: "Décision utile", value: "1 arbitrage prioritaire", note: "avant un déploiement plus large" },
      { label: "Lecture comité", value: "Ops + Finance + DSI", note: "ROI décision par décision" },
    ],
    boardSignals: [
      "Les arbitrages prioritaires enfin objectivés",
      "Les coûts d'urgence rendus visibles",
      "Les options comparées sous coût / service / risque",
      "Une base commune pour Ops, Finance et DSI",
    ],
  },
  whyNow: {
    eyebrow: "Pourquoi Skolae devrait regarder ça",
    title: "Pas un nouvel outil.",
    highlighted: "Une lecture business des arbitrages qui coûtent.",
    description:
      "Skolae a déjà du planning, de l'ERP, du CRM, de la BI et des fichiers. Le point n'est pas de remplacer ces outils. Le point est de relier la donnée utile pour décider plus tôt.",
    benefits: [
      {
        title: "Voir où l'argent se perd avant l'urgence",
        description:
          "Praedixa rend visibles les semaines, campus et arbitrages où Skolae va payer trop cher s'il attend trop longtemps pour décider.",
      },
      {
        title: "Comparer les options sous un même cadre",
        description:
          "Remplacer, déplacer, mutualiser, ouvrir de la capacité ou absorber autrement: les options sont comparées sous coût, service et risque.",
      },
      {
        title: "Donner au siège et aux campus la même lecture",
        description:
          "Ops, Finance et DSI partent des mêmes signaux, lisent les mêmes arbitrages et défendent plus facilement la même décision.",
      },
      {
        title: "Prouver le ROI arbitrage par arbitrage",
        description:
          "Le résultat n'est pas un tableau de plus: c'est une preuve simple de ce qui a été évité, déclenché ou mieux décidé.",
      },
      {
        title: "Mieux relier formation, entreprises et débouchés",
        description:
          "En extension, Praedixa aide Skolae à repérer, par cohortes et clusters agrégés, quelles combinaisons parcours, modules et partenaires entreprise améliorent le plus souvent le placement et la cohérence formation-emploi.",
      },
    ] satisfies ValueBenefit[],
    paragraphs: [
      "La vraie douleur n'est pas l'absence de données. C'est que planning, absences, salles, examens et coûts ne racontent pas la même histoire au bon moment.",
      "Quand un trou de couverture est vu trop tard, Skolae paie deux fois: en continuité pédagogique et en coût subi.",
      "Praedixa commence par objectiver, en 5 jours ouvrés, où le potentiel de gain est réel. Ensuite seulement, le déploiement installe la boucle DecisionOps sur un périmètre borné.",
      "Le résultat attendu n'est pas un dashboard de plus. C'est une base commune pour décider, agir et prouver.",
    ],
    signals: [
      {
        label: "Positionnement groupe",
        value: "23 écoles et 37 villes: l'enjeu n'est pas seulement local, mais réseau",
        qualifier: "plus le réseau est large, plus la décision doit rester lisible d'un campus à l'autre",
        evidence: "official",
        href: "https://www.skolae.fr/le-groupe",
      },
      {
        label: "Arbitrages visibles",
        value: "Skolae recrute explicitement pour gérer salles, absences, goulots et replanifications rapides",
        qualifier: "la douleur est déjà visible publiquement, ce qui rend une preuve sur historique très crédible",
        evidence: "job",
        href: "https://reseaugeseteductive.flatchr.io/fr/company/reseaugeseteductive/vacancy/jkj0mpzog5adxngx-charge-de-planification-h-f/",
      },
      {
        label: "Traction future",
        value: "La même logique d'arbitrage existe aussi côté formateurs et formation continue",
        qualifier: "la première preuve peut être pédagogique; l'extension peut venir ensuite sans changer de grammaire produit",
        evidence: "job",
        href: "https://www.wizbii.com/company/skolae/job/charge-de-recrutement-formateurs-h-f",
      },
    ] satisfies EvidenceClaim[],
  },
  decisionFocus: {
    eyebrow: "L'arbitrage à objectiver en premier",
    title: "Quel arbitrage coûte le plus",
    highlighted: "si Skolae ne décide pas plus tôt ?",
    statement:
      "Sur quel campus, quelle semaine et quel groupe Skolae risque-t-il de perdre le plus en continuité, coût d'urgence et charge administrative si rien n'est décidé plus tôt ?",
    body:
      "Praedixa ne vend pas un outil de planning générique. Praedixa aide Skolae à relier les signaux utiles, comparer les options et déclencher la première action validée avant que la marge de manoeuvre se referme.",
    frame: [
      {
        label: "Ce que Praedixa relie",
        value: "Planning, absences, salles, examens, charge support et coûts déjà suivis par Skolae",
      },
      {
        label: "Ce que Praedixa calcule",
        value: "3 à 5 options réelles sous coût / service / risque, d'abord à moyen terme puis à court horizon",
      },
      {
        label: "Ce que Skolae peut défendre",
        value: "Une priorité claire, une action validée et une preuve ROI que le comité peut relire",
      },
    ],
    primaryLevers: [
      "Remplacer un intervenant ou replanifier le créneau",
      "Réaffecter une salle ou redistribuer les groupes",
      "Ouvrir, fusionner ou décaler un groupe quand la capacité se tend",
      "Renforcer ponctuellement la scolarité ou les relations entreprises",
    ],
    extensions: [
      {
        title: "Salles et groupes",
        forecast: "conflits capacité / taille de groupe à l'approche de la rentrée ou des examens",
        optimize: "changer la salle, déplacer le cours, mutualiser deux groupes, ouvrir une capacité additionnelle",
      },
      {
        title: "Alternance",
        forecast: "stock d'étudiants sans contrat et goulot de capacité côté équipes relations entreprises",
        optimize: "prioriser les relances, les jobdatings et les renforts campus par campus",
      },
      {
        title: "Scolarité",
        forecast: "backlog de tâches à venir sur examens, rattrapages, émargements et notes",
        optimize: "répartir la charge, séquencer les tâches et absorber les pics plus tôt",
      },
      {
        title: "Formation continue",
        forecast: "sessions à risque faute de formateur disponible à temps",
        optimize: "sourcer, sous-traiter, regrouper ou replanifier selon marge et priorité client",
      },
      {
        title: "Formation -> entreprises -> débouchés",
        forecast:
          "quels clusters de cohortes, parcours et partenaires conduisent le plus souvent à un placement réussi et à des débouchés cohérents, par campus et par programme",
        optimize:
          "ajuster les modules, prioriser les entreprises partenaires et renforcer les parcours les plus corrélés a l'emploi obtenu, sans entrer dans une prédiction individuelle",
      },
    ] satisfies DecisionExtension[],
  },
  loop: {
    eyebrow: "Ce que Praedixa apporte",
    title: "Une boucle DecisionOps légère, sur l'existant.",
    description:
      "Praedixa se branche sur les systèmes utiles, sans remplacement ni projet lourd. Le bénéfice n'est pas un signal de plus: c'est une décision plus lisible, plus tôt, puis une preuve ROI décision par décision.",
    steps: [
      {
        number: "01",
        title: "Fédérer",
        text: "Relier planning, absences, salles, examens, charge et coûts utiles à la décision sans refondre les outils.",
      },
      {
        number: "02",
        title: "Prédire",
        text: "Rendre visibles les besoins et écarts d'abord à moyen terme, puis à court horizon quand l'exécution se tend.",
      },
      {
        number: "03",
        title: "Calculer",
        text: "Comparer 3 à 5 options coût / service / risque qui tiennent vraiment sur le terrain Skolae.",
      },
      {
        number: "04",
        title: "Déclencher",
        text: "Préparer la première action validée dans les outils déjà en place, avec validation humaine et garde-fous métier.",
      },
      {
        number: "05",
        title: "Prouver",
        text: "Relire le point de départ, la décision recommandée, la décision réelle et l'impact observé dans une revue mensuelle simple.",
      },
    ],
    footer:
      "Même outils. Une meilleure lecture. Des arbitrages gouvernés et prouvables.",
  },
  stakeholders: {
    eyebrow: "Pourquoi cette preuve fédère",
    title: "Chaque sponsor y voit un gain immédiat.",
    description:
      "La preuve avance quand chaque sponsor comprend en une minute ce qu'il gagne à la lancer.",
    views: [
      {
        id: "marie",
        label: "Marie Gasquet",
        title: "Un sujet crédible à ouvrir parce qu'il protège la promesse faite aux entreprises et aux étudiants.",
        summary:
          "Avec Marie, l'objectif n'est pas de parler modèle. Il faut parler fiabilité campus, qualité de suivi et sujet groupe qu'elle peut transmettre aux bons décideurs.",
        bullets: [
          "Relier le sujet à la qualité de la promesse faite aux entreprises partenaires",
          "Rester sur un discours simple: lecture seule, gains concrets, pas de projet lourd",
          "Faire d'elle un relais utile vers Ops, Finance et DSI",
        ],
        objection: "Je ne porte pas le budget ni l'exploitation.",
        response:
          "Pas besoin. Son rôle utile est d'ouvrir un sujet transversal crédible et d'amener les bons sponsors à la table.",
        proofMetric: "Continuité campus et qualité perçue par les entreprises partenaires",
        nextStep: "Introduire un atelier avec direction des études, finance et DSI.",
      },
      {
        id: "ops",
        label: "Opérations",
        title: "Moins de feu à éteindre, plus de semaines tenables.",
        summary:
          "Praedixa aide les équipes campus à agir avant que les absences, salles ou examens n'obligent à bricoler au dernier moment.",
        bullets: [
          "Une lecture capacité à 4-12 semaines, puis un filet d'alerte à 3-14 jours",
          "Moins de modifications de planning à moins de 48 heures",
          "Des leviers concrets déjà comparés au lieu d'arbitrages improvisés",
          "Une meilleure continuité pour les étudiants et les équipes",
        ],
        objection: "Nos cas sont trop spécifiques campus par campus.",
        response:
          "Praedixa standardise le cadre de lecture, pas l'exécution. Chaque campus garde ses contraintes et ses arbitrages locaux.",
        proofMetric: "Cours annulés, modifications <48h, incidents salles, délai d'information étudiants",
        nextStep: "Choisir 1 campus avec historique planning propre et 3 décisions répétitives à instrumenter.",
      },
      {
        id: "finance",
        label: "Finance",
        title: "Moins de coûts cachés, plus de décisions défendables.",
        summary:
          "La finance voit moins de remplacements à prix fort, moins d'heures supplémentaires, moins de locations de salles imprévues et une preuve mensuelle du coût évité.",
        bullets: [
          "Moins de booking tardif et moins de coûts d'urgence subis",
          "Coût d'urgence versus coût préventif",
          "Lecture avant / recommandé / réel par décision",
          "Revue mensuelle compatible comité de direction",
        ],
        objection: "Le ROI sera contestable si les hypothèses bougent.",
        response:
          "Le dispositif assume des hypothèses simples, explicites et relues chaque mois. L'enjeu est la défendabilité, pas la sur-promesse.",
        proofMetric: "Coût des remplacements, heures supplémentaires, locations de salles, annulations évitées",
        nextStep: "Valider les trois KPI économiques qui serviront de preuve mensuelle dès le départ.",
      },
      {
        id: "dsi",
        label: "DSI",
        title: "Un pilote utile sans ouvrir un chantier de remplacement.",
        summary:
          "La DSI doit voir une entrée à faible friction: exports existants, lecture seule, périmètre borné, données agrégées et gouvernance claire. C'est ce qui permet de créer de la valeur sans dette cachée.",
        bullets: [
          "Exports ou API en lecture seule au démarrage",
          "Aucune réécriture des outils planning / CRM / extranet",
          "Deux horizons utiles avec les mêmes exports et un périmètre borné",
          "Périmètre court, sponsors identifiés, données minimales explicites",
        ],
        objection: "Les données sont trop hétérogènes pour un pilote sérieux.",
        response:
          "La preuve sert précisément à trouver la donnée exploitable minimale, pas à résoudre l'urbanisme complet du réseau.",
        proofMetric: "Temps d'accès à l'export, stabilité du mapping campus, qualité des données suffisante pour trois décisions",
        nextStep: "Lister l'export planning, l'export absences et le référentiel salles avant la réunion de cadrage.",
      },
    ] satisfies StakeholderView[],
  },
  pilot: {
    eyebrow: "Le bon parcours commercial",
    title: "D'abord une preuve sur historique.",
    subtitle:
      "En 5 jours ouvrés, Praedixa montre sur les données existantes d'un périmètre Skolae où le potentiel de gain est réel. Si le signal est confirmé, un déploiement cadré installe ensuite le suivi dans le temps.",
    scope: ["5 jours ouvrés", "Lecture seule", "1 campus ou périmètre réaliste", "Puis déploiement ciblé"],
    timeline: [
      {
        label: "Jours 1-5",
        title: "Preuve sur historique",
        text: "Qualifier l'export minimal et objectiver où temps, argent et continuité se perdent déjà sur planning, absences, salles et coûts.",
      },
      {
        label: "Semaine 1",
        title: "Cadrer le déploiement",
        text: "Choisir le campus pilote, les arbitrages prioritaires et les KPI qui serviront de preuve mensuelle.",
      },
      {
        label: "Semaines 2-6",
        title: "Installer la boucle DecisionOps",
        text: "Mettre en place les signaux, les options comparées et le journal de décision sur un périmètre borné.",
      },
      {
        label: "Semaine 8",
        title: "Prouver le ROI et décider la suite",
        text: "Produire une lecture concise pour Ops, Finance et DSI afin de décider une extension crédible.",
      },
    ],
    dataInputs: [
      "Planning des séances, groupes, intervenants et salles",
      "Absences intervenants et règles de remplacement",
      "Capacités salles et contraintes matérielles",
      "Calendrier examens et rattrapages",
      "Coûts ou proxies de coûts déjà suivis par Skolae",
      "Volumes agrégés de scolarité ou de support si disponibles",
    ],
    deliverables: [
      "Une preuve sur historique en 5 jours ouvrés",
      "Les arbitrages prioritaires à traiter en premier",
      "Trois scénarios types avec coût, service et risque",
      "Un journal de décision partagé pour relire les arbitrages",
      "Une preuve mensuelle que la finance peut défendre",
    ],
    kpis: [
      "Intervenants bookés à temps et besoins sécurisés en amont",
      "Cours annulés ou déplacés à moins de 48 heures",
      "Coût de remplacement et d'urgence évité",
      "Taux d'occupation ou conflits salles",
      "Délai d'information des étudiants",
      "Incidents examens ou backlog scolarité",
    ],
    governance: [
      "Sponsor Ops: direction des études ou responsable planning campus",
      "Sponsor Finance: DAF ou relais contrôle de gestion",
      "Sponsor DSI: accès et cadrage des données",
      "Rituels: point hebdomadaire 30 min et revue mensuelle ROI",
    ],
  },
  cta: {
    eyebrow: "Prochain pas",
    title: "Le bon premier pas pour Skolae,",
    highlighted: "c'est la preuve sur historique",
    subtitle:
      "Pas une démo générique, pas un chantier SI. Une lecture en 5 jours ouvrés sur un périmètre réaliste pour objectiver les arbitrages prioritaires, puis décider si un déploiement ciblé mérite d'être lancé.",
    primaryLabel: "Demander la preuve sur historique",
    primaryHref: "mailto:contact@praedixa.com?subject=Praedixa%20x%20Skolae%20-%20atelier%20de%20cadrage",
    secondaryLabel: "Voir le parcours",
    secondaryHref: "#pilot",
    agendaTitle: "Ce qu'il faut verrouiller en 45 minutes",
    agendaItems: [
      "Choisir 1 campus ou périmètre historique à relire",
      "Valider l'export minimal planning, absences, salles et coûts",
      "Identifier 3 arbitrages récurrents sous coût / service / risque",
      "Fixer la preuve ROI attendue côté finance",
      "Décider des conditions de passage de la preuve au déploiement",
    ],
    note:
      "Sortir de l'atelier avec un périmètre, les exports minimaux et un critère clair de passage de la preuve sur historique au déploiement.",
  },
  footer: {
    note:
      "Praedixa aide Skolae à objectiver les arbitrages qui protègent la continuité pédagogique et la marge, sans remplacer les outils déjà en place.",
    sources: [
      {
        label: "Skolae - Le groupe",
        href: "https://www.skolae.fr/le-groupe",
      },
      {
        label: "Réseau GES - Chargé de planification",
        href: "https://reseaugeseteductive.flatchr.io/fr/company/reseaugeseteductive/vacancy/jkj0mpzog5adxngx-charge-de-planification-h-f/",
      },
      {
        label: "Skolae - Chargé de recrutement formateurs",
        href: "https://www.wizbii.com/company/skolae/job/charge-de-recrutement-formateurs-h-f",
      },
      {
        label: "Praedixa - page d'accueil",
        href: "https://www.praedixa.com/",
      },
      {
        label: "Praedixa - coût de l'inaction",
        href: "https://www.praedixa.com/fr/ressources/cout-inaction-logistique",
      },
    ],
  },
};
