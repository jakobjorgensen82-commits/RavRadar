import { inverseAlternativeCCaller } from './lib/alternative-c-caller-test-input.mjs';
import { inverseArchivedWeatherRestartUpdater, inverseWeatherExportMemoryUpdater,
 WEATHER_EXPORT_MEMORY_UPDATER_REVIEW, inverseCurrentNativeOriginalProducerTestInput,
 CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW,
 inverseCurrentFamilyColdTargetTestInput, inverseFinalizedWeatherOwnersTestInput, inverseWindTailCapacityUpdaterTestInput,
 FINALIZED_WEATHER_OWNERS_TEST_REVIEW } from './lib/archived-weather-restart-updater-test-input.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';
import { buildRavScoreProductionPartSeries } from './lib/ravscore-production-part-pipeline.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import { createWeatherComponentSelectionHistory } from './lib/weather-component-selection-history.mjs';
import { persistWeatherComponentSelections } from './lib/weather-component-runtime.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const HOUR_MS=3_600_000, base=Date.parse('2026-08-29T00:00:00.000Z');
const time=hour=>new Date(base+hour*HOUR_MS).toISOString();
const vectorSelection='nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
const source=await fs.readFile(path.join(ROOT,'scripts/test-weather-state-epoch-input-view.mjs'),'utf8');
const start='async function syntheticNewFactory(',end='async function ownedTemporary(';
assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
const factorySource=source.slice(source.indexOf(start),source.indexOf(end));
const makeRows=await new Function('assert','fs','path','ROOT','hash','inspectDmiForecastGridSampling','dmiExpectedIdentityForPart','time','HOUR_MS','vectorSelection',
  'return ('+factorySource+');')(assert,fs,path,ROOT,hash,inspectDmiForecastGridSampling,dmiExpectedIdentityForPart,time,HOUR_MS,vectorSelection)();
const part={partId:'PRIVATE_SENTINEL_PART',zoneId:'SYNTHETIC-ZONE',parentZoneId:'SYNTHETIC-ZONE',
  landPoint:[7.99,55],waterPoint:[8,55],onshoreDirectionDeg:90};
