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
    title: "Sécuriser la capacité pédagogique",
    highlighted: "et réduire les urgences campus",
    intro:
      "Praedixa aide Skolae à sécuriser plus tôt salles, intervenants et groupes pour éviter les replanifications de dernière minute. Résultat: moins d'urgences campus, moins de coûts de remplacement et plus de stabilité pour les équipes, les étudiants et les entreprises partenaires.",
    summary:
      "Praedixa agit sur deux horizons. À 4 à 12 semaines, Skolae sécurise la capacité pédagogique. À 3 à 14 jours, Skolae évite les incidents de dernière minute. Le tout sans remplacer les outils déjà en place.",
    ctaPrimary: "Lancer le pilote sur 1 campus",
    ctaPrimaryHref: "#cta",
    ctaSecondary: "Voir ce que Skolae gagne",
    ctaSecondaryHref: "#decision-focus",
    chips: [
      "23 écoles",
      "37 villes",
      "Lecture seule",
      "Pilote 8 semaines",
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
      { label: "Horizon capacité", value: "4 à 12 semaines", note: "réserver plus tôt salles et intervenants" },
      { label: "Horizon exécution", value: "3 à 14 jours", note: "éviter la casse de dernière minute" },
      { label: "Périmètre pilote", value: "1 à 3 campus", note: "faible friction côté réseau" },
      { label: "Lecture comité", value: "Ops + Finance + DSI", note: "preuve lisible pour décider" },
    ],
    boardSignals: [
      "Plus d'intervenants sécurisés en amont",
      "Moins de semaines qui déraillent au dernier moment",
      "Moins de coûts d'urgence et de remplacement subis",
      "Plus de continuité pour les campus et les étudiants",
    ],
  },
  whyNow: {
    eyebrow: "Ce que Skolae gagne",
    title: "Des bénéfices simples à comprendre,",
    highlighted: "et rapides à défendre",
    description:
      "Skolae a déjà les outils pour opérer. Ce qui manque, c'est une façon simple de réserver, arbitrer et réagir plus tôt quand la capacité commence à se tendre.",
    benefits: [
      {
        title: "Sécuriser les bons intervenants plus tôt",
        description:
          "Praedixa met en lumière les semaines et les groupes qui auront besoin d'être sécurisés avant que le campus ne bascule en mode urgence.",
      },
      {
        title: "Stabiliser salles et groupes avant la tension",
        description:
          "Skolae peut décider plus tôt s'il faut réallouer une salle, rebalancer des groupes ou ouvrir de la capacité au bon endroit.",
      },
      {
        title: "Réduire les replanifications et les coûts subis",
        description:
          "Moins de remplacement tardif, moins de modifications à moins de 48 heures, moins de charge improvisée pour les équipes.",
      },
      {
        title: "Donner au siège et aux campus la même lecture",
        description:
          "Ops, Finance et DSI partent des mêmes signaux, comparent les mêmes options et défendent plus facilement la même décision.",
      },
    ] satisfies ValueBenefit[],
    paragraphs: [
      "Pour remplir les salles, réserver les bons intervenants et décider d'ouvrir ou non un groupe, il faut souvent plusieurs semaines de visibilité. Si tout se joue seulement à J+7, la marge de manœuvre est déjà trop faible.",
      "Quand un campus découvre trop tard un trou de couverture, tout se dégrade ensuite en chaîne: replanifications, remplacement dans l'urgence, tension équipes, étudiants prévenus trop tard et coûts mal tenus.",
      "Sur un réseau multi-sites, le problème n'est pas seulement local. Il devient groupe: mêmes douleurs, arbitrages différents et aucune lecture commune pour prioriser ce qui mérite d'être traité en premier.",
      "Praedixa sécurise d'abord la capacité, puis réduit les urgences d'exécution, avec une preuve simple sur continuité pédagogique, charge opérationnelle et coûts d'urgence.",
    ],
    signals: [
      {
        label: "Continuité réseau",
        value: "23 écoles et 37 villes: plus le réseau est large, plus la décision doit rester lisible d'un campus à l'autre",
        qualifier: "Praedixa apporte une lecture commune sans centraliser toute l'exécution",
        evidence: "official",
        href: "https://www.skolae.fr/le-groupe",
      },
      {
        label: "Douleur prouvée",
        value: "Skolae recrute pour gérer salles, absences, goulots et replanifications rapides",
        qualifier: "le besoin est déjà visible publiquement, ce qui rend un pilote ciblé plus simple à cadrer",
        evidence: "job",
        href: "https://reseaugeseteductive.flatchr.io/fr/company/reseaugeseteductive/vacancy/jkj0mpzog5adxngx-charge-de-planification-h-f/",
      },
      {
        label: "Extension future",
        value: "La logique capacité / staffing existe aussi côté formateurs et formation continue",
        qualifier: "la première preuve peut être pédagogique; l'extension peut venir ensuite",
        evidence: "job",
        href: "https://www.wizbii.com/company/skolae/job/charge-de-recrutement-formateurs-h-f",
      },
    ] satisfies EvidenceClaim[],
  },
  decisionFocus: {
    eyebrow: "La question clé à traiter",
    title: "Savoir où la capacité va manquer,",
    highlighted: "puis agir avant que la semaine casse",
    statement:
      "Voir 4 à 12 semaines à l'avance où la capacité va manquer, puis 3 à 14 jours à l'avance quels cours risquent d'être annulés, déplacés ou remplacés.",
    body:
      "Praedixa ne remplace pas le planning. Praedixa aide Skolae à voir le risque plus tôt, comparer les options concrètes et agir avant que l'urgence prenne la main.",
    frame: [
      {
        label: "Ce que Praedixa détecte",
        value: "Les tensions de capacité à 4-12 semaines, puis les risques d'exécution à 3-14 jours",
      },
      {
        label: "Ce que Praedixa compare",
        value: "Remplacer, déplacer, mutualiser, réallouer, ouvrir de la capacité ou prioriser",
      },
      {
        label: "Ce que Skolae gagne",
        value: "Plus de capacité sécurisée, moins de semaines qui déraillent et un comité mieux armé",
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
    ] satisfies DecisionExtension[],
  },
  loop: {
    eyebrow: "Ce que Praedixa apporte",
    title: "Une solution légère qui améliore la décision sans remplacer l'existant.",
    description:
      "Le bénéfice pour Skolae est simple: se brancher à l'existant, détecter les tensions plus tôt, comparer les bons leviers et prouver le gain sans lancer un chantier SI.",
    steps: [
      {
        number: "01",
        title: "Fédérer",
        text: "Aligner planning, salles, absences, examens et charge support dans une lecture commune sans refondre les outils.",
      },
      {
        number: "02",
        title: "Anticiper",
        text: "Projeter d'abord les tensions de capacité à 4-12 semaines, puis les risques d'exécution à 3-14 jours.",
      },
      {
        number: "03",
        title: "Arbitrer",
        text: "Comparer 3 à 5 leviers concrets sous un cadre commun coût, continuité de service et risque de perturbation.",
      },
      {
        number: "04",
        title: "Déclencher",
        text: "Préparer la première action utile avec validation humaine, pas un automatisme opaque.",
      },
      {
        number: "05",
        title: "Prouver",
        text: "Relire le point de départ, la décision recommandée, la décision réelle et l'impact observé dans une revue mensuelle claire.",
      },
    ],
    footer:
      "Même outils. Moins d'urgence. Plus de décisions défendables.",
  },
  stakeholders: {
    eyebrow: "Pourquoi ce pilote fédère",
    title: "Chaque sponsor y voit un gain immédiat.",
    description:
      "Le pilote avance quand chaque sponsor comprend en une minute ce qu'il gagne à le lancer.",
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
          "Le pilote assume des hypothèses simples, explicites et relues chaque mois. L'enjeu est la défendabilité, pas la sur-promesse.",
        proofMetric: "Coût des remplacements, heures supplémentaires, locations de salles, annulations évitées",
        nextStep: "Valider les trois KPI économiques qui serviront de preuve mensuelle dès le départ.",
      },
      {
        id: "dsi",
        label: "DSI",
        title: "Un pilote utile sans ouvrir un chantier de remplacement.",
        summary:
          "La DSI doit voir un pilote à faible friction: exports existants, lecture seule, périmètre borné, données agrégées et gouvernance claire. C'est ce qui permet de créer de la valeur sans dette cachée.",
        bullets: [
          "Exports ou API en lecture seule au démarrage",
          "Aucune réécriture des outils planning / CRM / extranet",
          "Deux horizons utiles avec les mêmes exports et un périmètre borné",
          "Périmètre court, sponsors identifiés, données minimales explicites",
        ],
        objection: "Les données sont trop hétérogènes pour un pilote sérieux.",
        response:
          "Le pilote sert précisément à trouver la donnée exploitable minimale, pas à résoudre l'urbanisme complet du réseau.",
        proofMetric: "Temps d'accès à l'export, stabilité du mapping campus, qualité des données suffisante pour trois décisions",
        nextStep: "Lister l'export planning, l'export absences et le référentiel salles avant la réunion de cadrage.",
      },
    ] satisfies StakeholderView[],
  },
  pilot: {
    eyebrow: "Un pilote simple à lancer",
    title: "Un pilote simple à lancer, simple à défendre.",
    subtitle:
      "Le pilote doit prouver en 8 semaines qu'on réduit annulations, remplacements urgents et coûts subis sur 1 à 3 campus, en lecture seule et avec une preuve mensuelle.",
    scope: ["Lecture seule", "1 à 3 campus", "Capacité + exécution", "Preuve mensuelle"],
    timeline: [
      {
        label: "Semaines 1-2",
        title: "Objectiver les coûts cachés",
        text: "Qualifier l'export minimal, relire les pics récents et montrer où temps, argent et continuité se perdent aujourd'hui.",
      },
      {
        label: "Semaines 3-4",
        title: "Installer les deux horizons",
        text: "Mettre en place un signal capacité à 4-12 semaines et un signal exécution à 3-14 jours sur le même périmètre.",
      },
      {
        label: "Semaines 5-6",
        title: "Comparer les décisions réelles",
        text: "Mesurer ce qui change quand les arbitrages sont pris plus tôt et sur une base commune.",
      },
      {
        label: "Semaines 7-8",
        title: "Prouver le gain et décider la suite",
        text: "Produire une lecture concise pour Ops, Finance et DSI afin de décider une extension crédible.",
      },
    ],
    dataInputs: [
      "Planning des séances, groupes, intervenants et salles",
      "Absences intervenants et règles de remplacement",
      "Capacités salles et contraintes matérielles",
      "Calendrier examens et rattrapages",
      "Volumes agrégés de scolarité ou de support si disponibles",
    ],
    deliverables: [
      "Les semaines et campus à risque à traiter en priorité",
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
    title: "Si Skolae veut un premier résultat,",
    highlighted: "le bon premier pas est un pilote sur 1 campus",
    subtitle:
      "Pas une démo générique. Un atelier de cadrage court pour choisir le campus, l'export minimal et les trois décisions qui peuvent démontrer la valeur dès cette année.",
    primaryLabel: "Lancer le pilote sur 1 campus",
    primaryHref: "mailto:contact@praedixa.com?subject=Praedixa%20x%20Skolae%20-%20atelier%20de%20cadrage",
    secondaryLabel: "Voir le pilote",
    secondaryHref: "#pilot",
    agendaTitle: "Ce qu'il faut verrouiller en 45 minutes",
    agendaItems: [
      "Choisir 1 campus prioritaire et les périodes de tension à relire",
      "Valider l'horizon capacité et l'horizon exécution à instrumenter",
      "Valider l'export minimal planning, absences et salles",
      "Fixer 3 décisions à instrumenter sur 8 semaines",
      "S'accorder sur la preuve ROI attendue côté finance",
    ],
    note:
      "Sortir de l'atelier avec un campus pilote, 3 décisions à instrumenter et les KPI Finance/Ops validés.",
  },
  footer: {
    note:
      "Praedixa aide Skolae à réduire les urgences campus, protéger la continuité pédagogique et prouver la valeur d'une meilleure décision sans remplacer les outils déjà en place.",
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
