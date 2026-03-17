import type { ValuePropContent } from "./shared";

type ValuePropFrSections = Pick<
  ValuePropContent,
  | "contact"
  | "proofMeta"
  | "proof"
  | "credibilityRibbon"
  | "problemCards"
  | "method"
  | "proofPreview"
  | "deployment"
  | "integrationSecurity"
  | "faqV2"
  | "finalCta"
>;

export const valuePropFrSections: ValuePropFrSections = {
  contact: {
    heading: "Cadrons le premier arbitrage à objectiver.",
    intro:
      "Décrivez le premier arbitrage à traiter, le réseau concerné et l’horizon projet. Nous revenons avec un prochain pas clair sous 48h ouvrées.",
    promiseTitle: "Ce que vous recevez",
    promiseItems: [
      "Un retour qualifié sous 48h ouvrées",
      "Une orientation claire entre preuve sur historique et cadrage du déploiement",
      "Un prochain pas concret, adapté à votre périmètre",
    ],
    proofIntentKicker: "Preuve sur historique",
    proofIntentHeading: "Demander la preuve sur historique.",
    proofIntentIntro:
      "Décrivez l’arbitrage à objectiver. Nous revenons avec une première lecture utile et la meilleure façon de cadrer la suite.",
    proofIntentPromiseItems: [
      "Lecture en lecture seule sur vos données existantes",
      "Options comparées sur base coût / service / risque",
      "Prochain pas recommandé si le sujet mérite un déploiement",
    ],
    scopingIntentKicker: "Premier périmètre",
    scopingIntentHeading: "Cadrer un premier périmètre de décision.",
    scopingIntentIntro:
      "Décrivez le réseau, l’arbitrage prioritaire et l’horizon projet. Nous revenons avec un cadrage simple du premier périmètre.",
    scopingIntentPromiseItems: [
      "Qualification du périmètre prioritaire",
      "Lecture des prérequis data et sponsor",
      "Proposition de cadrage du premier comité de revue",
    ],
    reassuranceTitle: "Réassurance",
    reassuranceItems: [
      "Lecture seule au départ",
      "NDA possible",
      "Réponse sous 48h ouvrées",
    ],
    secondaryPanelTitle: "Besoin d’aligner l’offre avant l’échange ?",
    secondaryPanelBody:
      "La page offre détaille ce qui est livré, ce qui ne l’est pas et le rythme des 30 premiers jours.",
    secondaryPanelCta: "Voir l’offre publique",
    formTitle: "Décrire votre contexte",
    formSubtitle:
      "Les champs utiles pour qualifier le sujet sont requis. Le message libre reste optionnel.",
    company: "Entreprise",
    role: "Fonction",
    email: "Email professionnel",
    siteCount: "Nombre de sites",
    sector: "Secteur",
    mainTradeOff: "Arbitrage principal à objectiver",
    timeline: "Horizon projet",
    currentStack: "Stack actuelle",
    message: "Message libre",
    mainTradeOffPlaceholder:
      "Ex : renfort vs réallocation sur 12 sites logistiques avant pic de charge.",
    currentStackPlaceholder: "Ex : ERP + WFM + BI + exports Excel",
    messagePlaceholder:
      "Contexte additionnel, comité à convaincre, contraintes IT ou gouvernance déjà connues.",
    send: "Envoyer la demande",
    sending: "Envoi en cours…",
    successTitle: "Demande envoyée",
    successBody:
      "Nous revenons vers vous sous 48h ouvrées avec un prochain pas concret.",
    successCta: "Retour au site",
    fixErrors: "Complétez les champs requis avant d’envoyer.",
    unknownError: "Erreur inconnue.",
    networkError: "Erreur réseau. Veuillez réessayer.",
    requiredCompany: "Entreprise requise.",
    requiredRole: "Fonction requise.",
    requiredEmail: "Email professionnel requis.",
    invalidEmail: "Adresse email invalide.",
    requiredSiteCount: "Nombre de sites requis.",
    requiredSector: "Secteur requis.",
    requiredMainTradeOff: "Arbitrage principal requis.",
    requiredTimeline: "Horizon projet requis.",
    antiSpam: "Vérification",
    challengeLoading: "Chargement de la vérification anti-spam…",
    challengeUnavailable:
      "Vérification anti-spam indisponible. Rechargez le challenge.",
    challengeRetry: "Recharger la vérification",
    requiredConsent: "Vous devez accepter les conditions.",
    requiredCaptcha: "Veuillez répondre à la vérification.",
    consentPrefix: "J’accepte les ",
    termsLabel: "CGU",
    consentJoin: " et la ",
    privacyLabel: "politique de confidentialité",
  },
  proofMeta: {
    title: "Praedixa | Preuve sur historique",
    description:
      "Une preuve sur historique structurée comme un support de revue: situation initiale, options comparées, décision retenue, impact observé et limites de lecture.",
    ogTitle: "Praedixa | Preuve sur historique",
    ogDescription:
      "Un exemple public de preuve sur historique avec options comparées, décision retenue et impact relu.",
  },
  proof: {
    kicker: "Preuve sur historique",
    title:
      "Une preuve exploitable en comité, pas un commentaire sur la preuve.",
    lead: "Exemple public inspiré d’un cas logistique multi-sites: un pic de charge met sous tension trois sites et force un arbitrage entre renfort local, réallocation inter-sites et ajustement temporaire de service.",
    situationTitle: "Situation initiale",
    situationBody: [
      "Trois sites logistiques absorbent un pic de charge sur cinq jours. Le backlog augmente, les heures supplémentaires sont déjà entamées et le recours à l’intérim risque d’arriver trop tard.",
      "Le sujet n’est pas seulement de prédire un pic. Il faut décider où renforcer, où réallouer et où accepter un report sans déplacer le coût vers la semaine suivante.",
    ],
    optionsTitle: "Options comparées",
    optionsBody: [
      "La preuve compare trois options lisibles en comité: heures supplémentaires locales, intérim ciblé et réallocation inter-sites.",
      "Chaque option est relue avec la même base: coût d’action, coût de non-action, risque de service, capacité disponible et limites d’interprétation.",
    ],
    decisionTitle: "Décision retenue",
    decisionBody: [
      "La décision retenue combine réallocation inter-sites et renfort ciblé plutôt qu’un recours uniforme aux heures supplémentaires.",
      "Le choix est justifié par une meilleure protection du service à coût total plus défendable, malgré un effort de coordination inter-sites plus élevé.",
    ],
    impactTitle: "Impact observé",
    impactBody: [
      "La revue avant / recommandé / réel montre une meilleure protection du backlog critique et une réduction du coût d’urgence par rapport au scénario local-only.",
      "La relecture sert surtout à préparer le prochain arbitrage avec des hypothèses plus propres, pas à fabriquer une certitude artificielle.",
    ],
    limitsTitle: "Limites de la preuve",
    limitsBody: [
      "Il s’agit d’un exemple public en base 100, pas d’un engagement chiffré universel.",
      "La preuve ne remplace ni le cadrage métier ni la revue des données nécessaires avant déploiement.",
    ],
    dataTitle: "Données mobilisées",
    dataBody: [
      "Charge prévisionnelle à court horizon, capacité disponible, backlog, heures supplémentaires, recours intérim et contraintes de service par site.",
      "Le démarrage peut rester en lecture seule sur exports ou API existants.",
    ],
    nextTitle: "Prochain arbitrage rendu possible",
    nextBody: [
      "Une fois cette preuve structurée, le réseau peut réutiliser le même cadre pour les prochains arbitrages de couverture, de réallocation ou d’ajustement de service.",
      "C’est ce passage de l’exemple à la cadence de décision qui justifie le déploiement Praedixa.",
    ],
    tableTitle: "Synthèse comparée",
    tableColumns: {
      option: "Option",
      actionCost: "Coût d’action",
      inactionCost: "Coût de non-action",
      serviceRisk: "Risque service",
      decision: "Décision retenue",
      observedEffect: "Effet observé",
      limitation: "Ce qu’on ne peut pas conclure",
    },
    rows: [
      {
        option: "Heures supplémentaires locales",
        actionCost: "Base 100",
        inactionCost: "Base 155",
        serviceRisk: "Moyen à élevé",
        decision: "Non retenue seule",
        observedEffect: "Soulage un site mais propage le backlog",
        limitation: "N’isole pas l’effet du manque de capacité inter-sites",
      },
      {
        option: "Intérim ciblé",
        actionCost: "Base 118",
        inactionCost: "Base 142",
        serviceRisk: "Moyen",
        decision: "Retenue partiellement",
        observedEffect: "Protège le site le plus contraint",
        limitation: "Dépend du délai réel de mise à disposition",
      },
      {
        option: "Réallocation inter-sites",
        actionCost: "Base 92",
        inactionCost: "Base 147",
        serviceRisk: "Faible à moyen",
        decision: "Retenue",
        observedEffect:
          "Réduit le coût d’urgence et stabilise le backlog critique",
        limitation: "Suppose une coordination réseau effective",
      },
    ],
    primaryCtaLabel: "Cadrer un premier périmètre",
    secondaryCtaLabel: "Voir l’offre publique",
  },
  credibilityRibbon: {
    stackLabel: "Stack couverte",
    stackChips: ["ERP", "WFM", "BI", "Planning", "Excel", "API / CSV"],
    rolesLabel: "Décideurs concernés",
    roleChips: ["COO", "Dir. Ops", "Dir. Réseau", "Finance", "DSI"],
    rolesMicrocopy:
      "L’arbitrage coût / service / risque passe par ces fonctions.",
    trustLabel: "Engagements",
    trustMarkers: [
      "Lecture seule au départ",
      "Hébergement France",
      "NDA dès le premier échange",
      "Données agrégées",
    ],
  },
  problemCards: [
    {
      number: "01",
      title: "L’arbitrage reste dispersé",
      consequence:
        "Le choix entre renfort, réallocation et ajustement de service se disperse entre Excel, BI et réunions. Personne ne voit l’arbitrage complet.",
    },
    {
      number: "02",
      title: "La décision arrive trop tard",
      consequence:
        "Sans lecture anticipée, l’urgence décide à la place du réseau. Le coût de l’inaction dépasse celui de l’action, sans que personne ne le mesure.",
    },
    {
      number: "03",
      title: "L’impact n’est jamais relu",
      consequence:
        "Après la décision, personne ne compare ce qui était recommandé à ce qui s’est passé. Le prochain arbitrage repart sans preuve.",
    },
  ],
  method: {
    kicker: "Comment ça marche",
    heading: "Voir, comparer, décider, prouver.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Fédérer & voir",
        title:
          "Détectez les tensions avant qu’elles ne deviennent des urgences",
        body: "Praedixa fédère les signaux existants (ERP, WFM, BI, exports) et prédit les tensions multi-sites à court horizon pour déclencher un arbitrage avant l’urgence.",
        bullets: [
          "Connecteurs lecture seule sur vos sources existantes",
          "Prédiction de charge et détection de tension à J+3 / J+7 / J+14",
          "Alerte proactive quand un arbitrage s’impose",
        ],
        microproof: "Tension détectée 8 jours avant le pic sur 3 sites",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Calculer & comparer",
        title: "Comparez les options sur une base coût / service / risque",
        body: "Le moteur calcule le coût d’action, le coût de non-action et le risque de service pour chaque option. Le résultat est un tableau décisionnel lisible en comité.",
        bullets: [
          "Renfort local, réallocation inter-sites, report, ajustement de service",
          "Chiffrage comparable sur une base commune",
          "Hypothèses explicites, pas de boîte noire",
        ],
        microproof:
          "4 options comparées en 12 secondes, prêtes pour le comité Ops / Finance",
      },
      {
        id: "decider",
        number: "03",
        verb: "Déclencher & décider",
        title: "Déclenchez l’action retenue avec un workflow auditable",
        body: "La décision retenue est documentée avec ses hypothèses, validée par le bon rôle et déclenchée dans un workflow traçable.",
        bullets: [
          "Validation par rôle (Ops, Finance, Réseau)",
          "Trace complète : qui a décidé, quand, sur quelles hypothèses",
          "Workflow d’exécution intégré",
        ],
        microproof: "Décision retenue et exécutée en 4h au lieu de 3 jours",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prouver",
        title: "Relisez l’impact réel pour améliorer le prochain arbitrage",
        body: "Après exécution, Praedixa compare le scénario de base, la recommandation et le réel observé. La relecture alimente le prochain cycle de décision.",
        bullets: [
          "Revue avant / recommandé / réel automatique",
          "Preuve structurée, exploitable en comité",
          "Hypothèses recalibrées pour le prochain arbitrage",
        ],
        microproof: "Écart recommandé vs réel : -12% sur le coût d’urgence",
      },
    ],
  },
  proofPreview: {
    kicker: "Preuve en action",
    heading: "Un dossier de preuve, pas un dashboard de plus.",
    body: "Chaque décision génère un dossier structuré : situation initiale, options comparées, décision retenue, impact observé. Le comité relit, pas la machine.",
    tabs: [
      {
        label: "Situation initiale",
        content:
          "Trois sites logistiques absorbent un pic de charge sur cinq jours. Le backlog augmente, les heures supplémentaires sont entamées et le recours intérim risque d’arriver trop tard.",
      },
      {
        label: "Options comparées",
        content:
          "Heures supplémentaires locales (base 100), intérim ciblé (base 118) et réallocation inter-sites (base 92). Chaque option est relue sur la même base coût / service / risque.",
      },
      {
        label: "Impact relu",
        content:
          "La réallocation inter-sites a réduit le coût d’urgence de 12% par rapport au scénario local-only, tout en stabilisant le backlog critique sur les trois sites.",
      },
    ],
    metrics: [
      { value: "3", label: "Options comparées" },
      { value: "−12%", label: "Coût d’urgence" },
      { value: "8j", label: "Anticipation" },
    ],
  },
  deployment: {
    kicker: "Déploiement",
    heading: "En production en 30 jours, pas en 6 mois.",
    subheading:
      "Un cadrage resserré, un sponsor opérations, des données existantes. Le premier arbitrage objectivé arrive en 30 jours.",
    steps: [
      {
        marker: "S1",
        title: "Cadrage",
        description:
          "Arbitrage prioritaire, sources de données et sponsor opérations identifiés.",
      },
      {
        marker: "S2",
        title: "Première lecture",
        description:
          "Options comparées sur base coût / service / risque à partir des données existantes.",
      },
      {
        marker: "S3",
        title: "Décision cadrée",
        description:
          "Hypothèses explicites, décision recommandée et comité court Ops / Finance.",
      },
      {
        marker: "S4",
        title: "Revue d’impact",
        description:
          "Comparaison avant / recommandé / réel et calibration du prochain arbitrage.",
      },
      {
        marker: "→",
        title: "Montée en charge",
        description:
          "Extension au prochain périmètre : nouveaux sites, nouvelles décisions.",
      },
    ],
    notItems: [
      "Pas de refonte SI ni de remplacement ERP / BI / planning",
      "Pas de promesse floue d’optimiser toute l’entreprise d’un coup",
      "Pas de couche de reporting supplémentaire sans arbitrage exploitable",
      "Pas de projet à 6 mois avant la première valeur",
    ],
    ctaMicrocopy: "Retour qualifié sous 48h ouvrées",
  },
  integrationSecurity: {
    kicker: "Intégration & sécurité",
    heading: "Branché au-dessus de l’existant, pas à la place.",
    subheading:
      "Praedixa se connecte en lecture seule à vos sources. Les données restent agrégées, hébergées en France, protégées par NDA.",
    controls: [
      {
        badge: "Contrôle actif",
        title: "Lecture seule",
        body: "Aucune écriture dans vos systèmes sources. Praedixa lit, compare et documente.",
      },
      {
        badge: "Contrôle actif",
        title: "Données agrégées",
        body: "Pas de données nominatives. Les signaux sont agrégés au niveau site ou réseau.",
      },
      {
        badge: "Contrôle actif",
        title: "Hébergement France",
        body: "Infrastructure hébergée en France, conforme aux exigences de souveraineté.",
      },
      {
        badge: "Contrôle actif",
        title: "NDA dès J1",
        body: "Accord de confidentialité signé avant le premier échange de données.",
      },
      {
        badge: "Contrôle actif",
        title: "Audit trail complet",
        body: "Chaque décision, validation et relecture est tracée avec horodatage et rôle.",
      },
      {
        badge: "Contrôle actif",
        title: "Connecteurs standards",
        body: "API REST, exports CSV, connecteurs ERP et WFM. Pas d’intégration invasive.",
      },
    ],
    stackItems: ["Planning", "ERP", "CRM", "BI", "Excel", "CSV", "API REST"],
  },
  faqV2: {
    heading: "Questions fréquentes",
    items: [
      {
        question: "Faut-il remplacer nos outils actuels ?",
        answer:
          "Non. Praedixa se branche au-dessus de l’existant en lecture seule. ERP, BI, planning et Excel restent en place.",
      },
      {
        question: "Quel est le délai avant le premier arbitrage objectivé ?",
        answer:
          "30 jours. Le cadrage commence en semaine 1, la première lecture utile arrive en semaine 2.",
      },
      {
        question: "Quelles données sont nécessaires au démarrage ?",
        answer:
          "Des exports ou API existants suffisent : charge prévisionnelle, capacité, backlog, coûts d’urgence. Le démarrage peut rester en lecture seule.",
      },
      {
        question: "Qui est le sponsor idéal côté client ?",
        answer:
          "Un responsable opérations ou réseau qui porte un arbitrage concret à objectiver. Le sponsor cadre le périmètre et valide les hypothèses.",
      },
      {
        question:
          "Comment Praedixa se distingue d’un outil de BI ou de prévision ?",
        answer:
          "La BI montre ce qui se passe. La prévision anticipe. Praedixa ajoute le cadre décisionnel qui manque : comparer les options, retenir une décision, puis relire l’impact réel.",
      },
      {
        question: "Que se passe-t-il après les 30 premiers jours ?",
        answer:
          "Le cadre est réutilisable. Le réseau peut étendre à de nouveaux sites, de nouvelles décisions ou de nouveaux horizons sans repartir de zéro.",
      },
    ],
    contactCta: "Une question spécifique ?",
    contactBody:
      "Décrivez votre contexte et nous revenons avec une réponse qualifiée sous 48h ouvrées.",
  },
  finalCta: {
    label: "Prêt à objectiver",
    heading: "Cadrons le premier arbitrage à objectiver.",
    body: "Décrivez votre réseau et l’arbitrage prioritaire. Nous revenons avec un prochain pas clair sous 48h ouvrées.",
    promiseItems: [
      "Retour qualifié sous 48h ouvrées",
      "Orientation preuve sur historique ou cadrage déploiement",
      "Prochain pas concret, adapté à votre périmètre",
    ],
    step1Fields: [
      {
        name: "Type de réseau",
        type: "select",
        options: [
          "Logistique",
          "Distribution",
          "Restauration",
          "Retail",
          "Services",
          "Industrie",
          "Autre",
        ],
      },
      { name: "Arbitrage prioritaire", type: "text" },
      {
        name: "Horizon projet",
        type: "select",
        options: ["< 1 mois", "1–3 mois", "3–6 mois", "> 6 mois"],
      },
    ],
    step2Fields: [
      { name: "Nom", type: "text" },
      { name: "Email professionnel", type: "email" },
      { name: "Entreprise", type: "text" },
      { name: "Message (optionnel)", type: "textarea" },
    ],
    step1Cta: "Continuer",
    step2Cta: "Envoyer la demande",
    successTitle: "Demande envoyée",
    successBody:
      "Nous revenons vers vous sous 48h ouvrées avec un prochain pas concret.",
  },
};
