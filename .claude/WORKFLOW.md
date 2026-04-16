# Development Workflow Pattern

This document defines the workflow to follow for every implementation task. It ensures consistency, quality, and documentation are never skipped.

## The 8-Step Cycle

Every feature, fix, or improvement follows this cycle:

### 1. Implement
Write the code. Follow these principles:
- **Decouple**: Extract hooks, sub-components, constants. Each unit has one scope of responsibility.
- **No hardcoded values**: Use constants (`VALID_YEARS`, `DEFAULT_YEAR`, `SKELETON_ROW_COUNT`).
- **FSD compliance**: Import direction only flows downward (app → widgets → entities → shared).
- **Tailwind tokens only**: No hardcoded hex in className. No inline styles (except `animationDelay`).

### 2. Simplify (mandatory follow-up to every code change)
Run a dedicated dead-code + simplification sweep before writing tests. This is not optional — it catches barrel-export rot, orphan dependencies, over-exposed types, and duplicated class chains that the standard quality gate does not flag.

**Dead code & unused exports**:
```bash
npx --yes ts-unused-exports tsconfig.json --excludePathsFromReport='e2e;scripts;@types;jest.setup.js'
npm run analyse:deps
```
- Framework defaults always show (`jest.config.ts`, `next.config.ts`, `playwright.config.ts`, `prettier.config.ts`, `app/layout.tsx`, `app/opengraph-image.tsx`) — these are entry points, never remove.
- Before deleting a barrel re-export, grep for both the symbol AND the barrel path — consumers may import via a parent barrel that re-exports from the child.
- Demote, don't always delete: `export` keywords on types/consts that are still used inside the same file should become file-local, not deleted.
- depcheck false-positive ignore list for this repo: `@swc/core`, `@swc/jest`, `@tailwindcss/postcss`, `@testing-library/jest-dom`, `@types/node`, `identity-obj-proxy`, `jest-environment-jsdom`, `tailwindcss`, `ts-node`. Missing-deps false positives: `@next/env`, `playwright`, `jest-extended`, `#`.

**Tailwind class deduplication**:
- Identify className strings ≥40 chars that appear in 2+ files: `grep -rn 'className="[^"]\{40,\}"' src/`
- Extract to a colocated `styles.ts` module as named const exports (project rule forbids `@apply` and CSS modules — TS-string deduplication is the chosen pattern).
- Within a single file, extract repeated chains as module-level constants near the top (e.g. `TH_BASE`, `SKELETON_BAR`, `ROW_STRIPE`).
- Do NOT enable base ESLint `no-unused-vars` — it produces 6+ false positives in this codebase (TS parameter properties, type-signature parameter names, generic type-only params). The default `@typescript-eslint/no-unused-vars` from `eslint-config-next/typescript` is correct.

**Code-level simplification**:
- Invoke the `simplify` skill on the changed files for reuse, quality, and efficiency improvements.
- Re-run the full quality gate (Step 4 below) — cleaning up exports can break internal imports the dead-code pass missed.

### 3. Test (three dimensions)
- **Happy paths**: Standard user flows work correctly
- **Edge cases**: Boundary values, extreme inputs, empty states, single-item lists
- **Failure scenarios**: Network errors, malformed JSON, invalid input, timeout

For Effector stores, add **state consistency tests**:
- Success → Error transition
- Error → Success transition
- Sequential operations don't leave stale state
- Scope isolation (parallel forks)

### 4. Quality Gate
Run before ANY commit:
```bash
npm run tsc:check          # TypeScript — zero errors
npm run lint               # ESLint — zero issues
npm run analyse:circular   # No circular deps
npm run test:ci            # Jest — 85%+ coverage (enforced by coverageThreshold)
npm run build              # Next.js compiles
npm audit --audit-level=high
```

### 5. Update Documentation
After every code change, update:
- [ ] Relevant README.md in the changed directory
- [ ] Main README.md if public API changed
- [ ] docs/ files if architecture or patterns changed
- [ ] Code comments (JSDoc on exports, inline on non-obvious logic)

### 6. Update Memory
Save learnings for future sessions:
- New patterns discovered → `feedback_*.md`
- Implementation status → `project_implementation_status.md`
- Pitfalls encountered → `feedback_implementation_learnings.md`

### 7. Rebuild and Verify
```bash
docker compose down && docker compose up -d --build
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/tax-calculator/tax-year/2022
```

### 8. Review
- E2E tests pass against Docker: `npx playwright test --project=chromium`
- Visual check of the running application
- No NaN, no unstyled elements, no broken layouts

## Critical Config Files (NEVER delete)

- `postcss.config.mjs` — Tailwind 4 processing
- `next.config.ts` — Proxy, headers, build config
- `tsconfig.json` — TypeScript
- `jest.config.ts` — Testing with coverage threshold
- `eslint.config.mjs` — Linting with FSD import rules
- `playwright.config.ts` — E2E with Docker webServer

## Testing Philosophy

| Dimension | What to test | Example |
|-----------|-------------|---------|
| Happy path | Standard inputs produce correct output | $100,000 salary → $17,739.17 tax |
| Edge case | Boundary values, extremes, empty states | $0 salary, $999M salary, rate=0, rate=1 |
| Failure | Errors, bad input, network issues | 500 error, malformed JSON, "abc" salary |
| Consistency | Multi-step state stays valid | Success→Error clears results, Error→Success clears error |
