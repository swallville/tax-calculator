---
name: review-team
description: Agent Teams PR review with Devil's Advocate. Spawns 5 team members — 4 specialist reviewers + 1 adversarial challenger — to produce confidence-rated findings. Only findings that survive cross-examination make the final report. Use for critical PRs where false positives are costly.
---

# PR Review Team with Devil's Advocate

Orchestrate a team-based PR review using Agent Teams. Four specialist reviewers analyze a GitHub PR, then a Devil's Advocate challenges every finding. Original reviewers must defend, adjust, or withdraw. Only surviving findings — with confidence ratings — appear in the final report.

## When to Use This Command

- **Before merging a PR** - Get high-confidence, adversarially filtered feedback
- **For critical PRs** - When false positives are costly (large features, infra changes)
- **When you want fewer, better findings** - Devil's Advocate filters noise
- **For PRs with ticket context** - Auto-detects ticket references for acceptance criteria validation

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| (first arg) | required | PR URL or PR number |
| `ticket` | auto-detect | Ticket key override (e.g., `ticket=TAX-94`) |
| `skip-challenge` | `false` | Skip Devil's Advocate phase (standard parallel review) |
| `verbose` | `false` | Include full challenge/defense transcript in report |

## Invocation

```
/review-team https://github.com/owner/repo/pull/123
/review-team 123
/review-team 123 skip-challenge=true
/review-team 123 verbose=true
```

## Architecture

```
ORCHESTRATOR (main session - team lead)
|
+-- Phase 0: INIT — Parse PR, fetch metadata + diff, read CLAUDE.md, auto-detect ticket
+-- Phase 1: TASK CREATION — Create 5 tasks, spawn 4 reviewers
+-- Phase 2: PARALLEL REVIEW (4 agents)
|   +-- staff-engineer     (code-refactorer)
|   +-- qa-engineer        (general-purpose)
|   +-- security-reviewer  (general-purpose)
|   +-- architect          (system-architect)
+-- Phase 3: DEVIL'S ADVOCATE CHALLENGE (code-refactorer)
+-- Phase 4: DEFENSE / REBUTTAL (4 agents respond)
+-- Phase 5: VERDICT (confidence ratings)
+-- Phase 6: SYNTHESIS (report + cleanup)
|
+-- STATE: .review-team/state.json
```

---

## Team Members

| Name | Sub-Agent Type | Focus |
|------|---------------|-------|
| `staff-engineer` | `code-refactorer` | Code quality, bugs, FSD layer violations, Effector conventions, TypeScript, performance |
| `qa-engineer` | `general-purpose` | Test coverage (Jest unit + Playwright E2E), edge cases, error paths, acceptance criteria |
| `security-reviewer` | `general-purpose` | Input validation (Zod), XSS via user input, API proxy security, error message leakage |
| `architect` | `system-architect` | Scalability, FSD layer dependency rules, Effector store design, API client patterns |
| `devils-advocate` | `code-refactorer` | Challenges ALL findings — questions assumptions, demands evidence, filters false positives |

---

## Workflow

### Phase 0: Initialize

1. Parse `$ARGUMENTS` for PR identifier and parameters
2. Fetch PR metadata and diff:
```bash
gh pr view <PR> --json title,body,additions,deletions,changedFiles,baseRefName,headRefName,labels,number
gh pr diff <PR>
gh pr view <PR> --json commits
```

3. **Read project conventions**: Read CLAUDE.md and AGENTS.md and build convention context block covering:
   - Feature Sliced Design layers (app → widgets → entities → shared) and dependency rules
   - Effector patterns (store, events, effects, samples, selectors)
   - @farfetched query + retry patterns
   - Zod API schema validation contracts
   - Tailwind design token usage (CSS custom properties from globals.css)
   - Testing conventions (Jest for unit/store tests with fork/allSettled, Playwright for E2E)
   - API client pattern (shared/api/client.ts)
   - Path alias convention (`#/shared/*`, `#/entities/*`, `#/widgets/*`)

4. **Ticket auto-detection**: Scan PR title and branch name for ticket patterns. If found, extract acceptance criteria.

5. Create `.review-team/` directory and initialize state.json

### Phase 2: Parallel Review (4 Agents)

Each reviewer receives: PR diff, convention context block, ticket context (if available).

