import type { Dictionary } from "../types";

export const enCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | French DecisionOps platform",
    description:
      "Praedixa is the French DecisionOps platform: it connects to your existing systems, governs critical trade-offs, triggers the first validated action, and proves ROI decision by decision.",
    ogTitle: "Praedixa | DecisionOps for operations",
    ogDescription:
      "Praedixa connects the systems that matter to a decision, calculates cost / service / risk options, and proves ROI decision by decision.",
  },

  nav: {
    problem: "Problem",
    method: "Method",
    services: "Services",
    howItWorks: "How it works",
    useCases: "Decisions covered",
    security: "Integration & data",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "Get the free historical audit",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "French DecisionOps platform",
    headline: "DecisionOps",
    headlineHighlight: "Anticipate needs. Decide earlier. Prove ROI.",
    subtitle:
      "Praedixa connects to your existing systems, federates the critical data on France-hosted infrastructure, turns recurring operational trade-offs into governed, auditable decisions, then proves ROI decision by decision for Ops / Finance reviews. Human validation required.",
    manifestoLabel: "Our purpose",
    manifestoQuote:
      "Supporting company growth by revealing the potential of their data.",
    bullets: [
      {
        metric: "DecisionOps",
        text: "on top of your stack",
      },
      {
        metric: "Validated action",
        text: "inside existing tools",
      },
      {
        metric: "ROI proof",
        text: "decision by decision",
      },
    ],
    ctaPrimary: "Request the free historical audit",
    ctaSecondary: "See the proof protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "Ops & Finance aligned · Human validation · France-hosted infrastructure",
    trustBadges: [
      "DecisionOps on top of the existing stack",
      "Read-only federation of critical systems",
      "Governed cost / service / risk trade-offs",
      "First validated action triggered in existing tools",
      "Human validation required",
      "Decision-by-decision ROI proof",
      "Hosted in France (Scaleway)",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading: "See how the decision protocol takes shape in the interface.",
    overlayTitle: "Discover the web app",
    overlayBody: "Open a public preview (same UI, fictitious data).",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video...",
    liveBadge: "Public preview",
  },

  problem: {
    kicker: "Operational problem",
    heading: "Cost/service trade-offs happen daily — rarely with proof.",
    subheading:
      "Without a shared Ops/Finance protocol, decisions stay defensive, vary by site, and are hard to defend economically.",
    cta: "Request the free historical audit",
    ctaHint:
      "Reply within 48 business hours. Free historical audit. Ops + Finance framing from week 1.",
    states: {
      loadingTitle: "Reading operational signals",
      loadingBody:
        "We are structuring your friction points before cost/service arbitration.",
      emptyTitle: "No signal available",
      emptyBody:
        "Add operational cases to prioritize and build the arbitration log.",
      errorTitle: "Section unavailable",
      errorBody:
        "The operational problem framing cannot be displayed right now.",
    },
    pains: [
      {
        title: "Late trade-offs",
        description:
          "Useful signals arrive when room for maneuver is already limited.",
        consequence: "Emergency measures, overload, unstable service quality",
        cost: "Reacting often costs more than anticipating",
      },
      {
        title: "Different rules across sites",
        description: "Each site applies local logic with no shared reference.",
        consequence: "Harder comparisons and fragile network governance",
        cost: "Less controlled operations budget at network level",
      },
      {
        title: "Economic impact is hard to attribute",
        description: "Actions are launched, but real impact stays unclear.",
        consequence: "Reviews lack clear evidence of what works",
        cost: "Budgets and priorities are challenged without proof",
      },
    ],
    diagnostic: {
      title: "Does this sound familiar?",
      signals: [
        "You have forecasts, but no usable decision journal",
        "Field adjustments are poorly documented (or not reusable)",
        "Baseline / recommended / actual is not standardized",
        "Multi-site reviews rely on ad-hoc explanations",
      ],
    },
  },

  solution: {
    kicker: "DecisionOps",
    heading: "DecisionOps above your existing tools.",
    subheading:
      "The market already offers forecasting, scheduling automation, labor costing, and scenario simulation. Praedixa adds something else: a governed federation of the useful data on top of your stack, executable trade-offs, and finance-grade ROI proof.",
    principles: [
      {
        title: "Federate the systems that matter to a decision",
        subtitle: "Read-only · France-hosted",
        description:
          "Exports, APIs, ERP, scheduling, BI, and spreadsheets are connected into one governed frame without asking teams to replace their core tools.",
      },
      {
        title: "Turn trade-offs into governed decisions",
        subtitle: "Cost / service / risk",
        description:
          "Praedixa puts real options on the table, makes the trade-off explicit, keeps business guardrails visible, and prepares the next move instead of stopping at the signal.",
      },
      {
        title: "Trigger and prove",
        subtitle: "Validated action · finance-grade proof",
        description:
          "The validated first step is pushed into existing tools, then the decision is reviewed with baseline / recommended / actual and explicit assumptions.",
      },
    ],
    differentiators: {
      title: "The difference is in the DecisionOps combination",
      description:
        "No single brick is unique on its own. What stands out is the product combination packaged as the operating core.",
      items: [
        {
          is: "Governed federation on top of the stack",
          isNot: "Data project or tool replacement",
        },
        {
          is: "Decision Journal + first action in the tools",
          isNot: "Signals or dashboards with no execution path",
        },
        {
          is: "Decision-by-decision monthly proof",
          isNot: "Generic ROI claims disconnected from decisions",
        },
      ],
    },
  },
};
