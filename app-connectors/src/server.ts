import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";

import { loadConfig } from "./config.js";
import { failure } from "./response.js";
import { RouteMatchError, compileRoutes, matchRoute } from "./router.js";
import { routes } from "./routes.js";
import { redactSensitive, safeEqualSecret } from "./security.js";
import type {
  AppConfig,
  AuthenticatedServicePrincipal,
  CompiledRoute,
  HttpMethod,
  RouteContext,
  RouteRateLimit,
  RouteResult,
  ServiceTokenConfig,
  ServiceTokenCapability,
} from "./types.js";

const compiledRoutes = compileRoutes(routes);
const REQUEST_ID_HEADER = "X-Request-ID";
const RUN_ID_HEADER = "X-Run-ID";
const CONNECTOR_RUN_ID_HEADER = "X-Connector-Run-ID";
export const CORS_ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
export const CORS_ALLOWED_HEADERS =
  "Authorization,Content-Type,Idempotency-Key,X-Request-ID,X-Run-ID,X-Connector-Run-ID,Accept,Accept-Language,X-Praedixa-Key-Id,X-Praedixa-Timestamp,X-Praedixa-Signature";

export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
} as const;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const BODY_METHODS: readonly HttpMethod[] = ["POST", "PATCH", "PUT", "DELETE"];
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();
const MAX_CORRELATION_HEADER_LENGTH = 128;
const LOG_ALIAS_KEYS = new Set([
  "requestId",
  "request_id",
  "runId",
  "run_id",
  "connectorRunId",
  "connector_run_id",
  "actionId",
  "action_id",
  "contractVersion",
  "contract_version",
  "organizationId",
  "organization_id",
  "siteId",
  "site_id",
  "traceId",
  "trace_id",
  "spanId",
  "span_id",
  "statusCode",
  "status_code",
  "durationMs",
  "duration_ms",
  "errorCode",
  "error_code",
  "clientIp",
  "ip",
]);
type BodyReadErrorCode = "PAYLOAD_TOO_LARGE" | "INVALID_JSON";

class BodyReadError extends Error {
  readonly code: BodyReadErrorCode;

