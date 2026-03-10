import type { Dictionary } from "../types";

export const frCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "Comment ça marche",
    heading:
      "Federer les signaux, gouverner les arbitrages, agir la ou ca rapporte.",
    subheading:
      "Quatre etapes simples pour transformer des donnees dispersees en decisions gouvernees, executables et relisibles.",
    steps: [
      {
        number: "01",
        title: "Connexion aux systemes utiles",
        subtitle: "RH · Finance · Ops",
        description:
          "Praedixa reprend vos exports et vos outils existants pour construire une federation gouvernee sur l'existant, sans projet lourd.",
      },
      {
        number: "02",
        title: "Lecture d'arbitrage commune",
        subtitle: "Une meme grammaire de decision",
        description:
          "Les donnees sont remises dans un langage simple: ou l'argent se perd, quels sites derapent, quelles options comparer et quels garde-fous respecter.",
      },
      {
        number: "03",
        title: "Premiere action priorisee",
        subtitle: "La ou agir d'abord",
        description:
          "Vous voyez les actions a plus fort impact, site par site, avec un gain attendu compréhensible par les equipes et la direction.",
      },
      {
        number: "04",
        title: "Preuve du ROI",
        subtitle: "Ce qui rapporte vraiment",
        description:
          "Vous mesurez ce qui a ete lance, ce que cela a rapporte et ce qu'il faut corriger ensuite.",
      },
    ],
  },

  useCases: {
    kicker: "Ce que vous gagnez",
    heading: "Les décisions business qui deviennent enfin plus simples.",
    subheading:
      "Praedixa aligne les équipes autour des sujets qui font perdre ou gagner de l'argent, site par site.",
    labels: {
      context: "Ce qui bloque",
      action: "Ce que Praedixa met en lumière",
      impact: "Ce que vous gagnez",
    },
    cases: [
      {
        id: "volatilite",
        title: "Variations de charge et de staffing",
        context:
          "Des écarts terrain répétés entre besoins réels, présence, coûts et niveau de service.",
        action:
          "Praedixa relie données RH, finance et opérations pour montrer où l'organisation perd de l'argent et quelles actions prioriser.",
        result:
          "Moins d'urgence, plus de visibilité et des décisions plus rentables.",
      },
      {
        id: "absenteisme",
        title: "Absences, remplacements et tension équipes",
        context:
          "Des trous de couverture qui dégradent la qualité de service et renchérissent le coût opérationnel.",
        action:
          "Praedixa identifie les sites ou équipes les plus exposés et chiffre l'impact business des options possibles.",
        result: "Des arbitrages plus rapides, plus clairs et mieux défendus.",
        callout:
          "Aucune usine a gaz: vous gardez une lecture simple et exploitable.",
      },
      {
        id: "intersite",
        title: "Écarts de performance entre sites",
        context:
          "Certains sites tiennent la marge, d'autres la dégradent sans explication partagée.",
        action:
          "Praedixa met les sites sur une même base de lecture pour comparer, prioriser et standardiser les actions.",
        result:
          "Une gouvernance réseau plus simple et des décisions comparables.",
        callout: "Le manager garde toujours la décision finale.",
      },
      {
        id: "roi",
        title: "Revue business direction",
        context:
          "Les comités ont beaucoup de chiffres mais peu de lecture commune entre RH, finance et opérations.",
        action:
          "Praedixa rassemble les faits, les priorités et le suivi d'impact dans un dossier ROI facile a relire.",
        result:
          "Des arbitrages mieux alignés et des budgets plus faciles a défendre.",
      },
    ],
  },

  deliverables: {
    kicker: "Dossier ROI",
    heading:
      "Un dossier simple pour voir où vous perdez, où vous gagnez et quoi faire ensuite.",
    subheading:
      "Même lecture pour RH, finance et opérations. Des chiffres utiles, pas du jargon.",
    roiFrames: [
      {
        label: "Aujourd'hui",
        value: "Ce que vous subissez",
        note: "Coûts, frottements et sites qui dégradent la performance.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Priorité",
        value: "Ce qu'il faut lancer",
        note: "Les actions à plus fort impact business, classées simplement.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
      {
        label: "Résultat",
        value: "Ce que vous avez gagné",
        note: "Le gain observé, ce qui reste à corriger et la suite à donner.",
        sourceLabel: "Source: Protocole pilote Praedixa",
        sourceUrl: "/fr/pilot-protocol",
      },
    ],
    checklist: [
      "Lecture commune RH / Finance / Operations",
      "Priorites business classees par impact",
      "Gain attendu puis gain observe",
      "Sites comparables dans le temps",
      "Dossier simple pour comite de direction",
    ],
  },

  security: {
    kicker: "Overlay & données",
    heading: "Vos données sont déjà là. Praedixa les réunit sans projet lourd.",
    subheading:
      "CSV, Excel, API, ERP, outils RH ou finance: Praedixa part de l'existant, en lecture seule, pour produire une lecture business commune.",
    tiles: [
      {
        title: "Connexion légère",
        description:
          "Praedixa démarre sur vos exports et API existants. Pas besoin de remplacer vos outils.",
      },
      {
        title: "Lecture commune",
        description:
          "Les données RH, finance et opérations sont regroupées dans un même cadre.",
      },
      {
        title: "Données utiles",
        description:
          "On travaille au niveau site, équipe, activité ou réseau pour garder une lecture claire.",
      },
      {
        title: "Priorités partagées",
        description:
          "Chaque équipe retrouve les mêmes chiffres, le même langage et les mêmes priorités.",
      },
      {
        title: "Sécurité",
        description:
          "Chiffrement, contrôle d'accès et journalisation des actions pour garder un cadre propre.",
      },
      {
        title: "Comparaison multi-sites",
        description:
          "Vous voyez rapidement où ça marche, où ça fuit et où agir en premier.",
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
        "Praedixa complete l'existant et relie les systemes critiques dans une seule lecture business.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Le vrai sujet n'est pas d'avoir plus de donnees. C'est de transformer les arbitrages critiques en decisions calculees, executees et auditables.",
  },

  pilot: {
    kicker: "Pilote ROI",
    heading: "Un pilote court pour mettre DecisionOps en production.",
    subheading:
      "En quelques semaines, Praedixa relie vos systemes critiques, sort les priorites et met le ROI au centre des decisions.",
    statusLabels: ["Cadrage", "Premiers gains", "Preuve consolidée"],
    included: {
      title: "Ce que vous obtenez",
      items: [
        "Diagnostic ROI offert sur vos données existantes",
        "Une lecture commune RH, finance et opérations",
        "Les sites, équipes ou sujets à plus fort potentiel de gain",
        "Un plan d'action priorisé avec impact attendu",
        "Un suivi du ROI simple a relire en comite",
        "Un rythme commun Ops + Finance pour décider plus vite",
      ],
    },
    excluded: {
      title: "Ce qu'il n'inclut pas",
      items: [
        "Refonte de votre stack existante",
        "Projet IT long avant les premiers résultats",
        "Black box incompréhensible pour les équipes",
        "Promesse irréaliste sans cadre ni méthode",
        "Usine a gaz impossible a relire en comité",
      ],
    },
    kpis: {
      title: "Ce que nous suivons",
      items: [
        "L'argent perdu aujourd'hui",
        "Le potentiel de gain par site, équipe ou sujet",
        "Les actions lancées et leur impact réel",
        "L'alignement RH / Finance / Operations",
        "La vitesse de décision et la clarté des priorités",
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
        "Organisation multi-sites avec donnees dispersees entre equipes",
        "Sponsor operations et sponsor finance disponibles",
        "Exports ou outils exploitables cote RH, finance et operations",
      ],
    },
    upcoming: {
      title: "Après le pilote",
      description:
        "Vous élargissez progressivement Praedixa aux sites et sujets qui créent le plus de valeur.",
    },
    urgency:
      "Candidatures examinées sous 48h ouvrées. Objectif du pilote: une preuve simple, lisible et orientée ROI x3.",
    ctaPrimary: "Demander un pilote ROI",
    ctaMeta: "Diagnostic offert · lecture seule · objectif ROI x3",
  },
};
