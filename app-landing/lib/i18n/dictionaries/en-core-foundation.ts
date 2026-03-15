import type { Dictionary } from "../types";

export const enCoreFoundation: Partial<Dictionary> = {
  meta: {
    title: "Praedixa | Praedixa deployment for multi-site networks",
    description:
      "Praedixa helps multi-site networks spot earlier the trade-offs that erode margin, compare constrained options, and review the actual impact of the decisions taken.",
    ogTitle: "Praedixa | Praedixa deployment for multi-site networks",
    ogDescription:
      "When a multi-site network sees critical trade-offs too late, margin gets burned in urgency. Praedixa surfaces them earlier, compares the options, and reviews the real impact of the decision.",
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
    ctaPrimary: "See a concrete example",
    backToSite: "Back to site",
  },

  hero: {
    kicker: "For COO, operations leaders, and network managers",
    headline: "Anticipate",
    headlineHighlight: "the trade-offs before urgency burns margin.",
    subtitle:
      "Praedixa helps multi-site networks surface earlier when to reinforce, reallocate, postpone, or adjust service levels, then compare constrained options and review the actual impact of the decisions taken.",
    manifestoLabel: "Where Praedixa starts",
    manifestoQuote:
      "Network teams that cannot wait for the next review or the next failure to arbitrate.",
    bullets: [
      {
        metric: "Who it serves",
        text: "Multi-site operators who need to protect margin and service before the emergency hits.",
      },
      {
        metric: "Decisions covered",
        text: "When to reinforce, reallocate, postpone, or adjust service levels.",
      },
      {
        metric: "What changes",
        text: "Earlier comparisons, clearer trade-offs, and impact reviewed over time.",
      },
    ],
    ctaPrimary: "See a concrete example",
    ctaSecondary: "Frame the first decision scope",
    ctaTertiary: "",
    previewTitle: "A preview of what awaits you",
    ctaMeta: "Praedixa deployment · read-only start · NDA available",
    trustBadges: [
      "Read-only start",
      "Aggregated data only",
      "Hosted in France",
      "NDA available from the first discussion",
      "First focus: the costliest coverage and allocation trade-offs",
      "Software + scoped rollout on top of your existing data",
      "Ops first, Finance and IT as secondary reviewers",
      "Impact reviewed: baseline / recommended / actual",
    ],
  },

  preview: {
    kicker: "A preview",
    heading: "The Praedixa interface",
    subheading: "See how the decision protocol takes shape in the interface.",
    overlayTitle: "Discover the web app",
    overlayBody: "Open a public preview (same UI, fictional data).",
    overlayCta: "Discover the web app",
    overlayBackCta: "Back to video",
    loadingLabel: "Loading preview video...",
    liveBadge: "Public preview",
  },

  problem: {
    kicker: "Why now",
    heading:
      "The problem is not a lack of data. It is a lack of decision discipline.",
    subheading:
      "In multi-site operations, critical trade-offs are still taken too late, too fast, and without a solid economic frame. The result is more emergency cost, less room to maneuver, and decisions that are harder to defend.",
    cta: "See a concrete example",
    ctaHint:
      "Public logistics example: options compared, decision retained, and impact reviewed before any form fill.",
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
          "By the time the risk is clearly visible, it is often already more expensive to handle and teams have fewer credible options left.",
        consequence:
          "The room to maneuver narrows before the discussion even begins.",
        cost: "Emergency cost rises faster than decision quality.",
      },
      {
        title: "Options are not compared cleanly",
        description:
          "Operations, finance, and network leaders often arbitrate under pressure, without one shared frame for cost, service, capacity, and risk.",
        consequence: "Decisions become harder to explain and harder to repeat.",
        cost: "Speed wins more often than the best trade-off.",
      },
      {
        title: "Impact is rarely reviewed",
        description:
          "Decisions pile up, but proof of what they actually protected or cost is missing when the same trade-off returns.",
        consequence:
          "Meetings restart from scratch and assumptions remain implicit.",
        cost: "ROI gets described instead of demonstrated.",
      },
    ],
    diagnostic: {
      title: "Do you recognize this pattern?",
      signals: [
        "The same business gap becomes visible locally before it becomes visible in a shared read",
        "Corrections happen once margin or service are already under pressure",
        "Two comparable teams do not make the same decision when facing the same signal",
        "After an action, it is still difficult to know what it really protected",
      ],
    },
  },

  solution: {
    kicker: "Product",
    heading: "A decision layer above the tools you already use.",
    subheading:
      "Praedixa does not replace your ERP, BI, planning tools, or field processes. It adds the frame that helps teams arbitrate earlier, compare options, and review the impact of the decisions taken.",
    principles: [
      {
        title: "See",
        subtitle: "Tensions and conflicts earlier",
        description:
          "Praedixa makes the tensions, drifts, and operational conflicts visible before they become emergency costs.",
      },
      {
        title: "Compare",
        subtitle: "Cost · service · risk",
        description:
          "Options are laid out with explicit assumptions so teams can arbitrate properly across service level, capacity, cost, and exposure.",
      },
      {
        title: "Prove",
        subtitle: "Decision documented · impact reviewed",
        description:
          "Decisions keep their context, assumptions, and observed impact so the next trade-off can start from evidence instead of memory.",
      },
    ],
    differentiators: {
      title: "What Praedixa actually adds",
      description:
        "Your tools store, report, plan, and execute. Praedixa adds the layer that helps teams arbitrate, compare, justify, and review impact.",
      items: [
        {
          is: "A trade-off layer on top of the existing stack",
          isNot: "One more planning tool",
        },
        {
          is: "A focused entry point on the costliest trade-offs first",
          isNot: "A promise to optimize the whole company in one shot",
        },
        {
          is: "A decision framed and reviewed over time",
          isNot: "An opaque recommendation with no proof afterwards",
        },
      ],
    },
  },
};
