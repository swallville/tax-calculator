---
name: review-fix
description: Automated review-fix loop that spawns 8 reviewers in parallel, fixes quick-fix items automatically, and accumulates strategic items for user decision. Iterates until no issues remain or max iterations reached. Use when you want comprehensive code review with auto-fixes before creating a PR.
---

# Review-Fix Loop

Orchestrate an automated review-fix cycle that iterates until your code is clean. Each iteration spawns fresh sub-agents with full context windows, fixes quick-fix items automatically, and accumulates strategic items for user decision at the end.

## When to Use This Command

- **Before creating a PR** - Get comprehensive feedback AND automatic fixes
- **After major refactoring** - Ensure quality across multiple review cycles
- **When you want hands-off improvement** - Let the loop fix issues automatically
- **For iterative polish** - Run until no quick-fix items remain

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max-iterations` | 3 | Maximum review-fix cycles before stopping |
| `auto-commit` | true | Create a commit after each fix cycle |
| `skip-strategic` | false | Skip strategic item questions at the end |
| `base-commit` | `main` | Commit/branch to compare against |

## Invocation

```
/review-fix
/review-fix max-iterations=5
/review-fix auto-commit=false
/review-fix base-commit=feature-branch
```

## Architecture

```
ORCHESTRATOR (main session - manages state only)
|
+-- REVIEW PHASE (8 parallel sub-agents, each with fresh context)
|   +-- premium-ux-designer      (Frontend Designer)
|   +-- product-strategy-advisor  (Product Manager)
|   +-- general-purpose           (QA Engineer)
|   +-- system-architect          (System Architect)
|   +-- code-refactorer           (Senior Developer)
|   +-- senior-code-reviewer      (Code Maintainability)
|   +-- Explore                   (Reusable Components)
|   +-- Explore                   (Dead Code Hunter)
|
+-- FIX PHASE (single sub-agent, fresh context)
|   +-- General agent with fix prompt + file context
|
+-- STATE FILE (.review-fix/state.json)
```

---

## Workflow

### Step 0: Initialize State

Create `.review-fix/state.json`:
```json
{
  "iteration": 1,
  "maxIterations": 3,
  "baseCommit": "main",
  "strategicItems": [],
  "fixedItems": [],
  "commits": [],
  "status": "in_progress",
  "startedAt": "ISO timestamp",
  "branchName": "current branch"
}
```

### Step 1: Extract Branch Context

```bash
BRANCH=$(git branch --show-current)
BASE_COMMIT="${base_commit:-main}"
git diff --stat "$BASE_COMMIT"..HEAD
git diff --name-only "$BASE_COMMIT"..HEAD
git log --oneline "$BASE_COMMIT"..HEAD
git diff "$BASE_COMMIT"..HEAD --no-color
```

### Step 2: Spawn 8 Reviewer Sub-Agents IN PARALLEL

Use the Agent tool with `run_in_background: true`. Each reviewer receives the diff, changed files, and their specific focus.

All reviewers must return findings as:
```json
[{
  "severity": "critical|important|suggestion",
  "label": "blocking|important|nit|suggestion",
  "category": "designer|pm|qa|architect|developer|maintainability|reusable|deadcode",
  "file": "path/to/file.tsx",
  "line": 123,
  "issue": "Brief description",
  "suggestion": "Specific fix",
  "type": "quick-fix|strategic"
}]
```

**MAX 10 findings per reviewer.**

#### Persona 1: Frontend Designer (`premium-ux-designer`)

Review component/page files for:
- Missing hover/focus/active/disabled states per design system spec
- Inconsistent spacing or typography vs design tokens in globals.css
- Poor loading states (missing skeleton loaders)
- Accessibility issues (ARIA labels, keyboard navigation, focus-visible rings)
- Hardcoded colors instead of CSS custom properties (`--bg-card-form`, `--text-primary`, etc.)
- Missing responsive breakpoint handling (mobile/tablet/desktop)
- Animation violations (missing `animate-fade-in-up` on results, missing `prefers-reduced-motion`)

Mark CSS/styling changes as "quick-fix". Design decisions as "strategic".

#### Persona 2: Product Manager (`product-strategy-advisor`)

Review overall changes for:
- Feature creep or over-engineering
- Missing edge cases that affect UX (negative salary, unsupported year, API timeout)
- Tax calculation accuracy (verify against README test scenarios)
- Unnecessary complexity
- User experience gaps (missing empty state, unclear error messages)

Most PM feedback should be "strategic".

#### Persona 3: QA Engineer (`general-purpose`)

Review test coverage for:
- Missing Jest unit tests for pure functions (`calculateTax`, formatters)
- Missing Effector store tests using `fork()` + `allSettled()` pattern
- Missing RTL component tests for widgets
- Missing Playwright E2E tests for critical paths (happy path, error handling, retry)
- Untested edge cases: $0 salary, negative salary, bracket boundary values, API failure
- Error handling gaps in effects and samples

Mark missing tests as "quick-fix" with specific test suggestions.

#### Persona 4: System Architect (`system-architect`)

Review for:
- FSD layer dependency violations (higher layers importing from lower only)
- Cross-slice imports within the same layer
- Effector store design issues (single store vs split, missing samples wiring)
- API client abstraction quality
- Missing barrel exports (index.ts files)
- Next.js App Router misuse (server/client component boundaries)
- Path alias consistency (`#/shared/*`, `#/entities/*`, etc.)

