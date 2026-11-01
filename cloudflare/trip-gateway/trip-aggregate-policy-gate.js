import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { AGGREGATE_LIMITS, assertAggregateRequest, aggregateWithheldReport, aggregatePendingReport } from '../../supabase/functions/_shared/trip-aggregate-contract.js';
import { POLICY, fail } from './trip-aggregate-dp.js';
import { CATEGORICAL_POLICY, assertPrivateTripStudyReport } from './trip-aggregate-categorical.js';
import { startTripWeatherAggregateJob, advanceTripWeatherAggregateJob, selectPendingTripWeatherAggregateRequest, selectReadyTripWeatherAggregateRequest, assertServerSelectedAggregateRequest } from './trip-aggregate-job.js';
import { preparePersistedReviewProposal, preparePersistedReadyInputReviewProposal, verifyPersistedReviewProposal, ACCOUNTING_POLICY, accountingPolicySha256 } from './trip-aggregate-ledger.js';

// Pins the already reviewed, still UNISSUED v2 basis. Not an env flag, policy
// issuer, lifetime reset or anonymity promise. Any changed basis needs review.
export const POLICY_ANCHOR = Object.freeze({
  schema_version:1, ledger_id:'rr-trip-descriptive-GLOBAL',
  policy_sha256:'3587b34f5e3c96f328a56a954db84560977a1e1c614732bbb9887962792a13c9',
  mechanism_sha256:'ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b',
  accounting_scope:'PER_ACCOUNT_LIFETIME', accounting_sha256:'1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56',
  cost_units:4, maximum_units:8, status:'PRIVATE_UNISSUED_REVIEW_ONLY', public_release_issued:0,
});
export async function assertReviewPolicyAnchor(control) {
  if (ACCOUNTING_POLICY.scope!=='PER_ACCOUNT_LIFETIME' || ACCOUNTING_POLICY.maximumUnits!==8
      || ACCOUNTING_POLICY.costUnits!==4 || ACCOUNTING_POLICY.maximumContributionMonths!==2
      || ACCOUNTING_POLICY.refund!==false || ACCOUNTING_POLICY.publicReleaseIssued!==false
      || await accountingPolicySha256()!==POLICY_ANCHOR.accounting_sha256) fail('DP_ACCOUNTING_BASIS_MISMATCH');
  if (POLICY.namespace!==POLICY_ANCHOR.ledger_id || POLICY.costUnits!==4
      || POLICY.lifetimeBudgetUnits!==8 || POLICY.alphaNumerator!==7 || POLICY.alphaDenominator!==8
      || POLICY.countBound!==1000 || POLICY.contributionPerAccountPerMonth!==1
      || POLICY.coordinatesPerContribution!==4 || POLICY.publicReleaseIssued!==false
      || await sha256Hex(canonicalJson(POLICY))!==POLICY_ANCHOR.policy_sha256) fail('DP_POLICY_BASIS_MISMATCH');
  let reply;
  try { reply=await control.prepare(`select ${Object.keys(POLICY_ANCHOR).join(',')}
    from trip_weather_aggregate_policy_anchor`).bind().all(); }
  catch { fail('DP_POLICY_ANCHOR_UNAVAILABLE'); }
  if (reply?.success!==true || !Array.isArray(reply.results) || reply.results.length!==1
      || canonicalJson(reply.results[0])!==canonicalJson(POLICY_ANCHOR)) fail('DP_POLICY_ANCHOR_INVALID');
  return POLICY_ANCHOR;
}
export const CATEGORICAL_POLICY_ANCHOR = Object.freeze({
  "schema_version": 1,
  "ledger_id": "rr-trip-descriptive-GLOBAL",
  "report_schema_version": 3,
  "cell_count": 160,
  "policy_sha256": "58ea1d3d218ca754aa511bc55d25bc7d5dbc9dcbbe580ffb7ecd656df56ee1c6",
  "mechanism_sha256": "68b677e15effda12cf4b48a29b888f14218a3537b0b6342e927be1aaf0f56af6",
  "legacy_mechanism_sha256": "ffd3389017064fce904ec2f8f850b4e60248db0e29185f9a0ed83021be73117b",
  "accounting_sha256": "1e79fc2cd2ba9c06c07537458b4628d3a6ae878b750a69885a256108206feb56",
  "cost_units": 4,
  "maximum_units": 8,
  "status": "PRIVATE_UNISSUED_REVIEW_ONLY",
  "public_release_issued": 0
});
// Only a known absent additive schema preserves the old binary producer.
// Read/shape/hash errors never become absence or a silent policy fallback.
export async function readCategoricalReportPolicy(control) {
  const found=await control.prepare("select type,name from sqlite_master where name='trip_weather_aggregate_categorical_policy_anchor'").bind().all();
  if(found?.success!==true||!Array.isArray(found.results)||found.results.length>1)fail('DP_CATEGORICAL_POLICY_UNAVAILABLE');
  if(found.results.length===0)return null;
  const row=found.results[0];
  if(!row||Object.keys(row).sort().join(',')!=='name,type'||row.type!=='table'||row.name!=='trip_weather_aggregate_categorical_policy_anchor')fail('DP_CATEGORICAL_POLICY_INVALID');
  if(CATEGORICAL_POLICY.namespace!==POLICY_ANCHOR.ledger_id||CATEGORICAL_POLICY.costUnits!==4
    ||CATEGORICAL_POLICY.lifetimeBudgetUnits!==8||CATEGORICAL_POLICY.coordinatesPerContribution!==4
    ||CATEGORICAL_POLICY.contributionPerAccountPerMonth!==1||CATEGORICAL_POLICY.alphaNumerator!==7
    ||CATEGORICAL_POLICY.alphaDenominator!==8||CATEGORICAL_POLICY.countBound!==1000
    ||CATEGORICAL_POLICY.publicReleaseIssued!==false||CATEGORICAL_POLICY.legacySamplerSha256!==POLICY_ANCHOR.mechanism_sha256
    ||await sha256Hex(canonicalJson(CATEGORICAL_POLICY))!==CATEGORICAL_POLICY_ANCHOR.policy_sha256)fail('DP_CATEGORICAL_POLICY_INVALID');
  const reply=await control.prepare('select '+Object.keys(CATEGORICAL_POLICY_ANCHOR).join(',')+' from trip_weather_aggregate_categorical_policy_anchor').bind().all();
  if(reply?.success!==true||!Array.isArray(reply.results)||reply.results.length!==1
    ||canonicalJson(reply.results[0])!==canonicalJson(CATEGORICAL_POLICY_ANCHOR))fail('DP_CATEGORICAL_POLICY_INVALID');
  return CATEGORICAL_POLICY;
}
export async function assertStoredReportPolicy(control,report) {
  await assertPrivateTripStudyReport(report);
  if(report.schemaVersion===3&&!await readCategoricalReportPolicy(control))fail('DP_CATEGORICAL_POLICY_UNAVAILABLE');
  return report;
}

