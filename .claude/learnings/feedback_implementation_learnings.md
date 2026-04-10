---
name: implementation-learnings
description: Key learnings from tax-calculator implementation — patterns to repeat and pitfalls to avoid
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
## Patterns That Worked Well

1. **7-agent parallel REVIEW team** after each build phase catches issues early. User likes this maximally parallel approach.
2. **Declarative error mapping** (errorMapping.ts with strategy table) — user explicitly requested this pattern for extensibility. Repeat in future projects.
3. **Per-band rounding before sum** in calculateTax — catches floating-point issues. Round intermediates, not just totals.
4. **Module-scoped Intl.NumberFormat** — the cached formatter pattern is a real perf win. Always hoist expensive constructors.
5. **fork() + allSettled()** for Effector store tests — isolates each test, no shared state leakage.
6. **page.route() for deterministic E2E error testing** — don't rely on real backend failures (25% failure rate makes tests flaky). Mock API at the Playwright level.
7. **axe-core (jest-axe) unit tests** — user explicitly asked for a11y unit tests. Run axe on each component variant.

## Pitfalls to Avoid

1. **Effector events as sample() source** — events only hold the last emitted value. Use a store instead for stable source data. This caused a race condition that the code reviewer caught.
2. **shared/ importing from entities/** — FSD violation. Types must live at the lowest layer (shared) and be re-exported by entities. StoresPersistence must live in app/, not shared/.
3. **Dead code accumulates fast** — yearSelected, salaryChanged, api.ts, shimmer keyframe, createPersistedStore all became dead. Review after each phase.
4. **@farfetched retry + cache interact with Playwright timing** — cache prevents re-fetch, retry adds 3x1s delay. E2E tests must account for both.
5. **Next.js standalone rewrites are build-time** — API_BASE_URL must be ARG in Dockerfile, not runtime ENV. This caused the initial Docker proxy failure.

## User Preferences (observed during this implementation)
- Wants maximum agent parallelism (7 REVIEW agents, 4 SCAFFOLD agents, etc.)
- Wants data-testid on ALL components + POM pattern for E2E
- Wants Cucumber/Gherkin with Scenario Outline + dynamic params
- Wants comprehensive .gitignore covering all build artifacts
- Wants error mapping as extensible declarative table, not if/else chains
- Wants store persistence with TTL (2min) and PII sanitization
- Wants 85%+ code coverage minimum, prefers near-100%
- Wants pre-commit quality gate that blocks commit on failure
- Wants all docs linked and cross-referenced
- **Wants concise answers that lead with ONE concrete next action**, not enumerations of sub-steps or checklists (see feedback_concise_answers.md)
- **Expects assistants to read `docs/IMPLEMENTATION-PLAN.md` + FINDINGS + JOURNAL + MEMORY-OF-AI before answering scope/status questions** (see feedback_context_recovery.md)

## Session Learnings — 2026-04-10

- **Four-doc context recovery**: The project state is not derivable from code or git log alone. The plan artifacts under `docs/` are the source of truth for what phases are done. Never answer "what's missing" from `git status` or working-tree diffs — read the plan first.
- **Standalone Playwright scripts for documentation media**: Use the `playwright` library directly (not `@playwright/test`) to capture screenshots and video for README embedding. See reference_visual_media_capture.md for the full pattern. Reference implementation: `front-end/scripts/capture-media.mjs`.
- **React 19 `useActionState` resets uncontrolled inputs after submit**: This is visible in post-calculate screenshots (salary field shows placeholder, not the entered value). Document as expected behavior.
- **Docker stack must be running before media capture**: `docker compose up -d --wait` from repo root. The standalone Playwright script does not auto-start the stack the way the test runner's `webServer` config does.

## Phase 8 is the only thing missing (as of 2026-04-10)

All implementation phases 0–7+++ are DONE in the Execution Status table. Nothing is committed yet — `git log` shows only the CNA initial commit. Phase 8 is gated with "STOP — await user approval" before `git-commit-helper` and PR creation. See `project_phase_8_state.md` for the sub-step playbook.

**Why:** These learnings should guide behavior in future sessions on this project.
**How to apply:** When implementing features, follow these patterns proactively. When reviewing, check for these pitfalls first. On scope/status questions, read the four docs first and lead with one concrete next action.
