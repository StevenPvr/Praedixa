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
    heading: "Cadrons le prochain arbitrage réseau.",
    intro:
      "Décrivez votre parc de restaurants, le service le plus sous tension et l\u2019arbitrage à objectiver. Nous revenons avec un prochain pas clair sous 48h ouvrées.",
    promiseTitle: "Ce que vous recevez",
    promiseItems: [
      "Un retour qualifié sous 48h ouvrées",
      "Une première lecture des services, canaux ou restaurants à risque",
      "Un prochain arbitrage concret à objectiver en priorité",
    ],
    proofIntentKicker: "Preuve de ROI",
    proofIntentHeading: "Demander une preuve de ROI sur vos rushs.",
    proofIntentIntro:
      "Décrivez un rush passé ou un service qui a décroché. Nous revenons avec une première lecture utile et la meilleure façon de cadrer la suite.",
    proofIntentPromiseItems: [
      "Lecture en lecture seule sur POS, planning et delivery",
      "Options comparées sur base coût / service / marge",
      "Prochain pas recommandé si le sujet mérite un déploiement réseau",
    ],
    scopingIntentKicker: "Premier périmètre réseau",
    scopingIntentHeading: "Cadrer un premier périmètre de décision.",
    scopingIntentIntro:
      "Décrivez le réseau, le temps fort prioritaire et l\u2019horizon projet. Nous revenons avec un cadrage simple du premier périmètre.",
    scopingIntentPromiseItems: [
      "Qualification du service, du canal ou du groupe de restaurants prioritaire",
      "Lecture des prérequis data et sponsor",
      "Proposition de premier comité de revue siège + terrain",
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
      "La page offre détaille ce qui est livré, ce qui ne l\u2019est pas et le rythme des 30 premiers jours pour un réseau QSR.",
    secondaryPanelCta: "Voir l\u2019offre publique",
    formTitle: "Décrire votre contexte",
    formSubtitle:
      "Les champs utiles pour qualifier le réseau et le rush à traiter sont requis. Le message libre reste optionnel.",
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
      "Ex\u00a0: renfort drive vs salle sur 18 restaurants avant promotion nationale.",
    currentStackPlaceholder:
      "Ex\u00a0: POS + planning + Uber Eats / Deliveroo + BI",
    messagePlaceholder:
      "Contexte additionnel, service sous tension, comité à convaincre, contraintes IT ou gouvernance déjà connues.",
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
      "Une preuve de ROI structurée comme un support de revue pour un réseau de restauration rapide\u00a0: situation initiale, options comparées, décision retenue, impact observé et limites de lecture.",
    ogTitle: "Praedixa | Preuve sur historique",
    ogDescription:
      "Un exemple public de preuve sur historique avec options comparées, décision retenue et impact relu.",
  },
  proof: {
    kicker: "Preuve sur historique",
    title:
      "Une preuve exploitable en comité, pas une intuition de plus sur le rush.",
    lead: "Exemple public inspiré d\u2019un réseau de 18 restaurants de restauration rapide\u00a0: une promotion nationale fait monter simultanément drive, salle et delivery, et force un arbitrage entre renfort ciblé, réallocation et réduction temporaire de promesse de service.",
    situationTitle: "Situation initiale",
    situationBody: [
      "Un vendredi soir promotionnel met 6 restaurants sous tension sur le drive et la livraison. Les temps de service montent déjà, les heures d\u2019urgence partent vite et les managers n\u2019ont pas de lecture réseau unifiée.",
      "Le sujet n\u2019est pas seulement de prévoir le pic. Il faut décider quels restaurants renforcer, quels canaux ralentir temporairement et où la réallocation protège le mieux la marge.",
    ],
    optionsTitle: "Options comparées",
    optionsBody: [
      "La preuve compare trois options lisibles en comité\u00a0: renfort sur place, réallocation entre restaurants voisins et réduction temporaire du menu delivery.",
      "Chaque option est relue avec la même base\u00a0: coût d\u2019action, risque service, effet sur la marge, faisabilité terrain et limites d\u2019interprétation.",
    ],
    decisionTitle: "Décision retenue",
    decisionBody: [
      "La décision retenue combine renfort ciblé sur les restaurants les plus exposés et réduction courte du menu delivery là où la cuisine sature.",
      "Le choix est justifié par une meilleure protection du temps de service et de la marge qu\u2019une réponse uniforme en heures supplémentaires.",
    ],
    impactTitle: "Impact observé",
    impactBody: [
      "La revue avant / recommandé / réel montre une baisse des heures d\u2019urgence et une meilleure tenue du temps de service sur les restaurants sous tension.",
      "La relecture sert surtout à préparer le prochain rush avec des hypothèses plus propres, pas à fabriquer une certitude artificielle.",
    ],
    limitsTitle: "Limites de la preuve",
    limitsBody: [
      "Il s\u2019agit d\u2019un exemple public en base 100, pas d\u2019un engagement chiffré universel.",
      "La preuve ne remplace ni le cadrage métier ni la revue des données nécessaires avant déploiement réseau.",
    ],
    dataTitle: "Données mobilisées",
    dataBody: [
      "Ventes POS, panier moyen, planning, absences, canaux delivery, promotions, temps de service et coûts de couverture par restaurant.",
      "Le démarrage peut rester en lecture seule sur exports ou API existants.",
    ],
    nextTitle: "Prochain arbitrage rendu possible",
    nextBody: [
      "Une fois cette preuve structurée, le réseau peut réutiliser le même cadre pour les prochains arbitrages de staffing, de promesse de service ou de delivery.",
      "C\u2019est ce passage du rush isolé à la cadence de décision réseau qui justifie le déploiement Praedixa.",
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
        option: "Renfort local",
        actionCost: "Base 100",
        inactionCost: "Base 143",
        serviceRisk: "Moyen à élevé",
        decision: "Non retenue seule",
        observedEffect: "Soulage un restaurant mais fait vite dériver les heures d\u2019urgence",
        limitation: "Ne résout pas la saturation réseau sur drive et delivery",
      },
      {
        option: "Réallocation inter-sites",
        actionCost: "Base 91",
        inactionCost: "Base 148",
        serviceRisk: "Moyen",
        decision: "Retenue",
        observedEffect: "Protège les restaurants voisins les plus exposés",
        limitation: "Suppose une polyvalence et une distance compatibles",
      },
      {
        option: "Réduction menu delivery",
        actionCost: "Base 84",
        inactionCost: "Base 139",
        serviceRisk: "Faible à moyen",
        decision: "Retenue partiellement",
        observedEffect:
          "Stabilise les cuisines critiques et protège la marge pendant le rush",
        limitation: "Peut réduire temporairement le chiffre sur un canal",
      },
    ],
    primaryCtaLabel: "Cadrer un premier périmètre",
    secondaryCtaLabel: "Voir l\u2019offre publique",
  },
  credibilityRibbon: {
    stackLabel: "Signaux relus",
    stackChips: ["POS", "Planning", "Delivery", "Promos", "BI", "API / CSV"],
    rolesLabel: "Décideurs du réseau",
    roleChips: ["Franchisé", "Dir. Réseau", "Ops", "Finance", "RH"],
    rolesMicrocopy:
      "Les fonctions qui arbitrent staffing, service et marge au niveau réseau.",
    trustLabel: "Engagements",
    trustMarkers: [
      "Lecture seule au démarrage",
      "Aucune écriture caisse ou planning",
      "Hébergement France",
      "NDA dès le premier échange",
    ],
  },
  problemCards: [
    {
      number: "01",
      title: "Le rush se lit trop tard",
      consequence:
        "Quand le service décroche déjà, les seules options restantes coûtent plus cher et protègent moins bien la marge.",
    },
    {
      number: "02",
      title: "Chaque restaurant arbitre seul",
      consequence:
        "Sans lecture réseau partagée, on compense au plus vite au lieu de choisir la meilleure option pour l\u2019ensemble du parc.",
    },
    {
      number: "03",
      title: "La marge glisse sans preuve",
      consequence:
        "Sans relecture service, staffing et marge, le même problème revient au prochain midi, soir ou temps fort promotionnel.",
    },
  ],
  method: {
    kicker: "Comment ça marche",
    heading: "Quatre étapes pour décider avant le rush.",
    steps: [
      {
        id: "voir",
        number: "01",
        verb: "Anticiper",
        title:
          "Voir quels restaurants vont décrocher avant midi, soir ou promo",
        body: "Praedixa relit POS, planning, delivery, météo et promotions pour identifier les restaurants, créneaux et canaux qui vont passer sous tension.",
        bullets: [
          "Connexion en lecture seule à vos sources existantes",
          "Projection des services à risque à court horizon",
          "Signal exploitable par restaurant, canal et créneau",
        ],
        microproof: "Rush détecté 5\u00a0jours avant un vendredi promo",
      },
      {
        id: "comparer",
        number: "02",
        verb: "Comparer",
        title: "Comparer les arbitrages qui existent vraiment sur le terrain",
        body: "Pour chaque service sous tension, Praedixa compare les options réalistes\u00a0: renfort local, réaffectation inter-sites, réduction temporaire de promesse de service ou throttling delivery.",
        bullets: [
          "Plusieurs scénarios chiffrés et comparés",
          "Coût d\u2019action vs coût de non-action",
          "Hypothèses lisibles par siège et terrain",
        ],
        microproof: "3 scénarios comparés en 17\u00a0s",
      },
      {
        id: "decider",
        number: "03",
        verb: "Décider",
        title: "Valider un plan par restaurant, pas une moyenne réseau",
        body: "La décision retenue est tracée avec ses hypothèses, les restaurants concernés, le service touché et les validations nécessaires côté réseau, opérations et finance.",
        bullets: [
          "Validation par les parties prenantes utiles",
          "Trace complète\u00a0: qui décide, quand et pourquoi",
          "Exécution suivie jusqu\u2019au terrain",
        ],
        microproof: "Décision prise le matin pour le service du soir",
      },
      {
        id: "prouver",
        number: "04",
        verb: "Prouver",
        title: "Relire marge, service et heures d\u2019urgence après exécution",
        body: "Après exécution, Praedixa compare ce qui était prévu à ce qui s\u2019est réellement passé sur la couverture, le temps de service, la marge et les coûts d\u2019urgence.",
        bullets: [
          "Comparaison automatique prévu vs réel",
          "Preuve structurée, exploitable en comité",
          "Chaque rush améliore le suivant",
        ],
        microproof: "\u22127,4\u00a0% d\u2019heures d\u2019urgence sur le cas relu",
      },
    ],
  },
  proofPreview: {
    kicker: "Preuve de ROI",
    heading: "Un cas réseau relisible par opérations et finance.",
    body: "Chaque arbitrage est relié à son effet sur le service, la masse salariale et la marge. Vous obtenez une preuve relisible en comité, pas une simple estimation.",
    tabs: [
      {
        label: "Situation",
        content:
          "18 restaurants font face à une promotion app un vendredi soir. Drive et delivery saturent dans 6 points de vente et les heures d\u2019urgence commencent déjà à dériver.",
      },
      {
        label: "Options comparées",
        content:
          "Trois arbitrages sont relus sur la même base\u00a0: renfort ciblé, réallocation inter-sites et réduction temporaire du menu delivery. Chaque option est évaluée sur coût, temps de service et marge protégée.",
      },
      {
        label: "Impact mesuré",
        content:
          "Le scénario retenu a réduit les heures d\u2019urgence de 7,4\u00a0% et contenu le temps de service sur les restaurants les plus exposés.",
      },
    ],
    metrics: [
      { value: "18", label: "Restaurants relus" },
      { value: "\u22127,4\u00a0%", label: "Heures d\u2019urgence" },
      { value: "11 min", label: "Temps de service contenu" },
    ],
  },
  deployment: {
    kicker: "Déploiement",
    heading: "Un premier cas réseau en 30\u00a0jours.",
    subheading:
      "On démarre sur POS, planning et delivery. Un sponsor opérations suffit pour cadrer le premier arbitrage.",
    steps: [
      {
        marker: "S1",
        title: "Cadrage réseau",
        description:
          "Choix des restaurants prioritaires, des créneaux critiques et des sources utiles.",
      },
      {
        marker: "S2",
        title: "Carte de risque",
        description:
          "Lecture par restaurant, service et canal avec options comparées sur vos données existantes.",
      },
      {
        marker: "S3",
        title: "Arbitrage",
        description:
          "Recommandation validée avec opérations, réseau et finance.",
      },
      {
        marker: "S4",
        title: "Mesure réelle",
        description:
          "Comparaison prévu vs réel sur staffing, service et marge, puis plan pour la suite.",
      },
      {
        marker: "\u2192",
        title: "Extension",
        description:
          "Nouveaux restaurants, nouveaux temps forts, même méthode de décision.",
      },
    ],
    notItems: [
      "Pas de remplacement caisse ou planning",
      "Pas de chantier data lourd",
      "Pas de POC flou sans décision terrain",
      "Pas de reporting de plus pour le terrain",
    ],
    ctaMicrocopy: "Retour qualifié sous 48h ouvrées",
  },
  integrationSecurity: {
    kicker: "Intégration & sécurité",
    heading: "Branché sur le réel, sans toucher à vos opérations.",
    subheading:
      "Lecture seule. Données hébergées en France. Aucun write sur POS ou planning. NDA dès le premier échange.",
    controls: [
      {
        badge: "Contrôle actif",
        title: "Lecture seule",
        body: "Aucune écriture dans vos systèmes. Praedixa lit, compare et documente sans toucher au terrain.",
      },
      {
        badge: "Contrôle actif",
        title: "Aucune écriture caisse ou planning",
        body: "Le POS, le planning et les canaux delivery restent maîtres. Praedixa n\u2019injecte rien dans vos opérations.",
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
        body: "Chaque arbitrage et chaque validation est tracé avec horodatage et auteur.",
      },
      {
        badge: "Contrôle actif",
        title: "Connecteurs standards",
        body: "POS, exports CSV, APIs delivery, planning et BI. Pas d\u2019intégration invasive.",
      },
    ],
    stackItems: ["POS", "Planning", "Delivery", "Promos", "BI", "CSV", "API"],
  },
  faqV2: {
    heading: "Questions fréquentes",
    items: [
      {
        question: "Faut-il changer de POS ou de planning\u00a0?",
        answer:
          "Non. Praedixa se connecte en lecture seule à vos outils existants. POS, planning, delivery et BI restent en place.",
      },
      {
        question: "À partir de combien de restaurants cela devient pertinent\u00a0?",
        answer:
          "Dès que le siège ou le franchisé arbitre sur plusieurs restaurants, services ou canaux. Le gain vient de la lecture réseau, pas d\u2019un restaurant isolé.",
      },
      {
        question: "Est-ce que cela couvre drive, salle et delivery\u00a0?",
        answer:
          "Oui. Le sujet n\u2019est pas le canal en soi, mais l\u2019arbitrage entre couverture, promesse de service et marge quand plusieurs canaux se tendent en même temps.",
      },
      {
        question: "Quelles données faut-il au démarrage\u00a0?",
        answer:
          "Vos exports ou API existants suffisent dans la plupart des cas\u00a0: ventes POS, planning, absences, delivery, promotions ou coûts de couverture.",
      },
      {
        question: "Qui doit porter le sujet côté client\u00a0?",
        answer:
          "Un franchisé multi-sites, un directeur réseau ou un responsable opérations avec un vrai arbitrage à trancher dans les prochaines semaines.",
      },
      {
        question: "Quelle est la différence avec la BI ou le WFM\u00a0?",
        answer:
          "La BI montre ce qui s\u2019est passé. Le planning exécute un scénario. Praedixa relie les deux pour choisir plus tôt quoi faire quand le rush met simultanément service, staffing et marge sous tension.",
      },
      {
        question: "Que se passe-t-il après les 30 premiers jours\u00a0?",
        answer:
          "La méthode est réutilisable. Vous pouvez étendre à d\u2019autres restaurants, d\u2019autres canaux ou d\u2019autres temps forts sans repartir de zéro.",
      },
    ],
    contactCta: "Une question spécifique\u00a0?",
    contactBody:
      "Décrivez votre réseau et le prochain rush à traiter, nous revenons avec une réponse qualifiée sous 48h ouvrées.",
  },
  finalCta: {
    label: "Réseau restauration rapide",
    heading: "Cadrons le prochain rush réseau.",
    body: "Décrivez vos restaurants, vos services sous tension et le prochain temps fort. On revient avec un cadrage concret sous 48h.",
    promiseItems: [
      "Retour en 48h",
      "Premier risque à objectiver",
      "Plan d\u2019action réseau concret",
    ],
    step1Fields: [
      {
        name: "Nombre de restaurants",
        type: "select",
        options: ["2\u20135", "6\u201315", "16\u201340", "41\u2013100", "100+"],
      },
      { name: "Principal enjeu", type: "text" },
      {
        name: "Horizon projet",
        type: "select",
        options: [
          "Avant le prochain temps fort",
          "< 1 mois",
          "1\u20133 mois",
          "> 3 mois",
        ],
      },
    ],
    step2Fields: [
      { name: "Nom", type: "text" },
      { name: "Email professionnel", type: "email" },
      { name: "Enseigne / groupe", type: "text" },
      { name: "Message (optionnel)", type: "textarea" },
    ],
    step1Cta: "Continuer",
    step2Cta: "Envoyer la demande",
    successTitle: "Demande envoyée",
    successBody:
      "Nous revenons vers vous sous 48h ouvrées avec un prochain pas concret.",
  },
};
