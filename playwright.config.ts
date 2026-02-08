import { defineConfig, devices } from "@playwright/test";

const COVERAGE_ENABLED = process.env.COVERAGE === "1";

// Build reporter list: always list (verbose terminal) + HTML, conditionally add monocart for coverage
const reporters: Parameters<typeof defineConfig>[0]["reporter"] =
  COVERAGE_ENABLED
    ? [
        ["list"],
        ["html"],
        [
          "monocart-reporter",
          {
            name: "E2E Coverage Report",
            outputFile: "e2e-coverage/report.html",
            coverage: {
              reports: ["v8", "lcov", "text-summary"],
              lcov: { outputFile: "e2e-coverage/lcov.info" },
              sourceFilter: (sourcePath: string) => {
                // Only include our app source files
                return sourcePath.startsWith("apps/");
              },
            },
          },
        ],
      ]
    : [["list"], ["html"]];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: reporters,
  use: {
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "node e2e/webapp/fixtures/mock-supabase-server.mjs",
      url: "http://localhost:54321/auth/v1/user",
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
    {
      command: "pnpm dev:landing",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm dev:webapp",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
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
      reuseExistingServer: !process.env.CI,
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
      testDir: "./e2e/landing",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
    },
    {
      name: "webapp",
      testDir: "./e2e/webapp",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
    },
    {
      name: "admin",
      testDir: "./e2e/admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3002",
      },
    },
  ],
});
