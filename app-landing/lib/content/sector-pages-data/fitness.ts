import type { SectorPageEntry } from "./types";
import { FitnessClubIcon } from "../../../components/shared/icons/MarketingIcons";
import { praedixaMethodSources } from "./shared";
import { sectorRoutes } from "./routes";

export const fitnessSectorPageFr: SectorPageEntry = {
  id: "fitness",
  icon: FitnessClubIcon,
  groupLabel: "Fitness",
  slug: sectorRoutes.fr.slugs.fitness,
  shortLabel: "Fitness",
  brandLabel: "Praedixa Fitness",
  title: "Fitness",
  metaTitle:
    "Praedixa | Fitness: arbitrer remplissage, coaching et rétention avant que la capacité club ne sature",
  metaDescription:
    "Check-ins, cours, planning coachs, abonnements et churn: Praedixa aide les réseaux fitness à anticiper la fréquentation, arbitrer capacité et rétention, puis prouver l'impact club par club.",
  heroKicker: "Verticale fitness",
  heroTitle:
    "Arbitrer remplissage club, coaching et rétention avant que la capacité ne sature.",
  heroSubtitle:
    "Check-ins, réservations de cours, planning coachs, essais, abonnements, churn et qualité de service vivent déjà dans vos outils. Praedixa relie ces signaux pour transformer la variabilité quotidienne des clubs en décisions plus propres sur capacité, animation, staffing et rétention membre.",
  proofKicker: "Pourquoi maintenant",
  proofTitle:
    "Les réseaux fitness doivent absorber des pics de fréquentation très courts tout en protégeant l'expérience membre et la rétention.",
  proofIntro:
    "Le sujet n'est pas seulement d'ouvrir plus de cours. Le vrai enjeu est de décider plus tôt où renforcer un coach, lisser la fréquentation, ajuster l'animation commerciale ou protéger les membres à risque avant que l'expérience ne décroche.",
  proofs: [
    {
      value: "11 %",
      label:
        "des pratiquants sportifs déclarent fréquenter une structure commerciale type remise en forme ou fitness en 2024",
      detail:
        "Cette pratique a progressé de 2 points en un an selon le baromètre national.",
      sourceLabel:
        "INJEP — Les pratiques sportives en France en 2024 avant les Jeux de Paris",
      sourceUrl:
        "https://injep.fr/publication/les-pratiques-sportives-en-france-en-2024-avant-les-jeux-de-paris/",
    },
    {
      value: "39,1 %",
      label:
        "des types d'équipements sportifs des grands centres urbains sont des salles de sport en 2023",
      detail:
        "L'Insee inclut les salles spécialisées, de remise en forme et multisports.",
      sourceLabel:
        "Insee Première 2041 — Équipements sportifs en ville et en milieu rural",
      sourceUrl: "https://www.insee.fr/fr/statistiques/8376522",
    },
    {
      value: "25 240",
      label:
        "projets de recrutement de sportifs et animateurs sportifs en 2025",
      detail: "55,0 % sont jugés difficiles et 56,4 % saisonniers.",
      sourceLabel: "France Travail — BMO 2025, sportifs et animateurs sportifs",
      sourceUrl:
        "https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2024&ss=1",
    },
  ],
  challengeKicker: "La vraie question business",
  challengeTitle:
    "Comment absorber les pics de fréquentation et de coaching sans laisser décrocher l'expérience membre ni la rétention ?",
  challengeBody:
    "Dans le fitness, sous-couvrir les heures de pointe détériore immédiatement l'expérience club. Sur-couvrir abîme la marge du site. Il faut arbitrer plus tôt entre capacité, animation, staffing et risque de churn, pas simplement ajouter des créneaux au dernier moment.",
  challenges: [
    {
      title: "Pics très concentrés",
      body: "Les avant-travail, après-travail, cours collectifs et moments d'inscription créent des tensions fortes sur quelques créneaux seulement.",
    },
    {
      title: "Capacité et coaching liés",
      body: "Quand un coach manque ou qu'un cours déborde, ce n'est pas seulement le staffing qui casse: c'est aussi le ressenti, l'engagement et la rétention des membres.",
    },
    {
      title: "Acquisition vs rétention",
      body: "Pousser les essais, offres ou campagnes au mauvais moment peut saturer un club déjà tendu et dégrader l'expérience des membres existants.",
    },
  ],
  valuePropKicker: "Proposition de valeur",
  valuePropTitle:
    "Praedixa aide les réseaux fitness à arbitrer capacité, animation, coaching et rétention sur la même base de décision.",
  valuePropBody:
    "Praedixa réunit fréquentation, réservations, staffing, abonnement et churn dans une même lecture, projette les points de saturation à court horizon et chiffre les arbitrages entre renfort coach, ouverture de cours, ajustement commercial, limitation de capacité ou action rétention. Vous partez d'une première action défendable club par club.",
  loopKicker: "Boucle Praedixa",
  loopTitle:
    "Une boucle de décision pensée pour fréquentation club, coaching, engagement et rétention.",
  loopIntro:
    "La mécanique reste la même, mais le langage devient celui d'un réseau fitness: fréquentation, taux de remplissage, qualité d'encadrement, churn et revenu récurrent protégé.",
  loopSteps: [
    {
      title: "Réunir les données",
      body: "Check-ins, réservations, planning coachs, essais, CRM, churn, abonnements et campagnes locales sont remis dans une lecture commune.",
    },
    {
      title: "Projeter fréquentation et capacité utile",
      body: "Praedixa estime les pics de présence, les taux de remplissage des cours, la disponibilité coach et les créneaux où l'expérience va se tendre.",
    },
    {
      title: "Calculer la décision optimale",
      body: "La plateforme compare renfort coach, ouverture ou fermeture de cours, pilotage des essais, limitation de capacité ou action rétention ciblée.",
    },
    {
      title: "Déclencher la première action",
      body: "Le responsable réseau ou club part d'une action recommandée, priorisée par impact attendu sur expérience, rétention et marge.",
    },
    {
      title: "Prouver le ROI",
      body: "Praedixa suit fréquentation, taux de remplissage, churn évité, revenu récurrent protégé et coût de couverture par club.",
    },
  ],
  kpiKicker: "KPIs prédictibles",
  kpiTitle:
    "Les signaux fitness que Praedixa peut projeter avant la saturation des clubs",
  kpis: [
    "Fréquentation par club, jour, créneau et type d'abonnement",
    "Taux de remplissage des cours, no-show et pression liste d'attente",
    "Occupation des zones cardio, musculation ou studios sur les créneaux critiques",
    "Disponibilité coach par spécialité, shift et niveau d'encadrement requis",
    "Risque de sous-couverture sur l'accueil, les cours collectifs ou le coaching premium",
    "Volume d'essais, conversions en abonnement et pression commerciale locale",
    "Risque de churn, baisse d'engagement ou décrochage membre par club ou segment",
    "Revenu mensuel récurrent protégé, panier additionnel et marge club selon la capacité retenue",
    "Impact attendu d'un ajustement d'horaires, de cours ou d'offre sur la rétention et l'expérience",
  ],
  decisionKicker: "Décisions optimisables",
  decisionTitle:
    "Les arbitrages fitness que Praedixa peut aider à trancher plus tôt",
  decisions: [
    "Ouvrir, fermer ou redimensionner des cours collectifs selon la demande réellement projetée",
    "Affecter les coachs et équipes accueil sur les clubs, shifts et créneaux les plus exposés",
    "Limiter ou relancer les essais et campagnes locales quand la capacité club se tend",
    "Choisir entre renfort coach, polyvalence interne, cours virtuel ou ajustement d'horaire",
    "Protéger en priorité les clubs ou segments membres à plus fort risque de churn",
    "Décider quels services premium, sessions de coaching ou événements maintenir pendant les pics",
    "Ajuster les amplitudes d'ouverture ou les règles de réservation pour lisser la fréquentation",
    "Déclencher plus tôt une action rétention, satisfaction ou recontact sur les membres fragiles",
  ],
  ctaTitle: "Voir comment Praedixa sécuriserait vos clubs les plus tendus.",
  ctaBody:
    "On part des check-ins, des cours, du staffing et du churn pour montrer où la capacité va casser et quelle décision protège le mieux expérience membre, rétention et revenu récurrent.",
  homepageHook:
    "Optimisez le remplissage club et améliorez la rétention membre.",
  homepageStat:
    "11 % de pratique en structures commerciales, 39,1 % d'équipements urbains en salles de sport, 25 240 recrutements projetés.",
  homepageProblem:
    "Le vrai enjeu fitness: absorber les pics de fréquentation sans dégrader l'encadrement, l'expérience membre et la rétention.",
  sourceLinks: [
    ...praedixaMethodSources.fr,
    {
      label:
        "INJEP — Les pratiques sportives en France en 2024 avant les Jeux de Paris",
      url: "https://injep.fr/publication/les-pratiques-sportives-en-france-en-2024-avant-les-jeux-de-paris/",
    },
    {
      label:
        "Insee Première 2041 — Équipements sportifs en ville et en milieu rural",
      url: "https://www.insee.fr/fr/statistiques/8376522",
    },
    {
      label: "France Travail — BMO 2025, sportifs et animateurs sportifs",
      url: "https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2024&ss=1",
    },
  ],
};

