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
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
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

function applyNoStoreHeaders(headers: Headers): void {
  headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
  headers.set("Pragma", NO_STORE_HEADERS.Pragma);
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
  error: "bad_gateway" | "csrf_failed" | "unauthorized",
  status: 401 | 403 | 502,
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

async function readRequestBody(request: NextRequest): Promise<string | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.text();
  return body.length > 0 ? body : undefined;
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  try {
    const { path } = await context.params;
    const isPublicPath = isPublicGetPath(request.method, path);
    if (
      !isPublicPath &&
      !isSameOriginBrowserRequest(
        request,
        resolveExpectedOrigin(request, resolveAuthAppOrigin),
      )
    ) {
      return createJsonErrorResponse("csrf_failed", 403);
    }

    const resolved = await resolveProxySession(request, isPublicPath);

    if (resolved && !resolved.ok) {
      return createUnauthorizedResponse(resolved.clearCookies);
    }

    const upstream = await fetch(buildUpstreamUrl(request, path), {
      method: request.method,
      headers: buildForwardHeaders(
        request,
        resolved && resolved.ok ? resolved.accessToken : null,
      ),
      body: await readRequestBody(request),
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
  } catch {
    return createJsonErrorResponse("bad_gateway", 502);
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
