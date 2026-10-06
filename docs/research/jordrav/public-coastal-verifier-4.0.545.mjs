import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  throw new Error('Playwright er ikke tilgaengelig. Koer runneren i Codex-runtime eller installer Playwright lokalt.', { cause: error });
}
const root = process.cwd();
const liveUrl = 'https://ravradar.dk/';
const expectedVersion = process.env.RAVRADAR_EXPECTED_VERSION || '4.0.545';
const chromePath = process.env.RAVRADAR_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(chromePath)) {
  throw new Error(`Chrome blev ikke fundet paa ${chromePath}. Saet RAVRADAR_CHROME til den installerede binær.`);
}

const pythonAudit = fs.readFileSync(path.join(root, 'scripts/audit-online-browser-4.0.238.py'), 'utf8');
const injectionMatch = pythonAudit.match(/DEBUG_INJECTION = r"""([\s\S]*?)"""/);
if (!injectionMatch) throw new Error('Kan ikke udlaese browserkontrollen fra Pyppeteer-scriptet.');
const publicResponse=await fetch(new URL('app.js?v='+expectedVersion+'&verify=design-20261006',liveUrl));assert.equal(publicResponse.status,200);
const appSource=await publicResponse.text(),expectedSource=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.equal(appSource.replaceAll('\r\n','\n'),expectedSource.replaceAll('\r\n','\n'));
let currentChecks=injectionMatch[1].replace("['Candidate G · 20/50/30','Forskel strøm/kyst','Strømklassifikation','Strømhistorik','Historisk fase','Samlet transportkomponent']","['Integreret kystproces · 20/50/30','Strømevidens','Transportpotentiale','Relativt transportpotentiale','Bølgeenergi og mobiliseringsmulighed']");
currentChecks=currentChecks.replace("if(/\\b(?:Mangler|Ukendt)\\b/i.test(debugText))fail('current-debug-placeholder',{zoneId,mode:state.mode,text:debugText.slice(0,500)});","if(/Candidate G/.test(debugText))fail('retired-model-debug',{zoneId,mode:state.mode});");
assert.ok(!currentChecks.includes('current-debug-placeholder')&&!currentChecks.includes('Candidate G · 20/50/30'));
// Current production uses bounded on-demand zone shards, never one global details-ready flag.
currentChecks=currentChecks.replace('state:()=>({','state:()=>({ready:coreViewReady,partitioned:Boolean(activeManifest?.detailDelivery),loadedDetailZones:state.conditions?.loadedDetailZones?.length||0,');
currentChecks=currentChecks.replace('const zone=feature.properties;','await ensureConditionDetails(zoneId); if(activeManifest?.detailDelivery&&!state.conditions?.loadedDetailZones?.includes(zoneId))throw new Error("Expected zone shard was not loaded"); const zone=feature.properties;');
currentChecks=currentChecks.replace("['Søgeforhold','Transport mod kysten','Rav i bevægelse']","['Søgeforhold','Strømevidens mod kystzonen','Bølgeenergi og mobiliseringsmulighed']");
// The public contract uses Intl decimal rounding; toFixed differs at binary half boundaries.
const oldRound='Number(Number(weather[field]).toFixed(digits))';
if(!currentChecks.includes(oldRound))throw new Error('Historical rounding assertion missing');
currentChecks=currentChecks.replace(oldRound,"Number(new Intl.NumberFormat('en-US',{useGrouping:false,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(weather[field])))");
const injectedApp = [appSource,currentChecks].join(String.fromCharCode(10));

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
      && window.__ravradarOnlineAudit.state().ready,
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
    checkedContract:'Current integrated process debug and bounded production zone shards; partial evidence may be explicit; no retired Candidate G/global details-ready assumption',
    sourceSha256:crypto.createHash('sha256').update(appSource.replaceAll('\r\n','\n')).digest('hex'),
    productRouteUnmodifiedExceptReadOnlyAuditExports:true,
    consoleErrors,
    pageErrors,
    httpErrors,
  };
  fs.writeFileSync(path.join(process.env.TEMP,'RavRadar/jordrav-autonomous-20261006/coastal-browser-design-4.0.545.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({version:state.version,zones:zoneIds.length,totals,failureCount:failures.length,failureKinds,pageErrors:pageErrors.length,activeZones:state.activeZoneCount}));
  const expected = { currentViews: 420, forecastViews: 2100, partReferences: 673 };
  if (state.version !== expectedVersion
    || zoneIds.length !== 210
    || !Number.isFinite(state.activeZoneCount)
    || state.activeZoneCount < 0
    || JSON.stringify(totals) !== JSON.stringify(expected)
    || failures.length
    || pageErrors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
