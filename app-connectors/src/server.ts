import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { loadConfig } from "./config.js";
import { failure } from "./response.js";
import { RouteMatchError, compileRoutes, matchRoute } from "./router.js";
import { routes } from "./routes.js";
import { redactSensitive, safeEqualSecret } from "./security.js";
import type {
  AppConfig,
  AuthenticatedServicePrincipal,
  HttpMethod,
  RouteContext,
  ServiceTokenConfig,
} from "./types.js";

const compiledRoutes = compileRoutes(routes);
export const CORS_ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
export const CORS_ALLOWED_HEADERS =
  "Authorization,Content-Type,Idempotency-Key,X-Actor-User-ID,X-Request-ID,Accept,Accept-Language,X-Praedixa-Key-Id,X-Praedixa-Timestamp,X-Praedixa-Signature";

export const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
} as const;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const BODY_METHODS: readonly HttpMethod[] = ["POST", "PATCH", "PUT", "DELETE"];
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
): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...SECURITY_HEADERS,
    ...corsHeaders,
  });
  response.end(body);
}

function hasRequestBody(request: IncomingMessage): boolean {
  const transferEncoding = request.headers["transfer-encoding"];
  if (typeof transferEncoding === "string" && transferEncoding.trim().length > 0) {
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

export function isJsonContentType(contentType: string | string[] | undefined): boolean {
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

function logSecurityEvent(
  event: string,
  requestId: string,
  payload: Record<string, unknown>,
): void {
  const envelope = redactSensitive({ event, requestId, ...payload });
  process.stderr.write(`[connectors][security] ${JSON.stringify(envelope)}\n`);
}

function getClientIp(request: IncomingMessage): string | null {
  const cfConnectingIp = request.headers["cf-connecting-ip"];
  if (typeof cfConnectingIp === "string" && cfConnectingIp.trim().length > 0) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.socket.remoteAddress ?? null;
}

async function readBody(
  request: IncomingMessage,
): Promise<{ parsed: unknown; rawBody: string | null }> {
  return await new Promise<{ parsed: unknown; rawBody: string | null }>((resolve, reject) => {
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

    function safeResolve(payload: { parsed: unknown; rawBody: string | null }): void {
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
        safeReject(new BodyReadError("INVALID_JSON", "Request body must be valid JSON"));
      }
    });
    request.on("error", () => safeResolve({ parsed: null, rawBody: null }));
  });
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

export function createAppServer(config: AppConfig) {
  return createServer(async (request, response) => {
    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const clientIp = getClientIp(request);
    const requestOrigin = normalizeOrigin(request.headers.origin);
    const corsHeaders = resolveCorsHeaders(
      requestOrigin,
      config.corsOrigins,
    );

    if (request.method?.toUpperCase() === "OPTIONS") {
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
      const result = failure(
        "METHOD_NOT_ALLOWED",
        "Unsupported HTTP method",
        requestId,
        405,
      );
      writeJson(response, result.statusCode, result.payload, corsHeaders);
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    let matched: ReturnType<typeof matchRoute>;
    try {
      matched = matchRoute(compiledRoutes, method, requestUrl.pathname);
    } catch (error) {
      if (error instanceof RouteMatchError) {
        const result = failure(
          "INVALID_PATH",
          error.message,
          requestId,
          400,
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
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
      writeJson(response, result.statusCode, result.payload, corsHeaders);
      return;
    }

    if (matched == null) {
      const result = failure(
        "NOT_FOUND",
        "Route not found",
        requestId,
        404,
        { path: requestUrl.pathname, method },
      );
      writeJson(response, result.statusCode, result.payload, corsHeaders);
      return;
    }

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
      writeJson(response, result.statusCode, result.payload, corsHeaders);
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
        writeJson(response, result.statusCode, result.payload, corsHeaders);
        return;
      }

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
        writeJson(response, result.statusCode, result.payload, corsHeaders);
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
        if (error instanceof BodyReadError && error.code === "PAYLOAD_TOO_LARGE") {
          const result = failure(
            "PAYLOAD_TOO_LARGE",
            "Request body exceeds max allowed size",
            requestId,
            413,
          );
          writeJson(response, result.statusCode, result.payload, corsHeaders);
          return;
        }
        if (error instanceof BodyReadError && error.code === "INVALID_JSON") {
          const result = failure(
            "INVALID_JSON",
            "Request body must be valid JSON",
            requestId,
            400,
          );
          writeJson(response, result.statusCode, result.payload, corsHeaders);
          return;
        }
        const result = failure(
          "INVALID_BODY",
          "Unable to parse request body",
          requestId,
          400,
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
        return;
      }
    }

    const routeCtx: RouteContext = {
      method,
      path: requestUrl.pathname,
      query: requestUrl.searchParams,
      requestId,
      params: matched.params,
      body,
      rawBody,
      clientIp,
      headers: request.headers,
      principal,
    };

    try {
      const result = await matched.route.handler(routeCtx);
      writeJson(response, result.statusCode, result.payload, corsHeaders);
    } catch {
      logSecurityEvent("connectors.route.error", requestId, {
        path: requestUrl.pathname,
        method,
        clientIp,
        principal: principal?.name ?? null,
      });
      const result = failure(
        "INTERNAL_ERROR",
        "Unexpected connector runtime error",
        requestId,
        500,
      );
      writeJson(response, result.statusCode, result.payload, corsHeaders);
    }
  });
}

export function startServer(config = loadConfig(process.env)) {
  const server = createAppServer(config);
  server.listen(config.port, config.host, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[connectors] listening on ${config.host}:${config.port} (${config.nodeEnv})`,
    );
  });
  return server;
}
