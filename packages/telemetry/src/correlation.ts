export const REQUEST_ID_HEADER = "X-Request-ID";
export const RUN_ID_HEADER = "X-Run-ID";
export const CONNECTOR_RUN_ID_HEADER = "X-Connector-Run-ID";
export const TRACEPARENT_HEADER = "traceparent";
export const TRACESTATE_HEADER = "tracestate";

export type TelemetryHeaderValue =
  | string
  | readonly string[]
  | null
  | undefined;

export interface TelemetryCorrelationInput {
  requestId: string;
  traceId?: string | null;
  traceparent?: string | null;
  tracestate?: string | null;
  runId?: string | null;
  connectorRunId?: string | null;
  actionId?: string | null;
  contractVersion?: string | null;
  organizationId?: string | null;
  siteId?: string | null;
}

export interface TelemetryCorrelationContext {
  requestId: string;
  traceId: string;
  traceparent: string | null;
  tracestate: string | null;
  runId: string | null;
  connectorRunId: string | null;
  actionId: string | null;
  contractVersion: string | null;
  organizationId: string | null;
  siteId: string | null;
}

export interface ParsedTraceparent {
  version: string;
  traceId: string;
  parentId: string;
  traceFlags: string;
  raw: string;
}

export interface ResolvedTelemetryRequestHeaders {
  requestId: string;
  traceId: string;
  traceparent: string;
  tracestate: string | null;
}

export interface TelemetryBusinessHeaderInput {
  runId?: string | null;
  connectorRunId?: string | null;
}

export interface ResolveTelemetryRequestHeadersInput {
  requestId?: TelemetryHeaderValue;
  traceparent?: TelemetryHeaderValue;
  tracestate?: TelemetryHeaderValue;
  generateRequestId?: () => string;
  generateTraceId?: () => string;
  generateParentId?: () => string;
}

const MAX_CORRELATION_LENGTH = 128;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_TRACESTATE_LENGTH = 512;
const TRACEPARENT_PATTERN =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

function randomHex(bytes: number): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(bytes)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeCorrelationValue(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, MAX_CORRELATION_LENGTH);
}

export function normalizeTelemetryCorrelationValue(
  value: string | null | undefined,
): string | null {
  return normalizeCorrelationValue(value);
}

function coerceHeaderValue(value: TelemetryHeaderValue): string | null {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0) ?? null;
  }

  return typeof value === "string" ? value : null;
}

export function normalizeTelemetryRequestId(
  value: TelemetryHeaderValue,
): string | null {
  const trimmed = coerceHeaderValue(value)?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_REQUEST_ID_LENGTH);
}

export function parseTraceparent(
  value: TelemetryHeaderValue,
): ParsedTraceparent | null {
  const raw = coerceHeaderValue(value)?.trim().toLowerCase() ?? "";
  if (raw.length === 0) {
    return null;
  }

  const match = TRACEPARENT_PATTERN.exec(raw);
  if (match == null) {
    return null;
  }

  const version = match[1];
  const traceId = match[2];
  const parentId = match[3];
  const traceFlags = match[4];
  if (
    version == null ||
    traceId == null ||
    parentId == null ||
    traceFlags == null
  ) {
    return null;
  }

  if (
    traceId === "00000000000000000000000000000000" ||
    parentId === "0000000000000000"
  ) {
    return null;
  }

  return {
    version,
    traceId,
    parentId,
    traceFlags,
    raw,
  };
}

export function normalizeTracestate(
  value: TelemetryHeaderValue,
): string | null {
  const trimmed = coerceHeaderValue(value)?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return null;
  }

  return trimmed.slice(0, MAX_TRACESTATE_LENGTH);
}

