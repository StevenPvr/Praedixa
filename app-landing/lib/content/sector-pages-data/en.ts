import type { SectorPageEntry } from "./types";
import {
  FlowNetworkIcon,
  StorefrontLineIcon,
} from "../../../components/shared/icons/MarketingIcons";
import { praedixaMethodSources } from "./shared";
import { sectorRoutes } from "./routes";

export const sectorPagesEn: readonly SectorPageEntry[] = [
  {
    id: "hcr",
    icon: StorefrontLineIcon,
    groupLabel: "Hospitality / Food service",
    slug: sectorRoutes.en.slugs.hcr,
    shortLabel: "Hospitality / Food service",
    brandLabel: "Praedixa HCR",
    title: "Hospitality / Food service",
    metaTitle:
      "Praedixa | Hospitality: arbitrate demand, coverage, and service before margin slips",
    metaDescription:
      "Reservations, PMS, POS, schedules, absences, and labor cost. Praedixa helps hospitality teams anticipate demand, compare coverage and service trade-offs, and review margin impact.",
    heroKicker: "Hospitality vertical",
    heroTitle:
      "Arbitrate demand, coverage, and service level before margin slips.",
    heroSubtitle:
      "Reservations, PMS, POS, schedules, absences, and labor costs already exist in your stack. Praedixa connects them to turn hospitality volatility into clearer decisions on coverage, opening windows, service promise, and margin by site.",
    proofKicker: "Why now",
    proofTitle:
      "Hospitality combines strong seasonality, fast demand shifts, and structural hiring pressure.",
    proofIntro:
      "The challenge is not just scheduling. It is maintaining the right service level through sharp demand swings without letting overtime, temp labor, and short-notice reinforcements erase margin.",
    proofs: [
      {
        value: "336,850",
        label: "planned hires in accommodation and food service in 2025",
        detail: "50.2% are considered difficult to fill.",
        sourceLabel: "France Travail — 2025 labor needs survey",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        value: "56.5%",
        label: "of sector hiring is seasonal",
        detail: "Human capacity does not flex as fast as real demand.",
        sourceLabel: "France Travail — 2025 labor needs survey",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        value: "107,810",
        label: "planned server hires",
        detail: "49.6% recruiting difficulty on this core frontline role.",
        sourceLabel: "France Travail — server hiring data",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
    ],
    challengeKicker: "The business question",
    challengeTitle:
      "How do you protect service quality when demand accelerates faster than available staff?",
    challengeBody:
      "In hospitality, understaffing hurts the guest experience immediately. Overstaffing destroys margin just as fast. Teams need to arbitrate cost, service, and risk earlier, not add another scheduling tool.",
    challenges: [
      {
        title: "Sharp demand peaks",
        body: "Weekends, weather, local events, and late bookings change staffing needs with very little notice.",
      },
      {
        title: "Expensive last-minute coverage",
        body: "If the signal arrives too late, the remaining options are almost always more expensive: overtime, temp staff, extras, or degraded service.",
      },
      {
        title: "Margin vs service trade-offs",
        body: "Every staffing decision directly affects wait time, perceived quality, average ticket, and protected margin.",
      },
    ],
    valuePropKicker: "Value proposition",
    valuePropTitle:
      "Praedixa turns hospitality volatility into more defensible service and margin decisions.",
    valuePropBody:
      "Praedixa does not sell one more scheduling tool. It connects demand, coverage, cost, and service-level signals, compares the available trade-offs, and helps launch the first useful action on staffing, opening hours, service promise, or frontline retention.",
    loopKicker: "Praedixa loop",
    loopTitle:
      "A closed loop built around demand, coverage, service, and margin.",
    loopIntro:
      "Each step is designed for operations leaders and finance stakeholders: see the drift earlier, compare options faster, trigger the first move, and prove what actually paid off.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Reservations, PMS, POS, schedules, absences, and labor costs are aligned into one operating view.",
      },
      {
        title: "Project demand and useful coverage",
        body: "Praedixa projects at D+3, D+7, and D+14 where demand, coverage, and service level will tighten by site, service, and critical time slot.",
      },
      {
        title: "Calculate the best decision",
        body: "The platform compares overtime, extras, temp labor, reallocation, and controlled service adjustments.",
      },
      {
        title: "Trigger the first action",
        body: "Managers start from a recommended first move instead of improvising under pressure.",
      },
      {
        title: "Prove ROI",
        body: "Praedixa tracks labor cost, coverage, wait time, and protected margin in a readable decision log.",
      },
    ],
    kpiKicker: "Predictable KPIs",
    kpiTitle:
      "The hospitality signals Praedixa can forecast before service quality starts slipping",
    kpis: [
      "Demand by site, day, service, and channel: nights, covers, occupancy rate, average ticket",
      "No-show, late-cancellation, and group/event pressure risk by time slot",
      "Required labor hours by role, shift, and critical daypart",
      "Coverage rate across service, kitchen, reception, and housekeeping shifts",
      "Absence or under-coverage risk by team and contract mix",
      "Expected overtime, temp, and extra-labor usage at short horizon",
      "Wait time, table turns, service level, and review-risk exposure",
      "Revenue per labor hour, RevPAR, and protected margin by coverage scenario",
      "Frontline turnover or seasonal attrition risk on the most exposed properties",
    ],
    decisionKicker: "Optimizable decisions",
    decisionTitle:
      "The hospitality staffing decisions Praedixa can help teams arbitrate earlier",
    decisions: [
      "How many servers, cooks, reception staff, or housekeeping agents to schedule by shift",
      "Which groups, service windows, terraces, or openings to accept, limit, or resize when capacity tightens",
      "When to launch seasonal hiring and on which priority roles",
      "When to open, close, or reduce a room, floor, service line, or opening window",
      "When to rely on extras or temp staff versus internal multi-skilling",
      "Which sites to prioritize for cross-training, retention, or short-term reinforcement",
      "When to adapt the service promise or commercial pressure to protect margin",
      "Which properties need housing, transport, or retention action to hold the season",
    ],
    ctaTitle: "See what Praedixa would do on your most exposed services.",
    ctaBody:
      "We start from your existing data, surface short-horizon signals, and show where demand, coverage, or the service promise are eroding margin too quickly.",
    homepageHook: "Anticipate demand peaks and optimize your resources.",
    homepageStat: "336,850 planned hires, 50.2% difficult, 56.5% seasonal.",
    homepageProblem:
      "The hospitality challenge: protect service levels without letting demand shocks, temp labor, and overtime swallow margin.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "France Travail — 2025 labor needs survey",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
      {
        label: "Insee — hospitality employment Q1 2025",
        url: "https://www.bnsp.insee.fr/ark%3A/12148/bc6p09p7qj4.pdf",
      },
      {
        label: "Insee Focus 363 — summer tourism 2025",
        url: "https://www.insee.fr/fr/statistiques/8645986",
      },
    ],
  },
  {
    id: "logistics-transport-retail",
    icon: FlowNetworkIcon,
    groupLabel: "Logistics / Transport / Retail",
    slug: sectorRoutes.en.slugs["logistics-transport-retail"],
    shortLabel: "Logistics / Transport / Retail",
    brandLabel: "Praedixa Operations",
    title: "Logistics / Transport / Retail",
    metaTitle:
      "Praedixa | Logistics, transport, retail: arbitrate demand, capacity, and customer promise at network speed",
    metaDescription:
      "Orders, WMS, TMS, OMS, promotions, inventory, schedules, and cost. Praedixa helps logistics, transport, and retail teams anticipate demand, arbitrate capacity, inventory, and service, then review ROI site by site.",
    heroKicker: "Logistics / transport / retail vertical",
    heroTitle:
      "Arbitrate demand, capacity, and customer promise at the speed of the network.",
    heroSubtitle:
      "Orders, WMS, TMS, OMS, promo calendars, inventory, schedules, absences, site performance, and labor cost. Praedixa turns daily volume volatility into faster decisions on coverage, flow, service level, and margin.",
    proofKicker: "Why now",
    proofTitle:
      "Demand moves faster than staffing capacity, and every coverage decision hits service performance directly.",
    proofIntro:
      "In logistics, transport, and retail, the challenge is not just filling teams. It is choosing every day between cost, availability, productivity, customer promise, and operational risk.",
    proofs: [
      {
        value: "€175.3B",
        label: "French e-commerce sales in 2024",
        detail: "2.6 billion transactions across the year.",
        sourceLabel: "FEVAD — 2024 e-commerce review",
        sourceUrl:
          "https://www.fevad.com/bilan-du-e-commerce-en-france-en-2024-les-ventes-sur-internet-franchissent-le-cap-des-175-milliards-deuros-en-hausse-de-96-sur-un-an/",
      },
      {
        value: "183,760",
        label: "planned hires in retail in 2025",
        detail: "37.4% difficult to fill and 33.4% seasonal.",
        sourceLabel: "France Travail — 2025 retail labor needs",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GC&le=0&pp=2025&ss=1",
      },
      {
        value: "90,380",
        label: "planned hires in transport and warehousing",
        detail: "47.5% are considered difficult to fill.",
        sourceLabel: "France Travail — 2025 transport and warehousing needs",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=HZ&le=0&pp=2025&ss=1",
      },
    ],
    challengeKicker: "The business question",
    challengeTitle:
      "How do you protect the customer promise when demand, capacity, and product availability move faster than the network?",
    challengeBody:
      "In these networks, every staffing decision has a double effect: it changes cost today and service tomorrow. Without a shared view, teams decide too late between overtime, temp labor, inter-site reallocation, delayed volume, or adjusted service promise.",
    challenges: [
      {
        title: "Volume volatility",
        body: "Orders, promotions, returns, route pressure, and commercial calendars change staffing needs faster than organizations can absorb.",
      },
      {
        title: "Multi-site trade-offs",
        body: "Leaders must decide between local overload, inter-site reallocation, external reinforcement, or temporary service-level adjustment.",
      },
      {
        title: "Cost and service move together",
        body: "Under-coverage creates delays, penalties, lost sales, and local saturation. Over-coverage hurts productivity and margin immediately.",
      },
    ],
    valuePropKicker: "Value proposition",
    valuePropTitle:
      "Praedixa helps teams arbitrate earlier between capacity, inventory, promise, and margin.",
    valuePropBody:
      "Praedixa connects orders, execution, staffing, inventory availability, and cost into one operating view, predicts short-horizon needs, and quantifies the trade-offs between reinforcement, reallocation, inventory coverage, promise adjustment, and protected margin.",
    loopKicker: "Praedixa loop",
    loopTitle:
      "A loop built for networks where demand, capacity, and service move every day.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it here into flow, workload, promise, capacity, and site-level economics.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Orders, WMS, TMS, OMS, schedules, absences, promotions, site performance, and cost are aligned into one baseline.",
      },
      {
        title: "Project workload, capacity, and availability",
        body: "Praedixa projects short-horizon demand, available capacity, and where inventory, flow, or the customer promise are likely to tighten.",
      },
      {
        title: "Calculate the best decision",
        body: "The platform compares overtime, temp labor, inter-site reallocation, delayed volume, and service-level adjustment.",
      },
      {
        title: "Trigger the first action",
        body: "Site and network leaders start from a prioritized first move with a quantified rationale.",
      },
      {
        title: "Prove ROI",
        body: "Praedixa tracks cost, coverage, productivity, OTIF/SLA performance, and protected margin across the network.",
      },
    ],
    kpiKicker: "Predictable KPIs",
    kpiTitle:
      "The network indicators Praedixa can forecast before operations break",
    kpis: [
      "Demand by site, hour, channel, and activity: orders, order lines, pallets, routes, store traffic, or critical SKUs",
      "Inventory coverage, stockout risk, and product availability by site, channel, or category",
      "Dock, route, carrier-slot, or cut-off saturation on critical flows",
      "Required labor hours by activity, shift, and critical site",
      "Under- and over-staffing rate by site and time window",
      "OTIF, SLA, delivery-delay, or service-promise risk",
      "Expected overtime, temp labor, absenteeism, and no-show at short horizon",
      "Pick, execution, route, or in-store productivity under each staffing scenario",
      "Backlog, congestion, penalties, or lost sales avoided",
      "Operating cost and protected margin by site",
    ],
    decisionKicker: "Optimizable decisions",
    decisionTitle:
      "The logistics / transport / retail trade-offs Praedixa can help optimize",
    decisions: [
      "Transfer inventory, workload, or orders across warehouses, stores, or picking zones",
      "Accelerate, delay, or smooth replenishment, inbound receipts, or carrier appointments",
      "Reallocate workload, teams, or volume across sites, warehouses, stores, or routes",
      "Choose between overtime, temp labor, subcontracting, or delayed volume",
      "Open an additional shift, reduce an opening window, or adjust an operational cut-off",
      "Prioritize orders, routes, stores, promotions, or SKUs when capacity tightens",
      "Adapt the promised service level to the coverage that is actually available",
      "Decide which sites to protect first during a promo peak or network incident",
      "Trigger transport reinforcement, inter-site balancing, or a load-shedding plan",
    ],
    ctaTitle: "See how Praedixa arbitrates a network under volume volatility.",
    ctaBody:
      "We start from demand, available capacity, inventory, and cost to show where to act first, with which lever, and what ROI to expect by site.",
    homepageHook:
      "Optimize your flows and meet your customer promise in real time.",
    homepageStat:
      "€175.3B e-commerce, 183,760 retail hires, 90,380 transport / warehousing hires.",
    homepageProblem:
      "The network challenge: decide quickly across cost, availability, inventory, productivity, and service level.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "FEVAD — 2024 e-commerce review",
        url: "https://www.fevad.com/bilan-du-e-commerce-en-france-en-2024-les-ventes-sur-internet-franchissent-le-cap-des-175-milliards-deuros-en-hausse-de-96-sur-un-an/",
      },
      {
        label: "France Travail — 2025 retail labor needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=GC&le=0&pp=2025&ss=1",
      },
      {
        label: "France Travail — 2025 transport and warehousing needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=HZ&le=0&pp=2025&ss=1",
      },
      {
        label: "Praedixa — logistics WFM overview",
        url: "https://www.praedixa.com/fr/ressources/wfm-logistique",
      },
    ],
  },
] as const;
