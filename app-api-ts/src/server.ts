import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { decodeJwtPayload, parseBearerToken } from "./auth.js";
import { failure } from "./response.js";
import { compileRoutes, matchRoute } from "./router.js";
import { routes } from "./routes.js";
import type { AppConfig, HttpMethod, RouteContext } from "./types.js";

const compiledRoutes = compileRoutes(routes);
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const;

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...SECURITY_HEADERS,
  });
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  return await new Promise<unknown>((resolve) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer | string) => {
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(null);
        return;
      }

      const text = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    });

    request.on("error", () => {
      resolve(null);
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

export function createAppServer(config: AppConfig) {
  return createServer(async (request, response) => {
    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();

    const method = normalizeMethod(request.method);
    if (method == null) {
      const result = failure(
        "METHOD_NOT_ALLOWED",
        "Unsupported HTTP method",
        requestId,
        405,
      );
      writeJson(response, result.statusCode, result.payload);
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
      writeJson(response, result.statusCode, result.payload);
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
        writeJson(response, result.statusCode, result.payload);
        return;
      }

      user = decodeJwtPayload(token);
      if (user == null) {
        const result = failure(
          "UNAUTHORIZED",
          "Invalid JWT claims",
          requestId,
          401,
        );
        writeJson(response, result.statusCode, result.payload);
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
        writeJson(response, result.statusCode, result.payload);
        return;
      }
    }

    const body = method === "GET" ? null : await readBody(request);
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
      writeJson(response, result.statusCode, result.payload);
    } catch {
      const result = failure(
        "INTERNAL_ERROR",
        "Unexpected server error",
        requestId,
        500,
      );
      writeJson(response, result.statusCode, result.payload);
    }
  }).listen(config.port);
}
