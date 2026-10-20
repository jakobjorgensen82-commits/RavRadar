import { canonicalJson, sha256Hex } from '../../supabase/functions/_shared/trip-storage.js';
import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { AGGREGATE_LIMITS, assertAggregateRequest, aggregateWithheldReport } from '../../supabase/functions/_shared/trip-aggregate-contract.js';
import { POLICY, fail } from './trip-aggregate-dp.js';
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
  assertAggregateRequest(request,ravScoreModelBinding());
  if (!Array.isArray(databaseList)||databaseList.length!==10) fail('DP_SHARDS_INVALID');
  const bounded=policyQueryBoundDatabases(databaseList);
  await assertReviewPolicyAnchor(bounded[0]);
  const result=await prepare(bounded,request,{randomFill});
  await assertReviewPolicyAnchor(bounded[0]);
  if (result?.kind!=='PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE' || !['PERSISTED','REPLAY'].includes(result.status)
      || result.report?.policySha256!==POLICY_ANCHOR.policy_sha256
      || result.report?.publicReleaseIssued!==false
      || result.accountingSha256!==POLICY_ANCHOR.accounting_sha256) fail('DP_POLICY_BASIS_MISMATCH');
  return result;
}
// Actual signed Worker may prepare/replay privately, but its HTTP DTO remains
// the original fixed withheld shape. No count, origin, budget or error detail
// is serialized. Policy issuance/public transcript/CPU remain separate gates.
export async function handlePolicyBoundAggregate(databaseList,request) {
  await preparePolicyBoundReview(databaseList,request);
  return aggregateWithheldReport(request);
}

// EXISTING signed operator-only verify route: return ONLY an existing frozen
// noisy study blob after current consent/erasure qualification. No sampling,
// insert, new budget, public route or request/env release override is added.
// Prepare remains WITHHELD. Internal curator diagnostics are not study data.
export async function handleVerifyPolicyBoundAggregate(databases,request){
  assertAggregateRequest(request,ravScoreModelBinding());
  if(!Array.isArray(databases)||databases.length!==10)fail('DP_SHARDS_INVALID');
  const bounded=policyQueryBoundDatabases(databases);
  await assertReviewPolicyAnchor(bounded[0]);
  const result=await verifyPersistedReviewProposal(bounded,request);
  await assertReviewPolicyAnchor(bounded[0]);
  if(result?.kind!=='PRIVATE_REVIEW_RESULT_DO_NOT_RELEASE'||result.status!=='REPLAY'
      ||result.report?.policySha256!==POLICY_ANCHOR.policy_sha256||result.report?.publicReleaseIssued!==false
      || result.accountingSha256!==POLICY_ANCHOR.accounting_sha256)fail('DP_POLICY_BASIS_MISMATCH');
  return result.report;
}
