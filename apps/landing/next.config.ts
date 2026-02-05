import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// ---------------------------------------------------------------------------
// CSP violation reporting → Sentry
// Parses the Sentry DSN to build the security report-uri endpoint.
// See https://docs.sentry.io/product/security-policy-reporting/
// ---------------------------------------------------------------------------
function buildCspReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    const key = url.username;
    return `https://${url.hostname}/api/${projectId}/security/?sentry_key=${key}`;
  } catch {
    return null;
  }
}

const cspReportUri = buildCspReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  // Performance optimizations
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Ensure Sentry server files are included in Cloudflare Workers bundle
  outputFileTracingIncludes: {
    "/": ["./sentry.server.config.ts"],
  },

  // Caching headers for static assets + security headers
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
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
              "script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.ingest.de.sentry.io",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Prevent the page from being embedded as an object/embed
              "object-src 'none'",
              // CSP violation reporting → Sentry (only when DSN is set)
              ...(cspReportUri
                ? [`report-uri ${cspReportUri}`, "report-to csp-endpoint"]
                : []),
            ].join("; "),
          },
          // Reporting API v1 endpoint for CSP report-to directive
          ...(cspReportUri
            ? [
                {
                  key: "Reporting-Endpoints",
                  value: `csp-endpoint="${cspReportUri}"`,
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Prevent cross-origin window.opener attacks (Spectre mitigation)
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          // Prevent cross-origin resource leaks
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          // Block Flash/PDF cross-domain policy files
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(config), {
  // Upload source maps for readable stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Route Sentry events through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Upload larger set of source maps for better stack traces
  widenClientFileUpload: true,

  // Delete source maps after upload (keeps them out of browser devtools)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Remove Sentry debug logger from production bundle
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Only upload source maps in CI (requires SENTRY_AUTH_TOKEN)
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
