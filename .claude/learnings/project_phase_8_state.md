---
name: phase-8-is-all-that-remains
description: Project state as of 2026-04-10 — phases 0–7+++ DONE, only Phase 8 (commit + open PR) remains, nothing committed yet
type: project
---

**All implementation work is finished. Phases 8.1, 8.2, and 8.3 are now ALSO complete. The only thing left on `IMPLEMENTATION-PLAN.md` is Phase 8.4 (commit + PR) and Phase 8.5 (`/review-team` on the opened PR).**

The repo has exactly one commit on `main`: `294c292 Initial commit from Create Next App`. Every phase 0–7+++ worth of work plus today's Phase 8.1–8.3 work is sitting uncommitted in the working tree, ready to commit.

**Why:** Both `IMPLEMENTATION-JOURNAL.md` and `MEMORY-OF-AI.md` were explicitly dated *"on the night before Phase 8.4"* and both close with the line *"Until the next dawn — when we commit, open the pull request, and let the world see what we have made."* Phase 8.4 in the plan is gated with **STOP — await user approval** before running the `git-commit-helper` agent and opening the PR.

**How to apply:** When the user asks "what's missing / what's next" in this project, the answer is one line: "Phase 8.4 — commit the work and open the pull request." Phases 0–7+++ are DONE in the Execution Status table at `docs/IMPLEMENTATION-PLAN.md:1088`, and Phases 8.1–8.3 have new rows added showing completion on 2026-04-10. Do not list sub-steps unless the user asks for them.

### Phase 8.1 (DONE — 2026-04-10)

All seven checks passed on first attempt: tsc, lint, analyse:circular, test:ci (220/220), build, npm audit, playwright chromium (47/47).

### Phase 8.2 (DONE — 2026-04-10)

Four parallel Explore audits (FSD / security / a11y / Tailwind). Findings and fixes:

- **FSD: 4 barrel bypasses fixed.** `errorMapping.ts`, `state-consistency.test.ts`, `entities/tax-brackets/types.ts`, and `TaxBreakdown.test.tsx` all reached into `#/shared/api/client` or `#/shared/lib/tax/types` instead of the barrels `#/shared/api` and `#/shared/lib/tax`. All fixed by rewriting imports to go through the public barrel.
- **Security: 1 non-vulnerability.** `layout.tsx` used `dangerouslySetInnerHTML` for static JSON-LD structured data — no user input, no XSS vector. Refactored to drop the redundant `next/script` wrapper, use a plain `<script type="application/ld+json">` element, and added a comment citing the Next.js App Router JSON-LD docs.
- **A11y: 2 fixes.** Added `aria-required="true"` to `YearSelect.tsx` (salary had it, year did not). Added explicit `focus-visible:*` utilities to `CalculateButton.tsx` (was relying solely on the global `*:focus-visible` rule).
- **Tailwind: clean pass.**

### Phase 8.3 (DONE — 2026-04-10)

`npm run validate` failed twice before passing, exposing two latent issues:

1. **No `.prettierignore`** — the `**/*.js` glob was catching `.next/build/chunks/*.js` from the 8.1 build step. Created a comprehensive `.prettierignore`.
2. **`prettier.config.ts` had `import { Config }`** which Prettier 3 rejects because `Config` is a type-only export. Changed to `import type { Config }`. **This had been broken since Prettier 3 was installed in Phase 0.** The formatter had been silently dead for seven phases. See `feedback_prettier_config_gotcha.md`.
3. After fixing the config, Prettier flagged **67 files** of accumulated format drift (whitespace only, no semantic changes). Ran `npm run format`. All 220 tests still passed.
4. Strengthened `state-consistency.test.ts` by using the previously-unused `year2022State` variable in two new assertions.

### Bundle measurement (DONE — Phase 8.3, honest miss)

**First-load JS: 218 KB gzipped across 9 chunks as of Phase 8.6 final. Target: 150 KB. Over by 68 KB.** (Phase 8.3 originally measured 222.5 KB; Phase 8.6 removed Pino in favor of a custom 60-line console wrapper, saving ~4 KB.)

Structural miss, not negligence. Baseline for React 19 + Next 16 + Effector + @farfetched + Zod + Pino is ~180 KB before any app code. See `reference_bundle_size_reality.md` for the full breakdown.

Tried dynamic-importing the conditional widgets → **0 KB delta** because Next.js App Router prefetches dynamic chunks on first paint via the RSC payload. Reverted. See `feedback_measure_before_optimizing.md`.

### Phase 8.4 plan (awaiting user greenlight)

1. `git config user.email "unlisislukasferreira@hotmail.com"` (repo-local)
2. `git config user.name "Lukas Ferreira"` (repo-local)
3. Delegate to `git-commit-helper` agent → grouped Conventional Commits reflecting phase progression
4. Open PR with summary + requirements coverage matrix + test plan + a11y statement + security statement + **honest bundle miss documentation**
5. **Do NOT push.** Branch stays local until GitHub access is recovered.

### Phase 8.5

`/review-team <PR#>` — blocked until Phase 8.4 PR exists.

### Uncommitted additions to include in the Phase 8 commit

- All Phase 0–7+++ source, tests, docs, configs (never committed)
- Phase 8.2/8.3 fixes: barrel imports, `aria-required`, `focus-visible`, JSON-LD refactor, `.prettierignore`, `prettier.config.ts` type-only import, 67-file format pass, `year2022State` test strengthening
- Today's documentation pass: `front-end/README.md` screenshots + demo video + architecture diagrams section, `front-end/scripts/capture-media.mjs`, `docs/media/*` (7 PNGs + `demo.webm`), `CLAUDE.md` visual reference section, `docs/WALKTHROUGH.md` (new 45-minute panel presenter guide), updates to all four load-bearing docs (PLAN/FINDINGS/JOURNAL/MEMORY-OF-AI) covering Phase 8.1–8.3 and the API proxy architectural story
