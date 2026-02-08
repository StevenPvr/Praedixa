import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/webapp"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/*.{test,spec}.{ts,tsx}",
      "apps/**/*.{test,spec}.{ts,tsx}",
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
            "apps/webapp/**/*.{test,spec}.{ts,tsx}",
            "apps/landing/**/*.{test,spec}.{ts,tsx}",
          ],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/coverage/**",
            "apps/admin/**",
          ],
        },
      },
      "apps/admin",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "packages/*/src/**/*.{ts,tsx}",
        "apps/*/app/**/*.{ts,tsx}",
        "apps/*/components/**/*.{ts,tsx}",
        "apps/*/lib/**/*.{ts,tsx}",
        "apps/*/hooks/**/*.{ts,tsx}",
        "apps/*/middleware.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/content/**",
        "**/lib/animations/**",
        "**/lib/config/**",
        "packages/shared-types/src/domain/**",
        "packages/shared-types/src/utils/**",
        "packages/shared-types/src/api/requests.ts",
        "packages/shared-types/src/api/responses.ts",
        "**/index.ts",
        "**/logo-preview/**",
        "**/cgu/**",
        "**/confidentialite/**",
        "**/mentions-legales/**",
        "apps/*/app/layout.tsx",
        "apps/*/app/**/layout.tsx",
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
