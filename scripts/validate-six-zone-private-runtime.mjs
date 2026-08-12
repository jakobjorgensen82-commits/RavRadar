import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const baseline=JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json','utf8'));
const candidate=JSON.parse(await fs.readFile('.geometry-v2-work/six-zone-private-public.json','utf8'));
assert.equal(candidate.enabled,false,'Privat kandidat må ikke være aktiveret.');
assert.equal(candidate.partCount,656);assert.equal(candidate.zoneCount,211);
const allowed=new Set(['DK-B07-19','DK-B07-20','DK-B08-10','DK-B08-12','DK-B08-17','DK-B08-18','DK-B08-19','DK-B09-01','DK-B10-14','DK-B10-16']);
for(const zoneId of new Set([...Object.keys(baseline.zones||{}),...Object.keys(candidate.zones||{})])){
  if(allowed.has(zoneId))continue;
  assert.deepEqual(candidate.zones?.[zoneId],baseline.zones?.[zoneId],`${zoneId} blev ændret uden for godkendt område.`);
}
const required=['DK-B07-19','DK-B08-12','DK-B08-18','DK-B08-19','DK-B10-14','DK-B10-16'];
for(const zoneId of required)assert.ok(candidate.zones?.[zoneId]?.length,`${zoneId} mangler i kandidaten.`);
console.log('OK: Privat seks-zoneruntime har 656 dele/211 zoner, og alle øvrige zoner er byte-logisk uændrede.');
