import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { assertAggregateRequest } from '../../supabase/functions/_shared/trip-aggregate-contract.js';
import { prepareTripWeatherAggregate, prepareReadyTripWeatherAggregate, aggregateContributionSubjects } from './trip-aggregate.js';
import { readTripWeatherAggregateJob, assertServerSelectedAggregateRequest } from './trip-aggregate-job.js';
import { POLICY, fail, makePrivateNoisyProposal, assertPrivateNoisyProposal } from './trip-aggregate-dp.js';

export const ACCOUNTING_POLICY=Object.freeze({
  id:'rr-account-lifetime-two-months-UNISSUED',scope:'PER_ACCOUNT_LIFETIME',
  maximumUnits:8,costUnits:4,maximumContributionMonths:2,
  acrossModelsAndPolicies:true,refund:false,namespaceReset:false,publicReleaseIssued:false,
});
export const accountingPolicySha256=()=>sha256Hex(canonicalJson(ACCOUNTING_POLICY));
const COLUMNS=['schema_version','ledger_id','release_key','period_start','period_end',
  'model_binding_sha256','policy_sha256','budget_units','proposal_only','report_json','report_sha256',
  'preference_basis_sha256','erasure_basis_sha256','contributor_subjects_json','accounting_sha256','created_at'];
const ERASURE_SQL='select owner_subject from trip_owner_erasure_tombstones order by owner_subject limit 10001';
const ERASURE_AT_INSERT=`(select json_group_array(owner_subject) from
  (select owner_subject from trip_owner_erasure_tombstones order by owner_subject))`;
