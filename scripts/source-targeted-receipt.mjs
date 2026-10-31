import crypto from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {planSourceImpactFromGit} from './source-impact-git-diff.mjs';

export const TARGETED_SOURCE_CONTRACT='weather-source-targeted-impact-v1';
export const TARGETED_SOURCE_KIND='RAVRADAR_SOURCE_TARGETED_RECEIPT_V1';
const REFERENCE_KEYS=['repository','mergeCommit','producerHead','sourceTreeSha256','pullRequest',
  'runId','runAttempt','jobId','finalArtifactId','finalArtifactDigest','finalProofSha256',
  'nativeArtifactId','nativeArtifactDigest'];
const FULL_KEYS=['schemaVersion','kind','scope',...REFERENCE_KEYS,'gitTree',
  'historicalNationalScope','providerOrProductionProof'];
const CURRENT_KEYS=['repository','head','sourceTreeSha256','pullRequest','runId','runAttempt','jobId'];
const must=(value,code)=>{if(!value)throw new Error('SOURCE_TARGETED_'+code);};
const keys=(value,expected)=>must(value&&Object.getPrototypeOf(value)===Object.prototype
  &&equal(Object.keys(value).sort(),[...expected].sort()),'SHAPE');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const freeze=value=>{for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);
  return Object.freeze(value);};
