import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const allRequests = [];
const allMessages = [];

page.on('console', msg => {
  allMessages.push(`[console.${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', err => {
  allMessages.push(`[pageerror] ${err.message}`);
});
page.on('requestfailed', req => {
  allMessages.push(
    `[requestfailed] ${req.url()} — ${req.failure()?.errorText}`,
  );
});
page.on('request', req => {
  allRequests.push(`${req.method()} ${req.url()}`);
});
page.on('response', async res => {
  const url = res.url();
  if (url.includes('.woff') || url.includes('font')) {
    const headers = res.headers();
    allMessages.push(
      `[font-response] ${res.status()} ${url}\n  cache=${headers['cache-control']}\n  cors=${headers['access-control-allow-origin'] ?? '(none)'}\n  corp=${headers['cross-origin-resource-policy'] ?? '(none)'}`,
    );
  }
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('=== console + errors ===');
if (allMessages.length === 0) {
  console.log('(none)');
} else {
  allMessages.forEach(m => console.log(m));
}

console.log('\n=== font-related requests ===');
const fontReqs = allRequests.filter(
  r => r.includes('font') || r.includes('woff'),
);
if (fontReqs.length === 0) console.log('(none)');
else fontReqs.forEach(r => console.log(r));

await browser.close();
