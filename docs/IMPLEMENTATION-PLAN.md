# Implementation Plan — Retrospective

**Status**: Implementation complete on 2026-04-10. Repository public at
`github.com/swallville/tax-calculator`. Only the panel interview remains as
a non-code obligation.

The original forward-looking plan (eight phases, ~1180 lines of team
assignments and per-phase step lists) has been archived under
[archive/IMPLEMENTATION-PLAN-ORIGINAL.md](archive/IMPLEMENTATION-PLAN-ORIGINAL.md).
This file retains the three sections that are still useful after delivery —
the execution status, the list of user-requested enhancements that extended
the original scope, and the final verification checklist.

For narrative context and per-phase rationale:

- Per-phase review findings and fixes — [IMPLEMENTATION-FINDINGS.md](IMPLEMENTATION-FINDINGS.md)
- Step-by-step operational log — [IMPLEMENTATION-JOURNAL.md](IMPLEMENTATION-JOURNAL.md)
- Reflective diary companion — [MEMORY-OF-AI.md](MEMORY-OF-AI.md)

---

## Execution Status

| Phase | Status | Tests | Key Deliverables |
|-------|--------|-------|-----------------|
| **0 Scaffold** | DONE | 0 (passWithNoTests) | FSD dirs, tsconfig `#/` aliases, next.config (standalone + API proxy + inlineCss + security headers), jest.config (@swc/jest), playwright.config (4 browsers + docker compose), globals.css (30+ tokens), favicon.svg, manifest.json, Dockerfile (3-stage + build-arg), prettier, .dockerignore, .gitignore |
| **1 Shared** | DONE | 33 tests | API client (ApiError + body), calculateTax (NaN/Infinity guard, per-band rounding), formatCurrency/formatPercent (cached Intl), Pino logger (redact salary), test-utils, shared types |
| **2 Entity** | DONE | 46 tests | Zod schemas + zodContract, Effector events/store/effects/samples/selectors, @farfetched query + cache(5m TTL) + retry(3x on 500+), declarative errorMapping table, fork/allSettled tests |
| **3 Widgets** | DONE | 73 tests | TaxForm (useActionState + Zod), TaxBreakdown (React.memo BandRow, tfoot), EmptyState, LoadingState (skeleton), ErrorState (Record<NonNullable<ErrorType>>), SEO (metadata, OpenGraph, Twitter, JSON-LD, opengraph-image.tsx), all with data-testid |
| **4 App** | DONE | 75 unit tests | Page assembly (conditional rendering, skip-to-content, sr-only h1), security headers (CSP, X-Frame-Options, Referrer-Policy), dead code cleanup |
| **5 Docker** | DONE | — | docker-compose.yml (standalone + API_BASE_URL), docker-compose.dev.yml (hot reload), Dockerfile (build-arg), smoke tested (both services communicate) |
| **6 E2E** | DONE | 220 unit + 47 E2E | POM helper, 8 spec files (happy-path, error-handling, form-validation, accessibility, responsive, security, edge-cases), 2 Gherkin feature files with Scenario Outline + dynamic params |
| **7 Docs** | DONE | 220 unit + 47 E2E | 7 docs + 17 linked READMEs + 6 Mermaid diagrams. jest-axe a11y tests, Zod contract tests, state consistency tests, edge case + failure tests. Coverage: 100%/99.11%/100%/100% |
| **7+ Decoupling** | DONE | 220 unit + 47 E2E | Extracted 3 custom hooks, 3 sub-components, constants (VALID_YEARS, DEFAULT_YEAR, SKELETON_ROW_COUNT), parseCurrency(). Removed empty shared/ui/, dead aliases. |
| **7++ A11y + Stability** | DONE | 220 unit + 47 E2E | Persistent live region + alert wrapper for NVDA/JAWS, aria-required, th scope="row", aria-labelledby linking, named exports, testid-based selectors, ACCESSIBILITY.md |
| **7+++ Cross-Browser** | DONE | 220 unit + 187 E2E | E2E on all 4 browsers, browser-aware keyboard nav test, color blindness audit, cross-browser learning doc, salary PII docs |
| **8.1 Pre-Review Gate** | DONE (2026-04-10) | 220 unit + 47 Chromium E2E | tsc, lint, circular deps, test:ci, build, npm audit, playwright chromium — all green first run |
| **8.2 Final Verify** | DONE (2026-04-10) | — | 4 Explore audits (FSD/security/a11y/Tailwind). Fixed 4 barrel bypasses, aria-required on YearSelect, focus-visible on CalculateButton, JSON-LD refactor |
| **8.3 Pre-Commit Validate** | DONE (2026-04-10) | 220 unit | Fixed prettier.config.ts (broken import since Prettier 3), reformatted 67 files, strengthened state-consistency test. Bundle: 222.5 KB gzipped (72.5 KB over target — documented as honest miss). Attempted dynamic imports → 0 KB delta (App Router prefetches via RSC), reverted per KISS. **CSP font-src fix**: added `data:` for `next/font/google` data-URI inlining. |
| **8.4 Commit & PR** | DONE (2026-04-10) | 220 unit + 47 Chromium E2E | Repo-local author set. `git-commit-helper` produced twelve grouped Conventional Commits. Branch stayed local (no push) until 8.7 because GitHub access was still being recovered. |
| **8.5 PR Review** | DONE (2026-04-10) | 220 unit + 47 Chromium E2E after fixes | 5-agent review team (architecture / security / performance / testing / Devil's Advocate). 2 HIGH findings fixed (BDD POM refs, missing FSD lint boundaries). 4 MEDIUM fixes (hoisted derived stores, CSP object-src/base-uri/form-action, compress: true, vacuous assertion). |
| **8.6 Deferred-items pass** | DONE (2026-04-10) | 227 unit + 47 Chromium E2E | Seven items from 8.5. StoresPersistence barrel-encapsulation, samples side-effect import moved to entity barrel, docker-compose build.args, retry boundary test, spy-based logger redaction test. **Pino → custom 60-line logger** preserving the full public surface and numeric level scheme. CSP nonce migration attempted, measured (97 KB static-prerender cost for a public unauthenticated calculator), and reverted. Final bundle 218 KB gzipped, 68 KB over target, documented. |
| **8.7 GitHub Publish + Docs Reorg** | DONE (2026-04-10) | 227 unit + 47 Chromium E2E | Created `swallville/tax-calculator` on GitHub, pushed main for the first time. Promoted root README as the GitHub landing page. Rewrote commit history with `git filter-branch --msg-filter` to strip Co-Authored-By trailers (backup branch preserved). Force-pushed with `--force-with-lease`. Final Prettier pass on previously-unformatted config files. |

---

## Changes from Original Plan (user-requested enhancements)

1. **SEO improvements** (Phase 3–4): Next.js Metadata API, OpenGraph, Twitter card, JSON-LD, auto-generated OG image, `lang="en-CA"`.
2. **Cache layer** (Phase 2): @farfetched `cache(5m TTL)` + effector-storage persistence (2m TTL, no salary PII).
3. **Error mapping** (Phase 2): Declarative `errorMapping.ts` with strategy table pattern.
4. **Security headers** (Phase 4): CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
5. **data-testid + Cucumber/Gherkin** (Phase 6): All components have testids; 2 feature files with `Scenario Outline`.
6. **Docker Compose E2E** (Phase 6): Playwright `webServer` uses `docker compose up`.
7. **Currency input** (Phase 7+): `parseCurrency()` strips `$`, commas, spaces — `"100,000"` works.
8. **Component decoupling** (Phase 7+): `SalaryInput`, `YearSelect`, `CalculateButton` extracted as sub-components.
9. **Custom hooks** (Phase 7+): `useCalculateAction`, `useCalculatorState`, `useRetryCalculation` in `widgets/lib/`.
10. **Constant extraction** (Phase 7+): `VALID_YEARS`, `DEFAULT_YEAR`, `SKELETON_ROW_COUNT` — no hardcoded values.
11. **State consistency tests** (Phase 7+): Multi-step event sequence tests with `assertStateConsistency()`.
12. **Edge case + failure tests** (Phase 7+): Boundary values, network errors, malformed JSON, extreme inputs.
13. **Mermaid diagrams** (Phase 7+): 6 visual diagrams in `docs/diagrams/`.
14. **Coverage threshold** (Phase 7+): 85% minimum enforced in `jest.config.ts`.
15. **Workflow doc** (`.claude/WORKFLOW.md`): 8-step development cycle for future sessions (Simplify pass added on 2026-04-16).
16. **Dead code cleanup** (continuous): `api.ts`, unused events/selectors, shimmer keyframe, `favicon.ico`, empty `shared/ui/`, dead aliases.

---

## Final Checklist (22 items)

1. `tsc --noEmit` — zero errors ✔
2. `npm run lint` — zero issues ✔
3. `npx jest` — all unit tests pass ✔
4. `npm run build` — compiles ✔
5. `npm audit` — no high/critical vulns ✔
6. `docker compose up` — both services work ✔
7. `playwright test` — all E2E pass across 4 browser projects ✔
8. Manual: $0→$0, $50K→$7,500, $100K→$17,739.17, $1.234M→$385,587.65 ✔
9. Manual: 500 retry works transparently ✔
10. Manual: 404 shows "Unsupported Tax Year" (no retry) ✔
11. Manual: Tab through form, focus rings visible ✔
12. Manual: screen reader announces results + errors ✔
13. Manual: responsive mobile/tablet/desktop ✔
14. Lighthouse 90+, bundle <150KB → bundle landed at 218 KB (honest miss, documented)
15. No XSS vectors, no PII in console ✔
16. Structured logging (API, retries, errors — no salary) ✔
17. `/review-fix` — no remaining items ✔
18. `/review-team` — no HIGH critical findings ✔
19. SEO: OpenGraph image renders, JSON-LD validates, meta tags present ✔
20. Cache: same-year re-calculation skips network request within 5m ✔
21. Documentation: README + ONBOARDING + DESIGN-SYSTEM-GUIDE + ROUTES + FINDINGS all present ✔
22. Playwright recordings: visual verification via `playwright-qa-cli` skill ✔
