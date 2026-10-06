import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {soilPointURL,parseSoilPoint,boreViewportURL,parseBoreholes,boreProfileURL,publicBoreDate,terrainTileURL,fetchPublicJSON} from '../js/jordrav/public-context.js';
import {evidenceChain} from '../js/jordrav/evidence-chain.js';
import {parseView,encodeView} from '../js/jordrav/view-state.js';
import {DATA_BASE,MANIFEST_SHA256} from '../js/jordrav/dataset-binding.js';
import {contextMessageKeys} from '../js/jordrav/context-messages.js';
const appVersion=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url))).version;
const {hasTranslation}=await import(`../js/i18n.js?v=${appVersion}`);
import {PROFILE_BINDING} from '../js/jordrav/profile-examples.js';
const collection=rows=>({type:'FeatureCollection',features:rows});
test('point query preserves click/axis order and minimal fields; conflicting classes stay ambiguous',()=>{
  const u=new URL(soilPointURL(57.156,10.395));assert.equal(u.searchParams.get('x'),'50');assert.equal(u.searchParams.get('srs'),'EPSG:4326');
  const b=u.searchParams.get('bbox').split(',').map(Number);assert.ok(Math.abs((b[0]+b[2])/2-10.395)<1e-10);assert.ok(Math.abs((b[1]+b[3])/2-57.156)<1e-10);
  assert.equal(u.searchParams.get('propertyName'),'JB_kode,Jordtype');
  const row=(code,name)=>({properties:{JB_kode:code,Jordtype:name,owner:'must not survive'}});
  assert.deepEqual(parseSoilPoint(collection([row(4,'Sandjord'),row(6,'Lerjord')])),{rows:[{code:4,name:'Sandjord'},{code:6,name:'Lerjord'}],ambiguous:true,truncated:false});
  assert.equal(parseSoilPoint(collection([])).rows.length,0);
  assert.throws(()=>parseSoilPoint(collection([row(null,'bad')])));assert.throws(()=>soilPointURL(NaN,10));
});
test('bounded boreholes preserve total depth, discard irrelevant fields and distinguish a full limit from completeness',()=>{
  const u=new URL(boreViewportURL([10.37,57.14,10.44,57.20]));assert.equal(u.searchParams.get('MAXFEATURES'),'201');assert.equal(u.searchParams.get('PROPERTYNAME'),'msGeometry,dgunr,dybde_num,dato');
  assert.throws(()=>boreViewportURL([7,54,16,58]));assert.throws(()=>boreViewportURL([10,57,9,56]));
  const row={type:'Feature',geometry:{type:'Point',coordinates:[10.4,57.15]},properties:{dgunr:'18.453',dybde_num:4.2,dataejer:'discard'}};
  assert.deepEqual(parseBoreholes(collection([row])).rows,[{dgu:'18.453',longitude:10.4,latitude:57.15,depth:4.2,date:null}]);
  assert.equal(parseBoreholes(collection(Array.from({length:201},()=>row))).truncated,true);
  assert.throws(()=>parseBoreholes(collection([{...row,properties:{dgunr:'<script>'}}])));
  assert.throws(()=>boreProfileURL('6.30&token=bad'));assert.equal(new URL(boreProfileURL('6.30')).searchParams.get('dgunr'),'6.30');
  assert.equal(publicBoreDate('1958/01/01 00:00:00'),'1958-01-01');assert.throws(()=>publicBoreDate('2026/02/31 00:00:00'));
});
test('terrain uses Web Mercator export rather than misreading the source UTM tile grid',()=>{
  const u=new URL(terrainTileURL({x:2100,y:1250,z:12}));assert.equal(u.searchParams.get('bboxSR'),'3857');assert.equal(u.searchParams.get('imageSR'),'3857');
  const b=u.searchParams.get('bbox').split(',').map(Number);assert.ok(b[0]<b[2]&&b[1]<b[3]);assert.equal(u.searchParams.get('size'),'256,256');
  assert.equal(terrainTileURL({x:2100+4096,y:1250,z:12}),u.href);assert.throws(()=>terrainTileURL({x:1,y:-1,z:12}));
});
test('public JSON honours the source charset, bounds response bytes and omits credentials',async()=>{
  const bytes=Uint8Array.from([123,34,110,34,58,34,230,34,125]);let options;
  const fetcher=async(_url,o)=>{options=o;return new Response(bytes,{headers:{'content-type':'application/json;charset=ISO-8859-1'}});};
  assert.deepEqual(await fetchPublicJSON('https://geodata.fvm.dk/',undefined,fetcher),{n:'æ'});assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  await assert.rejects(()=>fetchPublicJSON('https://geodata.fvm.dk/',undefined,async()=>new Response(new Uint8Array(250001))),/too large/);
});
test('additional context settings round-trip without invalidating historical saved views',()=>{
  const old={latitude:57.156,longitude:10.395,zoom:13,base:'street',trace:'all',mode:'potential',opacity:45,focus:false,show:true,fields:false,deep:true,dataset:MANIFEST_SHA256,feature:null,point:null};
  assert.deepEqual(parseView(encodeView(old)).state,old);
  const current={...old,soil:true,terrain:true,bores:true,profiles:true};assert.deepEqual(parseView(encodeView(current)).state,current);
  assert.equal(parseView(encodeView(old)+'&bores=yes').error,true);
});
test('selected profiles bind to public source rows and retain absent geology or boundaries without amber inference',async()=>{
  const raw=await fs.readFile(PROFILE_BINDING.url);assert.equal(raw.length,PROFILE_BINDING.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),PROFILE_BINDING.sha256);
  const data=JSON.parse(raw),receipt=JSON.parse(await fs.readFile('docs/research/jordrav/public-context-sources-2026-10-06.json','utf8'));
  assert.equal(receipt.status,'PASS');assert.equal(data.profiles.length,16);let rows=0,absent=0,incomplete=0;
  for(const profile of data.profiles){const source=receipt.results.find(r=>r.profile?.dgu===profile.dgu);assert.deepEqual(source.profile,profile);assert.equal(source.profileBinding.sha256,profile.sourceHtmlSha256);
    publicBoreDate(profile.drilledOn);assert.equal(boreProfileURL(profile.dgu),profile.source);rows+=profile.intervals.length;if(!profile.intervals.length)absent++;
    for(const interval of profile.intervals){if(interval.missingBounds)incomplete++;assert.ok(!('amber' in interval));assert.ok(!('huntability' in interval));}}
  assert.equal(rows,126);assert.equal(absent,6);assert.equal(incomplete,2);
});
test('every national catalogue entry has an evidence chain, investigative priority and complete translations without a score or access claim',async()=>{
  const manifestRaw=await fs.readFile(new URL('manifest.json',DATA_BASE));assert.equal(createHash('sha256').update(manifestRaw).digest('hex'),MANIFEST_SHA256);
  const descriptor=JSON.parse(manifestRaw).catalog,bytes=await fs.readFile(new URL(descriptor.file,DATA_BASE));assert.equal(createHash('sha256').update(bytes).digest('hex'),descriptor.sha256);
  const entries=JSON.parse(gunzipSync(bytes)).entries,before=JSON.stringify(entries),priorities=new Set();
  const camel=v=>v.replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
  for(const e of entries){const c=evidenceChain(e);assert.equal(c.source,'unverified');assert.equal(c.access,'unknown');assert.ok(!('score' in c));priorities.add(c.priority);
    for(const lang of ['da','de','en']){for(const step of c.steps)assert.ok(hasTranslation(`jordrav.step_${camel(step)}`,lang));for(const key of ['source','transport','receiver','preservation','access'])assert.ok(hasTranslation(`jordrav.chainState_${camel(c[key])}`,lang));}}
  assert.equal(priorities.size,7);assert.equal(entries.length,4652);assert.equal(JSON.stringify(entries),before);
  for(const lang of ['da','de','en'])for(const key of contextMessageKeys)assert.ok(hasTranslation(`jordrav.${key}`,lang));
});
