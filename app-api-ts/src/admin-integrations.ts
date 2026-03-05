import { randomUUID } from "node:crypto";

export type IntegrationVendor =
  | "salesforce"
  | "ukg"
  | "toast"
  | "olo"
  | "cdk"
  | "reynolds"
  | "geotab"
  | "fourth"
  | "oracle_tm"
  | "sap_tm"
  | "blue_yonder"
  | "manhattan"
  | "ncr_aloha";

export type IntegrationAuthMode = "oauth2" | "api_key" | "service_account" | "sftp";
export type IntegrationConnectionStatus =
  | "pending"
  | "active"
  | "disabled"
  | "needs_attention";
export type IntegrationSyncStatus = "queued" | "running" | "success" | "failed" | "canceled";
export type IntegrationSyncTrigger = "manual" | "schedule" | "backfill" | "replay" | "webhook";

export type IntegrationCatalogItem = {
  vendor: IntegrationVendor;
  label: string;
  verticals: string[];
  authModes: IntegrationAuthMode[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionPath: Array<"bronze" | "silver" | "gold">;
};

export type IntegrationConnection = {
  id: string;
  organizationId: string;
  vendor: IntegrationVendor;
  displayName: string;
  authMode: IntegrationAuthMode;
  status: IntegrationConnectionStatus;
  secretRef: string | null;
  config: Record<string, unknown>;
  lastSuccessfulSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationSyncRun = {
  id: string;
  organizationId: string;
  connectionId: string;
  triggerType: IntegrationSyncTrigger;
  status: IntegrationSyncStatus;
  recordsFetched: number;
  recordsWritten: number;
  errorClass: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type IntegrationAuditEvent = {
  id: string;
  organizationId: string;
  connectionId: string | null;
  action: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export class IntegrationInputError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IntegrationInputError";
  }
}

export const INTEGRATION_CATALOG: IntegrationCatalogItem[] = [
  {
    vendor: "salesforce",
    label: "Salesforce CRM",
    verticals: ["logistique", "transport", "concessionnaire", "franchise_fast_food"],
    authModes: ["oauth2", "service_account"],
    sourceObjects: ["Account", "Opportunity", "Case", "Task"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "ukg",
    label: "UKG Workforce",
    verticals: ["logistique", "transport", "franchise_fast_food"],
    authModes: ["oauth2", "api_key"],
    sourceObjects: ["Employees", "Schedules", "Timesheets", "Absences"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "toast",
    label: "Toast POS",
    verticals: ["franchise_fast_food"],
    authModes: ["oauth2", "api_key"],
    sourceObjects: ["Orders", "Menus", "Labor", "Inventory"],
    recommendedSyncMinutes: 15,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "olo",
    label: "Olo Ordering",
    verticals: ["franchise_fast_food"],
    authModes: ["api_key"],
    sourceObjects: ["Orders", "Stores", "Products", "Promotions"],
    recommendedSyncMinutes: 15,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "cdk",
    label: "CDK Global DMS",
    verticals: ["concessionnaire"],
    authModes: ["service_account", "sftp"],
    sourceObjects: ["ServiceOrders", "RepairOrders", "Vehicles", "Parts"],
    recommendedSyncMinutes: 60,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "reynolds",
    label: "Reynolds & Reynolds DMS",
    verticals: ["concessionnaire"],
    authModes: ["service_account", "sftp"],
    sourceObjects: ["RepairOrder", "Customer", "Vehicle", "Technician"],
    recommendedSyncMinutes: 60,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "geotab",
    label: "Geotab Telematics",
    verticals: ["logistique", "transport"],
    authModes: ["api_key", "oauth2"],
    sourceObjects: ["Trip", "Device", "FaultData", "StatusData"],
    recommendedSyncMinutes: 10,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "fourth",
    label: "Fourth WFM",
    verticals: ["franchise_fast_food"],
    authModes: ["api_key", "sftp"],
    sourceObjects: ["Employees", "Roster", "Timeclock", "LaborForecast"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "oracle_tm",
    label: "Oracle Transportation Management",
    verticals: ["logistique", "transport"],
    authModes: ["oauth2", "service_account"],
    sourceObjects: ["Shipment", "OrderRelease", "Route", "Stop"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "sap_tm",
    label: "SAP Transportation Management",
    verticals: ["logistique", "transport"],
    authModes: ["oauth2", "service_account"],
    sourceObjects: ["FreightOrder", "FreightUnit", "Resource", "Stop"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "blue_yonder",
    label: "Blue Yonder",
    verticals: ["logistique", "transport", "franchise_fast_food"],
    authModes: ["api_key", "service_account"],
    sourceObjects: ["DemandPlan", "LaborPlan", "Store", "SKU"],
    recommendedSyncMinutes: 60,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "manhattan",
    label: "Manhattan Associates",
    verticals: ["logistique", "transport"],
    authModes: ["api_key", "service_account"],
    sourceObjects: ["Wave", "Task", "Inventory", "Shipment"],
    recommendedSyncMinutes: 30,
    medallionPath: ["bronze", "silver", "gold"],
  },
  {
    vendor: "ncr_aloha",
    label: "NCR Aloha",
    verticals: ["franchise_fast_food"],
    authModes: ["api_key", "sftp"],
    sourceObjects: ["Check", "Item", "Labor", "Inventory"],
    recommendedSyncMinutes: 15,
    medallionPath: ["bronze", "silver", "gold"],
  },
];

const ALLOWED_VENDOR_SET = new Set<IntegrationVendor>(
  INTEGRATION_CATALOG.map((entry) => entry.vendor),
);

const CONNECTIONS: IntegrationConnection[] = [
  {
    id: "int-conn-001",
    organizationId: "org-1",
    vendor: "salesforce",
    displayName: "Salesforce Ops",
    authMode: "oauth2",
    status: "active",
    secretRef: "scw://secrets/org-1/salesforce",
    config: { instanceUrl: "https://example.my.salesforce.com" },
    lastSuccessfulSyncAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    nextScheduledSyncAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SYNC_RUNS: IntegrationSyncRun[] = [];
const AUDIT_EVENTS: IntegrationAuditEvent[] = [];

export function listIntegrationCatalog(): IntegrationCatalogItem[] {
  return INTEGRATION_CATALOG;
}

export function listIntegrationConnections(
  organizationId: string,
  vendorFilter: string | null,
): IntegrationConnection[] {
  return CONNECTIONS.filter((row) => {
    if (row.organizationId !== organizationId) {
      return false;
    }
    if (vendorFilter == null || vendorFilter.length === 0) {
      return true;
    }
    return row.vendor === vendorFilter;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function validateVendor(value: unknown): IntegrationVendor {
  if (typeof value !== "string") {
    throw new IntegrationInputError("vendor must be a string");
  }
  if (!ALLOWED_VENDOR_SET.has(value as IntegrationVendor)) {
    throw new IntegrationInputError("unsupported connector vendor", {
      vendor: value,
    });
  }
  return value as IntegrationVendor;
}

function validateAuthMode(vendor: IntegrationVendor, value: unknown): IntegrationAuthMode {
  if (typeof value !== "string") {
    throw new IntegrationInputError("authMode must be a string");
  }
  const allowedAuthModes = INTEGRATION_CATALOG.find(
    (entry) => entry.vendor === vendor,
  )?.authModes;
  if (allowedAuthModes == null || !allowedAuthModes.includes(value as IntegrationAuthMode)) {
    throw new IntegrationInputError("authMode is not allowed for this vendor", {
      vendor,
      authMode: value,
      allowedAuthModes,
    });
  }
  return value as IntegrationAuthMode;
}

export function createIntegrationConnection(
  organizationId: string,
  payload: unknown,
  actorUserId: string | null,
): IntegrationConnection {
  const parsed = (payload ?? {}) as Record<string, unknown>;
  const vendor = validateVendor(parsed.vendor);
  const authMode = validateAuthMode(vendor, parsed.authMode);
  const displayName = String(parsed.displayName ?? "").trim();
  if (displayName.length < 3) {
    throw new IntegrationInputError("displayName must be at least 3 characters");
  }

  const connection: IntegrationConnection = {
    id: randomUUID(),
    organizationId,
    vendor,
    displayName,
    authMode,
    status: "pending",
    secretRef:
      typeof parsed.secretRef === "string" && parsed.secretRef.trim().length > 0
        ? parsed.secretRef.trim()
        : null,
    config: isRecord(parsed.config) ? parsed.config : {},
    lastSuccessfulSyncAt: null,
    nextScheduledSyncAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  CONNECTIONS.push(connection);
  AUDIT_EVENTS.push({
    id: randomUUID(),
    organizationId,
    connectionId: connection.id,
    action: "integration.connection.created",
    actorUserId,
    metadata: {
      vendor: connection.vendor,
      authMode: connection.authMode,
      hasSecretRef: connection.secretRef != null,
    },
    createdAt: new Date().toISOString(),
  });
  return connection;
}

function findConnection(organizationId: string, connectionId: string): IntegrationConnection {
  const connection = CONNECTIONS.find(
    (row) => row.id === connectionId && row.organizationId === organizationId,
  );
  if (connection == null) {
    throw new IntegrationInputError("integration connection not found", {
      connectionId,
      organizationId,
    });
  }
  return connection;
}

export function testIntegrationConnection(
  organizationId: string,
  connectionId: string,
  actorUserId: string | null,
) {
  const connection = findConnection(organizationId, connectionId);
  const warnings: string[] = [];

  if (connection.secretRef == null) {
    warnings.push("No secretRef configured; this run uses non-production credentials.");
  }
  if (Object.keys(connection.config).length === 0) {
    warnings.push("Config is empty; object scoping defaults will be used.");
  }

  const now = new Date().toISOString();
  connection.status = "active";
  connection.updatedAt = now;
  connection.nextScheduledSyncAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();

  AUDIT_EVENTS.push({
    id: randomUUID(),
    organizationId,
    connectionId,
    action: "integration.connection.tested",
    actorUserId,
    metadata: { warningsCount: warnings.length },
    createdAt: now,
  });

  return {
    ok: true,
    latencyMs: 120,
    checkedScopes: ["read", "metadata"],
    warnings,
  };
}

function parseTriggerType(value: unknown): IntegrationSyncTrigger {
  if (value == null) {
    return "manual";
  }
  if (value === "manual" || value === "schedule" || value === "backfill" || value === "replay" || value === "webhook") {
    return value;
  }
  throw new IntegrationInputError("triggerType is invalid", { triggerType: value });
}

export function triggerIntegrationSync(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): IntegrationSyncRun {
  const connection = findConnection(organizationId, connectionId);
  if (connection.status === "disabled") {
    throw new IntegrationInputError("connection is disabled");
  }

  const parsed = (payload ?? {}) as Record<string, unknown>;
  const triggerType = parseTriggerType(parsed.triggerType);
  const now = new Date().toISOString();
  const run: IntegrationSyncRun = {
    id: randomUUID(),
    organizationId,
    connectionId,
    triggerType,
    status: "success",
    recordsFetched: 180,
    recordsWritten: 176,
    errorClass: null,
    errorMessage: null,
    startedAt: now,
    endedAt: new Date(Date.now() + 800).toISOString(),
    createdAt: now,
  };

  SYNC_RUNS.push(run);
  connection.lastSuccessfulSyncAt = run.endedAt;
  connection.updatedAt = run.endedAt ?? now;
  connection.nextScheduledSyncAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString();

  AUDIT_EVENTS.push({
    id: randomUUID(),
    organizationId,
    connectionId,
    action: "integration.sync.triggered",
    actorUserId,
    metadata: {
      triggerType,
      runId: run.id,
      recordsFetched: run.recordsFetched,
      recordsWritten: run.recordsWritten,
    },
    createdAt: now,
  });
  return run;
}

export function listIntegrationSyncRuns(
  organizationId: string,
  connectionId: string | null,
): IntegrationSyncRun[] {
  return SYNC_RUNS.filter((run) => {
    if (run.organizationId !== organizationId) {
      return false;
    }
    if (connectionId == null || connectionId.length === 0) {
      return true;
    }
    return run.connectionId === connectionId;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listIntegrationAuditEvents(
  organizationId: string,
  connectionId: string | null,
): IntegrationAuditEvent[] {
  return AUDIT_EVENTS.filter((event) => {
    if (event.organizationId !== organizationId) {
      return false;
    }
    if (connectionId == null || connectionId.length === 0) {
      return true;
    }
    return event.connectionId === connectionId;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
