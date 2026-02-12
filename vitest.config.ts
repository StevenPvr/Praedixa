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
