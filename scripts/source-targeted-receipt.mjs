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
