import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "e2e/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "jest.setup.js"]),
  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-duplicates": "error",
      "import/no-unresolved": "off",
      "import/order": ["error", {
        groups: ["builtin", "external", "parent", "internal", "sibling"],
        pathGroups: [
          { pattern: "@(react|next|effector)", group: "external", position: "before" },
          { pattern: "#/**", group: "parent" },
          { pattern: "../**", group: "internal" },
          { pattern: "./**", group: "sibling" },
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      }],
    },
  },
]);

export default eslintConfig;
