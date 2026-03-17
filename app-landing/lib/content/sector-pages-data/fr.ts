import type { SectorPageEntry } from "./types";
import {
  CampusLineIcon,
  CarServiceIcon,
  FlowNetworkIcon,
  StorefrontLineIcon,
} from "../../../components/shared/icons/MarketingIcons";
import { fitnessSectorPageFr } from "./fitness";
import { praedixaMethodSources } from "./shared";
import { sectorRoutes } from "./routes";

export const sectorPagesFr: readonly SectorPageEntry[] = [
  {
    id: "hcr",
    icon: StorefrontLineIcon,
    groupLabel: "HCR",
    slug: sectorRoutes.fr.slugs.hcr,
    shortLabel: "HCR",
    brandLabel: "Praedixa HCR",
    title: "HCR",
    metaTitle:
      "Praedixa | HCR: arbitrer demande, couverture et service avant que la marge ne glisse",
    metaDescription:
      "Pour l'hôtellerie-restauration, Praedixa relie les systèmes utiles, anticipe la demande, compare les arbitrages de couverture et de service, puis suit l'impact sur la marge.",
    heroKicker: "Verticale HCR",
    heroTitle:
      "Arbitrer demande, couverture et niveau de service avant que la marge ne glisse.",
    heroSubtitle:
      "Réservations, PMS, POS, plannings, absences et coûts vivent déjà dans vos outils. Praedixa les relie pour transformer la volatilité HCR en décisions plus propres sur couverture, amplitude, promesse de service et marge site par site.",
    proofKicker: "Pourquoi maintenant",
    proofTitle:
      "Le HCR combine saisonnalité forte, demande instable et équipes déjà sous tension.",
    proofIntro:
      "Le sujet n'est pas seulement de faire un planning. Le vrai enjeu est de tenir le bon niveau de service malgré des pics rapides, sans laisser filer extras, intérim et heures supplémentaires.",
    proofs: [
      {
        value: "336 850",
        label: "projets de recrutement en hébergement-restauration en 2025",
        detail: "50,2 % sont jugés difficiles à pourvoir.",
        sourceLabel: "France Travail — BMO 2025 hébergement-restauration",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        value: "56,5 %",
        label: "des recrutements du secteur sont saisonniers",
        detail: "La capacité humaine varie moins vite que l'activité réelle.",
        sourceLabel: "France Travail — BMO 2025 hébergement-restauration",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        value: "107 810",
        label: "recrutements de serveurs projetés",
        detail: "49,6 % de difficultés de recrutement sur ce métier clé.",
        sourceLabel: "France Travail — BMO 2025 métiers serveurs",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
    ],
    challengeKicker: "La vraie question business",
    challengeTitle:
      "Comment couvrir le bon niveau de service quand la demande accélère plus vite que les équipes disponibles ?",
    challengeBody:
      "En HCR, la sous-couverture dégrade immédiatement l'expérience client. La sur-couverture, elle, détruit la marge du service. Il faut donc arbitrer plus tôt entre coût, service et risque, pas seulement publier un planning de plus.",
    challenges: [
      {
        title: "Pics de charge très rapides",
        body: "Week-ends, vacances, météo, événements et réservations tardives font varier le besoin de staffing à très court horizon.",
      },
      {
        title: "Recours coûteux aux renforts",
        body: "Quand le signal arrive trop tard, les options deviennent mécaniquement plus chères: heures sup, extras, intérim ou baisse de niveau de service.",
      },
      {
        title: "Arbitrage marge vs service",
        body: "Chaque décision de couverture a un impact direct sur le temps d'attente, la qualité perçue, le ticket moyen et la marge protégée.",
      },
    ],
    valuePropKicker: "Proposition de valeur",
    valuePropTitle:
      "Praedixa transforme la volatilité HCR en décisions de service et de marge plus défendables.",
    valuePropBody:
      "Praedixa ne vend pas un outil de planning de plus. La plateforme relie demande, couverture, coûts et niveau de service, compare les arbitrages possibles et aide à lancer la première action utile sur les effectifs, l'amplitude, la promesse de service ou la rétention terrain.",
    loopKicker: "Boucle Praedixa",
    loopTitle:
      "Une boucle fermée orientée demande, couverture, service et marge.",
    loopIntro:
      "Chaque étape est formulée pour un directeur d'exploitation, un responsable réseau ou un directeur financier: voir plus tôt, arbitrer plus proprement, déclencher plus vite, prouver ce qui a rapporté.",
    loopSteps: [
      {
        title: "Réunir les données",
        body: "Réservations, PMS, POS, planning, absences, coûts et calendrier local sont remis dans une même lecture.",
      },
      {
        title: "Projeter demande et couverture utiles",
        body: "Praedixa estime à J+3, J+7 et J+14 où la demande, la couverture et le niveau de service vont se tendre par site, service et créneau critique.",
      },
      {
        title: "Calculer la décision optimale",
        body: "La plateforme chiffre les arbitrages entre heures supplémentaires, extras, intérim, réaffectation ou ajustement de service.",
      },
      {
        title: "Déclencher la première action",
        body: "Le manager part d'une première action recommandée, déjà priorisée, au lieu de repartir d'une page blanche.",
      },
      {
        title: "Prouver le ROI",
        body: "Praedixa suit la masse salariale, la couverture, les temps d'attente et la marge protégée dans un journal de décision relisible.",
      },
    ],
    kpiKicker: "KPIs prédictibles",
    kpiTitle:
      "Les signaux HCR que Praedixa peut projeter avant que le service se tende",
    kpis: [
      "Réservations, nuitées, couverts, taux d'occupation, ticket moyen et mix canal par site, jour et service",
      "Risque de no-show, d'annulation tardive ou de pression groupes/événements par créneau",
      "Heures de travail requises par rôle, shift et plage horaire critique",
      "Taux de couverture des shifts critiques en salle, cuisine, réception et housekeeping",
      "Risque d'absentéisme ou de sous-couverture par équipe et type de contrat",
      "Volume d'heures supplémentaires, extras et intérim à court horizon",
      "Temps d'attente, rotation, niveau de service et risque d'avis dégradés",
      "Revenu par heure travaillée, RevPAR et marge protégée selon la couverture retenue",
      "Risque de turnover terrain ou d'attrition saisonnière sur les sites les plus tendus",
    ],
    decisionKicker: "Décisions optimisables",
    decisionTitle:
      "Les arbitrages HCR que Praedixa peut aider à trancher plus tôt",
    decisions: [
      "Combien de serveurs, cuisiniers, receptionnistes ou agents housekeeping planifier par shift",
      "Quels groupes, services, terrasses ou amplitudes accepter, limiter ou redimensionner quand la capacité se tend",
      "Quand lancer les recrutements saisonniers et sur quels métiers prioritaires",
      "Quand ouvrir, fermer ou réduire une salle, un étage, un service ou une amplitude horaire",
      "Quand recourir aux extras ou à l'intérim vs mobiliser la polyvalence interne",
      "Quels sites prioriser pour formation croisée, rétention ou renfort ponctuel",
      "Quand ajuster la promesse de service ou la pression commerciale pour protéger la marge",
      "Quels établissements ont besoin d'un arbitrage logement, transport ou fidélisation pour tenir la saison",
    ],
    ctaTitle:
      "Voir ce que Praedixa ferait sur vos services les plus sensibles.",
    ctaBody:
      "On part de vos données existantes, on remonte les signaux à court horizon et on montre où la demande, la couverture ou la promesse de service dégradent trop vite la marge.",
    homepageHook:
      "Arbitrez demande, couverture et service avant que la marge ne glisse.",
    homepageStat:
      "336 850 projets de recrutement, 50,2 % difficiles, 56,5 % saisonniers.",
    homepageProblem:
      "Le vrai enjeu HCR: tenir le niveau de service sans subir trop tard la demande, les renforts et la marge.",
    sourceLinks: [
      ...praedixaMethodSources.fr,
      {
        label: "France Travail — BMO 2025 hébergement-restauration",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        label: "Insee — emploi salarié HCR T1 2025",
        url: "https://www.bnsp.insee.fr/ark%3A/12148/bc6p09p7qj4.pdf",
      },
      {
        label: "Insee Focus 363 — fréquentation touristique été 2025",
        url: "https://www.insee.fr/fr/statistiques/8645986",
      },
    ],
  },
  {
    id: "higher-education",
    icon: CampusLineIcon,
    groupLabel: "Enseignement supérieur",
    slug: sectorRoutes.fr.slugs["higher-education"],
    shortLabel: "Enseignement supérieur",
    brandLabel: "Praedixa Éducation",
    title: "Enseignement supérieur",
    metaTitle:
      "Praedixa | Enseignement supérieur: sécuriser admissions, examens et continuité campus sans laisser dériver budget et couverture",
    metaDescription:
      "Admissions, scolarité, examens, services campus, vacations, absences et budget: Praedixa aide l'enseignement supérieur à anticiper la charge, arbitrer capacité et continuité de service, puis prouver l'impact.",
    heroKicker: "Verticale enseignement supérieur",
    heroTitle:
      "Sécuriser admissions, examens et continuité campus sans laisser dériver budget et couverture.",
    heroSubtitle:
      "Admissions, scolarité, examens, services campus, vacations, contractuels, permanents et absences: Praedixa transforme les pics calendaires en décisions plus lisibles sur capacité, budget, service étudiant et priorités académiques.",
    proofKicker: "Pourquoi maintenant",
    proofTitle:
      "Les établissements doivent absorber des pics massifs, mais avec une capacité humaine fragmentée et déjà sous tension.",
    proofIntro:
      "Le sujet n'est pas de mieux remplir des plannings. Le sujet est de prévoir la charge, arbitrer les ressources rares et sécuriser la continuité de service étudiant sur les moments qui comptent.",
    proofs: [
      {
        value: "3,04 M",
        label: "d'étudiants dans l'enseignement supérieur en 2024-2025",
        detail: "Dont 1 631 500 à l'université.",
        sourceLabel: "Ministère ESR — effectifs étudiants 2024-2025",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/les-effectifs-etudiants-dans-l-enseignement-superieur-en-2024-2025-100596",
      },
      {
        value: "945 500",
        label: "candidats Parcoursup en 2024",
        detail:
          "24 000 formations et 4,2 millions de propositions, dont 2,4 millions dès le premier jour.",
        sourceLabel: "Ministère ESR — bilan Parcoursup 2024",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-parcoursup-2024-des-ameliorations-concretes-qui-repondent-aux-attentes-des-lyceens-97543",
      },
      {
        value: "21 080",
        label: "enseignants contractuels dans le supérieur public en 2024",
        detail: "Ils représentent 25 % des enseignants hors vacataires.",
        sourceLabel: "Ministère ESR — enseignants contractuels 2024",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/les-enseignants-contractuels-affectes-dans-l-enseignement-superieur-annee-2024-100753",
      },
    ],
    challengeKicker: "La vraie question business",
    challengeTitle:
      "Comment absorber les pics de rentrée, d'admissions et d'examens sans dégrader continuité de service ni budget ?",
    challengeBody:
      "Entre permanents, contractuels, vacataires et équipes support, la couverture des pics n'est jamais seulement une question d'emploi du temps. C'est un arbitrage entre continuité de service, budget, charge humaine et qualité de l'expérience étudiante.",
    challenges: [
      {
        title: "Pics récurrents mais violents",
        body: "Rentrée, inscriptions, examens, admissions et accueil font monter la charge à des moments prévisibles, mais très concentrés.",
      },
      {
        title: "Ressources hétérogènes",
        body: "La capacité repose sur un mix entre permanents, contractuels, vacations et services support, avec des règles d'allocation différentes.",
      },
      {
        title: "Dérive des coûts de couverture",
        body: "Quand les signaux sont tardifs, les heures complémentaires, vacations et réaffectations s'accumulent sans visibilité consolidée.",
      },
    ],
    valuePropKicker: "Proposition de valeur",
    valuePropTitle:
      "Praedixa structure une lecture commune admissions x scolarité x RH x budget.",
    valuePropBody:
      "Praedixa réunit les données académiques, opérationnelles et budgétaires pour rendre visibles les besoins humains sur les pics de charge. La plateforme compare les arbitrages possibles, aide à déclencher la première action utile et mesure ce qui a réellement amélioré la couverture, le service étudiant et la continuité campus.",
    loopKicker: "Boucle Praedixa",
    loopTitle:
      "Une boucle de décision pensée pour charge, capacité et continuité campus.",
    loopIntro:
      "Praedixa garde la même logique partout, mais la traduit en langage campus: admissions, scolarité, examens, services étudiants, vacations et coûts de couverture.",
    loopSteps: [
      {
        title: "Réunir les données",
        body: "Admissions, scolarité, emplois du temps, examens, services campus, absences et masse salariale sont remis dans une lecture partagée.",
      },
      {
        title: "Projeter charge et capacité campus",
        body: "Praedixa projette la pression sur admissions, scolarité, examens et services étudiants, ainsi que la capacité réellement mobilisable.",
      },
      {
        title: "Calculer la décision optimale",
        body: "La plateforme compare heures complémentaires, vacations, réaffectations, priorisation de service et couverture minimale acceptable.",
      },
      {
        title: "Déclencher la première action",
        body: "Les responsables démarrent à partir d'une première action recommandée, documentée et relisible en gouvernance.",
      },
      {
        title: "Prouver le ROI",
        body: "Praedixa suit coût de couverture, délai de traitement, continuité de service et stabilité opérationnelle sur les périodes critiques.",
      },
    ],
    kpiKicker: "KPIs prédictibles",
    kpiTitle:
      "Les indicateurs campus que Praedixa peut projeter avant les pics de charge",
    kpis: [
      "Candidatures par place et pression d'admission par formation ou campus",
      "Taux de yield admis vers inscrits, désistements et prévision d'inscrits par programme",
      "Taux de remplissage des groupes, amphis, TD, TP et capacités critiques",
      "Heures d'enseignement requises vs heures affectées par discipline",
      "Part de couverture assurée par titulaires, contractuels et vacataires",
      "Risque de sous-effectif enseignant ou support sur les périodes de rentrée, d'admissions et d'examens",
      "Délai de traitement admissions, scolarité et services étudiants à court horizon",
      "Taux de convocation, surveillance d'examens et saturation des salles ou laboratoires critiques",
      "Coût de couverture via vacations, heures complémentaires et réaffectations",
    ],
    decisionKicker: "Décisions optimisables",
    decisionTitle:
      "Les arbitrages d'enseignement supérieur que Praedixa peut rendre plus défendables",
    decisions: [
      "Ouvrir, fermer ou redimensionner des groupes, sections, parcours ou créneaux",
      "Ajuster les capacités d'accueil et la profondeur des listes d'attente",
      "Déployer plus tôt jurys, entretiens, surveillance d'examens ou renforts scolarité sur les points de saturation",
      "Allouer les charges d'enseignement entre départements, statuts et campus",
      "Déclencher plus tôt des recrutements contractuels ou des remplacements ciblés",
      "Prioriser les disciplines à sécuriser avant les vagues de départs en retraite",
      "Répartir salles, laboratoires et créneaux selon la charge réellement projetée",
      "Arbitrer budget entre recrutement, vacations, mutualisation, hybridation et continuité de service étudiant",
      "Réallouer les équipes support étudiantes pendant les pics d'inscription et d'examens",
    ],
    ctaTitle:
      "Cadrer vos prochains pics campus sur une base de décision commune.",
    ctaBody:
      "Praedixa montre où la charge va monter, quelles ressources sont réellement mobilisables et quel arbitrage protège le mieux budget, continuité de service et qualité étudiante.",
    homepageHook:
      "Sécurisez admissions, examens et continuité campus sans laisser dériver budget et couverture.",
    homepageStat:
      "3,04 M d'étudiants, 945 500 candidats Parcoursup, 21 080 enseignants contractuels.",
    homepageProblem:
      "Le vrai enjeu campus: absorber les pics de charge avec une capacité fragmentée et un budget contraint.",
    sourceLinks: [
      ...praedixaMethodSources.fr,
      {
        label: "Ministère ESR — effectifs étudiants 2024-2025",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-effectifs-etudiants-dans-l-enseignement-superieur-en-2024-2025-100596",
      },
      {
        label: "Ministère ESR — bilan Parcoursup 2024",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-parcoursup-2024-des-ameliorations-concretes-qui-repondent-aux-attentes-des-lyceens-97543",
      },
      {
        label: "Ministère ESR — enseignants contractuels 2024",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-enseignants-contractuels-affectes-dans-l-enseignement-superieur-annee-2024-100753",
      },
      {
        label: "Ministère ESR — départs en retraite 2024-2035",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-departs-en-retraite-des-enseignants-chercheurs-et-des-professeurs-du-second-degre-affectes-dans-100652",
      },
      {
        label: "Ministère ESR — bilan recrutement 2025 enseignants-chercheurs",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-provisoire-de-recrutement-des-enseignants-chercheurs-et-des-enseignants-du-second-degre-100656",
      },
    ],
  },
  {
    id: "logistics-transport-retail",
    icon: FlowNetworkIcon,
    groupLabel: "Logistique / Transport / Retail",
    slug: sectorRoutes.fr.slugs["logistics-transport-retail"],
    shortLabel: "Logistique / Transport / Retail",
    brandLabel: "Praedixa Opération",
    title: "Logistique / Transport / Retail",
    metaTitle:
      "Praedixa | Logistique, transport, retail: arbitrer demande, capacité et promesse client au rythme réel du réseau",
    metaDescription:
      "Commandes, WMS, TMS, OMS, promos, stock, plannings et coûts: Praedixa aide les réseaux logistique, transport et retail à anticiper la demande, arbitrer capacité, stock et service, puis prouver le ROI site par site.",
    heroKicker: "Verticale logistique / transport / retail",
    heroTitle:
      "Arbitrer demande, capacité et promesse client au rythme réel du réseau.",
    heroSubtitle:
      "Commandes, WMS, TMS, OMS, calendrier promo, stock, plannings, absences, performance site et coûts. Praedixa transforme la variabilité quotidienne des volumes en décisions plus rapides sur couverture, flux, niveau de service et marge.",
    proofKicker: "Pourquoi maintenant",
    proofTitle:
      "Les volumes bougent plus vite que les effectifs disponibles, alors que chaque décision de couverture pèse directement sur le service.",
    proofIntro:
      "En logistique, transport et retail, le sujet n'est pas seulement de remplir des équipes. Il faut choisir chaque jour entre coût, disponibilité, productivité, promesse client et risque opérationnel.",
    proofs: [
      {
        value: "175,3 Md€",
        label: "de ventes e-commerce en France en 2024",
        detail: "2,6 milliards de transactions sur l'année.",
        sourceLabel: "FEVAD — bilan e-commerce 2024",
        sourceUrl:
          "https://www.fevad.com/bilan-du-e-commerce-en-france-en-2024-les-ventes-sur-internet-franchissent-le-cap-des-175-milliards-deuros-en-hausse-de-96-sur-un-an/",
      },
      {
        value: "183 760",
        label: "projets de recrutement dans le commerce de détail en 2025",
        detail: "37,4 % sont jugés difficiles et 33,4 % saisonniers.",
        sourceLabel: "France Travail — BMO 2025 commerce de détail",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GC&le=0&pp=2025&ss=1",
      },
      {
        value: "90 380",
        label: "projets de recrutement transports-entreposage",
        detail: "47,5 % sont jugés difficiles à couvrir.",
        sourceLabel: "France Travail — BMO 2025 transport et entreposage",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=HZ&le=0&pp=2025&ss=1",
      },
    ],
    challengeKicker: "La vraie question business",
    challengeTitle:
      "Comment tenir la promesse client quand volumes, capacité et disponibilité produit bougent plus vite que le réseau ?",
    challengeBody:
      "Dans ces réseaux, chaque arbitrage de couverture a un double effet: il touche le coût aujourd'hui et le service livré demain. Sans lecture commune, on choisit trop tard entre heures sup, intérim, réaffectation, report de charge ou ajustement du niveau de service.",
    challenges: [
      {
        title: "Volatilité des volumes",
        body: "Commandes, promos, retours, tournées, événements locaux et calendrier commercial font varier la charge plus vite que les organisations ne peuvent l'absorber.",
      },
      {
        title: "Décisions multi-sites sous contrainte",
        body: "Il faut arbitrer entre surcharge locale, réaffectation inter-sites, renfort externe ou baisse temporaire de promesse client.",
      },
      {
        title: "Service et coût se répondent",
        body: "Sous-couvrir crée retards, pénalités, ventes perdues et saturation. Sur-couvrir dégrade immédiatement la productivité et la marge.",
      },
    ],
    valuePropKicker: "Proposition de valeur",
    valuePropTitle:
      "Praedixa aide à arbitrer plus tôt entre capacité, stock, promesse et marge.",
    valuePropBody:
      "Praedixa réunit commandes, exécution, staffing, disponibilité et coûts dans une même lecture, anticipe les besoins à court terme et chiffre les arbitrages entre renfort, réallocation, couverture stock, ajustement de promesse et protection de marge. Vous partez d'une première action recommandée, pas d'une discussion abstraite.",
    loopKicker: "Boucle Praedixa",
    loopTitle:
      "Une boucle pensée pour les réseaux où demande, capacité et service bougent tous les jours.",
    loopIntro:
      "Praedixa garde la même logique produit, mais la traduit ici en flux, charge, promesse de service, capacité et coût site par site.",
    loopSteps: [
      {
        title: "Réunir les données",
        body: "Commandes, WMS, TMS, OMS, planning, absences, promos, performance site et coûts sont alignés dans une fédération gouvernée.",
      },
      {
        title: "Projeter charge, capacité et disponibilité",
        body: "Praedixa projette à court horizon les volumes, la capacité disponible et les points où stock, flux ou promesse client vont se tendre.",
      },
      {
        title: "Calculer la décision optimale",
        body: "La plateforme compare heures supplémentaires, intérim, réaffectation inter-sites, report de charge ou ajustement du niveau de service.",
      },
      {
        title: "Déclencher la première action",
        body: "Le responsable réseau ou le manager de site démarre avec une action priorisée et une justification chiffrée.",
      },
      {
        title: "Prouver le ROI",
        body: "Praedixa suit le coût, la couverture, la productivité, le respect SLA/OTIF et la marge protégée site par site, réseau par réseau.",
      },
    ],
    kpiKicker: "KPIs prédictibles",
    kpiTitle:
      "Les indicateurs réseau que Praedixa peut projeter avant la casse opérationnelle",
    kpis: [
      "Charge par site, jour, heure, canal et activité: commandes, lignes, palettes, tournées, passages caisse ou SKU critiques",
      "Couverture de stock, risque de rupture et disponibilité produit par site, canal ou famille",
      "Saturation des quais, tournées, créneaux transporteurs ou cut-offs critiques",
      "Heures de travail requises par activité, shift et site critique",
      "Taux de sous-effectif ou de sur-effectif par site et par créneau",
      "Risque de retard OTIF, SLA, délai de livraison ou rupture de promesse client",
      "Volume d'heures supplémentaires, intérim, absentéisme et no-show à court horizon",
      "Productivité préparation, exploitation, mise en rayon ou tournée selon la couverture retenue",
      "Backlog, congestion locale et pénalités ou ventes perdues évitées",
      "Coût opérationnel et marge protégée site par site",
    ],
    decisionKicker: "Décisions optimisables",
    decisionTitle:
      "Les arbitrages logistique / transport / retail que Praedixa peut optimiser",
    decisions: [
      "Transférer du stock, du volume ou des commandes entre entrepôts, magasins ou zones de préparation",
      "Accélérer, décaler ou lisser le réapprovisionnement, les réceptions ou les créneaux transporteurs",
      "Réallouer charge, équipes ou volume entre sites, entrepôts, magasins ou tournées",
      "Choisir entre heures supplémentaires, intérim, sous-traitance ou report de charge",
      "Ouvrir un shift additionnel, réduire une amplitude ou ajuster un cut-off opérationnel",
      "Prioriser commandes, tournées, magasins, promotions ou SKU quand la capacité se tend",
      "Ajuster le niveau de service promis selon la couverture réellement disponible",
      "Décider quels sites protéger en priorité pendant un pic promo ou un aléa réseau",
      "Déclencher un renfort transport, un arbitrage inter-sites ou un plan de délestage",
    ],
    ctaTitle:
      "Voir comment Praedixa arbitre un réseau multi-sites sous variabilité.",
    ctaBody:
      "On part des volumes, de la capacité, du stock et des coûts pour identifier où agir d'abord, avec quel levier et quel ROI attendre sur chaque site.",
    homepageHook:
      "Arbitrez demande, capacité et promesse client au rythme réel du réseau.",
    homepageStat:
      "175,3 Md€ e-commerce, 183 760 recrutements retail, 90 380 en transport-entreposage.",
    homepageProblem:
      "Le vrai enjeu réseau: décider vite entre coût, disponibilité, stock, productivité et niveau de service.",
    sourceLinks: [
      ...praedixaMethodSources.fr,
      {
        label: "FEVAD — bilan e-commerce 2024",
        url: "https://www.fevad.com/bilan-du-e-commerce-en-france-en-2024-les-ventes-sur-internet-franchissent-le-cap-des-175-milliards-deuros-en-hausse-de-96-sur-un-an/",
      },
      {
        label: "France Travail — BMO 2025 commerce de détail",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=GC&le=0&pp=2025&ss=1",
      },
      {
        label: "France Travail — BMO 2025 transport et entreposage",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=HZ&le=0&pp=2025&ss=1",
      },
      {
        label: "Praedixa — WFM logistique",
        url: "https://www.praedixa.com/fr/ressources/wfm-logistique",
      },
    ],
  },
  {
    id: "automotive",
    icon: CarServiceIcon,
    groupLabel: "Automobile / concessions / ateliers",
    slug: sectorRoutes.fr.slugs.automotive,
    shortLabel: "Automobile / concessions / ateliers",
    brandLabel: "Praedixa Automobile",
    title: "Automobile / concessions / ateliers",
    metaTitle:
      "Praedixa | Automobile: arbitrer charge atelier, disponibilité pièces et compétences rares avant que les délais ne glissent",
    metaDescription:
      "DMS, rendez-vous atelier, disponibilité pièces, compétences, absences et coûts: Praedixa aide les concessions et ateliers à anticiper la charge, arbitrer capacité, pièces et revenu protégé, puis prouver l'impact.",
    heroKicker: "Verticale automobile",
    heroTitle:
      "Arbitrer charge atelier, disponibilité pièces et compétences rares avant que les délais ne glissent.",
    heroSubtitle:
      "DMS, rendez-vous atelier, historique après-vente, disponibilité pièces, compétences, absences et coûts. Praedixa transforme la charge atelier en décisions plus propres sur délai, backlog, pièces, couverture et chiffre d'affaires protégé.",
    proofKicker: "Pourquoi maintenant",
    proofTitle:
      "L'après-vente doit absorber une charge structurelle, mais avec des compétences critiques de plus en plus difficiles à couvrir.",
    proofIntro:
      "Le problème n'est pas seulement de remplir l'atelier. Il faut absorber la demande, protéger la qualité de service et tenir les délais malgré une forte tension sur les mécaniciens, carrossiers et techniciens qualifiés.",
    proofs: [
      {
        value: "33 900",
        label: "projets de recrutement commerce-réparation automobile en 2025",
        detail: "69,7 % sont jugés difficiles à pourvoir.",
        sourceLabel: "France Travail — BMO 2025 commerce-réparation automobile",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        value: "12 420",
        label: "recrutements de mécaniciens véhicules projetés",
        detail: "77,0 % de difficultés sur ce métier cœur d'atelier.",
        sourceLabel: "France Travail — BMO 2025 mécaniciens véhicules",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        value: "17 820",
        label:
          "offres restées non pourvues dans les services de l'automobile en 2024",
        detail: "La branche a réalisé près de 70 000 recrutements sur l'année.",
        sourceLabel: "ANFA — record de recrutements en 2024",
        sourceUrl:
          "https://www.anfa-auto.fr/actualites/record-de-recrutements-en-2024-pour-les-services-de-lautomobile",
      },
    ],
    challengeKicker: "La vraie question business",
    challengeTitle:
      "Comment absorber la demande après-vente quand compétences critiques et pièces disponibles deviennent le vrai goulet ?",
    challengeBody:
      "Dans l'automobile, le staffing n'est pas un simple problème de planning. C'est un problème d'heures atelier, de backlog, de compétences critiques, de disponibilité pièces et de chiffre d'affaires protégé.",
    challenges: [
      {
        title: "Compétences critiques rares",
        body: "Mécaniciens, carrossiers et techniciens qualifiés sont difficiles à recruter, alors que la charge atelier reste structurellement présente.",
      },
      {
        title: "Backlog et délais atelier",
        body: "Quand la capacité manque, les rendez-vous s'allongent, l'expérience client se dégrade et le chiffre d'affaires atelier se décale ou se perd.",
      },
      {
        title: "Arbitrages complexes",
        body: "Heures supplémentaires, réaffectation, recours externe, replanification et disponibilité pièces doivent être arbitrés ensemble, pas en silo.",
      },
    ],
    valuePropKicker: "Proposition de valeur",
    valuePropTitle:
      "Praedixa aide l'après-vente à arbitrer charge, compétences, pièces, délai et chiffre d'affaires.",
    valuePropBody:
      "Praedixa relie les données atelier, compétences, absences, pièces et coûts pour prévoir la charge, comparer les options d'action et documenter celles qui protègent le mieux délai client, absorption, disponibilité et chiffre d'affaires atelier.",
    loopKicker: "Boucle Praedixa",
    loopTitle:
      "Une boucle de décision pensée pour l'atelier, les pièces et l'après-vente.",
    loopIntro:
      "Praedixa garde la même mécanique produit, mais la traduit ici en rendez-vous, backlog, compétences, disponibilité et arbitrages économiques d'atelier.",
    loopSteps: [
      {
        title: "Réunir les données",
        body: "DMS, rendez-vous, historique après-vente, disponibilité pièces, compétences, absences et coûts sont unifiés dans une lecture atelier.",
      },
      {
        title: "Projeter charge, compétences et goulets pièces",
        body: "Praedixa projette les heures nécessaires par atelier, créneau et type de compétence critique, ainsi que les goulets pièces qui risquent d'allonger le délai.",
      },
      {
        title: "Calculer la décision optimale",
        body: "La plateforme chiffre les arbitrages entre heures supplémentaires, réaffectation, recours externe ou replanification.",
      },
      {
        title: "Déclencher la première action",
        body: "Le responsable atelier part d'une action utile immédiate, déjà priorisée et reliée à son impact attendu.",
      },
      {
        title: "Prouver le ROI",
        body: "Praedixa suit délai atelier, charge couverte, taux d'absorption, heures supplémentaires et chiffre d'affaires protégé.",
      },
    ],
    kpiKicker: "KPIs prédictibles",
    kpiTitle:
      "Les indicateurs atelier que Praedixa peut projeter avant l'allongement des délais",
    kpis: [
      "Délai de prise de rendez-vous et charge atelier ouverte par jour, baie ou type d'intervention",
      "Backlog atelier et heures nécessaires par type d'intervention",
      "Besoin d'heures par atelier, créneau et cluster de compétences critiques",
      "Taux de service pièces, risque de backorder et délai d'approvisionnement par référence critique",
      "Heures vendues vs heures produites, efficience, occupation des baies et taux d'absorption",
      "Risque de décalage lié aux pièces, au no-show, au comeback ou à l'indisponibilité d'une compétence",
      "Volume d'heures supplémentaires, recours externe et replanifications",
      "Chiffre d'affaires atelier protégé, CSI exposé et risque de churn après-vente selon la couverture retenue",
    ],
    decisionKicker: "Décisions optimisables",
    decisionTitle: "Les arbitrages atelier que Praedixa peut aider à optimiser",
    decisions: [
      "Allouer les techniciens par baie, créneau et spécialité critique",
      "Ouvrir des créneaux supplémentaires ou replanifier les rendez-vous les moins urgents",
      "Choisir entre heures supplémentaires, réaffectation, renfort externe ou sous-traitance",
      "Déplacer la charge entre ateliers ou concessions quand une équipe sature",
      "Prioriser les interventions à forte valeur ou à forte urgence client",
      "Déclencher plus tôt les approvisionnements, transferts inter-sites ou arbitrages pièces sur les goulets prévus",
      "Décider quand former, polyvalentiser ou sanctuariser certaines compétences rares",
      "Choisir quelles interventions protéger d'abord pour préserver délai client, CSI et rétention après-vente",
    ],
    ctaTitle: "Voir comment Praedixa aiderait vos ateliers les plus tendus.",
    ctaBody:
      "On part des rendez-vous, des compétences, des pièces et des coûts pour identifier où la charge risque de casser le délai client et quelle décision protège le mieux l'atelier.",
    homepageHook:
      "Arbitrez charge atelier, pièces et compétences avant que le délai client ne dérive.",
    homepageStat:
      "33 900 recrutements projetés, 69,7 % difficiles, 17 820 offres non pourvues en 2024.",
    homepageProblem:
      "Le vrai enjeu atelier: absorber la demande après-vente malgré la rareté des compétences et les goulets pièces.",
    sourceLinks: [
      ...praedixaMethodSources.fr,
      {
        label: "France Travail — BMO 2025 commerce-réparation automobile",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        label: "ANFA — record de recrutements en 2024",
        url: "https://www.anfa-auto.fr/actualites/record-de-recrutements-en-2024-pour-les-services-de-lautomobile",
      },
      {
        label: "ACEA — âge moyen du parc roulant européen",
        url: "https://www.acea.auto/figure/average-age-of-eu-vehicle-fleet-by-country/",
      },
    ],
  },
  fitnessSectorPageFr,
] as const;