const SUBJECT=/^usr_v1_[A-Za-z0-9_-]{43}$/;
function subjectsFromJson(text){
  let subjects;try{subjects=JSON.parse(text);}catch{fail('DP_LEDGER_INTEGRITY_INVALID');}
  if(!Array.isArray(subjects)||subjects.length>1000||canonicalJson(subjects)!==text)fail('DP_LEDGER_INTEGRITY_INVALID');
  let previous='';for(const subject of subjects){if(typeof subject!=='string'||!SUBJECT.test(subject)||subject<=previous)fail('DP_LEDGER_INTEGRITY_INVALID');previous=subject;}
  return subjects;
}
async function readBasis(control,request){
  let reply;try{reply=await control.prepare(ERASURE_SQL).bind().all();}catch{fail('DP_ERASURE_BASIS_UNAVAILABLE');}
  if(reply?.success!==true||!Array.isArray(reply.results)||reply.results.length>10000)fail('DP_ERASURE_BASIS_INVALID');
  let previous='';const owners=[];
  for(const row of reply.results){
    if(!row||Object.keys(row).join(',')!=='owner_subject'||typeof row.owner_subject!=='string'
      ||!/^(usr|anon)_v1_[A-Za-z0-9_-]{43}$/.test(row.owner_subject)||row.owner_subject<=previous)fail('DP_ERASURE_BASIS_INVALID');
    previous=row.owner_subject;owners.push(previous);
  }
  const erasureJson=canonicalJson(owners);
  return{preferenceSha256:await sha256Hex(canonicalJson(request.preferenceSnapshot.accounts)),
    erasureSha256:await sha256Hex(erasureJson),erasureJson};
}
async function assertBasisUnchanged(control,request,expected){
  const actual=await readBasis(control,request);
  if(actual.preferenceSha256!==expected.preferenceSha256||actual.erasureSha256!==expected.erasureSha256)fail('DP_REVIEW_BASIS_CHANGED');
}
async function readFrozen(control,period,requiredExportBasis=null){
  let reply;try{reply=await control.prepare(`select ${COLUMNS.join(',')} from trip_weather_aggregate_releases where period_start=?`).bind(period.start).all();}
  catch{fail('DP_LEDGER_READ_FAILED');}
  if(reply?.success!==true||!Array.isArray(reply.results)||reply.results.length>1)fail('DP_LEDGER_READ_FAILED');
  if(!reply.results.length)return null;
  const row=reply.results[0];let report;try{report=JSON.parse(row.report_json);}catch{fail('DP_LEDGER_INTEGRITY_INVALID');}
  await assertPrivateNoisyProposal(report);
  const key=await sha256Hex(canonicalJson({ledgerId:POLICY.namespace,period:report.period}));
  if(Object.keys(row).sort().join(',')!==[...COLUMNS].sort().join(',')
    ||row.schema_version!==1||row.ledger_id!==POLICY.namespace||row.release_key!==key
    ||row.period_start!==period.start||row.period_end!==period.end
    ||report.period.start!==period.start||report.period.end!==period.end
    ||row.budget_units!==4||row.proposal_only!==1
    ||row.model_binding_sha256!==await sha256Hex(canonicalJson(report.modelBinding))
    ||row.policy_sha256!==report.policySha256||row.report_sha256!==await sha256Hex(canonicalJson(report))
    ||row.accounting_sha256!==await accountingPolicySha256()
    ||![row.preference_basis_sha256,row.erasure_basis_sha256].every(x=>/^[a-f0-9]{64}$/.test(x)))fail('DP_LEDGER_INTEGRITY_INVALID');
  if(requiredExportBasis&&(row.preference_basis_sha256!==requiredExportBasis.preferenceSha256
    ||row.erasure_basis_sha256!==requiredExportBasis.erasureSha256))fail('DP_STUDY_CONSENT_BASIS_CHANGED');
  const subjects=subjectsFromJson(row.contributor_subjects_json);
  let charges;try{charges=await control.prepare(`select owner_subject,period_start,budget_units from trip_weather_aggregate_account_charges
    where release_key=? order by owner_subject`).bind(key).all();}catch{fail('DP_LEDGER_INTEGRITY_INVALID');}
  if(charges?.success!==true||!Array.isArray(charges.results)||charges.results.length!==subjects.length
    ||charges.results.some((item,index)=>!item||Object.keys(item).sort().join(',')!=='budget_units,owner_subject,period_start'
      ||item.owner_subject!==subjects[index]||item.period_start!==period.start||item.budget_units!==4))fail('DP_LEDGER_INTEGRITY_INVALID');
  // A frozen proposal is never resampled/recharged after model/consent/erasure changes.
  // This INTERNAL replay does not authorize first publication under a new consent state.
  return report;
}
function assertDatabases(databases,request){
  assertServerSelectedAggregateRequest(request);
  if(!Array.isArray(databases)||databases.length!==10)fail('DP_SHARDS_INVALID');
}
export async function verifyPersistedReviewProposal(databaseList,request){
  assertDatabases(databaseList,request);
  const control=databaseList[0],basis=await readBasis(control,request);
  const report=await readFrozen(control,request.period,basis);if(!report)fail('DP_REVIEW_MISSING');
  await assertBasisUnchanged(control,request,basis);
  return{kind:'PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE',status:'REPLAY',report,accountingSha256:await accountingPolicySha256()};
}
export async function preparePersistedReviewProposal(databaseList,request,options={}){
  assertAggregateRequest(request,ravScoreModelBinding());
  return preparePersistedReviewUsing(databaseList,request,prepareTripWeatherAggregate,options);
}
// Separate internal entry, not an HTTP/user option. Frozen replay still requires
// a current, genuine READY_INPUT job with unchanged model/consent/erasure basis.
export async function preparePersistedReadyInputReviewProposal(databaseList,request,options={}){
  const job=await readTripWeatherAggregateJob(databaseList,request);
  if(job.phase!=='READY_INPUT')fail('AGGREGATE_JOB_NOT_READY');
  return preparePersistedReviewUsing(databaseList,request,prepareReadyTripWeatherAggregate,options);
}
async function preparePersistedReviewUsing(databaseList,request,prepareCandidate,{randomFill}={}){
  assertDatabases(databaseList,request);
  const control=databaseList[0],existing=await readFrozen(control,request.period);
  if(existing)return{kind:'PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE',status:'REPLAY',report:existing,accountingSha256:await accountingPolicySha256()};
  const basis=await readBasis(control,request),candidate=await prepareCandidate(databaseList,request);
  await assertBasisUnchanged(control,request,basis);
  const subjects=canonicalJson(aggregateContributionSubjects(candidate));subjectsFromJson(subjects);
  const report=await makePrivateNoisyProposal(candidate,request,{randomFill}),body=canonicalJson(report);
  const key=await sha256Hex(canonicalJson({ledgerId:POLICY.namespace,period:report.period}));
  const accountingSha256=await accountingPolicySha256();let reply;
  try{
    // Report AND all account charges commit in ONE control-shard SQLite statement.
    // The AFTER INSERT trigger creates charges atomically; a failed trigger rolls back all.
    reply=await control.prepare(`insert into trip_weather_aggregate_releases
      (schema_version,ledger_id,release_key,period_start,period_end,model_binding_sha256,policy_sha256,budget_units,proposal_only,
       report_json,report_sha256,preference_basis_sha256,erasure_basis_sha256,contributor_subjects_json,accounting_sha256)
      select 1,?,?,?,?,?,?,4,1,?,?,?,?,?,?
      where not exists(select 1 from trip_weather_aggregate_releases where period_start=?)
      and not exists(select 1 from json_each(?) selected where
        (select coalesce(sum(budget_units),0) from trip_weather_aggregate_account_charges where owner_subject=selected.value)+4>8)
      and ${ERASURE_AT_INSERT}=?`)
      .bind(POLICY.namespace,key,request.period.start,request.period.end,await sha256Hex(canonicalJson(report.modelBinding)),
        report.policySha256,body,await sha256Hex(body),basis.preferenceSha256,basis.erasureSha256,subjects,accountingSha256,
        request.period.start,subjects,basis.erasureJson).run();
  }catch{fail('DP_LEDGER_WRITE_OUTCOME_UNKNOWN');}
  if(reply?.success!==true||![0,1].includes(reply.meta?.changes))fail('DP_LEDGER_WRITE_OUTCOME_UNKNOWN');
  await assertBasisUnchanged(control,request,basis);
  const frozen=await readFrozen(control,request.period);
  if(!frozen)fail(reply.meta.changes===0?'DP_ACCOUNT_BUDGET_BASIS_CHANGED':'DP_LEDGER_WRITE_OUTCOME_UNKNOWN');
  await assertBasisUnchanged(control,request,basis);
  return{kind:'PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE',status:reply.meta.changes===1?'PERSISTED':'REPLAY',report:frozen,accountingSha256};
}
