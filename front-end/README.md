# front-end/

Next.js 16 + React 19 frontend for the Tax Calculator. The full project
overview, quick-start, architecture, and documentation index live in the
[root README](../README.md).

---

## TL;DR

```bash
# From this directory
npm install
npm run dev       # http://localhost:3000 (expects backend on :5001)
```

Or from the repo root, run the full stack in Docker:

```bash
docker compose up
```

---

## Layout

```
src/
  app/            Next.js App Router — layout, page, globals.css, OG image, store persistence
  widgets/        Composed feature UI (tax-calculator)
  entities/       Business domain models (tax-brackets: Effector stores, events, effects)
  shared/         Reusable utilities — API client, logger, format helpers, test utils
e2e/              Playwright E2E tests (chromium, firefox, webkit, mobile-chrome)
scripts/          Standalone scripts (capture-media.mjs)
public/           Static assets
```

Each `src/` directory has its own `README.md` describing its contents and the
Feature Sliced Design import rules that apply. Start at
[src/README.md](src/README.md).

---

## Key scripts

| Script              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                                 |
| `npm run build`     | Production build (standalone output)                       |
| `npm start`         | Serve the production build                                 |
| `npm test`          | Jest unit tests                                            |
| `npm run test:e2e`  | Playwright E2E across all 4 browser projects               |
| `npm run lint`      | ESLint with FSD layer enforcement                          |
| `npm run tsc:check` | TypeScript type check                                      |
| `npm run validate`  | Local quality gate (format + lint + tsc + circular + test) |

See the root README for the full scripts reference, testing guide, Docker
topology, and contribution rules.

---

## Where to look next

- [../README.md](../README.md) — root README (full documentation index)
- [src/README.md](src/README.md) — FSD layer overview and import rules
- [e2e/README.md](e2e/README.md) — E2E test guide (POMs, Gherkin/BDD)
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — architecture deep dive
- [../docs/ONBOARDING.md](../docs/ONBOARDING.md) — new-developer onboarding
