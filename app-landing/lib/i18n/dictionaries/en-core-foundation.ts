import type { Dictionary } from "../types";

export const enCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | AI for your operational decisions",
    description:
      "Praedixa anticipates your needs, optimizes your decisions, and proves your ROI. Operational in 30 days.",
    ogTitle: "Praedixa | AI for your operational decisions",
    ogDescription:
      "Praedixa anticipates your needs, optimizes your decisions, and proves your ROI. Operational in 30 days.",
  },

  nav: {
    problem: "Problem",
    method: "Method",
    services: "Offer",
    howItWorks: "How it works",
    useCases: "Use cases",
    security: "Security",
    faq: "FAQ",
    contact: "Contact",
    ctaPrimary: "See a demo",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "For operations decision-makers",
    headline: "Anticipate. Optimize.",
    headlineHighlight: "Prove your ROI.",
    subtitle:
      "AI for your operational decisions. Measurable results, not promises.",
    manifestoLabel: "The starting point",
    manifestoQuote:
      "Operations teams that want to anticipate rather than react.",
    bullets: [
      {
        metric: "Who it serves",
        text: "Multi-site networks, all industries.",
      },
      {
        metric: "How",
        text: "AI anticipates and optimizes your daily decisions.",
      },
      {
        metric: "Result",
        text: "A measured and proven ROI.",
      },
    ],
    ctaPrimary: "See a demo",
    ctaSecondary: "Contact us",
    ctaTertiary: "",
    previewTitle: "A preview of your business view",
    ctaMeta: "Deployment in 30 days \u00b7 read-only \u00b7 NDA available",
    trustBadges: [
      "Read-only at the start",
      "Aggregated data only",
      "Hosted in France",
      "NDA available from the first discussion",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading: "See how Praedixa structures your daily decisions.",
    overlayTitle: "Discover the web app",
    overlayBody: "Open a public preview (same UI, fictional data).",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video...",
    liveBadge: "Public preview",
  },

  problem: {
    kicker: "The problem",
    heading: "You have the data. You are missing a framework to decide fast.",
    subheading:
      "In multi-site operations, critical decisions often come too late. The result: avoidable costs and missed opportunities.",
    cta: "See a demo",
    ctaHint: "Concrete example: an end-to-end optimized decision.",
    states: {
      loadingTitle: "Reading signals",
      loadingBody: "We are structuring signals before the critical decisions.",
      emptyTitle: "No signal structured",
      emptyBody:
        "Add the business situations to prioritize to build this view.",
      errorTitle: "Section unavailable",
      errorBody: "The problem framing cannot be displayed right now.",
    },
    pains: [
      {
        title: "Signals arrive too late",
        description:
          "When the risk becomes visible, it is already more expensive to handle.",
        consequence:
          "The room to act narrows before the discussion even begins.",
        cost: "Emergency costs rise faster than decision quality.",
      },
      {
        title: "Options are not compared",
        description:
          "Teams decide under pressure, without a shared basis to compare scenarios.",
        consequence: "Decisions become hard to explain and hard to reproduce.",
        cost: "Speed wins over the best option.",
      },
      {
        title: "Impact is never measured",
        description:
          "Decisions pile up, but no one knows what they actually cost or protected.",
        consequence: "Meetings start from scratch every time.",
        cost: "ROI is estimated, never proven.",
      },
    ],
    diagnostic: {
      title: "Do you recognize this pattern?",
      signals: [
        "A problem is visible on the ground long before it shows up in dashboards",
        "Corrections come when the cost is already committed",
        "Two comparable teams make different decisions facing the same problem",
        "After an action, no one knows what it actually changed",
      ],
    },
  },

  solution: {
    kicker: "Our approach",
    heading: "AI that anticipates, compares, and proves.",
    subheading:
      "Praedixa does not replace your tools. It adds the missing intelligence to decide faster and better.",
    principles: [
      {
        title: "Anticipate",
        subtitle: "Risks and opportunities",
        description:
          "Praedixa detects important signals before they become costly emergencies.",
      },
      {
        title: "Compare",
        subtitle: "Cost \u00b7 impact \u00b7 risk",
        description:
          "Each option is quantified so you can choose with full knowledge.",
      },
      {
        title: "Prove",
        subtitle: "Measured ROI",
        description:
          "Each decision keeps its trace and real impact to build a true performance record.",
      },
    ],
    differentiators: {
      title: "What Praedixa adds",
      description:
        "Your tools store and report. Praedixa adds anticipation, comparison, and proof.",
      items: [
        {
          is: "An intelligence layer on top of what you have",
          isNot: "One more tool",
        },
        {
          is: "A focus on what costs the most",
          isNot: "A promise to optimize everything at once",
        },
        {
          is: "An ROI measured over time",
          isNot: "A recommendation without proof",
        },
      ],
    },
  },
};
