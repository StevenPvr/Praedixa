import { expect } from "vitest";

import {
  CONNECTOR_LAYER_BOUNDARIES,
  STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS,
  type ConnectorCertificationRow,
} from "../certification.js";
import type { ConnectorCatalogItem } from "../types.js";
import type { ConnectorCertificationFixture } from "./fixtures/certification-fixtures.js";

export function expectCatalogParity(
  row: ConnectorCertificationRow,
  catalogItem: ConnectorCatalogItem,
) {
  expect(row.vendor).toBe(catalogItem.vendor);
  expect(row.domain).toBe(catalogItem.domain);
  expect(row.authModes).toEqual(catalogItem.authModes);
  expect(row.onboardingModes).toEqual(catalogItem.onboardingModes);
  expect(row.sourceObjects).toEqual(catalogItem.sourceObjects);
  expect(row.medallionTargets).toEqual(catalogItem.medallionTargets);
}

export function expectStandardConnectorCertification(
  row: ConnectorCertificationRow,
) {
  expect(row.supportsFullSync).toBe(true);
  expect(row.supportsIncrementalSync).toBe(true);
  expect(row.supportsReplay).toBe(true);
  expect(row.supportsBackfill).toBe(true);
  expect(row.supportsConnectionTest).toBe(true);
  expect(row.requiresRepresentativeFixtures).toBe(true);
  expect(row.rawRetentionDays).toBeGreaterThanOrEqual(30);
  expect(row.requiredTestScenarios).toEqual(
    STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS,
  );
}

export function expectStrictLayerSeparationPolicy() {
  expect(CONNECTOR_LAYER_BOUNDARIES.map((boundary) => boundary.name)).toEqual([
    "raw",
    "harmonized",
    "features",
    "audit",
    "config",
  ]);

  for (const boundary of CONNECTOR_LAYER_BOUNDARIES) {
    expect(boundary.contract.length).toBeGreaterThan(0);
    expect(boundary.owner.length).toBeGreaterThan(0);
    expect(boundary.writesFrom.length).toBeGreaterThan(0);
    expect(boundary.forbiddenFrom.length).toBeGreaterThan(0);
  }
}

export function expectRepresentativeCertificationFixture(
  row: ConnectorCertificationRow,
  catalogItem: ConnectorCatalogItem,
  fixture: ConnectorCertificationFixture,
) {
  expect(fixture.vendor).toBe(row.vendor);
  expect(fixture.supportedOnboardingModes).toEqual(row.onboardingModes);
  expect(fixture.authExpectations).toHaveLength(row.authModes.length);
  expect(
    fixture.authExpectations.map((expectation) => expectation.mode),
  ).toEqual(row.authModes);

  for (const authExpectation of fixture.authExpectations) {
    expect(authExpectation.certifiesScenario).toBe("connection_create");
    expect(row.requiredTestScenarios).toContain(
      authExpectation.certifiesScenario,
    );
    expect(authExpectation.credentialFields).toEqual(
      catalogItem.credentialFieldHints[authExpectation.mode],
    );
  }

  expect(fixture.activationReadinessExpectation.certifiesScenario).toBe(
    "activation_readiness",
  );
  expect(row.requiredTestScenarios).toContain(
    fixture.activationReadinessExpectation.certifiesScenario,
  );
  expect(row.authModes).toContain(
    fixture.activationReadinessExpectation.primaryAuthMode,
  );
  expect(fixture.activationReadinessExpectation.requiredConfigFields).toEqual(
    catalogItem.requiredConfigFields,
  );
  expect(fixture.activationReadinessExpectation.requiresStoredCredentials).toBe(
    true,
  );
  expect(
    fixture.activationReadinessExpectation.requiresAuthorizationForOauth2,
  ).toBe(true);
  expect(fixture.activationReadinessExpectation.requiresProbeTarget).toBe(true);

  expect(fixture.probeExpectation.certifiesScenario).toBe("connection_test");
  expect(row.requiredTestScenarios).toContain(
    fixture.probeExpectation.certifiesScenario,
  );
  expect(row.authModes).toContain(fixture.probeExpectation.primaryAuthMode);
  expect(fixture.probeExpectation.smokeObject.length).toBeGreaterThan(0);
  expect(row.sourceObjects).toContain(fixture.probeExpectation.smokeObject);
  expect(fixture.probeExpectation.requiredConfigFields).toEqual(
    catalogItem.requiredConfigFields,
  );

  if (fixture.probeExpectation.usesCatalogOAuthDefaults) {
    expect(fixture.probeExpectation.primaryAuthMode).toBe("oauth2");
    expect(catalogItem.oauthDefaults).toBeDefined();
  } else {
    expect(catalogItem.oauthDefaults).toBeUndefined();
  }

  expect(fixture.replayExpectation.certifiesScenario).toBe("replay");
  expect(row.requiredTestScenarios).toContain(
    fixture.replayExpectation.certifiesScenario,
  );
  expect(fixture.replayExpectation.triggerType).toBe("replay");
  expect(fixture.replayExpectation.windowHours * 60).toBeGreaterThanOrEqual(
    row.recommendedSyncMinutes,
  );
  expect(fixture.replayExpectation.queue).toBe("integration_sync_runs");
  expect(fixture.replayExpectation.requiresSourceWindow).toBe(true);
  expect(fixture.replayExpectation.requiresIdempotencyKey).toBe(true);
  expect(fixture.replayExpectation.reusesRawLanding).toBe(true);

  expect(fixture.rawRetentionExpectation.certifiesScenario).toBe(
    "raw_retention",
  );
  expect(row.requiredTestScenarios).toContain(
    fixture.rawRetentionExpectation.certifiesScenario,
  );
  expect(fixture.rawRetentionExpectation.minimumDays).toBe(
    row.rawRetentionDays,
  );
  expect(fixture.rawRetentionExpectation.landingLayer).toBe("raw");
  expect(fixture.rawRetentionExpectation.appendOnlyStore).toBe(
    "integration_raw_events",
  );
  expect(fixture.rawRetentionExpectation.immutablePayloadStore).toBe(true);
  expect(fixture.rawRetentionExpectation.requiresAuditEvidence).toBe(true);

  expect(STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS).toContain(
    fixture.probeExpectation.certifiesScenario,
  );
  expect(STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS).toContain(
    fixture.replayExpectation.certifiesScenario,
  );
  expect(STANDARD_CONNECTOR_REQUIRED_TEST_SCENARIOS).toContain(
    fixture.rawRetentionExpectation.certifiesScenario,
  );
}
