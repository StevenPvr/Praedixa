/**
 * CSP nonce generation and header construction for admin app.
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

const isProd = process.env.NODE_ENV === "production";
const oidcIssuerUrl = process.env["AUTH_OIDC_ISSUER_URL"] ?? "";
const adminApiMode = process.env["NEXT_PUBLIC_ADMIN_API_MODE"] ?? "proxy";
const apiUrl =
  adminApiMode === "direct"
    ? (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000")
    : "";

function getOriginOrEmpty(value: string): string {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildCspHeader(nonce: string): string {
  const authOrigin = getOriginOrEmpty(oidcIssuerUrl);
  const optionalAuthSource = authOrigin ? ` ${authOrigin}` : "";

  const optionalApiSource =
    apiUrl.length > 0 ? ` ${getOriginOrEmpty(apiUrl)}` : "";
  const connectSrc = `'self'${optionalApiSource}${optionalAuthSource}`;
  const isDev = isProd === false;
  const scriptUnsafeEvalSource = isDev ? " 'unsafe-eval'" : "";
  const styleSource = isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`;
  const scriptSrc =
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` +
    scriptUnsafeEvalSource;
  const styleSrc = `style-src 'self'${styleSource}`;
  const upgradeInsecureRequests = isProd ? ["upgrade-insecure-requests"] : [];

  const directives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...upgradeInsecureRequests,
  ];

  return directives.join("; ");
}
