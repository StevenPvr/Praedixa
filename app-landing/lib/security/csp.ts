const isProd = process.env.NODE_ENV === "production";

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildCspHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com${!isProd ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' https://cdn.jsdelivr.net${!isProd ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}
