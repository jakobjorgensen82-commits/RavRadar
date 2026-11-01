import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {buildCandidateGRollbackPartScoreSeries} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {buildIntegratedPartScoreSeries} from './lib/ravscore-integrated-runtime.mjs';
import {buildRavScoreProductionPartSeries} from './lib/ravscore-production-part-pipeline.mjs';
import {selectCoastalPointCandidateGRollbackContinuation} from './lib/coastal-point-staging-contract.mjs';
import {RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES} from './lib/ravscore-recovery-replay.mjs';

// Exercise the actual initialization statements without importing/running the
// update-weather CLI (which starts providers and writes production artifacts).
const updater=fs.readFileSync(new URL('./update-weather.mjs',import.meta.url),'utf8');
const start='      let previousCandidateGContinuation =\n';
const end='      const feature = {\n';
assert.equal(updater.split(start).length,2);assert.equal(updater.split(end).length,2);
const initialization=updater.slice(updater.indexOf(start),updater.indexOf(end));
const names=['forcedHistoricalWaveInitialization','forceHistoricalWaveMeasuredColdReplay','initialSelection',
  'publicCandidateGMigrationState','calculationBootstrapMode','RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES',
  'part','pointStateInjections','privateCandidateGContinuation','checkpointCandidateGContinuation',
  'generatedAt','previousCandidateGRollbackRuntime','CANDIDATE_G_MEASURED_WARMUP_STATUS',
  'selectCoastalPointCandidateGRollbackContinuation'];
const actualInitialization=Function(...names,initialization+`\nreturn {previousCandidateGContinuation,
  legacyCandidateGMigrationState,candidateGRollbackMeasuredColdStart,candidateGRollbackMeasuredWarmupContinuation};`);
const time=hour=>new Date(Date.parse('2026-08-29T00:00:00.000Z')+hour*3600000).toISOString();
const part={partId:'SYNTHETIC-READY-GAP-PART',parentZoneId:'SYNTHETIC-READY-GAP-ZONE',waterPoint:[8,55],onshoreDirectionDeg:90};
const zone={id:part.parentZoneId,onshoreDirectionDeg:90};
const weather=hour=>({time:time(hour),windSpeedMps:5,windDirectionDeg:270,waveHeightM:1,wavePeriodS:6,
  waveDirectionDeg:270,waterLevelCm:10,waterLevelTrendCm3h:0,waterTemperatureC:15,
  currentSpeedMps:0.09,currentDirectionDeg:90,currentUMps:0.09,currentVMps:0,
  currentProvenance:{status:'verified',provider:'synthetic-grid'},waveProvenance:{status:'verified'}});
const missing=hour=>({...weather(hour),currentSpeedMps:null,currentDirectionDeg:null,currentUMps:null,currentVMps:null,currentProvenance:null});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>'sha256:'+crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function init(overrides={}){
  const context={forcedHistoricalWaveInitialization:null,forceHistoricalWaveMeasuredColdReplay:false,
    publicCandidateGMigrationState:null,calculationBootstrapMode:null,RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES,
    part,pointStateInjections:{},privateCandidateGContinuation:null,checkpointCandidateGContinuation:null,
    generatedAt:time(49),previousCandidateGRollbackRuntime:{status:'READY'},
    CANDIDATE_G_MEASURED_WARMUP_STATUS:'BUILDING_MEASURED_ONLY',selectCoastalPointCandidateGRollbackContinuation,...overrides};
  return actualInitialization(...names.map(name=>context[name]));
}

