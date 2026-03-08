import type { Dictionary } from "../types";

export const enCoreFoundation: Partial<Dictionary> = {
  meta: {
    title:
      "Praedixa | AI decision copilot for multi-site networks",
    description:
      "AI decision copilot for SMB and mid-market multi-site networks: anticipate KPI drifts, standardize options, trigger the first step, then prove impact every month. EU AI Act & GDPR by design. Month 1: free historical audit (read-only).",
    ogTitle:
      "Praedixa | AI decision copilot | Impact proof",
    ogDescription:
      "Defensible trade-offs with proof: cost/service/risk options, assisted first step, and monthly impact proof for Ops/Finance reviews.",
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
    kicker: "AI decision copilot · Multi-site networks",
    headline: "AI decision copilot for multi-site networks.",
    headlineHighlight: "Protect margin and service levels.",
    subtitle:
      "Anticipate KPI drifts, standardize options, trigger the first step, then prove impact every month. EU AI Act & GDPR by design. Human validation required.",
    manifestoLabel: "Our purpose",
    manifestoQuote:
      "Supporting company growth by revealing the potential of their data.",
    bullets: [
      {
        metric: "Free audit",
        text: "historical: potential & priorities",
      },
      {
        metric: "3 months",
        text: "method + monthly proof",
      },
      {
        metric: "Read-only start",
        text: "exports, no tool replacement project",
      },
    ],
    ctaPrimary: "Request the free historical audit",
    ctaSecondary: "See the proof protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta:
      "Ops & Finance aligned · Human validation · EU AI Act & GDPR by design",
    trustBadges: [
      "Guided decisions + decision journal + monthly proof",
      "Option: KPI forecasting only",
      "Indicators: capacity, demand, inventory/supply… (as needed)",
      "Read-only kickoff (exports)",
      "Multi-site comparability, governance, and standardization",
      "Hosted in France (Scaleway)",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading:
      "See how the decision protocol takes shape in the interface.",
    overlayTitle: "Discover the web app",
    overlayBody:
      "Open a public preview (same UI, fictitious data).",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video...",
    liveBadge: "Public preview",
  },

  problem: {
    kicker: "Operational problem",
    heading:
      "Cost/service trade-offs happen daily — rarely with proof.",
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
        consequence:
          "Emergency measures, overload, unstable service quality",
        cost: "Reacting often costs more than anticipating",
      },
      {
        title: "Different rules across sites",
        description:
          "Each site applies local logic with no shared reference.",
        consequence:
          "Harder comparisons and fragile network governance",
        cost: "Less controlled operations budget at network level",
      },
      {
        title: "Economic impact is hard to attribute",
        description:
          "Actions are launched, but real impact stays unclear.",
        consequence:
          "Reviews lack clear evidence of what works",
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
    kicker: "Praedixa method",
    heading: "We improve decisions, not just forecasts.",
    subheading:
      "Forecasting helps. Value comes from decisions you can compare, record, and quantify. The goal: clearer cost/service trade-offs and repeatable impact proof.",
    principles: [
      {
        title: "The right signals, at the right level",
        subtitle: "Understand the situation",
        description:
          "Capacity, demand, inventory/supply… based on your priorities. Team/site level only (not individual).",
      },
      {
        title: "Concrete options to compare",
        subtitle: "Choose with your rules",
        description:
          "We put real options on the table (reinforcement, reallocation, schedule adjustment, etc.) and make the trade-off explicit before acting.",
      },
      {
        title: "Decision journal + monthly proof",
        subtitle: "Record, then measure",
        description:
          "What was chosen, why, and what changed. Then a monthly proof you can use in reviews.",
      },
    ],
    differentiators: {
      title: "What Praedixa does (and doesn't)",
      description:
        "One product: the complete Signature Service. Optionally, KPI forecasting only if you need it.",
      items: [
        {
          is: "Signature Service (decisions + journal + proof)",
          isNot: "Forecasting only, no decision protocol",
        },
        {
          is: "Adds on top of your tools (read-only)",
          isNot: "A replacement for your ERP/scheduling/BI tools",
        },
        {
          is: "Monthly proof (baseline / recommended / actual)",
          isNot: "Dashboards disconnected from decisions",
        },
      ],
    },
  },
};
