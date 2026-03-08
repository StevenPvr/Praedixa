import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { buildSecurityHeaders } from "./lib/security/headers";

void initOpenNextCloudflareForDev();

const allowedDevOrigins = ["127.0.0.1", "localhost"];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },

  turbopack: {},

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return buildSecurityHeaders(true);
  },
};

export default withBundleAnalyzer(config);
