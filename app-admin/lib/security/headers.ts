/**
 * Shared Next.js security headers configuration.
 *
 * CSP is NOT included here — it's set per-request in middleware.ts (nonce-based).
 */

interface HeaderEntry {
  key: string;
  value: string;
}

interface HeaderConfig {
  source: string;
  headers: HeaderEntry[];
}

interface SecurityHeadersOptions {
  /** Include HSTS header (should be true in production) */
  includeHsts: boolean;
}

const SECURITY_HEADERS: HeaderEntry[] = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const HSTS_HEADER: HeaderEntry = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

const STATIC_ASSET_CACHE: HeaderConfig = {
  source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2|js|css)",
  headers: [
    {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },
  ],
};

export function buildSecurityHeaders(
  options: SecurityHeadersOptions,
): HeaderConfig[] {
  const allHeaders: HeaderEntry[] = [
    ...SECURITY_HEADERS,
    ...(options.includeHsts ? [HSTS_HEADER] : []),
  ];

  return [{ source: "/:path*", headers: allHeaders }, STATIC_ASSET_CACHE];
}
