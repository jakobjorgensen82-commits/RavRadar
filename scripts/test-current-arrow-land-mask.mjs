import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {createCurrentArrowLandMask,readCurrentArrowLandMaskResponse,CURRENT_ARROW_LAND_MASK_SHA256} from '../js/map/current-arrow-land-mask.js';
import {buildFlowArrowCandidates,installFlowArrows} from '../js/map/map-view.js';
import {polygonRecord,extractPolygons,packRing} from './build-current-arrow-land-mask.mjs';

const rect=(west,south,east,north)=>[[west,south],[east,south],[east,north],[west,north],[west,south]];
const document={schemaVersion:1,coverage:[7.7,54.4,15.6,57.9],polygons:[
  {bbox:[9,55,11,57],rings:[rect(9,55,11,57),rect(9.4,55.4,9.6,55.6)]},
  {bbox:[9.48,55.48,9.52,55.52],rings:[rect(9.48,55.48,9.52,55.52)]},
  {bbox:[10.5,56,11.5,57],rings:[rect(10.5,56,11.5,57)]}
]};
const mask=createCurrentArrowLandMask(document);
assert.equal(mask.classifyPoint([10,56]),'land');
assert.equal(mask.classifyPoint([9.45,55.45]),'water','A hole remains water; winding must not turn it into land');
assert.equal(mask.classifyPoint([9.5,55.5]),'land','An island inside a polygon hole remains land');
assert.equal(mask.classifyPoint([10.7,56.5]),'land','Overlapping split polygons are a union, not XOR');
assert.equal(mask.classifyPoint([9,56]),'unknown','The coastline itself must not claim sea');
assert.equal(mask.classifyPoint([15,55]),'water');
const packed=structuredClone(document);
packed.encoding='delta-e7';
for(const polygon of packed.polygons) polygon.rings=polygon.rings.map(ring=>{
  const result=[];let x=0,y=0;
  for(const point of ring) {const next=point.map(n=>Math.round(n*1e7));result.push(next[0]-x,next[1]-y);[x,y]=next;}
  return result;
});
const packedMask=createCurrentArrowLandMask(packed);
const binary=structuredClone(document);binary.encoding='zigzag-varint-e7';
for(const polygon of binary.polygons) polygon.rings=polygon.rings.map(packRing);
const binaryMask=createCurrentArrowLandMask(binary);
for(const point of [[10,56],[9.45,55.45],[9.5,55.5],[10.7,56.5],[15,55]]) assert.equal(packedMask.classifyPoint(point),mask.classifyPoint(point));
for(const point of [[10,56],[9.45,55.45],[9.5,55.5],[10.7,56.5],[15,55]]) assert.equal(binaryMask.classifyPoint(point),mask.classifyPoint(point));
assert.equal(packedMask.classifyPoint([9-5e-8,56]),'unknown','Packing uncertainty at the boundary must not create claimed sea');
const badPacked=structuredClone(packed);badPacked.polygons[0].rings[0][0]=NaN;
assert.throws(()=>createCurrentArrowLandMask(badPacked));
for(const bytes of [[128],[0],[128,0],[128,128,128,128,128,0]]) {
  const malformed=structuredClone(binary);malformed.polygons[0].rings[0]=Buffer.from(bytes).toString('base64');
  assert.throws(()=>createCurrentArrowLandMask(malformed),'Incomplete, odd, noncanonical or oversized varints must not compile');
}
for(const point of [[17,55],[null,55],[true,55],['10',55],[10,Infinity],[],null]) assert.equal(mask.classifyPoint(point),'unknown');
const changed=structuredClone(document);
const preserved=createCurrentArrowLandMask(changed);
changed.polygons[0].rings[0][0][0]=100;
assert.equal(preserved.classifyPoint([10,56]),'land','Caller mutation must not change compiled evidence');
for(const mutate of [d=>d.coverage[0]=8,d=>d.polygons=[],d=>d.polygons[0].bbox[2]=8,
    d=>d.polygons[0].rings[0].pop(),d=>d.polygons[0].rings[0][0]=[null,55]]) {
  const value=structuredClone(document);mutate(value);assert.throws(()=>createCurrentArrowLandMask(value));
}
const encoded=JSON.stringify(document),sha=createHash('sha256').update(encoded).digest('hex');
const loaded=await readCurrentArrowLandMaskResponse(new Response(encoded),sha,webcrypto);
assert.equal(loaded.classifyPoint([10,56]),'land');
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(encoded+' '),sha,webcrypto),/integrity/);
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(encoded,{status:503}),sha,webcrypto));
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(encoded),'unknown',webcrypto));
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(encoded),sha,{}));
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(encoded,{headers:{'content-length':String(32*1024*1024+1)}}),sha,webcrypto),/large/);
let overflowCancelled=0;
const oversizedStream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(32*1024*1024+1));},cancel(){overflowCancelled++;}});
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(oversizedStream),sha,webcrypto),/large/);
assert.equal(overflowCancelled,1,'Unannounced oversized transport must be cancelled');
assert.equal(oversizedStream.locked,false,'Rejected transport must release its reader');
const invalidUtf8=new Uint8Array([255]);
await assert.rejects(readCurrentArrowLandMaskResponse(new Response(invalidUtf8),createHash('sha256').update(invalidUtf8).digest('hex'),webcrypto),TypeError);
await assert.rejects(readCurrentArrowLandMaskResponse(new Response('{'),createHash('sha256').update('{').digest('hex'),webcrypto),SyntaxError);

