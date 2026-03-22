import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../tests/skolae/setup.ts"],
    include: ["../tests/skolae/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "@testing-library/react": path.resolve(
        __dirname,
        "./node_modules/@testing-library/react",
      ),
      "@testing-library/jest-dom": path.resolve(
        __dirname,
        "./node_modules/@testing-library/jest-dom",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
});
