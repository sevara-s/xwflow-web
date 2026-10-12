// ESLint: the recommended JavaScript and TypeScript rules, type-aware where it pays.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,js}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { window: "readonly", document: "readonly", console: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly", requestAnimationFrame: "readonly", sessionStorage: "readonly", structuredClone: "readonly", performance: "readonly", URL: "readonly", Blob: "readonly", HTMLElement: "readonly", Element: "readonly", Event: "readonly", CustomEvent: "readonly", XMLSerializer: "readonly", navigator: "readonly", process: "readonly" } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
);
