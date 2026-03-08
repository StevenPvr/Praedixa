import { type NextRequest, NextResponse } from "next/server";
import { resolveApiBaseUrl } from "@/lib/api/base-url";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/oidc";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { isSameOriginBrowserRequest } from "@/lib/security/same-origin";

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
const PUBLIC_GET_PATHS = new Set(["health"]);
const DEFAULT_MAX_PROXY_BODY_BYTES = 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured proxy limit");
    this.name = "PayloadTooLargeError";
  }
}

function getBackendApiBaseUrl(): string {
  return resolveApiBaseUrl();
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

function createNoStoreJsonResponse(
  body: unknown,
  status: number,
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function forbidden(): NextResponse {
  return createNoStoreJsonResponse({ error: "forbidden" }, 403);
}

function payloadTooLarge(): NextResponse {
  return createNoStoreJsonResponse({ error: "payload_too_large" }, 413);
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

function buildUpstreamUrl(request: NextRequest, path: string[]): string {
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `${getBackendApiBaseUrl()}/api/v1/${encodedPath}${request.nextUrl.search}`;
}

function isPublicGetPath(method: string, path: string[]): boolean {
  return method === "GET" && path.length === 1 && PUBLIC_GET_PATHS.has(path[0]);
}

function buildForwardHeaders(
  request: NextRequest,
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
  headers.set(
    "X-Request-ID",
    request.headers.get("x-request-id") ?? crypto.randomUUID(),
  );

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  return headers;
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return headers;
}

function unauthorized(clearCookies = true): NextResponse {
  const response = createNoStoreJsonResponse({ error: "unauthorized" }, 401);
  if (clearCookies) {
    clearAuthCookies(response);
  }
  return response;
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  let upstreamUrl: string | null = null;

  try {
    const { path } = await context.params;
    const isPublicRequest = isPublicGetPath(request.method, path);
    if (!isPublicRequest && !isSameOriginBrowserRequest(request)) {
      return forbidden();
    }

    const resolved = isPublicRequest
      ? null
      : await resolveRequestSession(request, {
          minTtlSeconds: 60,
          preserveCookiesOnRefreshFailure: true,
        });

    if (resolved && !resolved.ok) {
      return unauthorized(resolved.clearCookies);
    }

    const requestBody = await readRequestBody(request, getMaxProxyBodyBytes());

    upstreamUrl = buildUpstreamUrl(request, path);
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildForwardHeaders(
        request,
        resolved && resolved.ok ? resolved.accessToken : null,
      ),
      body: requestBody ?? undefined,
      cache: "no-store",
    });

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyResponseHeaders(upstream.headers),
    });

    if (resolved && resolved.ok && resolved.cookieUpdate) {
      setAuthCookies(response, request, resolved.cookieUpdate);
    }

    if (upstream.status === 401) {
      clearAuthCookies(response);
    }

    return response;
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return payloadTooLarge();
    }

    // eslint-disable-next-line no-console
    console.error("[api-proxy] Upstream request failed", {
      method: request.method,
      upstreamUrl,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });
    return createNoStoreJsonResponse({ error: "bad_gateway" }, 502);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
