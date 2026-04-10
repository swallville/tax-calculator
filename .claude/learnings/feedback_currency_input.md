---
name: currency-input-pattern
description: Salary input accepts currency-formatted values (commas, dollar signs) via parseCurrency() helper
type: feedback
originSessionId: 7dc31e60-f462-47e0-9826-e42a987c6fc0
---
The salary input uses `parseCurrency()` to strip formatting before Zod validation.

**Pattern:** `parseCurrency("$1,234,567.89")` → `1234567.89`
- Strips: `$`, `,`, spaces
- Preserves: decimal point and digits
- Returns `NaN` for empty/non-numeric input (caught by Zod)

**Why:** The placeholder says "e.g. 100,000" which invites comma-formatted input. Without stripping, `Number("100,000")` returns `NaN` and the user gets a confusing validation error.

**How to apply:** Any numeric input field that displays a placeholder with formatting should use `parseCurrency()` before `Number()` conversion. The helper lives at `#/shared/lib/format/parseCurrency`.
