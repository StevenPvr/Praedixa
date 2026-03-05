import type { Locale } from "../i18n/config";
import { localizedSlugs } from "../i18n/config";

export type KnowledgePageKey =
  | "about"
  | "security"
  | "resources"
  | "productMethod"
  | "howItWorksPage"
  | "decisionLogProof"
  | "integrationData"
  | "pillarCapacity"
  | "pillarLogistics"
  | "pillarAbsence"
  | "pillarPenalties"
  | "pillarImpact"
  | "icpAutomotive"
  | "icpDealership"
  | "bofuLogistics"
  | "bofuTransport"
  | "bofuRetail"
  | "bofuQsr"
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
      "Mission, positionnement et gouvernance de Praedixa pour le pilotage de couverture multi-sites, avec une priorité sur les réseaux multi-franchisés de restauration rapide.",
    lead: "Praedixa aide les équipes opérations et finance à cadrer des décisions de couverture multi-sites avec des signaux lisibles, des options comparables et une preuve d'impact exploitable, notamment pour les réseaux multi-franchisés de restauration rapide.",
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
          "Entrée au programme d'incubation d'EuraTechnologies (Lille) le 3 mars 2026.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote (boucle fermée)",
  },
  security: {
    key: "security",
    kicker: "Sécurité",
    title: "Sécurité de l'espace Praedixa",
    description:
      "Principes de sécurité, gouvernance et posture IT pour un usage enterprise.",
    lead: "La sécurité est intégrée à la méthode Praedixa: minimisation des données, accès contrôlés, traçabilité des actions et documentation transparente.",
    sections: [
      {
        title: "Principes de conception",
        paragraphs: [
          "Praedixa fonctionne avec des données agrégées et en lecture seule pour limiter l'exposition et accélérer le cadrage.",
          "Les choix de sécurité privilégient la sobriété opérationnelle et la vérifiabilité en due diligence.",
        ],
      },
      {
        title: "Contrôles clés",
        paragraphs: [
          "Chiffrement en transit et au repos, contrôle d'accès par rôle, journalisation des actions sensibles.",
        ],
        bullets: [
          "Aucune prédiction individuelle",
          "Exports CSV/Excel sans connecteur imposé",
          "Documentation contractuelle et sous-traitants communiqués sur demande",
        ],
      },
      {
        title: "Posture de transparence",
        paragraphs: [
          "Praedixa documente ses pratiques et précise les éléments non certifiés. Cette transparence évite les promesses floues et facilite la revue IT.",
        ],
      },
    ],
    links: [
      { label: "À propos de Praedixa", key: "about" },
      { label: "Ressources opérationnelles", key: "resources" },
      { label: "Protocole pilote", key: "pillarImpact" },
    ],
    ctaLabel: "Demander un pilote (boucle fermée)",
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
          "Les pages ICP traduisent la méthode Praedixa pour l'automobile, les concessions/ateliers, la logistique, le retail et les réseaux multi-franchisés.",
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
      { label: "Sécurité de l'espace Praedixa", key: "security" },
      { label: "Produit & méthode Praedixa", key: "productMethod" },
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
      { label: "Praedixa pour l'automobile", key: "icpAutomotive" },
      {
        label: "Praedixa pour les concessions et ateliers auto",
        key: "icpDealership",
      },
      { label: "Praedixa pour la logistique", key: "bofuLogistics" },
      { label: "Praedixa pour le transport", key: "bofuTransport" },
      { label: "Praedixa pour le retail", key: "bofuRetail" },
      { label: "Praedixa pour les réseaux multi-franchisés", key: "bofuQsr" },
    ],
    ctaLabel: "Demander un pilote (boucle fermée)",
  },
  productMethod: {
    key: "productMethod",
    kicker: "Produit",
    title: "Produit & méthode Praedixa",
    description:
      "Présentation claire de la couche décisionnelle Praedixa pour la couverture multi-sites.",
    lead: "Praedixa orchestre une boucle fermée: prévision du risque, décision chiffrée, 1re action assistée, puis preuve mensuelle audit-ready.",
    sections: [
      {
        title: "Ce que Praedixa fait",
        paragraphs: [
          "Prévoir le risque sous/sur-effectif à J+3, J+7 et J+14.",
          "Comparer des options opérationnelles sous une lecture coût, service et risque.",
          "Assister l'activation d'une première action, puis tracer la décision et l'impact.",
        ],
      },
      {
        title: "Ce que Praedixa ne fait pas",
        paragraphs: [
          "Praedixa n'est pas un WFM ou un planning de plus.",
          "Praedixa ne remplace pas vos outils d'exécution et ne fait pas de prédiction individuelle.",
        ],
      },
      {
        title: "Garde-fous",
        paragraphs: [
          "Démarrage en lecture seule via exports/API, données agrégées équipe/site, validation finale par le manager, hébergement en France (Scaleway).",
        ],
      },
    ],
    links: [
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Méthode",
    title: "Comment ça marche",
    description:
      "Les 4 étapes de la boucle fermée Praedixa sur horizon court.",
    lead: "La méthode Praedixa reste stable d'un site à l'autre: prévision, décision, action assistée, preuve.",
    sections: [
      {
        title: "1. Prévision du risque",
        paragraphs: [
          "Praedixa détecte les zones de sous/sur-effectif à J+3/J+7/J+14 au niveau équipe/site.",
        ],
      },
      {
        title: "2. Décision optimale",
        paragraphs: [
          "Les options sont comparées: heures sup, intérim, réaffectation, ajustement d'ouverture/service.",
          "Chaque option est lue sous l'angle coût, service et risque.",
        ],
      },
      {
        title: "3. 1re action assistée",
        paragraphs: [
          "Praedixa assiste l'activation d'un premier levier (OT ou intérim). Le manager garde la validation finale.",
        ],
      },
      {
        title: "4. Decision Log & preuve",
        paragraphs: [
          "Chaque mois, un dossier baseline/recommandé/réel avec hypothèses explicites est consolidé pour la revue Ops/Finance.",
        ],
      },
    ],
    links: [
      { label: "Produit & méthode", key: "productMethod" },
      { label: "Protocole pilote", key: "pillarImpact" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Preuve",
    title: "Decision Log & preuve ROI",
    description:
      "Cadre de preuve mensuelle baseline/recommandé/réel pour comités Ops/Finance.",
    lead: "La preuve Praedixa relie chaque arbitrage opérationnel à une lecture mensuelle structurée et audit-ready.",
    sections: [
      {
        title: "Structure du Decision Log",
        paragraphs: [
          "Contexte, options comparées, recommandation, décision manager, résultat observé.",
        ],
      },
      {
        title: "Méthode de comparaison",
        paragraphs: [
          "Baseline: référence stable.",
          "Recommandé: scénario proposé selon règles paramétrées.",
          "Réel: action exécutée et effets observés.",
        ],
      },
      {
        title: "Checklist audit-ready",
        paragraphs: [
          "Hypothèses explicites, sources identifiées, horodatage de la décision, validation et revue mensuelle documentée.",
        ],
      },
    ],
    links: [
      { label: "Comment ça marche", key: "howItWorksPage" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  integrationData: {
    key: "integrationData",
    kicker: "Intégration",
    title: "Intégration & données",
    description:
      "Cadre d'intégration lecture seule, agrégé et compatible avec la stack existante.",
    lead: "Praedixa se branche sur vos exports/API sans imposer de remplacement SI pour démarrer.",
    sections: [
      {
        title: "Périmètre de données",
        paragraphs: [
          "Lecture seule via exports/API, données agrégées au niveau équipe/site, sans prédiction individuelle.",
        ],
      },
      {
        title: "Sécurité opérationnelle",
        paragraphs: [
          "RBAC, chiffrement en transit et au repos, journalisation des actions sensibles.",
        ],
      },
      {
        title: "Compatibilité",
        paragraphs: [
          "Praedixa fonctionne en overlay au-dessus des outils de planning/WFM/ERP déjà en place.",
          "Hébergement en France sur infrastructure Scaleway.",
        ],
      },
    ],
    links: [
      { label: "Sécurité de l'espace Praedixa", key: "security" },
      { label: "Produit & méthode", key: "productMethod" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
  },
  bofuLogistics: {
    key: "bofuLogistics",
    kicker: "Solutions secteur",
    title: "Praedixa pour la logistique",
    description:
      "Anticiper les tensions de couverture et cadrer les arbitrages en environnement logistique multi-sites.",
    lead: "Praedixa aide les équipes logistiques à lire le risque de sous/sur-effectif à J+3/J+7/J+14, comparer les arbitrages et documenter la preuve mensuelle.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Pics inbound/outbound, aléas d'absences, saturation ponctuelle de zones et besoins de réallocation inter-sites.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Les indicateurs sont suivis par équipe et par site, avec une lecture court horizon J+3/J+7/J+14.",
        ],
        bullets: [
          "Risque sous-effectif (heures) par équipe/site",
          "Risque sur-effectif (heures) par équipe/site",
          "Gap charge/capacité (%)",
          "Backlog de préparation à 24h/48h",
          "Expéditions à risque de non-respect cut-off/SLA",
          "Coût estimé des options OT/intérim/réaffectation",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "OT ciblée, intérim court, réaffectation inter-sites, ajustement d'amplitude sur certaines activités non critiques.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports agrégés de charge (lignes, palettes, vagues), capacité planifiée, absences, coûts de renfort et contraintes opérationnelles. Démarrage en lecture seule.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Chaque arbitrage est tracé dans le Decision Log et revu mensuellement en baseline/recommandé/réel avec hypothèses explicites.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment anticiper une rupture de service à J+7 ? La lecture de risque court horizon priorise les sites exposés avant la rupture.",
          "Comment documenter l'impact d'un renfort inter-site ? Chaque arbitrage est tracé dans le Decision Log puis consolidé mensuellement.",
        ],
      },
    ],
    links: [
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
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
        title: "Situations traitées",
        paragraphs: [
          "Variabilité de volume, absences conducteurs, retards de couverture sur certaines tournées, arbitrages urgents de continuité.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Les KPI servent à comparer les options de couverture avant la rupture de service.",
        ],
        bullets: [
          "Tournées sous-couvertes (nombre / heures)",
          "Risque sous/sur-effectif (heures) par dépôt/site",
          "Livraisons à risque de dépassement de fenêtre",
          "Coût estimé OT vs intérim vs réaffectation",
          "Risque résiduel après décision",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "Renfort OT, intérim ponctuel, réaffectation de ressources entre zones, ajustement temporaire de promesse service.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports agrégés de volumes, tournées, capacité, absences et coûts. Aucune prédiction individuelle, démarrage en lecture seule.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Les décisions sont horodatées dans le Decision Log et consolidées mensuellement pour revue Ops/Finance.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment arbitrer quand plusieurs dépôts sont en tension ? Praedixa classe les arbitrages sur une lecture coût/service/risque partagée.",
          "Comment justifier OT vs intérim en comité ? Le comparatif recommandé/réel est consolidé avec hypothèses explicites.",
        ],
      },
    ],
    ctaLabel: "Demander un pilote (boucle fermée)",
  },
  icpAutomotive: {
    key: "icpAutomotive",
    kicker: "Solutions secteur",
    title: "Praedixa pour l'automobile",
    description:
      "Arbitrer la couverture multi-sites en environnement automobile avec une méthode commune Ops/Finance.",
    lead: "Praedixa priorise les risques de couverture à court horizon et compare les options de renfort selon coût, service et risque.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Variabilité de charge entre sites, absences de compétences critiques, tensions de capacité atelier/usine.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Les KPI permettent de prioriser les tensions de capacité avant qu'elles dégradent le service ou la cadence.",
        ],
        bullets: [
          "Risque sous/sur-effectif (heures) par équipe/site",
          "Gap charge/capacité (%)",
          "Couverture compétences critiques (%)",
          "Ordres de travail/production à risque de retard",
          "Coût estimé des options OT/intérim/réaffectation",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "Heures sup, intérim, réaffectation inter-site, ajustement temporaire d'ouverture/service.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports agrégés de charge, capacité, absences, compétences par équipe/site et coûts de renfort. Démarrage en lecture seule.",
        ],
      },
      {
        title: "Exemple concret (illustratif)",
        paragraphs: [
          "Un site passe en risque élevé à J+7. Praedixa compare trois options et recommande un mix réaffectation + renfort ciblé. Le manager valide, puis la revue mensuelle suit baseline/recommandé/réel.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Decision Log mensuel, hypothèses explicites et rituel Ops/Finance pour prioriser les actions du mois suivant.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment prioriser les sites en tension simultanée ? Praedixa applique une lecture commune coût/service/risque pour classer les arbitrages avant validation manager.",
          "Comment intégrer les compétences critiques ? Les règles de décision intègrent les contraintes de compétences au niveau équipe/site dès la comparaison des options.",
        ],
      },
    ],
    links: [
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  icpDealership: {
    key: "icpDealership",
    kicker: "Solutions secteur",
    title: "Praedixa pour les concessions et ateliers auto",
    description:
      "Stabiliser la promesse atelier en arbitrant plus tôt les leviers de couverture.",
    lead: "Praedixa aide les directions après-vente et les managers atelier à comparer des options de renfort défendables côté opérations et finance.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Pics de rendez-vous atelier, tension sur centre d'appels, ordres bloqués par pièces détachées et absences de compétences rares.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Les KPI couvrent simultanément atelier, relation client et disponibilité pièces.",
        ],
        bullets: [
          "Sous/sur-effectif atelier (heures)",
          "Sous/sur-effectif centre d'appels (créneaux)",
          "Taux d'appels décrochés / délai de réponse à risque",
          "OR bloqués faute de pièces (nombre et %)",
          "Délai d'approvisionnement des pièces critiques",
          "Couverture des compétences rares (%)",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "OT atelier, renfort centre d'appels, priorisation des OR selon disponibilité pièces, réaffectation ponctuelle et replanification de créneaux non urgents.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports planning atelier, flux appels, volumes de rendez-vous, statuts de pièces agrégés, matrices de compétences agrégées et coûts de renfort.",
        ],
      },
      {
        title: "Exemple concret (illustratif)",
        paragraphs: [
          "Deux ateliers dépassent le seuil de tension à J+3. Praedixa recommande OT ciblée + décalage de créneaux non urgents. Le manager valide et la preuve mensuelle consolide l'impact.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Chaque arbitrage est tracé dans le Decision Log et revu mensuellement avec baseline/recommandé/réel.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment traiter les pics atelier à court préavis ? Le protocole compare rapidement les options de renfort disponibles à J+3/J+7.",
          "Comment arbitrer OT vs intérim sur compétences rares ? La décision est cadrée sur coût, impact service et contraintes de qualification.",
        ],
      },
    ],
    links: [
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  bofuRetail: {
    key: "bofuRetail",
    kicker: "Solutions secteur",
    title: "Praedixa pour le retail",
    description:
      "Aligner couverture, niveau de service et coût sur des réseaux retail multi-sites.",
    lead: "Praedixa standardise les arbitrages entre sites dans un format lisible par les équipes opérations et finance.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Saisonnalité, pics magasin, absences locales et arbitrages de capacité inter-sites.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Le suivi combine demande, couverture en magasin et signaux stock pour prioriser les décisions.",
        ],
        bullets: [
          "Risque sous/sur-effectif (heures) par magasin/plage",
          "Gap charge/capacité (%)",
          "Attente caisse à risque",
          "Heures de mise en rayon non couvertes",
          "Disponibilité article critique / rupture à risque (signal stock)",
          "Coût estimé OT/intérim/réaffectation",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "Renfort caisse vs rayon, OT, intérim, réaffectation inter-magasins et ajustement d'amplitude service selon une lecture coût/service/risque.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports trafic/charge et staffing par site, absences agrégées, coûts de renfort, règles d'exploitation réseau.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Decision Log standardisé réseau et revue mensuelle Ops/Finance avec baseline/recommandé/réel.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment gérer les pics commerciaux multi-sites ? Les options de couverture sont comparées par site avec une lecture commune réseau.",
          "Comment standardiser les arbitrages entre magasins ? Le même protocole de décision et de preuve est appliqué à chaque point de vente.",
        ],
      },
    ],
    links: [
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
  },
  bofuQsr: {
    key: "bofuQsr",
    kicker: "Solutions secteur",
    title: "Praedixa pour les réseaux multi-franchisés",
    description:
      "Uniformiser les arbitrages de couverture à l'échelle d'un réseau multi-sites et multi-franchisés.",
    lead: "Praedixa conserve la décision locale du manager tout en consolidant une preuve mensuelle exploitable au niveau groupe.",
    sections: [
      {
        title: "Situations traitées",
        paragraphs: [
          "Hétérogénéité des pratiques site à site, pics localisés, arbitrages urgents difficiles à comparer.",
        ],
      },
      {
        title: "KPI opérationnels suivis",
        paragraphs: [
          "Les KPI sont comparables entre sites pour piloter les décisions réseau sans retirer l'autonomie locale.",
        ],
        bullets: [
          "Risque sous/sur-effectif (heures) par service (midi/soir)",
          "Tickets/heure vs capacité équipe",
          "Temps de service à risque",
          "Coût de couverture par option et par site",
          "Écart de performance inter-sites sur règles équivalentes",
        ],
      },
      {
        title: "Décisions couvertes",
        paragraphs: [
          "Renfort de shift, OT, intérim, réaffectation interne et ajustement d'amplitude selon règles réseau et contraintes locales.",
        ],
      },
      {
        title: "Données nécessaires",
        paragraphs: [
          "Exports agrégés par site/équipe, règles communes et locales, coûts de renfort, indicateurs de service consolidables.",
        ],
      },
      {
        title: "Preuve & gouvernance",
        paragraphs: [
          "Decision Log local et consolidation réseau mensuelle baseline/recommandé/réel avec hypothèses explicites.",
        ],
      },
      {
        title: "FAQ spécifique",
        paragraphs: [
          "Comment consolider les décisions locales au niveau groupe ? Les Decision Logs site sont agrégés dans une revue mensuelle réseau.",
          "Comment comparer les résultats site à site ? Le cadre baseline/recommandé/réel est aligné sur des hypothèses partagées.",
        ],
      },
    ],
    links: [
      { label: "Decision Log & preuve ROI", key: "decisionLogProof" },
      { label: "Intégration & données", key: "integrationData" },
    ],
    ctaLabel: "Obtenir l'audit historique (gratuit)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
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
    ctaLabel: "Demander un pilote (boucle fermée)",
  },
};

