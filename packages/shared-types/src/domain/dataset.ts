// Data Foundation domain types - Client datasets, columns, ingestion

import type {
  TenantEntity,
  BaseEntity,
  UUID,
  ISODateTimeString,
} from "../utils/common";

/** Dataset lifecycle status */
export type DatasetStatus = "pending" | "active" | "migrating" | "archived";

/** Ingestion execution mode */
export type IngestionMode = "incremental" | "full_refit";

/** Ingestion run status */
export type RunStatus = "running" | "success" | "failed";

/** Column data type */
export type ColumnDtype =
  | "float"
  | "integer"
  | "date"
  | "category"
  | "boolean"
  | "text";

/** Column semantic role */
export type ColumnRole =
  | "target"
  | "feature"
  | "temporal_index"
  | "group_by"
  | "id"
  | "meta";

/** Client dataset entity */
export interface ClientDataset extends TenantEntity {
  /** Human-readable identifier (e.g. "effectifs", "volumes") */
  name: string;
  /** Raw schema name (e.g. "acme_raw") */
  schemaRaw: string;
  /** Transformed schema name (e.g. "acme_transformed") */
  schemaTransformed: string;
  /** Table name in both schemas */
  tableName: string;
  /** Temporal index column name */
  temporalIndex: string;
  /** Group-by column names */
  groupBy: string[];
  /** Pipeline configuration toggles */
  pipelineConfig: Record<string, unknown>;
  /** Current status */
  status: DatasetStatus;
  /** SHA256 hex of the YAML metadata */
  metadataHash: string;
}

/** Dataset column metadata */
export interface DatasetColumn extends BaseEntity {
  /** Parent dataset */
  datasetId: UUID;
  /** Column name */
  name: string;
  /** Data type */
  dtype: ColumnDtype;
  /** Semantic role */
  role: ColumnRole;
  /** Whether the column allows nulls */
  nullable: boolean;
  /** Per-column rule overrides (null = inherit dataset defaults) */
  rulesOverride: Record<string, unknown> | null;
  /** Position in the table definition */
  ordinalPosition: number;
}

/** Fit parameters for a column transformation */
export interface FitParameters extends BaseEntity {
  /** Parent dataset */
  datasetId: UUID;
  /** Column name */
  columnName: string;
  /** Transform type (e.g. "normalize", "standardize", "one_hot") */
  transformType: string;
  /** Fitted parameter values */
  parameters: Record<string, unknown>;
  /** HMAC-SHA256 integrity hash */
  hmacSha256: string;
  /** When the fit was computed */
  fittedAt: ISODateTimeString;
  /** Number of rows used for fitting */
  rowCount: number;
  /** Monotonic version number */
  version: number;
  /** Whether this version is currently active */
  isActive: boolean;
}

/** Ingestion log entry */
export interface IngestionLogEntry extends BaseEntity {
  /** Parent dataset */
  datasetId: UUID;
  /** Execution mode */
  mode: IngestionMode;
  /** Number of rows received from source */
  rowsReceived: number;
  /** Number of rows successfully transformed */
  rowsTransformed: number;
  /** Run start time */
  startedAt: ISODateTimeString;
  /** Run completion time */
  completedAt: ISODateTimeString | null;
  /** Final status */
  status: RunStatus;
  /** Error message if failed */
  errorMessage: string | null;
  /** What triggered the run */
  triggeredBy: string;
  /** Correlation ID */
  requestId: string | null;
}

/** Pipeline config history entry (RGPD Article 30 audit) */
export interface PipelineConfigHistory extends BaseEntity {
  /** Parent dataset */
  datasetId: UUID;
  /** Full pipeline_config snapshot */
  configSnapshot: Record<string, unknown>;
  /** All rules_override values snapshot */
  columnsSnapshot: Record<string, unknown>;
  /** User who made the change */
  changedBy: UUID;
  /** Reason for the change */
  changeReason: string;
}

/** Dataset summary for listings */
export interface DatasetSummary {
  id: UUID;
  name: string;
  status: DatasetStatus;
  tableName: string;
  /** Last ingestion timestamp */
  lastIngestionAt: ISODateTimeString | null;
  /** Total row count in raw table */
  rowCount: number;
  /** Number of columns */
  columnCount: number;
}

/** Dataset data preview row (dynamic columns) */
export type DatasetDataRow = Record<string, unknown>;
