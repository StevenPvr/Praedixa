import type { Dictionary } from "../types";

export const enCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Business risks and multi-site decisions",
    description:
      "Praedixa anticipates the business risks degrading performance and recommends the best decisions to reduce them across staffing, demand, inventory, supply, and customer retention.",
    ogTitle: "Praedixa | Business risks and multi-site decisions",
    ogDescription:
      "In 5 business days, Praedixa shows which gaps threaten performance and which decisions to launch first to protect margin, service, and growth.",
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
    kicker: "For COO, CFO, and network leadership",
    headline: "Anticipate",
    headlineHighlight: "the business risks eroding margin.",
    subtitle:
      "Praedixa detects the gaps threatening your business and recommends the best decisions to take across staffing, demand, inventory, supply, and customer retention. We start with the most costly risk in your perimeter.",
    manifestoLabel: "Our purpose",
    manifestoQuote:
      "See earlier which risks degrade performance, decide what to fix, review what worked.",
    bullets: [
      {
        metric: "5 days",
        text: "to surface the signal",
      },
      {
        metric: "Read-only",
        text: "on your existing data",
      },
      {
        metric: "From staffing to churn",
        text: "one decision engine",
      },
    ],
    ctaPrimary: "Request the free historical audit",
    ctaSecondary: "See the proof protocol",
    previewTitle: "A preview of what awaits you",
    ctaMeta: "5 business days · read-only · human validation",
    trustBadges: [
      "Historical proof in 5 business days",
      "Staffing, demand, inventory, supply, retention",
      "Read-only on your existing data",
      "Human validation on every action",
      "First perimeter scoped around the priority risk",
      "No tool replacement required",
      "Impact reviewed site by site",
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
    heading: "When business gaps surface too late, performance slips.",
    subheading:
      "Across staffing, demand, inventory, supply, or retention, the same problem keeps returning: useful signals do not arrive early enough or in a shared language. The result is reactive cost, fragile service, and late trade-offs.",
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
        title: "Critical signals are scattered",
        description:
          "Workload, demand, stock, raw-material availability, churn, or coverage all live in different tools and cadences.",
        consequence:
          "The useful signal often shows up when room for action is already limited.",
        cost: "Corrections cost more than anticipation",
      },
      {
        title: "Each function arbitrates in its own view",
        description:
          "Operations, finance, supply, commercial, or field teams each see part of the issue, rarely the full trade-off at the right moment.",
        consequence: "Trade-offs take longer and stay harder to defend.",
        cost: "Decisions slow down",
      },
      {
        title: "Corrections happen in emergency mode",
        description:
          "Reinforcement, reallocation, stock adjustment, supply action, or retention moves are launched too late and without a shared read of their impact.",
        consequence: "Budgets stay debated and priorities drift by site.",
        cost: "Protected margin remains unclear",
      },
    ],
    diagnostic: {
      title: "Does this sound familiar?",
      signals: [
        "A local team spots the issue before it becomes visible in a shared read",
        "Corrections arrive when margin, service, or stock are already under pressure",
        "Two similar teams do not make the same choice when facing the same signal",
        "After an action, it is still hard to know what it actually protected",
      ],
    },
  },

  solution: {
    kicker: "Praedixa method",
    heading:
      "Anticipate risks. Compare trade-offs. Launch the right first action.",
    subheading:
      "Praedixa does not replace your ERP, scheduling, or BI. It connects the signals that matter, anticipates short-horizon business risks, compares cost / service / risk trade-offs, and documents the result of the decisions taken across staffing, demand, inventory, supply, or retention.",
    principles: [
      {
        title: "Spot early the gaps threatening performance",
        subtitle: "Existing data · read-only",
        description:
          "Exports, APIs, ERP, scheduling, BI, and spreadsheets are linked without a replacement project so the useful gaps surface before they get more expensive.",
      },
      {
        title: "Compare trade-offs across your operating levers",
        subtitle: "Cost / service / risk",
        description:
          "Praedixa lays the options out, quantifies their expected effects, and keeps your operating guardrails visible before validation, whether the lever is staffing, demand, inventory, supply, or retention.",
      },
      {
        title: "Launch a first action, then review the impact",
        subtitle: "Human validation · impact reviewed",
        description:
          "Your teams keep final authority. Praedixa prepares the first action inside your tools, then reviews baseline, recommended, actual, and assumptions.",
      },
    ],
    differentiators: {
      title: "What makes Praedixa credible",
      description:
        "The value is not a category label. It is a simple mechanism: see earlier, compare clearly, act with guardrails, then review the impact.",
      items: [
        {
          is: "One engine across multiple business risks",
          isNot: "A single-purpose tool stuck on one lever",
        },
        {
          is: "A first perimeter scoped around the priority risk",
          isNot: "A vague promise pretending to do everything at once",
        },
        {
          is: "Validated action + reviewed impact",
          isNot: "ROI claims with no traceability",
        },
      ],
    },
  },
};
