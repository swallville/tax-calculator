import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

// Feature Sliced Design layer boundaries.
//
// Water flows downward: app -> widgets -> entities -> shared. A file in a
// lower layer must never import from a higher layer. These messages are used
// by the no-restricted-imports rule below to produce clear error messages
// when a developer accidentally crosses a layer boundary.
const FSD_SHARED_VIOLATION =
  "FSD violation: files under src/shared/ must not import from entities/, widgets/, or app/. Shared is the lowest layer and must stay business-agnostic.";
const FSD_ENTITY_VIOLATION =
  "FSD violation: files under src/entities/ must not import from widgets/ or app/. Entities may only consume shared.";
const FSD_WIDGET_VIOLATION =
  "FSD violation: files under src/widgets/ must not import from app/. Widgets may only consume entities and shared.";

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
  // FSD layer-boundary enforcement via per-directory no-restricted-imports
  // overrides. Each layer forbids imports from any layer above it. Both the
  // `#/` alias form and the relative `../` form are blocked so no loophole
  // exists. Added in Phase 8.5 after the Devil's Advocate review found the
  // previous lint config had zero layer-boundary enforcement despite the
  // documentation and walkthrough claiming otherwise.
  {
    files: ["src/shared/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["#/entities/**", "#/widgets/**", "#/app/**"], message: FSD_SHARED_VIOLATION },
          { group: ["**/entities/**", "**/widgets/**", "**/app/**"], message: FSD_SHARED_VIOLATION },
        ],
      }],
    },
  },
  {
    files: ["src/entities/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["#/widgets/**", "#/app/**"], message: FSD_ENTITY_VIOLATION },
          { group: ["**/widgets/**", "**/app/**"], message: FSD_ENTITY_VIOLATION },
        ],
      }],
    },
  },
  {
    files: ["src/widgets/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["#/app/**"], message: FSD_WIDGET_VIOLATION },
          { group: ["**/app/**"], message: FSD_WIDGET_VIOLATION },
        ],
      }],
    },
  },
]);

export default eslintConfig;
