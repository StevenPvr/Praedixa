import type { Dictionary } from "../types";
import { enCoreOperations } from "./en-core-operations";
import { enCoreConversion } from "./en-core-conversion";

export const enGrowth: Pick<
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
    kicker: "Security & IT",
    heading:
      "A light deployment path that still stands up to serious IT review.",
    subheading:
      "Praedixa starts in read-only mode on your exports, APIs, and existing tools. The goal is to make a first trade-off usable before anyone opens a heavy integration project.",
    tiles: [
      {
        title: "Connect to what already exists",
        description:
          "The first scope sits on top of the current stack so teams can frame the decision before touching deeper workflows.",
      },
      {
        title: "Aggregated data",
        description:
          "The initial scope works at site, team, or activity level rather than at individual level.",
      },
      {
        title: "CSV / Excel exports or APIs",
        description:
          "Praedixa starts from what you already have instead of requiring a tool replacement or process rewrite to prove value.",
      },
      {
        title: "Clear security posture",
        description:
          "Encryption, access control, and activity logs are designed to support a serious IT conversation without unnecessary complexity.",
      },
      {
        title: "Hosted in France",
        description:
          "The platform and operational data are hosted in France on Scaleway.",
      },
      {
        title: "Progressive rollout",
        description:
          "Integration only expands when the business value is already visible and the operating context justifies it.",
      },
    ],
    compatibility: {
      title: "Compatible with your existing stack",
      description:
        "Praedixa sits above the current stack to structure the decision, not to replace the tools your teams already use.",
      tools: ["Scheduling", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "Integration should reassure IT and data teams, not dominate the commercial conversation before business value is visible.",
  },
  pilot: enCoreOperations.pilot as Dictionary["pilot"],
  faq: enCoreConversion.faq as Dictionary["faq"],
  contact: enCoreConversion.contact as Dictionary["contact"],
  servicesPage: enCoreConversion.servicesPage as Dictionary["servicesPage"],
  footer: enCoreConversion.footer as Dictionary["footer"],
  stickyCta: enCoreConversion.stickyCta as Dictionary["stickyCta"],
  form: enCoreConversion.form as Dictionary["form"],
};
