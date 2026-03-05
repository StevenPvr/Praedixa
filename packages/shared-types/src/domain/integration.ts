// Integration platform domain types - connector inventory, connections and sync runs

import type {
  ISODateTimeString,
  TenantEntity,
  UUID,
} from "../utils/common";

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

export type IntegrationDomain =
  | "crm"
  | "wfm"
  | "pos"
  | "dms"
  | "telematics"
  | "tms"
  | "planning";

export type IntegrationAuthMode =
  | "oauth2"
  | "api_key"
  | "service_account"
  | "sftp";

export type IntegrationConnectionStatus =
  | "pending"
  | "active"
  | "disabled"
  | "needs_attention";

export type IntegrationSyncTriggerType =
  | "schedule"
  | "manual"
  | "webhook"
  | "backfill"
  | "replay";

export type IntegrationSyncStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled";

export interface IntegrationCatalogItem {
  vendor: IntegrationVendor;
  label: string;
  domain: IntegrationDomain;
  authModes: IntegrationAuthMode[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionTargets: Array<"bronze" | "silver" | "gold">;
}

export interface IntegrationConnection extends TenantEntity {
  vendor: IntegrationVendor;
  displayName: string;
  status: IntegrationConnectionStatus;
  authMode: IntegrationAuthMode;
  secretRef: string | null;
  config: Record<string, unknown>;
  lastSuccessfulSyncAt: ISODateTimeString | null;
  nextScheduledSyncAt: ISODateTimeString | null;
}

export interface IntegrationSyncRun extends TenantEntity {
  connectionId: UUID;
  triggerType: IntegrationSyncTriggerType;
  status: IntegrationSyncStatus;
  recordsFetched: number;
  recordsWritten: number;
  errorClass: string | null;
  errorMessage: string | null;
  startedAt: ISODateTimeString | null;
  endedAt: ISODateTimeString | null;
}

export interface IntegrationAuditEvent extends TenantEntity {
  connectionId: UUID | null;
  action: string;
  actorUserId: UUID | null;
  metadata: Record<string, unknown>;
}