const features={features:[{properties:{id:'arbitrary-zone',zoneStatus:'active',dataPoint:[15,55]}}]};
const at='2026-10-08T10:00:00.000Z';
for(const source of ['dmi-marine-grid','copernicus-current-grid','dmi-regional-proxy-grid']) {
  for(const currentSource of ['dmi','dmi-cache','copernicus','copernicus-cache',null]) {
    const flowPoints={current:[10,56],wind:[10,56],sources:{current:source,wind:'dmi-atmospheric-grid'}};
    const zone={currentSource,flowPoints,current:{currentDirectionDeg:90,windDirectionDeg:270}};
    const parts={enabled:true,zones:{'arbitrary-zone':{currentReferenceAt:at}},parts:{'unseen-part':{
      zoneId:'arbitrary-zone',flowPoints,current:{time:at,weather:zone.current}
    }}};
    const original=JSON.stringify({zone,parts,features});
    const arrows=buildFlowArrowCandidates(features,()=>zone,parts,13,mask);
    assert.equal(arrows.filter(row=>row.type==='current').length,0,`${source}/${currentSource}: all parent and local land currents rejected`);
    assert.equal(arrows.filter(row=>row.type==='wind').length,2,'Land current rejection must preserve both winds');
    assert.equal(buildFlowArrowCandidates(features,()=>zone,parts,8,mask).filter(row=>row.type==='current').length,0);
    flowPoints.current=[15,55];
    const valid=buildFlowArrowCandidates(features,()=>zone,parts,13,mask).filter(row=>row.type==='current');
    assert.equal(valid.length,2);
    for(const arrow of valid) {assert.deepEqual(arrow.point,[15,55]);assert.equal(arrow.directionDeg,90);assert.equal(arrow.source,source);}
    parts.parts['unseen-part'].current.time='2026-10-08T09:00:00.000Z';
    assert.equal(buildFlowArrowCandidates(features,()=>zone,parts,13,mask).filter(row=>row.type==='current').length,1,'Stale local-hour grid cannot borrow the selected hour');
    flowPoints.current=[10,56];parts.parts['unseen-part'].current.time=at;
    assert.equal(JSON.stringify({zone,parts,features}),original,'Display admission must not mutate input, weather or provenance');
  }
}
const withoutMask=buildFlowArrowCandidates(features,()=>({current:{currentDirectionDeg:90,windDirectionDeg:270},flowPoints:{current:[15,55],sources:{current:'dmi-marine-grid'}}}),null,8);
assert.deepEqual(withoutMask.map(row=>row.type),['wind'],'Missing national evidence must not fail open');

