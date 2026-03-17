import type { Dictionary } from "../types";

export const enCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "How it works",
    heading: "A simple cycle, focused on results.",
    subheading:
      "Praedixa detects, compares, helps decide, and measures the impact. Automatically.",
    steps: [
      {
        number: "01",
        title: "Early detection",
        subtitle: "Useful signals",
        description:
          "Praedixa analyzes your existing data and surfaces risks before they become expensive.",
      },
      {
        number: "02",
        title: "Option comparison",
        subtitle: "Cost \u00b7 impact \u00b7 risk",
        description:
          "Scenarios are quantified and compared so you can choose the best option.",
      },
      {
        number: "03",
        title: "Informed decision",
        subtitle: "Shared framework",
        description:
          "The team decides on a shared basis instead of under pressure.",
      },
      {
        number: "04",
        title: "ROI proof",
        subtitle: "Before \u00b7 after",
        description:
          "Decisions and their effects are measured to prove the real ROI.",
      },
    ],
  },

  useCases: {
    kicker: "Use cases",
    heading: "Concrete cases, not promises.",
    subheading:
      "Praedixa applies to the decisions that cost the most when they are taken too late.",
    labels: {
      context: "What is blocking",
      action: "What Praedixa brings",
      impact: "What it changes",
    },
    cases: [
      {
        id: "volatility",
        title: "Demand peaks",
        context:
          "A demand spike identified too late leads to extra costs and degraded service.",
        action:
          "Praedixa anticipates peaks and compares options site by site before the last minute.",
        result: "Less urgency, more room to act, and defensible decisions.",
      },
      {
        id: "absenteeism",
        title: "Under-coverage",
        context:
          "Weak spots drift until emergency staffing becomes the only option.",
        action:
          "Praedixa detects drifts and compares scenarios on a shared basis: cost, impact, risk.",
        result: "Decisions are based on data, not just intuition.",
      },
      {
        id: "crosssite",
        title: "Resource allocation",
        context:
          "Shifting pressure from one site to another gives the illusion of a solution without reducing overall cost.",
        action:
          "Praedixa compares allocation and reinforcement options before moving the constraint.",
        result: "Allocation decisions become comparable and justifiable.",
      },
      {
        id: "roi",
        title: "ROI measurement",
        context:
          "After the decision, no one knows what it actually cost or protected.",
        action:
          "Praedixa documents each decision and measures its real effects.",
        result: "ROI is proven, not estimated.",
      },
    ],
  },

  deliverables: {
    kicker: "Concrete example",
    heading: "See what an end-to-end optimized decision looks like.",
    subheading:
      "A simple example: a detected problem, compared options, a decision taken, and an impact measured.",
    roiFrames: [
      {
        label: "Starting point",
        value: "Demand spike across 3 sites",
        note: "Delays rising, overtime already consumed, emergency reinforcement considered.",
        sourceLabel: "See the impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
      {
        label: "Options compared",
        value: "Overtime vs reinforcement vs reallocation",
        note: "Each option is compared on cost, service impact, and available capacity.",
        sourceLabel: "See the impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
      {
        label: "Impact measured",
        value: "Decision retained and result verified",
        note: "The decision, its limits, and its real impact are measured to improve future ones.",
        sourceLabel: "See the impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
    ],
    checklist: [
      "The starting point is described simply",
      "Options are compared with their assumptions",
      "The retained decision is explained clearly",
      "The limits of the example are made explicit",
      "Impact is measured after the fact",
      "The link with your existing tools is clarified",
    ],
  },

  security: {
    kicker: "Security & IT",
    heading: "Secure, sovereign, non-intrusive.",
    subheading:
      "Praedixa starts read-only on your existing data, without a heavy IT project.",
    tiles: [
      {
        title: "Connects to your existing tools",
        description:
          "Praedixa plugs into your current tools without replacing them.",
      },
      {
        title: "Aggregated data",
        description:
          "Startup works at the site, team, or activity level, not at the individual level.",
      },
      {
        title: "CSV / Excel exports or API",
        description:
          "Praedixa starts on what you already have, with no process overhaul.",
      },
      {
        title: "Clear security framework",
        description: "Encryption, access control, and logging built in.",
      },
      {
        title: "Hosted in France",
        description: "Platform and data hosted in France on Scaleway.",
      },
      {
        title: "Progressive scale-up",
        description: "Integration expands only when the value is proven.",
      },
    ],
    compatibility: {
      title: "Compatible with your current stack",
      description:
        "Praedixa plugs into your existing tools to add intelligence, not to force a replacement.",
      tools: ["ERP", "Planning", "CRM", "BI", "Excel"],
    },
    honesty:
      "Integration should reassure the IT review, not monopolize the conversation before value is proven.",
  },

  pilot: {
    kicker: "Deployment",
    heading: "Operational in 30 days.",
    subheading:
      "A simple start: an operations sponsor, your existing data, measurable results.",
    statusLabels: ["Entry point", "Setup", "Cadence"],
    included: {
      title: "What deployment installs",
      items: [
        "A first useful analysis on your existing data",
        "Priority decisions identified",
        "Compared options with their cost and impact",
        "A shared framework for your teams",
        "A reusable ROI measurement",
      ],
    },
    excluded: {
      title: "What deployment is not",
      items: [
        "A stack overhaul",
        "An IT project before proof of value",
        "One more dashboard",
        "A promise with no measurable result",
        "An isolated diagnostic with no operational follow-up",
      ],
    },
    kpis: {
      title: "What deployment frames",
      items: [
        "Priority risks",
        "Quantified options",
        "Decisions taken",
        "Results measured",
        "ROI proven",
      ],
    },
    governance: {
      title: "Working rhythm",
      items: [
        "An identified operations sponsor",
        "A short weekly checkpoint",
        "A structured results review",
        "Decisions measured over time",
      ],
    },
    selection: {
      title: "Prerequisites",
      items: [
        "Multi-site organization",
        "Usable exports or APIs",
        "Available operations sponsor",
      ],
    },
    upcoming: {
      title: "After the first scope",
      description:
        "If results are there, Praedixa progressively extends to the decisions with the most impact.",
    },
    urgency: "Reply within 48h. Startup possible without an IT project.",
    ctaPrimary: "Contact us",
    ctaMeta:
      "Software + framed setup \u00b7 read-only at the start \u00b7 results in 30 days",
  },
};
