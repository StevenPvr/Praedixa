import type { Dictionary } from "../types";
import { frCoreOperations } from "./fr-core-operations";
import { frCoreConversion } from "./fr-core-conversion";

export const frGrowth: Pick<
  Dictionary,
  | "security"
  | "pilot"
  | "faq"
  | "contact"
  | "servicesPage"
  | "footer"
  | "stickyCta"
  | "form"
> = {
  security: {
    kicker: "Sécurité & IT",
    heading:
      "Déploiement sobre au départ, compatible avec une revue IT sérieuse.",
    subheading:
      "Praedixa commence en lecture seule sur vos exports, API ou outils existants. L’objectif est de rendre un premier arbitrage exploitable avant d’ouvrir un chantier SI plus large.",
    tiles: [
      {
        title: "Connexion à l’existant",
        description:
          "Le premier périmètre se branche sur les outils déjà en place pour cadrer les arbitrages sans imposer de remplacement.",
      },
      {
        title: "Données agrégées",
        description:
          "Le démarrage présenté ici travaille au niveau site, équipe ou activité, pas au niveau individuel.",
      },
      {
        title: "Exports CSV / Excel ou API",
        description:
          "Praedixa démarre sur ce que vous avez déjà, sans refonte de process pour obtenir une première lecture utile.",
      },
      {
        title: "Cadre de sécurité clair",
        description:
          "Chiffrement, contrôle d’accès et journalisation sont pensés pour entrer dans une discussion IT sérieuse sans lourdeur inutile.",
      },
      {
        title: "Hébergement France",
        description:
          "La plateforme et les données sont hébergées en France sur Scaleway.",
      },
      {
        title: "Montée en charge progressive",
        description:
          "L’intégration s’élargit seulement quand la valeur business est prouvée et que le contexte le justifie.",
      },
    ],
    compatibility: {
      title: "Compatible avec votre stack actuelle",
      description:
        "Praedixa se branche au-dessus de l’existant pour structurer la décision, pas pour imposer un remplacement.",
      tools: ["Planning", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "L’intégration doit rassurer la revue IT, pas monopoliser la conversation avant que la valeur business soit démontrée.",
  },
  pilot: frCoreOperations.pilot as Dictionary["pilot"],
  faq: frCoreConversion.faq as Dictionary["faq"],
  contact: frCoreConversion.contact as Dictionary["contact"],
  servicesPage: frCoreConversion.servicesPage as Dictionary["servicesPage"],
  footer: frCoreConversion.footer as Dictionary["footer"],
  stickyCta: frCoreConversion.stickyCta as Dictionary["stickyCta"],
  form: frCoreConversion.form as Dictionary["form"],
};
