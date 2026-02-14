import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

const isProd = process.env.NODE_ENV === "production";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "date-fns"],
  },

  async headers() {
    return buildSecurityHeaders(isProd);
  },
};

export default config;
