// Full nationwide, read-only diagnosis of the current catalogue and all tiles.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { DATA_BASE, MANIFEST_SHA256, MODEL_VERSION } from '../js/jordrav/dataset-binding.js';
import { searchContext, SEARCH_CONTEXT_VERSION } from '../js/jordrav/search-context.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await fs.readFile(new URL('manifest.json', DATA_BASE));
assert.equal(sha(manifestBytes),MANIFEST_SHA256);
const manifest=JSON.parse(manifestBytes);
async function readBound(descriptor) {
  const bytes = await fs.readFile(new URL(descriptor.file, DATA_BASE));
  assert.equal(sha(bytes),descriptor.sha256,descriptor.file);
  assert.equal(bytes.length,descriptor.bytes);
  const decoded=descriptor.file.endsWith('.gz')?gunzipSync(bytes):bytes;
  assert.equal(decoded.length,descriptor.decodedBytes);
  return JSON.parse(decoded);
}
const catalog=(await readBound(manifest.catalog)).entries;
const contexts=catalog.map(searchContext);
const rows={}, relationships={}, materialExamples={}, organicMarine={catalogueEntries:0,detailFeatures:0};
let unknownMapped=0,lateralEntries=0,lateralFeatures=0,features=0;
function rememberExample(key,feature,tile,index,entry) {
  const coordinates=feature.geometry.coordinates.flat(feature.geometry.type==='Polygon'?1:2);
  const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
  const bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const selectionMetric=(bbox[2]-bbox[0])*(bbox[3]-bbox[1]);
  if(selectionMetric <= (materialExamples[key]?.selectionMetric || 0))return;
  materialExamples[key]={tile:tile.file,origin:feature.properties.o,bbox,selectionMetric,
    selectionMeaning:'Largest bounding rectangle solely for a visible browser example; not amber or area ranking',catalogueIndex:index,entry};
}
for(let index=0;index<catalog.length;index++) {
  const entry=catalog[index],context=contexts[index];
  const profile=context.upper.types.slice().sort().join('+');
  rows[profile]??={catalogueEntries:0,detailFeatures:0};rows[profile].catalogueEntries++;
  relationships[context.relationship]??={catalogueEntries:0,detailFeatures:0};relationships[context.relationship].catalogueEntries++;
  if(context.upper.lateralMixture)lateralEntries++;
  if(entry.material!=='unresolved'&&context.upper.types.includes('unknown'))unknownMapped++;
  if(entry.potential==='coastal'&&context.upper.types.includes('organic'))organicMarine.catalogueEntries++;
}
assert.equal(unknownMapped,0,'A known upper material lacks physical guidance');
for(const tile of manifest.tiles) {
  const data=await readBound(tile);assert.equal(data.modelVersion,MODEL_VERSION);
  assert.equal(data.features.length,tile.features);
  for(const feature of data.features) {
    const index=feature.properties.i,entry=catalog[index],context=contexts[index];
    assert.ok(entry&&context);
    const profile=context.upper.types.slice().sort().join('+');
    rows[profile].detailFeatures++;relationships[context.relationship].detailFeatures++;features++;
    if(context.upper.lateralMixture)lateralFeatures++;
    if(entry.potential==='coastal'&&context.upper.types.includes('organic')) {
      organicMarine.detailFeatures++;
      rememberExample('marineOrganic',feature,tile,index,entry);
    }
    if(context.upper.lateralMixture)rememberExample('lateralMixture',feature,tile,index,entry);
  }
}
assert.equal(features,505834);assert.equal(manifest.tiles.length,192);
assert.equal(Object.values(rows).reduce((n,row)=>n+row.detailFeatures,0),features);
const report={schemaVersion:1,analysedOn:'2026-10-05',modelVersion:MODEL_VERSION,searchContextVersion:SEARCH_CONTEXT_VERSION,
  manifestSha256:MANIFEST_SHA256,contextCodeSha256:sha(await fs.readFile(new URL('../js/jordrav/search-context.js',import.meta.url))),
  scope:'All catalogue combinations and all detail features; counts are display fragments, not fields, areas, finds or huntability.',
  catalogueEntries:catalog.length,tiles:manifest.tiles.length,detailFeatures:features,
  knownUpperMaterialsWithoutGuidance:unknownMapped,lateralMixtures:{catalogueEntries:lateralEntries,detailFeatures:lateralFeatures},
  organicMarine,relationships,physicalProfiles:rows,materialExamples,
  unchanged:'No geology rules, catalogue, geometries, dataset bytes or potential categories modified.'};
await fs.writeFile(new URL('../docs/research/jordrav/national-search-context-2026-10-05.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({catalogueEntries:catalog.length,tiles:manifest.tiles.length,features,unknownMapped,organicMarine,lateralEntries,lateralFeatures,relationships}));
