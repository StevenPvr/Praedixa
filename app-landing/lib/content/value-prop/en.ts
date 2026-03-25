import type { ValuePropContent } from "./shared";
import { valuePropEnSections } from "./en-sections";

export const coreValuePropEn: ValuePropContent = {
  icp: "Franchisees, network directors, and operations leaders running quick-service restaurant networks",
  promise:
    "Praedixa helps quick-service restaurant networks predict demand and staffing needs before rush periods, without replacing POS, planning, or BI.",
  mechanism:
    "Praedixa combines sales, planning, delivery, promotions, weather, and field history to anticipate demand, project staffing needs, and flag the services most likely to slip.",
  reassurance: [
    "Read-only",
    "POS + planning + delivery",
    "Hosted in France",
    "NDA on request",
  ],
  ctaPrimary: "See the historical proof",
  ctaSecondary: "Scope my network",
  heroKicker: "For multi-site quick-service restaurant franchise networks",
  heroHeading: "Predict demand,",
  heroHeadingHighlight: "calibrate staffing.",
  heroSubheading:
    "Praedixa connects your POS, schedules, delivery apps, promotions, and field signals to anticipate incoming volumes, project staffing needs, and see which restaurants will come under pressure restaurant by restaurant.",
  heroBadgeText: "QSR OPS",
  heroProofBlockText:
    "For franchisees, network directors, and operations teams that need earlier demand and coverage visibility.",
  heroProofRoles: ["FRANCHISEE", "NETWORK", "OPS", "FINANCE"],
  heroProofMicropill: "Demand\u00a0|\u00a0staffing\u00a0|\u00a0coverage",
  heroLogoCaption: "They trust us",
  heroOffer: {
    badge: "Our promise",
    title: "A first network-level decision in 30 days",
    body: "A focused scope on POS, planning, and delivery to act before the next peak period.",
    note: "Read-only start. NDA available from day one.",
  },
  socialProof: {
    eyebrow: "Network operations",
    statValue: "30d",
    statLabel:
      "To objectify a first multi-site decision on top of your existing data",
    logosAlt: "Companies that trust us",
    marqueeLabel:
      "Frame a first QSR use case without a heavy IT project",
  },
  product: {
    kicker: "Network operations",
    heading: "Demand and staffing prediction built for the rush.",
    subheading:
      "Praedixa helps HQ and field teams anticipate demand, prepare coverage, and protect the most sensitive services.",
  },
  footerTagline:
    "Praedixa helps quick-service restaurant networks anticipate demand and staffing needs before the rush, without replacing their tools.",
  qualificationTitle: "Is Praedixa right for you?",
  qualificationBody:
    "Praedixa is built for quick-service restaurant franchise networks that want to objectify staffing, service, and margin trade-offs across multiple restaurants.",
  fitTitle: "A good starting point if\u2026",
  fitItems: [
    "you run multiple restaurants with recurring lunch, dinner, or delivery peaks",
    "a network or operations leader wants cleaner staffing decisions",
    "POS, planning, or delivery data is already accessible at kickoff",
  ],
  notFitTitle: "Not for you if\u2026",
  notFitItems: [
    "you run a single location with no network-level challenge",
    "no operations leader can own the topic on the field or HQ side",
    "no usable POS, planning, or activity data is accessible at the start",
  ],
  stackComparison: {
    kicker: "Compatibility",
    heading: "Praedixa adds to your network stack. It decides where your tools stop.",
    subheading:
      "POS, planning, delivery, BI, spreadsheets: everything stays in place. Praedixa connects the useful signals to arbitrate earlier between staffing, service, and protected margin.",
    columnLabels: {
      category: "Tool",
      currentCoverage: "What it does",
      stopsAt: "What is missing",
      praedixaAdd: "What Praedixa adds",
    },
    rows: [
      {
        category: "POS / ERP",
        currentCoverage: "Captures sales, transactions, inventory, and cost flows.",
        stopsAt:
          "Shows the past but does not tell teams what decision to launch before the next rush.",
        praedixaAdd:
          "Projects risky services and compares coverage options before margin slips.",
      },
      {
        category: "BI / reporting",
        currentCoverage: "Shows KPIs, gaps, and trends by restaurant.",
        stopsAt:
          "Explains what happened, but not what to do on the next critical lunch or dinner period.",
        praedixaAdd:
          "Surfaces concrete trade-offs and reviews their real effect on service and margin.",
      },
      {
        category: "Planning / WFM",
        currentCoverage: "Builds shifts, rosters, and coverage by restaurant.",
        stopsAt:
          "Builds the schedule, but does not compare network scenarios before execution.",
        praedixaAdd:
          "Compares reinforcement, reallocation, service reduction, or delivery throttling scenarios.",
      },
      {
        category: "Spreadsheets / committees",
        currentCoverage: "Helps HQ and field teams frame a topic quickly.",
        stopsAt:
          "Stays manual, hard to replay, and with no clear proof on service, staffing, and margin.",
        praedixaAdd:
          "Keeps a readable log of network decisions and their actual effect.",
      },
      {
        category: "Praedixa",
        currentCoverage:
          "Adds a decision layer on top of your existing tools to anticipate rushes and arbitrate across the network.",
        stopsAt:
          "Does not replace POS, BI, or planning. Builds on top of them.",
        praedixaAdd:
          "Anticipate, compare, decide, and prove ROI restaurant by restaurant.",
      },
    ],
    bottomNote:
      "Compatible with existing POS, planning, delivery, BI, and export layers.",
  },
  servicesMeta: {
    title:
      "Praedixa | Quick-service restaurants: a first network decision in 30 days",
    description:
      "Praedixa scopes a first network decision on top of your rushes, restaurants, and existing data in 30 days.",
    ogTitle:
      "Praedixa | Quick-service restaurants: a first network decision in 30 days",
    ogDescription:
      "Praedixa deployment for QSR networks: a first network decision in 30 days, without a heavy IT project.",
  },
  services: {
    kicker: "Offer",
    heading:
      "What you buy: a first network decision made explicit in 30 days.",
    subheading:
      "Praedixa starts on top of POS, planning, delivery, and cost data already available. If needed, a historical proof validates the topic before broader rollout.",
    timelineTitle: "In 30 days",
    timeline: [
      {
        title: "Week 1",
        body: "Frame the network, priority restaurants, critical dayparts, and the operations sponsor.",
      },
      {
        title: "Week 2",
        body: "First risk map with compared options from POS, planning, and delivery data.",
      },
      {
        title: "Week 3",
        body: "Recommended decision by restaurant or restaurant cluster, reviewed with ops and finance.",
      },
      {
        title: "Week 4",
        body: "Review actual impact on staffing, service, and margin, then define rollout next steps.",
      },
    ],
    deliveredTitle: "What is delivered",
    delivered: [
      "A first restaurant-by-restaurant view of rushes, staffing, and service risk",
      "Compared options with explicit cost, service, and margin assumptions",
      "A clear recommendation for operations, network leadership, and finance",
      "A measured readout of the first network-level decision",
    ],
    notDeliveredTitle: "What is not delivered",
    notDelivered: [
      "A rebuild of your POS, planning, or BI stack",
      "A heavy data program before action starts",
      "A vague pilot with no real field decision",
      "More reporting without a concrete trade-off to arbitrate",
    ],
    clientNeedsTitle: "What the client needs to provide",
    clientNeeds: [
      "A network or operations sponsor available for the pass",
      "Usable POS, planning, delivery, or cost access from the start",
      "A coming peak period or an already visible trade-off to tackle first",
    ],
    participantsTitle: "Who joins",
    participants: [
      "Franchisee, network director, or operations leader",
      "Data / BI / planning owner for access",
      "Finance or HR to review economic and staffing impact",
    ],
    reviewTitle: "Review cadence",
    reviewItems: [
      "Short weekly HQ + field checkpoint",
      "Recommendation review with operations and finance",
      "Final readout on service, staffing, and protected margin",
    ],
    primaryCtaLabel: "Scope my network",
    secondaryCtaLabel: "See the historical proof",
    bottomNote:
      "The historical proof lets teams review a past peak period before scaling the network rollout.",
  },
  ...valuePropEnSections,
};
