import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServiceWorkerControllerChangeHandler } from '../js/core/public-page-resume.js';

function harness(initiallyControlled = false) {
  let controlled = initiallyControlled;
  let reloads = 0;
  const handler = createServiceWorkerControllerChangeHandler({
    isControlled: () => controlled,
    reload: () => { reloads += 1; }
  });
  return { handler, control: () => { controlled = true; }, reloads: () => reloads };
}

{
  const test = harness(false);
  assert.equal(test.handler(), 'uncontrolled');
  test.control();
  assert.equal(test.handler(), 'claimed-first-install');
  assert.equal(test.reloads(), 0, 'Første service-worker-overtagelse må ikke genindlæse en allerede startet side.');
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.handler(), 'ignored');
  assert.equal(test.reloads(), 1, 'En senere reel worker-opdatering må kun genindlæse én gang.');
}

{
  const test = harness(false);
  test.control();
  assert.equal(test.handler(), 'claimed-first-install');
  assert.equal(test.reloads(), 0, 'Den normale første controllerchange-hændelse efter claim må ikke genindlæse siden.');
}

{
  const test = harness(true);
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.reloads(), 1, 'En allerede styret side skal fortsat tage en reel opdatering i brug.');
}

const [app, worker] = await Promise.all([
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
]);

assert.doesNotMatch(app, /const manifestPromise=loadDataManifest\(\)/, 'Den afviste parallelle startgren må ikke være tilbage.');
assert.match(app, /projectPublicCoastlines\(await loadZones\(\)\)[\s\S]*const manifest=await loadDataManifest\(\)[\s\S]*const conditions=await loadConditions\(\{manifest\}\)/, 'Starten skal igen være prioriteret og sekventiel.');
assert.match(worker, /self\.clients\.claim\(\)/, 'Service workeren skal fortsat kunne overtage den første åbne side uden manuel reload.');
assert.doesNotMatch(worker, /assets\/about\/(?:jakob-|ravjagt-med-boern-)/, 'Store Om-billeder må ikke hentes under første service-worker-installation.');
assert.equal(worker.includes('`./data/zones.geojson?v=${APP_VERSION}`'), false, 'Kortfilen må ikke hentes igen under første service-worker-installation.');

console.log('Public cold start 4.0.303: sekventiel start, én første visning og let service-worker-installation består.');
