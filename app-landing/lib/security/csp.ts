/**
 * CSP nonce generation and header construction for landing site.
 *
 * Landing has no API or Supabase connection, so connect-src is 'self' only.
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

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildCspHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${!isProd ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${!isProd ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}
