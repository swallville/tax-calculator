---
name: decoupling-principles
description: User strongly values code decoupling — extract hooks, sub-components, constants, never hardcode values
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
**Scope of functionality is paramount.** Every unit of code should have a single, clear responsibility.

**Component decoupling:**
- Extract sub-components (SalaryInput, YearSelect, CalculateButton) from composite forms
- Each sub-component owns its own label, input, error display, and a11y attributes
- Parent composes children via props — no logic duplication

**Hook decoupling (FSD: widget lib/):**
- `useCalculateAction` — form action + validation (extracted from TaxForm)
- `useCalculatorState` — derived display state (extracted from page.tsx)
- `useRetryCalculation` — retry callback (extracted from ErrorState)
- Hooks live in `widgets/tax-calculator/lib/` per FSD convention

**Constant extraction:**
- `VALID_YEARS` — single source of truth for supported years (used by Zod, dropdown, tests)
- `DEFAULT_YEAR` — derived from VALID_YEARS, used by store and dropdown
- `SKELETON_ROW_COUNT` — semantic constant replacing magic number
- Never hardcode lists that could grow (iterate, don't enumerate)

**Why:** The user explicitly called this out as critical for maintainability, testability, and incremental development. Each extracted unit can be tested in isolation, evolved independently, and understood without reading the parent.

**How to apply:** When writing any component, ask: "Can this be split into smaller pieces with single responsibilities?" Extract hooks for any logic that isn't pure rendering. Extract constants for any repeated or magic values.
