import type { NextConfig } from "next";

// API URL for CSP connect-src — must match the backend origin
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isProd = process.env.NODE_ENV === "production";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: [
      "@tremor/react",
      "framer-motion",
      "lucide-react",
      "date-fns",
    ],
  },

  async headers() {
    return [
      {
        // Default: prevent Safari (and other browsers) from caching HTML pages,
        // especially error responses. Static assets override this below.
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' removed: Next.js 15 App Router does not need it in production.
              // This closes an XSS amplification vector where injected scripts could use eval().
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              `connect-src 'self' ${apiUrl} https://*.supabase.co`,
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Prevent the page from being embedded as an object/embed
              "object-src 'none'",
              // Force HTTPS for all subresources — production only.
              // Safari (unlike Chrome) upgrades localhost too, breaking dev CSS/JS loading.
              ...(isProd ? ["upgrade-insecure-requests"] : []),
            ]
              .filter(Boolean)
              .join("; "),
          },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Prevent cross-origin window.opener attacks (Spectre mitigation)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Prevent cross-origin resource leaks
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Block Flash/PDF cross-domain policy files
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
      {
        // Static assets: override no-cache with long-lived immutable caching.
        // Placed AFTER /:path* so this Cache-Control wins for matched files.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2|js|css)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default config;
