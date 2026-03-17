import type { SectorPageEntry } from "./types";
import {
  CampusLineIcon,
  CarServiceIcon,
  FlowNetworkIcon,
  StorefrontLineIcon,
} from "../../../components/shared/icons/MarketingIcons";
import { fitnessSectorPageEn } from "./fitness";
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
    homepageHook:
      "Arbitrate demand, coverage, and service before margin slips.",
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
    id: "higher-education",
    icon: CampusLineIcon,
    groupLabel: "Higher education",
    slug: sectorRoutes.en.slugs["higher-education"],
    shortLabel: "Higher education",
    brandLabel: "Praedixa Education",
    title: "Higher education",
    metaTitle:
      "Praedixa | Higher education: secure admissions, exams, and campus continuity without letting budget and coverage drift",
    metaDescription:
      "Admissions, student services, exams, contracts, absences, and budget. Praedixa helps higher-education teams anticipate pressure, compare capacity and continuity trade-offs, and review impact.",
    heroKicker: "Higher education vertical",
    heroTitle:
      "Secure admissions, exams, and campus continuity without letting budget and coverage drift.",
    heroSubtitle:
      "Admissions, student services, exams, timetables, adjuncts, permanent staff, absences, and payroll. Praedixa turns academic peak periods into clearer decisions on capacity, budget, student service, and academic priorities.",
    proofKicker: "Why now",
    proofTitle:
      "Institutions must absorb massive recurring peaks with already fragmented human capacity.",
    proofIntro:
      "The challenge is not just staff scheduling. It is forecasting workload, allocating scarce resources, and protecting service continuity for students during the moments that matter most.",
    proofs: [
      {
        value: "3.04M",
        label: "students in higher education in 2024-2025",
        detail: "Including 1,631,500 at universities.",
        sourceLabel: "French ministry — student counts 2024-2025",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/les-effectifs-etudiants-dans-l-enseignement-superieur-en-2024-2025-100596",
      },
      {
        value: "945,500",
        label: "Parcoursup candidates in 2024",
        detail:
          "24,000 programs and 4.2 million offers, 2.4 million on day one.",
        sourceLabel: "French ministry — Parcoursup 2024 review",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-parcoursup-2024-des-ameliorations-concretes-qui-repondent-aux-attentes-des-lyceens-97543",
      },
      {
        value: "21,080",
        label: "contract teachers in public higher education in 2024",
        detail: "They account for 25% of teaching staff excluding adjuncts.",
        sourceLabel: "French ministry — contract teachers 2024",
        sourceUrl:
          "https://www.enseignementsup-recherche.gouv.fr/fr/les-enseignants-contractuels-affectes-dans-l-enseignement-superieur-annee-2024-100753",
      },
    ],
    challengeKicker: "The business question",
    challengeTitle:
      "How do you absorb admissions, enrollment, and exam peaks without degrading service continuity or budget control?",
    challengeBody:
      "Between permanent staff, contract teachers, adjuncts, and support teams, campus coverage is never just a timetable issue. It is a trade-off between service continuity, budget, workload, and student experience.",
    challenges: [
      {
        title: "Recurring but intense peaks",
        body: "Admissions, enrollment, exams, and student support create predictable but highly concentrated demand spikes.",
      },
      {
        title: "Heterogeneous workforce",
        body: "Coverage depends on a mix of permanent staff, contracts, adjuncts, and support teams with different allocation rules.",
      },
      {
        title: "Coverage cost drift",
        body: "When signals arrive too late, overtime, adjunct coverage, and last-minute reassignment accumulate without a shared view.",
      },
    ],
    valuePropKicker: "Value proposition",
    valuePropTitle:
      "Praedixa creates a shared admissions x student services x HR x budget view.",
    valuePropBody:
      "Praedixa connects academic, operational, and budget data so human needs become visible across peak periods. The platform compares the available trade-offs, helps trigger the first useful action, and measures what actually improved coverage, student service, and campus continuity.",
    loopKicker: "Praedixa loop",
    loopTitle:
      "A decision loop built for campus workload, capacity, and continuity.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it into campus language: admissions, student services, exams, adjunct coverage, and coverage cost.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Admissions, student services, timetables, exams, absences, and payroll are aligned into one operating view.",
      },
      {
        title: "Project campus workload and capacity",
        body: "Praedixa projects pressure across admissions, registry, exams, and student services together with the capacity that can truly be mobilized.",
      },
      {
        title: "Calculate the best decision",
        body: "The platform compares overtime, adjunct coverage, reassignment, and service prioritization.",
      },
      {
        title: "Trigger the first action",
        body: "Managers start from a recommended first step that can be reviewed in governance, not improvised in the rush.",
      },
      {
        title: "Prove ROI",
        body: "Praedixa tracks coverage cost, service continuity, processing time, and operational stability through peak periods.",
      },
    ],
    kpiKicker: "Predictable KPIs",
    kpiTitle:
      "The campus indicators Praedixa can forecast before peak pressure hits",
    kpis: [
      "Applications per seat and admission pressure by program or campus",
      "Admitted-to-enrolled yield, withdrawals, and projected enrollment by program",
      "Fill rate across lecture halls, groups, labs, and practical sessions",
      "Required teaching hours versus allocated hours by discipline",
      "Coverage split between tenured staff, contract teachers, and adjuncts",
      "Risk of under-staffing in teaching or student-support teams during admissions, enrollment, and exam peaks",
      "Admissions, registry, and student-services processing time at short horizon",
      "Exam proctoring coverage and saturation risk for critical rooms or labs",
      "Coverage cost through adjuncts, overtime, and reassignment",
    ],
    decisionKicker: "Optimizable decisions",
    decisionTitle:
      "The higher-education trade-offs Praedixa can make easier to defend",
    decisions: [
      "Open, close, or resize groups, sections, programs, or time slots",
      "Adjust intake capacity and waiting-list depth",
      "Deploy interview panels, exam proctoring, or registry reinforcement earlier on saturation points",
      "Allocate teaching load across departments, statuses, and campuses",
      "Trigger contract hiring or targeted replacements earlier",
      "Prioritize disciplines to secure before retirement waves hit",
      "Reassign rooms, labs, and timetables based on projected pressure",
      "Arbitrate budget between hiring, adjunct coverage, hybrid delivery, mutualization, and student-service continuity",
      "Reallocate student-support teams during enrollment and exam peaks",
    ],
    ctaTitle: "Frame your next campus peaks on a shared decision baseline.",
    ctaBody:
      "Praedixa shows where demand will rise, what capacity is truly available, and which decision best protects budget, service continuity, and the student experience.",
    homepageHook:
      "Secure admissions, exams, and campus continuity without letting budget and coverage drift.",
    homepageStat:
      "3.04M students, 945,500 Parcoursup candidates, 21,080 contract teachers.",
    homepageProblem:
      "The campus challenge: absorb peak pressure with fragmented capacity and constrained budgets.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "French ministry — student counts 2024-2025",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-effectifs-etudiants-dans-l-enseignement-superieur-en-2024-2025-100596",
      },
      {
        label: "French ministry — Parcoursup 2024 review",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-parcoursup-2024-des-ameliorations-concretes-qui-repondent-aux-attentes-des-lyceens-97543",
      },
      {
        label: "French ministry — contract teachers 2024",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-enseignants-contractuels-affectes-dans-l-enseignement-superieur-annee-2024-100753",
      },
      {
        label: "French ministry — retirements 2024-2035",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/les-departs-en-retraite-des-enseignants-chercheurs-et-des-professeurs-du-second-degre-affectes-dans-100652",
      },
      {
        label: "French ministry — 2025 faculty recruitment review",
        url: "https://www.enseignementsup-recherche.gouv.fr/fr/bilan-provisoire-de-recrutement-des-enseignants-chercheurs-et-des-enseignants-du-second-degre-100656",
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
      "Arbitrate demand, capacity, and customer promise at the speed of the network.",
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
  {
    id: "automotive",
    icon: CarServiceIcon,
    groupLabel: "Automotive / dealerships / workshops",
    slug: sectorRoutes.en.slugs.automotive,
    shortLabel: "Automotive / dealerships / workshops",
    brandLabel: "Praedixa Automotive",
    title: "Automotive / dealerships / workshops",
    metaTitle:
      "Praedixa | Automotive: arbitrate workshop load, parts availability, and scarce skills before delays slip",
    metaDescription:
      "DMS, workshop bookings, parts availability, skills, absences, and cost. Praedixa helps dealerships and workshops anticipate load, arbitrate capacity, parts, and protected revenue, then review impact.",
    heroKicker: "Automotive vertical",
    heroTitle:
      "Arbitrate workshop load, parts availability, and scarce skills before delays slip.",
    heroSubtitle:
      "DMS, workshop bookings, aftersales history, parts availability, skills, absences, and cost. Praedixa turns workshop load into clearer decisions on delay, backlog, parts, coverage, and protected revenue.",
    proofKicker: "Why now",
    proofTitle:
      "Aftersales demand remains structural, while critical skills are harder and harder to cover.",
    proofIntro:
      "The challenge is not just filling the workshop. It is absorbing aftersales demand, protecting service quality, and controlling delays despite heavy pressure on mechanics, bodywork specialists, and qualified technicians.",
    proofs: [
      {
        value: "33,900",
        label: "planned hires in automotive trade and repair in 2025",
        detail: "69.7% are considered difficult to fill.",
        sourceLabel: "France Travail — 2025 automotive labor needs",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        value: "12,420",
        label: "planned vehicle mechanic hires",
        detail: "77.0% recruiting difficulty on this core workshop role.",
        sourceLabel: "France Travail — vehicle mechanic hiring data",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        value: "17,820",
        label: "job postings left unfilled in automotive services in 2024",
        detail: "The sector completed nearly 70,000 hires across the year.",
        sourceLabel: "ANFA — 2024 recruitment record",
        sourceUrl:
          "https://www.anfa-auto.fr/actualites/record-de-recrutements-en-2024-pour-les-services-de-lautomobile",
      },
    ],
    challengeKicker: "The business question",
    challengeTitle:
      "How do you absorb aftersales demand when scarce skills and parts availability become the real bottleneck?",
    challengeBody:
      "In automotive, staffing is not just a planning problem. It is a workshop-hours, backlog, critical-skills, parts-availability, and protected-revenue problem.",
    challenges: [
      {
        title: "Scarce critical skills",
        body: "Mechanics, bodywork specialists, and senior technicians are hard to hire while structural aftersales demand remains high.",
      },
      {
        title: "Backlog and appointment delay",
        body: "When capacity is missing, appointment lead times grow, the customer experience deteriorates, and aftersales revenue is delayed or lost.",
      },
      {
        title: "Complex operational trade-offs",
        body: "Overtime, reallocation, external reinforcement, replanning, and parts availability must be arbitrated together instead of in silos.",
      },
    ],
    valuePropKicker: "Value proposition",
    valuePropTitle:
      "Praedixa helps aftersales leaders arbitrate load, skills, parts, delay, and revenue.",
    valuePropBody:
      "Praedixa connects workshop data, skills, absences, parts, and cost to forecast load, compare action options, and document the ones that best protect customer delay, workshop absorption, parts availability, and aftersales revenue.",
    loopKicker: "Praedixa loop",
    loopTitle:
      "A decision loop built for workshops, parts, and aftersales operations.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it here into appointments, backlog, skills, capacity, and workshop economics.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "DMS, bookings, aftersales history, parts availability, skills, absences, and cost are unified into one workshop baseline.",
      },
      {
        title: "Project load, skills, and parts bottlenecks",
        body: "Praedixa projects required hours by workshop, time slot, and critical skill cluster, plus the parts bottlenecks likely to extend delay.",
      },
      {
        title: "Calculate the best decision",
        body: "The platform compares overtime, reallocation, external reinforcement, and replanning.",
      },
      {
        title: "Trigger the first action",
        body: "Workshop managers start from an immediate recommended action already tied to expected impact.",
      },
      {
        title: "Prove ROI",
        body: "Praedixa tracks workshop delay, covered load, absorption, overtime, and protected revenue.",
      },
    ],
    kpiKicker: "Predictable KPIs",
    kpiTitle:
      "The workshop indicators Praedixa can forecast before delays start drifting",
    kpis: [
      "Appointment lead time and open workshop load by day, bay, or intervention type",
      "Workshop backlog and required hours by intervention type",
      "Required hours by workshop, time slot, and critical skill cluster",
      "Parts fill rate, backorder risk, and supply lead time by critical reference",
      "Sold versus produced hours, technician efficiency, bay occupancy, and absorption",
      "Risk of delay from missing parts, no-shows, comeback work, or skill shortages",
      "Expected overtime, external reinforcement, and replanning volume",
      "Protected aftersales revenue, exposed CSI, and aftersales churn risk under each coverage choice",
    ],
    decisionKicker: "Optimizable decisions",
    decisionTitle: "The workshop trade-offs Praedixa can help leaders optimize",
    decisions: [
      "Allocate technicians by bay, time slot, and critical skill",
      "Open extra appointment slots or replan lower-priority bookings",
      "Choose between overtime, reallocation, external reinforcement, or subcontracting",
      "Move workload across workshops or dealerships when one site saturates",
      "Prioritize the highest-value or highest-urgency jobs first",
      "Trigger parts escalation, inter-site transfers, or procurement action on predicted bottlenecks",
      "Decide when to train, cross-skill, or protect scarce capabilities",
      "Choose which jobs to protect first to preserve customer delay, CSI, and aftersales retention",
    ],
    ctaTitle: "See how Praedixa would help your most exposed workshops.",
    ctaBody:
      "We start from bookings, skills, parts, and cost to show where load is likely to break customer delay and which decision best protects the workshop.",
    homepageHook:
      "Arbitrate workshop load, parts, and skills before customer delays drift.",
    homepageStat:
      "33,900 planned hires, 69.7% difficult, 17,820 unfilled postings in 2024.",
    homepageProblem:
      "The workshop challenge: absorb aftersales demand despite scarce skills and parts bottlenecks.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "France Travail — 2025 automotive labor needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=GA&le=0&pp=2025&ss=1",
      },
      {
        label: "ANFA — 2024 recruitment record",
        url: "https://www.anfa-auto.fr/actualites/record-de-recrutements-en-2024-pour-les-services-de-lautomobile",
      },
      {
        label: "ACEA — average age of the EU vehicle fleet",
        url: "https://www.acea.auto/figure/average-age-of-eu-vehicle-fleet-by-country/",
      },
    ],
  },
  fitnessSectorPageEn,
] as const;