  constructor(code: BodyReadErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeOrigin(rawOrigin: string | undefined): string | null {
  if (rawOrigin == null || rawOrigin.trim() === "") {
    return null;
  }

  try {
    return new URL(rawOrigin).origin;
  } catch {
    return null;
  }
}

function isHttpOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function resolveCorsHeaders(
  requestOrigin: string | null,
  allowedOrigins: readonly string[],
): Record<string, string> {
  if (requestOrigin == null) {
    return {};
  }

  if (!allowedOrigins.includes(requestOrigin) || !isHttpOrigin(requestOrigin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  corsHeaders: Record<string, string>,
  extraHeaders?: Record<string, string>,
): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...SECURITY_HEADERS,
    ...corsHeaders,
    ...extraHeaders,
  });
  response.end(body);
}

function hasRequestBody(request: IncomingMessage): boolean {
  const transferEncoding = request.headers["transfer-encoding"];
  if (
    typeof transferEncoding === "string" &&
    transferEncoding.trim().length > 0
  ) {
    return true;
  }

  const contentLength = request.headers["content-length"];
  if (contentLength == null) {
    return false;
  }
  const raw = Array.isArray(contentLength) ? contentLength[0] : contentLength;
  if (raw == null) {
    return false;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return false;
  }

  return value > 0;
}

export function isJsonContentType(
  contentType: string | string[] | undefined,
): boolean {
  if (contentType == null) {
    return false;
  }
  const raw = Array.isArray(contentType) ? contentType[0] : contentType;
  if (raw == null) {
    return false;
  }
  const mediaType = raw.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

function logStructuredEvent(
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const remainingFields = Object.fromEntries(
    Object.entries(details).filter(([key]) => !LOG_ALIAS_KEYS.has(key)),
  );
  const requestId =
    (details.request_id as string | null | undefined) ??
    (details.requestId as string | null | undefined) ??
    null;
  const traceId =
    (details.trace_id as string | null | undefined) ??
    (details.traceId as string | null | undefined) ??
    null;
  const envelope = redactSensitive({
    timestamp: new Date().toISOString(),
    level,
    service: "connectors",
    env: process.env.NODE_ENV ?? "development",
    event,
    message:
      (details.message as string | null | undefined) ??
      (level === "error" ? "Connector request failed" : event),
    request_id: requestId,
    run_id:
      (details.run_id as string | null | undefined) ??
      (details.runId as string | null | undefined) ??
      null,
    connector_run_id:
      (details.connector_run_id as string | null | undefined) ??
      (details.connectorRunId as string | null | undefined) ??
      null,
    action_id:
      (details.action_id as string | null | undefined) ??
      (details.actionId as string | null | undefined) ??
      null,
    contract_version:
      (details.contract_version as string | null | undefined) ??
      (details.contractVersion as string | null | undefined) ??
      null,
    organization_id:
      (details.organization_id as string | null | undefined) ??
      (details.organizationId as string | null | undefined) ??
      null,
    site_id:
      (details.site_id as string | null | undefined) ??
      (details.siteId as string | null | undefined) ??
      null,
    trace_id: traceId,
    span_id:
      (details.span_id as string | null | undefined) ??
      (details.spanId as string | null | undefined) ??
      null,
    status: (details.status as string | null | undefined) ?? null,
    status_code:
      (details.status_code as number | null | undefined) ??
      (details.statusCode as number | null | undefined) ??
      null,
    duration_ms:
      (details.duration_ms as number | null | undefined) ??
      (details.durationMs as number | null | undefined) ??
      null,
    attempt: (details.attempt as number | null | undefined) ?? null,
    error_code:
      (details.error_code as string | null | undefined) ??
      (details.errorCode as string | null | undefined) ??
      null,
    client_ip:
      (details.clientIp as string | null | undefined) ??
      (details.ip as string | null | undefined) ??
      null,
    ...remainingFields,
  });
  const payload = JSON.stringify(envelope);
  if (level === "error") {
    process.stderr.write(`${payload}\n`);
    return;
  }
  process.stdout.write(`${payload}\n`);
}

function logSecurityEvent(
  event: string,
  requestId: string,
  payload: Record<string, unknown>,
): void {
  logStructuredEvent("warn", event, { requestId, ...payload });
}

function extractTraceId(
  traceparentHeader: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(traceparentHeader)
    ? traceparentHeader[0]
    : traceparentHeader;
  if (raw == null) {
    return null;
  }

  const match = raw.match(/^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function resolveClientIp(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  remoteAddress: string | null | undefined,
  trustProxy = false,
): string | null {
  if (trustProxy) {
    const cfConnectingIp = headers["cf-connecting-ip"];
    if (
      typeof cfConnectingIp === "string" &&
      cfConnectingIp.trim().length > 0
    ) {
      return cfConnectingIp.trim();
    }

    const forwardedFor = headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    if (
      typeof forwardedValue === "string" &&
      forwardedValue.trim().length > 0
    ) {
      return (
        forwardedValue
          .split(",")
          .map((value) => value.trim())
          .find((value) => value.length > 0) ?? null
      );
    }
  }

  return remoteAddress ?? null;
}

function getClientIp(
  request: IncomingMessage,
  trustProxy: boolean,
): string | null {
  return resolveClientIp(
    request.headers,
    request.socket.remoteAddress ?? null,
    trustProxy,
  );
}

async function readBody(
  request: IncomingMessage,
): Promise<{ parsed: unknown; rawBody: string | null }> {
  return await new Promise<{ parsed: unknown; rawBody: string | null }>(
    (resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let settled = false;

      function safeReject(error: BodyReadError): void {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      }

      function safeResolve(payload: {
        parsed: unknown;
        rawBody: string | null;
      }): void {
        if (settled) {
          return;
        }
        settled = true;
        resolve(payload);
      }

      request.on("data", (chunk: Buffer | string) => {
        const data = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        size += data.length;
        if (size > MAX_REQUEST_BODY_BYTES) {
          request.destroy();
          safeReject(
            new BodyReadError(
              "PAYLOAD_TOO_LARGE",
              "Request body exceeds max allowed size",
            ),
          );
          return;
        }
        chunks.push(data);
      });
      request.on("end", () => {
        if (chunks.length === 0) {
          safeResolve({ parsed: null, rawBody: null });
          return;
        }
        const text = Buffer.concat(chunks).toString("utf8");
        try {
          safeResolve({ parsed: JSON.parse(text), rawBody: text });
        } catch {
          safeReject(
            new BodyReadError(
              "INVALID_JSON",
              "Request body must be valid JSON",
            ),
          );
        }
      });
      request.on("error", () => safeResolve({ parsed: null, rawBody: null }));
    },
  );
}

function normalizeMethod(rawMethod: string | undefined): HttpMethod | null {
  if (rawMethod == null) {
    return null;
  }

  const upper = rawMethod.toUpperCase();
  if (
    upper !== "GET" &&
    upper !== "POST" &&
    upper !== "PATCH" &&
    upper !== "PUT" &&
    upper !== "DELETE"
  ) {
    return null;
  }
  return upper;
}

function parseBearerToken(authorization: string | undefined): string | null {
  if (authorization == null) {
    return null;
  }
  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || rest.length !== 1) {
    return null;
  }
  return rest[0] ?? null;
}

export function authenticateServiceToken(
  serviceTokens: readonly ServiceTokenConfig[],
  authorization: string | undefined,
): AuthenticatedServicePrincipal | null {
  const token = parseBearerToken(authorization);
  let matchedPrincipal: AuthenticatedServicePrincipal | null = null;

  for (const serviceToken of serviceTokens) {
    if (safeEqualSecret(serviceToken.token, token)) {
      matchedPrincipal = {
        name: serviceToken.name,
        allowedOrgs: serviceToken.allowedOrgs,
        capabilities: serviceToken.capabilities,
      };
    }
  }

  return matchedPrincipal;
}

export function canAccessOrganization(
  principal: AuthenticatedServicePrincipal,
  organizationId: string | undefined,
): boolean {
  if (organizationId == null || organizationId.length === 0) {
    return true;
  }

  return principal.allowedOrgs.includes(organizationId);
}

export function hasRequiredCapabilities(
  principal: AuthenticatedServicePrincipal,
  requiredCapabilities: readonly ServiceTokenCapability[],
): boolean {
  if (requiredCapabilities.length === 0) {
    return true;
  }

  return requiredCapabilities.every((capability) =>
    principal.capabilities.includes(capability),
  );
}

export function resolveRateLimitPolicy(
  route: Pick<CompiledRoute, "rateLimit">,
): RouteRateLimit | null {
  return route.rateLimit;
}

export function consumeRateLimit(
  key: string,
  policy: RouteRateLimit,
  nowMs = Date.now(),
  store: Map<string, number[]> = RATE_LIMIT_BUCKETS,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const windowStart = nowMs - policy.windowMs;
  const timestamps = (store.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (timestamps.length >= policy.maxRequests) {
    store.set(key, timestamps);
    const oldestTimestamp = timestamps[0] ?? nowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldestTimestamp + policy.windowMs - nowMs) / 1000),
      ),
    };
  }

