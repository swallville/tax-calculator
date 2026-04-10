@AGENTS.md

# Tax Calculator — Project Conventions

## Architecture
- **Feature Sliced Design**: app → widgets → entities → shared (never import upward)
- **State**: Effector stores + @farfetched queries/mutations with Zod contracts
- **Styling**: Tailwind 4 `className` utilities ONLY — no inline styles, no CSS modules, no `style={}` (exception: `animationDelay` for stagger)
- **Forms**: React 19 `useActionState` via `useCalculateAction` hook + Zod `safeParse`
- **Imports**: `#/` path aliases enforced by ESLint (`#/shared/*`, `#/entities/*`, `#/widgets/*`)

## Code Standards
- **SOLID**: Single responsibility per component/function/hook, dependency inversion via Effector events/stores
- **DRY**: Shared utilities in `#/shared/lib/`, no duplicate logic across widgets
- **KISS**: Simplest solution that works, no premature abstractions
- **Decouple**: Extract hooks, sub-components, constants. Each unit has one scope of responsibility
- **No hardcoded values**: Use constants (`VALID_YEARS`, `DEFAULT_YEAR`, `SKELETON_ROW_COUNT`)

## Tailwind 4 Rules
- Config is CSS-first: `globals.css` with `@import "tailwindcss"` + `@theme inline`
- Colors via auto-generated utilities from tokens: `bg-bg-card` (not `bg-[#241C32]`)
- No `@utility` directive (doesn't exist in v4) — use `@keyframes` + `animate-[name]`
- No `tailwind.config.ts` — everything in CSS
- **CRITICAL**: `postcss.config.mjs` must exist — without it Tailwind produces zero styles

## Quality Gate (after EVERY implementation phase)
```bash
npm run tsc:check && npm run lint && npm run analyse:circular && npm run test && npm run build && npm audit --audit-level=high
```

## Testing (three dimensions)
- **Happy paths**: Standard user flows work correctly
- **Edge cases**: Boundary values, extreme inputs, empty states (rate=0, rate=1, $999M salary, NaN, Infinity)
- **Failure scenarios**: Network errors, malformed JSON, invalid input, timeout
- **State consistency**: Multi-step event sequences verified with `assertStateConsistency()` — error + results must never coexist
- **Unit**: Jest + @swc/jest + RTL + jest-axe. Effector stores tested with `fork()` + `allSettled()`
- **E2E**: Playwright with Page Object Model (4 browser projects) + Gherkin/BDD via playwright-bdd
- **Validation**: Zod schemas tested for both API contracts and form input
- **Coverage**: 85% minimum enforced in `jest.config.ts` coverageThreshold
- **Selectors**: Prefer `getByTestId` for structure checks, `getByLabelText`/`getByRole` for accessibility semantics. AVOID `getByText(exactString)` — fragile to copy changes. POM uses testid as primary locator.

## Accessibility (WCAG 2.2 AA — enforced in quality gate)
- **Persistent live regions**: `aria-live` and `role="alert"` containers must pre-exist in the DOM at page load (NVDA/JAWS do not reliably announce dynamically mounted elements)
- **Form a11y**: `aria-required`, `aria-invalid`, `aria-describedby` linking to error messages
- **Semantic HTML**: `<th scope="col">`, `<th scope="row">`, `aria-hidden="true"` on spacer/decorative elements
- **aria-labelledby over aria-label**: Link section landmarks to their visible headings via id
- **Color blindness (1.4.1)**: Color must NEVER be the only signal — every colored state also has icon + text label + ARIA attribute. Test via Chrome DevTools → Rendering → Emulate vision deficiencies
- **Screen reader testing**: jest-axe + Playwright a11y specs + manual VoiceOver/NVDA validation
- **Cross-browser a11y**: E2E must run on all 4 browsers (`npx playwright test`) — WebKit/Firefox/Mobile have different tab/focus behaviors
- **Full reference**: `docs/ACCESSIBILITY.md`

## Cross-Browser Testing
- Quality gate runs E2E on **all 4 projects**: chromium, firefox, webkit, mobile-chrome
- WebKit disables `<select>` tab focus by default (macOS "Full Keyboard Access" setting) — cross-browser E2E must not assume Chromium behavior
- Use `.focus()` directly in E2E tests when testing focusability; branch on `browserName` for Tab chain tests
- `npm run test:e2e:chromium` is for fast dev feedback — `npx playwright test` is the gate

## Salary PII Handling
- Salary value NEVER leaves the browser — only `year` is sent to backend
- `parseCurrency()` in SalaryInput strips `$`, `,`, spaces → validated by Zod
- `calculateTax(salary, brackets)` runs client-side in `samples.ts`
- Logger `redact: ['salary', '*.salary']` blocks accidental logging
- `StoresPersistence` sanitizes `salary: 0` before localStorage write

## Custom Hooks (widgets/tax-calculator/lib/)
- `useCalculateAction` — form action: parseCurrency → Zod → dispatch
- `useCalculatorState` — derived display state: isPending/hasResults/hasError
- `useRetryCalculation` — stable retry callback from stored salary+year

## Logging
- **Pino** for structured logging — NEVER log salary amounts (PII)
- `redact: ['salary', '*.salary']` configured at logger level
- Log: API calls, retry attempts, errors, calculation results (total + rate only)

## Critical Config Files (NEVER delete)
- `postcss.config.mjs` — Tailwind 4 processing (deletion breaks ALL styling)
- `next.config.ts` — Proxy, security headers, build config
- `tsconfig.json` — TypeScript with `#/` path aliases
- `jest.config.ts` — Testing with 85% coverage threshold
- `eslint.config.mjs` — Linting with FSD import rules
- `playwright.config.ts` — E2E with Docker webServer

## Development Workflow
Follow `.claude/WORKFLOW.md` for the 7-step cycle: Implement → Test → Quality Gate → Update Docs → Update Memory → Rebuild → Review

## Documentation
- Implementation plan: `docs/IMPLEMENTATION-PLAN.md`
- Architecture: `docs/ARCHITECTURE.md`
- Design system: `docs/DESIGN-SYSTEM-GUIDE.md`
- Routes: `docs/ROUTES.md`
- Onboarding: `docs/ONBOARDING.md`
- Findings: `docs/IMPLEMENTATION-FINDINGS.md`
- Diagrams: `docs/diagrams/` (6 Mermaid diagrams)
- Linked READMEs in every `src/` directory

## Visual Reference (additional context)
Screenshots and a demo video of the running application live in `docs/media/`. They are embedded at the top of `front-end/README.md` and can be regenerated with `node front-end/scripts/capture-media.mjs` while the Docker stack is up on port 3000.

### Screenshots
- `docs/media/01-initial.png` — empty state on load: form card on the left (`$` placeholder, year `2022`, Calculate button), empty-state illustration with "Enter your salary" copy on the right
- `docs/media/02-form-filled.png` — form populated with `$85000` / `2022`, just before submission
- `docs/media/03-results.png` — successful calculation for `$85,000 / 2022`: five-row bracket breakdown table, `Total Tax $14,664.17`, `Effective Rate 17.25%`
- `docs/media/04-results-closeup.png` — viewport-cropped results panel used for pixel inspection
- `docs/media/05-validation-error.png` — salary cleared and submitted: `Please enter a valid number` inline error wired via `aria-describedby`, previous successful results remain visible in the right panel (proves the state machine keeps results + form error independent, not the forbidden `error + results` state)
- `docs/media/06-results-2021.png` — `$150,000 / 2021` calculation to show a different year's bracket data flowing through the same pipeline
- `docs/media/07-mobile-initial.png` — Pixel 5 / iPhone-class viewport (390×844): form stacks above the empty state, Tailwind breakpoints collapse the two-column layout to one

### Demo video
- `docs/media/demo.webm` (~1.2 MB, 1440×900) — single continuous Playwright-recorded walkthrough of the full happy-path + validation flow covering every screenshot above in sequence

### Capture script
- `front-end/scripts/capture-media.mjs` — standalone Playwright script (uses the `playwright` library directly, not the test runner) that walks the widget, handles the backend's 25% random 500 failure rate via a retry loop against `data-testid="retry-button"`, writes the seven PNGs and `demo.webm`, and cleans up the temp video directory on exit
