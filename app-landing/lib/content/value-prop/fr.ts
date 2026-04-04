import type { ValuePropContent } from "./shared";
import { valuePropFrSections } from "./fr-sections";

export const coreValuePropFr: ValuePropContent = {
  icp: "Franchisés, directeurs réseau et responsables opérations de restauration rapide multi-sites",
  promise:
    "Praedixa aide les réseaux de restauration rapide à prévoir la demande, les tensions stock et les besoins d\u2019effectifs avant les rushs, sans remplacer POS, planning ni BI.",
  mechanism:
    "Praedixa croise ventes, planning, livraison, promotions, météo, historique terrain et signaux stock pour anticiper la demande, projeter les besoins d\u2019effectifs, repérer les tensions d\u2019approvisionnement et signaler les restaurants à risque.",
  reassurance: [
    "Lecture seule",
    "POS + planning + stock + delivery",
    "Hébergement France",
    "NDA sur demande",
  ],
  ctaPrimary: "Voir la preuve de ROI",
  ctaSecondary: "Cadrer mon réseau",
  ctaCalendlyExpert: "Parler avec le CEO — produit & data",
  heroKicker: "Pour les franchisés de restauration rapide multi-sites",
  heroHeading: "Prévoyez la demande,",
  heroHeadingHighlight: "anticipez stock et effectifs.",
  heroSubheading:
    "Praedixa relie vos caisses, plannings, apps de livraison, promotions, signaux stock et terrain pour anticiper les volumes à venir, projeter les besoins d\u2019effectifs, repérer les tensions stock et voir quels restaurants vont passer sous tension, restaurant par restaurant.",
  heroBadgeText: "QSR OPS",
  heroProofBlockText:
    "Pour franchisés multi-sites, directions réseau et équipes opérations qui veulent prévoir la demande et la couverture.",
  heroProofRoles: ["FRANCHISÉ", "DIR. RÉSEAU", "OPS", "FINANCE"],
  heroProofMicropill: "Demande\u00a0|\u00a0effectifs\u00a0|\u00a0couverture",
  heroLogoCaption: "Ils nous font confiance",
  heroOffer: {
    badge: "Notre promesse",
    title: "Une première lecture demande, stock, effectifs en 30\u00a0jours",
    body: "Un cadrage rapide sur POS, planning, stock et delivery pour agir avant le prochain temps fort.",
    note: "Lecture seule au démarrage. NDA possible dès le premier échange.",
  },
  socialProof: {
    eyebrow: "Pilotage réseau",
    statValue: "30j",
    statLabel:
      "Pour objectiver un premier cas de prévision demande + stock + effectifs sur vos données existantes",
    logosAlt: "Entreprises qui nous font confiance",
    marqueeLabel:
      "Cadrer un premier cas d\u2019usage QSR sans projet IT lourd",
  },
  product: {
    kicker: "Pilotage réseau",
    heading: "La prévision demande + stock + effectifs pensée pour le rush.",
    subheading:
      "Praedixa aide le siège et le terrain à anticiper la demande, préparer le stock utile et calibrer la couverture des services les plus sensibles.",
  },
  footerTagline:
    "Praedixa aide les réseaux de restauration rapide à anticiper la demande, les tensions stock et les besoins d\u2019effectifs avant les rushs, sans remplacer leurs outils.",
  qualificationTitle: "Est-ce que Praedixa est fait pour vous\u00a0?",
  qualificationBody:
    "Praedixa s\u2019adresse aux franchisés et réseaux de restauration rapide qui veulent objectiver leurs arbitrages de demande, de stock et d\u2019effectifs sur plusieurs restaurants.",
  fitTitle: "Un bon point de départ si\u2026",
  fitItems: [
    "vous gérez plusieurs restaurants avec des rushs récurrents à arbitrer",
    "un responsable réseau ou opérations veut mieux prévoir la demande, le stock ou les besoins d\u2019effectifs",
    "vos POS, plannings ou canaux delivery exposent déjà des données utiles au démarrage",
  ],
  notFitTitle: "Pas pour vous si\u2026",
  notFitItems: [
    "vous exploitez un seul site sans enjeu réseau",
    "aucun décideur opérationnel ne peut porter le sujet côté terrain ou siège",
    "ni POS, ni planning, ni données d\u2019activité ou de stock ne sont accessibles au démarrage",
  ],
  stackComparison: {
    kicker: "Compatibilité",
    heading:
      "Praedixa s\u2019ajoute à vos outils réseau. Il projette là où ils s\u2019arrêtent.",
    subheading:
      "POS, planning, stock, delivery, BI, Excel\u00a0: tout reste en place. Praedixa relie les signaux utiles pour prévoir plus tôt la demande, les tensions stock et les besoins d\u2019effectifs avant que service et marge ne dérapent.",
    columnLabels: {
      category: "Outil",
      currentCoverage: "Ce qu\u2019il fait",
      stopsAt: "Ce qui manque",
      praedixaAdd: "Ce que Praedixa ajoute",
    },
    rows: [
      {
        category: "POS / ERP",
        currentCoverage:
          "Consolide les ventes, les encaissements, les stocks et les coûts.",
        stopsAt:
          "Montre le passé mais ne dit pas où la demande, le stock ou les effectifs vont se tendre avant le prochain rush.",
        praedixaAdd:
          "Projette la demande, les tensions stock et les besoins d\u2019effectifs, puis compare les arbitrages avant que la marge ne glisse.",
      },
      {
        category: "BI / reporting",
        currentCoverage: "Montre les KPIs, écarts et tendances par restaurant.",
        stopsAt:
          "Explique ce qui s\u2019est passé, mais pas quoi faire sur le prochain midi ou soir critique.",
        praedixaAdd:
          "Propose des arbitrages concrets et relit leur impact réel sur stock, service et marge.",
      },
      {
        category: "Planning / WFM",
        currentCoverage:
          "Planifie les shifts, les rôles et la couverture par restaurant.",
        stopsAt:
          "Construit un planning, mais ne compare pas les scénarios réseau avant exécution.",
        praedixaAdd:
          "Projette les besoins d\u2019effectifs à partir de la demande et des tensions stock, puis compare renfort, réaffectation ou simplification d\u2019offre.",
      },
      {
        category: "Excel / comités",
        currentCoverage:
          "Permet de recouper vite un sujet prioritaire entre siège et terrain.",
        stopsAt:
          "Reste manuel, difficile à rejouer et sans preuve claire sur demande, stock, effectifs et marge.",
        praedixaAdd:
          "Garde un journal relisible des décisions réseau et de leur effet réel.",
      },
      {
        category: "Praedixa",
        currentCoverage:
          "Ajoute une couche de prévision et de décision à vos outils existants pour anticiper les rushs et arbitrer réseau par réseau.",
        stopsAt:
          "Ne remplace ni POS, ni BI, ni planning. S\u2019appuie sur eux.",
        praedixaAdd:
          "Anticiper la demande, le stock et les effectifs, comparer les arbitrages, puis prouver le ROI restaurant par restaurant.",
      },
    ],
    bottomNote:
      "Compatible avec POS, planning, stock, delivery, BI et exports existants.",
  },
  servicesMeta: {
    title:
      "Praedixa | Restauration rapide\u00a0: un premier arbitrage réseau en 30\u00a0jours",
    description:
      "Le déploiement Praedixa cadre un premier arbitrage réseau sur vos rushs, vos restaurants et vos données existantes en 30\u00a0jours.",
    ogTitle:
      "Praedixa | Restauration rapide\u00a0: un premier arbitrage réseau en 30\u00a0jours",
    ogDescription:
      "Déploiement Praedixa pour réseaux QSR\u00a0: un premier arbitrage réseau en 30\u00a0jours, sans chantier IT lourd.",
  },
  services: {
    kicker: "Offre",
    heading:
      "Ce que vous achetez\u00a0: une première lecture demande, stock, effectifs objectivée en 30\u00a0jours.",
    subheading:
      "Praedixa démarre sur POS, planning, delivery, signaux stock et coûts déjà disponibles. Si besoin, une preuve de ROI sur historique démontre le sujet avant extension réseau.",
    timelineTitle: "En 30\u00a0jours",
    timeline: [
      {
        title: "Semaine 1",
        body: "Cadrage du réseau, des restaurants prioritaires, des créneaux critiques et du sponsor opérations.",
      },
      {
        title: "Semaine 2",
        body: "Première carte de risque demande / stock / effectifs avec options comparées à partir des données POS, planning, stock et delivery.",
      },
      {
        title: "Semaine 3",
        body: "Décision recommandée par restaurant ou groupe de restaurants, validée avec opérations et finance.",
      },
      {
        title: "Semaine 4",
        body: "Lecture de l\u2019impact réel sur stock, effectifs, service et marge, puis plan d\u2019extension.",
      },
    ],
    deliveredTitle: "Ce qui est livré",
    delivered: [
      "Une première lecture restaurant par restaurant sur demande, stock, effectifs et services sous tension",
      "Des options comparées avec hypothèses explicites sur coût, couverture stock, service et marge",
      "Une recommandation claire pour opérations, réseau et finance",
      "Une mesure de l\u2019impact réel sur un premier arbitrage réseau",
    ],
    notDeliveredTitle: "Ce qui n\u2019est pas livré",
    notDelivered: [
      "Une refonte de votre POS, de votre planning ou de votre BI",
      "Un chantier data lourd avant d\u2019agir",
      "Un POC flou sans décision terrain réelle",
      "Du reporting supplémentaire sans arbitrage concret",
    ],
    clientNeedsTitle: "Ce qu\u2019il faut côté client",
    clientNeeds: [
      "Un sponsor réseau ou opérations disponible",
      "Des accès POS, planning, stock, delivery ou coûts exploitables dès le départ",
      "Un temps fort à venir ou un arbitrage déjà visible sur le terrain",
    ],
    participantsTitle: "Qui participe",
    participants: [
      "Franchisé, directeur réseau ou responsable opérations",
      "Référent data / BI / planning pour les accès",
      "Finance ou RH pour relire l\u2019impact économique et humain",
    ],
    reviewTitle: "Quel comité de revue",
    reviewItems: [
      "Point court hebdomadaire siège + terrain",
      "Revue de la recommandation avec opérations et finance",
      "Synthèse finale sur demande, stock, effectifs et marge protégée",
    ],
    primaryCtaLabel: "Cadrer mon réseau",
    secondaryCtaLabel: "Voir la preuve sur historique",
    bottomNote:
      "La preuve de ROI permet de relire un temps fort passé avant de généraliser le déploiement réseau.",
  },
  ...valuePropFrSections,
};