  timestamps.push(nowMs);
  store.set(key, timestamps);
  return {
    allowed: true,
    remaining: Math.max(0, policy.maxRequests - timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function clearRateLimitBuckets(): void {
  RATE_LIMIT_BUCKETS.clear();
}

type RequestLogLevel = "info" | "warn" | "error";

interface RequestLogState {
  requestId: string;
  traceId: string;
  runId: string | null;
  connectorRunId: string | null;
  actionId: string | null;
  contractVersion: string | null;
  organizationId: string | null;
  siteId: string | null;
  routeTemplate: string | null;
  principal: string | null;
  method: HttpMethod;
  path: string;
  clientIp: string | null;
  origin: string | null;
}

interface RequestLogInput extends RequestLogState {
  event: string;
  message: string;
  level: RequestLogLevel;
  status: "started" | "completed" | "failed" | "rejected";
  statusCode: number | null;
  durationMs: number | null;
  errorCode: string | null;
}

interface RequestCorrelationState {
  requestId: string;
  traceId: string;
  runId: string | null;
  connectorRunId: string | null;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  return value?.trim() || null;
}

function normalizeCorrelationHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, MAX_CORRELATION_HEADER_LENGTH);
}

function resolveTraceId(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  requestId: string,
): string {
  return (
    extractTraceId(headers.traceparent) ??
    firstHeaderValue(headers["x-trace-id"]) ??
    requestId
  );
}

export function resolveRequestCorrelation(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  fallbackRequestId: string,
): RequestCorrelationState {
  const requestId =
    normalizeCorrelationHeaderValue(
      firstHeaderValue(headers["x-request-id"]),
    ) ?? fallbackRequestId;

  return {
    requestId,
    traceId: resolveTraceId(headers, requestId),
    runId: normalizeCorrelationHeaderValue(
      firstHeaderValue(headers["x-run-id"]),
    ),
    connectorRunId: normalizeCorrelationHeaderValue(
      firstHeaderValue(headers["x-connector-run-id"]),
    ),
  };
}

export function buildResponseCorrelationHeaders(
  state: Pick<
    RequestCorrelationState,
    "requestId" | "runId" | "connectorRunId"
  >,
): Record<string, string> {
  const headers: Record<string, string> = {
    [REQUEST_ID_HEADER]: state.requestId,
  };

  if (state.runId != null) {
    headers[RUN_ID_HEADER] = state.runId;
  }

  if (state.connectorRunId != null) {
    headers[CONNECTOR_RUN_ID_HEADER] = state.connectorRunId;
  }

  return headers;
}

function getResultErrorCode(result: RouteResult): string | null {
  return result.payload.success === false ? result.payload.error.code : null;
}

export function buildRequestLogEntry(
  config: Pick<AppConfig, "nodeEnv">,
  input: RequestLogInput,
): Record<string, unknown> {
  return redactSensitive({
    timestamp: new Date().toISOString(),
    level: input.level,
    service: "connectors",
    env: config.nodeEnv,
    event: input.event,
    message: input.message,
    request_id: input.requestId,
    trace_id: input.traceId,
    run_id: input.runId,
    connector_run_id: input.connectorRunId,
    action_id: input.actionId,
    contract_version: input.contractVersion,
    organization_id: input.organizationId,
    site_id: input.siteId,
    route_template: input.routeTemplate,
    principal: input.principal,
    method: input.method,
    path: input.path,
    client_ip: input.clientIp,
    origin: input.origin,
    status: input.status,
    status_code: input.statusCode,
    duration_ms: input.durationMs,
    error_code: input.errorCode,
  });
}

function writeRequestLog(
  config: Pick<AppConfig, "nodeEnv">,
  input: RequestLogInput,
): void {
  const line = `${JSON.stringify(buildRequestLogEntry(config, input))}\n`;
  if (input.level === "info") {
    process.stdout.write(line);
    return;
  }
  process.stderr.write(line);
}

function buildRateLimitKey(
  routeTemplate: string,
  policy: RouteRateLimit,
  clientIp: string | null,
  principalName: string | null,
): string {
  const actorKey =
    policy.scope === "principal"
      ? (principalName ?? clientIp ?? "anonymous")
      : (clientIp ?? "anonymous");

  return `${routeTemplate}:${policy.scope}:${actorKey}`;
}

export function createAppServer(config: AppConfig) {
  return createServer(async (request, response) => {
    const requestCorrelation = resolveRequestCorrelation(
      request.headers,
      randomUUID(),
    );
    const { requestId, traceId } = requestCorrelation;
    const clientIp = getClientIp(request, config.trustProxy);
    const requestOrigin = normalizeOrigin(request.headers.origin);
    const corsHeaders = resolveCorsHeaders(requestOrigin, config.corsOrigins);
    const startedAtMs = Date.now();
    let requestLogState: RequestLogState | null = null;
    const baseResponseCorrelationHeaders =
      buildResponseCorrelationHeaders(requestCorrelation);

    for (const [headerName, headerValue] of Object.entries(
      baseResponseCorrelationHeaders,
    )) {
      response.setHeader(headerName, headerValue);
    }

    const syncRouteTelemetry = (ctx: RouteContext) => {
      if (requestLogState == null) {
        return;
      }
      requestLogState = {
        ...requestLogState,
        runId: ctx.runId,
        connectorRunId: ctx.connectorRunId,
        actionId: ctx.actionId,
        contractVersion: ctx.contractVersion,
        organizationId: ctx.organizationId,
        siteId: ctx.siteId,
      };
    };

    const logResult = (
      result: RouteResult,
      extraHeaders?: Record<string, string>,
    ) => {
      const correlationHeaders = buildResponseCorrelationHeaders({
        requestId: requestLogState?.requestId ?? requestCorrelation.requestId,
        runId: requestLogState?.runId ?? requestCorrelation.runId,
        connectorRunId:
          requestLogState?.connectorRunId ?? requestCorrelation.connectorRunId,
      });
      if (requestLogState != null) {
        const isServerError = result.statusCode >= 500;
        writeRequestLog(config, {
          ...requestLogState,
          event: isServerError ? "request.failed" : "request.completed",
          message: isServerError
            ? "Connector request failed"
            : "Connector request completed",
          level: isServerError
            ? "error"
            : result.statusCode >= 400
              ? "warn"
              : "info",
          status: isServerError
            ? "failed"
            : result.statusCode >= 400
              ? "rejected"
              : "completed",
          statusCode: result.statusCode,
          durationMs: Date.now() - startedAtMs,
          errorCode: getResultErrorCode(result),
        });
      }
      writeJson(response, result.statusCode, result.payload, corsHeaders, {
        ...correlationHeaders,
        ...extraHeaders,
      });
    };

    if (request.method?.toUpperCase() === "OPTIONS") {
      response.writeHead(200, {
        "cache-control": "no-store",
        ...SECURITY_HEADERS,
        ...corsHeaders,
        ...baseResponseCorrelationHeaders,
      });
      response.end();
      return;
    }

    const method = normalizeMethod(request.method);
    if (method == null) {
      const result = failure(
        "METHOD_NOT_ALLOWED",
        "Unsupported HTTP method",
        requestId,
        405,
      );
      writeJson(
        response,
        result.statusCode,
        result.payload,
        corsHeaders,
        baseResponseCorrelationHeaders,
      );
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    let matched: ReturnType<typeof matchRoute>;
    try {
      matched = matchRoute(compiledRoutes, method, requestUrl.pathname);
    } catch (error) {
      if (error instanceof RouteMatchError) {
        const result = failure("INVALID_PATH", error.message, requestId, 400);
        writeJson(
          response,
          result.statusCode,
          result.payload,
          corsHeaders,
          baseResponseCorrelationHeaders,
        );
        return;
      }

      logSecurityEvent("connectors.route.match_error", requestId, {
        path: requestUrl.pathname,
        method,
        clientIp,
      });
      const result = failure(
        "INTERNAL_ERROR",
        "Unexpected connector runtime error",
        requestId,
        500,
      );
      writeJson(
        response,
        result.statusCode,
        result.payload,
        corsHeaders,
        baseResponseCorrelationHeaders,
      );
      return;
    }

    if (matched == null) {
      const result = failure("NOT_FOUND", "Route not found", requestId, 404, {
        path: requestUrl.pathname,
        method,
      });
      writeJson(
        response,
        result.statusCode,
        result.payload,
        corsHeaders,
        baseResponseCorrelationHeaders,
      );
      return;
    }

    requestLogState = {
      requestId,
      traceId,
      runId: requestCorrelation.runId,
      connectorRunId: requestCorrelation.connectorRunId,
      actionId: null,
      contractVersion: null,
      organizationId: matched.params.orgId ?? null,
      siteId: null,
      routeTemplate: matched.route.template,
      principal: null,
      method,
      path: requestUrl.pathname,
      clientIp,
      origin: requestOrigin,
    };

    writeRequestLog(config, {
      ...requestLogState,
      event: "request.started",
      message: "Connector request started",
      level: "info",
      status: "started",
      statusCode: null,
      durationMs: null,
      errorCode: null,
    });

    const rateLimitPolicy = resolveRateLimitPolicy(matched.route);

    const incomingHasBody = hasRequestBody(request);
    if (
      BODY_METHODS.includes(method) &&
      incomingHasBody &&
      !isJsonContentType(request.headers["content-type"])
    ) {
      const result = failure(
        "UNSUPPORTED_MEDIA_TYPE",
        "Request body must use Content-Type application/json",
        requestId,
        415,
      );
      logResult(result);
      return;
    }

    let principal: AuthenticatedServicePrincipal | null = null;
    if (matched.route.authRequired) {
      principal = authenticateServiceToken(
        config.serviceTokens,
        request.headers.authorization,
      );
      if (principal == null) {
        logSecurityEvent("connectors.auth.failed", requestId, {
          path: requestUrl.pathname,
          method,
          origin: requestOrigin,
          clientIp,
        });
        const result = failure(
          "UNAUTHORIZED",
          "Invalid internal service token",
          requestId,
          401,
        );
        logResult(result);
        return;
      }

      requestLogState =
        requestLogState == null
          ? null
          : {
              ...requestLogState,
              principal: principal.name,
            };

      const organizationId = matched.params.orgId;
      if (!canAccessOrganization(principal, organizationId)) {
        logSecurityEvent("connectors.authz.failed", requestId, {
          path: requestUrl.pathname,
          method,
          origin: requestOrigin,
          clientIp,
          organizationId,
          principal: principal.name,
        });
        const result = failure(
          "FORBIDDEN",
          "Service token is not allowed to access this organization",
          requestId,
          403,
        );
        logResult(result);
        return;
      }
      if (
        !hasRequiredCapabilities(principal, matched.route.requiredCapabilities)
      ) {
        logSecurityEvent("connectors.authz.capability_failed", requestId, {
          path: requestUrl.pathname,
          method,
          origin: requestOrigin,
          clientIp,
          organizationId,
          principal: principal.name,
          requiredCapabilities: matched.route.requiredCapabilities,
        });
        const result = failure(
          "FORBIDDEN",
          "Service token lacks the required capability for this route",
          requestId,
          403,
        );
        logResult(result);
        return;
      }
    }

    if (rateLimitPolicy != null) {
      const rateLimitResult = consumeRateLimit(
        buildRateLimitKey(
          matched.route.template,
          rateLimitPolicy,
          clientIp,
          principal?.name ?? null,
        ),
        rateLimitPolicy,
      );

      if (!rateLimitResult.allowed) {
        logSecurityEvent("connectors.http.rate_limited", requestId, {
          path: requestUrl.pathname,
          method,
          clientIp,
          principal: principal?.name ?? null,
          routeTemplate: matched.route.template,
        });
        const result = failure(
          "TOO_MANY_REQUESTS",
          "Rate limit exceeded",
          requestId,
          429,
          {
            retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          },
        );
        logResult(result, {
          "retry-after": String(rateLimitResult.retryAfterSeconds),
        });
        return;
      }
    }

    let body: unknown = null;
    let rawBody: string | null = null;
    if (BODY_METHODS.includes(method) && incomingHasBody) {
      try {
        const parsedBody = await readBody(request);
        body = parsedBody.parsed;
        rawBody = parsedBody.rawBody;
      } catch (error) {
        if (
          error instanceof BodyReadError &&
          error.code === "PAYLOAD_TOO_LARGE"
        ) {
          const result = failure(
            "PAYLOAD_TOO_LARGE",
            "Request body exceeds max allowed size",
            requestId,
            413,
          );
          logResult(result);
          return;
        }
        if (error instanceof BodyReadError && error.code === "INVALID_JSON") {
          const result = failure(
            "INVALID_JSON",
            "Request body must be valid JSON",
            requestId,
            400,
          );
          logResult(result);
          return;
        }
        const result = failure(
          "INVALID_BODY",
          "Unable to parse request body",
          requestId,
          400,
        );
        logResult(result);
        return;
      }
    }

    const routeCtx: RouteContext = {
      method,
      path: requestUrl.pathname,
      query: requestUrl.searchParams,
      requestId,
      traceId,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: matched.params.orgId ?? null,
      siteId: null,
      params: matched.params,
      body,
      rawBody,
      clientIp,
      headers: request.headers,
      principal,
    };

    try {
      const result = await matched.route.handler(routeCtx);
      syncRouteTelemetry(routeCtx);
      logResult(result);
    } catch {
      syncRouteTelemetry(routeCtx);
      logSecurityEvent("connectors.route.error", requestId, {
        path: requestUrl.pathname,
        method,
        clientIp,
        principal: principal?.name ?? null,
      });
      if (requestLogState != null) {
        writeRequestLog(config, {
          ...requestLogState,
          event: "request.failed",
          message: "Connector request failed",
          level: "error",
          status: "failed",
          statusCode: 500,
          durationMs: Date.now() - startedAtMs,
          errorCode: "INTERNAL_ERROR",
        });
      }
      const result = failure(
        "INTERNAL_ERROR",
        "Unexpected connector runtime error",
        requestId,
        500,
      );
      writeJson(
        response,
        result.statusCode,
        result.payload,
        corsHeaders,
        baseResponseCorrelationHeaders,
      );
    }
  });
}

export function startServer(config = loadConfig(process.env)) {
  const server = createAppServer(config);
  server.listen(config.port, config.host, () => {
    logStructuredEvent("info", "connectors.server.started", {
      host: config.host,
      port: config.port,
      status: "listening",
      message: "Connector runtime listening",
    });
  });
  return server;
}
