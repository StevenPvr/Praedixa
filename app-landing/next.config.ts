import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { buildSecurityHeaders } from "./lib/security/headers";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: ["framer-motion", "three", "@react-three/drei"],
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
