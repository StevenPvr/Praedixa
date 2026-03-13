import type {
  ConnectorAuthMode,
  ConnectorOnboardingMode,
  ConnectorVendor,
} from "../../types.js";

type ConnectorSecretKind =
  | "oauth2_client"
  | "api_key"
  | "service_account"
  | "sftp";

type ConnectorProbeKind =
  | "oauth_smoke_read"
  | "api_key_smoke_read"
  | "service_account_smoke_read"
  | "sftp_directory_probe";

export interface ConnectorAuthExpectation {
  mode: ConnectorAuthMode;
  secretKind: ConnectorSecretKind;
  credentialFields: readonly string[];
  certifiesScenario: "connection_create";
}

export interface ConnectorProbeExpectation {
  primaryAuthMode: ConnectorAuthMode;
  probeKind: ConnectorProbeKind;
  smokeObject: string;
  requiredConfigFields: readonly string[];
  usesCatalogOAuthDefaults: boolean;
  certifiesScenario: "connection_test";
}

export interface ConnectorActivationReadinessExpectation {
  primaryAuthMode: ConnectorAuthMode;
  requiredConfigFields: readonly string[];
  requiresStoredCredentials: true;
  requiresAuthorizationForOauth2: true;
  requiresProbeTarget: true;
  certifiesScenario: "activation_readiness";
}

export interface ConnectorReplayExpectation {
  triggerType: "replay";
  windowHours: number;
  queue: "integration_sync_runs";
  requiresSourceWindow: true;
  requiresIdempotencyKey: true;
  reusesRawLanding: true;
  certifiesScenario: "replay";
}

export interface ConnectorRawRetentionExpectation {
  minimumDays: number;
  landingLayer: "raw";
  appendOnlyStore: "integration_raw_events";
  immutablePayloadStore: true;
  requiresAuditEvidence: true;
  certifiesScenario: "raw_retention";
}

export interface ConnectorCertificationFixture {
  vendor: ConnectorVendor;
  supportedOnboardingModes: readonly ConnectorOnboardingMode[];
  authExpectations: readonly ConnectorAuthExpectation[];
  activationReadinessExpectation: ConnectorActivationReadinessExpectation;
  probeExpectation: ConnectorProbeExpectation;
  replayExpectation: ConnectorReplayExpectation;
  rawRetentionExpectation: ConnectorRawRetentionExpectation;
}

const DEFAULT_RAW_RETENTION_DAYS = 30;

function authExpectation(
  mode: ConnectorAuthMode,
  credentialFields: readonly string[],
): ConnectorAuthExpectation {
  return {
    mode,
    secretKind: SECRET_KIND_BY_MODE[mode],
    credentialFields,
    certifiesScenario: "connection_create",
  };
}

function probeExpectation(
  primaryAuthMode: ConnectorAuthMode,
  smokeObject: string,
  requiredConfigFields: readonly string[],
  usesCatalogOAuthDefaults = false,
): ConnectorProbeExpectation {
  return {
    primaryAuthMode,
    probeKind: PROBE_KIND_BY_MODE[primaryAuthMode],
    smokeObject,
    requiredConfigFields,
    usesCatalogOAuthDefaults,
    certifiesScenario: "connection_test",
  };
}

function replayExpectation(windowHours: number): ConnectorReplayExpectation {
  return {
    triggerType: "replay",
    windowHours,
    queue: "integration_sync_runs",
    requiresSourceWindow: true,
    requiresIdempotencyKey: true,
    reusesRawLanding: true,
    certifiesScenario: "replay",
  };
}

function activationReadinessExpectation(
  primaryAuthMode: ConnectorAuthMode,
  requiredConfigFields: readonly string[],
): ConnectorActivationReadinessExpectation {
  return {
    primaryAuthMode,
    requiredConfigFields,
    requiresStoredCredentials: true,
    requiresAuthorizationForOauth2: true,
    requiresProbeTarget: true,
    certifiesScenario: "activation_readiness",
  };
}

function rawRetentionExpectation(
  minimumDays = DEFAULT_RAW_RETENTION_DAYS,
): ConnectorRawRetentionExpectation {
  return {
    minimumDays,
    landingLayer: "raw",
    appendOnlyStore: "integration_raw_events",
    immutablePayloadStore: true,
    requiresAuditEvidence: true,
    certifiesScenario: "raw_retention",
  };
}

function fixture(
  vendor: ConnectorVendor,
  supportedOnboardingModes: readonly ConnectorOnboardingMode[],
  authExpectations: readonly ConnectorAuthExpectation[],
  activation: ConnectorActivationReadinessExpectation,
  probe: ConnectorProbeExpectation,
  replay: ConnectorReplayExpectation,
): ConnectorCertificationFixture {
  return {
    vendor,
    supportedOnboardingModes,
    authExpectations,
    activationReadinessExpectation: activation,
    probeExpectation: probe,
    replayExpectation: replay,
    rawRetentionExpectation: rawRetentionExpectation(),
  };
}

const SECRET_KIND_BY_MODE = {
  oauth2: "oauth2_client",
  api_key: "api_key",
  service_account: "service_account",
  sftp: "sftp",
} as const satisfies Record<ConnectorAuthMode, ConnectorSecretKind>;

const PROBE_KIND_BY_MODE = {
  oauth2: "oauth_smoke_read",
  api_key: "api_key_smoke_read",
  service_account: "service_account_smoke_read",
  sftp: "sftp_directory_probe",
} as const satisfies Record<ConnectorAuthMode, ConnectorProbeKind>;

