// Small normal metadata/order target. No national fixture, weather or admission.
import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import {assertCandidateGRollbackPublicStageMetadata,auditCandidateGRollbackPublicRuntime}
  from './audit-candidate-g-rollback-public-runtime.mjs';
import {candidateGRollbackScoreProfile} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {ravScoreModelBinding} from './rollback-assets/ravscore-model-contract.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

test('normal Candidate G metadata rejects six independent shapes before whole-candidate hashing',async()=>{
  const fields=['schemaVersion','kind','mode','sourceHead','datasetId','productionReferenceAt',
    'privateBundleContentSha256','sourceImplementationClosureSha256','requestedImplementationClosureSha256',
    'centralExpectedVersion','sourceModelBinding','activeModelBinding','candidateTargetProfileSha256',
    'candidateTargetProfile','rollbackId','automaticActivationAllowed','schedulerActivationAllowed',
    'calibrationEligible','planSha256','candidateFullSha256','privatePayloadLogged'];
  const plan=Object.fromEntries(fields.map(field=>[field,null]));
  Object.assign(plan,{mode:'dry-run',sourceHead:'a'.repeat(40),datasetId:'synthetic-metadata-only',
    productionReferenceAt:'2026-10-31T00:00:00.000Z',sourceImplementationClosureSha256:'b'.repeat(64),
    requestedImplementationClosureSha256:'c'.repeat(64),candidateTargetProfileSha256:'d'.repeat(64),
    candidateFullSha256:'e'.repeat(64),privatePayloadLogged:false});
  const {planSha256,candidateFullSha256,privatePayloadLogged,...body}=plan;plan.planSha256=sha(body);
  const stageMarker={schemaVersion:'candidate-g-operational-rollback-stage-v2',
    kind:'CANDIDATE_G_OPERATIONAL_ROLLBACK_ISOLATED_STAGE',...Object.fromEntries([
      'mode','sourceHead','datasetId','productionReferenceAt','planSha256','candidateFullSha256',
      'privateBundleContentSha256','sourceImplementationClosureSha256','requestedImplementationClosureSha256',
      'candidateTargetProfileSha256'].map(field=>[field,plan[field]])),modelBinding:ravScoreModelBinding(),
    automaticActivationAllowed:false,schedulerActivationAllowed:false,publicArtifactReady:false,
    installed:[['data/live/conditions.json','PRIVATE_STAGE_INPUT'],
      ['js/core/ravscore-model-contract.js','PUBLIC_MODEL_IMPLEMENTATION'],
      ['js/core/ravscore-model-bundle.generated.js','PUBLIC_MODEL_IMPLEMENTATION']]
      .map(([path,privacyClass])=>({path,privacyClass,sha256:'f'.repeat(64)}))};
  const manifest={ravScoreProfile:candidateGRollbackScoreProfile({modelCoverageReady:true,modelMemoryReady:true,modelMigrationReady:true})};
  const input={plan,stageMarker,manifest,candidateFull:{unhashableBeforeAdmission:1n},
    expectedSourceHead:plan.sourceHead,expectedDatasetId:plan.datasetId};
  assert.deepEqual(assertCandidateGRollbackPublicStageMetadata(input),ravScoreModelBinding());
  for(const[field,mutate,pattern]of [
    ['manifest',v=>{delete v.ravScoreProfile.rankingPolicyId;},/score.profile field set/],
    ['manifest',v=>{v.ravScoreProfile.extra='forbidden';},/score.profile field set/],
    ['manifest',v=>{v.ravScoreProfile.bestTimePolicyId='forged';},/does not match bestTimePolicyId/],
    ['stageMarker',v=>{v.publicArtifactReady=true;},/stage marker is incompatible/],
    ['stageMarker',v=>{v.candidateTargetProfileSha256='0'.repeat(64);},/stage marker is incompatible/],
    ['stageMarker',v=>{v.unsealedField=true;},/stage marker is incompatible/],
  ]){const changed=structuredClone(input[field]);mutate(changed);
    await assert.rejects(()=>auditCandidateGRollbackPublicRuntime({...input,[field]:changed}),pattern);}
  // Valid cheap shapes must still reach the unchanged canonical-hash boundary.
  // This synthetic metadata never qualifies a plan or a public artifact.
  await assert.rejects(()=>auditCandidateGRollbackPublicRuntime(input),error=>error instanceof TypeError&&/BigInt/.test(error.message));
});
