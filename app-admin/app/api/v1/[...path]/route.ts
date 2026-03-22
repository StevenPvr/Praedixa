import { type NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  resolveAuthAppOrigin,
  setAuthCookies,
} from "@/lib/auth/oidc";
import {
  resolveRequestSession,
  type ResolveRequestSessionResult,
} from "@/lib/auth/request-session";
import {
  isSameOriginBrowserRequest,
  resolveExpectedOrigin,
} from "@/lib/security/browser-request";
import {
  canAccessAdminApiPath,
  isPublicAdminProxyPath,
} from "@/lib/auth/admin-route-policies";

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
const DEFAULT_MAX_PROXY_BODY_BYTES = 50 * 1024 * 1024;
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
  const configuredBaseUrl = process.env["NEXT_PUBLIC_API_URL"]?.trim() ?? "";
  if (!configuredBaseUrl) {
    throw new TypeError(
      "NEXT_PUBLIC_API_URL is required for admin API proxying.",
    );
  }

  const parsed = new URL(configuredBaseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("NEXT_PUBLIC_API_URL must use http or https.");
  }

  if (
    process.env["NODE_ENV"] === "production" &&
    parsed.protocol !== "https:"
  ) {
    throw new TypeError("NEXT_PUBLIC_API_URL must use https in production.");
  }

  if (
    process.env["NODE_ENV"] !== "production" &&
    parsed.protocol === "http:" &&
    !isLoopbackHostname(parsed.hostname)
  ) {
    throw new TypeError(
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
  const raw = process.env["API_PROXY_MAX_BODY_BYTES"]?.trim();
  if (!raw) {
    return DEFAULT_MAX_PROXY_BODY_BYTES;
  }

  const parsed = Number.parseInt(raw, 10);
  const hasInvalidParsedValue =
    Number.isFinite(parsed) === false || parsed <= 0;
  if (hasInvalidParsedValue) {
    return DEFAULT_MAX_PROXY_BODY_BYTES;
  }

  return Math.min(parsed, 100 * 1024 * 1024);
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
  const serializedError = serializeUnknownError(input.error);
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
    error: serializedError,
  });
}

function serializeUnknownError(error: unknown):
  | string
  | {
      message?: string;
      name?: string;
    } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint"
  ) {
    return String(error);
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }

  if (error === null) {
    return "null";
  }

  if (error === undefined) {
    return "undefined";
  }

  if (typeof error === "symbol") {
    return error.toString();
  }

  return Object.prototype.toString.call(error);
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

  validateContentLength(request.headers.get("content-length"), maxBytes);

  if (request.body == null) {
    return readFallbackBody(request, maxBytes);
  }

  return readStreamBody(request.body, maxBytes);
}

function validateContentLength(
  contentLength: string | null,
  maxBytes: number,
): void {
  if (contentLength == null) {
    return;
  }

  const parsedLength = Number.parseInt(contentLength, 10);
  if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
}

async function readFallbackBody(
  request: NextRequest,
  maxBytes: number,
): Promise<ArrayBuffer | undefined> {
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

async function readStreamBody(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<ArrayBuffer | undefined> {
  const reader = stream.getReader();
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

type ProxyAccessContext = {
  accessToken: string | null;
  hasResolvedSession: boolean;
  path: string[];
  resolved: Awaited<ReturnType<typeof resolveProxySession>>;
};

async function resolveProxyAccessContext(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse | ProxyAccessContext> {
  const { path } = await context.params;
  const requestPathname = request.nextUrl.pathname;
  const isPublicPath = isPublicAdminProxyPath(requestPathname, request.method);
  const expectedOrigin = resolveExpectedOrigin(request, resolveAuthAppOrigin);
  const isSameOriginRequest = isSameOriginBrowserRequest(
    request,
    expectedOrigin,
  );

  if (isPublicPath === false && isSameOriginRequest === false) {
    return createJsonErrorResponse("csrf_failed", 403);
  }

  const resolved = await resolveProxySession(request, isPublicPath);
  if (resolved?.ok === false) {
    return createUnauthorizedResponse(resolved.clearCookies);
  }

  const hasResolvedSession = resolved?.ok === true;
  const sessionPermissions = hasResolvedSession
    ? resolved.session.permissions
    : null;
  const hasPathAccess =
    isPublicPath ||
    canAccessAdminApiPath(requestPathname, request.method, sessionPermissions);

  if (isPublicPath === false && hasPathAccess === false) {
    return createJsonErrorResponse("forbidden", 403);
  }

  return {
    accessToken: hasResolvedSession ? resolved.accessToken : null,
    hasResolvedSession,
    path,
    resolved,
  };
}

function buildUpstreamInit(
  request: NextRequest,
  requestId: string,
  accessToken: string | null,
  requestBody: ArrayBuffer | undefined,
): RequestInit {
  const upstreamInit: RequestInit = {
    method: request.method,
    headers: buildForwardHeaders(request, requestId, accessToken),
    cache: "no-store",
  };

  if (requestBody !== undefined) {
    upstreamInit.body = requestBody;
  }

  return upstreamInit;
}

function buildProxyResponse(args: {
  request: NextRequest;
  requestId: string;
  upstream: Response;
  hasResolvedSession: boolean;
  resolved: ResolveRequestSessionResult | null;
}): NextResponse {
  const response = withRequestId(
    new NextResponse(args.upstream.body, {
      status: args.upstream.status,
      headers: copyResponseHeaders(args.upstream.headers),
    }),
    args.requestId,
  );

  if (
    args.hasResolvedSession &&
    args.resolved?.ok &&
    args.resolved.cookieUpdate
  ) {
    setAuthCookies(response, args.request, args.resolved.cookieUpdate);
  }

  if (args.upstream.status === 401) {
    clearAuthCookies(response);
  }

  return response;
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
    const accessContext = await resolveProxyAccessContext(request, context);
    if (accessContext instanceof NextResponse) {
      return withRequestId(accessContext, requestId);
    }

    const requestBody = await readRequestBody(request, getMaxProxyBodyBytes());
    upstreamUrl = buildUpstreamUrl(request, accessContext.path);
    const upstreamInit = buildUpstreamInit(
      request,
      requestId,
      accessContext.accessToken,
      requestBody,
    );
    const upstream = await fetch(upstreamUrl, upstreamInit);
    return buildProxyResponse({
      request,
      requestId,
      upstream,
      hasResolvedSession: accessContext.hasResolvedSession,
      resolved: accessContext.resolved,
    });
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