function currentIdentity(value){
  keys(value,CURRENT_KEYS);must(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository),'REPOSITORY');
  must(oid(value.head)&&digest(value.sourceTreeSha256),'CURRENT_IDENTITY');
  for(const key of ['pullRequest','runId','runAttempt','jobId'])must(positive(value[key]),'CURRENT_IDENTITY');
}
function fullBaseline(value,current){
  keys(value,FULL_KEYS);must(value.schemaVersion===1
    &&value.kind==='RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1'&&value.scope==='FULL_SOURCE','FULL_BASELINE_TYPE');
  must(value.repository===current.repository&&oid(value.mergeCommit)&&oid(value.producerHead)
    &&oid(value.gitTree)&&digest(value.sourceTreeSha256),'FULL_BASELINE_IDENTITY');
  for(const key of ['pullRequest','runId','runAttempt','jobId','finalArtifactId','nativeArtifactId'])
    must(positive(value[key]),'FULL_BASELINE_IDENTITY');
  must(digest(value.finalArtifactDigest)&&digest(value.nativeArtifactDigest)
    &&typeof value.finalProofSha256==='string'&&/^[a-f0-9]{64}$/.test(value.finalProofSha256),'FULL_BASELINE_DIGEST');
  must(value.historicalNationalScope==='HISTORICAL_584_NATIONAL_ONLY'
    &&value.providerOrProductionProof===false,'FULL_BASELINE_SCOPE');
  must(value.runId!==current.runId,'BASELINE_CANNOT_BE_CURRENT_PARTIAL_RUN');
  // These are ROOT's externally qualified reference DATA. This module neither
  // calls GitHub nor constructs/qualifies a FULL baseline or upgrades V1/V2.
  return Object.fromEntries(REFERENCE_KEYS.map(key=>[key,value[key]]));
}
export function targetedSourceArtifactName(current){
  must(arguments.length===1,'ARGUMENTS');keys(current,['pullRequest','head','sourceTreeSha256']);
  must(positive(current.pullRequest)&&oid(current.head)&&digest(current.sourceTreeSha256),'ARTIFACT_IDENTITY');
  return 'ravradar-source-targeted-v1-pr-'+current.pullRequest+'-'+current.head+'-'+current.sourceTreeSha256.slice(7);
}
function constructTargetedReceipt(input,actual){
  keys(input,['current','fullBaseline','gitPlan','commandResults']);
  const {current,gitPlan,commandResults}=input;currentIdentity(current);
  const reference=fullBaseline(input.fullBaseline,current);
  must(actual.status==='PLANNED'&&actual.plan.selection==='TARGETED'
    &&actual.git.completeInventory===true&&actual.git.ancestorVerified===true,'TARGETED_COMPLETE_DIFF_REQUIRED');
  must(actual.git.baselineCommit===reference.mergeCommit
    &&actual.git.candidateCommit===actual.git.expectedHead&&actual.git.actualHead===actual.git.expectedHead
    &&actual.git.changedRows===actual.inventory.length&&actual.git.changedRows>0
    &&/^[a-f0-9]{64}$/.test(actual.git.rawInventorySha256),'COMPLETE_GIT_PLAN_MISMATCH');
  must(actual.plan.commands.length>0&&actual.plan.database.status==='NOT_APPLICABLE'
    &&actual.plan.database.executed===false&&actual.plan.national.status==='NOT_APPLICABLE'
    &&actual.plan.national.executed===false,'IMPACT_SCOPE');
  must(Array.isArray(commandResults)&&commandResults.length===actual.plan.commands.length,'COMMAND_RESULTS');
  for(let index=0;index<commandResults.length;index++){
    const row=commandResults[index];keys(row,['phase','command','elapsedMs','outcome']);
    must(row.command===actual.plan.commands[index]&&row.outcome==='PASS'
      &&['binding','check','critical','targeted'].includes(row.phase)
      &&Number.isSafeInteger(row.elapsedMs)&&row.elapsedMs>=0,'COMMAND_RESULTS');
  }
  const receipt={schemaVersion:1,contractId:TARGETED_SOURCE_CONTRACT,kind:TARGETED_SOURCE_KIND,
    scope:'TARGETED_COMMAND_RESULTS_ONLY',current:structuredClone(current),baselineReference:reference,
    baselineScope:{source:'FULL_SOURCE',gitTree:input.fullBaseline.gitTree,historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',
      providerOrProductionProof:false},
    impact:{baselineCommit:actual.git.baselineCommit,candidateCommit:current.head,
      changedRows:actual.git.changedRows,rawInventorySha256:actual.git.rawInventorySha256,
      inventorySha256:sha(JSON.stringify(actual.inventory)),planSha256:sha(JSON.stringify(actual.plan)),
      profiles:[...actual.plan.profiles],commands:[...actual.plan.commands]},
    reportedCommandResults:structuredClone(commandResults),
    database:{status:'NOT_APPLICABLE',executed:false,reasonCode:'REVIEWED_COMPLETE_DIFF_HAS_NO_DATABASE_INPUT_CHANGE'},
    national:{status:'NOT_APPLICABLE',executed:false,reasonCode:'REVIEWED_COMPLETE_DIFF_HAS_NO_NATIONAL_INPUT_CHANGE'},
    artifactName:targetedSourceArtifactName({pullRequest:current.pullRequest,head:current.head,
      sourceTreeSha256:current.sourceTreeSha256}),privatePayloadIncluded:false,
    fullSourceValidationClaimed:false,baselineQualifiedByThisModule:false,deliveryAuthority:false,
    rootVerificationRequired:{liveFullBaseline:true,actualCommandExecution:true,
      trackedCleanBeforeAndAfter:true,finalSourceIdentityAndWorkflow:true}};
  must(Buffer.byteLength(JSON.stringify(receipt),'utf8')<=32768,'RECEIPT_TOO_LARGE');
  return freeze(receipt);
}
export function buildTargetedSourceReceipt(input){
  must(arguments.length===1,'ARGUMENTS');keys(input,['current','fullBaseline','gitPlan','commandResults']);
  currentIdentity(input.current);const reference=fullBaseline(input.fullBaseline,input.current);
  const actual=planSourceImpactFromGit({baselineCommit:reference.mergeCommit,
    candidateCommit:input.current.head,expectedHead:input.current.head});
  must(equal(input.gitPlan,actual),'COMPLETE_GIT_PLAN_MISMATCH');
  return constructTargetedReceipt(input,actual);
}
export function validateTargetedSourceReceipt(receipt,expected){
  must(arguments.length===2,'ARGUMENTS');
  // Pure consumer validation: ROOT independently qualifies the real PR merge,
  // equal tree/content and current committed Git plan. No HEAD switch or flag.
  const canonical=constructTargetedReceipt(expected,expected.gitPlan);
  must(equal(receipt,canonical),'RECEIPT_MISMATCH');
  return Object.freeze({validStructure:true,scope:canonical.scope,
    receiptSha256:sha(JSON.stringify(canonical)+'\n'),
    liveFullBaselineVerified:false,actualCommandExecutionVerified:false,
    producerMergeIdentityVerified:false,deliveryAuthority:false});
}

