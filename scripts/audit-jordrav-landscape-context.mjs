// Read-only nationwide morphology/upper-sediment diagnosis. No field ranking.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DATA_BASE, MANIFEST_SHA256, MODEL_VERSION } from '../js/jordrav/dataset-binding.js';
import { geometryBounds } from '../js/jordrav/data-service.js';
import { LANDSCAPES, landscapeContext, LANDSCAPE_CONTEXT_VERSION } from '../js/jordrav/landscape-context.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const codeSha=async file=>sha((await fs.readFile(new URL(file,import.meta.url),'utf8')).replace(/\r\n/g,'\n'));
const raw=await fs.readFile(new URL('manifest.json',DATA_BASE));
assert.equal(sha(raw),MANIFEST_SHA256);const manifest=JSON.parse(raw);let checkedFiles=1;
async function readBound(descriptor){
  const bytes=await fs.readFile(new URL(descriptor.file,DATA_BASE));
  assert.equal(sha(bytes),descriptor.sha256,descriptor.file);assert.equal(bytes.length,descriptor.bytes);
  const decoded=descriptor.file.endsWith('.gz')?gunzipSync(bytes):bytes;
  assert.equal(decoded.length,descriptor.decodedBytes);checkedFiles++;return JSON.parse(decoded);
}
const entries=(await readBound(manifest.catalog)).entries;
await readBound(manifest.rules);await readBound(manifest.overview);
const contexts=entries.map(landscapeContext),landforms={},pairs={},routes={},chronology={},histories={},examples={};
const pairKey=e=>`${e.landscapeCode ?? '—'}:${e.landscape}`;
const increment=(group,key,field)=>{group[key]??={catalogueEntries:0,detailFeatures:0};group[key][field]++;};
for(let i=0;i<entries.length;i++){
  const entry=entries[i],c=contexts[i];assert.ok(c.key,JSON.stringify(entry));assert.equal(c.huntability,'unknown');
  for(const [group,key] of [[landforms,c.key],[pairs,pairKey(entry)],[routes,c.route],[chronology,c.chronology],[histories,c.history]])increment(group,key,'catalogueEntries');
}
function example(key,feature,tile,entry,c){
  const bbox=geometryBounds(feature.geometry),metric=(bbox[2]-bbox[0])*(bbox[3]-bbox[1]);
  if(metric<=(examples[key]?.displayMetric||0))return;
  examples[key]={tile:tile.file,origin:feature.properties.o,bbox,entry,context:c,displayMetric:metric,
    selectionMeaning:'Largest bounding rectangle for a visible browser example only; not amber, area or field ranking'};
}
let features=0;
for(const tile of manifest.tiles){
  const data=await readBound(tile);assert.equal(data.modelVersion,MODEL_VERSION);assert.equal(data.features.length,tile.features);
  for(const feature of data.features){
    const entry=entries[feature.properties.i],c=contexts[feature.properties.i];assert.ok(entry&&c);features++;
    for(const [group,key] of [[landforms,c.key],[pairs,pairKey(entry)],[routes,c.route],[chronology,c.chronology],[histories,c.history]])increment(group,key,'detailFeatures');
    example(`route:${c.route}`,feature,tile,entry,c);
    example(`chronology:${c.chronology}`,feature,tile,entry,c);
    if(entry.landscapeCode===50)example(`code50:${c.key}`,feature,tile,entry,c);
  }
}
assert.equal(checkedFiles,196);assert.equal(entries.length,4652);assert.equal(features,505834);
for(const group of [landforms,pairs,routes,chronology,histories]){
  assert.equal(Object.values(group).reduce((n,x)=>n+x.detailFeatures,0),features);
  assert.equal(Object.values(group).reduce((n,x)=>n+x.catalogueEntries,0),entries.length);
}
assert.equal(Object.keys(landforms).length,Object.keys(LANDSCAPES).length);
const sourceInventory=await fs.readFile(new URL('../docs/research/jordrav/national-model-0.2-source-inventory.json',import.meta.url));
assert.equal(JSON.parse(sourceInventory).status,'PASS');
const report={schemaVersion:1,date:'2026-10-05',modelVersion:MODEL_VERSION,landscapeContextVersion:LANDSCAPE_CONTEXT_VERSION,
  manifestSha256:MANIFEST_SHA256,codeBindingLF:{
    'landscape-context.js':await codeSha('../js/jordrav/landscape-context.js'),producer:await codeSha('./audit-jordrav-landscape-context.mjs')},
  originalSourceInventorySha256:sha(sourceInventory),
  scope:'All source-bound catalogue pairs and all SHA-verified national data; counts are display fragments, not fields, finds, areas or probabilities.',
  checkedFiles,tiles:manifest.tiles.length,catalogueEntries:entries.length,detailFeatures:features,
  landformNamesExcludingNotMapped:Object.keys(landforms).length-1,sourceNameCodePairs:Object.keys(pairs).length,
  semanticBinding:'Exact original name plus code, scoped to the bound v3 landscape dataset. Code 50 retains both original names.',
  huntability:'unknown for every material polygon; mapped formation group is not a local date, present exposure or amber supply measurement',
  landforms,pairs,routes,chronology,histories,examples,
  unchanged:'No dataset, geological potential category, geometry, source identity or geological rule modified'};
await fs.writeFile(new URL('../docs/research/jordrav/national-landscape-context-2026-10-05.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedFiles,features,names:report.landformNamesExcludingNotMapped,pairs:report.sourceNameCodePairs,routes,chronology}));
