type HeaderEntry = { key: string; value: string };

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

const HSTS: HeaderEntry = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

export function buildSecurityHeaders(
  includeHsts: boolean,
): { source: string; headers: HeaderEntry[] }[] {
  const mainHeaders = includeHsts
    ? [...SECURITY_HEADERS, HSTS]
    : SECURITY_HEADERS;
  return [
    { source: "/:path*", headers: mainHeaders },
    {
      source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2|js|css)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ];
}
