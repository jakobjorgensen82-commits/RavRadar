import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {registerHooks} from 'node:module';
import {copyPublicDeliveryShards} from './copy-public-delivery-shards.mjs';
import {copyPagesPublicDelivery} from './copy-pages-public-delivery.mjs';
import {buildPublicConditions,buildPublicConditionDetails,buildPublicManifest,buildPublicDeliveryDocument,compactJson} from './public-conditions-lib.mjs';
import {auditPagesArtifactPrivacy,PagesArtifactPrivacyError} from './audit-pages-artifact-privacy.mjs';
import {writeForecastShareProjection,readForecastShareProjectionFiles,copyForecastShareProjection} from './build-forecast-share-projection.mjs';
import {assertForecastShareDescriptor,assertForecastShareProjection,assertForecastShareZoneProjection,assembleForecastShareProjection,assertForecastShareProjectionParity} from '../js/services/forecast-share-projection.js';
import {loadCompactPublicForecastShareSelection,loadLegacyCompactPublicForecastShareSelection,loadPublicForecastShareSelection,loadSingleZonePublicForecastShareSelection} from '../js/services/data-service.js';
import {buildForecastShareZoneBundle, forecastShareZoneBundlePath, FORECAST_SHARE_ZONE_BUNDLE_MODULE} from '../js/services/forecast-share-zone-bundle.js';
import {exactMapZoneScore} from '../js/services/map-forecast-view.js';
import {buildReleaseContractMetadata} from './lib/release-contract-metadata.mjs';
import {handleForecastShare} from './forecast-share/handler.mjs';
import {verifyRavScoreOperationalPagesDeployment} from './verify-ravscore-operational-pages-deployment.mjs';
import {computeRavScorePublicBrowserClosure} from './lib/ravscore-public-browser-closure.mjs';
import {forecastShareUrl, FORECAST_SHARE_PAGES_BASE_URL, FORECAST_SHARE_WORKER_BASE_URL}
  from '../js/services/forecast-share-contract.js';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const text=value=>JSON.stringify(value)+'\n';