test('normal updater initialization preserves READY companion through measured gaps without making rollback READY',()=>{
  const hours=Array.from({length:49},(_,hour)=>weather(hour));
  const integrated=buildIntegratedPartScoreSeries({part,zone,hourly:hours,scoreStartAt:time(48)});
  const rollback=buildCandidateGRollbackPartScoreSeries({part,zone,hourly:hours,scoreStartAt:time(48),measuredColdStart:true});
  const originalI=integrated.ravScoreState.continuationState,originalG=rollback.candidateGState.continuationState;
  assert.equal(originalI.currentMemoryReady,true);assert.equal(originalG.transportMemoryReady,true);
  const untouched=structuredClone({hours,originalI,originalG});
  const selection={state:originalI,source:'EXISTING_PART',rejectedSources:[]};
  const privateInit=init({initialSelection:selection,privateCandidateGContinuation:originalG});
  const checkpointInit=init({initialSelection:selection,checkpointCandidateGContinuation:originalG});
  const run=(hourly,initial=privateInit,initialSelection=selection,targetReferenceAt=hourly[0].time)=>
    buildRavScoreProductionPartSeries({part,zone,initialSelection,...initial,targetReferenceAt,recoverySources:[],publicHourly:hourly});
  const continuous=run([weather(49)]);
  const strict=buildRavScoreProductionPartSeries({part,zone,initialSelection:selection,
    previousCandidateGContinuation:originalG,targetReferenceAt:time(49),publicHourly:[weather(49)]});
  assert.deepEqual(continuous,strict,'READY paths and all numeric results must be unchanged');
  for(const initial of [privateInit,checkpointInit])for(const hourly of [[weather(57)],[missing(49),weather(50)]]){
    const result=run(hourly,initial);
    const expected=buildCandidateGRollbackPartScoreSeries({part,zone,hourly:result.recovery.hourly,
      previousCandidateGContinuation:originalG,measuredWarmupContinuation:true,scoreStartAt:result.recovery.scoreStartAt});
    assert.deepEqual(result.candidateGState,expected.candidateGState);
    assert.deepEqual(result.candidateGRollbackScores,expected.scores);
    const last=result.candidateGRollbackScores.at(-1).candidateG;
    assert.equal(last.transportMemoryReady,false);assert(last.transportMemoryCoverageHours<48);
    for(const mode of ['waders','beach']){
      assert.equal(last.modes[mode].available,true);assert(Number.isFinite(last.modes[mode].score));
      assert.equal(last.publicModes[mode].available,false);assert.equal(last.publicModes[mode].score,null);
      assert.equal(last.publicModes[mode].scoreQuality,'UNAVAILABLE');
      assert.equal(last.publicModes[mode].unavailability.code,last.transportMemoryStatus);
    }
    assert.equal(result.scores.at(-1).ravScoreModel.modes.waders.scoreQuality,'HISTORY_INCOMPLETE');
  }
  assert.equal(privateInit.candidateGRollbackMeasuredWarmupContinuation,true);
  assert.equal(checkpointInit.candidateGRollbackMeasuredWarmupContinuation,true);
  const gap=run([weather(57)]);
  const continuedSelection={state:gap.ravScoreState.continuationState,source:'EXISTING_PART',rejectedSources:[]};
  const continuedInit=init({initialSelection:continuedSelection,privateCandidateGContinuation:gap.candidateGState.continuationState});
  const mature=run(Array.from({length:48},(_,index)=>weather(58+index)),continuedInit,continuedSelection);
  assert(mature.candidateGRollbackScores.slice(0,-1).every(row=>row.candidateG.transportMemoryReady===false));
  assert.equal(mature.candidateGRollbackScores.at(-1).candidateG.transportMemoryReady,true);
  assert.equal(mature.candidateGRollbackScores.at(-1).candidateG.transportMemoryCoverageHours,48);
  assert.equal(mature.candidateGRollbackScores.at(-1).candidateG.publicModes.waders.scoreQuality,'FULL_HISTORY');
  const pair={targetReferenceAt:time(48),integratedState:originalI,candidateGState:originalG,
    integratedStateSha256:hash(originalI),candidateGStateSha256:hash(originalG)};
  pair.pairSha256=hash({schemaVersion:'coastal-point-activation-dual-state-v1',partId:part.partId,
    targetReferenceAt:pair.targetReferenceAt,integratedStateSha256:pair.integratedStateSha256,candidateGStateSha256:pair.candidateGStateSha256});
  const pointSelection={state:originalI,source:'POINT_ACTIVATION',rejectedSources:[]};
  const pointInit=init({initialSelection:pointSelection,pointStateInjections:{[part.partId]:pair},generatedAt:time(48)});
  assert.equal(pointInit.candidateGRollbackMeasuredWarmupContinuation,true);
  const point=run([weather(48),missing(49),weather(50)],pointInit,pointSelection,time(48));
  assert.equal(point.candidateGRollbackScores.at(-1).candidateG.publicModes.waders.available,false);
  const tampered=structuredClone(originalG);tampered.transportPotential+=0.01;
  assert.throws(()=>run([weather(57)],init({initialSelection:selection,privateCandidateGContinuation:tampered})),
    /not an exact Candidate G schema-2 state/);
  assert.throws(()=>buildCandidateGRollbackPartScoreSeries({part,zone,hourly:[weather(58)],
    previousCandidateGContinuation:gap.candidateGState.continuationState}),/exact READY 48-hour state/);
  assert.throws(()=>buildCandidateGRollbackPartScoreSeries({part,zone,hourly:[weather(49),missing(50)],
    previousCandidateGContinuation:originalG}),/exact READY 48-hour state/);
  const legacy=init({initialSelection:{source:'CANDIDATE_G_MIGRATION',state:originalG},publicCandidateGMigrationState:originalG});
  assert.equal(legacy.candidateGRollbackMeasuredWarmupContinuation,false);
  assert.equal(legacy.previousCandidateGContinuation,null);assert.deepEqual(legacy.legacyCandidateGMigrationState,originalG);
  const cold=init({initialSelection:{source:'COLD_START',state:null},calculationBootstrapMode:RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.genuineColdStart});
  assert.equal(cold.candidateGRollbackMeasuredColdStart,true);assert.equal(cold.candidateGRollbackMeasuredWarmupContinuation,false);
  const absent=init({initialSelection:selection});assert.equal(absent.candidateGRollbackMeasuredWarmupContinuation,false);
  assert.throws(()=>run([weather(49)],absent),/exclusive Candidate G rollback initialization path/);
  assert.deepEqual({hours,originalI,originalG},untouched,'synthetic originals must remain byte-equivalent');
});
