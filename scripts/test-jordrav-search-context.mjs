import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { physicalContext, searchContext } from '../js/jordrav/search-context.js';
import { FIELD_SERVICE, FIELD_STYLE } from '../js/jordrav/field-context.js';
import '../js/jordrav/messages.js';
import { messageKeys } from '../js/jordrav/messages.js';
const appVersion=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url))).version;
const {hasTranslation}=await import(`../js/i18n.js?v=${appVersion}`);

test('marine organic deposits, alternate beds and lateral mixtures retain different physical meanings',()=>{
  for(const code of ['HT','HP','YP'])assert.deepEqual(physicalContext(code),{types:['organic'],lateralMixture:false});
  for(const code of ['HV','TV','ZV'])assert.deepEqual(physicalContext(code),{types:['alternating'],lateralMixture:false});
  for(const code of ['HV-L','HV-S'])assert.deepEqual(physicalContext(code),{types:['variant'],lateralMixture:false});
  assert.deepEqual(physicalContext('HS-HL'),{types:['coarse','fine'],lateralMixture:true});
  assert.deepEqual(physicalContext('TS-TG'),{types:['coarse'],lateralMixture:true});
  assert.deepEqual(physicalContext('HV',true),{types:['alternating'],lateralMixture:false});
  assert.deepEqual(physicalContext('HSL',true),{types:['broad'],lateralMixture:false});
  assert.deepEqual(physicalContext('T',true),{types:['broad'],lateralMixture:false});
});
test('upper material, missing observations and vertical relations are not replaced by a deeper symbol',()=>{
  const entry={source:'soil-new',surface:'FT-HS',depth:'HS',potential:'covered'};
  assert.deepEqual(searchContext(entry).upper.types,['organic','coarse']);
  assert.equal(searchContext(entry).relationship,'different');
  assert.equal(searchContext({...entry,surface:'HS',depth:'HS'}).relationship,'same');
  assert.deepEqual(searchContext({...entry,surface:'WA',potential:'unresolved'}).tasks,['unknown']);
  assert.equal(searchContext({...entry,surface:'WA'}).relationship,'unknown');
  assert.equal(searchContext({...entry,source:'soil-old'}).relationship,'old');
});
test('all field requests are fixed-year raster outlines with no fill or feature-info query',async()=>{
  assert.equal(FIELD_SERVICE.layer,'Marker:Marker_2026');
  assert.equal(FIELD_SERVICE.minZoom,12);
  assert.ok(FIELD_STYLE.includes('<Stroke>'));
  assert.ok(!/<Fill>|TextSymbolizer|PropertyName|OnlineResource/.test(FIELD_STYLE));
  const source=await fs.readFile(new URL('../js/jordrav/field-context.js',import.meta.url),'utf8');
  assert.ok(!/GetFeatureInfo|GetFeature|navigator\.geolocation|fetch\(/.test(source));
  const metadata=JSON.parse(await fs.readFile(new URL('../docs/research/jordrav/sources/fields-wms-2026-metadata.json',import.meta.url)));
  assert.equal(metadata.layer,FIELD_SERVICE.layer);assert.equal(metadata.inheritedEPSG3857,true);
  assert.ok(metadata.formats.includes('image/png'));
  const archive=await fs.readFile(new URL(`../docs/research/jordrav/sources/${metadata.archivedSource.file}`,import.meta.url));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(archive.length,metadata.archivedSource.gzipBytes);
  assert.equal(hash(archive),metadata.archivedSource.gzipSha256);
  const raw=gunzipSync(archive);
  assert.equal(raw.length,metadata.sourceBytes);assert.equal(hash(raw),metadata.sourceSha256);
  assert.ok(raw.toString('utf8').includes('<Name>Marker:Marker_2026</Name>'));
});
test('search instructions and field status have Danish, German and English translations',()=>{
  for(const key of messageKeys)for(const lang of ['da','de','en'])assert.ok(hasTranslation(`jordrav.${key}`,lang),`${lang}:${key}`);
});
