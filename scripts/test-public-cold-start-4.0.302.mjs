import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServiceWorkerControllerChangeHandler } from '../js/core/public-page-resume.js';

function serviceWorkerHarness(initiallyControlled) {
  let controlled = initiallyControlled;
  let reloads = 0;
  const handler = createServiceWorkerControllerChangeHandler({
    isControlled: () => controlled,
    reload: () => { reloads += 1; },
  });
  return {
    handler,
    setControlled: value => { controlled = value; },
    reloads: () => reloads,
  };
}

{
  const test = serviceWorkerHarness(false);
  assert.equal(test.handler(), 'uncontrolled');
  test.setControlled(true);
  assert.equal(test.handler(), 'claimed-first-install');
  assert.equal(test.reloads(), 0, 'Første service-worker-installation må ikke genindlæse siden.');
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.handler(), 'ignored');
  assert.equal(test.reloads(), 1, 'En efterfølgende controlleropdatering genindlæser højst én gang.');
}

{
  const test = serviceWorkerHarness(true);
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.handler(), 'ignored');
  assert.equal(test.reloads(), 1, 'En side med eksisterende controller skal stadig overtage en ny version sikkert.');
}

const [app, serviceWorker] = await Promise.all([
  fs.readFile('app.js', 'utf8'),
  fs.readFile('service-worker.js', 'utf8'),
]);

assert.match(serviceWorker, /self\.clients\.claim\(\)/, 'Service workeren skal fortsat overtage åbne klienter.');
assert.match(app, /createServiceWorkerControllerChangeHandler/);
assert.doesNotMatch(app, /controllerchange[\s\S]{0,120}location\.reload\(\)/, 'Controllerchange må ikke længere genindlæse ubetinget.');

const manifestStart = app.indexOf('const manifestPromise=loadDataManifest()');
const conditionsStart = app.indexOf('const conditionsPromise=manifestPromise.then');
const zonesAwait = app.indexOf('projectPublicCoastlines(await loadZones())');
const manifestAwait = app.indexOf('const manifest=await manifestPromise');
const conditionsAwait = app.indexOf('const conditions=await conditionsPromise');
assert.ok(manifestStart >= 0 && conditionsStart > manifestStart && zonesAwait > conditionsStart,
  'Manifest og prognosestart skal begynde før den tunge kystdelsgren afventes.');
assert.ok(manifestAwait > zonesAwait && conditionsAwait > manifestAwait,
  'Den synlige initialiseringsrækkefølge skal fortsat være zoner, manifest og prognoser.');
assert.doesNotMatch(app, /await loadDataManifest\(\)/);
assert.doesNotMatch(app, /await loadConditions\(\{manifest\}\)/);

console.log('Public cold start 4.0.302: første claim genindlæser ikke, opdateringer gør, og startgrenene hentes parallelt.');
