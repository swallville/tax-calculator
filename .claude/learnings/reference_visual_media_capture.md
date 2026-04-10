---
name: visual-media-capture-pattern
description: How to capture app screenshots and a demo video for documentation — standalone Playwright script against the running Docker stack
type: reference
---

When the user asks for screenshots or a demo video of the running application, use a **standalone Playwright script** (the `playwright` library directly, not `@playwright/test`) against the running Docker stack. The reference implementation lives at `front-end/scripts/capture-media.mjs` and writes output to `docs/media/`.

**Prerequisites:**
1. Docker stack must be up. Start in background with `docker compose up -d --wait` from the repo root. Health check: `curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000` returns 200.
2. The script imports `chromium` from the `playwright` package (already installed via `@playwright/test`).

**Key patterns the script uses:**
- **Viewport 1440×900 at 2× DPR** for desktop screenshots; a second mobile context at **390×844 with `isMobile: true`** for mobile shots.
- **Video recording** via `context = browser.newContext({ recordVideo: { dir, size } })`. Playwright writes a random-named `.webm` — move it to a stable name (`demo.webm`) after closing the context (which is what flushes the file to disk). A temp directory under `docs/media/.video-tmp` keeps the rename clean.
- **Retry loop for the backend's 25% random 500 rate:** `Promise.race([results.waitFor(), errorState.waitFor()])` — if `errorState` wins, click `retry-button` and loop. Six attempts max. Do not trust a single calculate click to succeed.
- **Testid-first selectors** match the POM strategy: `page.getByTestId("salary-input")`, `"year-select"`, `"calculate-button"`, `"tax-breakdown"`, `"error-state"`, `"retry-button"`, `"empty-state"`.
- **pressSequentially with delay for the video**, so the typing is visible in the recording: `salaryInput.pressSequentially("85000", { delay: 80 })`. Plain `.fill()` is instantaneous and reads as a jump cut on video.
- **Form auto-reset after submission** — React 19 `useActionState` resets uncontrolled inputs after the action resolves. This is visible in the post-calculate screenshots (salary field shows placeholder). Document it as expected behavior, not a capture glitch.

**Capture sequence (keep it documentary, not a test suite):**
1. Empty state on load
2. Form filled (slow `pressSequentially` for the video)
3. Calculate → retry loop → results ($85,000 / 2022)
4. Results close-up (viewport crop, not full page)
5. Clear salary → click calculate → validation error (proves results + form error can coexist without violating the store invariant)
6. Different salary + year combo ($150,000 / 2021) for variety
7. Mobile viewport of the empty state

**Run it:**
```bash
# From front-end/, with Docker stack up on :3000
node scripts/capture-media.mjs
```

**Commit policy:** The captured PNGs and `.webm` live in `docs/media/`. Ask the user before committing — the decision is whether they're checked-in documentation assets or gitignored with the capture script as source of truth.

**Embed in docs:** Use a Markdown table grid in `front-end/README.md` with `../docs/media/*.png` relative paths (because `docs/` is at the repo root, not inside `front-end/`). GitHub does not render `.webm` inline in a README, so link the video file rather than trying to embed it.
