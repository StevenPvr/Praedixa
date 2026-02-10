import type { NextConfig } from "next";

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
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          // CSP is set dynamically per-request in middleware.ts (nonce-based)
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
