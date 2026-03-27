import type { SectorPageEntry } from "./types";
import {
  FlowNetworkIcon,
  StorefrontLineIcon,
} from "../../../components/shared/icons/MarketingIcons";
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
      "Anticipez les pics d\u2019activité et optimisez vos ressources.",
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
      "Optimisez vos flux et tenez votre promesse client en temps réel.",
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
] as const;
