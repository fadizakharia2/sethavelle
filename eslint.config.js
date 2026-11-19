import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      ".react-router/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Security: raw HTML injection is banned. Rich text goes through
      // ~/lib/rich-text (text-only) and JSON-LD through serializeJsonLd.
      "react/no-danger": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-script-url": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      // role="list" is deliberate: Safari drops list semantics with list-style: none.
      "jsx-a11y/no-redundant-roles": ["error", { ul: ["list"], ol: ["list"] }],
    },
  },
  {
    // The one sanctioned dangerouslySetInnerHTML: escaped JSON-LD.
    files: ["app/components/JsonLd.tsx"],
    rules: { "react/no-danger": "off" },
  },
  {
    files: ["**/*.{js,mjs}", "tests/**", "scripts/**", "*.config.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
);
