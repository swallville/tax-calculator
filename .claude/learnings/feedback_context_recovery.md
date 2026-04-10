---
name: context-recovery-session-start-checklist
description: At every session start in this repo, read all .claude/learnings/ files AND the four load-bearing docs under docs/ before answering any scope/status question
type: feedback
---

**Every session must begin by reading the accumulated context in this order, before doing any work or answering any question:**

**Step 1 — Read every file under `.claude/learnings/`.** These are the persisted feedback/project/reference learnings from prior sessions. They capture user preferences (concise answers, agent parallelism, testid selectors, decoupling principles), critical pitfalls (never delete `postcss.config.mjs`, never sample from an event source, never use inline styles), and project state snapshots. Missing a learning means repeating a mistake the user has already corrected.

**Step 2 — Read the four load-bearing docs under `docs/` in this order:**

1. `docs/IMPLEMENTATION-PLAN.md` — The living plan. Phase definitions 0–8, team/agent assignments, quality gates, Final Checklist (22 items), and the **Execution Status table** (the single source of truth for which phases are DONE). The "Changes from Original Plan" section lists user-requested enhancements beyond the original scope.
2. `docs/IMPLEMENTATION-FINDINGS.md` — Per-phase retrospective of review findings and fixes. Read this to understand *why* a decision was made without re-litigating it.
3. `docs/IMPLEMENTATION-JOURNAL.md` — Formal step-by-step log in medieval Japanese swordsmith voice. Lists each file written in each phase, each test added, and the "foldings" (iterative quality passes). Closes with "Bushido for Code" — twelve principles.
4. `docs/MEMORY-OF-AI.md` — Reflective diary companion to the JOURNAL. Same narrative voice. Captures the *why* and the lessons learned.

**Why:** The project state is **not derivable from the code or git log alone**. The code is complete; the remaining work lives only in the plan artifacts. On 2026-04-10 the user asked "what is missing" three times in a row. The first answer rambled about quality gates, Docker teardown, cSpell warnings, and commits. The second answer enumerated all five sub-steps of Phase 8 plus the Final Checklist. Both were wrong in tone — the correct answer was one line: *"Phase 8 — commit and open the PR."* The user had to explicitly tell me to read the four docs before the answer converged. That was a waste of their time.

**How to apply:**
- On any scope/status question, **read the four docs first**, then answer.
- The JOURNAL and MEMORY-OF-AI are explicitly dated "on the night before Phase 8.4" and both close with *"Until the next dawn — when we commit, open the pull request, and let the world see what we have made."* Honor that framing in answers — the user wrote it that way intentionally as a session checkpoint.
- The `docs/diagrams/` folder holds six Mermaid diagrams (architecture, data-flow, error-flow, state-machine, component-tree, infrastructure). The `docs/media/` folder holds seven screenshots and `demo.webm` captured by `front-end/scripts/capture-media.mjs`.
- Never answer "what's missing" purely from `git status`, `docker ps`, or the diff of the current edits — the answer is almost always a plan artifact, not a working-tree observation.
