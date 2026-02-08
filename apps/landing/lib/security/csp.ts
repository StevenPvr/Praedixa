/**
 * CSP nonce generation and header construction for landing site.
 *
 * Same approach as webapp/admin — generates a per-request nonce to replace
 * static 'unsafe-inline' in the Content-Security-Policy header.
 *
 * Landing has no API or Supabase connection, so connect-src is 'self' only.
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
