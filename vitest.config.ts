import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/** Unit and component tests (tests/); the browser tests in e2e/ run with Playwright. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["tests/**/*.test.ts"],
      // The app runs in a browser: tests get its DOM and sessionStorage on every Node version.
      environment: "happy-dom",
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,js}"],
        // Pages, shells and the XWUI adapters render through the CDN bundle; the browser tests (e2e/) cover them.
        exclude: ["src/**/*.d.ts", "src/main.ts", "src/xwui.ts"],
        reporter: ["text-summary", "html"],
        // Just under today's figures, so coverage cannot quietly drop.
        thresholds: { statements: 75, branches: 65, functions: 78, lines: 75 },
      },
    },
  }),
);
