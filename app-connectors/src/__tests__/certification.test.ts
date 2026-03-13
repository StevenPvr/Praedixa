import { describe, expect, it } from "vitest";

import { CONNECTOR_CATALOG } from "../catalog.js";
import {
  CONNECTOR_CERTIFICATION_MATRIX,
  validateConnectorCertificationMatrix,
} from "../certification.js";
import {
  expectCatalogParity,
  expectRepresentativeCertificationFixture,
  expectStandardConnectorCertification,
  expectStrictLayerSeparationPolicy,
} from "./certification-harness.js";
import { CONNECTOR_CERTIFICATION_FIXTURES } from "./fixtures/certification-fixtures.js";

describe("connector certification matrix", () => {
  it("covers every catalog connector exactly once", () => {
    expect(CONNECTOR_CERTIFICATION_MATRIX).toHaveLength(
      CONNECTOR_CATALOG.length,
    );

    const vendors = CONNECTOR_CERTIFICATION_MATRIX.map((row) => row.vendor);
    expect(new Set(vendors).size).toBe(vendors.length);
    expect(vendors).toEqual(CONNECTOR_CATALOG.map((item) => item.vendor));
  });

  it("stays aligned with the runtime connector catalog", () => {
    for (const item of CONNECTOR_CATALOG) {
      const row = CONNECTOR_CERTIFICATION_MATRIX.find(
        (candidate) => candidate.vendor === item.vendor,
      );

      expect(row).toBeDefined();
      expectCatalogParity(row!, item);
      expectStandardConnectorCertification(row!);
    }
  });

  it("requires an executable representative fixture for every standard connector", () => {
    const fixtureVendors = Object.keys(
      CONNECTOR_CERTIFICATION_FIXTURES,
    ) as Array<keyof typeof CONNECTOR_CERTIFICATION_FIXTURES>;

    expect(fixtureVendors).toEqual(
      CONNECTOR_CERTIFICATION_MATRIX.map((row) => row.vendor),
    );

    for (const item of CONNECTOR_CATALOG) {
      const row = CONNECTOR_CERTIFICATION_MATRIX.find(
        (candidate) => candidate.vendor === item.vendor,
      );
      const fixture = CONNECTOR_CERTIFICATION_FIXTURES[item.vendor];

      expect(row).toBeDefined();
      expect(fixture).toBeDefined();
      expectRepresentativeCertificationFixture(row!, item, fixture);
    }
  });

  it("keeps strict raw/harmonized/features/audit/config boundaries explicit", () => {
    expectStrictLayerSeparationPolicy();
  });

  it("has no missing certification requirements", () => {
    expect(validateConnectorCertificationMatrix()).toEqual([]);
  });
});