// The existing45-query ceiling covers this WHOLE invocation, not45 source
// reads plus uncounted policy/replay/write calls. No provider limit is raised.
export function policyQueryBoundDatabases(databases) {
  let queries=0;
  const counted=(statement,method)=>{
    if (++queries>AGGREGATE_LIMITS.selectQueries) fail('DP_GLOBAL_QUERY_BUDGET_EXCEEDED');
    return statement[method]();
  };
  const originals=new WeakMap();
  const wrap=(statement,database)=>{
    const wrapped={bind(...args){return wrap(statement.bind(...args),database);},
      all(){return counted(statement,'all');},run(){return counted(statement,'run');}};
    originals.set(wrapped,{statement,database});return wrapped;
  };
  return databases.map(database=>({prepare(sql){return wrap(database.prepare(sql),database);},
    ...(typeof database.batch==='function'?{batch(statements){
      if(!Array.isArray(statements)||!statements.length||statements.some(item=>originals.get(item)?.database!==database))fail('DP_BATCH_STATEMENT_INVALID');
      if((queries+=statements.length)>AGGREGATE_LIMITS.selectQueries)fail('DP_GLOBAL_QUERY_BUDGET_EXCEEDED');
      return database.batch(statements.map(item=>originals.get(item).statement));
    }}:{})}));
}
export async function preparePolicyBoundReview(databaseList, request, options={}) {
  return preparePolicyBoundReviewUsing(databaseList,request,preparePersistedReviewProposal,options);
}
// Server-internal normal READY_INPUT consumer; no HTTP route/flag is added.
export async function prepareReadyInputPolicyBoundReview(databaseList, request, options={}) {
  return preparePolicyBoundReviewUsing(databaseList,request,preparePersistedReadyInputReviewProposal,options);
}
async function preparePolicyBoundReviewUsing(databaseList, request, prepare, {randomFill}={}) {
  if(prepare===preparePersistedReadyInputReviewProposal)assertServerSelectedAggregateRequest(request);
  else assertAggregateRequest(request,ravScoreModelBinding());
  if (!Array.isArray(databaseList)||databaseList.length!==10) fail('DP_SHARDS_INVALID');
  const bounded=policyQueryBoundDatabases(databaseList);
  await assertReviewPolicyAnchor(bounded[0]);
  const result=await prepare(bounded,request,{randomFill});
  await assertReviewPolicyAnchor(bounded[0]);
  if (result?.kind!=='PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE' || !['PERSISTED','REPLAY'].includes(result.status)
      || result.report?.publicReleaseIssued!==false
      || result.accountingSha256!==POLICY_ANCHOR.accounting_sha256) fail('DP_POLICY_BASIS_MISMATCH');
  await assertStoredReportPolicy(bounded[0],result.report);
  return result;
}
// Actual signed Worker may prepare/replay privately, but its HTTP DTO remains
// the original fixed withheld shape. No count, origin, budget or error detail
// is serialized. Policy issuance/public transcript/CPU remain separate gates.
export async function handlePolicyBoundAggregate(databaseList,request) {
  assertAggregateRequest(request,ravScoreModelBinding());
  if (!Array.isArray(databaseList)||databaseList.length!==10) fail('DP_SHARDS_INVALID');
  // ONE shared45-statement allowance covers discovery AND the selected step.
  // No request field selects an executor or revives monolithic preparation.
  const bounded=policyQueryBoundDatabases(databaseList);
  request=await selectPendingTripWeatherAggregateRequest(bounded,request);
  const current=await startTripWeatherAggregateJob(bounded,request);
  if (current.phase==='READY_INPUT') {
    await prepareReadyInputPolicyBoundReview(bounded,request);
    return aggregateWithheldReport(request);
  }
  if (current.phase!=='SCANNING') fail('AGGREGATE_JOB_TERMINAL');
  const next=await advanceTripWeatherAggregateJob(bounded,request);
  if (!['SCANNING','READY_INPUT'].includes(next.phase) || next.revision<=current.revision)
    fail('AGGREGATE_JOB_NO_ACKNOWLEDGED_PROGRESS');
  // Even the final scan ACK is pending: reduction/noise/004 happen only in a
  // subsequent independently bounded invocation, never after the scan budget.
  return aggregatePendingReport(request,next.revision);
}

// EXISTING signed operator-only verify route: return ONLY an existing frozen
// noisy study blob after current consent/erasure qualification. No sampling,
// insert, new budget, public route or request/env release override is added.
// Prepare remains WITHHELD. Internal curator diagnostics are not study data.
export async function handleVerifyPolicyBoundAggregate(databases,request){
  if(!Array.isArray(databases)||databases.length!==10)fail('DP_SHARDS_INVALID');
  const bounded=policyQueryBoundDatabases(databases);
  request=await selectReadyTripWeatherAggregateRequest(bounded,request);
  await assertReviewPolicyAnchor(bounded[0]);
  const result=await verifyPersistedReviewProposal(bounded,request);
  await assertReviewPolicyAnchor(bounded[0]);
  if(result?.kind!=='PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE'||result.status!=='REPLAY'
      ||result.report?.publicReleaseIssued!==false
      || result.accountingSha256!==POLICY_ANCHOR.accounting_sha256)fail('DP_POLICY_BASIS_MISMATCH');
  await assertStoredReportPolicy(bounded[0],result.report);
  return result.report;
}