// Separate domain evidence. Existing V1 text receipts are never upgraded.
export const DOMAIN_TARGETED_SOURCE_CONTRACT='weather-source-targeted-domains-v2';
export const DOMAIN_TARGETED_SOURCE_KIND='RAVRADAR_SOURCE_TARGETED_DOMAINS_RECEIPT_V2';
const DOMAIN_NAMES=['postgres','d1','historical584National','currentCandidateGAudit',
  'controls','adminUI','sharing','documentation'];
const DOMAIN_DIGESTS=['postgresBefore','postgresAfter','CBefore','CAfter',
  'IBefore','IAfter','TBefore','TAfter'];
const DOMAIN_PLAN_KEYS=['schemaVersion','status','selection','commands','domains',
  'inputDigests','closureSha256','inventorySha256','changedRows','reasonCodes',
  'authority','baselineQualified','skipAuthorized','productionAuthority'];
const hash64=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const nodeCommand=value=>typeof value==='string'&&/^node(?: [A-Za-z0-9_./:-]+)+$/.test(value);

export function domainTargetedSourceArtifactName(current){
  must(arguments.length===1,'ARGUMENTS');keys(current,['pullRequest','head','sourceTreeSha256']);
  must(positive(current.pullRequest)&&oid(current.head)&&digest(current.sourceTreeSha256),'ARTIFACT_IDENTITY');
  return 'ravradar-source-targeted-domains-v2-pr-'+current.pullRequest+'-'+current.head+'-'+current.sourceTreeSha256.slice(7);
}
function validateDomainPlan(plan){
  keys(plan,DOMAIN_PLAN_KEYS);
  must(plan.schemaVersion===1&&plan.status==='PLANNED'
    &&['TARGETED_DOMAINS','CONTROL_QUALIFICATION_REQUIRED'].includes(plan.selection),'DOMAIN_PLAN_TYPE');
  must(plan.authority==='PLANNING_ONLY'&&plan.baselineQualified===false
    &&plan.skipAuthorized===false&&plan.productionAuthority===false,'DOMAIN_PLAN_AUTHORITY');
  keys(plan.inputDigests,DOMAIN_DIGESTS);
  must(Object.values(plan.inputDigests).every(hash64),'DOMAIN_INPUT_DIGESTS');
  for(const family of ['postgres','C','I','T'])must(plan.inputDigests[family+'Before']
    ===plan.inputDigests[family+'After'],'DOMAIN_CHANGED_PROTECTED_INPUT');
  must(hash64(plan.closureSha256)&&hash64(plan.inventorySha256)&&positive(plan.changedRows),'DOMAIN_INVENTORY');
  must(Array.isArray(plan.reasonCodes)&&plan.reasonCodes.length<=128
    &&plan.reasonCodes.every(code=>typeof code==='string'&&/^[A-Z0-9_:./-]{1,256}$/.test(code)),'DOMAIN_REASONS');
  must(Array.isArray(plan.commands)&&plan.commands.length>0&&plan.commands.length<=128
    &&new Set(plan.commands).size===plan.commands.length&&plan.commands.every(nodeCommand),'DOMAIN_COMMANDS');
  keys(plan.domains,DOMAIN_NAMES);const covered=new Set();
  for(const name of DOMAIN_NAMES){
    const domain=plan.domains[name];keys(domain,['status','executed','commands']);
    must(['NOT_APPLICABLE','SELECTED'].includes(domain.status)&&domain.executed===false,'DOMAIN_SCOPE');
    must(Array.isArray(domain.commands)&&new Set(domain.commands).size===domain.commands.length
      &&domain.commands.every(command=>plan.commands.includes(command)),'DOMAIN_COMMANDS');
    must(domain.status==='SELECTED'?domain.commands.length>0:domain.commands.length===0,'DOMAIN_SCOPE');
    for(const command of domain.commands)covered.add(command);
  }
  must(plan.commands.every(command=>covered.has(command)),'DOMAIN_UNASSIGNED_COMMAND');
  for(const name of ['postgres','historical584National'])must(plan.domains[name].status==='NOT_APPLICABLE','DOMAIN_SCOPE');
  if(plan.selection==='CONTROL_QUALIFICATION_REQUIRED')
    must(plan.domains.controls.status==='SELECTED','DOMAIN_CONTROL_QUALIFICATION');
}
function constructDomainTargetedReceipt(input){
  keys(input,['current','fullBaseline','domainPlan','commandResults']);
  const {current,domainPlan,commandResults}=input;currentIdentity(current);
  const reference=fullBaseline(input.fullBaseline,current);validateDomainPlan(domainPlan);
  must(Array.isArray(commandResults)&&commandResults.length===domainPlan.commands.length,'COMMAND_RESULTS');
  for(let index=0;index<commandResults.length;index++){
    const row=commandResults[index];keys(row,['phase','command','elapsedMs','outcome']);
    must(row.phase==='targeted'&&row.command===domainPlan.commands[index]&&row.outcome==='PASS'
      &&Number.isSafeInteger(row.elapsedMs)&&row.elapsedMs>=0,'COMMAND_RESULTS');
  }
  const domains=Object.fromEntries(DOMAIN_NAMES.map(name=>{
    const selected=domainPlan.domains[name].status==='SELECTED';
    const status=!selected?'NOT_APPLICABLE':name==='d1'?'EXECUTED_SYNTHETIC_SQLITE'
      :name==='currentCandidateGAudit'?'EXECUTED_SYNTHETIC_CURRENT_AUDIT':'EXECUTED_TARGETED_CONTRACTS';
    return [name,{status,executedInThisRun:selected,
      commands:[...domainPlan.domains[name].commands],providerOrProductionProof:false}];
  }));
  Object.assign(domains.postgres,{reasonCode:'UNCHANGED_COMPLETE_POSTGRES_INPUT',
    baselineInputDigest:domainPlan.inputDigests.postgresBefore,
    candidateInputDigest:domainPlan.inputDigests.postgresAfter});
  domains.historical584National.reasonCode='UNCHANGED_HISTORICAL_NATIONAL_DOMAIN';
  const receipt={schemaVersion:2,contractId:DOMAIN_TARGETED_SOURCE_CONTRACT,kind:DOMAIN_TARGETED_SOURCE_KIND,
    scope:'TARGETED_DOMAIN_COMMAND_RESULTS_ONLY',current:structuredClone(current),baselineReference:reference,
    baselineScope:{source:'FULL_SOURCE',gitTree:input.fullBaseline.gitTree,
      historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false},
    impact:{baselineCommit:reference.mergeCommit,candidateCommit:current.head,
      changedRows:domainPlan.changedRows,inventorySha256:domainPlan.inventorySha256,
      closureSha256:domainPlan.closureSha256,inputDigests:structuredClone(domainPlan.inputDigests),
      planSha256:sha(JSON.stringify(domainPlan)),selection:domainPlan.selection,commands:[...domainPlan.commands]},
    reportedCommandResults:structuredClone(commandResults),domains,
    controlQualification:{status:domainPlan.selection==='CONTROL_QUALIFICATION_REQUIRED'
      ?'EXECUTED_SYNTHETIC_CONTROL_CONTRACTS':'NOT_REQUIRED',
      independentRootReviewVerifiedByThisModule:false},
    artifactName:domainTargetedSourceArtifactName({pullRequest:current.pullRequest,head:current.head,
      sourceTreeSha256:current.sourceTreeSha256}),privatePayloadIncluded:false,
    fullSourceValidationClaimed:false,baselineQualifiedByThisModule:false,deliveryAuthority:false,
    rootVerificationRequired:{liveFullBaseline:true,actualCommandExecution:true,
      trackedCleanBeforeAndAfter:true,finalSourceIdentityAndWorkflow:true,
      independentControlReview:domainPlan.selection==='CONTROL_QUALIFICATION_REQUIRED'}};
  must(Buffer.byteLength(JSON.stringify(receipt),'utf8')<=32768,'RECEIPT_TOO_LARGE');
  return freeze(receipt);
}
export async function buildDomainTargetedSourceReceipt(input){
  must(arguments.length===1,'ARGUMENTS');keys(input,['current','fullBaseline','domainPlan','commandResults']);
  currentIdentity(input.current);const reference=fullBaseline(input.fullBaseline,input.current);
  const {planSourceDomainImpactFromGit}=await import('./source-impact-domain-plan.mjs');
  const actual=planSourceDomainImpactFromGit({baselineCommit:reference.mergeCommit,
    candidateCommit:input.current.head,expectedHead:input.current.head});
  must(equal(actual,input.domainPlan),'COMPLETE_DOMAIN_PLAN_MISMATCH');
  return constructDomainTargetedReceipt(input);
}
export function validateDomainTargetedSourceReceipt(receipt,expected){
  must(arguments.length===2,'ARGUMENTS');
  // As in V1, expected is independently recomputed by the real consumer. Pure
  // structure validation neither executes commands nor qualifies a baseline.
  const canonical=constructDomainTargetedReceipt(expected);
  must(equal(receipt,canonical),'RECEIPT_MISMATCH');
  return Object.freeze({validStructure:true,scope:canonical.scope,
    receiptSha256:sha(JSON.stringify(canonical)+'\n'),
    liveFullBaselineVerified:false,actualCommandExecutionVerified:false,
    producerMergeIdentityVerified:false,independentControlReviewVerified:false,deliveryAuthority:false});
}

