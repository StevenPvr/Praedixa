import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { decodeJwtPayload, parseBearerToken } from "./auth.js";
import { failure } from "./response.js";
import { compileRoutes, matchRoute } from "./router.js";
import { routes } from "./routes.js";
import type { AppConfig, HttpMethod, RouteContext } from "./types.js";

const compiledRoutes = compileRoutes(routes);
export const CORS_ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
export const CORS_ALLOWED_HEADERS =
  "Authorization,Content-Type,X-Request-ID,Accept,Accept-Language";

export const SECURITY_HEADERS = {
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
      if (typeof chunk === "string") {
        const data = Buffer.from(chunk);
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
      } else {
        size += chunk.length;
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
        chunks.push(chunk);
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
        safeReject(new BodyReadError("INVALID_JSON", "Request body must be valid JSON"));
      }
    });

    request.on("error", () => {
      safeResolve(null);
    });
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

export function createAppServer(config: AppConfig) {
  return createServer(async (request, response) => {
    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const requestOrigin = normalizeOrigin(request.headers.origin);
    const corsHeaders = resolveCorsHeaders(
      requestOrigin,
      config.corsOrigins,
      config.nodeEnv,
    );

    if (request.method?.toUpperCase() === "OPTIONS") {
      if (requestOrigin != null && corsHeaders["Access-Control-Allow-Origin"] == null) {
        const result = failure(
          "FORBIDDEN",
          "Origin is not allowed by CORS policy",
          requestId,
          403,
          { origin: requestOrigin },
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
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
    const matched = matchRoute(compiledRoutes, method, requestUrl.pathname);

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

    let user = null;
    if (matched.route.authRequired) {
      const token = parseBearerToken(request.headers.authorization);
      if (token == null) {
        const result = failure(
          "UNAUTHORIZED",
          "Missing bearer token",
          requestId,
          401,
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
        return;
      }

      user = await decodeJwtPayload(token, config.jwt);
      if (user == null) {
        const result = failure(
          "UNAUTHORIZED",
          "Invalid JWT claims",
          requestId,
          401,
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
        return;
      }

      const allowedRoles = matched.route.allowedRoles;
      if (allowedRoles != null && !allowedRoles.includes(user.role)) {
        const result = failure(
          "FORBIDDEN",
          "Insufficient permissions",
          requestId,
          403,
          { role: user.role, allowedRoles },
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
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
        const result = failure(
          "FORBIDDEN",
          "Insufficient permissions",
          requestId,
          403,
          {
            role: user.role,
            requiredPermissions,
            permissionMode: matched.route.permissionMode,
          },
        );
        writeJson(response, result.statusCode, result.payload, corsHeaders);
        return;
      }
    }

    let body: unknown = null;
    if (BODY_METHODS.includes(method) && incomingHasBody) {
      try {
        body = await readBody(request);
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
    const context: RouteContext = {
      method,
      path: requestUrl.pathname,
      query: requestUrl.searchParams,
      requestId,
      params: matched.params,
      body,
      user,
    };

    try {
      const result = await matched.route.handler(context);
      writeJson(response, result.statusCode, result.payload, corsHeaders);
    } catch {
      const result = failure(
        "INTERNAL_ERROR",
        "Unexpected server error",
        requestId,
        500,
      );
      writeJson(response, result.statusCode, result.payload, corsHeaders);
    }
  }).listen(config.port);
}
