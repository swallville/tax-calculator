---
name: concise-answers-one-concrete-action
description: On scope/status questions, lead with the single concrete next action. Do not enumerate sub-steps, checklists, or caveats unless asked.
type: feedback
---

**Lead every scope/status answer with ONE concrete next action. Do not dump the full enumeration.**

**Why:** On 2026-04-10, when asked "what's missing" in this repo, I produced three progressively-closer answers: first a ramble about quality gates + Docker teardown + commits + cSpell warnings, then a five-sub-step Phase 8 enumeration with a 22-item Final Checklist, and finally the correct one-line answer: *"Phase 8 — commit and open the PR."* The user visibly lost patience between the second and third answer. Enumeration-first looks thorough but reads as evasion when the user already knows the plan and wants you to point at the specific next thing.

**How to apply:**
- **Lead sentence = the single action.** "Phase 8 — commit and open the PR." Not "There are several outstanding items including 8.1, 8.2, 8.3..."
- **Do not list sub-steps unless the user asks.** Offer to walk through them: *"Want me to break down the sub-steps?"*
- **Cut hedging.** No "technically there are a few things you could do", no preamble, no recap of what the user already knows.
- **Do not restate the question.** Jump straight to the answer.
- **If the answer is "nothing is missing" or "we're done", say that in one sentence** and stop.
- **Caveats and nuance come after the headline**, if at all. A brief "one thing worth flagging:" footnote is acceptable; a parallel-structured list of equal-weight items is not.
- Be willing to be wrong and get corrected once, rather than covering every base to avoid being wrong. The user will tell you if the headline is wrong — that's cheaper than forcing them to parse an exhaustive list.