// ROOT records its independent whole-change review in the existing PR body.
// This is external GitHub metadata, never a candidate-selected approved flag.
// The actual producer and consumer both read it; pure receipt validation cannot.
export function readDomainControlReview(pull,expected){
  must(arguments.length===2,'ARGUMENTS');keys(expected,['current','fullBaseline','domainPlan']);
  currentIdentity(expected.current);const reference=fullBaseline(expected.fullBaseline,expected.current);
  validateDomainPlan(expected.domainPlan);
  if(expected.domainPlan.selection!=='CONTROL_QUALIFICATION_REQUIRED')return null;
  const {current,domainPlan}=expected;
  must(pull?.number===current.pullRequest&&pull.head?.sha===current.head
    &&pull.head?.repo?.full_name===current.repository&&pull.base?.ref==='main'
    &&pull.base?.repo?.full_name===current.repository
    &&pull.user?.login===current.repository.split('/')[0],'CONTROL_REVIEW_PULL_IDENTITY');
  must(typeof pull.body==='string'&&Buffer.byteLength(pull.body,'utf8')<=65536,'CONTROL_REVIEW_BODY');
  const markers=[...pull.body.matchAll(/<!-- RAVRADAR_CONTROL_REVIEW_V2 (\{[^\r\n]*\}) -->/g)];
  must(markers.length===1&&pull.body.split('RAVRADAR_CONTROL_REVIEW_V2').length===2,'CONTROL_REVIEW_REQUIRED');
  let review;try{review=JSON.parse(markers[0][1]);}catch{must(false,'CONTROL_REVIEW_FORMAT');}
  keys(review,['head','baselineCommit','inventorySha256','closureSha256','planSha256','reviewSha256']);
  must(review.head===current.head&&review.baselineCommit===reference.mergeCommit
    &&review.inventorySha256===domainPlan.inventorySha256&&review.closureSha256===domainPlan.closureSha256
    &&review.planSha256===sha(JSON.stringify(domainPlan))&&hash64(review.reviewSha256),'CONTROL_REVIEW_MISMATCH');
  return freeze(structuredClone(review));
}
