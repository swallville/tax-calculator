---
name: phase-8-complete-and-published
description: Project state as of 2026-04-10 — all phases 0–8.7 DONE, repo published to GitHub swallville/tax-calculator, Co-Authored-By trailers stripped from history
type: project
---

**All implementation work is finished and public.** Phases 0–7+++, 8.1–8.6, and 8.7 are all DONE on `main` at `https://github.com/swallville/tax-calculator`. The only remaining obligation on `IMPLEMENTATION-PLAN.md` is the panel interview itself, which is not a coding task.

**Why:** The user asked "what's missing?" across multiple sessions through Phase 8.6 and the answer was always "one more thing." After Phase 8.6 the answer became "nothing on the technical plan — the repo is public, the history is clean, every document has been updated to reflect the Phase 8.7 publish."

**How to apply:** When the user asks "what's missing / what's next" in this project now, the answer is one line: "Nothing on the implementation plan — the repo is shipped and public. Next step is the panel interview itself." Do not invent follow-up tasks unless the user explicitly requests a new scope.

### Phase 8.4 — DONE (2026-04-10)

Twelve grouped Conventional Commits landed on local `main` via `git-commit-helper`. Repo-local author set to `Lukas Ferreira <unlisislukasferreira@hotmail.com>`. Branch stayed local; no push yet because GitHub access was still being recovered.

### Phase 8.5 — DONE (2026-04-10)

Five-agent review team (architecture / security / performance / testing / Devil's Advocate) ran against local `main` instead of a PR URL. 2 HIGH fixes: broken BDD step definition POM references (`calc.emptyStateById` / `calc.retryButtonById` did not exist); FSD lint claim was a documentation lie (`eslint.config.mjs` had zero layer-boundary rules — fixed by adding three `no-restricted-imports` per-directory overrides). 4 MEDIUM fixes: selector derived-store leak (hoisted eight stores to module scope), CSP defense-in-depth (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), `compress: true` (deployment has no reverse proxy), vacuous `not.toBeInstanceOf` assertion in client.test.ts.

### Phase 8.6 — DONE (2026-04-10)

All seven deferred items from Phase 8.5 addressed. Architectural cleanups for `StoresPersistence` (new `persistTaxBracketsStore()` factory), `samples.ts` side-effect import (moved to entity barrel), `docker-compose.yml` (runtime env replaced with `build.args`). Two test improvements: retry filter boundary test, true logger redaction test. Pino → custom 60-line logger at `front-end/src/shared/lib/logger/logger.ts` (~4 KB gzipped savings; mid-pass 101 KB "savings" was a partial-response measurement error caught by a clean rebuild). CSP nonce migration attempted with passing Playwright suite, then reverted after measuring 97 KB static-prerender cost for zero real-threat gain on a public unauthenticated calculator.

**Final bundle: 218 KB gzipped, 68 KB over the 150 KB plan target.** Structurally defensible, measured correctly, documented honestly in walkthrough/findings/journal.

### Phase 8.7 — DONE (2026-04-10)

GitHub account recovered, `swallville/tax-calculator` created as empty remote. `git remote add origin` + `git push -u origin main` pushed all 23 commits on first attempt with the Phase 8.4 author config carrying through.

**Root README promoted:** Previously the only rich README lived at `front-end/README.md`, which GitHub does not render as the repo landing page. Created a new root `README.md` as the public landing page (pitch + architecture + quick start + links into `docs/`) and demoted `front-end/README.md` to a concise navigation stub. Added `docs/diagrams/frontend-architecture.md` to complete the visual documentation suite.

**History rewrite:** 20 of 23 commits carried a `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` trailer from the git-commit-helper agent. Created `backup/pre-coauthor-strip` before running any filter command, then used `git filter-branch --msg-filter` with a `sed` expression to strip the trailer and preceding blank line from every commit message. Verified zero trailers on `main`, twenty on the backup. Force-pushed to `origin/main` with `--force-with-lease` (the safer variant that refuses the push if the remote ref changed since last fetch).

**Applied Prettier** to previously-unformatted config and script files surfaced by the reorganization. Final working tree clean.

### Repository state as of end of 2026-04-10

- Remote: `https://github.com/swallville/tax-calculator.git` (origin)
- Branch: `main`, public, 23+ commits, author `Lukas Ferreira <unlisislukasferreira@hotmail.com>`
- Backup: `backup/pre-coauthor-strip` (local only, preserves original 20 `Co-Authored-By` trailers for recovery)
- Bundle: 218 KB gzipped (68 KB over 150 KB target — documented)
- Tests: 227 unit + 47 Chromium E2E + 187 cross-browser E2E (Chromium + Firefox + WebKit + Mobile Chrome)
- Docs: ROOT `README.md`, 4 load-bearing scrolls under `docs/` (PLAN + FINDINGS + JOURNAL + MEMORY-OF-AI), plus WALKTHROUGH + ONBOARDING + ARCHITECTURE + DESIGN-SYSTEM-GUIDE + ROUTES + FSD-GUIDE + ACCESSIBILITY + 6 Mermaid diagrams under `docs/diagrams/`
- GitHub: repo is public; a visitor landing on `github.com/swallville/tax-calculator` sees the root README as the landing page

### What is NOT remaining

- No uncommitted work
- No unpushed commits
- No PR to open (committed directly to `main` before the push; the review team ran against local main)
- No unfinished phases
- No additional deferred items

### What IS remaining

- The panel interview itself (not a coding task)