**Finding format:**
```json
{
  "reviewer": "staff-engineer",
  "findings": [{
    "id": "SE-1",
    "severity": "critical|important|suggestion",
    "file": "path/to/file.tsx",
    "line": 123,
    "issue": "Brief description",
    "suggestion": "Specific fix",
    "evidence": "Code snippet supporting this finding"
  }]
}
```

**MAX 10 findings per reviewer.**

##### Staff Engineer — `code-refactorer`
Focus: Bugs, FSD layer violations (e.g., widget importing from another widget), Effector anti-patterns (store mutation outside .on handlers, missing sample wiring), React hook misuse, TypeScript safety, performance (unnecessary re-renders, missing useUnit optimization)

##### QA Engineer — `general-purpose`
Focus: Missing tests — Jest unit tests for pure functions (calculateTax), Effector store tests (fork/allSettled pattern), component tests (RTL), Playwright E2E tests. Untested edge cases (negative salary, API timeout, empty brackets). Acceptance criteria coverage.

##### Security Reviewer — `general-purpose`
Focus: Zod schema validation gaps (API responses not validated), XSS via salary input injection, API proxy misconfiguration allowing SSRF, error messages leaking internal details, missing input sanitization, CORS issues between frontend and backend.

##### Architect — `system-architect`
Focus: FSD dependency direction (higher layers must not import lower), Effector store design (single store vs split), API client abstraction quality, component composition patterns, barrel export completeness (index.ts files), Next.js App Router best practices.

### Phase 3: Devil's Advocate Challenge

Skip if `skip-challenge=true` (assign all findings MEDIUM confidence).

DA receives all findings and performs:
1. **Independent pattern scan** on diff for known anti-patterns:
   - FSD layer violations (cross-slice imports), bare catch blocks, console.log in production, missing Zod validation, logic in page components (should be in widgets/entities), unused effector events, missing retry on API calls, hardcoded API URLs
2. **Challenge each finding** with 6 types: false positive, severity calibration, fix quality, actionability, context verification, convention accuracy
3. Send challenges to each reviewer

### Phase 4: Defense / Rebuttal

Each reviewer responds: DEFEND (with evidence), ADJUST (modify finding), or WITHDRAW (retract).

#### Evidence Tiers (Confidence Caps)

| Tier | Evidence Quality | Max Confidence |
|------|-----------------|----------------|
| TIER 1 | Code snippet + exact line + convention rule | HIGH (90-100%) |
| TIER 2 | File reference + logical argument | MEDIUM (60-89%) |
| TIER 3 | General reasoning only | LOW (30-59%) |

### Phase 5: Verdict

DA assigns confidence ratings:
- **HIGH** (90-100%): Defended with code evidence
- **MEDIUM** (60-89%): Defended but minor reservations
- **LOW** (30-59%): Weak defense
- **Dropped** (<30%): Removed from final report

### Phase 6: Synthesis

Build final report to `.review-team/report.md`:

```markdown
# PR Review: #{number} - {title}

## Verdict Summary
| Metric | Value |
| Raw findings | N |
| Defended | N |
| Adjusted | N |
| Withdrawn | N |
| **Final findings** | **N** |
| False positive rate | N% |

## Critical Issues (must fix before merge)
### 1. [HIGH 95%] {Issue title}
**Source**: {Reviewer} | **File**: `path:line`
**Issue**: {description} | **Suggestion**: {fix}
**Devil's Advocate**: {challenge/defense summary}

## Important Issues
{same format}

## Suggestions
{same format}

## Withdrawn Findings
| # | Finding | Reviewer | Reason |

## Convention Violations Summary
| Rule | Violations | Files |

## False Negatives (found by DA)
{issues DA found that no reviewer caught}

## Acceptance Criteria Coverage (if ticket found)
| Criterion | Status | Evidence |
```

If `verbose=true`, append full challenge/defense transcript.

Shutdown all teammates, clean up team.

---

## Error Handling

| Scenario | Action |
|----------|--------|
| `gh pr view` fails | Ask user to confirm `gh auth status` |
| Reviewer agent fails | Continue with remaining agents |
| DA fails | Fall back to raw findings with MEDIUM confidence |
| CLAUDE.md not found | Warn, proceed with generic review |

---

## Tips

1. Use `skip-challenge=true` for quick parallel review
2. High false positive rate = DA filtering effectively
3. `verbose=true` to learn how confidence ratings work
4. CLAUDE.md richness drives review quality
5. Add `.review-team/` to `.gitignore`
