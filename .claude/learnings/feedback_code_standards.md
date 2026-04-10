---
name: code-standards-enforcement
description: User requires SOLID/DRY/KISS, React 19 best practices, Tailwind-only styling, and quality gates after every phase
type: feedback
originSessionId: c6444acc-baee-4d75-9761-3bf2550ab78b
---
User explicitly requires SOLID, DRY, KISS principles enforced across all code. React.memo on pure display components, useActionState for forms, granular Effector selectors via .map().

**Why:** User wants production-quality code that follows industry standards, not just working code. The README assessment criteria explicitly includes design patterns, clean code, and readability.

**How to apply:** After every implementation phase, run quality gate: tsc:check → lint → analyse:circular → test → build → npm audit. Use specialized review agents (7 in parallel) to check each dimension. Never use inline styles — only Tailwind className utilities. Never use arbitrary hex colors — only design tokens from @theme inline.