export const fitnessSectorPageEn: SectorPageEntry = {
  id: "fitness",
  icon: FitnessClubIcon,
  groupLabel: "Fitness",
  slug: sectorRoutes.en.slugs.fitness,
  shortLabel: "Fitness",
  brandLabel: "Praedixa Fitness",
  title: "Fitness",
  metaTitle:
    "Praedixa | Fitness: arbitrate club occupancy, coaching, and retention before capacity saturates",
  metaDescription:
    "Check-ins, classes, coach schedules, memberships, and churn. Praedixa helps fitness club networks anticipate demand, compare capacity and retention trade-offs, and review impact club by club.",
  heroKicker: "Fitness vertical",
  heroTitle:
    "Arbitrate club occupancy, coaching, and retention before capacity saturates.",
  heroSubtitle:
    "Check-ins, class bookings, coach schedules, trials, memberships, churn, and service quality already sit in your tools. Praedixa connects them so club volatility turns into clearer decisions on capacity, programming, staffing, and member retention.",
  proofKicker: "Why now",
  proofTitle:
    "Fitness networks must absorb short, intense demand peaks while protecting member experience and retention.",
  proofIntro:
    "The challenge is not just opening more classes. Teams need to decide earlier where to reinforce coaching, smooth occupancy, adjust commercial pressure, or protect at-risk members before experience starts slipping.",
  proofs: [
    {
      value: "11%",
      label:
        "of sports participants say they use commercial structures such as fitness centers in 2024",
      detail:
        "That channel grew by two points year over year in the national barometer.",
      sourceLabel:
        "INJEP — Sports participation in France in 2024 before the Paris Games",
      sourceUrl:
        "https://injep.fr/publication/les-pratiques-sportives-en-france-en-2024-avant-les-jeux-de-paris/",
    },
    {
      value: "39.1%",
      label:
        "of sports equipment types in major urban centers are sports halls in 2023",
      detail:
        "Insee includes specialized halls, fitness centers, and multisport gyms in that group.",
      sourceLabel:
        "Insee Première 2041 — Sports facilities in cities and rural areas",
      sourceUrl: "https://www.insee.fr/fr/statistiques/8376522",
    },
    {
      value: "25,240",
      label:
        "planned hires for sports professionals and sports instructors in 2025",
      detail: "55.0% are considered difficult and 56.4% seasonal.",
      sourceLabel:
        "France Travail — 2025 labor needs survey, sports professionals and instructors",
      sourceUrl:
        "https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2024&ss=1",
    },
  ],
  challengeKicker: "The business question",
  challengeTitle:
    "How do you absorb peak attendance and coaching demand without letting member experience or retention slip?",
  challengeBody:
    "In fitness, under-covering peak hours damages the club experience immediately. Over-covering hurts site margin just as fast. Teams need to arbitrate earlier between capacity, programming, staffing, and churn risk, not just add classes at the last minute.",
  challenges: [
    {
      title: "Highly concentrated peaks",
      body: "Before-work, after-work, class-driven, and enrollment peaks create intense pressure on a handful of time slots.",
    },
    {
      title: "Capacity and coaching move together",
      body: "When a coach is missing or a class is overbooked, the problem is not just staffing. It affects sentiment, engagement, and member retention.",
    },
    {
      title: "Acquisition versus retention",
      body: "Pushing trials, offers, or campaigns at the wrong moment can saturate a club that is already tight and degrade the experience of current members.",
    },
  ],
  valuePropKicker: "Value proposition",
  valuePropTitle:
    "Praedixa helps fitness networks arbitrate capacity, programming, coaching, and retention on one decision surface.",
  valuePropBody:
    "Praedixa brings attendance, bookings, staffing, memberships, and churn into one operating view, projects short-horizon saturation points, and compares the trade-offs between coach reinforcement, class changes, commercial pressure, capacity limits, and retention action. Teams start from a defensible first move, club by club.",
  loopKicker: "Praedixa loop",
  loopTitle:
    "A decision loop built for club attendance, coaching, engagement, and retention.",
  loopIntro:
    "The product logic stays the same, but the language becomes fitness-native: attendance, fill rates, coaching quality, churn, and protected recurring revenue.",
  loopSteps: [
    {
      title: "Bring the data together",
      body: "Check-ins, bookings, coach schedules, trials, CRM, churn, memberships, and local campaigns are aligned into one view.",
    },
    {
      title: "Project attendance and useful capacity",
      body: "Praedixa estimates peak occupancy, class fill rates, coach availability, and the slots where the member experience is about to tighten.",
    },
    {
      title: "Calculate the best decision",
      body: "The platform compares coach reinforcement, class changes, trial throttling, capacity limits, and targeted retention action.",
    },
    {
      title: "Trigger the first action",
      body: "Network and club managers start from a recommended action prioritized by expected impact on experience, retention, and margin.",
    },
    {
      title: "Prove ROI",
      body: "Praedixa tracks attendance, fill rates, churn avoided, protected recurring revenue, and coverage cost by club.",
    },
  ],
  kpiKicker: "Predictable KPIs",
  kpiTitle:
    "The fitness signals Praedixa can forecast before clubs start to saturate",
  kpis: [
    "Attendance by club, day, time slot, and membership type",
    "Class fill rate, no-show risk, and waiting-list pressure",
    "Occupancy of cardio, strength, or studio zones on critical slots",
    "Coach availability by specialty, shift, and required supervision level",
    "Under-coverage risk across reception, group classes, or premium coaching",
    "Trial volume, membership conversion, and local commercial pressure",
    "Churn risk, engagement decline, or member drop-off by club or segment",
    "Protected monthly recurring revenue, ancillary spend, and club margin by capacity scenario",
    "Expected impact of schedule, class, or offer changes on retention and experience",
  ],
  decisionKicker: "Optimizable decisions",
  decisionTitle:
    "The fitness trade-offs Praedixa can help teams arbitrate earlier",
  decisions: [
    "Open, close, or resize group classes based on projected demand",
    "Assign coaches and front-desk teams to the clubs, shifts, and slots under the most pressure",
    "Throttle or relaunch trials and local campaigns when club capacity tightens",
    "Choose between coach reinforcement, internal multi-skilling, virtual classes, or schedule changes",
    "Protect first the clubs or member segments with the highest churn risk",
    "Decide which premium services, coaching sessions, or events to keep live during peak periods",
    "Adjust opening hours or booking rules to smooth attendance",
    "Trigger earlier retention, satisfaction, or recontact action on fragile members",
  ],
  ctaTitle: "See how Praedixa would protect your most exposed clubs.",
  ctaBody:
    "We start from check-ins, classes, staffing, and churn to show where capacity is likely to break and which decision best protects experience, retention, and recurring revenue.",
  homepageHook: "Optimize club occupancy and improve member retention.",
  homepageStat:
    "11% use commercial fitness structures, 39.1% urban sports halls, 25,240 planned hires.",
  homepageProblem:
    "The fitness challenge: absorb attendance peaks without degrading coaching quality, member experience, and retention.",
  sourceLinks: [
    ...praedixaMethodSources.en,
    {
      label:
        "INJEP — Sports participation in France in 2024 before the Paris Games",
      url: "https://injep.fr/publication/les-pratiques-sportives-en-france-en-2024-avant-les-jeux-de-paris/",
    },
    {
      label:
        "Insee Première 2041 — Sports facilities in cities and rural areas",
      url: "https://www.insee.fr/fr/statistiques/8376522",
    },
    {
      label:
        "France Travail — 2025 labor needs survey, sports professionals and instructors",
      url: "https://statistiques.francetravail.org/bmo/bmo?le=0&pp=2024&ss=1",
    },
  ],
};
