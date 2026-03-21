import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const DEFAULT_VITEST_MAX_WORKERS = 1;
const rawVitestMaxWorkers = Number(
  process.env.VITEST_MAX_WORKERS ?? String(DEFAULT_VITEST_MAX_WORKERS),
);
const VITEST_MAX_WORKERS =
  Number.isFinite(rawVitestMaxWorkers) && rawVitestMaxWorkers > 0
    ? rawVitestMaxWorkers
    : DEFAULT_VITEST_MAX_WORKERS;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app-webapp"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./testing/vitest.setup.ts"],
    maxWorkers: VITEST_MAX_WORKERS,
    minWorkers: 1,
    fileParallelism: false,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
    ],
    projects: [
      {
        extends: true,
        test: {
          name: "default",
          include: [
            "packages/**/*.{test,spec}.{ts,tsx}",
            "app-webapp/**/*.{test,spec}.{ts,tsx}",
            "app-landing/**/*.{test,spec}.{ts,tsx}",
          ],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/coverage/**",
            "app-admin/**",
          ],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "app-admin"),
          },
        },
        test: {
          name: "admin",
          include: ["app-admin/**/*.{test,spec}.{ts,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/coverage/**",
            "app-webapp/**",
            "app-landing/**",
            "packages/**",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/ui/src/utils/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/.next/**",
        "**/coverage/**",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