export function createTraceparent(
  traceId = randomHex(16),
  parentId = randomHex(8),
  traceFlags = "01",
): string {
  const normalizedTraceId = traceId.trim().toLowerCase();
  const normalizedParentId = parentId.trim().toLowerCase();
  const normalizedTraceFlags = traceFlags.trim().toLowerCase();

  if (
    !/^[0-9a-f]{32}$/.test(normalizedTraceId) ||
    normalizedTraceId === "00000000000000000000000000000000"
  ) {
    throw new Error("Traceparent traceId must be 32 non-zero hex characters");
  }

  if (
    !/^[0-9a-f]{16}$/.test(normalizedParentId) ||
    normalizedParentId === "0000000000000000"
  ) {
    throw new Error("Traceparent parentId must be 16 non-zero hex characters");
  }

  if (!/^[0-9a-f]{2}$/.test(normalizedTraceFlags)) {
    throw new Error("Traceparent traceFlags must be 2 hex characters");
  }

  return `00-${normalizedTraceId}-${normalizedParentId}-${normalizedTraceFlags}`;
}

export function resolveTelemetryRequestHeaders(
  input: ResolveTelemetryRequestHeadersInput,
): ResolvedTelemetryRequestHeaders {
  const requestId =
    normalizeTelemetryRequestId(input.requestId) ??
    (input.generateRequestId ?? (() => globalThis.crypto.randomUUID()))();
  const parsedTraceparent = parseTraceparent(input.traceparent);
  const traceparent =
    parsedTraceparent?.raw ??
    createTraceparent(
      (input.generateTraceId ?? (() => randomHex(16)))(),
      (input.generateParentId ?? (() => randomHex(8)))(),
    );

  return {
    requestId,
    traceId: parseTraceparent(traceparent)?.traceId ?? requestId,
    traceparent,
    tracestate: normalizeTracestate(input.tracestate),
  };
}

export function buildTelemetryHeaderMap(
  input: Pick<
    ResolvedTelemetryRequestHeaders,
    "requestId" | "traceparent" | "tracestate"
  > &
    TelemetryBusinessHeaderInput,
): Record<string, string> {
  const headers: Record<string, string> = {
    [REQUEST_ID_HEADER]: input.requestId,
    [TRACEPARENT_HEADER]: input.traceparent,
  };

  if (input.tracestate != null) {
    headers[TRACESTATE_HEADER] = input.tracestate;
  }

  const runId = normalizeCorrelationValue(input.runId);
  if (runId != null) {
    headers[RUN_ID_HEADER] = runId;
  }

  const connectorRunId = normalizeCorrelationValue(input.connectorRunId);
  if (connectorRunId != null) {
    headers[CONNECTOR_RUN_ID_HEADER] = connectorRunId;
  }

  return headers;
}

export function createTelemetryCorrelation(
  input: TelemetryCorrelationInput,
): TelemetryCorrelationContext {
  const requestId = normalizeCorrelationValue(input.requestId);
  if (requestId == null) {
    throw new Error("Telemetry correlation requires a non-empty requestId");
  }
  const parsedTraceparent = parseTraceparent(input.traceparent);

  return {
    requestId,
    traceId:
      normalizeCorrelationValue(input.traceId) ??
      parsedTraceparent?.traceId ??
      requestId,
    traceparent: parsedTraceparent?.raw ?? null,
    tracestate: normalizeTracestate(input.tracestate),
    runId: normalizeCorrelationValue(input.runId),
    connectorRunId: normalizeCorrelationValue(input.connectorRunId),
    actionId: normalizeCorrelationValue(input.actionId),
    contractVersion: normalizeCorrelationValue(input.contractVersion),
    organizationId: normalizeCorrelationValue(input.organizationId),
    siteId: normalizeCorrelationValue(input.siteId),
  };
}

export function mergeTelemetryCorrelation(
  base: TelemetryCorrelationContext,
  updates: Partial<TelemetryCorrelationInput>,
): TelemetryCorrelationContext {
  return createTelemetryCorrelation({
    requestId: updates.requestId ?? base.requestId,
    traceId: updates.traceId ?? base.traceId,
    traceparent: updates.traceparent ?? base.traceparent,
    tracestate: updates.tracestate ?? base.tracestate,
    runId: updates.runId ?? base.runId,
    connectorRunId: updates.connectorRunId ?? base.connectorRunId,
    actionId: updates.actionId ?? base.actionId,
    contractVersion: updates.contractVersion ?? base.contractVersion,
    organizationId: updates.organizationId ?? base.organizationId,
    siteId: updates.siteId ?? base.siteId,
  });
}
