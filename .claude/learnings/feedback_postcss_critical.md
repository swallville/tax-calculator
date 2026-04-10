---
name: postcss-critical
description: NEVER delete postcss.config.mjs — it is required for Tailwind 4 to work. Deleting it breaks ALL styling.
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
**postcss.config.mjs is CRITICAL — never delete it.**

**Why:** During Phase 0, the old root-level postcss.config.mjs was deleted as "cleanup" but the front-end one was also removed by accident. Without this file, `@tailwindcss/postcss` never processes the CSS, so `@import "tailwindcss"`, `@theme inline`, and ALL utility classes are ignored. The app renders with zero styling — raw browser defaults, massive SVGs, visible sr-only elements.

**How to apply:** Before any file cleanup/deletion, always verify these critical config files exist in front-end/:
- `postcss.config.mjs` (Tailwind 4 entry point)
- `next.config.ts` (Next.js config)
- `tsconfig.json` (TypeScript)
- `jest.config.ts` (Jest)
- `eslint.config.mjs` (ESLint)
- `playwright.config.ts` (Playwright)

When deleting files during cleanup, NEVER delete config files without explicitly confirming they are unused. A "quick visual check" of the running app after any config change would have caught this immediately.
