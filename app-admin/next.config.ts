import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

const isProd = process.env.NODE_ENV === "production";
const allowedDevOrigins = ["127.0.0.1", "localhost"];

const config: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "date-fns"],
  },

  async headers() {
    return buildSecurityHeaders({ includeHsts: isProd });
  },
};

export default config;
