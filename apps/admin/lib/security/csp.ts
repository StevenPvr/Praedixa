/**
 * CSP nonce generation and header construction for admin app.
 *
 * Same approach as webapp — generates a per-request nonce to replace
 * static 'unsafe-inline' in the Content-Security-Policy header.
 */

const isProd = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    `connect-src 'self' ${apiUrl} https://*.supabase.co`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}
