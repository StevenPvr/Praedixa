import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";

import {
  createTelemetryCorrelation,
  createTelemetryLogger,
} from "@praedixa/telemetry";
import { decodeJwtPayloadDetailed, parseBearerToken } from "./auth.js";
import { resolveApiExposurePolicy } from "./exposure-policy.js";
import { failure } from "./response.js";
import { compileRoutes, matchRoute } from "./router.js";
import { routes } from "./routes.js";
import type {
  AppConfig,
  CompiledRoute,
  HttpMethod,
  RouteContext,
  RouteRateLimit,
  RouteResult,
} from "./types.js";

const compiledRoutes = compileRoutes(routes);
export const CORS_ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
export const CORS_ALLOWED_HEADERS =
  "Authorization,Content-Type,X-Request-ID,X-Trace-ID,Accept,Accept-Language";

export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
} as const;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const BODY_METHODS: readonly HttpMethod[] = ["POST", "PATCH", "PUT", "DELETE"];
const DEFAULT_MUTATION_RATE_LIMIT: RouteRateLimit = {
  maxRequests: 90,
  scope: "principal",
  windowMs: 60_000,
};
const DEFAULT_ADMIN_MUTATION_RATE_LIMIT: RouteRateLimit = {
  maxRequests: 30,
  scope: "principal",
  windowMs: 60_000,
};
const DEFAULT_ADMIN_READ_RATE_LIMIT: RouteRateLimit = {
  maxRequests: 120,
  scope: "principal",
  windowMs: 60_000,
};
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();
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
  "method",
  "path",
  "origin",
  "message",
  "status",
  "user_agent",
  "userAgent",
  "user_id",
  "userId",
  "user_role",
  "role",
  "route_template",
  "routeTemplate",
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
  nodeEnv: AppConfig["nodeEnv"] = "production",
): Record<string, string> {
  if (requestOrigin == null) {
    return {};
  }

  const allowlisted = allowedOrigins.includes(requestOrigin);
  const allowDevOrigin =
    nodeEnv === "development" && isHttpOrigin(requestOrigin);

  if (!allowlisted && !allowDevOrigin) {
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

function sendResult(
  response: ServerResponse,
  result: RouteResult,
  corsHeaders: Record<string, string>,
  extraHeaders?: Record<string, string>,
): void {
  writeJson(
    response,
    result.statusCode,
    result.payload,
    corsHeaders,
    extraHeaders,
  );
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

function appendBodyChunk(
  chunks: Buffer[],
  chunk: Buffer | string,
  size: number,
): number {
  const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
  const nextSize = size + buffer.length;
  if (nextSize > MAX_REQUEST_BODY_BYTES) {
    throw new BodyReadError(
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds max allowed size",
    );
  }

  chunks.push(buffer);
  return nextSize;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  return await new Promise<unknown>((resolve, reject) => {
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

    function safeResolve(payload: unknown): void {
      if (settled) {
        return;
      }
      settled = true;
      resolve(payload);
    }

    request.on("data", (chunk: Buffer | string) => {
      try {
        size = appendBodyChunk(chunks, chunk, size);
      } catch (error) {
        request.destroy();
        safeReject(
          error instanceof BodyReadError
            ? error
            : new BodyReadError(
                "PAYLOAD_TOO_LARGE",
                "Request body exceeds max allowed size",
              ),
        );
      }
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        safeResolve(null);
        return;
      }

      const text = Buffer.concat(chunks).toString("utf8");
      try {
        safeResolve(JSON.parse(text));
      } catch {
        safeReject(
          new BodyReadError("INVALID_JSON", "Request body must be valid JSON"),
        );
      }
    });

    request.on("error", () => {
      safeResolve(null);
    });
  });
}

function isBodyMethod(method: HttpMethod): boolean {
  return BODY_METHODS.includes(method);
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

function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

function hasRequiredPermissions(
  userPermissions: readonly string[],
  requiredPermissions: readonly string[],
  permissionMode: "all" | "any",
): boolean {
  const normalizedUserPermissions = new Set(
    userPermissions
      .map((permission) => normalizePermission(permission))
      .filter((permission) => permission.length > 0),
  );
  const normalizedRequiredPermissions = requiredPermissions
    .map((permission) => normalizePermission(permission))
    .filter((permission) => permission.length > 0);

  if (normalizedRequiredPermissions.length === 0) {
    return true;
  }

  if (permissionMode === "any") {
    return normalizedRequiredPermissions.some((permission) =>
      normalizedUserPermissions.has(permission),
    );
  }

  return normalizedRequiredPermissions.every((permission) =>
    normalizedUserPermissions.has(permission),
  );
}

export function resolveClientIp(
  forwardedFor: string | string[] | undefined,
  remoteAddress: string | null | undefined,
  trustProxy = false,
): string | null {
  if (trustProxy) {
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
    request.headers["x-forwarded-for"],
    request.socket.remoteAddress ?? null,
    trustProxy,
  );
}

function writeTelemetryStream(entry: {
  level: "info" | "warn" | "error";
  serialized: string;
}): void {
  const payload = `${entry.serialized}\n`;
  if (entry.level === "error") {
    process.stderr.write(payload);
    return;
  }
  process.stdout.write(payload);
}

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return null;
}

function resolvePrimarySiteId(siteIds: readonly string[]): string | null {
  const primarySiteId = siteIds[0]?.trim();
  return primarySiteId ? primarySiteId : null;
}

function readNullableString(
  details: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readNullableNumber(
  details: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = details[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function createStructuredEventLogger(nodeEnv: AppConfig["nodeEnv"]) {
  const logger = createTelemetryLogger({
    service: "api",
    env: nodeEnv,
    enabled: process.env.NODE_ENV !== "test",
    write: writeTelemetryStream,
  });

  return (
    level: "info" | "warn" | "error",
    event: string,
    details: Record<string, unknown>,
  ): void => {
    const remainingFields = Object.fromEntries(
      Object.entries(details).filter(([key]) => !LOG_ALIAS_KEYS.has(key)),
    );

    const requestId = readNullableString(details, "request_id", "requestId");
    if (requestId == null) {
      return;
    }

    const logMethod =
      level === "error"
        ? logger.error
        : level === "warn"
          ? logger.warn
          : logger.info;

    logMethod({
      event,
      message:
        readNullableString(details, "message") ??
        (level === "error" ? "API request failed" : event),
      correlation: createTelemetryCorrelation({
        requestId,
        traceId: readNullableString(details, "trace_id", "traceId"),
        runId: readNullableString(details, "run_id", "runId"),
        connectorRunId: readNullableString(
          details,
          "connector_run_id",
          "connectorRunId",
        ),
        actionId: readNullableString(details, "action_id", "actionId"),
        contractVersion: readNullableString(
          details,
          "contract_version",
          "contractVersion",
        ),
        organizationId: readNullableString(
          details,
          "organization_id",
          "organizationId",
        ),
        siteId: readNullableString(details, "site_id", "siteId"),
      }),
      status: readNullableString(details, "status"),
      statusCode: readNullableNumber(details, "status_code", "statusCode"),
      durationMs: readNullableNumber(details, "duration_ms", "durationMs"),
      method: readNullableString(details, "method"),
      path: readNullableString(details, "path"),
      routeTemplate: readNullableString(
        details,
        "route_template",
        "routeTemplate",
      ),
      clientIp: readNullableString(details, "client_ip", "clientIp", "ip"),
      origin: readNullableString(details, "origin"),
      userAgent: readNullableString(details, "user_agent", "userAgent"),
      userId: readNullableString(details, "user_id", "userId"),
      userRole: readNullableString(details, "user_role", "role"),
      details: remainingFields,
    });
  };
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

export function resolveRateLimitPolicy(
  route: Pick<
    CompiledRoute,
    "authRequired" | "method" | "rateLimit" | "template"
  >,
): RouteRateLimit | null {
  if (route.rateLimit != null) {
    return route.rateLimit;
  }

  if (route.template.startsWith("/api/v1/admin/")) {
    return route.method === "GET"
      ? DEFAULT_ADMIN_READ_RATE_LIMIT
      : DEFAULT_ADMIN_MUTATION_RATE_LIMIT;
  }

  if (!isBodyMethod(route.method)) {
    return null;
  }

  return route.authRequired ? DEFAULT_MUTATION_RATE_LIMIT : null;
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

function buildRateLimitKey(
  routeTemplate: string,
  policy: RouteRateLimit,
  clientIp: string | null,
  userId: string | null,
): string {
  const actorKey =
    policy.scope === "principal"
      ? (userId ?? clientIp ?? "anonymous")
      : (clientIp ?? "anonymous");

  return `${routeTemplate}:${policy.scope}:${actorKey}`;
}

export function createAppServer(config: AppConfig) {
  const logStructuredEvent = createStructuredEventLogger(config.nodeEnv);

  return createServer(async (request, response) => {
    const requestId =
      readHeaderValue(request.headers["x-request-id"]) ?? randomUUID();
    const clientIp = getClientIp(request, config.trustProxy);
    const requestOrigin = normalizeOrigin(request.headers.origin);
    const corsHeaders = resolveCorsHeaders(
      requestOrigin,
      config.corsOrigins,
      config.nodeEnv,
    );
    const traceId =
      readHeaderValue(request.headers["x-trace-id"]) ??
      extractTraceId(request.headers.traceparent);
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const startedAt = Date.now();
    const userAgent =
      typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : Array.isArray(request.headers["user-agent"])
          ? (request.headers["user-agent"][0] ?? null)
          : null;
    let routeTemplate: string | null = null;
    let userId: string | null = null;
    let role: string | null = null;
    let organizationId: string | null = null;
    let siteId: string | null = null;
    let exposurePolicyId: string | null = null;
    let exposureClassification: string | null = null;
    let exposureAudience: string | null = null;

    response.setHeader("X-Request-ID", requestId);
    response.setHeader("X-Trace-ID", traceId ?? requestId);
    response.once("finish", () => {
      const statusCode = response.statusCode;
      logStructuredEvent(
        statusCode >= 500 ? "error" : "info",
        statusCode >= 500 ? "http.request.failed" : "http.request.completed",
        {
          requestId,
          traceId,
          method: request.method?.toUpperCase() ?? null,
          path: requestUrl.pathname,
          route_template: routeTemplate,
          origin: requestOrigin,
          clientIp,
          user_agent: userAgent,
          user_id: userId,
          role,
          organizationId,
          siteId,
          exposurePolicyId,
          exposureClassification,
          exposureAudience,
          status:
            statusCode >= 500
              ? "failed"
              : statusCode >= 400
                ? "rejected"
                : "completed",
          statusCode,
          durationMs: Date.now() - startedAt,
        },
      );
    });

    logStructuredEvent("info", "http.request.started", {
      requestId,
      traceId,
      method: request.method?.toUpperCase() ?? null,
      path: requestUrl.pathname,
      origin: requestOrigin,
      clientIp,
      user_agent: userAgent,
      exposurePolicyId,
      exposureClassification,
      exposureAudience,
      status: "started",
    });

    if (request.method?.toUpperCase() === "OPTIONS") {
      if (
        requestOrigin != null &&
        corsHeaders["Access-Control-Allow-Origin"] == null
      ) {
        logStructuredEvent("warn", "http.origin_forbidden", {
          requestId,
          traceId,
          method: "OPTIONS",
          path: request.url ?? "/",
          origin: requestOrigin,
          clientIp,
          errorCode: "FORBIDDEN",
          status: "rejected",
          statusCode: 403,
        });
        sendResult(
          response,
          failure(
            "FORBIDDEN",
            "Origin is not allowed by CORS policy",
            requestId,
            403,
            { origin: requestOrigin },
          ),
          corsHeaders,
        );
        return;
      }

      response.writeHead(200, {
        "cache-control": "no-store",
        ...SECURITY_HEADERS,
        ...corsHeaders,
      });
      response.end();
      return;
    }

    const method = normalizeMethod(request.method);
    if (method == null) {
      sendResult(
        response,
        failure(
          "METHOD_NOT_ALLOWED",
          "Unsupported HTTP method",
          requestId,
          405,
        ),
        corsHeaders,
      );
      return;
    }

    const matched = matchRoute(compiledRoutes, method, requestUrl.pathname);
    const isMutationRequest = isBodyMethod(method);

    if (matched == null) {
      sendResult(
        response,
        failure("NOT_FOUND", "Route not found", requestId, 404, {
          path: requestUrl.pathname,
          method,
        }),
        corsHeaders,
      );
      return;
    }
    routeTemplate = matched.route.template;

    const exposurePolicy = resolveApiExposurePolicy(matched.route.template);
    if (exposurePolicy == null) {
      logStructuredEvent("error", "http.exposure_policy_missing", {
        requestId,
        traceId,
        method,
        path: requestUrl.pathname,
        routeTemplate,
        clientIp,
        user_agent: userAgent,
        status: "failed",
        statusCode: 500,
      });
      sendResult(
        response,
        failure(
          "EXPOSURE_POLICY_MISSING",
          "Route exposure policy is missing",
          requestId,
          500,
          { routeTemplate: matched.route.template },
        ),
        corsHeaders,
      );
      return;
    }
    exposurePolicyId = exposurePolicy.id;
    exposureClassification = exposurePolicy.classification;
    exposureAudience = exposurePolicy.audience;

    const rateLimitPolicy = resolveRateLimitPolicy(matched.route);

    if (
      isMutationRequest &&
      requestOrigin != null &&
      corsHeaders["Access-Control-Allow-Origin"] == null
    ) {
      logStructuredEvent("warn", "http.origin_forbidden", {
        requestId,
        traceId,
        method,
        path: requestUrl.pathname,
        routeTemplate,
        origin: requestOrigin,
        ip: clientIp,
      });
      sendResult(
        response,
        failure(
          "FORBIDDEN",
          "Origin is not allowed for state-changing requests",
          requestId,
          403,
          { origin: requestOrigin },
        ),
        corsHeaders,
      );
      return;
    }

    const incomingHasBody = hasRequestBody(request);
    if (
      isMutationRequest &&
      incomingHasBody &&
      !isJsonContentType(request.headers["content-type"])
    ) {
      sendResult(
        response,
        failure(
          "UNSUPPORTED_MEDIA_TYPE",
          "Request body must use Content-Type application/json",
          requestId,
          415,
        ),
        corsHeaders,
      );
      return;
    }

    let user = null;
    if (matched.route.authRequired) {
      const token = parseBearerToken(request.headers.authorization);
      if (token == null) {
        logStructuredEvent("warn", "auth.missing_bearer_token", {
          requestId,
          traceId,
          method,
          path: requestUrl.pathname,
          routeTemplate,
          ip: clientIp,
          origin: requestOrigin,
        });
        sendResult(
          response,
          failure("UNAUTHORIZED", "Missing bearer token", requestId, 401),
          corsHeaders,
        );
        return;
      }

      const decoded = await decodeJwtPayloadDetailed(token, config.jwt);
      user = decoded.user;
      if (user == null) {
        logStructuredEvent("warn", "auth.jwt_rejected", {
          requestId,
          traceId,
          method,
          path: requestUrl.pathname,
          routeTemplate,
          ip: clientIp,
          origin: requestOrigin,
          rejectionStage: decoded.failure?.stage ?? "unknown",
          rejectionReason: decoded.failure?.reason ?? "JWT rejected",
          tokenSummary: decoded.failure?.tokenSummary ?? null,
        });
        sendResult(
          response,
          failure("UNAUTHORIZED", "Invalid JWT claims", requestId, 401),
          corsHeaders,
        );
        return;
      }

      const allowedRoles = matched.route.allowedRoles;
      if (allowedRoles != null && !allowedRoles.includes(user.role)) {
        logStructuredEvent("warn", "auth.role_forbidden", {
          requestId,
          traceId,
          method,
          path: requestUrl.pathname,
          routeTemplate,
          ip: clientIp,
          origin: requestOrigin,
          userId: user.userId,
          role: user.role,
          allowedRoles,
        });
        sendResult(
          response,
          failure("FORBIDDEN", "Insufficient permissions", requestId, 403, {
            role: user.role,
            allowedRoles,
          }),
          corsHeaders,
        );
        return;
      }

      const requiredPermissions = matched.route.requiredPermissions;
      if (
        requiredPermissions != null &&
        !hasRequiredPermissions(
          user.permissions,
          requiredPermissions,
          matched.route.permissionMode,
        )
      ) {
        logStructuredEvent("warn", "auth.permission_forbidden", {
          requestId,
          traceId,
          method,
          path: requestUrl.pathname,
          routeTemplate,
          ip: clientIp,
          origin: requestOrigin,
          userId: user.userId,
          role: user.role,
          requiredPermissions,
          permissionMode: matched.route.permissionMode,
        });
        sendResult(
          response,
          failure("FORBIDDEN", "Insufficient permissions", requestId, 403, {
            role: user.role,
            requiredPermissions,
            permissionMode: matched.route.permissionMode,
          }),
          corsHeaders,
        );
        return;
      }
    }

    if (rateLimitPolicy != null) {
      const rateLimitResult = consumeRateLimit(
        buildRateLimitKey(
          matched.route.template,
          rateLimitPolicy,
          clientIp,
          user?.userId ?? null,
        ),
        rateLimitPolicy,
      );

      if (!rateLimitResult.allowed) {
        logStructuredEvent("warn", "http.rate_limited", {
          requestId,
          traceId,
          method,
          path: requestUrl.pathname,
          routeTemplate: matched.route.template,
          ip: clientIp,
          origin: requestOrigin,
          userId: user?.userId ?? null,
        });
        sendResult(
          response,
          failure("TOO_MANY_REQUESTS", "Rate limit exceeded", requestId, 429, {
            retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          }),
          corsHeaders,
          {
            "retry-after": String(rateLimitResult.retryAfterSeconds),
          },
        );
        return;
      }
    }

    let body: unknown = null;
    if (isMutationRequest && incomingHasBody) {
      try {
        body = await readBody(request);
      } catch (error) {
        if (
          error instanceof BodyReadError &&
          error.code === "PAYLOAD_TOO_LARGE"
        ) {
          sendResult(
            response,
            failure(
              "PAYLOAD_TOO_LARGE",
              "Request body exceeds max allowed size",
              requestId,
              413,
            ),
            corsHeaders,
          );
          return;
        }
        if (error instanceof BodyReadError && error.code === "INVALID_JSON") {
          sendResult(
            response,
            failure(
              "INVALID_JSON",
              "Request body must be valid JSON",
              requestId,
              400,
            ),
            corsHeaders,
          );
          return;
        }
        sendResult(
          response,
          failure(
            "INVALID_BODY",
            "Unable to parse request body",
            requestId,
            400,
          ),
          corsHeaders,
        );
        return;
      }
    }
    const context: RouteContext = {
      method,
      path: requestUrl.pathname,
      query: requestUrl.searchParams,
      requestId,
      telemetry: createTelemetryCorrelation({
        requestId,
        traceId,
        organizationId,
        siteId,
      }),
      clientIp,
      userAgent,
      params: matched.params,
      body,
      user,
    };
    userId = user?.userId ?? null;
    role = user?.role ?? null;
    organizationId = user?.organizationId ?? null;
    siteId = user != null ? resolvePrimarySiteId(user.siteIds) : null;

    try {
      sendResult(response, await matched.route.handler(context), corsHeaders);
    } catch (error) {
      logStructuredEvent("error", "http.unhandled_error", {
        requestId,
        traceId,
        method,
        path: requestUrl.pathname,
        route_template: routeTemplate,
        origin: requestOrigin,
        clientIp,
        user_agent: userAgent,
        user_id: user?.userId ?? null,
        role: user?.role ?? null,
        organizationId,
        siteId,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unexpected non-error thrown",
        errorCode: "INTERNAL_ERROR",
        status: "failed",
        statusCode: 500,
      });
      sendResult(
        response,
        failure("INTERNAL_ERROR", "Unexpected server error", requestId, 500),
        corsHeaders,
      );
    }
  }).listen(config.port);
}
