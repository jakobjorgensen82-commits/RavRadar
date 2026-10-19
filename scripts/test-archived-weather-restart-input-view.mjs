// Normal early refusal target. No synthetic C/I/T, successful origin stub,
// credentials, providers, archive writes or source-cleanliness exemption.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createArchivedWeatherRestartInputView,archivedWeatherRestartScoreInputs,
  archivedWeatherRestartBoundary} from './lib/archived-weather-restart-input-view.mjs';
import {prepareArchivedCurrentOriginRestart,assertEstablishedNativeCurrentOriginForPart,
  buildEstablishedNativeCurrentOriginAttestation} from './lib/established-native-current-origin.mjs';
import {assertEstablishedNativeCurrentProductionResult} from './lib/ravscore-production-part-pipeline.mjs';

const scope={registry:{},targetReferenceAt:'2026-10-19T06:00:00.000Z'};
function refuseNetwork(t){
  const prior=globalThis.fetch;let calls=0;
  globalThis.fetch=()=>{calls++;throw new Error('EARLY_REFUSAL_MUST_NOT_REACH_TRANSPORT');};
  t.after(()=>{globalThis.fetch=prior;assert.equal(calls,0);});
}
test('normal restart input constructor rejects missing/additional authority fields before transport',async t=>{
  refuseNetwork(t);
  for(const options of [undefined,null,{},
    {archive:{},...scope,originHandle:{}},
    {archive:{},...scope,stateEpochView:{}},
    {archive:{},...scope,skipSourceCheck:true}])
    await assert.rejects(createArchivedWeatherRestartInputView(options),/ARCHIVED_WEATHER_RESTART_INPUT_ARGUMENTS/);
});
test('normal restart input constructor refuses plain copied receipts and callbacks as archive authority',async t=>{
  refuseNetwork(t);let invoked=0;
  const values=[{},Object.freeze({}),{status:'passed'},
    {kind:'RAVRADAR_UNPAIRED_WEATHER_RESTART_ARCHIVE',admission:'NO_ADMISSION',paired:false},
    ()=>{invoked++;assert.fail('A caller callback cannot authorize an origin.');}];
  for(const archive of values)await assert.rejects(createArchivedWeatherRestartInputView({archive,...scope}),
    /WEATHER_STATE_EPOCH_ARCHIVE_UNPAIRED_HANDLE_INVALID/);
  assert.equal(invoked,0);
});
test('normal origin restart issuer refuses fake archive before current source or remote reads',async t=>{
  refuseNetwork(t);
  await assert.rejects(prepareArchivedCurrentOriginRestart({}),/ESTABLISHED_CURRENT_ORIGIN_RESTART_ARGUMENTS/);
  for(const archive of [{},Object.freeze({status:'passed'}),()=>true])
    await assert.rejects(prepareArchivedCurrentOriginRestart(archive,{centralContract:scope.registry,
      targetReferenceAt:scope.targetReferenceAt}),/WEATHER_STATE_EPOCH_ARCHIVE_UNPAIRED_HANDLE_INVALID/);
});
test('normal score-input and boundary accessors refuse fabricated view tokens',t=>{
  refuseNetwork(t);
  for(const view of [null,{},Object.freeze({}),{status:'passed'},new Map()]){
    assert.throws(()=>archivedWeatherRestartScoreInputs(view,scope),/ARCHIVED_WEATHER_RESTART_INPUT_UNVERIFIED_VIEW/);
    assert.throws(()=>archivedWeatherRestartBoundary(view,scope),/ARCHIVED_WEATHER_RESTART_INPUT_UNVERIFIED_VIEW/);
  }
});
test('normal view accessors reject extra tuple origin and state fields before any use',t=>{
  refuseNetwork(t);
  for(const extra of [{originHandle:{}},{checkpointStates:{}},{sourceOverride:{}},{stateEpochView:null}]){
    assert.throws(()=>archivedWeatherRestartScoreInputs({}, {...scope,...extra}),/ARCHIVED_WEATHER_RESTART_INPUT_ARGUMENTS/);
    assert.throws(()=>archivedWeatherRestartBoundary({}, {...scope,...extra}),/ARCHIVED_WEATHER_RESTART_INPUT_ARGUMENTS/);
  }
});
test('normal original-pair and finalizer APIs refuse fake handles instead of admitting supplied states',async t=>{
  refuseNetwork(t);
  const pair={part:{partId:'not-an-authority'},integrated:{},candidate:{}};
  for(const handle of [{},Object.freeze({status:'passed'})]){
    assert.throws(()=>assertEstablishedNativeCurrentOriginForPart(handle,pair),/ESTABLISHED_CURRENT_ORIGIN_HANDLE/);
    await assert.rejects(buildEstablishedNativeCurrentOriginAttestation(handle,{centralContract:{},conditions:{},partResults:new Map()}),
      /ESTABLISHED_CURRENT_ORIGIN_HANDLE/);
  }
});
test('normal produced-result collector refuses copied results and nonboolean measured-COLD requests',t=>{
  refuseNetwork(t);
  for(const result of [null,{},Object.freeze({recovery:{coldStart:true}})])
    for(const requireMeasuredColdStart of [false,true,'true'])
      assert.throws(()=>assertEstablishedNativeCurrentProductionResult(result,{originHandle:{},part:{},
        targetReferenceAt:scope.targetReferenceAt,requireMeasuredColdStart}),/RAVSCORE_ESTABLISHED_NATIVE_CURRENT_RESULT_INVALID/);
});