const zone={id:part.zoneId,onshoreDirectionDeg:90},holeAt=time(-14),targetAt=time(11),initialAt=time(10);
const withoutCurrent=row=>{const copy=structuredClone(row);for(const key of ['currentSpeedMps','currentDirectionDeg','currentUMps','currentVMps','currentCoastNormalSpeedMps','currentProvenance'])delete copy[key];return copy;};
function fixture(){
 const complete=makeRows(part,{startHour:-38,hourCount:50,weatherOptions:{speed:0.09}});
 const partial=complete.map(row=>row.time===holeAt?withoutCurrent(row):structuredClone(row));
 const initial=buildRavScoreProductionPartSeries({part,zone,initialSelection:{state:null,source:'COLD_START',rejectedSources:[],
  candidateGSourceDisposition:'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY'},targetReferenceAt:initialAt,
  recoverySources:[{source:'synthetic-own-new-native',record:{point:part.waterPoint,hourly:partial.filter(row=>row.time<initialAt)}}],
  publicHourly:partial.filter(row=>row.time===initialAt),requireNativeGridSampling:true,candidateGRollbackMeasuredColdStart:true});
 const options={part,zone,initialSelection:{state:initial.ravScoreState.continuationState,source:'EXISTING_INTEGRATED'},
  previousCandidateGContinuation:initial.candidateGState.continuationState,
  candidateGRollbackMeasuredWarmupContinuation:true,targetReferenceAt:targetAt,
  recoverySources:[{source:'synthetic-own-new-native',record:{point:part.waterPoint,hourly:partial.filter(row=>row.time<targetAt)}}],
  publicHourly:partial.filter(row=>row.time===targetAt),requireNativeGridSampling:true,nativeCadenceHoldHours:0,liveCurrentPilot:null};
 return{options,complete};
}
function diagnose(options){
 const before=JSON.stringify(options),value=summarizeRavScoreInitialCurrentWindow(options);
 assert.equal(JSON.stringify(options),before,'diagnostic must not rewrite normal inputs');
 const text=JSON.stringify(value);
 for(const forbidden of ['PRIVATE_SENTINEL_PART','2026-08-','currentUMps','currentVMps','0.09','samplingPoint','contentSha256'])
  assert.equal(text.includes(forbidden),false,forbidden+' must not leave the projection');
 assert.equal(value.productionAuthority,false);assert.equal(value.continuationIssued,false);
 return value;
}
test('diagnostic source delta preserves every genuine historical updater oracle',async()=>{
 let updater=(await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replace(/\r\n/g,'\n');
 updater=inverseAlternativeCCaller(updater,'scripts/update-weather.mjs');
 const oracle=(await fs.readFile(path.join(ROOT,'scripts/test-weather-update-entrypoint.mjs'),'utf8')).replace(/\r\n/g,'\n');
 const begin=oracle.indexOf('function inverseWeatherStateEpochIntegration(source) {');
 const end=oracle.indexOf('\n// Test-only inverse of the NEW explicit OLD-original donor integration.',begin);
 assert(begin>=0&&end>begin);
 const dependencyBegin=oracle.indexOf('const establishedNativeCurrentUpdaterHunks = [');
 assert(dependencyBegin>=0&&dependencyBegin<begin);
 const dependencies=oracle.slice(dependencyBegin,begin),epochInverse=oracle.slice(begin,end).trim();
 // The old mutation oracles run on their genuine full608b input. Their exact
 // strings must not silently become no-ops inside a newer diagnostic wrapper.
 updater=new Function('assert','digest',dependencies+'\nreturn inverseSavedCurrentReplayUpdater;')(assert,hash)(updater);
 const inverse=new Function('assert','digest',dependencies+epochInverse+'\nreturn inverseWeatherStateEpochIntegration;')(assert,hash);
 const positiveOrigin=new Function('assert','digest',dependencies+'\nreturn {inverse:inverseEstablishedNativeCurrentUpdater,hunks:establishedNativeCurrentUpdaterHunks};')(assert,hash);
 assert.equal(hash(inverse(updater)),'62bbe6eb4325dcba05afb922028150a9bdf7c45f2ebd7a7e975d85f3941d6288');
 // Preserve every old diagnostic mutation oracle at its exact historical layer.
 // Removing ONLY the new test-helper call restores the WHOLE genuine d7 helper.
 const originCall='  source = inverseEstablishedNativeCurrentUpdater(source);\n';
 assert.equal(epochInverse.split(originCall).length,2);
 const historicalEpochInverse=epochInverse.replace(originCall,'');
 assert.equal(hash(historicalEpochInverse),'fcb8fe5572739c599e54a7825966620a94c7fdcd3afac98505ba5986bbf65258');
 const historicalInverse=new Function('assert','digest','return ('+historicalEpochInverse+');')(assert,hash);
 const preOriginUpdater=positiveOrigin.inverse(updater);
 assert.equal(hash(preOriginUpdater),'c360d7c6370b6ff4078ce94e306478bd3f5e38fdda90d4006f3e4329c976458c');
 for(const hunk of positiveOrigin.hunks)
  assert.throws(()=>inverse(updater.replace(hunk.after,()=>hunk.before)),/exact reviewed positive-origin hunk/);
 {
 const updater=preOriginUpdater,inverse=historicalInverse;
 const importLine="import { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\n";
 for(const changed of [updater.replace(importLine,''),updater.replace(importLine,importLine+importLine),
  updater.replace('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT_UNAVAILABLE','UNREVIEWED_DIAGNOSTIC')]){
  assert.notEqual(changed,updater);
  assert.throws(()=>inverse(changed),/exact reviewed current-window diagnostic hunk/);
 }
 }
 assert.throws(()=>inverse(updater+'// unrelated source drift\n'),/genuine 903307 updater/);
});
test('memory-export caller delta has an exact genuine954 inverse before every historical source oracle',async()=>{
 const current=inverseCurrentFamilyColdTargetTestInput((await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replace(/\r\n/g,'\n'),'scripts/update-weather.mjs');
 const nativeOriginalReview=CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW.rows.find(row=>row.path==='scripts/update-weather.mjs');
 assert(nativeOriginalReview);
 assert.equal(hash(current),nativeOriginalReview.after.sha256,'actual final native-original updater before this historical memory oracle');
 assert.equal(Buffer.byteLength(current),nativeOriginalReview.after.bytes);
 const actual=inverseCurrentNativeOriginalProducerTestInput(current,'scripts/update-weather.mjs');
 const row=WEATHER_EXPORT_MEMORY_UPDATER_REVIEW;
 assert.equal(hash(actual),row.after.sha256,'whole genuine memory-era updater before unchanged memory/archive/C oracles');
 assert.equal(Buffer.byteLength(actual),row.after.bytes);
 assert.equal(row.hunks.length,5);
 const genuine954=inverseWeatherExportMemoryUpdater(actual);
 assert.equal(hash(genuine954),'6978aaa62fd8126f460913ed9ee428e4cb6da8f146bcf4146d6ee69e170f88a6');
 assert.equal(Buffer.byteLength(genuine954),243322);
 assert.equal(inverseWeatherExportMemoryUpdater(genuine954),genuine954);
 assert.equal(inverseArchivedWeatherRestartUpdater(actual),inverseArchivedWeatherRestartUpdater(genuine954));
 assert.equal(inverseAlternativeCCaller(actual,'scripts/update-weather.mjs'),
  inverseAlternativeCCaller(genuine954,'scripts/update-weather.mjs'));
 for(const [before,after] of row.hunks){
  assert.equal(actual.split(after).length,2,'each new reviewed hunk occurs exactly once');
  for(const changed of [actual.replace(after,()=>before),actual.replace(after,()=>after+after),
   actual.replace(after,()=>after+'\n// changed reviewed memory hunk')]){
   assert.notEqual(changed,actual);
   assert.throws(()=>inverseWeatherExportMemoryUpdater(changed),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
   assert.throws(()=>inverseArchivedWeatherRestartUpdater(changed),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
   assert.throws(()=>inverseAlternativeCCaller(changed,'scripts/update-weather.mjs'),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
 }
 assert.throws(()=>inverseWeatherExportMemoryUpdater(actual+'// unrelated source drift\n'),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
 assert.throws(()=>inverseArchivedWeatherRestartUpdater(actual+'// unrelated source drift\n'),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('archive restart updater inverse preserves all old oracles and rejects every changed hunk',async()=>{
 const actual=inverseWeatherExportMemoryUpdater((await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replace(/\r\n/g,'\n'));
 const row=JSON.parse(await fs.readFile(path.join(ROOT,'scripts/lib/archived-weather-restart-updater-test-input.json'),'utf8'));
 assert.equal(hash(actual),'6978aaa62fd8126f460913ed9ee428e4cb6da8f146bcf4146d6ee69e170f88a6');
 assert.equal(row.hunks.length,10);
 const historical=inverseArchivedWeatherRestartUpdater(actual);
 assert.equal(hash(historical),'039ac65c779fe3eb8dbc870c00b0af30b33f9333c7cd542492ee40595c6eac77');
 assert.equal(inverseArchivedWeatherRestartUpdater(historical),historical);
 for(const [before,after] of row.hunks){
  assert.equal(actual.split(after).length,2);
  for(const changed of [actual.replace(after,()=>before),actual.replace(after,()=>after+after)]){
   assert.notEqual(changed,actual);
   assert.throws(()=>inverseArchivedWeatherRestartUpdater(changed),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
 }
 assert.throws(()=>inverseArchivedWeatherRestartUpdater(actual+'// unrelated drift\n'),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('current-family updater inverse preserves the genuine input and refuses every changed C hunk',async()=>{
 const current=(await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replace(/\r\n/g,'\n');
 const actual=inverseArchivedWeatherRestartUpdater(current);
 const review=(await fs.readFile(path.join(ROOT,'scripts/lib/alternative-c-caller-test-input.mjs'),'utf8')).replace(/\r\n/g,'\n');
 const begin=review.indexOf('const SOURCE_INPUTS=')+'const SOURCE_INPUTS='.length;
 const end=review.indexOf(';\nconst digest=',begin);
 assert(begin>='const SOURCE_INPUTS='.length&&end>begin);
 const row=JSON.parse(review.slice(begin,end)).find(item=>item.path==='scripts/update-weather.mjs');
 assert(row);
 assert.equal(hash(actual),row.after.sha256,'genuine whole C caller is the mutation input');
 const historical=inverseAlternativeCCaller(actual,row.path);
 assert.equal(hash(historical),row.before.sha256,'whole inverse restores the unmodified genuine predecessor');
 assert.equal(inverseAlternativeCCaller(historical,row.path),historical);
 for(const [before,after] of row.hunks){
  assert.equal(actual.split(after).length,2,'each reviewed C hunk occurs exactly once');
  for(const changed of [actual.replace(after,()=>before),actual.replace(after,()=>after+after)]){
   assert.notEqual(changed,actual);
   assert.throws(()=>inverseAlternativeCCaller(changed,row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
 }
 assert.throws(()=>inverseAlternativeCCaller(actual+'// unrelated source drift\n',row.path),/ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('normal updater fixed diagnostic catch emits safe categories and preserves original error',async()=>{
 const updater=await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8');
 const begin="        if (error?.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY') {";
 const finish="        if (error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT'";
 assert.equal(updater.split(begin).length,2,'normal updater must have exactly one fixed diagnostic caller');
 const at=updater.indexOf(begin),until=updater.indexOf(finish,at);
 assert(until>at);
 const block=updater.slice(at,until),{options,complete}=fixture();
 options.recoverySources[0].record.hourly=complete.filter(row=>row.time<targetAt);
 const original=Object.assign(new Error('RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY'),{code:'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY'}),logged=[];
 const invoke=new Function('error','summarizeRavScoreInitialCurrentWindow','part','zoneId','zone','initialSelection',
  'previousCandidateGContinuation','recoverySources','liveCurrentPilot','nativeCadenceHoldHours','console',block+'\nthrow error;');
 assert.throws(()=>invoke(original,summarizeRavScoreInitialCurrentWindow,part,part.zoneId,zone,options.initialSelection,
  options.previousCandidateGContinuation,options.recoverySources,null,0,{error:value=>logged.push(value)}),error=>error===original);
 assert.equal(logged.length,1);
 assert(logged[0].startsWith('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT '));
 const report=JSON.parse(logged[0].slice('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT '.length));
 assert.equal(report.status,'COMPARED');assert.equal(report.sameWindowGuardMatches,false);
 assert.equal(report.integrated.evidence.unknownToKnownCount,1);assert.equal(report.candidateG.evidence.unknownToKnownCount,1);
 assert(updater.slice(until).includes('        throw error;'),'normal catch must retain original throw');
});
test('normal incomplete follower matches an unchanged admitted history',()=>{
 const{options}=fixture();assert.doesNotThrow(()=>buildRavScoreProductionPartSeries(options));
 const value=diagnose(options);assert.equal(value.status,'COMPARED');assert.equal(value.sameWindowGuardMatches,true);
 for(const model of [value.integrated,value.candidateG]){assert.equal(model.category,'SAME_WINDOW');assert.equal(model.evidence.nullMaskMismatchAtSameTimeCount,0);}
});
test('normal new valid input filling a saved hole is reported without excusing the existing guard',()=>{
 const{options,complete}=fixture();options.recoverySources[0].record.hourly=complete.filter(row=>row.time<targetAt);
 assert.throws(()=>buildRavScoreProductionPartSeries(options),error=>error.code==='RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
 const value=diagnose(options);assert.equal(value.status,'COMPARED');assert.equal(value.sameWindowGuardMatches,false);
 for(const model of [value.integrated,value.candidateG]){assert.equal(model.category,'NEW_VALID_EVIDENCE_FILLS_SAVED_UNKNOWN');
  assert.equal(model.evidence.unknownToKnownCount,1);assert.equal(model.evidence.knownToUnknownCount,0);
  assert.equal(model.metadata.MemoryReady,'FALSE_TO_TRUE');assert.equal(model.metadata.MemoryCoverageHours,'INCREASED');}
 assert.equal(value.savedPairNativeGridOrigin,'NOT_ESTABLISHED_BY_COMPACT_STATE');
});
test('normal loss of an admitted known time is separately reported',()=>{
 const{options}=fixture();options.recoverySources[0].record.hourly=options.recoverySources[0].record.hourly.map(row=>row.time===time(-13)?withoutCurrent(row):row);
 assert.throws(()=>buildRavScoreProductionPartSeries(options),error=>error.code==='RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
 const value=diagnose(options);assert.equal(value.status,'COMPARED');
 for(const model of [value.integrated,value.candidateG]){assert.equal(model.category,'SAVED_KNOWN_BECOMES_UNKNOWN');assert.equal(model.evidence.knownToUnknownCount,1);}
 // The integrated interval was already bounded unknown next to the old hole;
 // Candidate G measures the exact verified suffix. Do not equate these metrics.
 assert.equal(value.integrated.metadata.MemoryCoverageHours,'SAME');
 assert.equal(value.candidateG.metadata.MemoryCoverageHours,'DECREASED');
});
test('missing native sampling produces unavailable, never a weaker reconstruction',()=>{
 const{options}=fixture(),row=options.recoverySources[0].record.hourly.find(row=>row.time===time(-13));
 delete row.currentProvenance.nativeGridSampling;for(const step of row.currentProvenance.nativeSteps)delete step.nativeGridSampling;
 const value=diagnose(options);assert.equal(value.status,'UNAVAILABLE');assert.equal(value.phase,'STRICT_CURRENT_HISTORY');
 assert.equal(value.fallbackPerformed,false);assert.equal(Object.hasOwn(value,'integrated'),false);
});
test('missing exact native hold support produces unavailable with no fabricated report',()=>{
 const{options}=fixture();options.recoverySources[0].record.hourly.find(row=>row.time===holeAt).currentStateOnlyHold={schemaVersion:1,kind:'INVALID_SYNTHETIC_HOLD'};
 const value=diagnose(options);assert.equal(value.status,'UNAVAILABLE');assert.equal(value.fallbackPerformed,false);
 assert.equal(Object.hasOwn(value,'integrated'),false);
});

test('finished-owner inverse restores exact d957 and retains every historical updater oracle',async()=>{
 const current=inverseWindTailCapacityUpdaterTestInput((await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replaceAll('\r\n','\n'),'scripts/update-weather.mjs');
 const row=FINALIZED_WEATHER_OWNERS_TEST_REVIEW,relative=row.path;
 assert.equal(Buffer.byteLength(current),row.after.bytes);assert.equal(hash(current),row.after.sha256);
 const genuine=inverseFinalizedWeatherOwnersTestInput(current,relative);
 assert.equal(Buffer.byteLength(genuine),250473);
 assert.equal(hash(genuine),'15b4ab43f32d11d935546a1a6e7d8545f242d25927d3e4077bec60a87eea4d14');
 assert.equal(inverseFinalizedWeatherOwnersTestInput(genuine,relative),genuine);
 const oldReaders=[
  value=>inverseCurrentFamilyColdTargetTestInput(value,relative),
  value=>inverseCurrentNativeOriginalProducerTestInput(value,relative),
  inverseWeatherExportMemoryUpdater,inverseArchivedWeatherRestartUpdater,
  value=>inverseAlternativeCCaller(value,relative),
 ];
 for(const reader of oldReaders)assert.equal(reader(current),reader(genuine));
 for(const [before,after] of row.hunks){
  assert.equal(current.split(after).length,2);
  for(const changed of [current.replace(after,()=>before),current.replace(after,()=>after+after),
   current.replace(after,()=>after+'\n// changed finalized-owner hunk')]){
   assert.notEqual(changed,current);
   assert.throws(()=>inverseFinalizedWeatherOwnersTestInput(changed,relative),/FINALIZED_WEATHER_OWNERS_/);
   for(const reader of oldReaders)assert.throws(()=>reader(changed));
  }
 }
 for(const changed of [current+'// unrelated drift\n',current.replace('weatherComponents = null;','weatherComponents = undefined;')])
  assert.throws(()=>inverseFinalizedWeatherOwnersTestInput(changed,relative),/FINALIZED_WEATHER_OWNERS_/);
});

test('actual final caller releases all673 owners only after durable selection and awaited origin',async t=>{
 const current=(await fs.readFile(path.join(ROOT,'scripts/update-weather.mjs'),'utf8')).replaceAll('\r\n','\n');
 const old=inverseFinalizedWeatherOwnersTestInput(current,'scripts/update-weather.mjs');
 const begin='output.coastalParts = coastalPartScoreBuild?.integratedRuntime',
  end="reportWeatherBuildStage('current-origin-ready');";
 const body=source=>{
  assert.equal(source.split(begin).length,2);assert.equal(source.split(end).length,2);
  return source.slice(source.indexOf(begin),source.indexOf(end)+end.length);
 };
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const run=source=>new AsyncFunction('scope',`
  let {weatherComponents,coastalPartScoreBuild}=scope;
  const {output,coastalPartsContract,generatedAt,buildFurWaterRoutingDiagnostic,
   ravScoreModelBinding,candidateGRollbackModelBinding,CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
   CANDIDATE_G_MEASURED_WARMUP_STATUS,CANDIDATE_G_MEASURED_WARMUP_EVIDENCE_POLICY,
   persistWeatherComponentSelections,enrichCurrentProvenanceDocuments,dmiBulkCache,
   nextDmiForecastStore,writeDmiForecastStoreCheckpoint,console,establishedNativeCurrentOrigin,
   buildEstablishedNativeCurrentOriginAttestation,reportWeatherBuildStage}=scope;
  scope.inspect=()=>({weatherComponents,coastalPartScoreBuild});
  try { ${body(source)};return {error:null,...scope.inspect()}; }
  catch(error){return {error,...scope.inspect()};}
 `);
 const actual=run(current),historical=run(old);
 const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};
 for(const route of ['ordinary','cold'])for(const failure of [null,'persist','origin']){
  await t.test(`${route}/${failure??'success'}`,async()=>{
   const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rr-finished-owners-'));
   try{
    const execute=async(invoke,retires)=>{
     const ids=Array.from({length:673},(_,i)=>`CALLER-LIFETIME-${i}`);
     const parts=ids.map(partId=>({partId,zoneId:'CALLER-LIFETIME-ZONE',waterPoint:[8,55]}));
     // Synthetic data exercise only this caller's ownership/await boundaries.
     // Neither these route labels nor the injected consumer mint origin or
     // numeric authority; genuine origin/model validators are unchanged.
     const projections=Object.fromEntries(ids.map((id,i)=>[id,{score:i%101,
      continuation:{time:targetAt,retainedValue:i}}]));
     const resultOwners=new Map(ids.map(id=>[id,{scores:[projections[id]],
      recovery:{hourly:[{time:targetAt,unsharedWorkingValue:id}]}}]));
     const scoreOwner={integratedRuntime:{parts:projections},weatherSourceAge:{fixture:1},
      currentSourceDomainTransitions:{retained:{unchanged:true}},
      candidateGRollbackRuntime:route==='ordinary'?{parts:projections}:null,
      candidateGWarmupRuntime:route==='cold'?{parts:projections}:null,
      establishedNativeCurrentPartResults:resultOwners};
     const selectionOwner={historyPath:path.join(directory,retires?'actual.json':'old.json'),
      inputs:{componentSelectionHistory:createWeatherComponentSelectionHistory(null,{parts,
       retentionStartAt:targetAt,retentionEndAt:targetAt}),
       privateWorkingIndices:new Map(ids.map(id=>[id,{working:true}]))},
      sourceMarker:{fixture:'CALLER_LIFETIME_ONLY'}};
     if(failure==='persist')selectionOwner.historyPath=path.join(directory,'absent','selection.json');
     const output={},persistEntered=deferred(),persistRelease=deferred(),originEntered=deferred(),originRelease=deferred();
     const originValue=Object.freeze({fixture:'CALLER_BOUNDARY_VALUE_ONLY',route});
     const original=JSON.stringify({scoreOwner,projections,results:[...resultOwners]});
     const events=[];let primary=null;
     const scope={weatherComponents:selectionOwner,coastalPartScoreBuild:scoreOwner,
      output,coastalPartsContract:{partCount:673},generatedAt:targetAt,
      buildFurWaterRoutingDiagnostic:()=>null,ravScoreModelBinding:()=>({fixture:'I'}),
      candidateGRollbackModelBinding:()=>({fixture:'G'}),CANDIDATE_G_OPERATIONAL_ROLLBACK_ID:'fixture',
      CANDIDATE_G_MEASURED_WARMUP_STATUS:'fixture',CANDIDATE_G_MEASURED_WARMUP_EVIDENCE_POLICY:'fixture',
      persistWeatherComponentSelections:async prepared=>{
       assert.equal(prepared,selectionOwner);persistEntered.resolve();await persistRelease.promise;
       try{return await persistWeatherComponentSelections(prepared);}
       catch(error){primary=error;throw error;}
      },
      enrichCurrentProvenanceDocuments:({conditions})=>{assert.equal(conditions,output);events.push('provenance');return {skipped:false};},
      dmiBulkCache:{},nextDmiForecastStore:{},writeDmiForecastStoreCheckpoint:async()=>{events.push('checkpoint');},
      console:{log(){}},establishedNativeCurrentOrigin:originValue,
      buildEstablishedNativeCurrentOriginAttestation:async(handle,options)=>{
       assert.equal(handle,originValue);assert.equal(options.conditions,output);
       assert.equal(options.partResults,resultOwners);assert.equal(options.partResults.size,673);
       originEntered.resolve();await originRelease.promise;
       if(failure==='origin'){primary=new Error('CALLER_FINALIZER_FAILURE');throw primary;}
       return Object.freeze({fixture:'CALLER_RESULT_ONLY',route});
      },reportWeatherBuildStage:stage=>events.push(stage)};
     const pending=invoke(scope);await persistEntered.promise;
     assert.equal(scope.inspect().weatherComponents,selectionOwner);
     assert.equal(scope.inspect().coastalPartScoreBuild,scoreOwner);
     assert.equal(scope.inspect().coastalPartScoreBuild.establishedNativeCurrentPartResults.size,673);
     assert.equal(Object.hasOwn(output,'weatherComponentInputs'),false);
     persistRelease.resolve();
     if(failure!=='persist'){
      await originEntered.promise;
      assert.equal(scope.inspect().weatherComponents,retires?null:selectionOwner);
      assert.equal(scope.inspect().coastalPartScoreBuild,scoreOwner);
      assert.equal(scope.inspect().coastalPartScoreBuild.establishedNativeCurrentPartResults.size,673);
      assert.equal(Object.hasOwn(output,'privateEstablishedNativeCurrentOrigin'),false);
      assert.deepEqual(events,['provenance','checkpoint']);originRelease.resolve();
     }
     const result=await pending;
     assert.equal(JSON.stringify({scoreOwner,projections,results:[...resultOwners]}),original,
      'retirement must not clear shared maps or mutate one of the673 original rows');
     assert.equal(output.coastalParts,scoreOwner.integratedRuntime);
     assert.equal(Object.keys(output.coastalParts.parts).length,673);
     if(failure){
      assert.equal(result.error,primary);assert.equal(result.coastalPartScoreBuild,scoreOwner);
      assert.equal(result.weatherComponents,failure==='persist'||!retires?selectionOwner:null);
      assert.equal(events.includes('current-origin-ready'),false);
     }else{
      assert.equal(result.error,null);assert.equal(result.weatherComponents,retires?null:selectionOwner);
      assert.equal(result.coastalPartScoreBuild,retires?null:scoreOwner);
      assert.deepEqual(events,['provenance','checkpoint','current-origin-ready']);
     }
     const persisted=failure==='persist'?null:await fs.readFile(selectionOwner.historyPath,'utf8');
     if(persisted)assert.equal(output.weatherComponentInputs.selectedComponentsSha256,hash(persisted));
     return {output:JSON.stringify(output),persisted,events};
    };
    assert.deepEqual(await execute(actual,true),await execute(historical,false),
     'the actual new caller must preserve the whole output, saved selection bytes and failure order');
   }finally{await fs.rm(directory,{recursive:true,force:true});}
  });
 }
});
