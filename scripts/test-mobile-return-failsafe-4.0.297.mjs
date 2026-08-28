import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  createPublicPageResumeHandler,
  createPublicPageReturnWatchdog,
} from '../js/core/public-page-resume.js';

function watchdogHarness(overrides = {}) {
  let reloads = 0;
  let pending = 0;
  let timerCallback = null;
  const handler = createPublicPageReturnWatchdog({
    isAppImported:()=>overrides.appImported ?? true,
    shouldReloadImmediately:()=>overrides.mobile ?? false,
    markPending:()=>{pending += 1;},
    isResumeHealthy:()=>overrides.healthy ?? false,
    reload:()=>{reloads += 1;},
    setTimer:callback=>{timerCallback=callback;return 17;},
    clearTimer:()=>{},
  });
  return {handler,fireTimer:()=>timerCallback?.(),counts:()=>({reloads,pending})};
}

{
  const test=watchdogHarness({mobile:true});
  assert.equal(test.handler({persisted:true}),'reloaded');
  assert.deepEqual(test.counts(),{reloads:1,pending:1});
}

{
  const test=watchdogHarness({appImported:false});
  assert.equal(test.handler({persisted:true}),'reloaded');
  assert.deepEqual(test.counts(),{reloads:1,pending:1});
}

{
  const test=watchdogHarness({healthy:true});
  assert.equal(test.handler({persisted:true}),'watching');
  test.fireTimer();
  assert.deepEqual(test.counts(),{reloads:0,pending:1});
}

{
  const test=watchdogHarness({healthy:false});
  assert.equal(test.handler({persisted:true}),'watching');
  test.fireTimer();
  assert.deepEqual(test.counts(),{reloads:1,pending:1});
}

{
  let reloads=0;
  const handler=createPublicPageResumeHandler({
    isCoreReady:()=>true,
    detailsRequired:()=>false,
    isDetailsReady:()=>false,
    waitForDetails:()=>Promise.resolve(),
    resume:()=>Promise.resolve(),
    isViewHealthy:()=>false,
    reload:()=>{reloads += 1;},
  });
  assert.equal(await handler({persisted:true}),'reloaded');
  assert.equal(reloads,1);
}

const bootstrap=await fs.readFile('bootstrap.js','utf8');
assert.match(bootstrap,/createPublicPageReturnWatchdog/);
assert.match(bootstrap,/max-width: 900px/);
assert.match(bootstrap,/ravradarResume='pending'/);

const app=await fs.readFile('app.js','utf8');
assert.match(app,/isViewHealthy:publicViewHealthy/);
assert.match(app,/ravradarResume='ready'/);
assert.match(app,/leaflet-map-pane/);
assert.match(app,/national-day-tabs/);

console.log('OK: mobil retur genindlæser straks fra bfcache, mens desktopretur har et DOM-bundet watchdog-fallback.');
