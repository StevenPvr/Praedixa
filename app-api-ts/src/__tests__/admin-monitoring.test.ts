import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    queryRows: vi.fn(),
  };
});

import {
  getPersistentAdminOrgMirror,
  getPersistentMonitoringMissingCostParams,
  getPersistentPlatformKpis,
} from "../services/admin-monitoring.js";
import { queryRows } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const mockedQueryRows = vi.mocked(queryRows);

describe("admin monitoring persistence helpers", () => {
  beforeEach(() => {
    mockedQueryRows.mockReset();
  });

  it("computes platform rates from persisted counters", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        total_organizations: "4",
        active_organizations: "3",
        total_users: "42",
        total_datasets: "10",
        total_forecasts: "25",
        total_decisions: "15",
        ingestion_total: "20",
        ingestion_successes: "19",
        forecast_failures: "2",
      },
    ] as never);

    const result = await getPersistentPlatformKpis();

    expect(result).toMatchObject({
      totalOrganizations: 4,
      activeOrganizations: 3,
      totalUsers: 42,
      totalDatasets: 10,
      totalForecasts: 25,
      totalDecisions: 15,
      ingestionSuccessRate: 95,
      apiErrorRate: 8,
    });
  });

  it("maps missing cost parameters for both homepage and settings views", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        org_id: ORGANIZATION_ID,
        org_name: "Acme Logistics",
        missing_sites: "2",
        total_sites: "5",
      },
    ] as never);

    const result = await getPersistentMonitoringMissingCostParams();

    expect(result).toMatchObject({
      totalOrgsWithMissing: 1,
      totalMissingParams: 16,
      organizations: [
        {
          orgId: ORGANIZATION_ID,
          orgName: "Acme Logistics",
          missingSites: 2,
          totalSites: 5,
        },
      ],
      orgs: [
        {
          organizationId: ORGANIZATION_ID,
          totalMissing: 16,
        },
      ],
    });
    expect(result.orgs[0]?.missingTypes).toContain("c_int");
  });

  it("maps organization mirror KPIs from persisted aggregates", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        total_employees: "120",
        total_sites: "3",
        active_alerts: "4",
        forecast_accuracy: "0.924",
        avg_absenteeism: "0.048",
        coverage_rate: "0.963",
      },
    ] as never);

    const result = await getPersistentAdminOrgMirror(ORGANIZATION_ID);

    expect(result).toMatchObject({
      orgId: ORGANIZATION_ID,
      totalEmployees: 120,
      totalSites: 3,
      activeAlerts: 4,
      forecastAccuracy: 0.924,
      avgAbsenteeism: 0.048,
      coverageRate: 0.963,
    });
  });
});