const enContent: Record<KnowledgePageKey, KnowledgePageContent> = {
  about: {
    key: "about",
    kicker: "Praedixa",
    title: "About",
    description:
      "Mission, positioning, and governance of Praedixa for multi-site coverage steering, with a priority on multi-franchise quick-service restaurant networks.",
    lead: "Praedixa helps operations and finance teams frame multi-site coverage decisions with readable signals, comparable options, and auditable impact evidence, especially for multi-franchise quick-service restaurant networks.",
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
          "Joined the EuraTechnologies incubation program (Lille, France) on March 3, 2026.",
        ],
      },
    ],
    ctaLabel: "Request a pilot (closed loop)",
  },
  security: {
    key: "security",
    kicker: "Security",
    title: "Praedixa workspace security",
    description:
      "Security principles, governance, and IT posture for enterprise usage.",
    lead: "Security is embedded in the Praedixa method: data minimization, controlled access, sensitive action traceability, and transparent documentation.",
    sections: [
      {
        title: "Design principles",
        paragraphs: [
          "Praedixa runs on aggregated, read-only data to reduce exposure and speed up framing.",
          "Security choices prioritize operational clarity and due-diligence verifiability.",
        ],
      },
      {
        title: "Core controls",
        paragraphs: [
          "Encryption in transit and at rest, role-based access control, and sensitive activity logging.",
        ],
        bullets: [
          "No individual predictions",
          "CSV/Excel exports with no mandatory connector",
          "Contractual documentation and primary subprocessors shared on request",
        ],
      },
      {
        title: "Transparency posture",
        paragraphs: [
          "Praedixa documents current practices and clearly states non-certified elements. This reduces ambiguity and improves IT review quality.",
        ],
      },
    ],
    links: [
      { label: "About Praedixa", key: "about" },
      { label: "Operational resources", key: "resources" },
      { label: "Operational impact proof", key: "pillarImpact" },
    ],
    ctaLabel: "Request a pilot (closed loop)",
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
          "ICP pages translate the Praedixa method for automotive, dealerships/workshops, logistics, retail, and multi-franchise networks.",
        ],
      },
    ],
    links: [
      { label: "Capacity and coverage gaps", key: "pillarCapacity" },
      { label: "Logistics capacity planning", key: "pillarLogistics" },
      { label: "Anticipate absenteeism", key: "pillarAbsence" },
      { label: "Logistics penalties", key: "pillarPenalties" },
      { label: "Operational impact proof", key: "pillarImpact" },
      { label: "Praedixa workspace security", key: "security" },
      { label: "Praedixa product and method", key: "productMethod" },
      { label: "How it works", key: "howItWorksPage" },
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
      { label: "Praedixa for automotive", key: "icpAutomotive" },
      {
        label: "Praedixa for auto dealerships and workshops",
        key: "icpDealership",
      },
      { label: "Praedixa for logistics", key: "bofuLogistics" },
      { label: "Praedixa for transport", key: "bofuTransport" },
      { label: "Praedixa for retail", key: "bofuRetail" },
      { label: "Praedixa for multi-franchise networks", key: "bofuQsr" },
    ],
    ctaLabel: "Request a pilot (closed loop)",
  },
  productMethod: {
    key: "productMethod",
    kicker: "Product",
    title: "Praedixa product and method",
    description:
      "Clear overview of the Praedixa decision layer for multi-site coverage steering.",
    lead: "Praedixa runs a closed loop: short-horizon risk forecast, quantified decision, assisted first action, and monthly audit-ready proof.",
    sections: [
      {
        title: "What Praedixa does",
        paragraphs: [
          "Forecast under/over-staffing risk at D+3, D+7, and D+14.",
          "Compare action options through a cost, service, and risk lens.",
          "Assist the first action trigger, then document decisions and outcomes.",
        ],
      },
      {
        title: "What Praedixa does not do",
        paragraphs: [
          "Praedixa is not another WFM or scheduling tool.",
          "Praedixa does not replace execution systems and does not run individual predictions.",
        ],
      },
      {
        title: "Guardrails",
        paragraphs: [
          "Read-only start via exports/APIs, aggregated team/site data, manager final validation, and French hosting (Scaleway).",
        ],
      },
    ],
    links: [
      { label: "How it works", key: "howItWorksPage" },
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  howItWorksPage: {
    key: "howItWorksPage",
    kicker: "Method",
    title: "How it works",
    description:
      "The four-step Praedixa closed loop for short-horizon coverage decisions.",
    lead: "The Praedixa cadence stays consistent site after site: forecast, decide, trigger, prove.",
    sections: [
      {
        title: "1. Risk forecast",
        paragraphs: [
          "Praedixa detects under/over-staffing risk at D+3/D+7/D+14 at team/site level.",
        ],
      },
      {
        title: "2. Quantified decision",
        paragraphs: [
          "Options are compared across overtime, interim staffing, reassignment, and service/opening adjustment.",
          "Each option is read through cost, service, and risk.",
        ],
      },
      {
        title: "3. Assisted first action",
        paragraphs: [
          "Praedixa assists the first lever activation (overtime or interim staffing). The manager keeps final validation.",
        ],
      },
      {
        title: "4. Decision Log and proof",
        paragraphs: [
          "A monthly baseline/recommended/actual pack with explicit assumptions is consolidated for Ops/Finance reviews.",
        ],
      },
    ],
    links: [
      { label: "Praedixa product and method", key: "productMethod" },
      { label: "Pilot protocol", key: "pillarImpact" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  decisionLogProof: {
    key: "decisionLogProof",
    kicker: "Proof",
    title: "Decision Log and ROI proof",
    description:
      "Monthly baseline/recommended/actual evidence framework for Ops/Finance committees.",
    lead: "The Praedixa proof layer links each operational trade-off to a structured, audit-ready monthly review.",
    sections: [
      {
        title: "Decision Log structure",
        paragraphs: [
          "Context, compared options, recommendation, manager decision, and observed outcome.",
        ],
      },
      {
        title: "Comparison method",
        paragraphs: [
          "Baseline: stable reference.",
          "Recommended: proposed scenario under configured rules.",
          "Actual: executed action and observed effects.",
        ],
      },
      {
        title: "Audit-ready checklist",
        paragraphs: [
          "Explicit assumptions, identified sources, timestamped decisions, validation trace, and documented monthly review.",
        ],
      },
    ],
    links: [
      { label: "How it works", key: "howItWorksPage" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  integrationData: {
    key: "integrationData",
    kicker: "Integration",
    title: "Integration and data",
    description:
      "Read-only, aggregated integration model designed to fit existing stacks.",
    lead: "Praedixa connects to your exports/APIs without requiring a planning or WFM replacement to start.",
    sections: [
      {
        title: "Data scope",
        paragraphs: [
          "Read-only ingestion through exports/APIs, aggregated team/site data, and no individual prediction.",
        ],
      },
      {
        title: "Operational security",
        paragraphs: [
          "RBAC, encryption in transit and at rest, and sensitive action logging.",
        ],
      },
      {
        title: "Compatibility",
        paragraphs: [
          "Praedixa works as an overlay above existing planning/WFM/ERP tools.",
          "Hosting is in France on Scaleway infrastructure.",
        ],
      },
    ],
    links: [
      { label: "Praedixa workspace security", key: "security" },
      { label: "Praedixa product and method", key: "productMethod" },
    ],
    ctaLabel: "Get the free historical audit",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
  },
  bofuLogistics: {
    key: "bofuLogistics",
    kicker: "Industry solution",
    title: "Praedixa for logistics",
    description:
      "Anticipate coverage tensions and frame trade-offs in multi-site logistics environments.",
    lead: "Praedixa helps logistics teams read under/over-staffing risk at D+3/D+7/D+14, compare trade-offs, and document monthly proof.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Inbound/outbound peaks, absenteeism shocks, local zone saturation, and cross-site reallocation needs.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "KPIs are tracked by team and site, with short-horizon views at D+3/D+7/D+14.",
        ],
        bullets: [
          "Under-staffing risk (hours) by team/site",
          "Over-staffing risk (hours) by team/site",
          "Workload-to-capacity gap (%)",
          "Preparation backlog at 24h/48h",
          "Shipments at risk of missing cut-off/SLA",
          "Estimated cost of overtime/interim/reassignment options",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Targeted overtime, short-term interim staffing, cross-site reassignment, and temporary scope adjustment on non-critical activities.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Aggregated exports for workload (lines, pallets, waves), planned capacity, absences, staffing costs, and operational constraints. Read-only start.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Each trade-off is logged in the Decision Log and reviewed monthly through baseline/recommended/actual with explicit assumptions.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we anticipate a D+7 service disruption? Short-horizon risk reading prioritizes exposed sites before disruption.",
          "How do we document the impact of cross-site reinforcement? Every trade-off is logged in the Decision Log and consolidated monthly.",
        ],
      },
    ],
    links: [
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
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
        title: "Handled situations",
        paragraphs: [
          "Volume variability, driver absences, delayed coverage on selected routes, and urgent continuity trade-offs.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "KPIs are used to compare coverage options before service disruption.",
        ],
        bullets: [
          "Under-covered routes (count / hours)",
          "Under/over-staffing risk (hours) by depot/site",
          "Deliveries at risk of missing time windows",
          "Estimated cost of overtime vs interim vs reassignment",
          "Residual risk after decision",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Overtime reinforcement, short interim support, cross-zone reassignment, and temporary service-promise adjustment.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Aggregated exports for volumes, routes, capacity, absences, and staffing costs. No individual predictions, read-only start.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Decisions are timestamped in the Decision Log and consolidated monthly for Ops/Finance review.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we arbitrate when multiple depots are under tension? Praedixa ranks trade-offs with a shared cost/service/risk frame.",
          "How do we justify overtime versus interim staffing in committee? Recommended/actual comparisons are consolidated with explicit assumptions.",
        ],
      },
    ],
    ctaLabel: "Request a pilot (closed loop)",
  },
  icpAutomotive: {
    key: "icpAutomotive",
    kicker: "Industry solution",
    title: "Praedixa for automotive",
    description:
      "Arbitrate multi-site coverage in automotive operations with one Ops/Finance method.",
    lead: "Praedixa prioritizes short-horizon coverage risk and compares staffing options through cost, service, and risk.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Workload variability across sites, critical-skill absences, and recurring capacity tensions.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "KPIs are used to prioritize capacity tensions before they degrade service or production cadence.",
        ],
        bullets: [
          "Under/over-staffing risk (hours) by team/site",
          "Workload-to-capacity gap (%)",
          "Critical-skill coverage (%)",
          "Work orders/production loads at risk of delay",
          "Estimated cost of overtime/interim/reassignment options",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Overtime, interim staffing, cross-site reassignment, and temporary opening/service adjustment.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Aggregated exports for workload, capacity, absences, team/site skills, and staffing costs. Read-only start.",
        ],
      },
      {
        title: "Concrete example (illustrative)",
        paragraphs: [
          "One site turns high-risk at D+7. Praedixa compares three options and recommends a reassignment plus targeted reinforcement. Manager validates, then monthly proof tracks baseline/recommended/actual.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Monthly Decision Log, explicit assumptions, and Ops/Finance cadence to prioritize the next decisions.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we prioritize multiple sites under tension? Praedixa applies a shared cost/service/risk frame before manager validation.",
          "How are critical skills reflected in recommendations? Decision rules include team/site skill constraints during option comparison.",
        ],
      },
    ],
    links: [
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  icpDealership: {
    key: "icpDealership",
    kicker: "Industry solution",
    title: "Praedixa for auto dealerships and workshops",
    description:
      "Protect workshop service commitments with earlier, defensible coverage decisions.",
    lead: "Praedixa helps aftersales leaders and workshop managers compare staffing options that are defensible for both operations and finance.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Workshop booking peaks, call-center pressure, work orders blocked by parts, and rare-skill absences.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "KPIs cover workshop execution, customer contact performance, and parts availability together.",
        ],
        bullets: [
          "Workshop under/over-staffing (hours)",
          "Call-center under/over-staffing (slots)",
          "Answer rate / response-delay risk",
          "Work orders blocked by parts (count and %)",
          "Critical-part lead time",
          "Rare-skill coverage (%)",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Workshop overtime, call-center reinforcement, work-order prioritization based on parts availability, punctual reassignment, and non-urgent slot reshaping.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Workshop planning exports, call-flow aggregates, appointment volumes, aggregated parts status, aggregated skill matrices, and reinforcement cost references.",
        ],
      },
      {
        title: "Concrete example (illustrative)",
        paragraphs: [
          "Two workshops exceed their D+3 risk threshold. Praedixa recommends targeted overtime plus non-urgent slot reshaping. Manager validates and monthly proof consolidates impact.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Each trade-off is logged in the Decision Log and reviewed monthly through baseline/recommended/actual.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we handle workshop peaks on short notice? The protocol compares available reinforcement options at D+3/D+7.",
          "How do we arbitrate overtime versus interim staffing for rare skills? Decisions are framed by cost, service impact, and qualification constraints.",
        ],
      },
    ],
    links: [
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  bofuRetail: {
    key: "bofuRetail",
    kicker: "Industry solution",
    title: "Praedixa for retail",
    description:
      "Align coverage, service continuity, and cost across multi-site retail networks.",
    lead: "Praedixa standardizes trade-offs between sites in a format that is clear for operations and finance teams.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Seasonality, in-store peaks, local absences, and cross-site capacity trade-offs.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "Tracking combines demand, in-store staffing coverage, and stock signals to prioritize decisions.",
        ],
        bullets: [
          "Under/over-staffing risk (hours) by store/time slot",
          "Workload-to-capacity gap (%)",
          "Checkout waiting-time risk",
          "Shelf-replenishment hours left uncovered",
          "Critical item availability / stockout risk (stock signal)",
          "Estimated cost of overtime/interim/reassignment options",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Checkout versus floor reinforcement, overtime, interim staffing, cross-store reassignment, and temporary service-window adjustment under a cost/service/risk frame.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Site-level traffic/workload and staffing exports, aggregated absences, staffing costs, and network operating rules.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Network-standard Decision Log and monthly Ops/Finance reviews using baseline/recommended/actual.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we handle multi-site commercial peaks? Coverage options are compared site by site with a shared network framework.",
          "How do we standardize trade-offs between stores? The same decision and proof protocol is applied across each location.",
        ],
      },
    ],
    links: [
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
  },
  bofuQsr: {
    key: "bofuQsr",
    kicker: "Industry solution",
    title: "Praedixa for multi-franchise networks",
    description:
      "Standardize coverage trade-offs at network scale across multi-site, multi-franchise operations.",
    lead: "Praedixa preserves local manager decision authority while consolidating monthly evidence at group level.",
    sections: [
      {
        title: "Handled situations",
        paragraphs: [
          "Heterogeneous site practices, localized peaks, and urgent trade-offs that remain hard to compare.",
        ],
      },
      {
        title: "Operational KPIs tracked",
        paragraphs: [
          "KPIs stay comparable across sites to steer network decisions while preserving local manager authority.",
        ],
        bullets: [
          "Under/over-staffing risk (hours) by service window (lunch/dinner)",
          "Tickets per hour versus team capacity",
          "Service-time risk",
          "Coverage cost per option and per site",
          "Cross-site performance variance under equivalent rules",
        ],
      },
      {
        title: "Decisions covered",
        paragraphs: [
          "Shift reinforcement, overtime, interim staffing, internal reassignment, and temporary service-window adjustment under network and local constraints.",
        ],
      },
      {
        title: "Required data",
        paragraphs: [
          "Aggregated site/team exports, shared and local rules, staffing costs, and consolidable service indicators.",
        ],
      },
      {
        title: "Proof and governance",
        paragraphs: [
          "Local Decision Logs and monthly network consolidation through baseline/recommended/actual with explicit assumptions.",
        ],
      },
      {
        title: "Sector FAQ",
        paragraphs: [
          "How do we consolidate local decisions at group level? Site-level Decision Logs are rolled into a monthly network review.",
          "How do we compare outcomes across sites? Baseline/recommended/actual comparisons use shared assumptions across the network.",
        ],
      },
    ],
    links: [
      { label: "Decision Log and ROI proof", key: "decisionLogProof" },
      { label: "Integration and data", key: "integrationData" },
    ],
    ctaLabel: "Get the free historical audit",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
    ctaLabel: "Request a pilot (closed loop)",
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
