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
  getPersistentGoldProvenance,
  listPersistentGoldRows,
} from "../services/gold-explorer.js";
import { queryRows } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const mockedQueryRows = vi.mocked(queryRows);

describe("gold explorer persistence helpers", () => {
  beforeEach(() => {
    mockedQueryRows.mockReset();
  });

  it("maps persistent gold rows with strict site scoping", async () => {
    mockedQueryRows.mockResolvedValueOnce([
      {
        client_slug: "acme-logistics",
        site_id: "site-lyon",
        site_code: "LYN",
        date: "2026-03-07",
        shift: "am",
        model_version: "persistent-canonical-v1",
        load_hours: "120.5",
        capacity_hours: "112.0",
        abs_h: "4.0",
        hs_h: "2.5",
        interim_h: "1.0",
        gap_h: "8.5",
        risk_score: "0.24",
        has_alert: true,
      },
    ] as never);

    const result = await listPersistentGoldRows({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-lyon",
      },
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });

    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("FROM canonical_records cr");
    expect(sql).toContain("cr.site_id = $2");
    expect(values).toEqual([
      ORGANIZATION_ID,
      "site-lyon",
      "2026-03-01",
      "2026-03-31",
    ]);
    expect(result).toMatchObject([
      {
        client_slug: "acme-logistics",
        site_id: "site-lyon",
        site_code: "LYN",
        load_hours: 120.5,
        gap_h: 8.5,
        has_alert: true,
      },
    ]);
  });

  it("returns persistent provenance metadata without mock allowances", async () => {
    mockedQueryRows.mockResolvedValueOnce([] as never);

    const result = await getPersistentGoldProvenance({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: true,
        accessibleSiteIds: [],
        requestedSiteId: null,
      },
    });

    expect(result).toMatchObject({
      revision: "postgres-gold-v1",
      sourcePath: "postgresql://public.canonical_records+coverage_alerts",
      scopedRows: 0,
      policy: {
        allowedMockDomains: [],
        forecastMockColumns: [],
        nonForecastMockColumns: [],
        strictDataPolicyOk: true,
      },
    });
  });

  it("fails closed when a requested site falls outside the accessible scope", async () => {
    mockedQueryRows.mockResolvedValueOnce([] as never);

    await listPersistentGoldRows({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-paris",
      },
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });

    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("AND FALSE");
    expect(values).toEqual([ORGANIZATION_ID, "2026-03-01", "2026-03-31"]);
  });

  it("constrains non-org-wide reads to the accessible site allowlist when no site is requested", async () => {
    mockedQueryRows.mockResolvedValueOnce([] as never);

    await listPersistentGoldRows({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon", "site-paris"],
        requestedSiteId: null,
      },
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });

    const [sql, values] = mockedQueryRows.mock.calls[0] ?? [];
    expect(sql).toContain("cr.site_id = ANY($2::text[])");
    expect(values).toEqual([
      ORGANIZATION_ID,
      ["site-lyon", "site-paris"],
      "2026-03-01",
      "2026-03-31",
    ]);
  });
});
