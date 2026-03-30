import type { ValuePropContent } from "./shared";
import { valuePropEnSections } from "./en-sections";

export const coreValuePropEn: ValuePropContent = {
  icp: "Franchisees, network directors, and operations leaders running quick-service restaurant networks",
  promise:
    "Praedixa helps quick-service restaurant networks forecast demand, inventory pressure, and staffing needs before rush periods, without replacing POS, planning, or BI.",
  mechanism:
    "Praedixa combines sales, planning, delivery, promotions, weather, field history, and inventory signals to anticipate demand, project staffing needs, spot inventory pressure, and flag the restaurants most likely to slip.",
  reassurance: [
    "Read-only",
    "POS + planning + inventory + delivery",
    "Hosted in France",
    "NDA on request",
  ],
  ctaPrimary: "See the historical proof",
  ctaSecondary: "Scope my network",
  heroKicker: "For multi-site quick-service restaurant franchise networks",
  heroHeading: "Forecast demand,",
  heroHeadingHighlight: "inventory and staffing.",
  heroSubheading:
    "Praedixa connects your POS, schedules, delivery apps, promotions, inventory signals, and field context to anticipate incoming volumes, project staffing needs, spot inventory pressure, and see which restaurants will come under pressure restaurant by restaurant.",
  heroBadgeText: "QSR OPS",
  heroProofBlockText:
    "For franchisees, network directors, and operations teams that need earlier demand and coverage visibility.",
  heroProofRoles: ["FRANCHISEE", "NETWORK", "OPS", "FINANCE"],
  heroProofMicropill: "Demand\u00a0|\u00a0staffing\u00a0|\u00a0coverage",
  heroLogoCaption: "They trust us",
  heroOffer: {
    badge: "Our promise",
    title: "A first demand, inventory, staffing readout in 30 days",
    body: "A focused scope on top of POS, planning, inventory, and delivery to act before the next peak period.",
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
    heading: "Demand, inventory, and staffing forecasting built for the rush.",
    subheading:
      "Praedixa helps HQ and field teams anticipate demand, prepare the right inventory, and calibrate coverage for the most sensitive services.",
  },
  footerTagline:
    "Praedixa helps quick-service restaurant networks anticipate demand, inventory pressure, and staffing needs before the rush, without replacing their tools.",
  qualificationTitle: "Is Praedixa right for you?",
  qualificationBody:
    "Praedixa is built for quick-service restaurant franchise networks that want to objectify demand, inventory, and staffing trade-offs across multiple restaurants.",
  fitTitle: "A good starting point if\u2026",
  fitItems: [
    "you run multiple restaurants with recurring lunch, dinner, or delivery peaks",
    "a network or operations leader wants earlier demand, inventory, or staffing visibility",
    "POS, planning, or delivery data is already accessible at kickoff",
  ],
  notFitTitle: "Not for you if\u2026",
  notFitItems: [
    "you run a single location with no network-level challenge",
    "no operations leader can own the topic on the field or HQ side",
    "no usable POS, planning, inventory, or activity data is accessible at the start",
  ],
  stackComparison: {
    kicker: "Compatibility",
    heading: "Praedixa adds to your network stack. It projects where your tools stop.",
    subheading:
      "POS, planning, inventory, delivery, BI, spreadsheets: everything stays in place. Praedixa connects the useful signals to forecast demand, inventory pressure, and staffing needs before service and margin drift.",
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
          "Shows the past but does not tell teams where demand, inventory, or staffing will tighten before the next rush.",
        praedixaAdd:
          "Projects demand, inventory pressure, and staffing needs, then compares trade-offs before margin slips.",
      },
      {
        category: "BI / reporting",
        currentCoverage: "Shows KPIs, gaps, and trends by restaurant.",
        stopsAt:
          "Explains what happened, but not what to do on the next critical lunch or dinner period.",
        praedixaAdd:
          "Surfaces concrete trade-offs and reviews their real effect on inventory, service, and margin.",
      },
      {
        category: "Planning / WFM",
        currentCoverage: "Builds shifts, rosters, and coverage by restaurant.",
        stopsAt:
          "Builds the schedule, but does not compare network scenarios before execution.",
        praedixaAdd:
          "Projects staffing needs from demand and inventory pressure, then compares reinforcement, reallocation, or offer-simplification scenarios.",
      },
      {
        category: "Spreadsheets / committees",
        currentCoverage: "Helps HQ and field teams frame a topic quickly.",
        stopsAt:
          "Stays manual, hard to replay, and with no clear proof on demand, inventory, staffing, and margin.",
        praedixaAdd:
          "Keeps a readable log of network decisions and their actual effect.",
      },
      {
        category: "Praedixa",
        currentCoverage:
          "Adds a forecasting and decision layer on top of your existing tools to anticipate rushes and arbitrate across the network.",
        stopsAt:
          "Does not replace POS, BI, or planning. Builds on top of them.",
        praedixaAdd:
          "Anticipate demand, inventory, and staffing, compare trade-offs, then prove ROI restaurant by restaurant.",
      },
    ],
    bottomNote:
      "Compatible with existing POS, planning, inventory, delivery, BI, and export layers.",
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
      "What you buy: a first demand, inventory, staffing readout made explicit in 30 days.",
    subheading:
      "Praedixa starts on top of POS, planning, delivery, inventory, and cost data already available. If needed, a historical proof validates the topic before broader rollout.",
    timelineTitle: "In 30 days",
    timeline: [
      {
        title: "Week 1",
        body: "Frame the network, priority restaurants, critical dayparts, and the operations sponsor.",
      },
      {
        title: "Week 2",
        body: "First demand / inventory / staffing risk map with compared options from POS, planning, inventory, and delivery data.",
      },
      {
        title: "Week 3",
        body: "Recommended decision by restaurant or restaurant cluster, reviewed with ops and finance.",
      },
      {
        title: "Week 4",
        body: "Review actual impact on inventory, staffing, service, and margin, then define rollout next steps.",
      },
    ],
    deliveredTitle: "What is delivered",
    delivered: [
      "A first restaurant-by-restaurant view of demand, inventory, staffing, and service risk",
      "Compared options with explicit cost, inventory-coverage, service, and margin assumptions",
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
      "Usable POS, planning, inventory, delivery, or cost access from the start",
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
      "Final readout on demand, inventory, staffing, and protected margin",
    ],
    primaryCtaLabel: "Scope my network",
    secondaryCtaLabel: "See the historical proof",
    bottomNote:
      "The historical proof lets teams review a past peak period before scaling the network rollout.",
  },
  ...valuePropEnSections,
};
