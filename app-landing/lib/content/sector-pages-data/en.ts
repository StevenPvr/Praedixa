import {
  Factory,
  GraduationCap,
  Storefront,
  Truck,
} from "@phosphor-icons/react/ssr";
import type { SectorPageEntry } from "./types";
import { praedixaMethodSources } from "./shared";
import { sectorRoutes } from "./routes";

export const sectorPagesEn: readonly SectorPageEntry[] = [
  {
    id: "hcr",
    icon: Storefront,
    groupLabel: "Hospitality / Food service",
    slug: sectorRoutes.en.slugs.hcr,
    shortLabel: "Hospitality / Food service",
    title: "Hospitality / Food service",
    metaTitle:
      "Praedixa | Hospitality: anticipate staffing needs before service quality starts slipping",
    metaDescription:
      "Reservations, PMS, POS, schedules, absences, and labor cost. Praedixa helps hospitality teams predict staffing demand, compare trade-offs, trigger the first action, and prove ROI.",
    heroKicker: "Hospitality vertical",
    heroTitle:
      "Anticipate staffing needs before service quality starts slipping.",
    heroSubtitle:
      "Reservations, PMS, POS, schedules, absences, and labor costs already exist in your stack. Praedixa connects them to turn hospitality volatility into site-level, service-level staffing decisions.",
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
    challengeKicker: "The workforce question",
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
      "Praedixa turns staffing coverage into a governed operational decision.",
    valuePropBody:
      "Praedixa does not sell one more scheduling tool. It connects the right data, predicts staffing requirements by site and service, compares the cost/service/risk trade-offs, and documents the decision that protects both service level and margin.",
    loopKicker: "Praedixa loop",
    loopTitle:
      "A closed loop built around coverage, cost, and service quality.",
    loopIntro:
      "Each step is designed for operations leaders and finance stakeholders: see the drift earlier, compare options faster, trigger the first move, and prove what actually paid off.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Reservations, PMS, POS, schedules, absences, and labor costs are aligned into one operating view.",
      },
      {
        title: "Predict staffing requirements",
        body: "Praedixa projects coverage needs at D+3, D+7, and D+14 by site, service, and critical time slot.",
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
    kpiKicker: "KPIs to protect",
    kpiTitle: "The numbers that matter when hospitality staffing gets tight",
    kpis: [
      "Labor cost by site or outlet",
      "Overtime hours",
      "Temp / extra labor usage",
      "Coverage rate by service",
      "Wait time and service level",
      "Protected margin",
    ],
    ctaTitle: "See what Praedixa would do on your most exposed services.",
    ctaBody:
      "We start from your existing data, surface short-horizon signals, and show where coverage is too expensive or too weak to protect margin.",
    homepageHook:
      "Anticipate staffing needs before service quality starts slipping.",
    homepageStat: "336,850 planned hires, 50.2% difficult, 56.5% seasonal.",
    homepageProblem:
      "The hospitality challenge: protect service levels without letting temp labor and overtime swallow margin.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "France Travail — 2025 labor needs survey",
        url: "https://statistiques.francetravail.org/bmo/bmo?fg=IZ&pp=2025&ss=1",
      },
    ],
  },
  {
    id: "higher-education",
    icon: GraduationCap,
    groupLabel: "Higher education",
    slug: sectorRoutes.en.slugs["higher-education"],
    shortLabel: "Higher education",
    title: "Higher education",
    metaTitle:
      "Praedixa | Higher education: secure campus peaks without letting coverage cost drift",
    metaDescription:
      "Admissions, student services, exams, staffing, vacations, and payroll. Praedixa helps higher education teams forecast staffing pressure, compare trade-offs, and prove ROI.",
    heroKicker: "Higher education vertical",
    heroTitle:
      "Secure campus peak activity without letting coverage cost drift.",
    heroSubtitle:
      "Admissions, student services, exams, timetables, vacations, contract teachers, permanent staff, and payroll. Praedixa turns academic peak periods into clearer human and budget decisions.",
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
    challengeKicker: "The workforce question",
    challengeTitle:
      "How do you absorb admissions, enrollment, and exam peaks with fragmented human capacity?",
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
      "Praedixa connects academic, operational, and budget data so human needs become visible across peak periods. The platform compares the available trade-offs, helps trigger the first useful action, and measures what actually improved coverage and student-facing continuity.",
    loopKicker: "Praedixa loop",
    loopTitle: "A decision loop built for academic cycles.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it into campus language: admissions, student services, exams, adjunct coverage, and coverage cost.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Admissions, student services, timetables, exams, absences, and payroll are aligned into one operating view.",
      },
      {
        title: "Predict staffing requirements",
        body: "Praedixa projects staffing needs across enrollment, admissions, exams, and student support peaks.",
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
    kpiKicker: "KPIs to protect",
    kpiTitle: "The indicators that keep campus peak coverage under control",
    kpis: [
      "Adjunct and overtime cost",
      "Admissions / student services processing time",
      "Exam and invigilation coverage",
      "Last-minute staffing changes",
      "Service continuity during peak periods",
      "Support-team workload absorbed",
    ],
    ctaTitle: "Frame your next campus peaks on a shared decision baseline.",
    ctaBody:
      "Praedixa shows where demand will rise, what human capacity is truly available, and which staffing decision best protects cost and service continuity.",
    homepageHook:
      "Secure campus peak activity without letting coverage cost drift.",
    homepageStat:
      "3.04M students, 945,500 Parcoursup candidates, 21,080 contract teachers.",
    homepageProblem:
      "The campus challenge: absorb admissions and exam peaks with fragmented human capacity.",
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
    ],
  },
  {
    id: "logistics-transport-retail",
    icon: Truck,
    groupLabel: "Logistics / Transport / Retail",
    slug: sectorRoutes.en.slugs["logistics-transport-retail"],
    shortLabel: "Logistics / Transport / Retail",
    title: "Logistics / Transport / Retail",
    metaTitle:
      "Praedixa | Logistics, transport, retail: manage coverage at the speed of real demand",
    metaDescription:
      "Orders, WMS, TMS, promotions, schedules, absences, and labor cost. Praedixa helps logistics, transport, and retail teams forecast staffing needs, compare actions, and prove ROI site by site.",
    heroKicker: "Logistics / transport / retail vertical",
    heroTitle:
      "Manage multi-site coverage at the speed of real demand, not in hindsight.",
    heroSubtitle:
      "Orders, WMS, TMS, OMS, promo calendars, schedules, absences, site performance, and labor cost. Praedixa turns daily volume volatility into faster, cleaner, more defensible staffing trade-offs.",
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
          "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
      },
      {
        value: "90,380",
        label: "planned hires in transport and warehousing",
        detail: "47.5% are considered difficult to fill.",
        sourceLabel: "France Travail — 2025 transport and warehousing needs",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
      },
    ],
    challengeKicker: "The workforce question",
    challengeTitle:
      "How do you protect service promises when site demand shifts faster than available capacity?",
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
      "Praedixa helps teams decide earlier, before the remaining options become too expensive.",
    valuePropBody:
      "Praedixa connects orders, execution, staffing, and cost into one operating view, predicts short-horizon needs, and quantifies the trade-offs between reinforcement, reallocation, controlled promise adjustment, and protected margin.",
    loopKicker: "Praedixa loop",
    loopTitle: "A loop built for networks with moving volumes.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it here into flow, workload, promise, capacity, and site-level economics.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "Orders, WMS, TMS, OMS, schedules, absences, promotions, site performance, and cost are aligned into one baseline.",
      },
      {
        title: "Predict staffing requirements",
        body: "Praedixa projects the coverage needed at short horizon based on workload, expected peaks, and available capacity.",
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
    kpiKicker: "KPIs to protect",
    kpiTitle:
      "The numbers that make staffing decisions defensible across a network",
    kpis: [
      "Under / over-staffing rate",
      "Operating cost and overtime",
      "Temp labor usage",
      "Pick / execution productivity",
      "OTIF / SLA / service-level performance",
      "Penalties or lost sales avoided",
    ],
    ctaTitle: "See how Praedixa arbitrates a network under volume volatility.",
    ctaBody:
      "We start from demand, available capacity, and cost to show where to act first, with which lever, and what ROI to expect by site.",
    homepageHook:
      "Manage coverage at the speed of real demand, not in hindsight.",
    homepageStat:
      "€175.3B e-commerce, 183,760 retail hires, 90,380 transport / warehousing hires.",
    homepageProblem:
      "The network challenge: trade off cost, productivity, availability, and service level quickly.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "FEVAD — 2024 e-commerce review",
        url: "https://www.fevad.com/bilan-du-e-commerce-en-france-en-2024-les-ventes-sur-internet-franchissent-le-cap-des-175-milliards-deuros-en-hausse-de-96-sur-un-an/",
      },
      {
        label: "France Travail — 2025 retail labor needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
      },
      {
        label: "France Travail — 2025 transport and warehousing needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
      },
    ],
  },
  {
    id: "automotive",
    icon: Factory,
    groupLabel: "Automotive / dealerships / workshops",
    slug: sectorRoutes.en.slugs.automotive,
    shortLabel: "Automotive / dealerships / workshops",
    title: "Automotive / dealerships / workshops",
    metaTitle:
      "Praedixa | Automotive: reduce workshop delays without overloading scarce skills",
    metaDescription:
      "DMS, workshop bookings, parts availability, skills, absences, and cost. Praedixa helps dealerships and workshops forecast required hours, compare actions, and prove ROI.",
    heroKicker: "Automotive vertical",
    heroTitle:
      "Reduce workshop delays without overloading your scarcest skills.",
    heroSubtitle:
      "DMS, workshop bookings, aftersales history, parts availability, skills, absences, and cost. Praedixa turns workshop workload into quantified trade-offs on delay, absorption, coverage, and protected revenue.",
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
          "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
      },
      {
        value: "12,420",
        label: "planned vehicle mechanic hires",
        detail: "77.0% recruiting difficulty on this core workshop role.",
        sourceLabel: "France Travail — vehicle mechanic hiring data",
        sourceUrl:
          "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
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
    challengeKicker: "The workforce question",
    challengeTitle:
      "How do you absorb aftersales demand when critical skills are scarce and every staffing move affects appointment delay?",
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
      "Praedixa helps aftersales leaders arbitrate workload, skills, delay, and revenue.",
    valuePropBody:
      "Praedixa connects workshop data, skills, absences, parts, and cost to forecast required hours, compare staffing options, and document the actions that best protect customer delay, workshop absorption, and protected aftersales revenue.",
    loopKicker: "Praedixa loop",
    loopTitle: "A decision loop built for workshops and aftersales operations.",
    loopIntro:
      "Praedixa keeps the same product logic everywhere, but translates it here into appointments, backlog, skills, capacity, and workshop economics.",
    loopSteps: [
      {
        title: "Bring the data together",
        body: "DMS, bookings, aftersales history, parts availability, skills, absences, and cost are unified into one workshop baseline.",
      },
      {
        title: "Predict staffing requirements",
        body: "Praedixa projects required hours by workshop, time slot, and critical skill cluster.",
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
    kpiKicker: "KPIs to protect",
    kpiTitle:
      "The indicators that turn workshop workload into an economic decision",
    kpis: [
      "Appointment lead time",
      "Workshop backlog",
      "Sold hours vs produced hours",
      "Absorption rate",
      "Overtime hours",
      "Protected aftersales revenue",
    ],
    ctaTitle: "See how Praedixa would help your most exposed workshops.",
    ctaBody:
      "We start from bookings, skills, and cost to show where workload is likely to break customer delay and which decision best protects the workshop.",
    homepageHook:
      "Reduce workshop delays without overloading your scarcest skills.",
    homepageStat:
      "33,900 planned hires, 69.7% difficult, 17,820 unfilled postings in 2024.",
    homepageProblem:
      "The workshop challenge: absorb aftersales demand despite scarce critical skills.",
    sourceLinks: [
      ...praedixaMethodSources.en,
      {
        label: "France Travail — 2025 automotive labor needs",
        url: "https://statistiques.francetravail.org/bmo/bmo?lg=0&pp=2025&ss=1",
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
] as const;
