---
name: prettier-config-type-import-gotcha
description: prettier.config.ts must use `import type { Config }` with Prettier 3+, not `import { Config }` — Prettier exports Config only as a type, and a runtime import silently kills the whole formatter
type: feedback
---

**In any project using Prettier 3 and a TypeScript config file, `prettier.config.ts` must use `import type { Config } from "prettier"`, not `import { Config } from "prettier"`.**

Prettier 3 exports the `Config` symbol **only as a TypeScript type**, not as a runtime value. TypeScript's default emit preserves `import { Config }` as a real runtime module access, and Node.js cannot resolve the non-existent runtime export. The loader throws `"The requested module 'prettier' does not provide an export named 'Config'"` and the entire `format:check` / `format` invocation fails before it touches any file.

**Why:** On 2026-04-10 in the tax-calculator, `prettier.config.ts` had the wrong form from the moment Prettier 3 was installed in Phase 0. The formatter had been silently dead for **seven phases** before anyone ran it end-to-end. When I finally fixed the one-word import, the formerly-functional tool resurrected and immediately flagged **67 files** of accumulated format drift that had never been caught because the check had always crashed before it reached any file. The fix was trivial; the drift it uncovered was not. `npm run validate` failed in Phase 8.3 because of this, even though all the individual quality-gate commands in Phase 8.1 had passed. The individual commands never ran `format:check`.

**How to apply:**

1. **Every time you create a `prettier.config.ts`** (or upgrade to Prettier 3+), use `import type { Config } from "prettier"`. Never `import { Config }`.
2. **If you inherit a project with `prettier.config.ts`**, check the import form before trusting any `format:check` success signal — a broken config can masquerade as "no files need formatting" because the tool crashes before reporting.
3. **Run `npm run validate` end-to-end at least once in Phase 0**, not just the individual checks. The validate script chains `format:check → lint:fix → tsc:check → analyse:circular → test:local` and exposes interactions that individual commands miss.
4. **Create a `.prettierignore` at the same time as `prettier.config.ts`**. Without one, Prettier's glob `**/*.{js,jsx,ts,tsx,md}` happily descends into `.next/`, `dist/`, `build/`, `coverage/`, etc., and can crash on generated filenames with unusual characters.
5. **Trust no tool until you have seen it output both a PASS and a FAIL.** A tool that has never reported anything is not a working tool; it is a silent tool, which is a worse category.

**The generalized lesson:** a check that silently crashes is worse than a check that fails. A failing check tells you something is wrong and demands attention. A crashing check tells you nothing and earns complacency. Run every tool at least once end-to-end.
