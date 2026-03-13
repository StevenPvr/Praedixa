import { type NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  resolveAuthAppOrigin,
  setAuthCookies,
} from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import {
  isSameOriginBrowserRequest,
  resolveExpectedOrigin,
} from "@/lib/security/browser-request";
import {
  canAccessAdminApiPath,
  isPublicAdminProxyPath,
} from "@/lib/auth/route-access";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const DEFAULT_MAX_PROXY_BODY_BYTES = 1024 * 1024;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;
const BFF_SERVICE_NAME = "admin-bff";

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured proxy limit");
    this.name = "PayloadTooLargeError";
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function getBackendApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (!configuredBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required for admin API proxying.");
  }

  const parsed = new URL(configuredBaseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use http or https.");
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use https in production.");
  }

  if (
    process.env.NODE_ENV !== "production" &&
    parsed.protocol === "http:" &&
    !isLoopbackHostname(parsed.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must use https or loopback http in development.",
    );
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

function buildUpstreamUrl(request: NextRequest, path: string[]): string {
  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${getBackendApiBaseUrl()}/api/v1/${encodedPath}${request.nextUrl.search}`;
}

function getMaxProxyBodyBytes(): number {
  const raw = process.env.API_PROXY_MAX_BODY_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_PROXY_BODY_BYTES;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_PROXY_BODY_BYTES;
  }

  return Math.min(parsed, 10 * 1024 * 1024);
}

function resolveRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function buildForwardHeaders(
  request: NextRequest,
  requestId: string,
  accessToken: string | null,
): Headers {
  const headers = new Headers();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  headers.set(
    "Accept",
    request.headers.get("accept") ?? "application/json, text/plain, */*",
  );
  headers.set("X-Request-ID", requestId);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const traceparent = request.headers.get("traceparent");
  if (traceparent) {
    headers.set("traceparent", traceparent);
  }

  const tracestate = request.headers.get("tracestate");
  if (tracestate) {
    headers.set("tracestate", tracestate);
  }

  return headers;
}

function buildProxyFailureLogEntry(input: {
  requestId: string;
  traceId: string | null;
  method: string;
  path: string;
  upstreamUrl: string | null;
  durationMs: number;
  error: unknown;
}): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    service: BFF_SERVICE_NAME,
    env: process.env.NODE_ENV ?? "development",
    event: "proxy.upstream_failed",
    message:
      "Admin same-origin API proxy failed before receiving an upstream response",
    request_id: input.requestId,
    trace_id: input.traceId ?? input.requestId,
    run_id: null,
    connector_run_id: null,
    action_id: null,
    contract_version: null,
    organization_id: null,
    site_id: null,
    status: "failed",
    status_code: 502,
    duration_ms: input.durationMs,
    method: input.method,
    path: input.path,
    upstream_url: input.upstreamUrl,
    error:
      input.error instanceof Error
        ? { name: input.error.name, message: input.error.message }
        : String(input.error),
  });
}

function applyNoStoreHeaders(headers: Headers): void {
  headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  headers.set("Pragma", NO_STORE_HEADERS.Pragma);
}

function withRequestId(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set("X-Request-ID", requestId);
  return response;
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });
  applyNoStoreHeaders(headers);
  return headers;
}

function createJsonErrorResponse(
  error:
    | "bad_gateway"
    | "csrf_failed"
    | "forbidden"
    | "payload_too_large"
    | "unauthorized",
  status: 401 | 403 | 413 | 502,
): NextResponse {
  const response = NextResponse.json({ error }, { status });
  applyNoStoreHeaders(response.headers);
  return response;
}

function createUnauthorizedResponse(clearCookies = true): NextResponse {
  const response = createJsonErrorResponse("unauthorized", 401);
  if (clearCookies) clearAuthCookies(response);
  return response;
}

async function resolveProxySession(
  request: NextRequest,
  isPublicPath: boolean,
) {
  if (isPublicPath) return null;

  return resolveRequestSession(request, {
    minTtlSeconds: 60,
    preserveCookiesOnRefreshFailure: true,
  });
}

async function readRequestBody(
  request: NextRequest,
  maxBytes: number,
): Promise<ArrayBuffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    const fallbackBody = await request.text();
    if (!fallbackBody) {
      return undefined;
    }
    const encoded = new TextEncoder().encode(fallbackBody);
    if (encoded.byteLength > maxBytes) {
      throw new PayloadTooLargeError();
    }
    return encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }

    chunks.push(value);
  }

  if (totalBytes === 0) {
    return undefined;
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
}

function payloadTooLarge(requestId: string): NextResponse {
  return withRequestId(
    createJsonErrorResponse("payload_too_large", 413),
    requestId,
  );
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const startedAtMs = Date.now();
  let upstreamUrl: string | null = null;

  try {
    const { path } = await context.params;
    const requestPathname = request.nextUrl.pathname;
    const isPublicPath = isPublicAdminProxyPath(
      requestPathname,
      request.method,
    );
    if (
      !isPublicPath &&
      !isSameOriginBrowserRequest(
        request,
        resolveExpectedOrigin(request, resolveAuthAppOrigin),
      )
    ) {
      return withRequestId(
        createJsonErrorResponse("csrf_failed", 403),
        requestId,
      );
    }

    const resolved = await resolveProxySession(request, isPublicPath);

    if (resolved && !resolved.ok) {
      return withRequestId(
        createUnauthorizedResponse(resolved.clearCookies),
        requestId,
      );
    }

    const sessionPermissions =
      resolved && resolved.ok ? resolved.session.permissions : null;

    if (
      !isPublicPath &&
      !canAccessAdminApiPath(
        requestPathname,
        request.method,
        sessionPermissions,
      )
    ) {
      return withRequestId(
        createJsonErrorResponse("forbidden", 403),
        requestId,
      );
    }

    const requestBody = await readRequestBody(request, getMaxProxyBodyBytes());

    upstreamUrl = buildUpstreamUrl(request, path);
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildForwardHeaders(
        request,
        requestId,
        resolved && resolved.ok ? resolved.accessToken : null,
      ),
      body: requestBody ?? undefined,
      cache: "no-store",
    });

    const response = withRequestId(
      new NextResponse(upstream.body, {
        status: upstream.status,
        headers: copyResponseHeaders(upstream.headers),
      }),
      requestId,
    );

    if (resolved && resolved.ok && resolved.cookieUpdate) {
      setAuthCookies(response, request, resolved.cookieUpdate);
    }

    if (upstream.status === 401) {
      clearAuthCookies(response);
    }

    return response;
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return payloadTooLarge(requestId);
    }

    // eslint-disable-next-line no-console
    console.error(
      buildProxyFailureLogEntry({
        requestId,
        traceId: request.headers.get("traceparent"),
        method: request.method,
        path: request.nextUrl.pathname,
        upstreamUrl,
        durationMs: Date.now() - startedAtMs,
        error,
      }),
    );
    return withRequestId(
      createJsonErrorResponse("bad_gateway", 502),
      requestId,
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