Architecture violations = "quick-fix" with label "blocking".

#### Persona 5: Senior Developer (`code-refactorer`)

Review for:
- Bugs and logic errors in tax calculation
- React hook issues (missing deps, memory leaks, stale closures)
- TypeScript type safety (missing types, any usage, unsafe assertions)
- Effector anti-patterns (store mutation outside .on, missing sample filters)
- Error handling patterns (bare catch blocks, swallowed errors)
- Performance (unnecessary re-renders, missing memoization on derived stores)

Most code fixes = "quick-fix".

#### Persona 6: Code Maintainability (`senior-code-reviewer`)

Review for:
- Overly complex code (high cyclomatic complexity)
- Code duplication across widgets or entities
- Inconsistent patterns vs MoviesTest reference conventions
- Missing JSDoc on exported functions (selectors, calculateTax, formatters)
- Unclear naming (ambiguous variable/function names)

#### Persona 7: Reusable Components (`Explore`)

Search for:
- Shared UI components that could replace custom code
- Duplicate logic across widgets (e.g., formatting logic duplicated instead of using shared/lib/format)
- Missing shared utilities that multiple files could use
- Opportunities to extract common patterns into shared layer

#### Persona 8: Dead Code Hunter (`Explore`)

Scan for:
- Unused imports
- Unused variables/functions
- Orphan files never imported (missing from any index.ts barrel)
- Commented-out code blocks
- Unreachable code paths
- Effector events/effects defined but never triggered
- Stale test mocks

### Step 3: Collect and Aggregate

1. Retrieve results from each agent
2. Parse JSON findings
3. Deduplicate similar findings (same file + same issue = merge)
4. Separate: `quick-fix` → fix prompt, `strategic` → accumulate

### Step 4: Check Exit Conditions

Exit if: no quick-fix items, or `iteration >= maxIterations`, or critical build failure.

### Step 5: Generate Fix Prompt

Create fix prompt for quick-fix items organized by severity (critical → important → suggestions).

### Step 6: Fix Phase (Fresh Sub-Agent)

Spawn single fix agent with the fix prompt. After fixing:
1. Run `cd front-end && npx tsc --noEmit` (TypeScript check)
2. Run `cd front-end && npm run lint` (ESLint)
3. Run `cd front-end && npx jest --runInBand --silent` (unit tests)
4. Run `cd front-end && npm run build` (Next.js build)

### Step 7: Commit (if auto-commit enabled)

```bash
git add -A
git commit -m "fix: address code review findings (iteration {N})

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Step 8: Loop or Complete

If more iterations needed: increment, go to Step 1. If complete: proceed to strategic review.

### Step 9: Strategic Items Review

Present accumulated strategic items grouped by category. For each, user chooses:
- **Implement now** — fix agent handles it
- **Add to backlog** — noted in report
- **Ignore** — dismissed with reason

### Final Report

```markdown
# Review-Fix Complete

## Summary
| Metric | Value |
|--------|-------|
| Iterations | {N} |
| Quick-fix items resolved | {N} |
| Strategic items accumulated | {N} |
| Commits created | {N} |

## Commits
{list with hashes and messages}

## Strategic Items Handled
- Implemented now: {N}
- Added to backlog: {N}
- Ignored: {N}

## Files Modified
{list grouped by FSD layer}

## Test Results
| Suite | Pass | Fail |
| Jest unit | {N} | {N} |
| Playwright E2E | {N} | {N} |
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Reviewer agent failure | Log, continue with others |
| Fix agent failure | Save prompt, retry, exit after 2 failures |
| Build failure (`tsc --noEmit`) | Debug sub-agent, include error in next fix prompt |
| Test failure | Log failing tests, include in fix prompt for next iteration |
| Max iterations reached | Normal exit, report remaining items |

---

## Tips

1. Start with default settings — 3 iterations is usually enough
2. Review strategic items thoughtfully — they represent real decisions
3. Run after major features before PR review
4. Combine with `/review-team` for the full workflow: `/review-fix` first, then `/review-team` on the PR
5. Add `.review-fix/` to `.gitignore`