function assertForecastShareAutoOpen(body,headers,expectedUrl){
  assert.equal(headers.get('Location'),null,'The HTTP response remains the OG document');
  assert.doesNotMatch(body,/<meta[^>]+http-equiv=["']refresh/i);
  const scripts=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
  const script=scripts[0][1],digest=crypto.createHash('sha256').update(script).digest('base64');
  assert.equal(headers.get('Content-Security-Policy'),"default-src 'none'; script-src 'sha256-"+digest+"'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  const href=body.match(/<a id="ravradar-forecast" href="([^"]+)">/);assert(href);
  assert.equal(href[1].replaceAll('&amp;','&'),expectedUrl);
  const navigations=[];
  runInNewContext(script,{document:{getElementById(id){assert.equal(id,'ravradar-forecast');return {href:expectedUrl};}},
    location:{replace(url){navigations.push(url);}}},{timeout:1000});
  assert.deepEqual(navigations,[expectedUrl]);
  assert.doesNotThrow(()=>runInNewContext(script,{document:{getElementById(){return null;}},
    location:{replace(){assert.fail('Missing fallback link must not navigate');}}},{timeout:1000}));
}
const fixtureUrl=new URL('./test-ravscore-public-data-service-binding.mjs?compactShareFixture',import.meta.url).href;
const fixtureSource=(await fs.readFile(new URL('./test-ravscore-public-data-service-binding.mjs',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const sentinel="const primary = bundle('primary-integrated', 61);";
assert.equal(fixtureSource.split(sentinel).length,2);
const fixturePrefix=fixtureSource.split(sentinel)[0];
assert.equal(sha(fixturePrefix),'091f68c8be579ab7f555a0a4caeefe5159f0a2027bdd0300438b1e64d0c90014');
// The unchanged ordinary210/673 pure test fixture factory only. No product
// module, guard, model metadata or old test assertion is projected.
const factory=fixturePrefix+'\nexport {full,freshNow,horizonTimes,coastalPartsText,zoneRegistryText};\n';
const hooks=registerHooks({load(url,context,next){return url===fixtureUrl?{format:'module',source:factory,shortCircuit:true}:next(url,context);}});
let fixture;try{fixture=await import(fixtureUrl);}finally{hooks.deregister();}
const {full,freshNow,horizonTimes,coastalPartsText,zoneRegistryText}=fixture;
const source=full('compact-sharing-synthetic-national',42),availableIndex=2;
for(const zone of Object.values(source.coastalParts.zones))for(let i=0;i<zone.hourly.length;i++){
  if(i===0||i===availableIndex)continue;
  for(const mode of ['waders','beach'])zone.hourly[i][mode]={
    available:false,score:null,scoreQuality:'UNAVAILABLE',scoreBounds:null,calibrationEligible:false,
    scoreSemantics:null,conservativeTailResetApplied:false,historyCoverageHours:null,historyReasonCodes:[],
    modelBinding:source.coastalParts.modelBinding,status:'unavailable',validPartCount:0,
    expectedPartCount:zone.expectedPartCount,comparisonPartCount:0,unavailableParts:[],
    unavailability:{available:false,code:'SYNTHETIC_NO_EXACT_INPUT',messageDa:'Syntetisk prøvetime uden data.',
      policy:'integrated-model-local-fail-closed',validPartCount:0,expectedPartCount:zone.expectedPartCount},
    reasons:['Syntetisk prøvetime uden data.'],
  };

}
for(const part of Object.values(source.coastalParts.parts))part.hourly=[];
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'ravradar-share-projection-'));
const workspace=path.join(temporary,'work'),artifact=path.join(temporary,'site');
const live=path.join(workspace,'data/live'),target=path.join(artifact,'data/live');
let cases=0;const savedNow=Date.now;
try{
  await fs.mkdir(live,{recursive:true});await fs.mkdir(target,{recursive:true});
  await fs.writeFile(path.join(live,'coastal-parts-v2.json'),coastalPartsText);
  await fs.writeFile(path.join(workspace,'data/zones.geojson'),zoneRegistryText);
  const startupDocument=buildPublicConditions(source),detailDocument=buildPublicConditionDetails(source);
  const startupText=compactJson(startupDocument),detailText=compactJson(detailDocument);
  const fixtureManifest=buildPublicManifest(source,startupText,detailText,coastalPartsText,zoneRegistryText);
  fixtureManifest.detailDelivery={schemaVersion:1,forecastHours:118,sourceDetailsSha256:fixtureManifest.publicConditionDetailsSha256,hours:{},zones:{}};
  await fs.mkdir(path.join(live,'forecast'));
  async function saveDelivery(document){const body=compactJson(document),digest=sha(body);
    fixtureManifest.detailDelivery[document.delivery.kind==='hour'?'hours':'zones'][document.delivery.key]={path:'./forecast/'+digest+'.json',sha256:digest,bytes:Buffer.byteLength(body)};
    await fs.writeFile(path.join(live,'forecast',digest+'.json'),body,{flag:'wx'});}
  // Honest schema fixture for the whole artifact, not a benchmark or original
  // byte claim for the old all-hour national-ranking producer. Zone documents
  // use its normal constructor. Minimal hour documents contain the exact
  // already-public hour cells and no invented national ranking or H0 current.
  const {ravScoreRuntime:_envelope,...detailBody}=detailDocument;
  for(const time of horizonTimes){
    const parts=Object.fromEntries(Object.entries(detailDocument.coastalParts.parts).map(([id,part])=>{
      const {current,flowPoints,...metadata}=part;return[id,current?.time===time?part:metadata];}));
    await saveDelivery({...detailBody,delivery:{schemaVersion:1,kind:'hour',key:time,sourceDetailsSha256:fixtureManifest.publicConditionDetailsSha256,modelBinding:fixtureManifest.ravScoreModelBinding},
      zones:Object.fromEntries(Object.entries(detailDocument.zones).map(([id,zone])=>[id,{...zone,forecast:{...zone.forecast,hourly:zone.forecast.hourly.filter(row=>row.time===time)}}])),
      coastalParts:{...detailDocument.coastalParts,parts,zones:Object.fromEntries(Object.entries(detailDocument.coastalParts.zones).map(([id,zone])=>[id,{...zone,currentReferenceAt:time,hourly:zone.hourly.filter(row=>row.time===time)}]))}});
  }
  for(const id of Object.keys(detailDocument.zones))await saveDelivery(buildPublicDeliveryDocument(source,detailDocument,fixtureManifest,'zone',id));
  await fs.writeFile(path.join(live,'public-conditions.json'),startupText);
  await fs.writeFile(path.join(live,'public-condition-details.json'),detailText);
  await fs.writeFile(path.join(live,'manifest.json'),JSON.stringify(fixtureManifest,null,2)+'\n');
  const manifestBeforeProducer=await fs.readFile(path.join(live,'manifest.json'));
  // The normal producer already holds these same return references. Its compact
  // projection must not read/parse the large saved details file a second time.
  const originalReadFile=fs.readFile;let sharingDetailReads=0;
  try{
    fs.readFile=async function(file,...args){
      if(path.resolve(String(file))===path.resolve(live,'public-condition-details.json')){
        sharingDetailReads++;throw new Error('FORECAST_SHARE_TEST_DETAILS_REREAD');
      }
      return originalReadFile.call(this,file,...args);
    };
    await writeForecastShareProjection({repository:workspace,producerResult:{
      publicDocument:startupDocument,detailsDocument:detailDocument,manifest:fixtureManifest,
      publicText:startupText,detailsText:detailText,
    }});
  }finally{fs.readFile=originalReadFile;}
  assert.equal(sharingDetailReads,0);
  assert.deepEqual(await fs.readFile(path.join(live,'manifest.json')),manifestBeforeProducer);cases++;
  const manifestBytes=await fs.readFile(path.join(live,'manifest.json'));
  const manifest=JSON.parse(manifestBytes);
  const details=JSON.parse(await fs.readFile(path.join(live,'public-condition-details.json'),'utf8'));
  const registry=JSON.parse(zoneRegistryText);
  const files=await readForecastShareProjectionFiles({liveDirectory:live,manifestText:manifestBytes.toString('utf8'),required:true});
  assertForecastShareDescriptor(files.descriptor,manifest,sha(manifestBytes));
  assert.equal(assertForecastShareProjectionParity({projection:files.projection,descriptor:files.descriptor,manifest,details,registry}).comparisons,49560);cases++;
  // The normal active-model path and the explicit sealed-binding path must
  // agree for current data. The whole verifier target separately uses genuine594.
  const explicitBinding=manifest.ravScoreModelBinding;
  assertForecastShareDescriptor(files.descriptor,manifest,sha(manifestBytes),explicitBinding);
  assertForecastShareProjection(files.projection,files.descriptor,manifest,explicitBinding);
  assertForecastShareZoneProjection(files.zoneFiles[0].payload,files.descriptor,manifest,files.descriptor.zones[0],explicitBinding);
  assembleForecastShareProjection(files.zoneFiles.map(file=>file.payload),files.descriptor,manifest,explicitBinding);
  assert.equal(assertForecastShareProjectionParity({projection:files.projection,descriptor:files.descriptor,manifest,details,registry},explicitBinding).comparisons,49560);cases++;
  const wrongBinding={...explicitBinding,modelBundleSha256:'0'.repeat(64)};
  for(const invalidExpected of [wrongBinding,{...explicitBinding,unexpected:true},Object.fromEntries(Object.entries(explicitBinding).filter(([key])=>key!=='modelBundleSha256'))]){
    assert.throws(()=>assertForecastShareDescriptor(files.descriptor,manifest,sha(manifestBytes),invalidExpected),/binding/i);
    assert.throws(()=>assertForecastShareProjection(files.projection,files.descriptor,manifest,invalidExpected),/binding/i);
    assert.throws(()=>assertForecastShareZoneProjection(files.zoneFiles[0].payload,files.descriptor,manifest,files.descriptor.zones[0],invalidExpected),/binding/i);
    assert.throws(()=>assembleForecastShareProjection(files.zoneFiles.map(file=>file.payload),files.descriptor,manifest,invalidExpected),/binding/i);
    assert.throws(()=>assertForecastShareProjectionParity({projection:files.projection,descriptor:files.descriptor,manifest,details,registry},invalidExpected),/binding/i);cases++;
  }
  const copy=await copyPublicDeliveryShards({source:live,target});assert.equal(copy.files,750);
  for(const name of ['manifest.json','public-conditions.json','public-condition-details.json','coastal-parts-v2.json'])await fs.copyFile(path.join(live,name),path.join(target,name));
  await fs.copyFile(path.join(workspace,'data/zones.geojson'),path.join(artifact,'data/zones.geojson'));
  await fs.writeFile(path.join(artifact,'index.html'),'<!doctype html><title>Synthetic sharing artifact</title>\n');
  await fs.writeFile(path.join(artifact,'version.json'),text({version:'9.9.9',releasedAt:source.generatedAt,minimumSupportedVersion:'9.9.9',releaseContract:buildReleaseContractMetadata({releaseVersion:'9.9.9'})}));
  await fs.mkdir(path.join(artifact,'js/services'),{recursive:true});
  await fs.copyFile(new URL('../js/services/forecast-share-projection.js',import.meta.url),path.join(artifact,'js/services/forecast-share-projection.js'));
  await fs.copyFile(path.join(fileURLToPath(new URL('../',import.meta.url)),FORECAST_SHARE_ZONE_BUNDLE_MODULE),path.join(artifact,FORECAST_SHARE_ZONE_BUNDLE_MODULE));
  const privacy=await auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false});assert.ok(privacy.fileCount>=757);cases++;
  assert.equal(files.bundleFiles.length,210);
  for(const file of files.bundleFiles)assert.deepEqual(await fs.readFile(path.join(target,file.relative)),file.bytes);cases++;
  assert.deepEqual(await fs.readFile(path.join(target,'forecast-share.json')),files.descriptorBytes);
  assert.deepEqual(await fs.readFile(path.join(target,'forecast-share-trust.json')),files.trustBytes);
  for(const file of files.zoneFiles)assert.deepEqual(await fs.readFile(path.join(target,file.entry.path.slice(2))),file.bytes);cases++;
  const zoneId=files.projection.zones[0].id,time=horizonTimes[availableIndex],mode='beach';
  const selection={zoneId,time,mode,language:'da'};
  const selectedFile=files.zoneFiles.find(file=>file.entry.id===zoneId);
  const bundleRelative=forecastShareZoneBundlePath(zoneId),bundleKey='./data/live/'+bundleRelative;
  const selectedBundle=files.bundleFiles.find(file=>file.relative===bundleRelative);
  const bundlePath=path.join(target,bundleRelative);
  const zoneEntry=manifest.detailDelivery.zones[zoneId];
  const zoneBytes=await fs.readFile(path.join(live,zoneEntry.path.slice(2)));
  const available=new Map([['./data/live/manifest.json',manifestBytes],['./data/live/forecast-share.json',files.descriptorBytes],
    ['./data/live/forecast-share-trust.json',files.trustBytes], [bundleKey,selectedBundle.bytes],
    ['./data/live/'+selectedFile.entry.path.slice(2),selectedFile.bytes],
    ['./data/live/'+zoneEntry.path.slice(2),zoneBytes],['./data/zones.geojson',Buffer.from(zoneRegistryText)]]);
  const requests=[];let offline=null, missingBundle=false;Date.now=()=>freshNow;
  const fetchPublic=async(relative)=>{requests.push(relative);if(relative===offline)throw new Error('SYNTHETIC_OFFLINE');if(missingBundle&&relative===bundleKey)return new Response(null,{status:404});assert.ok(available.has(relative));return new Response(available.get(relative),{headers:{'content-type':'application/json'}});};
  const compact=await loadCompactPublicForecastShareSelection(selection,{fetchPublic});assert.equal(requests.length,2);
  const oldCompact=await loadLegacyCompactPublicForecastShareSelection(selection,{fetchPublic});
  assert.deepEqual(compact,oldCompact);assert.equal(requests.length,5);
  const legacy=await loadPublicForecastShareSelection(selection,{fetchPublic});assert.equal(requests.length,8);
  assert.deepEqual(compact,legacy);
  const normal=exactMapZoneScore({conditions:{coastalParts:details.coastalParts,mapForecastTime:time},zoneId,time,mode});
  assert.equal(compact.result.score,normal.score);assert.equal(compact.result.scoreQuality,normal.scoreQuality);cases++;
  let before=requests.length;
  assert.deepEqual(await loadSingleZonePublicForecastShareSelection(selection,{fetchPublic}),compact);
  assert.deepEqual(requests.slice(before),[bundleKey]);cases++;
  missingBundle=true;before=requests.length;
  assert.deepEqual(await loadSingleZonePublicForecastShareSelection(selection,{fetchPublic}),compact);
  assert.equal(requests.length-before,3);missingBundle=false;cases++;
  for(const alter of [
    bundle=>bundle.index.zones[0].id='wrong-zone',
    bundle=>bundle.index.axis.count=117,
    bundle=>bundle.index.publicMetadata.datasetId+='-different',
    bundle=>bundle.projectionText=bundle.projectionText.replace(selectedFile.payload.datasetId,'wrong-dataset'),
  ]){
    const malformed=JSON.parse(selectedBundle.bytes);
    alter(malformed);available.set(bundleKey,Buffer.from(JSON.stringify(malformed)));before=requests.length;
    await assert.rejects(()=>loadSingleZonePublicForecastShareSelection(selection,{fetchPublic}));
    assert.deepEqual(requests.slice(before),[bundleKey]);cases++;
  }
  available.set(bundleKey,Buffer.from('null'));before=requests.length;
  await assert.rejects(()=>loadSingleZonePublicForecastShareSelection(selection,{fetchPublic}),/FORECAST_SHARE_BUNDLE_FIELDS/);
  assert.deepEqual(requests.slice(before),[bundleKey]);cases++;
  available.set(bundleKey,selectedBundle.bytes);
  await fs.unlink(bundlePath);
  try{
    await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),
      error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('invalid or missing public forecast sharing projection'));cases++;
  }finally{await fs.writeFile(bundlePath,selectedBundle.bytes,{flag:'wx'});}
  // Site sharing uses one request and preserves the server Open Graph tags.
  for(const host of [FORECAST_SHARE_PAGES_BASE_URL, FORECAST_SHARE_WORKER_BASE_URL]){
    const transport=async url=>fetchPublic('./'+new URL(url).pathname.slice(1));
    for(const language of ['da','de','en']){
      const link=forecastShareUrl(host,{...selection,language});
      const start=requests.length;
      const get=await handleForecastShare(new Request(link),{shareBaseUrl:host,fetchPublic:transport});
      assert.equal(get.status,200);assert.equal(requests.length-start,1);
      const body=await get.text();assert(body.includes(String(normal.score)+'/100'));
      assertForecastShareAutoOpen(body,get.headers,forecastShareUrl('https://ravradar.dk/',{...selection,language}));
      const beforeHead=requests.length;
      const head=await handleForecastShare(new Request(link,{method:'HEAD'}),{shareBaseUrl:host,fetchPublic:transport});
      assert.equal(head.status,get.status);assert.deepEqual([...head.headers],[...get.headers]);
      assert.equal(await head.text(),'');assert.equal(requests.length,beforeHead,
        'HEAD må ikke hente manifest, descriptor eller scorefil');cases++;
    }
    const invalid=host+'?share=forecast&zone=bad&time=not-a-time&mode=beach&lang=da';
    const get=await handleForecastShare(new Request(invalid),{shareBaseUrl:host,fetchPublic:transport});
    const beforeHead=requests.length;
    const head=await handleForecastShare(new Request(invalid,{method:'HEAD'}),{shareBaseUrl:host,fetchPublic:transport});
    assert.equal(get.status,400);assert.equal(head.status,get.status);
    assert.doesNotMatch(await get.text(),/<script(?:\s|>)/);assert.equal(get.headers.get('Location'),null);
    assert.deepEqual([...head.headers],[...get.headers]);assert.equal(await head.text(),'');
    assert.equal(requests.length,beforeHead);cases++;
    const unbound=await handleForecastShare(new Request('https://unbound.invalid/',{method:'HEAD'}),
      {shareBaseUrl:host,fetchPublic:transport});
    assert.equal(unbound.status,503);assert.equal(requests.length,beforeHead);
    const post=await handleForecastShare(new Request(host,{method:'POST'}),{shareBaseUrl:host,fetchPublic:transport});
    assert.equal(post.status,405);assert.equal(post.headers.get('Allow'),'GET, HEAD');cases++;
  }
  offline='./data/live/forecast-share-trust.json';await assert.rejects(()=>loadCompactPublicForecastShareSelection(selection,{fetchPublic}),/SYNTHETIC_OFFLINE/);
  offline='./data/live/'+zoneEntry.path.slice(2);await assert.rejects(()=>loadPublicForecastShareSelection(selection,{fetchPublic}),/SYNTHETIC_OFFLINE/);offline=null;cases++;
  const missingHour={...selection,time:new Date(Date.parse(horizonTimes[117])+3600000).toISOString()};
  assert.equal(await loadCompactPublicForecastShareSelection(missingHour,{fetchPublic}),null);assert.equal(await loadPublicForecastShareSelection(missingHour,{fetchPublic}),null);cases++;
  const incomplete=structuredClone(files.projection);incomplete.zones[0].rows.pop();
  assert.throws(()=>assertForecastShareProjection(incomplete,files.descriptor,manifest),/FORECAST_SHARE_PROJECTION_ZONE/);cases++;
  const descriptorPath=path.join(target,'forecast-share.json'),projectionPath=path.join(target,selectedFile.entry.path.slice(2));
  const altered=structuredClone(selectedFile.payload);altered.zone.rows[availableIndex][1][1]+=1;
  const alteredBytes=Buffer.from(JSON.stringify(altered)),alteredDescriptor=structuredClone(files.descriptor);
  const entryIndex=alteredDescriptor.zones.findIndex(entry=>entry.id===zoneId);
  alteredDescriptor.zones[entryIndex]={id:zoneId,path:'./share/'+sha(alteredBytes)+'.json',sha256:sha(alteredBytes),bytes:alteredBytes.length};
  const alteredPath=path.join(target,alteredDescriptor.zones[entryIndex].path.slice(2));
  assert.equal(sha(await fs.readFile(projectionPath)),selectedFile.entry.sha256);await fs.unlink(projectionPath);
  try{await fs.writeFile(alteredPath,alteredBytes,{flag:'wx'});await fs.writeFile(descriptorPath,text(alteredDescriptor));
    const changedIndex={...files.trustIndex,zones:alteredDescriptor.zones};
    await fs.writeFile(path.join(target,'forecast-share-trust.json'),text(changedIndex));
    await fs.writeFile(bundlePath,JSON.stringify(buildForecastShareZoneBundle(changedIndex,alteredDescriptor.zones[entryIndex],alteredBytes.toString('utf8'))));
    await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('public forecast sharing results differ from normal public results'));cases++;
  }finally{await fs.unlink(alteredPath);await fs.writeFile(projectionPath,selectedFile.bytes,{flag:'wx'});await fs.writeFile(descriptorPath,files.descriptorBytes);await fs.writeFile(path.join(target,'forecast-share-trust.json'),files.trustBytes);await fs.writeFile(bundlePath,selectedBundle.bytes);}
  await fs.unlink(descriptorPath);try{await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('invalid or missing public forecast sharing projection'));cases++;}
  finally{await fs.writeFile(descriptorPath,files.descriptorBytes,{flag:'wx'});}
  const copied=await copyForecastShareProjection({source:live,target:path.join(temporary,'share-only')});assert.equal(copied.files,422);
  const pagesOnly=path.join(temporary,'pages-copy');await fs.mkdir(pagesOnly);
  const pagesCopy=await copyPagesPublicDelivery({source:live,target:pagesOnly});
  assert.equal(pagesCopy.files,750);
  assert.deepEqual(await fs.readFile(path.join(pagesOnly,'forecast-share-trust.json')),files.trustBytes);
  for(const file of files.zoneFiles)assert.deepEqual(await fs.readFile(path.join(pagesOnly,file.entry.path.slice(2))),file.bytes);cases++;
  // The actual normal hosted verifier reads the new index only for its
  // sealed implementation importing the real trust-contract module.
  const root=fileURLToPath(new URL('../',import.meta.url));
  const closure=(await computeRavScorePublicBrowserClosure({root})).manifest;
  assert(closure.files.some(item=>item.path==='js/services/forecast-share-trust-index.js'));
  assert(closure.files.some(item=>item.path===FORECAST_SHARE_ZONE_BUNDLE_MODULE));
  const sourceFiles=new Set([...closure.files.map(item=>item.path),...closure.htmlEntrypoints.map(item=>item.path)]);
  const common={baseUrl:'https://ravradar.example.test/',sourceHead:'45e943c9a53a27ceefc2773d4a83ee80c4b41b8a',
    expectedManifest:manifest,expectedModel:'integrated',expectedBinding:manifest.ravScoreModelBinding,
    expectedContractText:await fs.readFile(path.join(root,'js/core/ravscore-model-contract.js'),'utf8'),
    expectedBundleText:await fs.readFile(path.join(root,'js/core/ravscore-model-bundle.generated.js'),'utf8'),
    expectedPublicClosure:closure,observationNonce:'synthetic-trust-index-normal-artifact',attempts:1};
  let omitHostedTrust=false,omitHostedBundle=false;const hostedReads=[];
  const hosted=async value=>{const relative=new URL(value).pathname.slice(1);hostedReads.push(relative);
    if(omitHostedTrust&&relative==='data/live/forecast-share-trust.json')return new Response('',{status:404});
    if(omitHostedBundle&&relative==='data/live/'+bundleRelative)return new Response('',{status:404});
    const file=path.join(sourceFiles.has(relative)?root:artifact,relative);
    return new Response(await fs.readFile(file),{headers:{'Content-Type':'application/json'}});};
  assert.equal((await verifyRavScoreOperationalPagesDeployment({...common,fetchImpl:hosted})).status,'passed');
  assert(hostedReads.includes('data/live/forecast-share-trust.json'));
  assert.equal(hostedReads.filter(name=>name.startsWith('data/live/forecast-share-zones/')).length,210);cases++;
  omitHostedBundle=true;
  await assert.rejects(()=>verifyRavScoreOperationalPagesDeployment({...common,fetchImpl:hosted}),/forecast-share-zones\/.* returned HTTP 404/);cases++;
  omitHostedBundle=false;
  omitHostedTrust=true;
  await assert.rejects(()=>verifyRavScoreOperationalPagesDeployment({...common,fetchImpl:hosted}),/forecast-share-trust.json returned HTTP 404/);cases++;
  // The new trust view is admitted independently against the WHOLE manifest;
  // coherent metadata/zone-pointer tampering cannot qualify its own authority.
  const trustPath=path.join(target,'forecast-share-trust.json');
  for(const change of [v=>v.publicMetadata.ravScoreEvidenceTrust={},v=>v.publicMetadata.datasetId+='-other',
    v=>v.manifestSha256='0'.repeat(64),v=>v.zones.pop()]){
    const value=structuredClone(files.trustIndex);change(value);await fs.writeFile(trustPath,text(value));
    await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),
      error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('invalid or missing public forecast sharing projection'));cases++;
  }
  await fs.writeFile(trustPath,files.trustBytes);
  await auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false});cases++;
  const trustKey='./data/live/forecast-share-trust.json';
  for(const change of [v=>v.publicMetadata.ravScoreModelBinding.modelBundleSha256='0'.repeat(64),
    v=>v.publicMetadata.ravScoreEvidenceTrust={},v=>v.publicMetadata.weatherSourceAge={},
    v=>v.publicMetadata.ravScoreProfile={},v=>v.publicMetadata.ravScoreRuntime={},
    v=>v.publicMetadata.ravScoreAvailability={},v=>v.publicMetadata.validUntil=source.productionReferenceAt,
    v=>v.publicMetadata.generatedAt=new Date(freshNow+3600000).toISOString(),
    v=>v.axis.count=117,v=>v.zones.pop(),v=>v.publicMetadata.unexpected='PRIVATE_MARKER',
    v=>v.zones[0].path='https://forged.invalid/score']){
    const value=structuredClone(files.trustIndex);change(value);available.set(trustKey,Buffer.from(text(value)));
    await assert.rejects(()=>loadCompactPublicForecastShareSelection(selection,{fetchPublic}));cases++;
  }
  available.set(trustKey,files.trustBytes);
  // Dataset/H0/source digests are also checked against the content-addressed
  // selected zone, rather than accepting a self-consistent index alone.
  for(const change of [v=>v.publicMetadata.datasetId+='-mixed',v=>v.publicMetadata.zoneRegistrySha256='0'.repeat(64)]){
    const value=structuredClone(files.trustIndex);change(value);available.set(trustKey,Buffer.from(text(value)));
    await assert.rejects(()=>loadCompactPublicForecastShareSelection(selection,{fetchPublic}),/FORECAST_SHARE_PROJECTION_GENERATION|FORECAST_SHARE_PROJECTION_BINDING/);cases++;
  }
  available.set(trustKey,files.trustBytes);
  const originalTime=Date.now;let zoneSeen=false;
  try{Date.now=()=>zoneSeen?freshNow+3*3600000:freshNow;
    assert.equal(await loadCompactPublicForecastShareSelection(selection,{fetchPublic:async p=>{const response=await fetchPublic(p);if(p.includes('/share/'))zoneSeen=true;return response;}}),null);cases++;
  }finally{Date.now=originalTime;}cases++;
  console.log('OK: compact sharing normal producer, full210/673 synthetic contract artifact/privacy/copy,49,560 parity, both readers, offline/hour and coherent tamper guards ('+cases+' cases).');
}finally{Date.now=savedNow;const resolved=path.resolve(temporary),parent=path.resolve(os.tmpdir());assert.ok(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('ravradar-share-projection-'));await fs.rm(resolved,{recursive:true,force:true});}
