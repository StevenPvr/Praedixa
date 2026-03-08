import type { Dictionary } from "../types";

export const enCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "Pilot protocol",
    heading: "A 4-step pilot with clear milestones.",
    subheading:
      "Free historical audit, proof milestone in week 8, consolidation in 3 months.",
    steps: [
      {
        number: "01",
        title: "Framing + free audit",
        subtitle: "History & starting point",
        description:
          "Month 1: audit your historical data to estimate potential and pick the priority decisions to cover.",
      },
      {
        number: "02",
        title: "Read-only connection",
        subtitle: "Your existing exports",
        description:
          "Read-only connection via CSV/Excel/APIs. We set up the indicators you need based on your priorities.",
      },
      {
        number: "03",
        title: "Guided decisions + journal",
        subtitle: "Options, choices, reasons",
        description:
          "Compare options with your rules. Each decision is recorded: proposed option, final choice, reason, outcome.",
      },
      {
        number: "04",
        title: "Impact proof & governance",
        subtitle: "Week 8 then month 3",
        description:
          "Monthly proof, Ops + Finance reviews, multi-site standardization, and scale-up plan.",
      },
    ],
  },

  useCases: {
    kicker: "Decisions covered",
    heading: "One engine, many decisions.",
    subheading:
      "One protocol across multi-site verticals: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    labels: {
      context: "Context",
      action: "Decision lever",
      impact: "Expected proof",
    },
    cases: [
      {
        id: "volatility",
        title: "Multi-site demand peaks",
        context:
          "Rush periods and volume swings destabilize field capacity.",
        action:
          "Forecasts, standardized options, documented cost/service/risk trade-offs.",
        result:
          "Less last-minute urgency and more stable service levels.",
      },
      {
        id: "absenteeism",
        title: "Rare skills and absences",
        context:
          "Operational fragility from critical absences and workshop/clinical/maintenance dependencies.",
        action:
          "Criticality-based prioritization, alternative action options, recorded choices.",
        result:
          "More robust continuity and reduced emergency mode.",
        callout:
          "No individual data — only team/site-level steering.",
      },
      {
        id: "crosssite",
        title: "Cross-site capacity arbitrage",
        context:
          "Limited resources must be allocated across competing sites.",
        action:
          "Compare options across sites with local constraints and network-level goals.",
        result:
          "Comparable decisions, standardized governance, defensible executive trade-offs.",
        callout:
          "Praedixa structures the decision. The company keeps final decision authority.",
      },
      {
        id: "roi",
        title: "Monthly Ops/Finance review",
        context:
          "Hard to connect field decisions to real economic impact.",
        action:
          "Decision journal + before / recommended / actual comparison protocol.",
        result:
          "A monthly pack usable for priorities, budgets, and renewal.",
      },
    ],
  },

  deliverables: {
    kicker: "Economic impact proof",
    heading: "Differentiator: decision journal + proof.",
    subheading:
      "No vague promises: a simple, comparable, repeatable protocol.",
    roiFrames: [
      {
        label: "Baseline (reference)",
        value: "Your current operating baseline",
        note: "Stable comparison point: what would happen without Praedixa recommendations.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Recommended (potential)",
        value: "The recommended scenario",
        note: "Potential under your constraints (cost, service, business rules).",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
      {
        label: "Actual (field)",
        value: "What was done, and why",
        note: "Captures what was executed in the field to attribute net impact.",
        sourceLabel: "Source: Praedixa pilot protocol",
        sourceUrl: "/en/pilot-protocol",
      },
    ],
    checklist: [
      "Decision journal: options, choice, rationale, outcome",
      "Indicators: operating cost, service level, emergencies, schedule stability",
      "Baseline / recommended / actual comparison (site + network)",
      "Monthly Ops + Finance ritual",
      "Monthly pack usable in exec reviews",
    ],
  },

  security: {
    kicker: "Integration & data",
    heading: "Read-only setup, fast launch, clear governance.",
    subheading:
      "Praedixa sits on top of your existing systems: read-only connection first, then standardized decisions and impact measurement across sites.",
    tiles: [
      {
        title: "Read-only via exports",
        description:
          "Kickoff with existing CSV/Excel/APIs. Praedixa does not replace your existing tools.",
      },
      {
        title: "Only the indicators you need",
        description:
          "Capacity, demand, inventory/supply… based on your priorities.",
      },
      {
        title: "Aggregated data (team/site)",
        description:
          "No individual prediction. Team/site-level steering to reduce exposure and simplify governance.",
      },
      {
        title: "Encryption & access control",
        description:
          "Encryption in transit and at rest. Role-based access control (RBAC). Activity logs.",
      },
      {
        title: "Comparable multi-site governance",
        description:
          "Common reference to compare decisions and impact across sites, workshops, or networks.",
      },
      {
        title: "Hosted in France (Scaleway)",
        description:
          "Platform and data hosted in France (Paris), with a transparent security posture for qualification.",
      },
    ],
    compatibility: {
      title: "Compatible with your stack",
      description:
        "Praedixa complements your tools and adds a decision + proof protocol for Ops and Finance.",
      tools: ["Scheduling", "ERP", "CRM", "BI", "Excel"],
    },
    honesty:
      "A KPI forecasting-only mode is available, but our core value is Signature Service: guided decisions + decision journal + monthly proof.",
  },

  pilot: {
    kicker: "Pilot offer",
    heading:
      "Praedixa Signature pilot: free audit, proof in 3 months.",
    subheading:
      "Multi-vertical program for multi-site companies: restaurants, retail, hospitality, dealerships/workshops, logistics, healthcare, industry, call centers.",
    statusLabels: ["Free audit (M1)", "Proof milestone (S8)", "Consolidation (M3)"],
    included: {
      title: "What you receive",
      items: [
        "Free historical audit and potential estimate",
        "Useful indicators/forecasts (capacity, demand, inventory/supply… as needed)",
        "Compared decision options (cost, service, business rules)",
        "Shared decision journal: option, choice, reason, outcome",
        "Monthly proof: baseline / recommended / actual",
        "Ops + Finance governance cadence",
      ],
    },
    excluded: {
      title: "What it does not include",
      items: [
        "A tool replacement project (ERP/scheduling)",
        "Public predefined quantified outcome guarantee",
        "Immediate global multi-country deployment",
        "Unlimited custom development",
      ],
    },
    kpis: {
      title: "KPIs tracked",
      items: [
        "Coverage quality and service-level performance",
        "Operating cost (emergency usage, reallocations, reinforcement options)",
        "Rate and reasons for “not following the recommended option” in the journal",
        "Before / recommended / actual gap by site and network",
      ],
    },
    governance: {
      title: "Governance",
      items: [
        "Weekly operations working session",
        "Monthly Ops + Finance review",
        "Client-side operations sponsor",
        "Shared decision journal and monthly proof",
      ],
    },
    selection: {
      title: "Eligibility criteria",
      items: [
        "Multi-site organization with demand variability and daily trade-offs",
        "Available operations and finance sponsors",
        "Usable exports (demand/workload, capacity, inventory/supply, absences)",
      ],
    },
    upcoming: {
      title: "Post-pilot path",
      description:
        "Progressive extension to more sites, more decisions, and more KPIs without replacing your existing stack.",
    },
    urgency:
      "Applications reviewed within 48 business hours. Focused-scope kickoff possible.",
    ctaPrimary: "Apply for the Praedixa Signature pilot",
    ctaMeta:
      "Free historical audit · Read-only exports/APIs · Monthly proof",
  },
};
