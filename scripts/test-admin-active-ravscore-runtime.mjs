import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { runInNewContext } from 'node:vm';
let filterAdminAccountProfilesForTest;

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import { summarizeHistoricalRows } from '../js/services/historical-analysis.js';
import { ravScoreModelBinding as candidateRollbackModelBinding } from './rollback-assets/ravscore-model-contract.js';
import {
  MODEL_BINDING_FIELDS,
  applyAdminObservationModelPolicy,
  resolveAdminActivePublicRavScore,
} from '../js/ui/admin-active-ravscore.js';

const integratedBinding = { ...ravScoreModelBinding() };
const candidateBinding = { ...candidateRollbackModelBinding() };
const evaluatedAt = '2026-09-12T08:00:00.000Z';

assert.equal(MODEL_BINDING_FIELDS.length, 11);
assert.ok(MODEL_BINDING_FIELDS.includes('modelContractSha256'));
assert.deepEqual(Object.keys(integratedBinding).sort(), [...MODEL_BINDING_FIELDS].sort());
assert.deepEqual(Object.keys(candidateBinding).sort(), [...MODEL_BINDING_FIELDS].sort());

function profileFor(binding, kind) {
  const candidate = kind === 'candidate-g-rollback';
  return {
    schemaVersion: candidate ? 'candidate-g-state-v2' : 'integrated-state-v4',
    switchVersion: candidate
      ? 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2'
      : 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
    requestedProfileId: binding.modelId,
    activeProfileId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    rankingPolicyId: binding.rankingPolicyId,
    bestTimePolicyId: binding.bestTimePolicyId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    rollbackModelId: candidate ? null : 'RRS-CANDIDATE-G-ROLLBACK',
    runtimeFallbackModelId: null,
    modelCoverageReady: true,
    modelMemoryReady: true,
    modelMigrationReady: true,
    memoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    activationState: candidate
      ? 'manual-candidate-g-only-local-fail-closed'
      : 'integrated-model-only-local-fail-closed',
    advisories: [],
    publicAvailabilityPolicy: candidate
      ? 'candidate-g-local-fail-closed'
      : 'integrated-model-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  };
}

function runtimeFor(binding, kind) {
  const scoreProfile = profileFor(binding, kind);
  const scoreAvailability = {
    schemaVersion: 2,
    policy: scoreProfile.publicAvailabilityPolicy,
    allZonesActive: true,
    activeZoneCount: 210,
    unavailableZoneCount: 0,
    totalZoneCount: 210,
    allCurrentScoresFullHistory: true,
    fullHistoryModeCount: 420,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    evaluatedAt,
    unavailableZones: [],
    historyIncompleteZones: [],
  };
  return {
    manifest: {
      ravScoreModelBinding: { ...binding },
      ravScoreRuntime: { modelBinding: { ...binding } },
      ravScoreProfile: { ...scoreProfile },
      ravScoreAvailability: { ...scoreAvailability },
    },
    conditions: {
      ravScoreRuntime: { modelBinding: { ...binding } },
      nationalForecast: { modelBinding: { ...binding } },
      coastalParts: {
        modelBinding: { ...binding },
        scoreProfile: { ...scoreProfile },
        scoreAvailability: { ...scoreAvailability },
      },
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function mutateBothProfiles(runtime, mutate) {
  mutate(runtime.manifest.ravScoreProfile);
  mutate(runtime.conditions.coastalParts.scoreProfile);
  return runtime;
}

const integratedRuntime = runtimeFor(integratedBinding, 'integrated');
const producedIntegratedProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
integratedRuntime.manifest.ravScoreProfile = { ...producedIntegratedProfile };
integratedRuntime.conditions.coastalParts.scoreProfile = { ...producedIntegratedProfile };
const integrated = resolveAdminActivePublicRavScore(integratedRuntime);
assert.equal(integrated.kind, 'integrated');
assert.equal(integrated.labelDa, 'Integreret kystprocesmodel');
assert.equal(integrated.observationCalibrationEligible, true);
assert.deepEqual(integrated.binding, integratedBinding);
assert.equal(integrated.diagnosticScoreProfile.modelContractSha256,
  integratedBinding.modelContractSha256);
assert.equal(integrated.diagnosticScoreProfile.publicShadow, false);
assert.equal(integrated.diagnosticScoreProfile.crossModelFallback, false);
assert.equal(integrated.historyQuality.allCurrentScoresFullHistory, true);
assert.deepEqual(integrated.diagnosticScoreProfile.weights,
  { huntability: 20, transport: 50, mobilisation: 30 });

const candidateRuntime = runtimeFor(candidateBinding, 'candidate-g-rollback');
const candidateWithSentinel = clone(candidateRuntime);
candidateWithSentinel.conditions.coastalParts.scoreProfile.forbiddenSentinel = 'must-not-export';
candidateWithSentinel.manifest.ravScoreProfile.forbiddenSentinel = 'must-not-export';
assert.throws(() => resolveAdminActivePublicRavScore(candidateWithSentinel),
  /exact public score-profile field set/,
  'Unknown profile fields must fail closed instead of being silently projected away.');
const candidate = resolveAdminActivePublicRavScore(candidateRuntime);
assert.equal(candidate.kind, 'candidate-g-rollback');
assert.equal(candidate.labelDa, 'Candidate G · manuel driftsrollback');
assert.equal(candidate.observationCalibrationEligible, false);
assert.deepEqual(candidate.binding, candidateBinding);

const candidateDto = applyAdminObservationModelPolicy({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
  model_version: candidateBinding.modelId,
}, candidate);
assert.equal(candidateDto.calibration_eligible, false);
assert.equal(candidateDto.calibration_binding_status, 'current-ineligible');
const historicalDto = applyAdminObservationModelPolicy({
  calibration_eligible: false,
  calibration_binding_status: 'historical-model-bound',
}, candidate);
assert.equal(historicalDto.calibration_binding_status, 'historical-model-bound');
const integratedDto = Object.freeze({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
});
assert.equal(applyAdminObservationModelPolicy(integratedDto, integrated), integratedDto);

const rollbackSummary = summarizeHistoricalRows([{
  model_version: candidateBinding.modelId,
  found: true,
  rav_score: 100,
}], candidateBinding, { allowCalibration: false });
assert.equal(rollbackSummary.count, 0);
assert.equal(rollbackSummary.totalCount, 1);
assert.equal(rollbackSummary.excludedCount, 1);
assert.equal(rollbackSummary.observationCalibrationEligible, false);
assert.deepEqual(rollbackSummary.modelBinding, candidateBinding);

for (const [label, mutate, pattern] of [
  ['mixed coastal binding', runtime => {
    runtime.conditions.coastalParts.modelBinding.modelBundleSha256 = 'c'.repeat(64);
  }, /anden offentlig RavScore-model eller bundle/],
  ['mixed national forecast binding', runtime => {
    runtime.conditions.nationalForecast.modelBinding.modelId = 'RRS-OTHER';
  }, /anden offentlig RavScore-model eller bundle/],
  ['mixed manifest profile', runtime => {
    runtime.manifest.ravScoreProfile.modelBundleSha256 = 'c'.repeat(64);
  }, /does not match|matcher ikke/],
  ['mixed startup profile', runtime => {
    runtime.conditions.coastalParts.scoreProfile.modelContractSha256 = 'c'.repeat(64);
  }, /does not match|anden offentlig RavScore-model eller bundle/],
  ['extra profile field', runtime => mutateBothProfiles(runtime,
    profile => { profile.unexpectedShadowBinding = 'forbidden'; }),
  /exact public score-profile field set/],
  ['missing ranking policy', runtime => mutateBothProfiles(runtime,
    profile => { delete profile.rankingPolicyId; }),
  /exact public score-profile field set/],
  ['forged best-time policy', runtime => mutateBothProfiles(runtime,
    profile => { profile.bestTimePolicyId = 'forged-best-time'; }),
  /does not match bestTimePolicyId/],
  ['extra binding field', runtime => {
    for (const binding of [
      runtime.manifest.ravScoreModelBinding,
      runtime.manifest.ravScoreRuntime.modelBinding,
      runtime.conditions.ravScoreRuntime.modelBinding,
      runtime.conditions.nationalForecast.modelBinding,
      runtime.conditions.coastalParts.modelBinding,
    ]) binding.unexpected = 'not-allowed';
  }, /eksakte offentlige modelbinding/],
  ['missing model contract digest', runtime => {
    for (const binding of [
      runtime.manifest.ravScoreModelBinding,
      runtime.manifest.ravScoreRuntime.modelBinding,
      runtime.conditions.ravScoreRuntime.modelBinding,
      runtime.conditions.nationalForecast.modelBinding,
      runtime.conditions.coastalParts.modelBinding,
    ]) delete binding.modelContractSha256;
    delete runtime.manifest.ravScoreProfile.modelContractSha256;
    delete runtime.conditions.coastalParts.scoreProfile.modelContractSha256;
  }, /eksakte offentlige modelbinding/],
  ['unknown activation', runtime => mutateBothProfiles(runtime,
    profile => { profile.activationState = 'unknown-public-mode'; }), /ukendt aktiveringstilstand/],
  ['mixed activation contract', runtime => mutateBothProfiles(runtime, profile => {
    profile.activationState = 'manual-candidate-g-only-local-fail-closed';
    profile.publicAvailabilityPolicy = 'candidate-g-local-fail-closed';
  }), /ukendt eller blandet driftsvej|Scoretilgængelighed/],
  ['cross-model fallback', runtime => mutateBothProfiles(runtime,
    profile => { profile.crossModelRuntimeFallbackAllowed = true; }), /invalid or unsafe|ukendt eller blandet/],
  ['runtime fallback model', runtime => mutateBothProfiles(runtime,
    profile => { profile.runtimeFallbackModelId = 'RRS-OTHER'; }), /invalid or unsafe|ukendt eller blandet/],
  ['automatic activation', runtime => mutateBothProfiles(runtime,
    profile => { profile.automaticActivationAllowed = true; }), /invalid or unsafe|ukendt eller blandet/],
  ['availability mismatch', runtime => {
    runtime.conditions.coastalParts.scoreAvailability.policy = 'other-policy';
  }, /Scoretilgængelighed/],
  ['manifest availability mismatch', runtime => {
    runtime.manifest.ravScoreAvailability.policy = 'other-policy';
  }, /Scoretilgængelighed/],
  ['requested profile mismatch', runtime => mutateBothProfiles(runtime,
    profile => { profile.requestedProfileId = 'RRS-OTHER'; }), /requests or activates another model/],
]) {
  const runtime = clone(integratedRuntime);
  mutate(runtime);
  assert.throws(() => resolveAdminActivePublicRavScore(runtime), pattern, label);
}

const incompleteCandidateRuntime = clone(candidateRuntime);
mutateBothProfiles(incompleteCandidateRuntime,
  profile => { profile.modelMemoryReady = false; });
assert.throws(() => resolveAdminActivePublicRavScore(incompleteCandidateRuntime),
  /ukendt eller blandet driftsvej/);

const incompleteIntegratedRuntime = clone(integratedRuntime);
mutateBothProfiles(incompleteIntegratedRuntime,
  profile => { profile.modelMigrationReady = false; });
assert.throws(() => resolveAdminActivePublicRavScore(incompleteIntegratedRuntime),
  /ukendt eller blandet driftsvej/,
  'Admin må ikke legitimere en integreret aktiv profil før alle cutover-readinessflags er sande.');

const historyIncompleteIntegratedRuntime = clone(integratedRuntime);
mutateBothProfiles(historyIncompleteIntegratedRuntime, profile => {
  profile.modelMemoryReady = false;
  profile.advisories = ['LOCAL_MODEL_MEMORY_INCOMPLETE'];
});
for (const availability of [
  historyIncompleteIntegratedRuntime.manifest.ravScoreAvailability,
  historyIncompleteIntegratedRuntime.conditions.coastalParts.scoreAvailability,
]) {
  availability.allCurrentScoresFullHistory = false;
  availability.fullHistoryModeCount = 418;
  availability.historyIncompleteModeCount = 2;
  availability.historyIncompleteZoneCount = 1;
  availability.historyIncompleteZones = [{
    zoneId: 'ZONE-1',
    zoneName: 'Zone 1',
    modes: ['waders', 'beach'],
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  }];
}
const historyIncompleteIntegrated = resolveAdminActivePublicRavScore(
  historyIncompleteIntegratedRuntime,
);
assert.equal(historyIncompleteIntegrated.kind, 'integrated');
assert.equal(historyIncompleteIntegrated.scoreProfile.modelMemoryReady, false);
assert.equal(historyIncompleteIntegrated.historyQuality.allCurrentScoresFullHistory, false);
assert.equal(historyIncompleteIntegrated.historyQuality.calibrationEligible, false);
assert.equal(historyIncompleteIntegrated.observationCalibrationEligible, false);
assert.equal(historyIncompleteIntegrated.diagnosticScoreProfile.observationCalibrationEligible, false);
const historyIncompleteDto = applyAdminObservationModelPolicy({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
}, historyIncompleteIntegrated);
assert.equal(historyIncompleteDto.calibration_eligible, false);
assert.equal(historyIncompleteDto.calibration_binding_status, 'current-ineligible');

const locallyUnavailableIntegratedRuntime = clone(integratedRuntime);
mutateBothProfiles(locallyUnavailableIntegratedRuntime, profile => {
  profile.modelCoverageReady = false;
  profile.advisories = ['LOCAL_MODEL_COVERAGE_INCOMPLETE'];
});
for (const availability of [
  locallyUnavailableIntegratedRuntime.manifest.ravScoreAvailability,
  locallyUnavailableIntegratedRuntime.conditions.coastalParts.scoreAvailability,
]) {
  availability.allZonesActive = false;
  availability.activeZoneCount = 209;
  availability.unavailableZoneCount = 1;
  availability.allCurrentScoresFullHistory = false;
  availability.fullHistoryModeCount = 419;
  availability.unavailableZones = [{
    zoneId: 'ZONE-1',
    zoneName: 'Zone 1',
    modes: ['waders'],
    reasons: ['Et direkte lokalt input mangler.'],
  }];
}
const locallyUnavailableIntegrated = resolveAdminActivePublicRavScore(
  locallyUnavailableIntegratedRuntime,
);
assert.equal(locallyUnavailableIntegrated.kind, 'integrated');
assert.equal(locallyUnavailableIntegrated.scoreProfile.modelCoverageReady, false);
assert.equal(locallyUnavailableIntegrated.observationCalibrationEligible, false);

const malformedHistoryRuntime = clone(historyIncompleteIntegratedRuntime);
malformedHistoryRuntime.conditions.coastalParts.scoreAvailability
  .historyIncompleteZones[0].historyReasonCodes = [];
assert.throws(() => resolveAdminActivePublicRavScore(malformedHistoryRuntime),
  /ukendt eller blandet driftsvej|history reason codes/,
  'Admin must reject an incomplete-history readiness bypass without safe reason codes.');

assert.throws(() => resolveAdminActivePublicRavScore({
  manifest: null,
  conditions: clone(integratedRuntime.conditions),
}), /Manifestets modelbinding/);
assert.throws(() => resolveAdminActivePublicRavScore({
  manifest: clone(integratedRuntime.manifest),
  conditions: {},
}), /runtimebinding/);

const dashboardSource = fs.readFileSync(
  new URL('../js/ui/admin-dashboard.js', import.meta.url), 'utf8');
const resolverSource = fs.readFileSync(
  new URL('../js/ui/admin-active-ravscore.js', import.meta.url), 'utf8');
const historySource = fs.readFileSync(
  new URL('../js/services/historical-analysis.js', import.meta.url), 'utf8');

assert.match(dashboardSource, /resolveAdminActivePublicRavScore/);
assert.match(dashboardSource, /activeAdminObservationDto\(row,active\.value\)/);
assert.match(dashboardSource, /activePublicModel:\{/);
assert.match(dashboardSource, /diagnosticScoreProfile/);
assert.match(dashboardSource,
  /allowCalibration:active\.value\.observationCalibrationEligible/);
assert.match(dashboardSource,
  /Den aktive offentlige modeltilstand er udtrykkeligt ikke kalibreringsegnet\./);
assert.doesNotMatch(dashboardSource,
  /Observationer fra den manuelle Candidate G-driftsrollback/);
assert.doesNotMatch(dashboardSource, /ravscore-model-contract/);
assert.doesNotMatch(dashboardSource, /RAVSCORE_MODEL_CONTRACT|ravScoreModelBinding\s*\(/);
assert.doesNotMatch(dashboardSource,
  /Den integrerede kystprocesmodel er den eneste offentlige scoreprofil/);
assert.doesNotMatch(dashboardSource, /versionsstyrede integrerede modelkæde/);
assert.doesNotMatch(resolverSource,
  /from\s+['"][^'"]*(candidate|rollback-assets|ravscore-profile-switch)[^'"]*['"]/i);
assert.match(historySource, /allowCalibration===true\?source\.filter/);

const adminUiDirectory = new URL('../js/ui/', import.meta.url);
for (const file of fs.readdirSync(adminUiDirectory)
  .filter(name => /^admin.*\.js$/i.test(name))) {
  const source = fs.readFileSync(new URL(file, adminUiDirectory), 'utf8');
  assert.doesNotMatch(source,
    /(?:from\s+|import\s*\(\s*)['"][^'"]*(?:candidate|rollback-assets|ravscore-profile-switch|ravscore-candidate-g-rollback-runtime)[^'"]*['"]/i,
    `${file} må ikke importere Candidate-/rollback-runtimekode`);
}

console.log('Admin active RavScore runtime/export contract tests passed.');

// Actual bounded admin reader with synthetic auth/HTTP dependencies only.
{
  const owner='11111111-1111-4111-8111-111111111111';
  const fixture={identity:1,owner,allowed:true,active:true,calls:0,config:{supabaseUrl:'https://admin-count.example',supabasePublishableKey:'synthetic'},
    body:{storedCount:14,markedTestCount:1,scope:'active-d1-all-stored-rows-including-test-legacy-anonymous',startedAt:'2026-10-28T12:00:00.000Z',completedAt:'2026-10-28T12:00:01.000Z'},afterFetch:null,afterAccess:null};
  globalThis.__adminCountTest=fixture;
  const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
  const mocks={
    '../../config.js':moduleUrl('export const PUBLIC_CONFIG=globalThis.__adminCountTest.config;'),
    './auth-service.js':moduleUrl(`const f=globalThis.__adminCountTest;
      export async function requireFreshSession(){if(!f.owner)throw Error('SIGNED_OUT');}
      export function authIdentityEpoch(){return f.identity;}
      export function currentSession(){return {user:{id:f.owner}};}
      export async function authorizedFetch(url,options,policy){f.calls++;f.last={url,options,policy};await f.afterFetch?.();return {response:{ok:true},body:structuredClone(f.body)};}`),
    './permissions-service.js':moduleUrl(`const f=globalThis.__adminCountTest;
      export async function myAccess(){await f.afterAccess?.();return {profile:{id:f.owner,is_active:f.active},permissions:new Set(f.allowed?['full_admin']:[])};}
      export function hasPermission(access,key){return access.permissions.has(key);}`),
  };
  const hooks=registerHooks({resolve(specifier,context,next){
    if(context.parentURL?.endsWith('/js/services/admin-trip-count.js')||context.parentURL?.endsWith('/js/services/admin-account-categories.js')){
      const key=specifier.split('?')[0];if(mocks[key])return {url:mocks[key],shortCircuit:true};
    }return next(specifier,context);
  }});
  try{
    const {loadAdminTripCount}=await import('../js/services/admin-trip-count.js');
    assert.equal((await loadAdminTripCount()).storedCount,14);
    assert.deepEqual(JSON.parse(fixture.last.options.body),{operation:'admin-count'});
    assert.equal(fixture.last.policy.consumeJson,true);assert.equal(fixture.last.policy.expectedUserId,owner);
    assert.equal(fixture.last.options.cache,'no-store');assert.equal(fixture.last.policy.timeoutMs,20_000);
    fixture.allowed=false;fixture.calls=0;await assert.rejects(loadAdminTripCount);assert.equal(fixture.calls,0);fixture.allowed=true;
    fixture.active=false;await assert.rejects(loadAdminTripCount);fixture.active=true;
    fixture.afterFetch=()=>{fixture.identity++;};await assert.rejects(loadAdminTripCount);fixture.afterFetch=null;
    fixture.afterFetch=()=>{fixture.owner='22222222-2222-4222-8222-222222222222';};await assert.rejects(loadAdminTripCount);fixture.owner=owner;fixture.afterFetch=null;
    fixture.afterFetch=()=>{fixture.allowed=false;};await assert.rejects(loadAdminTripCount);fixture.allowed=true;fixture.afterFetch=null;
    for(const changed of [{markedTestCount:15},{storedCount:-1},{storedCount:0,markedTestCount:0,scope:'unknown'},
      {completedAt:'2026-10-28T11:00:00.000Z'},{extra:'PRIVATE_PAYLOAD'}]){
      const old=fixture.body;fixture.body={...old,...changed};await assert.rejects(loadAdminTripCount);fixture.body=old;
    }
    const url=fixture.config.supabaseUrl;fixture.config.supabaseUrl='';await assert.rejects(loadAdminTripCount);fixture.config.supabaseUrl=url;
    fixture.owner=null;await assert.rejects(loadAdminTripCount);fixture.owner=owner;
    const category=await import('../js/services/admin-account-categories.js');filterAdminAccountProfilesForTest=category.filterAdminAccountProfiles;
    const countBody=fixture.body;fixture.body={scope:'requested-rls-visible-profiles-only',checkedAt:'2026-10-28T12:00:01.000Z',rows:[{id:owner,category:'owner',issues:[]}]};
    assert.equal((await category.loadAdminAccountCategories([owner])).rows[0].category,'owner');
    assert.deepEqual(JSON.parse(fixture.last.options.body),{operation:'admin-account-categories',ids:[owner]});
    for(const ids of [[],[owner,owner],['invalid'],Array(65).fill(owner)])await assert.rejects(()=>category.loadAdminAccountCategories(ids));
    for(const badRows of [[],[{id:owner,category:'ordinary',issues:[],email:'forbidden'}],[{id:owner,category:'invented',issues:[]}],
      [{id:'other',category:'ordinary',issues:[]}]]){
      const rows=fixture.body.rows;fixture.body.rows=badRows;await assert.rejects(()=>category.loadAdminAccountCategories([owner]));fixture.body.rows=rows;
    }
    fixture.afterFetch=()=>{fixture.identity++;};await assert.rejects(()=>category.loadAdminAccountCategories([owner]));fixture.afterFetch=null;
    fixture.allowed=false;await assert.rejects(()=>category.loadAdminAccountCategories([owner]));fixture.allowed=true;fixture.body=countBody;
  }finally{hooks.deregister();delete globalThis.__adminCountTest;}
}

// Exact dashboard functions, real promise ordering and render/identity guards.
{
  const start=dashboardSource.indexOf('function invalidateAdminTripCount()'),end=dashboardSource.indexOf('function loadVerifiedPublicRuntime()',start);
  assert(start>=0&&end>start);const actual=dashboardSource.slice(start,end);
  const make=()=>{
    const nodes=Object.fromEntries(['total','test','time','refresh'].map(key=>[key,{textContent:'—',disabled:false}]));
    const card={isConnected:true,querySelector:selector=>nodes[selector.match(/data-trip-count-([^\]]+)/)[1]]};
    const local={owner:'11111111-1111-4111-8111-111111111111',identity:1,allowed:true,listeners:new Set(),card,loads:[]};
    const state={tab:'dashboard',access:{profile:{id:local.owner,is_active:true}}};
    const api=runInNewContext('let adminTripCountRenderEpoch=0,disposeAdminTripCount=null;\n'+actual+'\n({invalidateAdminTripCount,adminTripCountCard,mountAdminTripCount});',{
      state,document:{querySelector:()=>local.card},authIdentityEpoch:()=>local.identity,currentSession:()=>({user:{id:local.owner}}),
      allowed:()=>local.allowed,onAuthChange:listener=>{local.listeners.add(listener);return()=>local.listeners.delete(listener);},
      loadAdminTripCount:()=>new Promise((resolve,reject)=>local.loads.push({resolve,reject})),Date,String,Boolean,
    });
    return {local,state,nodes,api};
  };
  const result={storedCount:14,markedTestCount:1,startedAt:'2026-10-28T12:00:00.000Z',completedAt:'2026-10-28T12:00:01.000Z'};
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  let f=make();assert.match(f.api.adminTripCountCard(),/Umarkerede rækker er ikke verificerede/);
  f.api.mountAdminTripCount();assert.equal(f.nodes.total.textContent,'HENTER…');f.local.loads[0].resolve(result);await flush();
  assert.equal(f.nodes.total.textContent,'14');assert.equal(f.nodes.test.textContent,'1');assert.equal(f.nodes.refresh.disabled,false);
  void f.nodes.refresh.onclick();assert.equal(f.nodes.total.textContent,'HENTER…');f.local.loads[1].reject(Error('PRIVATE'));await flush();
  assert.equal(f.nodes.total.textContent,'IKKE TILGÆNGELIGT');assert.equal(f.nodes.test.textContent,'—');
  for(const change of [f=>{f.state.tab='users';},f=>{f.local.identity++;},f=>{f.local.owner='other';},
    f=>{f.local.allowed=false;},f=>{f.local.card={};},f=>{f.api.invalidateAdminTripCount();}]){
    f=make();f.api.mountAdminTripCount();change(f);f.local.loads[0].resolve(result);await flush();assert.notEqual(f.nodes.total.textContent,'14');
  }
  f=make();f.api.mountAdminTripCount();f.local.identity++;for(const listener of f.local.listeners)listener();f.local.loads[0].resolve(result);await flush();
  assert.equal(f.nodes.total.textContent,'IKKE TILGÆNGELIGT');
  f=make();f.api.mountAdminTripCount();for(const listener of f.local.listeners)listener();f.local.loads[0].resolve(result);await flush();
  assert.equal(f.nodes.total.textContent,'14','Same-login renewal must preserve the pending count');
  for(const listener of f.local.listeners)listener();assert.equal(f.nodes.total.textContent,'14','Same-login renewal must preserve the displayed count');
  f=make();f.local.allowed=false;assert.equal(f.api.adminTripCountCard(),'');
  console.log('Admin count reader and actual dashboard lifetime: ACL/epoch/owner/admission, stale/error/auth-change/render refusal, counts distinct from real trips; no real HTTP.');
}

{
 const start=dashboardSource.indexOf('async function renderUsers(){'),end=dashboardSource.indexOf('async function renderHandbook()',start);
 assert(start>=0&&end>start);const actual=dashboardSource.slice(start,end);
 const fixture=()=>{
  const ids=Array.from({length:4},(_,i)=>`${String(i+1).repeat(8)}-1111-4111-8111-111111111111`);
  const profiles=ids.map((id,i)=>({id,email:`account${i}@example.invalid`,role:i===0?'owner':'expert',is_active:true,user_permissions:[]}));
  const host={innerHTML:'',isConnected:true,querySelectorAll:()=>[]},scope={textContent:''},select={value:'all'},previous={},next={},refresh={};
  const elements={profilesList:host,accountCategoryScope:scope,accountCategoryFilter:select,previousAccountPage:previous,nextAccountPage:next,refreshAccountCategories:refresh};
  const local={owner:ids[0],identity:1,categoryCalls:0,listeners:new Set(),category:null};
  const state={tab:'users',access:{profile:{id:ids[0],role:'owner'},permissions:new Set()}};
  const report={checkedAt:'2026-10-28T12:00:00.000Z',rows:ids.map((id,i)=>({id,category:['owner','expert','ordinary','unknown'][i],issues:i===2?['ordinary-has-permissions']:[]}))};
  const api=runInNewContext('let adminUserRenderEpoch=0,disposeAdminUserCategories=null;function invalidateAdminUserCategories(){adminUserRenderEpoch++;disposeAdminUserCategories?.();disposeAdminUserCategories=null;}\n'+actual+'\n({renderUsers,invalidateAdminUserCategories});',{
   state,content:{innerHTML:''},document:{querySelector:selector=>elements[selector.slice(1)]||null},authIdentityEpoch:()=>local.identity,currentSession:()=>({user:{id:local.owner}}),
   PERMISSIONS:[{id:'full_admin',label:'Full'}],EXPERT_PERMISSIONS:[{id:'handbook_review',label:'Review'}],listProfiles:async()=>profiles,
   onAuthChange:listener=>{local.listeners.add(listener);return()=>local.listeners.delete(listener);},
   loadAdminAccountCategories:async requested=>{local.categoryCalls++;assert.deepEqual([...requested],ids);return local.category?local.category():report;},
   filterAdminAccountProfiles:filterAdminAccountProfilesForTest,esc:value=>String(value??'').replaceAll('<','&lt;'),Date,Map,Set,Boolean,
  });return {ids,profiles,host,scope,select,local,state,api};
 };
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 let f=fixture();await f.api.renderUsers();await flush();assert.equal(f.local.categoryCalls,1);
 assert.match(f.host.innerHTML,/Almindelig bruger/);assert.match(f.host.innerHTML,/Har rettigheder/);assert.match(f.host.innerHTML,/Ukendt kategori/);
 assert.match(f.scope.textContent,/ikke en fuld kontofortegnelse/);f.select.value='ordinary';f.select.onchange();
 assert.match(f.host.innerHTML,/account2@example/);assert.doesNotMatch(f.host.innerHTML,/account0@example|account1@example|account3@example/);
 f.select.value='all';f.select.onchange();assert.match(f.host.innerHTML,/account3@example/);
 for(const listener of f.local.listeners)listener();assert.match(f.host.innerHTML,/account3@example/,'Same-login renewal must preserve the current profile view');
 f.local.identity++;for(const listener of f.local.listeners)listener();assert.doesNotMatch(f.host.innerHTML,/@example/);assert.deepEqual([...f.state.profiles],[]);
 f=fixture();let renewRelease;f.local.category=()=>new Promise(resolve=>{renewRelease=resolve;});await f.api.renderUsers();await flush();
 for(const listener of f.local.listeners)listener();renewRelease({rows:f.ids.map((id,i)=>({id,category:['owner','expert','ordinary','unknown'][i],issues:[]})),checkedAt:'2026-10-28T12:00:00.000Z'});await flush();
 assert.match(f.host.innerHTML,/Almindelig bruger/,'Same-login renewal must preserve a pending category response');
 f=fixture();let release;f.local.category=()=>new Promise(resolve=>{release=resolve;});await f.api.renderUsers();await flush();const before=f.host.innerHTML;
 f.api.invalidateAdminUserCategories();release({rows:[],checkedAt:'2026-10-28T12:00:00.000Z'});await flush();assert.equal(f.host.innerHTML,before);
 f=fixture();f.state.access.profile.role='expert';await f.api.renderUsers();await flush();assert.equal(f.local.categoryCalls,0);
 const browserSource=fs.readFileSync(new URL('../js/services/admin-account-categories.js',import.meta.url),'utf8');
 assert.doesNotMatch(browserSource,/DESIGNATED_EXPERT|@ravradar/);assert.doesNotMatch(dashboardSource,/@(?:gmail|ravradar)\./i);
 console.log('Admin account category UI: existing row scope/permissions preserved; exact server categories, all/owner/expert/ordinary filter, unknown separate, limited manager gets no category authority, stale/auth-change output rejected.');
}

// Actual Datakvalitet renderer; only synthetic state/DOM, no producer changes or HTTP.
{
 const start=dashboardSource.indexOf('function renderWeather(){'),end=dashboardSource.indexOf('function saveWaterRouting()',start);
 assert(start>=0&&end>start);const actual=dashboardSource.slice(start,end);
 const generatedAt='2026-10-28T12:00:00.000Z';
 const release=dashboardSource.match(/^const VERSION='(\d+\.\d+\.\d+)';$/m)?.[1];assert(release);
 const fixture=()=>{
  const components=Object.fromEntries(['wind','wave','current','waterLevel','waterTemperature'].map(key=>[key,{totalZones:2,missing:0,providers:key==='waterTemperature'?{unknown:2}:{dmi:2}}]));
  return {publicManifest:{generatedAt},conditions:{generatedAt,zones:{}},zones:[],
   runtimeDetails:{generatedAt,version:release,componentCoverage:components,acquisition:{requestsUsed:0,stoppedByHttp429:false,persistentRateLimitedUntil:null},dataQuality:{generatedAt,status:'ok',issueCounts:{errors:0,warnings:0},issues:[],observations:{stationsWithFreshLevel:0},stationLifecycle:{total:0}}},
   health:{generatedAt,userData:{completeZones:2,totalZones:2,healthy:true},dmi:{totalZones:2},dmiForecastCache:{completeZones:2,windZones:2,waveZones:2,currentZones:2,waterLevelZones:2,duplicateTimestampZones:0}},
   oceanDiagnostics:{generatedAt:'2026-10-28T11:00:00.123456Z',summary:{freshMarineZones:0,preservedMarineZones:2,fallbackOrMissingMarineZones:1},missingZones:{z1:{reason:'MISSING_CURRENT',collectionsTried:['test-model'],nearestValidDistanceKm:null}}},
   cacheAudit:{generatedAt:'2026-10-28T10:00:00.000Z',before:{bytes:123},after:{bytes:45,files:2},removedFiles:3},
   implementationAudit:{generatedAt:'2026-10-28T13:00:00.000Z',version:release,summary:{hourlyProviderSwitches:{wind:0,wave:0,current:0,waterLevel:0,waterTemperature:0}},issueCounts:{errors:0,warnings:0}}};
 };
 const render=state=>{
  const before=JSON.stringify(state),content={innerHTML:''},elements={weatherZoneSearch:{value:''},weatherZoneRows:{innerHTML:''},downloadRuntime:{}};
  runInNewContext(actual+'\nrenderWeather();',{state,content,VERSION:release,document:{querySelector:selector=>elements[selector.slice(1)]},
   esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
   publicSourceBadge:()=>'',Date,Number,Object,Array,Math,Boolean,String,allowed:()=>false});
  assert.equal(JSON.stringify(state),before,'Datakvalitet må ikke ændre diagnoseinput');return content.innerHTML;
 };
 const row=(html,key)=>html.match(new RegExp('<tr data-component="'+key+'">[\\s\\S]*?</tr>'))?.[0]||'';
 let state=fixture(),html=render(state);
 assert.equal((html.match(/data-component=/g)||[]).length,5);
 assert.match(row(html,'waterTemperature'),/Vandtemperatur[\s\S]*Ikke opgjort i denne cachekontrakt[\s\S]*0\/2[\s\S]*unknown: 2/);
 assert.match(html,/Fire aktuelle felter ved generering/);assert.match(html,/mindst 96 timers vind og 24 timers/);
 assert.doesNotMatch(html,/Brugerprognosen kan anvendes|Alle DMI-komponenter|status-good/);
 assert.match(html,/0 forespørgsler registreret/);assert.match(html,/MISSING_CURRENT/);assert.match(html,/test-model/);
 assert.doesNotMatch(html,/null km|0 km|Ingen manglende marine zoner registreret/);
 assert.match(html,/<b>Før oprydning:<\/b> 123 bytes/);assert.match(html,/<b>Efter:<\/b> 45 bytes/);
 assert.match(html,/<b>Filer efter:<\/b> 2/);assert.match(html,/<b>Slettet:<\/b> 3/);
 assert.match(html,/Ingen registrerede problemer i denne generations diagnose/);
 state=fixture();for(const key of ['runtimeDetails','health','oceanDiagnostics','cacheAudit','implementationAudit'])state[key]=null;html=render(state);
 assert.match(html,/Ukendt/);assert.doesNotMatch(html,/0\/0|status-good|Ingen registrerede problemer|Ingen manglende marine zoner registreret/);
 for(const bad of [null,undefined,'not-a-date','2026-02-30T12:00:00.000Z','2026-10-27T12:00:00.000Z']){
  state=fixture();state.runtimeDetails.generatedAt=bad;html=render(state);assert.match(row(html,'wind'),/<td>Ukendt<\/td><td>Ukendt<\/td><\/tr>/);
 }
 for(const changed of [s=>{delete s.publicManifest.generatedAt;},s=>{s.publicManifest.generatedAt='2026-10-27T12:00:00.000Z';},
  s=>{s.conditions.generatedAt=null;},s=>{s.runtimeDetails.version=undefined;},s=>{s.runtimeDetails.version='0.0.0';},
  s=>{s.runtime=s.runtimeDetails;s.runtimeDetails=null;}]){
  state=fixture();changed(state);html=render(state);assert.match(row(html,'wind'),/<td>Ukendt<\/td><td>Ukendt<\/td><\/tr>/);assert.doesNotMatch(html,/Ingen registrerede problemer/);
 }
 for(const bad of [null,undefined,'0',false,-1,NaN]){
  state=fixture();state.health.dmiForecastCache.windZones=bad;state.runtimeDetails.componentCoverage.wind.missing=bad;
  html=render(state);assert.match(row(html,'wind'),/<td>Ukendt<\/td><td>Ukendt<\/td>/);
 }
 state=fixture();state.health.generatedAt=null;html=render(state);assert.match(row(html,'wind'),/<td>Ukendt<\/td><td>0\/2<\/td>/);
 state=fixture();state.health.userData.completeZones=3;html=render(state);assert.match(html,/Fire aktuelle felter ved generering<\/h2><div class="metric">Ukendt/);
 state=fixture();state.oceanDiagnostics.missingZones={};html=render(state);assert.match(html,/Ingen manglende marine zoner registreret i denne daterede rapport/);
 state.oceanDiagnostics.generatedAt=null;html=render(state);assert.doesNotMatch(html,/Ingen manglende marine zoner registreret/);
 state=fixture();delete state.oceanDiagnostics.missingZones;html=render(state);assert.match(html,/Ikke oplyst med et kendt rapporttidspunkt/);
 state=fixture();state.runtimeDetails.dataQuality.generatedAt=null;html=render(state);assert.doesNotMatch(html,/Ingen registrerede problemer/);
 state=fixture();state.runtimeDetails.dataQuality.issues=null;html=render(state);assert.doesNotMatch(html,/Ingen registrerede problemer/);
 state=fixture();state.runtimeDetails.dataQuality.issueCounts.errors=1;html=render(state);assert.doesNotMatch(html,/Ingen registrerede problemer/);
 state=fixture();state.runtimeDetails.acquisition.requestsUsed=undefined;state.runtimeDetails.acquisition.stoppedByHttp429=undefined;html=render(state);assert.match(html,/DMI-kørslens registrering<\/h2><div class="metric">Ukendt/);
 state=fixture();state.runtimeDetails.acquisition.stoppedByHttp429=true;assert.match(render(state),/HTTP 429/);
 state=fixture();state.runtimeDetails.acquisition.persistentRateLimitedUntil='2099-01-01T00:00:00.000Z';assert.match(render(state),/Cooldown aktiv/);
 state=fixture();state.runtimeDetails.componentCoverage.wind.providers={'<img src=x>':2};state.oceanDiagnostics.missingZones.z1.reason='<script>x</script>';
 html=render(state);assert.match(html,/&lt;img src=x&gt;: 2/);assert.match(html,/&lt;script&gt;x&lt;\/script&gt;/);assert.doesNotMatch(html,/<img src=x>|<script>x/);
 console.log('Admin Datakvalitet: actual renderer preserves five-family/current-vs-cache scope, unknown versus missing/zero, dates and versions, exact ocean/cache producer keys and escaped immutable input; no HTTP.');
}

// ADMIN_LOCAL_LEARNING_SCOPE_NORMAL_TARGET_START
{
 const start=dashboardSource.indexOf('function renderLearning(){'),end=dashboardSource.indexOf('\nconst saveBadge',start);
 assert(start>=0&&end>start);const actual=dashboardSource.slice(start,end);
 const oldLabel="<h2>Registrerede ture</h2><div class=\"metric\">${analysis.sampleSize||0}</div><p class=\"muted\">Kun dækningskontrol</p>",newLabel="<h2>Ture i lokalt datagrundlag</h2><div class=\"metric\">${analysis.sampleSize||0}</div><p class=\"muted\">Kun lokale ture, der opfylder visningens model- og evidenskrav. Samlet turtal findes i Overblik.</p>";
 assert.equal(actual.split(newLabel).length,2);const previous=actual.replace(newLabel,oldLabel);
 const render=(source,sampleSize,eligible,ok=true)=>{
  const analysis=Object.freeze({sampleSize,sourceCount:19,excludedCount:19-sampleSize,zoneCount:2,
   noFindCount:1,effortCount:sampleSize,snapshotLinkCount:sampleSize,modes:Object.freeze({beach:sampleSize,waders:0})});
  const output={innerHTML:''};let reads=0;
  runInNewContext(source+'\nrenderLearning();',{content:output,
   analyzeObservations(){reads++;return analysis;},
   activePublicRavScoreState:()=>({ok,value:{observationCalibrationEligible:eligible,labelDa:'Aktuel model'}}),
   activeModelUnavailableCard:()=>'<p>Ukendt model</p>',esc:value=>String(value),
   loadAdminTripCount(){throw Error('LOCAL_LEARNING_MUST_NOT_READ_CENTRAL_TRIPS');},
   fetch(){throw Error('LOCAL_LEARNING_MUST_NOT_ADD_HTTP');}});
  assert.equal(reads,1);assert.equal(analysis.sampleSize,sampleSize);return output.innerHTML;
 };
 for(const size of [0,7])for(const eligible of [false,true]){
  const html=render(actual,size,eligible),old=render(previous,size,eligible);
  assert.match(html,/<h2>Ture i lokalt datagrundlag<\/h2>/);
  assert(html.includes('<div class="metric">'+size+'</div>'));
  assert(html.includes('Kun lokale ture, der opfylder visningens model- og evidenskrav. Samlet turtal findes i Overblik.'));
  assert.equal(html.replace('Ture i lokalt datagrundlag','Registrerede ture').replace(
   'Kun lokale ture, der opfylder visningens model- og evidenskrav. Samlet turtal findes i Overblik.','Kun dækningskontrol'),old,
   'All counts, model/calibration guards and other rendered bytes survive this label-only correction');
 }
 assert.equal(render(actual,7,true,false),render(previous,7,true,false),'Unavailable public model keeps its original refusal');
 console.log('Admin local-learning scope: actual renderer labels its local evidence-filtered count; all numbers and guards unchanged, no central trip read/HTTP.');
}
// ADMIN_LOCAL_LEARNING_SCOPE_NORMAL_TARGET_END
