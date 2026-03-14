import type { Dictionary } from "../types";

export const enCoreOperations: Partial<Dictionary> = {
  howItWorks: {
    kicker: "How it works",
    heading: "A simple, decision-first loop. Not another dashboard.",
    subheading:
      "Praedixa reads the useful signals, compares trade-offs, frames the decision, and reviews the impact over time through one concrete operating conflict.",
    steps: [
      {
        number: "01",
        title: "Early read",
        subtitle: "Useful signals · read-only",
        description:
          "Praedixa starts from the data already present in your tools to surface earlier the sites, teams, or flows that will come under pressure.",
      },
      {
        number: "02",
        title: "Economic trade-off",
        subtitle: "Cost · inaction · risk",
        description:
          "Options are compared with explicit assumptions: cost of action, cost of inaction, operational impact, and level of risk. Forecasting, statistical learning, and constrained optimization help teams compare the most relevant scenarios.",
      },
      {
        number: "03",
        title: "Framed decision",
        subtitle: "Ops · Finance shared frame",
        description:
          "The team decides from one shared frame instead of scattered reactions: when to reinforce, reallocate, postpone, or adjust the service level.",
      },
      {
        number: "04",
        title: "Impact proof",
        subtitle: "Baseline · recommended · actual",
        description:
          "Decisions and outcomes are reviewed to build an ROI loop that operations and finance can both use. The impact review also uses econometric models to separate context from the decision itself and from the outcome actually observed.",
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
        context: "Rush periods and volume swings destabilize field capacity.",
        action:
          "Forecasts, standardized options, documented cost/service/risk trade-offs.",
        result: "Less last-minute urgency and more stable service levels.",
      },
      {
        id: "absenteeism",
        title: "Rare skills and absences",
        context:
          "Operational fragility from critical absences and workshop/clinical/maintenance dependencies.",
        action:
          "Criticality-based prioritization, alternative action options, recorded choices.",
        result: "More robust continuity and reduced emergency mode.",
        callout: "No individual data — only team/site-level steering.",
      },
      {
        id: "crosssite",
        title: "Cross-site capacity arbitrage",
        context: "Limited resources must be allocated across competing sites.",
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
        context: "Hard to connect field decisions to real economic impact.",
        action:
          "Decision journal + before / recommended / actual comparison protocol.",
        result: "A monthly pack usable for priorities, budgets, and renewal.",
      },
    ],
  },

  deliverables: {
    kicker: "Concrete example",
    heading: "Before asking for anything, see what useful proof looks like.",
    subheading:
      "A simple example of an operating conflict, compared options, retained decision, and reviewed impact. Public proof should show Praedixa at work, not just describe the protocol.",
    roiFrames: [
      {
        label: "Starting point",
        value: "Demand spike across 3 logistics sites",
        note: "OTIF risk rising, overtime already used, emergency temp staffing considered on two sites.",
        sourceLabel: "See the public impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
      {
        label: "Options compared",
        value: "Overtime vs temp staffing vs reallocation",
        note: "Each option is compared on cost, service risk, available capacity, and expected impact on backlog.",
        sourceLabel: "See the public impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
      {
        label: "Impact reviewed",
        value: "Decision retained and reviewed",
        note: "The final choice, its limits, and the observed impact are reviewed together to prepare the next trade-off.",
        sourceLabel: "See the public impact proof",
        sourceUrl: "/en/decision-log-roi-proof",
      },
    ],
    checklist: [
      "The starting point is described in operating language, not only through KPIs",
      "The compared options are visible with their assumptions",
      "The retained decision is explained clearly",
      "The limit of the example is explicit",
      "The impact review separates context from decision",
      "The role of ERP / BI / planning / Excel is made explicit",
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
    kicker: "Deployment",
    heading: "Praedixa deployment: software plus a scoped rollout.",
    subheading:
      "Praedixa deployment installs the software on top of your existing data, frames the first perimeter, and sets up impact review without a heavy IT project at the start.",
    statusLabels: ["Entry point", "Scoped rollout", "Cadence"],
    included: {
      title: "What deployment installs",
      items: [
        "A first useful read on your existing data",
        "Priority trade-offs made visible",
        "Explicit cost / service / risk assumptions",
        "One shared frame for Ops, Finance, and Network",
        "A reusable impact review loop",
      ],
    },
    excluded: {
      title: "What deployment is not",
      items: [
        "A tool replacement project (ERP/scheduling)",
        "Public predefined quantified outcome guarantee",
        "A heavy IT project before value is visible",
        "One more dashboard",
        "An isolated diagnostic with no operating next step",
      ],
    },
    kpis: {
      title: "What deployment frames",
      items: [
        "Priority tensions",
        "Economic assumptions",
        "Compared options",
        "Decisions taken",
        "Impact reviewed",
      ],
    },
    governance: {
      title: "Governance",
      items: [
        "Named operations lead",
        "Short weekly review",
        "Monthly Ops + Finance review",
        "Decisions reviewed on one shared base",
      ],
    },
    selection: {
      title: "Prerequisites",
      items: [
        "Multi-site organization with demand variability and daily trade-offs",
        "Usable exports or APIs",
        "Available operations sponsor",
      ],
    },
    upcoming: {
      title: "After the first perimeter",
      description:
        "If the proof is there, Praedixa extends progressively to the trade-offs where the most margin can be protected.",
    },
    urgency:
      "Applications reviewed within 48 business hours. Focused-scope kickoff possible.",
    ctaPrimary: "Discuss deployment",
    ctaMeta:
      "Software + scoped rollout · read-only start · focused first perimeter",
  },
};
