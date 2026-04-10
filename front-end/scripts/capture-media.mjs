// Standalone Playwright script that walks through the tax calculator,
// captures screenshots, and records a short demo video.
//
// Run with: node scripts/capture-media.mjs
// Requires the Docker stack to be up (docker compose up -d).

import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = resolve(__dirname, "../../docs/media");
const VIDEO_TMP = resolve(__dirname, "../../docs/media/.video-tmp");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function waitForReady(label, locator, timeout = 30_000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
  } catch (err) {
    throw new Error(`Timed out waiting for ${label}: ${err.message}`);
  }
}

async function main() {
  await mkdir(MEDIA_DIR, { recursive: true });
  await rm(VIDEO_TMP, { recursive: true, force: true });
  await mkdir(VIDEO_TMP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: VIDEO_TMP,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  console.log("→ navigating to", BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForReady("empty state", page.getByTestId("empty-state"), 15_000);

  // 1. Initial empty state
  await page.waitForTimeout(600);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "01-initial.png"),
    fullPage: true,
  });
  console.log("✓ 01-initial.png");

  // 2. Form filled, before click (slow fill for the video)
  await page.getByTestId("salary-input").click();
  await page.getByTestId("salary-input").pressSequentially("85000", { delay: 80 });
  await page.getByTestId("year-select").selectOption("2022");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "02-form-filled.png"),
    fullPage: true,
  });
  console.log("✓ 02-form-filled.png");

  // 3. Click and wait for success (with retry loop for the backend 25% 500 rate)
  const calcBtn = page.getByTestId("calculate-button");
  const results = page.getByTestId("tax-breakdown");
  const errorState = page.getByTestId("error-state");
  const retryBtn = page.getByTestId("retry-button");

  await calcBtn.click();

  let gotResults = false;
  for (let attempt = 1; attempt <= 6 && !gotResults; attempt++) {
    const winner = await Promise.race([
      results
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "results")
        .catch(() => null),
      errorState
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "error")
        .catch(() => null),
    ]);
    if (winner === "results") {
      gotResults = true;
    } else if (winner === "error") {
      console.log(`  attempt ${attempt}: backend 500, retrying…`);
      await retryBtn.click().catch(() => {});
    } else {
      throw new Error("Neither results nor error appeared");
    }
  }
  if (!gotResults) throw new Error("Results never appeared");

  await page.waitForTimeout(1000);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "03-results.png"),
    fullPage: true,
  });
  console.log("✓ 03-results.png");

  // 4. Results panel close-up (viewport, not full page)
  await page.getByTestId("results-panel").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "04-results-closeup.png"),
    fullPage: false,
  });
  console.log("✓ 04-results-closeup.png");

  // 5. Error state — empty salary triggers form validation error
  await page.getByTestId("salary-input").fill("");
  await page.getByTestId("salary-input").blur().catch(() => {});
  await calcBtn.click();
  await page
    .getByTestId("salary-error")
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "05-validation-error.png"),
    fullPage: true,
  });
  console.log("✓ 05-validation-error.png");

  // 6. A different year for variety
  await page.getByTestId("salary-input").fill("150000");
  await page.getByTestId("year-select").selectOption("2021");
  await calcBtn.click();
  let gotResults2 = false;
  for (let attempt = 1; attempt <= 6 && !gotResults2; attempt++) {
    const winner = await Promise.race([
      results
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "results")
        .catch(() => null),
      errorState
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "error")
        .catch(() => null),
    ]);
    if (winner === "results") gotResults2 = true;
    else if (winner === "error") {
      console.log(`  attempt ${attempt}: backend 500, retrying…`);
      await retryBtn.click().catch(() => {});
    } else throw new Error("Neither results nor error appeared");
  }
  if (!gotResults2) throw new Error("Second calc never produced results");

  await page.waitForTimeout(1500);
  await page.screenshot({
    path: resolve(MEDIA_DIR, "06-results-2021.png"),
    fullPage: true,
  });
  console.log("✓ 06-results-2021.png");

  // Mobile viewport screenshot
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
  await mobilePage
    .getByTestId("empty-state")
    .waitFor({ state: "visible", timeout: 15_000 });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({
    path: resolve(MEDIA_DIR, "07-mobile-initial.png"),
    fullPage: true,
  });
  console.log("✓ 07-mobile-initial.png");
  await mobileContext.close();

  // Close the main context so the video is flushed to disk
  await page.close();
  await context.close();
  await browser.close();

  // Playwright writes a random-named .webm — move it to a stable name
  const entries = await readdir(VIDEO_TMP);
  const webm = entries.find((f) => f.endsWith(".webm"));
  if (webm) {
    const dest = resolve(MEDIA_DIR, "demo.webm");
    await rename(resolve(VIDEO_TMP, webm), dest);
    console.log("✓ demo.webm");
  } else {
    console.warn("⚠  no .webm found in", VIDEO_TMP);
  }
  await rm(VIDEO_TMP, { recursive: true, force: true });

  console.log("\nAll media saved to:", MEDIA_DIR);
}

main().catch((err) => {
  console.error("capture-media failed:", err);
  process.exit(1);
});
