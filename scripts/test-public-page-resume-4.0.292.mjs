import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPublicPageResumeHandler } from '../js/core/public-page-resume.js';

function harness(overrides = {}) {
  let detailsReady = overrides.detailsReady ?? true;
  let reloads = 0;
  let resumes = 0;
  const handler = createPublicPageResumeHandler({
    isCoreReady: () => overrides.coreReady ?? true,
    detailsRequired: () => overrides.detailsRequired ?? true,
    isDetailsReady: () => detailsReady,
    waitForDetails: overrides.waitForDetails || (() => Promise.resolve()),
    resume: overrides.resume || (async () => { resumes += 1; }),
    reload: () => { reloads += 1; },
    timeoutMs: 1,
    setTimer: overrides.setTimer || (callback => { callback(); return 1; }),
    clearTimer: () => {}
  });
  return { handler, setDetailsReady:value=>{detailsReady=value;}, counts:()=>({reloads,resumes}) };
}

{
  const test = harness({detailsReady:false,detailsRequired:false});
  assert.equal(await test.handler({persisted:true}), 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  const test = harness();
  assert.equal(await test.handler({persisted:false}), 'ignored');
  assert.deepEqual(test.counts(), {reloads:0,resumes:0});
}

{
  const test = harness({coreReady:false});
  assert.equal(await test.handler({persisted:true}), 'reloaded');
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

{
  const test = harness();
  assert.equal(await test.handler({persisted:true}), 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  let releaseWait;
  const waitForDetails = new Promise(resolve => { releaseWait=resolve; });
  const test = harness({detailsReady:false,waitForDetails:()=>waitForDetails,setTimer:()=>99});
  const first = test.handler({persisted:true});
  const second = test.handler({persisted:true});
  test.setDetailsReady(true);
  releaseWait();
  assert.equal(await first, 'resumed');
  assert.equal(await second, 'resumed');
  assert.deepEqual(test.counts(), {reloads:0,resumes:1});
}

{
  const test = harness({detailsReady:false});
  assert.equal(await test.handler({persisted:true}), 'reloaded');
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

{
  const test = harness({resume:async()=>{throw new Error('simuleret genoptegningsfejl');}});
  const originalConsoleError=console.error;
  console.error=()=>{};
  try { assert.equal(await test.handler({persisted:true}), 'reloaded'); }
  finally { console.error=originalConsoleError; }
  assert.deepEqual(test.counts(), {reloads:1,resumes:0});
}

const bootstrap=await fs.readFile('bootstrap.js','utf8');
const earlyGuard=bootstrap.indexOf("addEventListener('pageshow'");
const storageAwait=bootstrap.indexOf('await initializeUserDataSafety()');
assert.ok(earlyGuard>=0&&earlyGuard<storageAwait,'Bootstrapværnet skal være installeret før første asynkrone opstartstrin.');
assert.match(bootstrap,/event\.persisted && !appImported/);
assert.doesNotMatch(bootstrap,/createPublicPageReturnWatchdog|matchMedia|max-width: 900px|ravradarResume/);

const app=await fs.readFile('app.js','utf8');
assert.match(app,/createPublicPageResumeHandler/);
assert.match(app,/isCoreReady:\(\)=>coreViewReady&&Boolean\(state\.zoneLayer&&state\.zones\)/);
assert.match(app,/detailsRequired:\(\)=>conditionDetailsPromise!==null/);
assert.match(app,/isDetailsReady:\(\)=>conditionDetailsReady/);
assert.match(app,/map\.invalidateSize\(\{pan:false\}\)/);
assert.match(app,/renderRanking\(\);renderSelectedZone\(\);[\s\S]*await renderNationalForecast\(\)/);
assert.doesNotMatch(app,/publicViewHealthy|ravradarResume/);

console.log('OK: Safari/bfcache-genoptagelse genoptegner en færdig forside og genindlæser kun efter en afbrudt opstart.');
