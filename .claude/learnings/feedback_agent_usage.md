---
name: agent-usage-preference
description: User wants maximum agent usage — teams of specialized agents per phase, Explore agents for research/verification, review agents in parallel
type: feedback
originSessionId: c6444acc-baee-4d75-9761-3bf2550ab78b
---
User wants agents used as much as possible. Use teams: BUILD (3 agents), REVIEW (7 agents in parallel), POLISH (3 agents), MILESTONE (5 agents). Use Explore agents for codebase research before building and verification after.

**Why:** User values thorough, multi-dimensional quality checks and wants specialized perspectives (security, performance, a11y, types, tests, architecture, code quality) on every piece of code.

**How to apply:** Before each phase, launch 2-3 Explore agents to read reference files. After building, run REVIEW team (7 agents in parallel). After Phase 3 widgets, add POLISH team. At Phase 4 milestone, use MILESTONE team (5 agents). Always use /review-fix before PR and /review-team on the PR itself.
