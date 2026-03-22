export type {
  TelemetryCorrelationContext,
  TelemetryHeaderValue,
  ParsedTraceparent,
  ResolveTelemetryRequestHeadersInput,
  ResolvedTelemetryRequestHeaders,
  TelemetryBusinessHeaderInput,
  TelemetryCorrelationInput,
} from "./correlation.js";
export {
  buildTelemetryHeaderMap,
  CONNECTOR_RUN_ID_HEADER,
  createTraceparent,
  createTelemetryCorrelation,
  parseTraceparent,
  REQUEST_ID_HEADER,
  resolveTelemetryRequestHeaders,
  RUN_ID_HEADER,
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
  mergeTelemetryCorrelation,
} from "./correlation.js";
export type {
  TelemetryEventInput,
  TelemetryEventRecord,
  TelemetryLevel,
  TelemetryLoggerConfig,
} from "./logger.js";
export { buildTelemetryEvent, createTelemetryLogger } from "./logger.js";
