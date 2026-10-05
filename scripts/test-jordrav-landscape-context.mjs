import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { landscapeContext, upperSedimentHistory, LANDSCAPES } from '../js/jordrav/landscape-context.js';
import { DATA_BASE, MANIFEST_SHA256 } from '../js/jordrav/dataset-binding.js';
import '../js/jordrav/messages.js';
import { hasTranslation } from '../js/i18n.js?v=4.0.541';
const e=(landscape,landscapeCode,surface='HS',source='soil-new',potential='coastal')=>({landscape,landscapeCode,surface,source,potential});
test('source name plus code prevents conflating two code-50 landforms or importing an old legend',()=>{
  assert.equal(landscapeContext(e('Hævet senglacial flade',50)).route,'raised-plain');
  assert.equal(landscapeContext(e('Hævet senglacial strandvold',50)).route,'raised-ridge');
  assert.equal(landscapeContext(e('Smeltevandsdalflade',20)).route,'unknown');
  assert.equal(landscapeContext(e('Hævet senglacial flade',54)).key,null);
  assert.notEqual(landscapeContext(e('Tunneldal',4)).route,landscapeContext(e('Erosionsdal',22)).route);
  assert.notEqual(landscapeContext(e('Marin flade',25)).route,landscapeContext(e('Tørlagt marint forland',36)).route);
});
test('upper sediment history uses exact current codes; old, combined and conflict records do not become dates',()=>{
  assert.equal(upperSedimentHistory(e('Marin flade',25,'HSL','soil-old')),'legacy');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'HV-L')),'marine');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'HS-FT')),'mixed');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'FHS')),'delta');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'YS')),'late-marine');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'ZS')),'other');
  assert.equal(upperSedimentHistory(e('Marin flade',25,'HS','soil-new','unresolved')),'unresolved');
});
test('raised landform and younger upper deposit produce a local investigation question, never huntability',()=>{
  for(const surface of ['HS','ES','FT','FHS']){
    const input=e('Hævet senglacial flade',50,surface),before=JSON.stringify(input);
    const c=landscapeContext(input);assert.equal(c.chronology,'younger-on-raised');assert.equal(c.huntability,'unknown');
    assert.equal(JSON.stringify(input),before);
  }
  assert.equal(landscapeContext(e('Hævet senglacial strandvold',54,'YS')).chronology,'late-on-raised');
  assert.equal(landscapeContext(e('Strandvold',27,'YS')).chronology,'separate');
});
test('all bound national name/code pairs and material histories receive complete three-language guidance',async()=>{
  const raw=await fs.readFile(new URL('manifest.json',DATA_BASE));
  assert.equal(createHash('sha256').update(raw).digest('hex'),MANIFEST_SHA256);
  const descriptor=JSON.parse(raw).catalog,archive=await fs.readFile(new URL(descriptor.file,DATA_BASE));
  assert.equal(createHash('sha256').update(archive).digest('hex'),descriptor.sha256);
  const entries=JSON.parse(gunzipSync(archive)).entries,before=JSON.stringify(entries),keys=new Set();
  for(const entry of entries){
    const c=landscapeContext(entry);assert.ok(c.key);keys.add(c.key);assert.equal(c.huntability,'unknown');
    for(const lang of ['da','de','en'])for(const key of [`landscapeName_${c.key}`,`landscapeRoute_${c.route}`,`sedimentHistory_${c.history}`,`landscapeChronology_${c.chronology}`])assert.ok(hasTranslation(`jordrav.${key}`,lang),`${lang}:${key}`);
  }
  assert.equal(entries.length,4652);assert.equal(keys.size,Object.keys(LANDSCAPES).length);assert.equal(JSON.stringify(entries),before);
});
