# Development Workflow Pattern

This document defines the workflow to follow for every implementation task. It ensures consistency, quality, and documentation are never skipped.

## The 7-Step Cycle

Every feature, fix, or improvement follows this cycle:

### 1. Implement
Write the code. Follow these principles:
- **Decouple**: Extract hooks, sub-components, constants. Each unit has one scope of responsibility.
- **No hardcoded values**: Use constants (`VALID_YEARS`, `DEFAULT_YEAR`, `SKELETON_ROW_COUNT`).
- **FSD compliance**: Import direction only flows downward (app → widgets → entities → shared).
- **Tailwind tokens only**: No hardcoded hex in className. No inline styles (except `animationDelay`).

### 2. Test (three dimensions)
- **Happy paths**: Standard user flows work correctly
- **Edge cases**: Boundary values, extreme inputs, empty states, single-item lists
- **Failure scenarios**: Network errors, malformed JSON, invalid input, timeout

For Effector stores, add **state consistency tests**:
- Success → Error transition
- Error → Success transition
- Sequential operations don't leave stale state
- Scope isolation (parallel forks)

### 3. Quality Gate
Run before ANY commit:
```bash
npm run tsc:check          # TypeScript — zero errors
npm run lint               # ESLint — zero issues
npm run analyse:circular   # No circular deps
npm run test:ci            # Jest — 85%+ coverage (enforced by coverageThreshold)
npm run build              # Next.js compiles
npm audit --audit-level=high
```

### 4. Update Documentation
After every code change, update:
- [ ] Relevant README.md in the changed directory
- [ ] Main README.md if public API changed
- [ ] docs/ files if architecture or patterns changed
- [ ] Code comments (JSDoc on exports, inline on non-obvious logic)

### 5. Update Memory
Save learnings for future sessions:
- New patterns discovered → `feedback_*.md`
- Implementation status → `project_implementation_status.md`
- Pitfalls encountered → `feedback_implementation_learnings.md`

### 6. Rebuild and Verify
```bash
docker compose down && docker compose up -d --build
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/tax-calculator/tax-year/2022
```

### 7. Review
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
