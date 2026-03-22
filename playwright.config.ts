import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SESSION_SECRET } from "./testing/e2e/fixtures/oidc-config";

const COVERAGE_ENABLED = process.env.COVERAGE === "1";
const SERVER_TARGETS = ["landing", "webapp", "admin"] as const;
type ServerTarget = (typeof SERVER_TARGETS)[number];
const DEFAULT_LOCAL_WORKERS = 1;
const LOCAL_WORKERS = Number(
  process.env.PW_WORKERS ?? String(DEFAULT_LOCAL_WORKERS),
);
const WORKERS = process.env.CI
  ? 1
  : Number.isFinite(LOCAL_WORKERS) && LOCAL_WORKERS > 0
    ? LOCAL_WORKERS
    : DEFAULT_LOCAL_WORKERS;
const TEST_TIMEOUT_MS = process.env.CI ? 60_000 : 45_000;
const EXPECT_TIMEOUT_MS = process.env.CI ? 12_000 : 10_000;
const ACTION_TIMEOUT_MS = 10_000;
const NAVIGATION_TIMEOUT_MS = 20_000;
const REUSE_EXISTING_SERVERS = process.env.PW_REUSE_SERVER === "1";
const SERVER_MODE =
  process.env.PW_SERVER_MODE === "production" ? "production" : "development";
type PlaywrightWebServer = NonNullable<
  NonNullable<Parameters<typeof defineConfig>[0]["webServer"]>[number]
>;
const REQUESTED_SERVER_TARGETS = (() => {
  const rawTargets = (process.env.PW_SERVER_TARGETS ?? "")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);

  if (rawTargets.length === 0) {
    return null;
  }

  const invalidTargets = rawTargets.filter(
    (target): target is string =>
      !SERVER_TARGETS.includes(target as ServerTarget),
  );
  if (invalidTargets.length > 0) {
    throw new Error(
      `Unsupported PW_SERVER_TARGETS value(s): ${invalidTargets.join(", ")}`,
    );
  }

  return new Set(rawTargets as ServerTarget[]);
})();
const DESKTOP_BROWSER_USE = (() => {
  const use = { ...devices["Desktop Chrome"] } as Record<string, unknown>;
  if (COVERAGE_ENABLED) {
    delete use.channel;
  }
  return use;
})();

function shouldStartServer(target: ServerTarget): boolean {
  return (
    REQUESTED_SERVER_TARGETS === null || REQUESTED_SERVER_TARGETS.has(target)
  );
}

function resolveNextServerCommand(args: {
  appName: string;
  appPort: number;
  enableTurbopack?: boolean;
}): string {
  const baseCommand = "./node_modules/.bin/next";

  if (SERVER_MODE === "production") {
    return `bash ../scripts/dev/run-next-standalone.sh ${args.appName} ${args.appPort}`;
  }

  const turbopackFlag = args.enableTurbopack ? " --turbopack" : "";
  return `${baseCommand} dev${turbopackFlag} --hostname 127.0.0.1 --port ${args.appPort}`;
}

const webServers = [
  shouldStartServer("landing")
    ? {
        command: resolveNextServerCommand({
          appName: "app-landing",
          appPort: 3000,
        }),
        cwd: "app-landing",
        url: "http://localhost:3000",
        reuseExistingServer: REUSE_EXISTING_SERVERS,
        timeout: 120_000,
      }
    : null,
  shouldStartServer("webapp")
    ? {
        command: resolveNextServerCommand({
          appName: "app-webapp",
          appPort: 3001,
          enableTurbopack: true,
        }),
        cwd: "app-webapp",
        url: "http://localhost:3001",
        reuseExistingServer: REUSE_EXISTING_SERVERS,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-e2e",
          NEXT_PUBLIC_API_URL: "http://localhost:8000",
          AUTH_OIDC_ISSUER_URL: "https://sso.e2e.local/realms/praedixa",
          AUTH_OIDC_CLIENT_ID: "praedixa-webapp",
          AUTH_SESSION_SECRET: E2E_AUTH_SESSION_SECRET,
        },
      }
    : null,
  shouldStartServer("admin")
    ? {
        command: resolveNextServerCommand({
          appName: "app-admin",
          appPort: 3002,
          enableTurbopack: true,
        }),
        cwd: "app-admin",
        url: "http://localhost:3002",
        reuseExistingServer: REUSE_EXISTING_SERVERS,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-e2e",
          NEXT_PUBLIC_API_URL: "http://localhost:8000",
          AUTH_OIDC_ISSUER_URL: "https://sso.e2e.local/realms/praedixa",
          AUTH_OIDC_CLIENT_ID: "praedixa-admin",
          AUTH_SESSION_SECRET: E2E_AUTH_SESSION_SECRET,
        },
      }
    : null,
].filter((server): server is PlaywrightWebServer => server !== null);

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
  webServer: webServers,
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