// Streamed maintenance parser: real binary record/header shape, fragmented input.
const ring=rect(10,55,10.1,55.1);
const record=Buffer.alloc(48+ring.length*16);
record.writeInt32LE(5);[10,55,10.1,55.1].forEach((v,i)=>record.writeDoubleLE(v,4+i*8));
record.writeInt32LE(1,36);record.writeInt32LE(ring.length,40);record.writeInt32LE(0,44);
ring.forEach(([x,y],i)=>{record.writeDoubleLE(x,48+i*16);record.writeDoubleLE(y,56+i*16);});
assert.deepEqual(polygonRecord(record).rings,[ring]);
const header=Buffer.alloc(100);header.writeInt32BE(9994);header.writeUInt32BE((108+record.length)/2,24);header.writeInt32LE(1000,28);header.writeInt32LE(5,32);
const envelope=Buffer.alloc(8);envelope.writeUInt32BE(1);envelope.writeUInt32BE(record.length/2,4);
const shapefile=Buffer.concat([header,envelope,record]);
assert.equal((await extractPolygons([shapefile.subarray(0,103),shapefile.subarray(103,120),shapefile.subarray(120)])).length,1);
await assert.rejects(extractPolygons([shapefile.subarray(0,-1)]));
const bad=Buffer.from(record);bad.writeDoubleLE(NaN,48);assert.throws(()=>polygonRecord(bad));