export const CONNECTOR_CERTIFICATION_FIXTURES = {
  salesforce: fixture(
    "salesforce",
    ["interactive_oauth", "managed_service_account", "push_api"],
    [
      authExpectation("oauth2", ["clientId", "clientSecret"]),
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
    ],
    activationReadinessExpectation("oauth2", ["baseUrl"]),
    probeExpectation("oauth2", "Account", ["baseUrl"], true),
    replayExpectation(168),
  ),
  ukg: fixture(
    "ukg",
    ["credential_submission", "push_api"],
    [
      authExpectation("oauth2", ["clientId", "clientSecret"]),
      authExpectation("api_key", ["apiKey"]),
    ],
    activationReadinessExpectation("oauth2", ["tokenEndpoint", "baseUrl"]),
    probeExpectation("oauth2", "Employees", ["tokenEndpoint", "baseUrl"]),
    replayExpectation(72),
  ),
  toast: fixture(
    "toast",
    ["credential_submission", "push_api"],
    [
      authExpectation("oauth2", ["clientId", "clientSecret"]),
      authExpectation("api_key", ["apiKey"]),
    ],
    activationReadinessExpectation("api_key", ["tokenEndpoint", "baseUrl"]),
    probeExpectation("api_key", "Orders", ["tokenEndpoint", "baseUrl"]),
    replayExpectation(72),
  ),
  olo: fixture(
    "olo",
    ["credential_submission", "push_api"],
    [authExpectation("api_key", ["apiKey"])],
    activationReadinessExpectation("api_key", ["baseUrl"]),
    probeExpectation("api_key", "Orders", ["baseUrl"]),
    replayExpectation(72),
  ),
  cdk: fixture(
    "cdk",
    ["managed_service_account", "credential_submission", "push_api"],
    [
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
      authExpectation("sftp", ["host", "username", "password|privateKey"]),
    ],
    activationReadinessExpectation("service_account", ["baseUrl"]),
    probeExpectation("service_account", "ServiceOrders", ["baseUrl"]),
    replayExpectation(336),
  ),
  reynolds: fixture(
    "reynolds",
    ["managed_service_account", "credential_submission", "push_api"],
    [
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
      authExpectation("sftp", ["host", "username", "password|privateKey"]),
    ],
    activationReadinessExpectation("sftp", ["baseUrl"]),
    probeExpectation("sftp", "RepairOrder", ["baseUrl"]),
    replayExpectation(336),
  ),
  geotab: fixture(
    "geotab",
    ["credential_submission", "push_api"],
    [
      authExpectation("api_key", ["apiKey"]),
      authExpectation("oauth2", ["clientId", "clientSecret"]),
    ],
    activationReadinessExpectation("oauth2", ["baseUrl"]),
    probeExpectation("oauth2", "Trip", ["baseUrl"]),
    replayExpectation(48),
  ),
  fourth: fixture(
    "fourth",
    ["credential_submission", "push_api"],
    [
      authExpectation("api_key", ["apiKey"]),
      authExpectation("sftp", ["host", "username", "password|privateKey"]),
    ],
    activationReadinessExpectation("sftp", ["baseUrl"]),
    probeExpectation("sftp", "Employees", ["baseUrl"]),
    replayExpectation(168),
  ),
  oracle_tm: fixture(
    "oracle_tm",
    ["credential_submission", "managed_service_account", "push_api"],
    [
      authExpectation("oauth2", ["clientId", "clientSecret"]),
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
    ],
    activationReadinessExpectation("oauth2", ["tokenEndpoint", "baseUrl"]),
    probeExpectation("oauth2", "Shipment", ["tokenEndpoint", "baseUrl"]),
    replayExpectation(168),
  ),
  sap_tm: fixture(
    "sap_tm",
    ["credential_submission", "managed_service_account", "push_api"],
    [
      authExpectation("oauth2", ["clientId", "clientSecret"]),
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
    ],
    activationReadinessExpectation("service_account", [
      "tokenEndpoint",
      "baseUrl",
    ]),
    probeExpectation("service_account", "FreightOrder", [
      "tokenEndpoint",
      "baseUrl",
    ]),
    replayExpectation(168),
  ),
  blue_yonder: fixture(
    "blue_yonder",
    ["credential_submission", "managed_service_account", "push_api"],
    [
      authExpectation("api_key", ["apiKey"]),
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
    ],
    activationReadinessExpectation("service_account", ["baseUrl"]),
    probeExpectation("service_account", "DemandPlan", ["baseUrl"]),
    replayExpectation(336),
  ),
  manhattan: fixture(
    "manhattan",
    ["credential_submission", "managed_service_account", "push_api"],
    [
      authExpectation("api_key", ["apiKey"]),
      authExpectation("service_account", [
        "clientId",
        "clientSecret",
        "clientEmail",
        "privateKey",
      ]),
    ],
    activationReadinessExpectation("api_key", ["baseUrl"]),
    probeExpectation("api_key", "Wave", ["baseUrl"]),
    replayExpectation(168),
  ),
  ncr_aloha: fixture(
    "ncr_aloha",
    ["credential_submission", "push_api"],
    [
      authExpectation("api_key", ["apiKey"]),
      authExpectation("sftp", ["host", "username", "password|privateKey"]),
    ],
    activationReadinessExpectation("api_key", ["baseUrl"]),
    probeExpectation("api_key", "Check", ["baseUrl"]),
    replayExpectation(72),
  ),
} as const satisfies Record<ConnectorVendor, ConnectorCertificationFixture>;
