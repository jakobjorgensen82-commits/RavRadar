import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {registerHooks} from 'node:module';
import {copyPublicDeliveryShards} from './copy-public-delivery-shards.mjs';
import {buildPublicConditions,buildPublicConditionDetails,buildPublicManifest,buildPublicDeliveryDocument,compactJson} from './public-conditions-lib.mjs';
import {auditPagesArtifactPrivacy,PagesArtifactPrivacyError} from './audit-pages-artifact-privacy.mjs';
import {writeForecastShareProjection,readForecastShareProjectionFiles,copyForecastShareProjection} from './build-forecast-share-projection.mjs';
import {assertForecastShareDescriptor,assertForecastShareProjection,assertForecastShareProjectionParity} from '../js/services/forecast-share-projection.js';
import {loadCompactPublicForecastShareSelection,loadPublicForecastShareSelection} from '../js/services/data-service.js';
import {exactMapZoneScore} from '../js/services/map-forecast-view.js';
import {buildReleaseContractMetadata} from './lib/release-contract-metadata.mjs';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const text=value=>JSON.stringify(value)+'\n';
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
  const copy=await copyPublicDeliveryShards({source:live,target});assert.equal(copy.files,539);
  for(const name of ['manifest.json','public-conditions.json','public-condition-details.json','coastal-parts-v2.json'])await fs.copyFile(path.join(live,name),path.join(target,name));
  await fs.copyFile(path.join(workspace,'data/zones.geojson'),path.join(artifact,'data/zones.geojson'));
  await fs.writeFile(path.join(artifact,'index.html'),'<!doctype html><title>Synthetic sharing artifact</title>\n');
  await fs.writeFile(path.join(artifact,'version.json'),text({version:'9.9.9',releasedAt:source.generatedAt,minimumSupportedVersion:'9.9.9',releaseContract:buildReleaseContractMetadata({releaseVersion:'9.9.9'})}));
  await fs.mkdir(path.join(artifact,'js/services'),{recursive:true});
  await fs.copyFile(new URL('../js/services/forecast-share-projection.js',import.meta.url),path.join(artifact,'js/services/forecast-share-projection.js'));
  const privacy=await auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false});assert.ok(privacy.fileCount>=546);cases++;
  assert.deepEqual(await fs.readFile(path.join(target,'forecast-share.json')),files.descriptorBytes);
  for(const file of files.zoneFiles)assert.deepEqual(await fs.readFile(path.join(target,file.entry.path.slice(2))),file.bytes);cases++;
  const zoneId=files.projection.zones[0].id,time=horizonTimes[availableIndex],mode='beach';
  const selection={zoneId,time,mode,language:'da'};
  const selectedFile=files.zoneFiles.find(file=>file.entry.id===zoneId);
  const zoneEntry=manifest.detailDelivery.zones[zoneId];
  const zoneBytes=await fs.readFile(path.join(live,zoneEntry.path.slice(2)));
  const available=new Map([['./data/live/manifest.json',manifestBytes],['./data/live/forecast-share.json',files.descriptorBytes],
    ['./data/live/'+selectedFile.entry.path.slice(2),selectedFile.bytes],
    ['./data/live/'+zoneEntry.path.slice(2),zoneBytes],['./data/zones.geojson',Buffer.from(zoneRegistryText)]]);
  const requests=[];let offline=null;Date.now=()=>freshNow;
  const fetchPublic=async(relative)=>{requests.push(relative);if(relative===offline)throw new Error('SYNTHETIC_OFFLINE');assert.ok(available.has(relative));return new Response(available.get(relative),{headers:{'content-type':'application/json'}});};
  const compact=await loadCompactPublicForecastShareSelection(selection,{fetchPublic});assert.equal(requests.length,3);
  const legacy=await loadPublicForecastShareSelection(selection,{fetchPublic});assert.equal(requests.length,6);
  assert.deepEqual(compact,legacy);
  const normal=exactMapZoneScore({conditions:{coastalParts:details.coastalParts,mapForecastTime:time},zoneId,time,mode});
  assert.equal(compact.result.score,normal.score);assert.equal(compact.result.scoreQuality,normal.scoreQuality);cases++;
  offline='./data/live/forecast-share.json';await assert.rejects(()=>loadCompactPublicForecastShareSelection(selection,{fetchPublic}),/SYNTHETIC_OFFLINE/);
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
    await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('public forecast sharing results differ from normal public results'));cases++;
  }finally{await fs.unlink(alteredPath);await fs.writeFile(projectionPath,selectedFile.bytes,{flag:'wx'});await fs.writeFile(descriptorPath,files.descriptorBytes);}
  await fs.unlink(descriptorPath);try{await assert.rejects(()=>auditPagesArtifactPrivacy(artifact,{requirePrivateManifest:false}),error=>error instanceof PagesArtifactPrivacyError&&error.issues.includes('invalid or missing public forecast sharing projection'));cases++;}
  finally{await fs.writeFile(descriptorPath,files.descriptorBytes,{flag:'wx'});}
  const copied=await copyForecastShareProjection({source:live,target:path.join(temporary,'share-only')});assert.equal(copied.files,211);cases++;
  console.log('OK: compact sharing normal producer, full210/673 synthetic contract artifact/privacy/copy,49,560 parity, both readers, offline/hour and coherent tamper guards ('+cases+' cases).');
}finally{Date.now=savedNow;const resolved=path.resolve(temporary),parent=path.resolve(os.tmpdir());assert.ok(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('ravradar-share-projection-'));await fs.rm(resolved,{recursive:true,force:true});}
