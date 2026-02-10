import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

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
    include: [
      "packages/**/*.{test,spec}.{ts,tsx}",
      "app-*/**/*.{test,spec}.{ts,tsx}",
    ],
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
      "app-admin",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "packages/*/src/**/*.{ts,tsx}",
        "app-*/app/**/*.{ts,tsx}",
        "app-*/components/**/*.{ts,tsx}",
        "app-*/lib/**/*.{ts,tsx}",
        "app-*/hooks/**/*.{ts,tsx}",
        "app-*/middleware.ts",
      ],
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
