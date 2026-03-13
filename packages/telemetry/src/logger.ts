import type { TelemetryCorrelationContext } from "./correlation.js";

export type TelemetryLevel = "info" | "warn" | "error";

export interface TelemetryLoggerConfig {
  service: string;
  env: string;
  enabled?: boolean;
  now?: () => Date;
  write?: (entry: {
    level: TelemetryLevel;
    record: TelemetryEventRecord;
    serialized: string;
  }) => void;
}

export interface TelemetryEventInput {
  event: string;
  message: string;
  correlation: TelemetryCorrelationContext;
  level?: TelemetryLevel;
  status?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  method?: string | null;
  path?: string | null;
  routeTemplate?: string | null;
  clientIp?: string | null;
  origin?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  userRole?: string | null;
  details?: Record<string, unknown>;
}

export interface TelemetryEventRecord {
  timestamp: string;
  level: TelemetryLevel;
  service: string;
  env: string;
  event: string;
  message: string;
  request_id: string;
  trace_id: string;
  traceparent: string | null;
  tracestate: string | null;
  run_id: string | null;
  connector_run_id: string | null;
  action_id: string | null;
  contract_version: string | null;
  organization_id: string | null;
  site_id: string | null;
  status: string | null;
  status_code: number | null;
  duration_ms: number | null;
  method: string | null;
  path: string | null;
  route_template: string | null;
  client_ip: string | null;
  origin: string | null;
  user_agent: string | null;
  user_id: string | null;
  user_role: string | null;
  [key: string]: unknown;
}

const RESERVED_EVENT_KEYS = new Set([
  "timestamp",
  "level",
  "service",
  "env",
  "event",
  "message",
  "request_id",
  "trace_id",
  "traceparent",
  "tracestate",
  "run_id",
  "connector_run_id",
  "action_id",
  "contract_version",
  "organization_id",
  "site_id",
  "status",
  "status_code",
  "duration_ms",
  "method",
  "path",
  "route_template",
  "client_ip",
  "origin",
  "user_agent",
  "user_id",
  "user_role",
]);

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatusCode(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeDetails(
  details: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (details == null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !RESERVED_EVENT_KEYS.has(key)),
  );
}

export function buildTelemetryEvent(
  config: Pick<TelemetryLoggerConfig, "service" | "env">,
  input: TelemetryEventInput,
  now: Date = new Date(),
): TelemetryEventRecord {
  return {
    timestamp: now.toISOString(),
    level: input.level ?? "info",
    service: config.service,
    env: config.env,
    event: input.event,
    message: input.message,
    request_id: input.correlation.requestId,
    trace_id: input.correlation.traceId,
    traceparent: input.correlation.traceparent,
    tracestate: input.correlation.tracestate,
    run_id: input.correlation.runId,
    connector_run_id: input.correlation.connectorRunId,
    action_id: input.correlation.actionId,
    contract_version: input.correlation.contractVersion,
    organization_id: input.correlation.organizationId,
    site_id: input.correlation.siteId,
    status: normalizeNullableString(input.status),
    status_code: normalizeStatusCode(input.statusCode),
    duration_ms: normalizeStatusCode(input.durationMs),
    method: normalizeNullableString(input.method),
    path: normalizeNullableString(input.path),
    route_template: normalizeNullableString(input.routeTemplate),
    client_ip: normalizeNullableString(input.clientIp),
    origin: normalizeNullableString(input.origin),
    user_agent: normalizeNullableString(input.userAgent),
    user_id: normalizeNullableString(input.userId),
    user_role: normalizeNullableString(input.userRole),
    ...sanitizeDetails(input.details),
  };
}

function defaultWrite(entry: {
  level: TelemetryLevel;
  record: TelemetryEventRecord;
  serialized: string;
}): void {
  void entry;
}

export function createTelemetryLogger(config: TelemetryLoggerConfig) {
  const enabled = config.enabled ?? true;
  const write = config.write ?? defaultWrite;
  const now = config.now ?? (() => new Date());

  function log(input: TelemetryEventInput): TelemetryEventRecord {
    const record = buildTelemetryEvent(config, input, now());
    if (!enabled) {
      return record;
    }

    const serialized = JSON.stringify(record);
    write({
      level: record.level,
      record,
      serialized,
    });
    return record;
  }

  return {
    log,
    info(input: Omit<TelemetryEventInput, "level">): TelemetryEventRecord {
      return log({ ...input, level: "info" });
    },
    warn(input: Omit<TelemetryEventInput, "level">): TelemetryEventRecord {
      return log({ ...input, level: "warn" });
    },
    error(input: Omit<TelemetryEventInput, "level">): TelemetryEventRecord {
      return log({ ...input, level: "error" });
    },
  };
}
