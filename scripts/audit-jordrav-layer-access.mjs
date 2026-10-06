// Read-only national layer-pair diagnosis; no geological producer or runtime service.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DATA_BASE, MANIFEST_SHA256, MODEL_VERSION } from '../js/jordrav/dataset-binding.js';
import { geometryBounds } from '../js/jordrav/data-service.js';
import { layerAccessPlan, LAYER_ACCESS_VERSION, LAYER_ACCESS_KINDS } from '../js/jordrav/layer-access.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const codeSha = async file => sha((await fs.readFile(new URL(file,import.meta.url),'utf8')).replace(/\r\n/g,'\n'));
const bytes = await fs.readFile(new URL('manifest.json',DATA_BASE));
assert.equal(sha(bytes),MANIFEST_SHA256);
const manifest=JSON.parse(bytes);
let checkedFiles=1;
async function readBound(descriptor) {
  const raw=await fs.readFile(new URL(descriptor.file,DATA_BASE));
  assert.equal(sha(raw),descriptor.sha256,descriptor.file);assert.equal(raw.length,descriptor.bytes);
  const decoded=descriptor.file.endsWith('.gz')?gunzipSync(raw):raw;
  assert.equal(decoded.length,descriptor.decodedBytes);checkedFiles++;
  return JSON.parse(decoded);
}
const catalog=(await readBound(manifest.catalog)).entries;
await readBound(manifest.rules);await readBound(manifest.overview);
const plans=catalog.map(layerAccessPlan), kinds={}, pairs={}, examples={};
for(const kind of LAYER_ACCESS_KINDS)kinds[kind]={catalogueEntries:0,detailFeatures:0};
const pairKey=entry=>`${entry.source}:${entry.surface || '—'}/${entry.depth || '—'}`;
for(let index=0;index<catalog.length;index++){
  const entry=catalog[index],plan=plans[index],pair=pairKey(entry);
  assert.equal(plan.huntability,'unknown');assert.ok(LAYER_ACCESS_KINDS.includes(plan.kind));
  kinds[plan.kind].catalogueEntries++;
  pairs[pair]??={catalogueEntries:0,detailFeatures:0,kind:plan.kind};
  // Potential conflicts may legitimately make the same symbols unresolved.
  if(pairs[pair].kind!==plan.kind)pairs[pair].kind='varies-with-record';
  pairs[pair].catalogueEntries++;
}
function example(key,feature,tile,entry,plan){
  const bbox=geometryBounds(feature.geometry),metric=(bbox[2]-bbox[0])*(bbox[3]-bbox[1]);
  if(metric<=(examples[key]?.displayMetric||0))return;
  examples[key]={tile:tile.file,origin:feature.properties.o,bbox,entry,kind:plan.kind,displayMetric:metric,
    selectionMeaning:'Largest bounding rectangle for a visible browser example only; not amber, area or field ranking'};
}
let features=0,lateralLower=0,organicBelowMineral=0;
for(const tile of manifest.tiles){
  const data=await readBound(tile);assert.equal(data.modelVersion,MODEL_VERSION);
  assert.equal(data.features.length,tile.features);
  for(const feature of data.features){
    const entry=catalog[feature.properties.i],plan=plans[feature.properties.i];assert.ok(entry&&plan);
    kinds[plan.kind].detailFeatures++;pairs[pairKey(entry)].detailFeatures++;features++;
    example(plan.kind,feature,tile,entry,plan);
    if(plan.lower?.lateralMixture)lateralLower++;
    if(plan.relationship==='different'&&plan.lower.types.includes('organic')&&
       !plan.upper.types.includes('organic')&&plan.kind!=='unresolved'){
      organicBelowMineral++;example('organic-below-mineral',feature,tile,entry,plan);
    }
  }
}
assert.equal(catalog.length,4652);assert.equal(features,505834);assert.equal(checkedFiles,196);
assert.equal(Object.values(kinds).reduce((n,r)=>n+r.detailFeatures,0),features);
const report={schemaVersion:1,date:'2026-10-05',modelVersion:MODEL_VERSION,layerAccessVersion:LAYER_ACCESS_VERSION,
  manifestSha256:MANIFEST_SHA256,codeBindingLF:{
    'layer-access.js':await codeSha('../js/jordrav/layer-access.js'),
    'search-context.js':await codeSha('../js/jordrav/search-context.js'),
    producer:await codeSha('./audit-jordrav-layer-access.mjs')},
  scope:'All catalogue records and SHA-verified national data. Counts are display fragments, not fields, finds or areas.',
  checkedFiles,catalogueEntries:catalog.length,tiles:manifest.tiles.length,detailFeatures:features,
  huntability:'unknown for every material polygon; no measured access or numerical amber probability inferred',
  kinds,lateralLowerDetailFeatures:lateralLower,organicBelowMineralDetailFeatures:organicBelowMineral,pairs,examples,
  unchanged:'No dataset, potential category, geometry, source identity or geological rule modified'};
await fs.writeFile(new URL('../docs/research/jordrav/national-layer-access-2026-10-05.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedFiles,catalogueEntries:catalog.length,features,kinds,lateralLower,organicBelowMineral}));
