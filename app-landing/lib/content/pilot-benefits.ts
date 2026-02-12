export interface PilotColumn {
  id: string;
  title: string;
  items: string[];
}

export const pilotColumns: PilotColumn[] = [
  {
    id: "co-construction",
    title: "Ce que nous construisons ensemble",
    items: [
      "Une lecture partagée des tensions de couverture",
      "Un cadre d'arbitrage adapté à vos contraintes terrain",
      "Une gouvernance de décision reproductible",
      "Une boucle de mesure d'impact utilisable en comité",
    ],
  },
  {
    id: "avantages",
    title: "Ce que gagne la cohorte fondatrice",
    items: [
      "Accès prioritaire au produit pendant la phase pilote",
      "Accompagnement premium sur vos cas critiques",
      "Influence directe sur la roadmap opérationnelle",
      "Conditions commerciales dédiées first movers",
    ],
  },
  {
    id: "objectif",
    title: "Cadre de collaboration",
    items: [
      "Cycle court, livrables orientés décision",
      "Équipe projet réduite côté client",
      "Itérations pilotées sur des enjeux concrets",
      "Niveau d'exigence enterprise dès le départ",
    ],
  },
];

export const pilotUrgencyText =
  "Cohorte volontairement limitée à 8 entreprises pour maintenir un accompagnement fondateur très serré. Les candidatures sont qualifiées sous 24h ouvrées.";
export const pilotCtaText = "Demander une qualification pilote";
export const pilotCtaHref = "/devenir-pilote";
export const pilotMetaText =
  "Entretien de qualification: 20 min • Formulaire: 4-5 min • NDA possible";
