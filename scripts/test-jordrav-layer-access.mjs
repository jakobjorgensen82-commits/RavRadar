import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { layerAccessPlan, LAYER_ACCESS_KINDS } from '../js/jordrav/layer-access.js';
import { DATA_BASE, MANIFEST_SHA256 } from '../js/jordrav/dataset-binding.js';
import '../js/jordrav/messages.js';
const appVersion=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url))).version;
const {hasTranslation}=await import(`../js/i18n.js?v=${appVersion}`);
const entry=(surface,depth,potential='possible',source='soil-new')=>({surface,depth,potential,source});
test('unknown or conflicting upper material cannot inherit access from a known buried layer',()=>{
  for(const e of [entry('WA','HS'),entry('HS','HS','unresolved'),entry('HS',''),entry('','HS')]){
    const p=layerAccessPlan(e);assert.equal(p.kind,'unresolved');assert.equal(p.huntability,'unknown');
    assert.deepEqual(p.steps,['resolve-record','local-profile']);
  }
});
test('organic upper receivers and unresolved lateral cover are distinguished from measured depth',()=>{
  const simple=layerAccessPlan(entry('FT','TS','covered'));
  assert.equal(simple.kind,'cover-contact');assert.ok(simple.steps.includes('upper-receiver'));
  assert.deepEqual(simple.lower.types,['coarse']);assert.equal(simple.huntability,'unknown');
  const mixed=layerAccessPlan(entry('FT-HS','HS','covered'));
  assert.equal(mixed.kind,'mixed-cover-contact');assert.equal(mixed.steps[0],'separate-patches');
  assert.equal(layerAccessPlan(entry('ES','TS')).kind,'cover-contact');
  const buriedPeat=layerAccessPlan(entry('HI','FT','coastal'));
  assert.equal(buriedPeat.kind,'sediment-contact');assert.deepEqual(buriedPeat.lower.types,['organic']);
});
test('equal grain size, repeated symbols and marine subcodes cannot prove worked-layer identity',()=>{
  const different=layerAccessPlan(entry('FS','TS'));
  assert.equal(different.kind,'sediment-contact');assert.deepEqual(different.upper.types,different.lower.types);
  assert.ok(different.steps.includes('check-identity'));
  assert.equal(layerAccessPlan(entry('TS','TS')).kind,'repeated');
  assert.equal(layerAccessPlan(entry('HV-S','HV-S')).kind,'variant');
  assert.equal(layerAccessPlan(entry('HS','HV-L')).kind,'variant');
  const lowerMix=layerAccessPlan(entry('HS','TS-TG'));
  assert.equal(lowerMix.steps[0],'separate-patches');assert.equal(lowerMix.kind,'sediment-contact');
  assert.equal(layerAccessPlan(entry('T','','possible','soil-old')).kind,'legacy');
});
test('entire bound catalogue receives translated guidance without changing any record or accessibility',async()=>{
  const raw=await fs.readFile(new URL('manifest.json',DATA_BASE));
  assert.equal(createHash('sha256').update(raw).digest('hex'),MANIFEST_SHA256);
  const descriptor=JSON.parse(raw).catalog;
  const archive=await fs.readFile(new URL(descriptor.file,DATA_BASE));
  assert.equal(createHash('sha256').update(archive).digest('hex'),descriptor.sha256);
  const entries=JSON.parse(gunzipSync(archive)).entries,snapshot=JSON.stringify(entries);
  assert.equal(entries.length,4652);
  for(const e of entries){
    const plan=layerAccessPlan(e);assert.ok(LAYER_ACCESS_KINDS.includes(plan.kind));
    assert.equal(plan.huntability,'unknown');
    for(const lang of ['da','de','en']){
      assert.ok(hasTranslation(`jordrav.layerCase_${plan.kind}`,lang));
      for(const step of plan.steps)assert.ok(hasTranslation(`jordrav.layerStep_${step}`,lang));
    }
  }
  assert.equal(JSON.stringify(entries),snapshot);
});