// The actual generated nationwide asset must pass integrity and independent
// known land/water examples. This is not a current-weather download.
assert.match(CURRENT_ARROW_LAND_MASK_SHA256,/^[a-f0-9]{64}$/,'A pending or absent mask must fail the gate');
{
  const bytes=await fs.readFile('data/map/current-arrow-land-mask.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),CURRENT_ARROW_LAND_MASK_SHA256);
  const actual=await readCurrentArrowLandMaskResponse(new Response(bytes),CURRENT_ARROW_LAND_MASK_SHA256,webcrypto);
  assert.equal(actual.classifyPoint([8.557403,56.823]),'land','Confirmed Thy field model point');
  assert.equal(actual.classifyPoint([10.236022,56.9915695]),'land','Confirmed Hals Sønderskov model point');
  assert.equal(actual.classifyPoint([10.2918063,56.875]),'water','Confirmed valid Dokkedal offshore model point');
  assert.equal(actual.classifyPoint([10.25642,56.85085]),'land','Original photograph approximate Tofte position; not native-source identity');
  assert.equal(actual.classifyPoint([9.32,56.93]),'land','Browser independently confirms the Vindblæs land control');
  for(const [name,point] of [['Skagen',[10.58,57.72]],['Helsingør',[12.58,56.04]],['Rønne',[14.70,55.10]],['Odense',[10.39,55.40]],['Esbjerg',[8.45,55.47]]]) assert.equal(actual.classifyPoint(point),'land',name);
  for(const [name,point] of [['North Sea',[7.8,56]],['Kattegat',[11.4,57]],['Bornholm offshore',[14.60,55.10]],['Nibe Bredning',[9.60,57.02]]]) assert.equal(actual.classifyPoint(point),'water',name);
  console.log(`OK: actual national mask ${bytes.length} bytes, checksum, confirmed inland model points, valid offshore point and national controls.`);
}
console.log('OK: land-mask geometry, corrupt/missing evidence, all current sources, parent/local/hour boundaries and streamed parser.');

// Exercise the normal installer while the real pinned mask response is delayed.
// Only Leaflet's transport adapter and the HTTP response are controlled here;
// candidate admission, checksum compilation and render callbacks are real.
const previousL=globalThis.L,previousFetch=globalThis.fetch;
let deliver,fetchCount=0;
globalThis.fetch=async()=>{fetchCount++;return new Promise(resolve=>{deliver=resolve;});};
globalThis.L={
  latLng:(lat,lng)=>({lat,lng}),divIcon:options=>options,
  marker:(position,options)=>({options,addTo(layer){layer.markers.push(this);return this;}}),
  layerGroup:()=>({markers:[],clearLayers(){this.markers=[];},addTo(map){map.visibleLayer=this;return this;}})
};
const makeMap=()=>({
  visibleLayer:null,panes:{},adds:0,getZoom:()=>8,getPane(name){return this.panes[name]||null;},
  createPane(name){return this.panes[name]={style:{}};},getBounds(){return {pad(){return this;},contains:()=>true};},
  latLngToLayerPoint(p){return {x:p.lng*1000,y:p.lat*1000,distanceTo(q){return Math.hypot(this.x-q.x,this.y-q.y);}};},
  hasLayer(layer){return this.visibleLayer===layer;},removeLayer(layer){if(this.visibleLayer===layer)this.visibleLayer=null;},on(){},off(){}
});
try {
  let currentPoint=[10.2918063,56.875];
  const condition=()=>({currentSource:'dmi-cache',flowPoints:{current:currentPoint,wind:currentPoint,sources:{current:'dmi-marine-grid'}},current:{currentDirectionDeg:177,windDirectionDeg:270}});
  const liveMap=makeMap(),discardedMap=makeMap();
  const live=installFlowArrows(liveMap,features,condition);
  const discarded=installFlowArrows(discardedMap,features,condition);
  // Use the application's actual deferred caller, not a parallel test-only
  // installer. A viewport with current but no wind must survive the mask wait.
  const appSource=await fs.readFile('app.js','utf8');
  const callerStart=appSource.indexOf('  let flowArrowAttempts=0;');
  const callerEnd=appSource.indexOf('  setTimeout(installArrows,0);',callerStart);
  assert.ok(callerStart>=0&&callerEnd>callerStart,'Actual deferred caller must be present');
  const currentOnlyMap=makeMap(),events=[],timers=[];
  const state={zones:features,conditions:{zones:{'arbitrary-zone':{
    currentSource:'dmi-cache',flowPoints:{current:[10.2918063,56.875],sources:{current:'dmi-marine-grid'}},
    current:{currentDirectionDeg:177}
  }}}};
  vm.runInNewContext(appSource.slice(callerStart,callerEnd)+'\nsetTimeout(installArrows,0);',{
    installFlowArrows,map:currentOnlyMap,state,performance:{mark(){}},console:{error(){}},
    window:{dispatchEvent(event){events.push(event);}},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    setTimeout(callback){timers.push(callback);}
  });
  timers.shift()();
  assert.ok(state.flowArrows,'Normal current-only caller must retain its loading layer');
  assert.equal(timers.length,0,'A pending coastline is not an installation error or reason for a duplicate retry');
  assert.equal(events.length,0,'A pending mask must produce neither false readiness nor failure');
  assert.equal(fetchCount,1,'Normal installers must share one pending mask request');
  assert.deepEqual(live.counts(),{wind:1,current:0},'Wind renders without waiting; current never flashes on land before admission');
  assert.equal(live.layer.ravCurrentMaskStatus,'loading');
  discarded.destroy();
  // Selection may change before the static mask arrives: use the current caller,
  // not a captured old candidate or hour.
  currentPoint=[10.236022,56.9915695];
  deliver(new Response(await fs.readFile('data/map/current-arrow-land-mask.json')));
  assert.equal(await live.ready,true);
  assert.equal(await state.flowArrows.ready,true);
  assert.deepEqual(state.flowArrows.counts(),{wind:0,current:1});
  assert.deepEqual(events.map(event=>event.type),['ravradar:flow-arrows-ready']);
  state.flowArrows.destroy();
  assert.equal(await discarded.ready,false,'Destroyed layer is never ready, even after a successful shared load');
  assert.equal(live.layer.ravCurrentMaskStatus,'ready');
  assert.deepEqual(live.counts(),{wind:1,current:0},'Late mask arrival uses the latest land coordinate');
  assert.equal(discardedMap.visibleLayer,null,'Late mask callback must not reattach a destroyed map layer');
  assert.equal(discarded.layer.markers.length,0);
  currentPoint=[10.2918063,56.875];live.refresh();
  assert.deepEqual(live.counts(),{wind:1,current:1});
  assert.deepEqual(live.layer.markers.find(row=>row.options.ravFlowMeta.type==='current').options.ravFlowMeta.point,currentPoint);
  live.destroy();
} finally {globalThis.L=previousL;globalThis.fetch=previousFetch;}
console.log('OK: normal async installer shares the mask, preserves immediate wind/latest selection and never revives a destroyed layer.');
