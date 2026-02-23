export type TimelineScenarioId = "ops-rollover";
export type TimelineTickId = "D0_AM" | "D0_PM" | "D1_AM";

export interface TimelineCoverageAlert {
  id: string;
  organizationId: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  horizon: "j3" | "j7" | "j14";
  pRupture: number;
  gapH: number;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "acknowledged" | "resolved" | "expired";
  driversJson: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineDecisionQueueItem {
  id: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  severity: "critical" | "high" | "medium" | "low";
  horizon: "j3" | "j7" | "j14";
  gapH: number;
  pRupture: number;
  driversJson: string[];
  priorityScore: number;
  estimatedImpactEur: number;
  timeToBreachHours: number;
}

export interface TimelineForecastPoint {
  forecastDate: string;
  dimension: "human" | "merchandise";
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface TimelineScenarioOption {
  id: string;
  coverageAlertId: string;
  costParameterId: string;
  optionType: "hs" | "interim" | "realloc_intra";
  label: string;
  coutTotalEur: number;
  serviceAttenduPct: number;
  heuresCouvertes: number;
  isParetoOptimal: boolean;
  isRecommended: boolean;
  contraintesJson: Record<string, unknown>;
}

export interface TimelineTickSnapshot {
  now: string;
  coverageAlerts: TimelineCoverageAlert[];
  decisionQueue: TimelineDecisionQueueItem[];
  forecasts: {
    human: TimelineForecastPoint[];
    merchandise: TimelineForecastPoint[];
  };
  optionsByAlertId: Record<string, TimelineScenarioOption[]>;
}

export interface TimelineScenarioDefinition {
  id: TimelineScenarioId;
  initialTick: TimelineTickId;
  ticks: Record<TimelineTickId, TimelineTickSnapshot>;
}

const ORG_ID = "org-00000000-0000-0000-0000-000000000001";
const COST_PARAMETER_ID = "cp-00000000-0000-0000-0000-000000000001";
const CREATED_AT = "2026-02-09T12:00:00Z";
const UPDATED_AT = "2026-02-09T12:00:00Z";

function buildOptions(
  alertId: string,
  baseCost: number,
): TimelineScenarioOption[] {
  return [
    {
      id: `${alertId}-opt-hs`,
      coverageAlertId: alertId,
      costParameterId: COST_PARAMETER_ID,
      optionType: "hs",
      label: "Heures supplementaires",
      coutTotalEur: baseCost,
      serviceAttenduPct: 84,
      heuresCouvertes: 6,
      isParetoOptimal: true,
      isRecommended: false,
      contraintesJson: {},
    },
    {
      id: `${alertId}-opt-interim`,
      coverageAlertId: alertId,
      costParameterId: COST_PARAMETER_ID,
      optionType: "interim",
      label: "Interim",
      coutTotalEur: baseCost + 900,
      serviceAttenduPct: 94,
      heuresCouvertes: 10,
      isParetoOptimal: true,
      isRecommended: true,
      contraintesJson: {},
    },
    {
      id: `${alertId}-opt-realloc`,
      coverageAlertId: alertId,
      costParameterId: COST_PARAMETER_ID,
      optionType: "realloc_intra",
      label: "Reallocation intra-site",
      coutTotalEur: Math.max(baseCost - 400, 300),
      serviceAttenduPct: 76,
      heuresCouvertes: 5,
      isParetoOptimal: false,
      isRecommended: false,
      contraintesJson: {},
    },
  ];
}

function buildForecastSeries(
  startDate: string,
  dimension: "human" | "merchandise",
  values: Array<{
    demand: number;
    capacity: number;
    planned: number;
    optimal: number;
    risk: number;
  }>,
): TimelineForecastPoint[] {
  const baseDate = new Date(`${startDate}T00:00:00Z`);
  return values.map((item, index) => {
    const d = new Date(baseDate);
    d.setUTCDate(baseDate.getUTCDate() + index);
    const forecastDate = d.toISOString().slice(0, 10);
    return {
      forecastDate,
      dimension,
      predictedDemand: item.demand,
      predictedCapacity: item.capacity,
      capacityPlannedCurrent: item.planned,
      capacityPlannedPredicted: item.planned + 1,
      capacityOptimalPredicted: item.optimal,
      gap: item.demand - item.capacity,
      riskScore: item.risk,
      confidenceLower: Math.max(item.demand - 8, 0),
      confidenceUpper: item.demand + 8,
    };
  });
}

const TICK_D0_AM_ALERTS: TimelineCoverageAlert[] = [
  {
    id: "alert-ops-d0am-lyon",
    organizationId: ORG_ID,
    siteId: "Lyon-Sat",
    alertDate: "2026-02-10",
    shift: "am",
    horizon: "j3",
    pRupture: 0.78,
    gapH: 14.2,
    severity: "critical",
    status: "open",
    driversJson: ["Absenteisme eleve", "Backlog en hausse"],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "alert-ops-d0am-paris",
    organizationId: ORG_ID,
    siteId: "Paris-CDG",
    alertDate: "2026-02-10",
    shift: "pm",
    horizon: "j7",
    pRupture: 0.56,
    gapH: 8.6,
    severity: "high",
    status: "open",
    driversJson: ["Demande previsionnelle elevee"],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
];

const TICK_D0_PM_ALERTS: TimelineCoverageAlert[] = [
  {
    id: "alert-ops-d0pm-paris",
    organizationId: ORG_ID,
    siteId: "Paris-CDG",
    alertDate: "2026-02-10",
    shift: "pm",
    horizon: "j3",
    pRupture: 0.71,
    gapH: 12.1,
    severity: "critical",
    status: "open",
    driversJson: ["Service degrade", "Backlog en hausse"],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "alert-ops-d0pm-mrs",
    organizationId: ORG_ID,
    siteId: "Marseille",
    alertDate: "2026-02-10",
    shift: "pm",
    horizon: "j7",
    pRupture: 0.44,
    gapH: 6.3,
    severity: "medium",
    status: "open",
    driversJson: ["Meteo defavorable"],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
];

const TICK_D1_AM_ALERTS: TimelineCoverageAlert[] = [];

const OPS_ROLLOVER_SCENARIO: TimelineScenarioDefinition = {
  id: "ops-rollover",
  initialTick: "D0_AM",
  ticks: {
    D0_AM: {
      now: "2026-02-10T06:00:00Z",
      coverageAlerts: TICK_D0_AM_ALERTS,
      decisionQueue: [
        {
          id: "alert-ops-d0am-lyon",
          siteId: "Lyon-Sat",
          alertDate: "2026-02-10",
          shift: "am",
          severity: "critical",
          horizon: "j3",
          gapH: 14.2,
          pRupture: 0.78,
          driversJson: ["Absenteisme eleve", "Backlog en hausse"],
          priorityScore: 98,
          estimatedImpactEur: 3890,
          timeToBreachHours: 9,
        },
        {
          id: "alert-ops-d0am-paris",
          siteId: "Paris-CDG",
          alertDate: "2026-02-10",
          shift: "pm",
          severity: "high",
          horizon: "j7",
          gapH: 8.6,
          pRupture: 0.56,
          driversJson: ["Demande previsionnelle elevee"],
          priorityScore: 82,
          estimatedImpactEur: 2240,
          timeToBreachHours: 22,
        },
      ],
      forecasts: {
        human: buildForecastSeries("2026-02-10", "human", [
          {
            demand: 125,
            capacity: 118,
            planned: 117,
            optimal: 126,
            risk: 0.41,
          },
          {
            demand: 127,
            capacity: 119,
            planned: 118,
            optimal: 128,
            risk: 0.43,
          },
          {
            demand: 129,
            capacity: 120,
            planned: 119,
            optimal: 130,
            risk: 0.45,
          },
        ]),
        merchandise: buildForecastSeries("2026-02-10", "merchandise", [
          {
            demand: 226,
            capacity: 220,
            planned: 218,
            optimal: 228,
            risk: 0.34,
          },
          {
            demand: 231,
            capacity: 222,
            planned: 220,
            optimal: 232,
            risk: 0.37,
          },
          {
            demand: 235,
            capacity: 224,
            planned: 221,
            optimal: 236,
            risk: 0.39,
          },
        ]),
      },
      optionsByAlertId: {
        "alert-ops-d0am-lyon": buildOptions("alert-ops-d0am-lyon", 2900),
        "alert-ops-d0am-paris": buildOptions("alert-ops-d0am-paris", 2400),
      },
    },
    D0_PM: {
      now: "2026-02-10T14:00:00Z",
      coverageAlerts: TICK_D0_PM_ALERTS,
      decisionQueue: [
        {
          id: "alert-ops-d0pm-paris",
          siteId: "Paris-CDG",
          alertDate: "2026-02-10",
          shift: "pm",
          severity: "critical",
          horizon: "j3",
          gapH: 12.1,
          pRupture: 0.71,
          driversJson: ["Service degrade", "Backlog en hausse"],
          priorityScore: 95,
          estimatedImpactEur: 3320,
          timeToBreachHours: 12,
        },
        {
          id: "alert-ops-d0pm-mrs",
          siteId: "Marseille",
          alertDate: "2026-02-10",
          shift: "pm",
          severity: "medium",
          horizon: "j7",
          gapH: 6.3,
          pRupture: 0.44,
          driversJson: ["Meteo defavorable"],
          priorityScore: 68,
          estimatedImpactEur: 1710,
          timeToBreachHours: 31,
        },
      ],
      forecasts: {
        human: buildForecastSeries("2026-02-10", "human", [
          {
            demand: 127,
            capacity: 116,
            planned: 116,
            optimal: 129,
            risk: 0.52,
          },
          {
            demand: 130,
            capacity: 117,
            planned: 116,
            optimal: 132,
            risk: 0.56,
          },
          {
            demand: 132,
            capacity: 118,
            planned: 117,
            optimal: 134,
            risk: 0.58,
          },
        ]),
        merchandise: buildForecastSeries("2026-02-10", "merchandise", [
          {
            demand: 230,
            capacity: 219,
            planned: 217,
            optimal: 232,
            risk: 0.42,
          },
          {
            demand: 236,
            capacity: 220,
            planned: 218,
            optimal: 238,
            risk: 0.46,
          },
          {
            demand: 241,
            capacity: 221,
            planned: 219,
            optimal: 243,
            risk: 0.49,
          },
        ]),
      },
      optionsByAlertId: {
        "alert-ops-d0pm-paris": buildOptions("alert-ops-d0pm-paris", 3100),
        "alert-ops-d0pm-mrs": buildOptions("alert-ops-d0pm-mrs", 1900),
      },
    },
    D1_AM: {
      now: "2026-02-11T06:00:00Z",
      coverageAlerts: TICK_D1_AM_ALERTS,
      decisionQueue: [],
      forecasts: {
        human: buildForecastSeries("2026-02-11", "human", [
          {
            demand: 119,
            capacity: 121,
            planned: 120,
            optimal: 120,
            risk: 0.16,
          },
          {
            demand: 121,
            capacity: 123,
            planned: 121,
            optimal: 122,
            risk: 0.15,
          },
          {
            demand: 124,
            capacity: 125,
            planned: 123,
            optimal: 124,
            risk: 0.18,
          },
        ]),
        merchandise: buildForecastSeries("2026-02-11", "merchandise", [
          {
            demand: 218,
            capacity: 223,
            planned: 221,
            optimal: 219,
            risk: 0.14,
          },
          {
            demand: 220,
            capacity: 224,
            planned: 222,
            optimal: 221,
            risk: 0.13,
          },
          {
            demand: 224,
            capacity: 226,
            planned: 223,
            optimal: 224,
            risk: 0.15,
          },
        ]),
      },
      optionsByAlertId: {},
    },
  },
};

const SCENARIOS: Record<TimelineScenarioId, TimelineScenarioDefinition> = {
  "ops-rollover": OPS_ROLLOVER_SCENARIO,
};

export function getTimelineScenario(
  scenarioId: TimelineScenarioId,
): TimelineScenarioDefinition {
  return SCENARIOS[scenarioId];
}
