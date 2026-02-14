import { defineConfig, devices } from "@playwright/test";
import os from "node:os";

const COVERAGE_ENABLED = process.env.COVERAGE === "1";
const CPU_COUNT =
  typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;
const LOCAL_WORKERS = Number(process.env.PW_WORKERS ?? String(CPU_COUNT));
const WORKERS = process.env.CI
  ? 1
  : Number.isFinite(LOCAL_WORKERS) && LOCAL_WORKERS > 0
    ? LOCAL_WORKERS
    : CPU_COUNT;
const TEST_TIMEOUT_MS = process.env.CI ? 60_000 : 45_000;
const EXPECT_TIMEOUT_MS = process.env.CI ? 12_000 : 10_000;
const ACTION_TIMEOUT_MS = 10_000;
const NAVIGATION_TIMEOUT_MS = 20_000;
const REUSE_EXISTING_SERVERS = process.env.PW_REUSE_SERVER === "1";
const DESKTOP_BROWSER_USE = (() => {
  const use = { ...devices["Desktop Chrome"] } as Record<string, unknown>;
  if (COVERAGE_ENABLED) {
    delete use.channel;
  }
  return use;
})();

// Build reporter list: always list (verbose terminal) + HTML, conditionally add monocart for coverage
const reporters: Parameters<typeof defineConfig>[0]["reporter"] =
  COVERAGE_ENABLED
    ? [
        ["list"],
        ["html"],
        [
          "./testing/e2e/fixtures/monocart-reporter-safe.cjs",
          {
            name: "E2E Coverage Report",
            outputFile: "e2e-coverage/report.html",
            coverage: {
              reports: ["v8", "lcov", "text-summary"],
              lcov: { outputFile: "e2e-coverage/lcov.info" },
              sourceFilter: (sourcePath: string) => {
                // Strict first-party browser coverage scope.
                return (
                  sourcePath.startsWith("app-webapp/") ||
                  sourcePath.startsWith("app-admin/")
                );
              },
            },
          },
        ],
      ]
    : [["list"], ["html"]];

export default defineConfig({
  testDir: "./testing/e2e",
  metadata: {
    coverageEnabled: COVERAGE_ENABLED,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: TEST_TIMEOUT_MS,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
  },
  retries: process.env.CI ? 2 : 0,
  workers: WORKERS,
  reporter: reporters,
  use: {
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "node testing/e2e/webapp/fixtures/mock-supabase-server.mjs",
      url: "http://localhost:54321/auth/v1/user",
      reuseExistingServer: REUSE_EXISTING_SERVERS,
      timeout: 20_000,
    },
    {
      command: "pnpm dev:landing:webpack",
      url: "http://localhost:3000",
      reuseExistingServer: REUSE_EXISTING_SERVERS,
      timeout: 120_000,
    },
    {
      command: "pnpm dev:webapp",
      url: "http://localhost:3001",
      reuseExistingServer: REUSE_EXISTING_SERVERS,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-e2e",
        NEXT_PUBLIC_API_URL: "http://localhost:8000",
      },
    },
    {
      command: "pnpm dev:admin",
      url: "http://localhost:3002",
      reuseExistingServer: REUSE_EXISTING_SERVERS,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-e2e",
        NEXT_PUBLIC_API_URL: "http://localhost:8000",
      },
    },
  ],
  projects: [
    {
      name: "landing",
      testDir: "./testing/e2e/landing",
      use: {
        ...DESKTOP_BROWSER_USE,
        baseURL: "http://localhost:3000",
        extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9" },
      },
    },
    {
      name: "webapp",
      testDir: "./testing/e2e/webapp",
      use: {
        ...DESKTOP_BROWSER_USE,
        baseURL: "http://localhost:3001",
      },
    },
    {
      name: "admin",
      testDir: "./testing/e2e/admin",
      use: {
        ...DESKTOP_BROWSER_USE,
        baseURL: "http://localhost:3002",
      },
    },
  ],
});
