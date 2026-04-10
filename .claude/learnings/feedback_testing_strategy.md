---
name: testing-strategy
description: Comprehensive testing strategy — state consistency, edge cases, failure scenarios, not just happy paths
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
**Tests must cover three dimensions, not just happy paths:**

## 1. State Consistency Tests
Verify the store remains valid after multi-step event sequences:
- Success → Error transition: results cleared when error arrives
- Error → Success transition: error cleared when results arrive
- calculateRequested clears stale error before fetch starts
- resetResults preserves salary/year but clears results
- Sequential calculations: second replaces first entirely
- Scope isolation: parallel forks don't interfere
- Full lifecycle: initial → success → reset → error → retry

Use a `assertStateConsistency()` helper that enforces invariants:
- Error and results never coexist
- effectiveRate is within [0, 1] when totalTax > 0

## 2. Edge Case Tests
Test boundary values and extreme inputs:
- Salary at exact bracket boundary ($50,197)
- Very large salary ($999,999,999) — no overflow
- Rate = 0 → zero tax; Rate = 1 → tax = salary
- Empty string → NaN; "$," → NaN (parseCurrency)
- Zod: salary = 0 (valid edge), salary = MAX_SAFE_INTEGER
- 100-item brackets array (performance/schema validation)
- 500-char error message (rendering stability)

## 3. Failure Scenario Tests
Test what happens when things go wrong:
- Network error (TypeError from fetch) → propagates as-is, not ApiError
- Malformed JSON → SyntaxError propagates
- response.text() fails on error path → ApiError.body = ""
- 404 → not_found (no retry); 500 → server_error (retries 3x)
- Non-numeric salary → Zod validation error message
- Invalid year → Zod refinement error

## Key Patterns
- Use `fork()` + `allSettled()` for Effector store isolation
- Use `page.route()` for deterministic E2E error testing (not real backend failures)
- 500 errors trigger retry with real timers — avoid in unit tests, use 404 or direct `setError` instead
- `assertStateConsistency()` catches contradictory state that individual assertions miss

**Why:** The user explicitly asked for reliability beyond happy paths. A test suite that only verifies the sunshine path gives false confidence. Edge cases and failure scenarios are where real bugs hide.

**How to apply:** Every new feature should have tests in all three dimensions before the quality gate passes.
