import type { Locale } from "../i18n/config";
import { localizedSlugs } from "../i18n/config";

export type KnowledgePageKey =
  | "about"
  | "resources"
  | "pillarCapacity"
  | "pillarLogistics"
  | "pillarAbsence"
  | "pillarPenalties"
  | "pillarImpact"
  | "bofuLogistics"
  | "bofuTransport"
  | "bofuRetail"
  | "clusterCost"
  | "clusterForecast"
  | "clusterPlaybook"
  | "clusterRms"
  | "clusterWarehouseForecast"
  | "clusterWarehousePlanning";

export interface KnowledgeSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface KnowledgeLink {
  label: string;
  key: KnowledgePageKey;
}

export interface KnowledgePageContent {
  key: KnowledgePageKey;
  kicker: string;
  title: string;
  description: string;
  lead: string;
  sections: KnowledgeSection[];
  links?: KnowledgeLink[];
  ctaLabel: string;
}

const frContent: Record<KnowledgePageKey, KnowledgePageContent> = {
  about: {
    key: "about",
    kicker: "Praedixa",
    title: "À propos",
    description:
      "Mission, positionnement et gouvernance de Praedixa pour le pilotage de couverture multi-sites.",
    lead: "Praedixa aide les équipes opérations et finance à cadrer des décisions de couverture multi-sites avec des signaux lisibles, des options comparables et une preuve d'impact exploitable.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Donner un cadre de décision opérationnelle sobre et rigoureux pour anticiper les tensions de couverture.",
          "Réduire les arbitrages défensifs en apportant une lecture commune entre terrain, direction des opérations et direction financière.",
        ],
      },
      {
        title: "Positionnement",
        paragraphs: [
          "Praedixa n'est ni un outil de paie ni un outil de planning terrain. La plateforme se concentre sur la décision et sa traçabilité.",
          "L'objectif est de relier risque opérationnel, options d'action et justification économique dans un format exploitable en comité.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          "Email principal : hello@praedixa.com",
          "Canal institutionnel : linkedin.com/company/praedixa",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  resources: {
    key: "resources",
    kicker: "Ressources",
    title: "Ressources opérationnelles",
    description:
      "Cadres pratiques pour capacité, sous-couverture, arbitrages et preuve d'impact.",
    lead: "Cette bibliothèque rassemble des pages de référence pour structurer l'analyse, la priorisation et la décision en environnement multi-sites.",
    sections: [
      {
        title: "Piliers",
        paragraphs: [
          "Les pages piliers couvrent les enjeux structurants : capacité, logistique, absences, pénalités et gouvernance de l'impact.",
        ],
      },
      {
        title: "Guides opérationnels",
        paragraphs: [
          "Les clusters détaillent les méthodes d'analyse et d'arbitrage à appliquer sur des situations récurrentes.",
        ],
      },
      {
        title: "Pages secteur",
        paragraphs: [
          "Les pages BOFU traduisent la méthode Praedixa dans des contextes logistique, transport et distribution retail.",
        ],
      },
    ],
    links: [
      { label: "Capacité et sous-couverture", key: "pillarCapacity" },
      {
        label: "Logistique et planification de capacité",
        key: "pillarLogistics",
      },
      { label: "Anticiper l'absentéisme", key: "pillarAbsence" },
      { label: "Pénalités logistiques", key: "pillarPenalties" },
      { label: "Preuve d'impact opérationnelle", key: "pillarImpact" },
      { label: "Praedixa pour la logistique", key: "bofuLogistics" },
      { label: "Praedixa pour le transport", key: "bofuTransport" },
      { label: "Praedixa pour la distribution retail", key: "bofuRetail" },
    ],
    ctaLabel: "Demander un pilote",
  },
  pillarCapacity: {
    key: "pillarCapacity",
    kicker: "Pilier",
    title: "Capacité et sous-couverture",
    description:
      "Cadre de lecture pour relier charge, capacité disponible et risque de sous-couverture.",
    lead: "Le sujet n'est pas uniquement la disponibilité brute. Il s'agit de décider tôt, avec un niveau de criticité clair et des options concrètes.",
    sections: [
      {
        title: "Lecture commune",
        paragraphs: [
          "Une gouvernance robuste commence par des définitions partagées : exposition, criticité, coût d'inaction et effet attendu d'une action.",
          "Quand les définitions changent selon les équipes, la décision devient défensive et difficile à défendre.",
        ],
      },
      {
        title: "Rythme de pilotage",
        paragraphs: [
          "Le pilotage doit fonctionner en continu avec des revues courtes et des signaux stables.",
        ],
        bullets: [
          "Identifier les zones sous tension",
          "Comparer des actions de renfort et de réallocation",
          "Tracer les décisions validées",
        ],
      },
      {
        title: "Contenus associés",
        paragraphs: [
          "Consultez les guides dédiés au coût de la sous-couverture, aux prévisions charge/capacité et aux options d'action opérationnelles.",
        ],
      },
    ],
    links: [
      { label: "Calculer le coût de la sous-couverture", key: "clusterCost" },
      { label: "Prévision charge/capacité", key: "clusterForecast" },
      { label: "Playbook options de renfort", key: "clusterPlaybook" },
    ],
    ctaLabel: "Demander un pilote",
  },
  pillarLogistics: {
    key: "pillarLogistics",
    kicker: "Pilier",
    title: "Logistique et planification de capacité",
    description:
      "Approche décisionnelle pour opérations logistiques multi-sites.",
    lead: "Dans les environnements logistiques, la planification gagne en robustesse quand la lecture de risque et la décision économique sont alignées.",
    sections: [
      {
        title: "Cadre opérationnel",
        paragraphs: [
          "Le pilotage de capacité doit intégrer variabilité de charge, disponibilité réelle des équipes et continuité de service.",
          "L'objectif est de prioriser rapidement les zones où l'impact opérationnel est le plus sensible.",
        ],
      },
      {
        title: "Complémentarité avec les outils existants",
        paragraphs: [
          "Praedixa complète les outils RMS et WFM en apportant un cadre d'arbitrage orienté décision et preuve d'impact.",
        ],
      },
      {
        title: "Contenus associés",
        paragraphs: [
          "Consultez les pages dédiées à RMS vs Praedixa, à la prévision de charge entrepôt et à la planification des ressources.",
        ],
      },
    ],
    links: [
      { label: "RMS vs Praedixa", key: "clusterRms" },
      {
        label: "Prévoir la charge en entrepôt",
        key: "clusterWarehouseForecast",
      },
      {
        label: "Planification des ressources entrepôt",
        key: "clusterWarehousePlanning",
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  pillarAbsence: {
    key: "pillarAbsence",
    kicker: "Pilier",
    title: "Anticiper absentéisme et sous-effectif",
    description:
      "Méthode pour traiter la dérive de couverture liée aux absences et aux déséquilibres structurels.",
    lead: "L'enjeu n'est pas de commenter l'historique, mais de structurer des décisions de couverture avant la rupture terrain.",
    sections: [
      {
        title: "Lecture utile",
        paragraphs: [
          "Le pilotage gagne en clarté quand les signaux sont agrégés au niveau équipe et site, avec une priorisation homogène.",
        ],
      },
      {
        title: "Décision actionnable",
        paragraphs: [
          "Les options sont évaluées selon continuité de service, capacité restante et implications budgétaires.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  pillarPenalties: {
    key: "pillarPenalties",
    kicker: "Pilier",
    title: "Pénalités logistiques et anticipation",
    description:
      "Cadre pour relier risques opérationnels, contraintes contractuelles et gouvernance des décisions.",
    lead: "Praedixa aide à documenter les arbitrages qui précèdent les situations de pénalités et à expliciter les hypothèses décisionnelles.",
    sections: [
      {
        title: "Alignement ops/finance",
        paragraphs: [
          "Le pilotage devient plus robuste quand les équipes opérationnelles et financières partagent la même base d'analyse.",
          "Chaque arbitrage doit rester traçable pour faciliter la revue de gouvernance.",
        ],
      },
      {
        title: "Démarche",
        paragraphs: [
          "Qualifier l'exposition, choisir une action, documenter les hypothèses, puis observer les effets sur le service.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  pillarImpact: {
    key: "pillarImpact",
    kicker: "Pilier",
    title: "Preuve d'impact opérationnelle",
    description:
      "Structurer la preuve avant/après pour sécuriser les arbitrages en comité.",
    lead: "La preuve d'impact ne se limite pas à un tableau de bord. Elle repose sur un journal décisionnel, des hypothèses explicites et une lecture commune.",
    sections: [
      {
        title: "Journal de décision",
        paragraphs: [
          "Chaque décision est associée à son contexte, ses options évaluées et son rationnel.",
        ],
      },
      {
        title: "Revue de gouvernance",
        paragraphs: [
          "Les revues permettent d'aligner terrain, opérations et finance sur des faits observables.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  bofuLogistics: {
    key: "bofuLogistics",
    kicker: "Solutions secteur",
    title: "Praedixa pour la logistique",
    description:
      "Anticiper les tensions de couverture et cadrer les arbitrages en environnement logistique multi-sites.",
    lead: "Praedixa apporte une lecture priorisée des risques et un cadre décisionnel exploitable par les équipes opérations et finance.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Volatilité de charge, réallocation inter-sites, arbitrages de continuité de service.",
        ],
      },
      {
        title: "Résultat attendu",
        paragraphs: [
          "Des décisions explicites, partageables et auditablement documentées.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports opérationnels agrégés, en lecture seule, sans dépendance intrusive au SI.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  bofuTransport: {
    key: "bofuTransport",
    kicker: "Solutions secteur",
    title: "Praedixa pour le transport",
    description:
      "Cadrer les arbitrages de couverture pour maintenir la fiabilité opérationnelle du transport.",
    lead: "Le pilotage transport exige une priorisation claire des risques et une coordination rapide entre exploitation et finance.",
    sections: [
      {
        title: "Points de tension",
        paragraphs: [
          "Variabilité de service, absences, renforts de dernière minute, compromis coût/continuité.",
        ],
      },
      {
        title: "Approche Praedixa",
        paragraphs: [
          "Lecture de criticité, options comparables, justification des décisions et traçabilité.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  bofuRetail: {
    key: "bofuRetail",
    kicker: "Solutions secteur",
    title: "Praedixa pour la distribution retail",
    description:
      "Sécuriser la couverture opérationnelle multi-sites en distribution et retail.",
    lead: "Praedixa aide à arbitrer les actions de couverture en alignant priorités terrain, niveau de service et lecture économique.",
    sections: [
      {
        title: "Enjeux terrain",
        paragraphs: [
          "Pics d'activité, continuité de service, coordination entre sites et priorisation des actions.",
        ],
      },
      {
        title: "Décision gouvernée",
        paragraphs: [
          "Un cadre de décision explicite simplifie les échanges entre exploitation, siège et finance.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterCost: {
    key: "clusterCost",
    kicker: "Guide",
    title: "Calculer le coût de la sous-couverture",
    description:
      "Méthode pratique pour qualifier le coût d'inaction et comparer des options de couverture.",
    lead: "Le coût de la sous-couverture se lit à travers le service, la charge managériale et la pression budgétaire.",
    sections: [
      {
        title: "Hypothèses",
        paragraphs: [
          "Poser des hypothèses simples et explicites permet de comparer les options sans débat improductif.",
        ],
      },
      {
        title: "Utilisation",
        paragraphs: [
          "Le calcul sert à trier les décisions et à justifier les arbitrages en revue.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterForecast: {
    key: "clusterForecast",
    kicker: "Guide",
    title: "Prévision charge et capacité à court horizon",
    description:
      "Organisation d'une boucle courte pour détecter les tensions avant rupture.",
    lead: "Une prévision utile doit rester lisible, actionnable et alignée avec les décisions réellement disponibles.",
    sections: [
      {
        title: "Boucle courte",
        paragraphs: [
          "Combiner lecture hebdomadaire et revue opérationnelle pour hiérarchiser rapidement les zones exposées.",
        ],
      },
      {
        title: "Facteurs",
        paragraphs: [
          "Conserver des facteurs explicatifs compréhensibles pour faciliter l'adhésion des équipes terrain.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterPlaybook: {
    key: "clusterPlaybook",
    kicker: "Guide",
    title: "Playbook options de renfort et réaffectation",
    description:
      "Structurer les choix d'actions selon criticité, capacité restante et continuité de service.",
    lead: "Un playbook efficace clarifie qui décide, sur quelle base et avec quelle traçabilité.",
    sections: [
      {
        title: "Standardisation",
        paragraphs: [
          "Formaliser les options évite les décisions improvisées et améliore la cohérence entre sites.",
        ],
      },
      {
        title: "Gouvernance",
        paragraphs: [
          "Chaque action validée doit être consignée pour faciliter la revue d'impact.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterRms: {
    key: "clusterRms",
    kicker: "Guide",
    title: "RMS vs Praedixa",
    description:
      "Comprendre la différence entre gestion des ressources et cadre décisionnel de couverture.",
    lead: "Les outils RMS structurent l'exécution. Praedixa structure l'arbitrage économique et la preuve d'impact.",
    sections: [
      {
        title: "Complémentarité",
        paragraphs: [
          "Praedixa complète les outils en place sans remplacer la planification existante.",
        ],
      },
      {
        title: "Quand utiliser quoi",
        paragraphs: [
          "RMS pour orchestrer les ressources, Praedixa pour prioriser les décisions de couverture en gouvernance ops/finance.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterWarehouseForecast: {
    key: "clusterWarehouseForecast",
    kicker: "Guide",
    title: "Prévoir la charge en entrepôt",
    description:
      "Méthode pour relier variabilité de charge et exposition opérationnelle en entrepôt.",
    lead: "La priorité est d'identifier tôt les zones où la continuité de service risque d'être fragilisée.",
    sections: [
      {
        title: "Signal utile",
        paragraphs: [
          "Un signal utile combine niveau de tension, criticité métier et options réellement activables.",
        ],
      },
      {
        title: "Cadence",
        paragraphs: [
          "La valeur se construit dans une routine de pilotage régulière, partagée par les responsables de site.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
  clusterWarehousePlanning: {
    key: "clusterWarehousePlanning",
    kicker: "Guide",
    title: "Planification des ressources entrepôt",
    description:
      "Structurer la planification pour réduire la décision d'urgence.",
    lead: "Une planification robuste articule visibilité opérationnelle, choix d'action et justification économique.",
    sections: [
      {
        title: "Base commune",
        paragraphs: [
          "Les équipes doivent partager les mêmes priorités et les mêmes règles d'arbitrage.",
        ],
      },
      {
        title: "Exécution",
        paragraphs: [
          "La planification gagne en qualité quand elle s'appuie sur des décisions tracées et revues.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote",
  },
};

const enContent: Record<KnowledgePageKey, KnowledgePageContent> = {
  about: {
    key: "about",
    kicker: "Praedixa",
    title: "About",
    description:
      "Mission, positioning, and governance of Praedixa for multi-site coverage steering.",
    lead: "Praedixa helps operations and finance teams frame multi-site coverage decisions with readable signals, comparable options, and auditable impact evidence.",
    sections: [
      {
        title: "Mission",
        paragraphs: [
          "Provide a sober and rigorous decision framework to anticipate coverage tensions.",
          "Reduce defensive trade-offs by aligning field teams, operations leadership, and finance leadership.",
        ],
      },
      {
        title: "Positioning",
        paragraphs: [
          "Praedixa is not payroll software and not a field scheduling tool. It focuses on decision quality and traceability.",
          "The goal is to connect operational risk, action options, and economic justification in committee-ready form.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          "Main email: hello@praedixa.com",
          "Institutional channel: linkedin.com/company/praedixa",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  resources: {
    key: "resources",
    kicker: "Resources",
    title: "Operational resources",
    description:
      "Practical frameworks for capacity, coverage gaps, trade-offs, and impact proof.",
    lead: "This library gathers reference pages to structure analysis, prioritization, and decision-making in multi-site environments.",
    sections: [
      {
        title: "Pillars",
        paragraphs: [
          "Pillar pages cover structural themes: capacity, logistics, absences, penalties, and impact governance.",
        ],
      },
      {
        title: "Operational guides",
        paragraphs: [
          "Cluster pages detail analysis and arbitration methods for recurring situations.",
        ],
      },
      {
        title: "Industry pages",
        paragraphs: [
          "BOFU pages translate the Praedixa method for logistics, transport, and retail distribution contexts.",
        ],
      },
    ],
    links: [
      { label: "Capacity and coverage gaps", key: "pillarCapacity" },
      { label: "Logistics capacity planning", key: "pillarLogistics" },
      { label: "Anticipate absenteeism", key: "pillarAbsence" },
      { label: "Logistics penalties", key: "pillarPenalties" },
      { label: "Operational impact proof", key: "pillarImpact" },
      { label: "Praedixa for logistics", key: "bofuLogistics" },
      { label: "Praedixa for transport", key: "bofuTransport" },
      { label: "Praedixa for retail distribution", key: "bofuRetail" },
    ],
    ctaLabel: "Request a pilot",
  },
  pillarCapacity: {
    key: "pillarCapacity",
    kicker: "Pillar",
    title: "Capacity and coverage gaps",
    description:
      "A practical framework to connect workload, available capacity, and coverage risk.",
    lead: "The challenge is not raw availability alone. It is making earlier decisions with explicit criticality and concrete options.",
    sections: [
      {
        title: "Shared reading",
        paragraphs: [
          "Robust governance starts with shared definitions: exposure, criticality, cost of inaction, and expected effect of each action.",
          "When definitions vary by team, decisions become defensive and hard to defend.",
        ],
      },
      {
        title: "Steering cadence",
        paragraphs: [
          "Steering should run continuously through short review loops and stable signals.",
        ],
        bullets: [
          "Identify exposed zones",
          "Compare staffing and reallocation actions",
          "Trace validated decisions",
        ],
      },
      {
        title: "Related guides",
        paragraphs: [
          "See dedicated guides on coverage-gap cost, workload/capacity forecasting, and operational action options.",
        ],
      },
    ],
    links: [
      { label: "Calculate coverage-gap cost", key: "clusterCost" },
      { label: "Workload and capacity forecasting", key: "clusterForecast" },
      { label: "Staffing options playbook", key: "clusterPlaybook" },
    ],
    ctaLabel: "Request a pilot",
  },
  pillarLogistics: {
    key: "pillarLogistics",
    kicker: "Pillar",
    title: "Logistics capacity planning",
    description:
      "Decision-oriented approach for multi-site logistics operations.",
    lead: "In logistics contexts, planning becomes stronger when risk reading and economic decision framing are aligned.",
    sections: [
      {
        title: "Operational frame",
        paragraphs: [
          "Capacity steering must integrate workload variability, effective workforce availability, and service continuity.",
          "The objective is to prioritize where operational impact is most sensitive.",
        ],
      },
      {
        title: "Complementarity with existing tools",
        paragraphs: [
          "Praedixa complements RMS and WFM tools with a decision and impact-proof layer.",
        ],
      },
      {
        title: "Related guides",
        paragraphs: [
          "See RMS vs Praedixa, warehouse workload forecasting, and warehouse resource planning pages.",
        ],
      },
    ],
    links: [
      { label: "RMS vs Praedixa", key: "clusterRms" },
      { label: "Forecast warehouse workload", key: "clusterWarehouseForecast" },
      { label: "Warehouse resource planning", key: "clusterWarehousePlanning" },
    ],
    ctaLabel: "Request a pilot",
  },
  pillarAbsence: {
    key: "pillarAbsence",
    kicker: "Pillar",
    title: "Anticipate absenteeism and understaffing",
    description:
      "Method to address coverage drift linked to absences and structural imbalances.",
    lead: "The goal is not retrospective commentary. It is to frame coverage decisions before field disruption.",
    sections: [
      {
        title: "Useful reading",
        paragraphs: [
          "Steering improves when signals are aggregated at team and site level with a consistent prioritization model.",
        ],
      },
      {
        title: "Actionable decision",
        paragraphs: [
          "Options are evaluated through service continuity, remaining capacity, and budget implications.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  pillarPenalties: {
    key: "pillarPenalties",
    kicker: "Pillar",
    title: "Logistics penalties and anticipation",
    description:
      "Frame connecting operational risks, contractual constraints, and decision governance.",
    lead: "Praedixa helps document the trade-offs that precede penalty situations and make assumptions explicit.",
    sections: [
      {
        title: "Ops/finance alignment",
        paragraphs: [
          "Steering is stronger when operations and finance teams share the same analysis base.",
          "Each decision should remain traceable for governance review.",
        ],
      },
      {
        title: "Approach",
        paragraphs: [
          "Qualify exposure, choose an action, document assumptions, then observe service effects.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  pillarImpact: {
    key: "pillarImpact",
    kicker: "Pillar",
    title: "Operational impact proof",
    description:
      "Structure before/after proof to secure committee-level decisions.",
    lead: "Impact proof is not only a dashboard. It requires a decision log, explicit assumptions, and a shared interpretation model.",
    sections: [
      {
        title: "Decision log",
        paragraphs: [
          "Each decision is linked to context, evaluated options, and explicit rationale.",
        ],
      },
      {
        title: "Governance review",
        paragraphs: [
          "Reviews align field, operations, and finance teams around observable facts.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  bofuLogistics: {
    key: "bofuLogistics",
    kicker: "Industry solution",
    title: "Praedixa for logistics",
    description:
      "Anticipate coverage tensions and frame trade-offs in multi-site logistics environments.",
    lead: "Praedixa provides prioritized risk reading and a decision framework usable by both operations and finance.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Workload volatility, cross-site reallocations, and service continuity trade-offs.",
        ],
      },
      {
        title: "Expected outcome",
        paragraphs: ["Explicit, shareable, and auditable decisions."],
      },
      {
        title: "Required data",
        paragraphs: [
          "Aggregated operational exports, read-only, with no intrusive IT dependency.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  bofuTransport: {
    key: "bofuTransport",
    kicker: "Industry solution",
    title: "Praedixa for transport",
    description:
      "Frame coverage trade-offs to maintain transport operational reliability.",
    lead: "Transport steering requires clear risk prioritization and fast coordination between operations and finance.",
    sections: [
      {
        title: "Tension points",
        paragraphs: [
          "Service variability, absences, late staffing actions, and cost-versus-continuity trade-offs.",
        ],
      },
      {
        title: "Praedixa approach",
        paragraphs: [
          "Criticality reading, comparable options, decision rationale, and traceability.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  bofuRetail: {
    key: "bofuRetail",
    kicker: "Industry solution",
    title: "Praedixa for retail distribution",
    description:
      "Secure multi-site coverage steering in retail and distribution networks.",
    lead: "Praedixa supports coverage actions by aligning field priorities, service continuity, and economic reading.",
    sections: [
      {
        title: "Field challenges",
        paragraphs: [
          "Activity peaks, service continuity, cross-site coordination, and action prioritization.",
        ],
      },
      {
        title: "Governed decision",
        paragraphs: [
          "An explicit decision frame simplifies alignment between field teams, headquarters, and finance.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterCost: {
    key: "clusterCost",
    kicker: "Guide",
    title: "Calculate coverage-gap cost",
    description:
      "Practical method to qualify cost of inaction and compare coverage options.",
    lead: "Coverage-gap cost appears through service impact, managerial pressure, and budget stress.",
    sections: [
      {
        title: "Assumptions",
        paragraphs: [
          "Simple explicit assumptions make options comparable and remove unproductive debates.",
        ],
      },
      {
        title: "Usage",
        paragraphs: [
          "Cost framing helps prioritize decisions and justify trade-offs during reviews.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterForecast: {
    key: "clusterForecast",
    kicker: "Guide",
    title: "Short-horizon workload and capacity forecasting",
    description:
      "How to structure a short loop that detects tensions before disruption.",
    lead: "A useful forecast must stay readable, actionable, and aligned with decisions teams can actually take.",
    sections: [
      {
        title: "Short loop",
        paragraphs: [
          "Combine regular reading and operational review to prioritize exposed zones quickly.",
        ],
      },
      {
        title: "Factors",
        paragraphs: [
          "Keep explanatory factors understandable to improve adoption by field teams.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterPlaybook: {
    key: "clusterPlaybook",
    kicker: "Guide",
    title: "Staffing and reallocation options playbook",
    description:
      "Structure action choices by criticality, remaining capacity, and service continuity.",
    lead: "An effective playbook clarifies who decides, on which basis, and with which traceability.",
    sections: [
      {
        title: "Standardization",
        paragraphs: [
          "Formalized options reduce improvised decisions and improve cross-site consistency.",
        ],
      },
      {
        title: "Governance",
        paragraphs: [
          "Each validated action should be logged to support impact review.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterRms: {
    key: "clusterRms",
    kicker: "Guide",
    title: "RMS vs Praedixa",
    description:
      "Understand the difference between resource execution tools and coverage decision framing.",
    lead: "RMS tools structure execution. Praedixa structures economic trade-offs and impact proof.",
    sections: [
      {
        title: "Complementarity",
        paragraphs: [
          "Praedixa complements existing tools without replacing current planning systems.",
        ],
      },
      {
        title: "When to use what",
        paragraphs: [
          "Use RMS to orchestrate resources and Praedixa to prioritize coverage decisions in ops/finance governance.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterWarehouseForecast: {
    key: "clusterWarehouseForecast",
    kicker: "Guide",
    title: "Forecast warehouse workload",
    description:
      "Method to connect workload variability and operational exposure in warehouse contexts.",
    lead: "The priority is to detect early where service continuity might weaken.",
    sections: [
      {
        title: "Useful signal",
        paragraphs: [
          "A useful signal combines tension level, business criticality, and realistically activable options.",
        ],
      },
      {
        title: "Cadence",
        paragraphs: [
          "Value comes from a shared steering routine across site leaders.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
  clusterWarehousePlanning: {
    key: "clusterWarehousePlanning",
    kicker: "Guide",
    title: "Warehouse resource planning",
    description: "How to structure planning to reduce emergency decisions.",
    lead: "Robust planning links operational visibility, action choices, and economic justification.",
    sections: [
      {
        title: "Shared baseline",
        paragraphs: [
          "Teams need common priorities and common arbitration rules.",
        ],
      },
      {
        title: "Execution",
        paragraphs: [
          "Planning quality improves when decisions are logged and reviewed.",
        ],
      },
    ],
    ctaLabel: "Request a pilot",
  },
};

export function getKnowledgePage(
  locale: Locale,
  key: KnowledgePageKey,
): KnowledgePageContent {
  return locale === "fr" ? frContent[key] : enContent[key];
}

export function getKnowledgePath(
  locale: Locale,
  key: KnowledgePageKey,
): string {
  return `/${locale}/${localizedSlugs[key][locale]}`;
}
