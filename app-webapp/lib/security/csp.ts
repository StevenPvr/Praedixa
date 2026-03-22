/**
 * CSP nonce generation and header construction for webapp.
 *
 * Generates a per-request nonce for Content-Security-Policy headers,
 * replacing the static 'unsafe-inline' directive. The nonce is passed
 * to Server Components via the x-nonce request header.
 *
 * Security notes:
 * - 'strict-dynamic' in script-src propagates trust from nonced scripts
 *   to any scripts they load, which is needed for Next.js code splitting.
 * - 'unsafe-inline' is kept in style-src during development because
 *   Next.js HMR injects style tags without nonce support.
 * - In production, styles use nonce only — Tailwind CSS is bundled as
 *   external stylesheets which are allowed by 'self'.
 */

const isProd = process.env["NODE_ENV"] === "production";
const apiUrl = process.env["NEXT_PUBLIC_API_URL"]?.trim() ?? "";
const oidcIssuerUrl = process.env["AUTH_OIDC_ISSUER_URL"] ?? "";
const cspReportUri = process.env["CSP_REPORT_URI"]?.trim() ?? "";
const cspReportToUrl = process.env["CSP_REPORT_TO_URL"]?.trim() ?? "";

export const CSP_REPORT_TO_GROUP = "csp-endpoint";

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function getTrustedOriginOrEmpty(value: string): string {
  try {
    if (!value) return "";
    const parsed = new URL(value);
    if (parsed.protocol === "https:") {
      return parsed.origin;
    }
    if (
      !isProd &&
      parsed.protocol === "http:" &&
      isLoopbackHostname(parsed.hostname)
    ) {
      return parsed.origin;
    }
    return "";
  } catch {
    return "";
  }
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function normalizeReportUri(value: string): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") {
      return parsed.toString();
    }
    if (
      !isProd &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeReportToUrl(value: string): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") {
      return parsed.toString();
    }
    if (
      !isProd &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

const normalizedReportUri = normalizeReportUri(cspReportUri);
const normalizedReportToUrl = normalizeReportToUrl(cspReportToUrl);

export function buildCspHeader(nonce: string): string {
  const authOrigin = getTrustedOriginOrEmpty(oidcIssuerUrl);
  const apiOrigin =
    getTrustedOriginOrEmpty(apiUrl) || (!isProd ? "http://localhost:8000" : "");
  const connectSources = ["'self'"];
  if (apiOrigin) {
    connectSources.push(apiOrigin);
  }
  if (authOrigin && authOrigin !== apiOrigin) {
    connectSources.push(authOrigin);
  }
  if (!isProd) {
    connectSources.push("ws://localhost:3001", "ws://127.0.0.1:3001");
  }
  const connectSrc = connectSources.join(" ");

  const directives = [
    "default-src 'self'",
    isProd
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    `style-src 'self'${!isProd ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(normalizedReportUri ? [`report-uri ${normalizedReportUri}`] : []),
    ...(normalizedReportToUrl ? [`report-to ${CSP_REPORT_TO_GROUP}`] : []),
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

export function buildReportToHeader(): string | null {
  if (!normalizedReportToUrl) {
    return null;
  }

  return JSON.stringify({
    group: CSP_REPORT_TO_GROUP,
    max_age: 60 * 60 * 24 * 30,
    endpoints: [{ url: normalizedReportToUrl }],
  });
}
