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
      "Décrivez le premier arbitrage à traiter, le réseau concerné et l\u2019horizon projet. Nous revenons avec un prochain pas clair sous 48h ouvrées.",
    promiseTitle: "Ce que vous recevez",
    promiseItems: [
      "Un retour qualifié sous 48h ouvrées",
      "Une orientation claire entre preuve sur historique et cadrage du déploiement",
      "Un prochain pas concret, adapté à votre périmètre",
    ],
    proofIntentKicker: "Preuve sur historique",
    proofIntentHeading: "Demander la preuve sur historique.",
    proofIntentIntro:
      "Décrivez l\u2019arbitrage à objectiver. Nous revenons avec une première lecture utile et la meilleure façon de cadrer la suite.",
    proofIntentPromiseItems: [
      "Lecture en lecture seule sur vos données existantes",
      "Options comparées sur base coût / service / risque",
      "Prochain pas recommandé si le sujet mérite un déploiement",
    ],
    scopingIntentKicker: "Premier périmètre",
    scopingIntentHeading: "Cadrer un premier périmètre de décision.",
    scopingIntentIntro:
      "Décrivez le réseau, l\u2019arbitrage prioritaire et l\u2019horizon projet. Nous revenons avec un cadrage simple du premier périmètre.",
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
    secondaryPanelTitle:
      "Besoin d\u2019aligner l\u2019offre avant l\u2019échange\u00a0?",
    secondaryPanelBody:
      "La page offre détaille ce qui est livré, ce qui ne l\u2019est pas et le rythme des 30 premiers jours.",
    secondaryPanelCta: "Voir l\u2019offre publique",
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
      "Ex\u00a0: renfort vs réallocation sur 12 sites logistiques avant pic de charge.",
    currentStackPlaceholder: "Ex\u00a0: ERP + WFM + BI + exports Excel",
    messagePlaceholder:
      "Contexte additionnel, comité à convaincre, contraintes IT ou gouvernance déjà connues.",
    send: "Envoyer la demande",
    sending: "Envoi en cours\u2026",
    successTitle: "Demande envoyée",
    successBody:
      "Nous revenons vers vous sous 48h ouvrées avec un prochain pas concret.",
    successCta: "Retour au site",
    fixErrors: "Complétez les champs requis avant d\u2019envoyer.",
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
    challengeLoading: "Chargement de la vérification anti-spam\u2026",
    challengeUnavailable:
      "Vérification anti-spam indisponible. Rechargez le challenge.",
    challengeRetry: "Recharger la vérification",
    requiredConsent: "Vous devez accepter les conditions.",
    requiredCaptcha: "Veuillez répondre à la vérification.",
    consentPrefix: "J\u2019accepte les ",
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
    lead: "Exemple public inspiré d\u2019un cas logistique multi-sites\u00a0: un pic de charge met sous tension trois sites et force un arbitrage entre renfort local, réallocation inter-sites et ajustement temporaire de service.",
    situationTitle: "Situation initiale",
    situationBody: [
      "Trois sites logistiques absorbent un pic de charge sur cinq jours. Le backlog augmente, les heures supplémentaires sont déjà entamées et le recours à l\u2019intérim risque d\u2019arriver trop tard.",
      "Le sujet n\u2019est pas seulement de prédire un pic. Il faut décider où renforcer, où réallouer et où accepter un report sans déplacer le coût vers la semaine suivante.",
    ],
    optionsTitle: "Options comparées",
    optionsBody: [
      "La preuve compare trois options lisibles en comité\u00a0: heures supplémentaires locales, intérim ciblé et réallocation inter-sites.",
      "Chaque option est relue avec la même base\u00a0: coût d\u2019action, coût de non-action, risque de service, capacité disponible et limites d\u2019interprétation.",
    ],
    decisionTitle: "Décision retenue",
    decisionBody: [
      "La décision retenue combine réallocation inter-sites et renfort ciblé plutôt qu\u2019un recours uniforme aux heures supplémentaires.",
      "Le choix est justifié par une meilleure protection du service à coût total plus défendable, malgré un effort de coordination inter-sites plus élevé.",
    ],
    impactTitle: "Impact observé",
    impactBody: [
      "La revue avant / recommandé / réel montre une meilleure protection du backlog critique et une réduction du coût d\u2019urgence par rapport au scénario local-only.",
      "La relecture sert surtout à préparer le prochain arbitrage avec des hypothèses plus propres, pas à fabriquer une certitude artificielle.",
    ],
    limitsTitle: "Limites de la preuve",
    limitsBody: [
      "Il s\u2019agit d\u2019un exemple public en base 100, pas d\u2019un engagement chiffré universel.",
      "La preuve ne remplace ni le cadrage métier ni la revue des données nécessaires avant déploiement.",
    ],
    dataTitle: "Données mobilisées",
    dataBody: [
      "Charge prévisionnelle à court horizon, capacité disponible, backlog, heures supplémentaires, recours intérim et contraintes de service par site.",
      "Le démarrage peut rester en lecture seule sur exports ou API existants.",
    ],
    nextTitle: "Prochain arbitrage rendu possible",
    nextBody: [
      "Une fois cette preuve structurée, le réseau peut réutiliser le même cadre pour les prochains arbitrages de couverture, de réallocation ou d\u2019ajustement de service.",
      "C\u2019est ce passage de l\u2019exemple à la cadence de décision qui justifie le déploiement Praedixa.",
    ],
    tableTitle: "Synthèse comparée",
    tableColumns: {
      option: "Option",
      actionCost: "Coût d\u2019action",
      inactionCost: "Coût de non-action",
      serviceRisk: "Risque service",
      decision: "Décision retenue",
      observedEffect: "Effet observé",
      limitation: "Ce qu\u2019on ne peut pas conclure",
    },
    rows: [
      {
        option: "Heures supplémentaires locales",
        actionCost: "Base 100",
        inactionCost: "Base 155",
        serviceRisk: "Moyen à élevé",
        decision: "Non retenue seule",
        observedEffect: "Soulage un site mais propage le backlog",
        limitation:
          "N\u2019isole pas l\u2019effet du manque de capacité inter-sites",
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
          "Réduit le coût d\u2019urgence et stabilise le backlog critique",
        limitation: "Suppose une coordination réseau effective",
      },
    ],
    primaryCtaLabel: "Cadrer un premier périmètre",
    secondaryCtaLabel: "Voir l\u2019offre publique",
  },
  credibilityRibbon: {
    stackLabel: "Stack couverte",
    stackChips: ["ERP", "WFM", "BI", "Planning", "Excel", "API / CSV"],
    rolesLabel: "Décideurs concernés",
    roleChips: ["COO", "Dir. Ops", "Dir. Réseau", "Finance", "DSI"],
    rolesMicrocopy: "Les fonctions qui prennent les décisions clés.",
    trustLabel: "Engagements",
    trustMarkers: [
      "Lecture seule au démarrage",
      "Hébergement France",
      "NDA dès le premier échange",
      "Données agrégées",
    ],
  },
  problemCards: [
    {
      number: "01",
      title: "Les signaux arrivent trop tard",
      consequence:
        "Quand l\u2019information arrive, il est déjà trop tard pour agir au meilleur coût.",
    },
    {
      number: "02",
      title: "Les options ne sont pas comparées",
      consequence:
        "Sous pression, on choisit la vitesse plutôt que la meilleure option.",
    },
    {
      number: "03",
      title: "L\u2019impact n\u2019est jamais mesuré",
      consequence:
        "Impossible de savoir si la décision prise était la bonne. Le même problème revient.",
    },
  ],
  method: {
    kicker: "Comment ça marche",
    heading: "Quatre étapes. Un résultat mesurable.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Anticiper",
        title:
          "L\u2019IA détecte les risques avant qu\u2019ils ne deviennent des urgences",
        body: "Praedixa se connecte à vos données existantes et identifie les risques opérationnels avant qu\u2019ils n\u2019impactent vos coûts ou votre service.",
        bullets: [
          "Connexion en lecture seule à vos sources existantes",
          "Détection automatique des risques à venir",
          "Alerte proactive quand une action s\u2019impose",
        ],
        microproof: "Risque détecté 8\u00a0jours avant l\u2019impact",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Comparer",
        title: "Comparez vos options en un clic",
        body: "Pour chaque risque détecté, Praedixa calcule le coût et l\u2019impact de chaque option. Vous voyez en un coup d\u2019\u0153il la meilleure décision.",
        bullets: [
          "Plusieurs scénarios chiffrés et comparés",
          "Coût d\u2019action vs coût de non-action",
          "Hypothèses transparentes, pas de boîte noire",
        ],
        microproof: "4 options comparées en 12\u00a0secondes",
      },
      {
        id: "decider",
        number: "03",
        verb: "Décider",
        title: "Prenez la bonne décision, tracée et justifiée",
        body: "La décision retenue est documentée avec ses hypothèses et validée par les bonnes personnes. Tout est traçable.",
        bullets: [
          "Validation par les parties prenantes (opérations, finance)",
          "Trace complète\u00a0: qui a décidé, quand, pourquoi",
          "Exécution suivie de bout en bout",
        ],
        microproof: "Décision prise en 4h au lieu de 3\u00a0jours",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prouver",
        title: "Mesurez le ROI réel de chaque décision",
        body: "Après exécution, Praedixa compare ce qui était prévu à ce qui s\u2019est passé. Vous pouvez prouver votre ROI en comité.",
        bullets: [
          "Comparaison automatique prévu vs réel",
          "Preuve structurée, exploitable en comité",
          "Chaque décision améliore la suivante",
        ],
        microproof: "\u221212\u00a0% sur les coûts d\u2019urgence",
      },
    ],
  },
  proofPreview: {
    kicker: "Preuve",
    heading: "Des résultats concrets, pas des promesses.",
    body: "Chaque décision est tracée et son impact mesuré. Vous pouvez prouver votre ROI en comité.",
    tabs: [
      {
        label: "Situation",
        content:
          "Trois sites font face à un pic d\u2019activité. Les coûts d\u2019urgence augmentent et les options se réduisent de jour en jour.",
      },
      {
        label: "Options comparées",
        content:
          "Trois options chiffrées\u00a0: renfort local, intérim ciblé et réallocation entre sites. Chaque option est évaluée sur le même critère\u00a0: coût, risque et impact sur le service.",
      },
      {
        label: "Impact mesuré",
        content:
          "La réallocation entre sites a réduit les coûts d\u2019urgence de 12\u00a0% tout en maintenant le niveau de service sur les trois sites.",
      },
    ],
    metrics: [
      { value: "3", label: "Options comparées" },
      { value: "\u221212\u00a0%", label: "Coûts d\u2019urgence" },
      { value: "8j", label: "Anticipation" },
    ],
  },
  deployment: {
    kicker: "Déploiement",
    heading: "Opérationnel en 30\u00a0jours.",
    subheading:
      "Un démarrage simple, un sponsor opérations, vos données existantes.",
    steps: [
      {
        marker: "S1",
        title: "Cadrage",
        description:
          "Identification de l\u2019enjeu prioritaire, des sources de données et du sponsor.",
      },
      {
        marker: "S2",
        title: "Première analyse",
        description: "Options comparées à partir de vos données existantes.",
      },
      {
        marker: "S3",
        title: "Décision",
        description:
          "Recommandation validée avec les opérations et la finance.",
      },
      {
        marker: "S4",
        title: "Mesure d\u2019impact",
        description: "Comparaison prévu vs réel et plan pour la suite.",
      },
      {
        marker: "\u2192",
        title: "Extension",
        description: "Nouveaux sites, nouvelles décisions, même méthode.",
      },
    ],
    notItems: [
      "Pas de remplacement de vos outils",
      "Pas de projet IT lourd",
      "Pas de reporting supplémentaire",
      "Pas de promesse sans preuve",
    ],
    ctaMicrocopy: "Retour qualifié sous 48h ouvrées",
  },
  integrationSecurity: {
    kicker: "Intégration & sécurité",
    heading: "Sécurisé, souverain, non intrusif.",
    subheading:
      "Lecture seule. Données hébergées en France. NDA dès le premier échange.",
    controls: [
      {
        badge: "Contrôle actif",
        title: "Lecture seule",
        body: "Aucune écriture dans vos systèmes. Praedixa lit, compare et documente.",
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
        title: "NDA dès le premier échange",
        body: "Accord de confidentialité signé avant le premier échange de données.",
      },
      {
        badge: "Contrôle actif",
        title: "Traçabilité complète",
        body: "Chaque décision et chaque validation est tracée avec horodatage et auteur.",
      },
      {
        badge: "Contrôle actif",
        title: "Connecteurs standards",
        body: "API REST, exports CSV, connecteurs ERP et WFM. Pas d\u2019intégration invasive.",
      },
    ],
    stackItems: ["Planning", "ERP", "CRM", "BI", "Excel", "CSV", "API REST"],
  },
  faqV2: {
    heading: "Questions fréquentes",
    items: [
      {
        question: "Faut-il remplacer nos outils actuels\u00a0?",
        answer:
          "Non. Praedixa se connecte en lecture seule à vos outils existants. ERP, BI, planning et Excel restent en place.",
      },
      {
        question: "En combien de temps voit-on les premiers résultats\u00a0?",
        answer:
          "30\u00a0jours. Le cadrage commence en semaine\u00a01, les premières options comparées arrivent en semaine\u00a02.",
      },
      {
        question: "Quelles données sont nécessaires au démarrage\u00a0?",
        answer:
          "Vos exports ou API existants suffisent. Praedixa démarre en lecture seule, sans migration de données.",
      },
      {
        question: "Qui doit porter le projet côté client\u00a0?",
        answer:
          "Un responsable opérations ou réseau qui a un enjeu concret à traiter. Il cadre le périmètre et valide les résultats.",
      },
      {
        question: "Quelle est la différence avec un outil de BI\u00a0?",
        answer:
          "La BI montre ce qui se passe. Praedixa va plus loin\u00a0: il anticipe les risques, compare les options et mesure l\u2019impact réel de chaque décision.",
      },
      {
        question: "Que se passe-t-il après les 30 premiers jours\u00a0?",
        answer:
          "La méthode est réutilisable. Vous pouvez étendre à de nouveaux sites ou de nouvelles décisions sans repartir de zéro.",
      },
    ],
    contactCta: "Une question spécifique\u00a0?",
    contactBody:
      "Décrivez votre contexte et nous revenons avec une réponse qualifiée sous 48h ouvrées.",
  },
  finalCta: {
    label: "Prêt à commencer\u00a0?",
    heading: "Parlons de votre ROI.",
    body: "Décrivez votre contexte. On revient avec un plan d\u2019action en 48h.",
    promiseItems: [
      "Réponse en 48h",
      "Diagnostic personnalisé",
      "Plan d\u2019action concret",
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
      { name: "Principal enjeu", type: "text" },
      {
        name: "Horizon projet",
        type: "select",
        options: ["< 1 mois", "1\u20133 mois", "3\u20136 mois", "> 6 mois"],
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
