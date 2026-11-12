import crypto from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';

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
const DOMAIN_DIGESTS=['postgresBefore','postgresAfter','CBefore','CAfter','IBefore','IAfter','TBefore','TAfter'];
const hash64=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const nodeCommand=value=>typeof value==='string'&&/^node(?: [A-Za-z0-9_./:-]+)+$/.test(value);

// Current contracts are a new evidence scope. V1/V2 records and the genuine
// FULL/native reference keep their original meanings and are never upgraded.
export const CURRENT_CONTRACT_SOURCE_CONTRACT='weather-source-current-contracts-v3';
export const CURRENT_CONTRACT_SOURCE_KIND='RAVRADAR_CURRENT_CONTRACT_SOURCE_RECEIPT_V3';
export function currentContractSourceArtifactName(current){
  must(arguments.length===1,'ARGUMENTS');keys(current,['pullRequest','head','sourceTreeSha256']);
  must(positive(current.pullRequest)&&oid(current.head)&&digest(current.sourceTreeSha256),'ARTIFACT_IDENTITY');
  return 'ravradar-source-current-contracts-v3-pr-'+current.pullRequest+'-'+current.head+'-'+current.sourceTreeSha256.slice(7);
}
function currentContractPlanProjection(plan,baseline){
  must(plan&&plan.schemaVersion===1&&plan.status==='PLANNED'&&plan.selection==='CURRENT_CONTRACTS','CURRENT_PLAN_TYPE');
  must(plan.authority==='PLANNING_ONLY'&&plan.baselineQualified===false
    &&plan.skipAuthorized===false&&plan.productionAuthority===false,'CURRENT_PLAN_AUTHORITY');
  const id=plan.identity;
  must(id&&id.ancestorVerified===true&&id.baselineCommit===baseline.mergeCommit
    &&id.baselineTree===baseline.gitTree&&oid(id.candidateCommit)
    &&id.candidateCommit===id.expectedHead&&id.actualHead===id.expectedHead
    &&oid(id.baselineTree)&&oid(id.candidateTree),'CURRENT_PLAN_IDENTITY');
  keys(plan.inputDigests,DOMAIN_DIGESTS);
  must(Object.values(plan.inputDigests).every(hash64),'CURRENT_INPUT_DIGESTS');
  for(const family of ['postgres','C','I','T'])must(plan.inputDigests[family+'Before']
    ===plan.inputDigests[family+'After'],'CURRENT_CHANGED_PROTECTED_INPUT');
  must(positive(plan.changedRows)&&hash64(plan.inventorySha256)&&hash64(plan.rawInventorySha256),'CURRENT_INVENTORY');
  must(typeof plan.controlQualificationRequired==='boolean','CURRENT_CONTROL_SCOPE');
  must(Array.isArray(plan.commands)&&plan.commands.length>0&&plan.commands.length<=128
    &&new Set(plan.commands).size===plan.commands.length&&plan.commands.every(nodeCommand),'CURRENT_COMMANDS');
  must(plan.areas&&Object.getPrototypeOf(plan.areas)===Object.prototype
    &&Object.keys(plan.areas).length>0&&Object.keys(plan.areas).length<=32,'CURRENT_AREAS');
  const covered=new Set();
  for(const [name,area]of Object.entries(plan.areas)){
    must(/^[A-Za-z][A-Za-z0-9]*$/.test(name),'CURRENT_AREA_NAME');
    keys(area,['status','executed','commands','changedPaths']);
    const historical=name==='historicalTests'&&area.status==='NOT_EXECUTED'&&plan.controlQualificationRequired;
    must((area.status==='SELECTED'||historical)&&area.executed===false,'CURRENT_AREA_SCOPE');
    must(Array.isArray(area.commands)&&(area.commands.length>0||(historical&&area.commands.length===0))
      &&new Set(area.commands).size===area.commands.length
      &&area.commands.every(command=>plan.commands.includes(command)),'CURRENT_AREA_COMMANDS');
    must(Array.isArray(area.changedPaths)&&new Set(area.changedPaths).size===area.changedPaths.length
      &&area.changedPaths.every(file=>typeof file==='string'&&/^[A-Za-z0-9_./-]+$/.test(file)
        &&!file.startsWith('/')&&!file.includes('//')&&!file.split('/').some(part=>part==='.'||part==='..')),'CURRENT_AREA_PATHS');
    for(const command of area.commands)covered.add(command);
  }
  must(plan.commands.every(command=>covered.has(command)),'CURRENT_UNASSIGNED_COMMAND');
  // A PR head and its no-change merge have different commit IDs but the same
  // source tree. The real consumer proves that merge relation independently.
  return {baselineCommit:id.baselineCommit,baselineTree:id.baselineTree,candidateTree:id.candidateTree,
    changedRows:plan.changedRows,rawInventorySha256:plan.rawInventorySha256,inventorySha256:plan.inventorySha256,
    inputDigests:structuredClone(plan.inputDigests),areas:structuredClone(plan.areas),
    commands:[...plan.commands],controlQualificationRequired:plan.controlQualificationRequired};
}
function constructCurrentContractReceipt(input){
  keys(input,['current','fullBaseline','currentPlan','commandResults']);
  const {current,currentPlan,commandResults}=input;currentIdentity(current);
  const reference=fullBaseline(input.fullBaseline,current),impact=currentContractPlanProjection(currentPlan,input.fullBaseline);
  must(Array.isArray(commandResults)&&commandResults.length===impact.commands.length,'COMMAND_RESULTS');
  for(let index=0;index<commandResults.length;index++){
    const row=commandResults[index];keys(row,['phase','command','elapsedMs','outcome']);
    must(row.phase==='targeted'&&row.command===impact.commands[index]&&row.outcome==='PASS'
      &&Number.isSafeInteger(row.elapsedMs)&&row.elapsedMs>=0,'COMMAND_RESULTS');
  }
  const receipt={schemaVersion:3,contractId:CURRENT_CONTRACT_SOURCE_CONTRACT,kind:CURRENT_CONTRACT_SOURCE_KIND,
    scope:'CURRENT_CONTRACT_RESULTS_ONLY',current:structuredClone(current),baselineReference:reference,
    baselineScope:{source:'FULL_SOURCE',gitTree:input.fullBaseline.gitTree,
      historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false},
    impact:{...impact,planSha256:sha(JSON.stringify(impact))},reportedCommandResults:structuredClone(commandResults),
    postgres:{status:'UNCHANGED_AUTHENTIC_BASELINE_INPUT',executedInThisRun:false,
      baselineInputDigest:impact.inputDigests.postgresBefore,candidateInputDigest:impact.inputDigests.postgresAfter},
    historicalCompatibilityExecuted:false,historicalNationalExecuted:false,providerOrProductionProof:false,
    artifactName:currentContractSourceArtifactName({pullRequest:current.pullRequest,head:current.head,
      sourceTreeSha256:current.sourceTreeSha256}),privatePayloadIncluded:false,
    fullSourceValidationClaimed:false,baselineQualifiedByThisModule:false,deliveryAuthority:false,
    rootVerificationRequired:{liveFullBaseline:true,actualCommandExecution:true,
      trackedCleanBeforeAndAfter:true,finalSourceIdentityAndWorkflow:true,
      independentControlReview:impact.controlQualificationRequired}};
  must(Buffer.byteLength(JSON.stringify(receipt),'utf8')<=32768,'RECEIPT_TOO_LARGE');
  return freeze(receipt);
}
export function currentContractPlanSha256(plan,baseline){
  must(arguments.length===2,'ARGUMENTS');
  return sha(JSON.stringify(currentContractPlanProjection(plan,baseline)));
}
export async function buildCurrentContractSourceReceipt(input){
  must(arguments.length===1,'ARGUMENTS');keys(input,['current','fullBaseline','currentPlan','commandResults']);
  currentIdentity(input.current);const reference=fullBaseline(input.fullBaseline,input.current);
  const {planSourceCurrentContractsFromGit}=await import('./source-current-contract-plan.mjs');
  const actual=planSourceCurrentContractsFromGit({baselineCommit:reference.mergeCommit,
    candidateCommit:input.current.head,expectedHead:input.current.head});
  must(equal(actual,input.currentPlan),'COMPLETE_CURRENT_PLAN_MISMATCH');
  return constructCurrentContractReceipt(input);
}
export function validateCurrentContractSourceReceipt(receipt,expected){
  must(arguments.length===2,'ARGUMENTS');
  const canonical=constructCurrentContractReceipt(expected);
  must(equal(receipt,canonical),'RECEIPT_MISMATCH');
  return Object.freeze({validStructure:true,scope:canonical.scope,
    receiptSha256:sha(JSON.stringify(canonical)+'\n'),liveFullBaselineVerified:false,
    actualCommandExecutionVerified:false,producerMergeIdentityVerified:false,
    independentControlReviewVerified:false,deliveryAuthority:false});
}
function currentContractReviewMarker(pull){
  must(typeof pull?.body==='string'&&Buffer.byteLength(pull.body,'utf8')<=65536,'CONTROL_REVIEW_BODY');
  const token='RAVRADAR_CURRENT_CONTRACT_REVIEW_V3';
  const markers=[...pull.body.matchAll(/<!-- RAVRADAR_CURRENT_CONTRACT_REVIEW_V3 (\{[^\r\n]*\}) -->/g)];
  must(markers.length===1&&pull.body.split(token).length===2,'CONTROL_REVIEW_REQUIRED');
  let review;try{review=JSON.parse(markers[0][1]);}catch{must(false,'CONTROL_REVIEW_FORMAT');}
  keys(review,['head','baselineCommit','inventorySha256','planSha256','reviewSha256']);
  must(oid(review.head)&&oid(review.baselineCommit)
    &&[review.inventorySha256,review.planSha256,review.reviewSha256].every(hash64),'CONTROL_REVIEW_MISMATCH');
  return review;
}
export function readCurrentContractReviewBaselineHint(pull,head){
  must(arguments.length===2&&oid(head),'CURRENT_IDENTITY');
  if(typeof pull?.body!=='string'||!pull.body.includes('RAVRADAR_CURRENT_CONTRACT_REVIEW_V3'))return null;
  const review=currentContractReviewMarker(pull);must(review.head===head,'CONTROL_REVIEW_MISMATCH');
  return review.baselineCommit;
}
export function readCurrentContractReview(pull,expected){
  must(arguments.length===2,'ARGUMENTS');keys(expected,['current','fullBaseline','currentPlan']);
  currentIdentity(expected.current);fullBaseline(expected.fullBaseline,expected.current);
  const impact=currentContractPlanProjection(expected.currentPlan,expected.fullBaseline);
  if(!impact.controlQualificationRequired)return null;
  const {current}=expected;
  must(pull?.number===current.pullRequest&&pull.head?.sha===current.head
    &&pull.head?.repo?.full_name===current.repository&&pull.base?.ref==='main'
    &&pull.base?.repo?.full_name===current.repository
    &&pull.user?.login===current.repository.split('/')[0],'CONTROL_REVIEW_PULL_IDENTITY');
  const review=currentContractReviewMarker(pull);
  must(review.head===current.head&&review.baselineCommit===impact.baselineCommit
    &&review.inventorySha256===impact.inventorySha256&&review.planSha256===sha(JSON.stringify(impact)),
    'CONTROL_REVIEW_MISMATCH');
  return freeze(structuredClone(review));
}
