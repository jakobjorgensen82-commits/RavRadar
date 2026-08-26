import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  throw new Error('Playwright er ikke tilgaengelig. Koer runneren i Codex-runtime eller installer Playwright lokalt.', { cause: error });
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveUrl = 'https://jakobjorgensen82-commits.github.io/RavRadar/';
const expectedVersion = process.env.RAVRADAR_EXPECTED_VERSION || '4.0.238';
const chromePath = process.env.RAVRADAR_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(chromePath)) {
  throw new Error(`Chrome blev ikke fundet paa ${chromePath}. Saet RAVRADAR_CHROME til den installerede binær.`);
}

const pythonAudit = fs.readFileSync(path.join(root, 'scripts/audit-online-browser-4.0.238.py'), 'utf8');
const injectionMatch = pythonAudit.match(/DEBUG_INJECTION = r"""([\s\S]*?)"""/);
if (!injectionMatch) throw new Error('Kan ikke udlaese browserkontrollen fra Pyppeteer-scriptet.');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const injectedApp = `${appSource}\n${injectionMatch[1]}`;

const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
console.error('Playwright-browseraudit: starter system-Chrome');
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

try {
  const page = await browser.newPage();
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('response', response => {
    if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() });
  });
  await page.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/app.js')) {
      await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: injectedApp });
      return;
    }
    await route.continue();
  });

  await page.goto(liveUrl, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForFunction(
    () => window.__ravradarOnlineAudit
      && window.__ravradarOnlineAudit.state().conditionsZones === 210
      && window.__ravradarOnlineAudit.state().detailsAvailable,
    null,
    { timeout: 90_000 },
  );
  console.error('Playwright-browseraudit: live-data klar');

  const state = await page.evaluate(() => window.__ravradarOnlineAudit.state());
  const zoneIds = await page.evaluate(() => window.__ravradarOnlineAudit.zoneIds());
  const totals = { currentViews: 0, forecastViews: 0, partReferences: 0 };
  for (const mode of ['waders', 'beach']) {
    await page.evaluate(value => window.__ravradarOnlineAudit.setMode(value), mode);
    for (let index = 0; index < zoneIds.length; index += 1) {
      const zoneId = zoneIds[index];
      if (index === 0 || (index + 1) % 10 === 0 || index + 1 === zoneIds.length) {
        console.error(`Playwright-browseraudit ${mode}: zone ${index + 1}/${zoneIds.length} (${zoneId})`);
      }
      const checked = await page.evaluate(id => window.__ravradarOnlineAudit.checkZone(id), zoneId);
      totals.currentViews += 1;
      totals.forecastViews += checked.days;
      if (mode === 'waders') totals.partReferences += checked.parts;
    }
  }

  const failures = await page.evaluate(() => window.__ravradarOnlineAudit.failures());
  const failureKinds = {};
  for (const failure of failures) {
    const kind = failure.kind || 'unknown';
    failureKinds[kind] = (failureKinds[kind] || 0) + 1;
  }
  const result = {
    liveUrl,
    expectedVersion,
    runner: 'playwright-system-chrome',
    state,
    zoneCount: zoneIds.length,
    totals,
    failureCount: failures.length,
    failureKinds,
    failures: failures.slice(0, 200),
    consoleErrors,
    pageErrors,
    httpErrors,
  };
  console.log(JSON.stringify(result, null, 2));
  const expected = { currentViews: 420, forecastViews: 2100, partReferences: 673 };
  if (state.version !== expectedVersion
    || zoneIds.length !== 210
    || !Number.isFinite(state.activeZoneCount)
    || state.activeZoneCount <= 0
    || JSON.stringify(totals) !== JSON.stringify(expected)
    || failures.length
    || pageErrors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
