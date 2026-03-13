import { describe, expect, it, vi } from "vitest";

import {
  buildTelemetryEvent,
  buildTelemetryHeaderMap,
  CONNECTOR_RUN_ID_HEADER,
  createTraceparent,
  createTelemetryCorrelation,
  createTelemetryLogger,
  mergeTelemetryCorrelation,
  parseTraceparent,
  REQUEST_ID_HEADER,
  resolveTelemetryRequestHeaders,
  RUN_ID_HEADER,
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
} from "../index.js";

describe("@praedixa/telemetry", () => {
  it("fills missing optional correlation fields with null and defaults traceId to requestId", () => {
    expect(
      createTelemetryCorrelation({
        requestId: "req-123",
      }),
    ).toEqual({
      requestId: "req-123",
      traceId: "req-123",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: null,
      siteId: null,
    });
  });

  it("merges correlation updates without dropping existing values", () => {
    const base = createTelemetryCorrelation({
      requestId: "req-123",
      organizationId: "org-1",
    });

    expect(
      mergeTelemetryCorrelation(base, {
        siteId: "site-1",
        runId: "run-1",
      }),
    ).toEqual({
      requestId: "req-123",
      traceId: "req-123",
      traceparent: null,
      tracestate: null,
      runId: "run-1",
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: "org-1",
      siteId: "site-1",
    });
  });

  it("resolves stable request correlation headers and keeps valid inbound trace context", () => {
    const headers = resolveTelemetryRequestHeaders({
      requestId: "req-edge-1",
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: "vendor=demo",
    });

    expect(headers).toEqual({
      requestId: "req-edge-1",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: "vendor=demo",
    });
    expect(buildTelemetryHeaderMap(headers)).toEqual({
      [REQUEST_ID_HEADER]: "req-edge-1",
      [TRACEPARENT_HEADER]:
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      [TRACESTATE_HEADER]: "vendor=demo",
    });
  });

  it("adds business correlation headers only when they are known", () => {
    const headers = buildTelemetryHeaderMap({
      requestId: "req-edge-1",
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: null,
      runId: "run-42",
      connectorRunId: "sync-42",
    });

    expect(headers).toEqual({
      [REQUEST_ID_HEADER]: "req-edge-1",
      [TRACEPARENT_HEADER]:
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      [RUN_ID_HEADER]: "run-42",
      [CONNECTOR_RUN_ID_HEADER]: "sync-42",
    });
  });

  it("creates a new traceparent when inbound trace context is missing or malformed", () => {
    const headers = resolveTelemetryRequestHeaders({
      requestId: "",
      traceparent: "bad-traceparent",
      generateRequestId: () => "req-generated-1",
      generateTraceId: () => "11111111111111111111111111111111",
      generateParentId: () => "2222222222222222",
    });

    expect(headers).toEqual({
      requestId: "req-generated-1",
      traceId: "11111111111111111111111111111111",
      traceparent: "00-11111111111111111111111111111111-2222222222222222-01",
      tracestate: null,
    });
    expect(parseTraceparent(headers.traceparent)).toMatchObject({
      traceId: "11111111111111111111111111111111",
      parentId: "2222222222222222",
    });
  });

  it("builds valid traceparent values and rejects malformed all-zero ids", () => {
    expect(
      createTraceparent("4bf92f3577b34da6a3ce929d0e0e4736", "00f067aa0ba902b7"),
    ).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(() =>
      createTraceparent("00000000000000000000000000000000", "00f067aa0ba902b7"),
    ).toThrow("Traceparent traceId must be 32 non-zero hex characters");
  });

  it("builds a stable telemetry envelope and keeps reserved keys under control", () => {
    const record = buildTelemetryEvent(
      {
        service: "api",
        env: "staging",
      },
      {
        event: "request.completed",
        message: "Request completed",
        correlation: createTelemetryCorrelation({
          requestId: "req-123",
          traceId: "trace-123",
          traceparent:
            "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
          tracestate: "vendor=demo",
          organizationId: "org-1",
        }),
        status: "completed",
        statusCode: 200,
        durationMs: 42,
        path: "/api/v1/health",
        details: {
          route_template: "ignored",
          custom_field: "kept",
        },
      },
      new Date("2026-03-12T13:20:00.000Z"),
    );

    expect(record).toMatchObject({
      timestamp: "2026-03-12T13:20:00.000Z",
      level: "info",
      service: "api",
      env: "staging",
      event: "request.completed",
      message: "Request completed",
      request_id: "req-123",
      trace_id: "trace-123",
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: "vendor=demo",
      run_id: null,
      connector_run_id: null,
      action_id: null,
      contract_version: null,
      organization_id: "org-1",
      site_id: null,
      status: "completed",
      status_code: 200,
      duration_ms: 42,
      path: "/api/v1/health",
      custom_field: "kept",
    });
    expect(record.route_template).toBeNull();
  });

  it("writes serialized telemetry via the injected sink", () => {
    const write = vi.fn();
    const logger = createTelemetryLogger({
      service: "api",
      env: "production",
      write,
      now: () => new Date("2026-03-12T13:20:00.000Z"),
    });

    const record = logger.warn({
      event: "request.completed",
      message: "Completed",
      correlation: createTelemetryCorrelation({
        requestId: "req-123",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      }),
      statusCode: 429,
    });

    expect(record.level).toBe("warn");
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[0]).toMatchObject({
      level: "warn",
      serialized: expect.any(String),
      record: expect.objectContaining({
        request_id: "req-123",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        status_code: 429,
      }),
    });
  });
});
