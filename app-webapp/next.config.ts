import os from "node:os";
import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

const isProd = process.env.NODE_ENV === "production";

function collectAllowedDevOrigins(): string[] {
  const origins = new Set(["127.0.0.1", "localhost"]);

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.internal || address.family !== "IPv4") {
        continue;
      }
      origins.add(address.address);
    }
  }

  return [...origins];
}

const allowedDevOrigins = collectAllowedDevOrigins();

const config: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  transpilePackages: ["@praedixa/ui", "@praedixa/shared-types"],

  experimental: {
    optimizePackageImports: ["date-fns"],
  },

  async headers() {
    return buildSecurityHeaders(isProd);
  },
};

export default config;
