export type EvidenceLevel = "official" | "market" | "hypothesis";

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
  id: "brand" | "ops" | "finance" | "network";
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
  market: "Signal marche",
  hypothesis: "Hypothese de travail",
};

export const greekiaMessaging = {
  hero: {
    eyebrow: "Praedixa pour Greekia",
    title: "Savoir plus tot",
    highlighted: "quel service fait perdre de la marge a Greekia",
    intro:
      "Praedixa aide Greekia a voir plus tot ou la marge fuit entre sur-preparation, sous-effectif, rupture et correction tardive.",
    summary:
      "Praedixa se branche en lecture seule sur la caisse, le planning, la prep et le stock pour comparer les bonnes options service par service. Le point d'entree: un audit en 5 jours ouvres, puis un abonnement si le gain est reel.",
    quickRead: [
      "Voir les services ou Greekia perd le plus",
      "Comparer les bonnes actions avant le rush",
      "Prouver la marge sauvee dans le temps",
    ],
    ctaPrimary: "Demander l'audit 5 jours",
    ctaPrimaryHref: "#cta",
    ctaSecondary: "Voir la methode",
    ctaSecondaryHref: "#loop",
    chips: [
      "5 jours ouvres",
      "Lecture seule",
      "1 a 2 restaurants",
      "ROI relisible",
    ],
    claims: [
      {
        label: "Economics franchise",
        value:
          "73% de marge brute moyenne, 25% d'EBE et 23% de charges de personnel",
        qualifier:
          "quand le modele fonctionne, l'enjeu devient de proteger ces ratios service apres service",
        evidence: "official",
        href: "https://greekia.fr/franchise",
      },
      {
        label: "Modele operatoire",
        value:
          "Cuisine centrale, process optimises, image de marque forte et installation sans gaine d'extraction",
        qualifier:
          "plus le reseau s'ouvre vite, plus il faut garder une lecture commune de la marge et de l'execution",
        evidence: "official",
        href: "https://greekia.fr/franchise",
      },
    ] satisfies EvidenceClaim[],
    boardStats: [
      {
        label: "Preuve d'entree",
        value: "5 jours ouvres",
        note: "pour trouver ou le gain est reel",
      },
      {
        label: "Suite logique",
        value: "Abonnement",
        note: "si l'audit confirme le gain",
      },
      {
        label: "Premier perimetre",
        value: "1 a 2 sites",
        note: "avec 1 ou 2 familles de decisions",
      },
      {
        label: "Lecture comite",
        value: "Ops + Finance + Reseau",
        note: "la meme lecture pour le siege et les franchises",
      },
    ],
    boardSignals: [
      "Ou la prep fait perdre de la marge",
      "Ou le staffing est trop bas ou trop haut",
      "Ou les ruptures cassent le service",
      "Ou le siege doit agir en premier",
    ],
  },
  whyNow: {
    eyebrow: "Pourquoi Greekia devrait regarder ca",
    title: "Pas un outil de plus.",
    highlighted:
      "Un moyen simple de mieux decider sur la prep, le staffing et les flux.",
    description:
      "Greekia a deja des outils. Le sujet n'est pas d'en ajouter un. Le sujet est de savoir plus tot ou agir pour proteger la marge et l'experience client.",
    benefits: [
      {
        title: "Mieux doser la prep",
        description:
          "Voir ou Greekia sur-produit, sous-produit ou reprepare trop tard sur les produits qui comptent vraiment.",
      },
      {
        title: "Mieux staffer les rushs",
        description:
          "Comparer les bons scenarios de staffing avant le service, pas pendant qu'il est deja en train de deraper.",
      },
      {
        title: "Voir les ruptures plus tot",
        description:
          "Anticiper les ruptures et les temps d'attente avant qu'ils ne se voient en caisse ou cote client.",
      },
      {
        title: "Aligner siege et reseau",
        description:
          "Donner au siege, a l'exploitation et aux franchises la meme lecture sur ou agir en premier.",
      },
      {
        title: "Prouver le gain",
        description:
          "Relire simplement ce qui a ete evite, ajuste ou mieux decide sur la prep, le staffing et les flux.",
      },
      {
        title: "Mieux accompagner les ouvertures",
        description:
          "En extension, Praedixa aide Greekia a relire la montee en charge des nouveaux sites et a prioriser le bon support reseau.",
      },
    ] satisfies ValueBenefit[],
    paragraphs: [
      "Greekia vend une promesse simple: fraicheur, generosite, rapidite.",
      "Quand la prep est mal dosee, que le rush est mal staffe ou que la rupture est vue trop tard, Greekia perd a la fois en marge et en experience client.",
      "Praedixa sert a rendre ces points visibles plus tot, pour aider le siege et les sites a prendre la bonne decision avant que le service ne se degrade.",
    ],
    signals: [
      {
        label: "Signal economie unitaire",
        value:
          "Greekia met en avant 73% de marge brute moyenne, 25% d'EBE et 23% de charges de personnel",
        qualifier:
          "cela donne une base parfaite pour un discours Praedixa: proteger ces ratios quand la demande, la prep ou le staffing se tendent",
        evidence: "official",
        href: "https://greekia.fr/franchise",
      },
      {
        label: "Signal operations reseau",
        value:
          "Le concept assume deja une cuisine centrale, des process simples et une exploitation ultra simplifiee",
        qualifier:
          "plus l'exploitation est pensee pour scaler, plus une couche de lecture decisionnelle sur marge / flux / execution devient pertinente",
        evidence: "official",
        href: "https://greekia.fr/franchise",
      },
      {
        label: "Signal marque",
        value:
          "Greekia met aussi en avant une image de marque forte et une communaute sociale de +15 000 abonnes cumules",
        qualifier:
          "une seule sequence de service ratee peut vite devenir un sujet de marque; la preuve doit donc parler autant experience que marge",
        evidence: "official",
        href: "https://greekia.fr/franchise",
      },
    ] satisfies EvidenceClaim[],
  },
  decisionFocus: {
    eyebrow: "L'arbitrage a objectiver en premier",
    title: "Quel service coute le plus",
    highlighted: "si Greekia attend trop pour decider ?",
    statement:
      "A quel service, dans quel restaurant et sur quelle famille de produits Greekia risque-t-il de perdre le plus entre sur-preparation, sous-effectif, rupture et remise defensive si rien n'est decide plus tot ?",
    body: "Praedixa ne vend pas un outil de planning restaurant ni un WMS maquille. Praedixa aide Greekia a relier les signaux utiles, comparer les options qui tiennent sur le terrain et declencher la premiere action defendable avant que le service ne degrade la marge ou l'experience.",
    frame: [
      {
        label: "Ce que Praedixa relie",
        value:
          "Caisse, click & collect, planning, prep cuisine centrale, stock, pertes, calendrier promo, contexte local et rythmes de service",
      },
      {
        label: "Ce que Praedixa calcule",
        value:
          "3 a 5 options reelles sous marge / vitesse / experience / risque operationnel, d'abord sur historique puis en pilotage court terme",
      },
      {
        label: "Ce que Greekia peut defendre",
        value:
          "Une priorite claire par service, une action concrete et une preuve relisible que le siege comme le reseau peuvent partager",
      },
    ],
    primaryLevers: [
      "Monter ou reduire la prep avant service sur les bonnes familles de produits",
      "Renforcer ou allegger un shift sur le bon creneau au lieu de corriger trop tard",
      "Reallouer une production ou un stock entre cuisine centrale et restaurants",
      "Ajuster l'intensite promo / click & collect / livraison quand le service devient fragile",
      "Prioriser le support reseau sur un site ou une ouverture qui commence a decrocher",
    ],
    extensions: [
      {
        title: "Rush dejeuner / diner",
        forecast:
          "temps d'attente, surcharge equipe, baisse du debit et remise defensive quand la lecture du service arrive trop tard",
        optimize:
          "bouger le staffing, simplifier le service ou lisser la demande avant que le rush ne brule la marge",
      },
      {
        title: "Prep et cuisine centrale",
        forecast:
          "sur-preparation, re-fabrication, pertes et surcouts sur les familles produit les plus sensibles a la variabilite de la demande",
        optimize:
          "preparer au plus juste, distribuer autrement et donner une consigne lisible site par site",
      },
      {
        title: "Approvisionnement frais",
        forecast:
          "ruptures, ecarts de stock et arbitrages defensifs qui degradent l'offre ou forcent des achats tardifs",
        optimize:
          "sequencer les commandes, reallouer les volumes et prioriser les produits qui comptent vraiment pour la marge et l'image",
      },
      {
        title: "Click & collect / livraison",
        forecast:
          "des flux supplementaires pousses sur un service deja fragile peuvent casser le debit en salle et la satisfaction",
        optimize:
          "ajuster la pression commerciale, le capacitaire ou les creneaux afin de proteger le coeur de service",
      },
      {
        title: "Ouvertures et ramp-up",
        forecast:
          "un nouveau site peut decrocher vite si les volumes, la prep et le staffing sont calibres trop tard",
        optimize:
          "poser une lecture de montee en charge, de support reseau et d'arbitrages prioritaires sur les 90 premiers jours",
      },
    ] satisfies DecisionExtension[],
  },
  loop: {
    eyebrow: "Ce que Praedixa apporte",
    title: "Une boucle DecisionOps legere, au-dessus de l'existant.",
    description:
      "Praedixa se branche sur les systemes utiles sans remplacer la caisse, le planning, l'ordering ou les process du reseau. Le benefice n'est pas un signal de plus: c'est une decision plus lisible, plus tot, puis une preuve de marge et d'experience service apres service.",
    steps: [
      {
        number: "01",
        title: "Federer",
        text: "Relier les flux utiles a la decision sans casser les outils deja en place: caisse, planning, prep, stock, ordering, promo et contexte local.",
      },
      {
        number: "02",
        title: "Predire",
        text: "Rendre visibles les services, produits et sites qui vont entrer en tension a horizon utile, avant que la rupture ou la file ne soient deja la.",
      },
      {
        number: "03",
        title: "Calculer",
        text: "Comparer des options qui tiennent vraiment en exploitation: staffing, prep, transfert, approvisionnement, intensite commerciale ou support reseau.",
      },
      {
        number: "04",
        title: "Declencher",
        text: "Faire partir la bonne action dans les outils et rituels deja existants, avec validation humaine et responsabilite claire cote siege ou site.",
      },
      {
        number: "05",
        title: "Prouver",
        text: "Relire le point de depart, la recommandation, la decision reelle et l'impact observe dans une revue mensuelle simple et defendable.",
      },
    ],
    footer:
      "Meme caisse, meme planning, meme reseau. Une meilleure lecture du service, de la marge et de la vitesse d'execution.",
  },
  stakeholders: {
    eyebrow: "Pourquoi cette preuve federerait vraiment",
    title: "Chaque sponsor y voit un gain immediat.",
    description:
      "Le sujet avance quand la marque, l'exploitation, la finance et le reseau comprennent en moins d'une minute ce qu'ils gagnent a lancer la preuve.",
    views: [
      {
        id: "brand",
        label: "Marque",
        title:
          "Proteger la promesse Greekia jusque dans les jours sous tension.",
        summary:
          "Le sujet n'est pas de transformer la marque en tableur. Le sujet est d'eviter qu'une promesse de fraicheur, de generosite et de soleil se fissure sur les services ou l'exploitation se tend le plus.",
        bullets: [
          "Moins de services qui cassent la sensation de fluidite et de generosite",
          "Moins de ruptures visibles sur les produits qui portent l'image",
          "Une lecture concrete du lien entre execution et perception client",
        ],
        objection: "On ne va pas piloter une marque avec des tableaux.",
        response:
          "Exact. La preuve ne remplace pas l'intuition de marque. Elle evite seulement que l'operationnel invisible ne sabote cette intuition aux pires moments.",
        proofMetric:
          "Ruptures visibles, temps d'attente, regularite de service, signaux client sur les services sensibles",
        nextStep:
          "Choisir avec l'exploitation les familles produit et les services qui ont le plus d'impact experience.",
      },
      {
        id: "ops",
        label: "Operations",
        title: "Moins de feu a eteindre, plus de services tenables.",
        summary:
          "Praedixa aide l'exploitation a agir avant qu'un rush, une prep mal calibree ou une rupture ne force des corrections de derniere minute qui brulent les equipes.",
        bullets: [
          "Une lecture plus tot des services qui vont se tendre",
          "Des leviers deja compares au lieu d'arbitrages improvises",
          "Moins de temps perdu a corriger trop tard ce qui etait visible",
          "Des priorites lisibles restaurant par restaurant",
        ],
        objection:
          "Chaque restaurant a ses specificites, on ne peut pas standardiser ca.",
        response:
          "Praedixa standardise le cadre de lecture, pas l'execution. Chaque site garde ses contraintes locales, mais les arbitrages deviennent comparables et defendables.",
        proofMetric:
          "Temps d'attente, staffing de rush, pertes, ruptures, temps passe a corriger hors plan",
        nextStep:
          "Choisir 1 a 2 restaurants avec historique propre et 2 decisions recurrentes a instrumenter.",
      },
      {
        id: "finance",
        label: "Finance",
        title:
          "Proteger la marge nette, pas seulement afficher une belle marge brute.",
        summary:
          "La finance peut enfin lire, decision par decision, ce qui releve d'une vraie marge sauvee versus d'un ratio flatteur masque par des pertes, du sur-staffing, des remises defensives ou des urgences mal arbitrees.",
        bullets: [
          "Lecture avant / recommande / reel par service ou par semaine",
          "Coût de perte, de rupture, de staffing defensif et de remise tardive",
          "Revue mensuelle compatible avec une gouvernance simple reseau",
        ],
        objection:
          "Le ROI sera conteste si les hypotheses changent d'un site a l'autre.",
        response:
          "Les hypotheses doivent justement etre simples, explicites et relues. L'enjeu n'est pas une promesse irreelle, mais une lecture defendable du cout de l'inaction.",
        proofMetric:
          "Contribution par service, pertes, heures staffees vs utiles, remises defensives, marge sauvee",
        nextStep:
          "Valider des le depart les 3 KPI economiques qui feront foi dans l'audit puis dans l'abonnement.",
      },
      {
        id: "network",
        label: "Reseau",
        title: "Mieux ouvrir, mieux accompagner et mieux prioriser le support.",
        summary:
          "Le developpement franchise gagne quand le siege sait plus vite quels sites montent proprement en charge, lesquels decrochent et quel support apporte la meilleure chance de retour a une execution saine.",
        bullets: [
          "Une lecture commune siege / franchises sur les sites fragiles",
          "Un abonnement utile pour l'ouverture puis la montee en charge",
          "Des priorites de support reseau plus defendables",
          "Une base plus solide pour raconter un modele qui scale",
        ],
        objection:
          "Le reseau est encore trop jeune pour industrialiser ce genre de sujet.",
        response:
          "Justement. Plus le reseau est jeune, plus il est utile de figer tres tot une grammaire simple de decision avant que les ecarts ne se multiplient.",
        proofMetric:
          "Temps de ramp-up, decrochages precoces, support reseau priorise, stabilisation des nouveaux sites",
        nextStep:
          "Choisir si la premiere preuve vise un site mature sous tension ou un site recent en montee en charge.",
      },
    ] satisfies StakeholderView[],
  },
  pilot: {
    eyebrow: "Le bon parcours commercial",
    title: "D'abord un audit de 5 jours.",
    subtitle:
      "En 5 jours ouvres, Praedixa montre sur les donnees existantes d'un ou deux sites Greekia ou le potentiel de gain est reel. Si le signal est confirme, Greekia passe ensuite sur un vrai abonnement pour suivre les decisions qui comptent dans le temps.",
    scope: [
      "Audit 5 jours",
      "Lecture seule",
      "1 a 2 restaurants",
      "Puis abonnement",
    ],
    timeline: [
      {
        label: "Jours 1-5",
        title: "Audit sur historique",
        text: "Qualifier l'export minimal et objectiver ou temps, argent et experience se perdent deja sur staffing, prep, ruptures, promos et debit de service.",
      },
      {
        label: "Semaine 1",
        title: "Decider l'abonnement",
        text: "Choisir les restaurants, les deux familles d'arbitrages prioritaires et les KPI qui serviront de base de suivi dans l'abonnement.",
      },
      {
        label: "Apres validation",
        title: "Installer l'abonnement",
        text: "Poser les signaux, les options comparees et le journal de decision sur un perimetre borne et exploitable par le siege comme par les sites.",
      },
      {
        label: "Ensuite",
        title: "Prouver le gain dans le temps",
        text: "Produire une lecture concise pour Ops, Finance et Reseau afin de suivre le gain, elargir le perimetre et accompagner les ouvertures.",
      },
    ],
    dataInputs: [
      "Caisse et lignes tickets par service / canal",
      "Planning equipes et charges reelles sur les creneaux critiques",
      "Flux click & collect / livraison si utilises",
      "Prep, production cuisine centrale et mouvements de stock utiles",
      "Pertes, ruptures et remises defensives si disponibles",
      "Calendrier promo, saisonnalite, meteo ou evenements locaux",
    ],
    deliverables: [
      "Un audit sur historique en 5 jours ouvres",
      "Les services et sites ou l'inaction coute le plus",
      "Trois scenarios types avec marge, vitesse et risque",
      "Un journal de decision partage pour relire les arbitrages",
      "Une preuve mensuelle que le siege et le reseau peuvent relire ensemble",
    ],
    kpis: [
      "Pertes et sur-preparation sur familles produit prioritaires",
      "Temps d'attente ou debit service quand la demande se tend",
      "Heures staffees versus heures vraiment utiles",
      "Ruptures visibles et substitutions defensives",
      "Contribution par service / canal / restaurant",
      "Stabilisation d'un nouveau site ou d'un site fragile",
    ],
    governance: [
      "Sponsor Ops: referent exploitation reseau",
      "Sponsor Finance: DAF ou controle de gestion",
      "Sponsor Reseau: developpement / animation franchise",
      "Rituels: point hebdomadaire 30 min et revue mensuelle marge / experience",
    ],
  },
  cta: {
    eyebrow: "Prochain pas",
    title: "Le bon premier pas pour Greekia,",
    highlighted: "c'est l'audit de 5 jours",
    subtitle:
      "Pas une demo generique et pas un chantier SI. Un audit court, en 5 jours ouvres, pour objectiver ou Greekia perd le plus entre service, fraicheur et marge, puis decider du vrai abonnement.",
    primaryLabel: "Demander l'audit 5 jours",
    primaryHref:
      "mailto:contact@praedixa.com?subject=Praedixa%20x%20Greekia%20-%20preuve%20sur%20historique",
    secondaryLabel: "Voir le parcours",
    secondaryHref: "#pilot",
    agendaTitle: "Ce qu'il faut verrouiller en 45 minutes",
    agendaItems: [
      "Choisir 1 a 2 restaurants ou periodes historiques a relire",
      "Valider l'export minimal caisse, planning, prep et pertes",
      "Identifier 2 families de decisions recurrentes a comparer",
      "Fixer les KPI de marge et d'experience qui feront foi",
      "Decider des conditions de passage de l'audit a l'abonnement",
    ],
    note: "Sortir de l'atelier avec un perimetre, des donnees minimales et un critere clair de passage de l'audit a l'abonnement.",
  },
  footer: {
    note: "Praedixa aide Greekia a objectiver les arbitrages qui protegent la marge, la fraicheur et la fluidite du reseau, sans remplacer les outils deja en place.",
    sources: [
      {
        label: "Greekia - Franchise",
        href: "https://greekia.fr/franchise",
      },
      {
        label: "Greekia - A propos",
        href: "https://greekia.fr/propos",
      },
      {
        label: "Greekia - Accueil",
        href: "https://greekia.fr/",
      },
      {
        label: "Praedixa - Accueil",
        href: "https://www.praedixa.com/",
      },
      {
        label: "Praedixa - Cout de l'inaction",
        href: "https://www.praedixa.com/fr/ressources/cout-inaction-logistique",
      },
    ],
  },
};
