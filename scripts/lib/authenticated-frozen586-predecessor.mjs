// Private OLD586 snapshot qualifier. Not a metadata-event/origin issuer.
// No caller path, descriptor, transport, tuple, validator or proof override.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,
  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected}
  from '../check-assistant-later-h0-predecessor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const exec=promisify(callbackExec),failedCloses=new Map();
// Ukendt fysisk FD-lukning blokerer samme sti på tværs af begge familier.
// Opaque snapshots og friskhedsfunktioner tilhører derimod kun én fast profil.
function fixedSnapshot(profile){
  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===STAGED588,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');
  const contexts=new WeakMap(),refreshers=new WeakMap();
  const SOURCE=profile.sourceHead;
const SHA=/^[a-f0-9]{64}$/, HEAD=/^[a-f0-9]{40}$/, MB=1024*1024;
const REQUIRED=Object.freeze(['scripts/lib/established-native-current-origin.mjs',
  'scripts/lib/ravscore-production-part-pipeline.mjs']);
const REQUIRED_SHA=profile.requiredSha;
const POLICY='scripts/lib/dmi-marine-zone-exclusions.json';
const POLICY_BLOB='a4f65f8eb0396dbe3c3da442ebcb9a06d99d3287';
const ATTEST='privateEstablishedNativeCurrentOrigin';
const same=isDeepStrictEqual;
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fail=code=>{throw Object.assign(new Error(profile.errorPrefix+code),
  {code:profile.errorPrefix+code});};
const need=(value,code)=>{if(!value)fail(code);};
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async args=>(await exec('git',['-C',ROOT,...args],
  {env:environment(),encoding:'utf8',timeout:30000,maxBuffer:16*MB})).stdout.trim();
function freeze(value){if(value&&typeof value==='object'){for(const nested of Object.values(value))freeze(nested);Object.freeze(value);}return value;}
async function noLinks(file){
  let at=path.parse(file).root;const parents=[];
  for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
    at=path.join(at,piece);const stat=await fs.lstat(at,{bigint:true});
    need(!stat.isSymbolicLink(),'SYMLINK');
    if(at!==file){need(stat.isDirectory(),'PARENT');parents.push({file:at,dev:stat.dev,ino:stat.ino});}
  }return parents;
}
async function sameParents(parents){
  for(const before of parents){const after=await fs.lstat(before.file,{bigint:true});
    need(after.isDirectory()&&!after.isSymbolicLink()&&after.dev===before.dev&&after.ino===before.ino,'PARENT_CHANGED');}
}
// Same bounded descriptor-owned read/physical-close checks as the frozen origin.
async function ownedBytes(file,maximum,{ownFileDescriptorIdentity,ownedFileDescriptorClosed}){
  const absolute=path.resolve(file);need(!failedCloses.has(absolute),'PREVIOUS_CLOSE_UNPROVED');
  const parents=await noLinks(absolute),before=await fs.lstat(absolute,{bigint:true});
  need(before.isFile()&&before.size>=2n&&before.size<=BigInt(maximum),'INPUT_SIZE');
  let handle,fd,identity,raw,first,hasFirst=false;
  try{
    handle=await fs.open(absolute,'r');fd=handle.fd;identity=ownFileDescriptorIdentity(fd);
    const opened=await handle.stat({bigint:true});
    need(opened.dev===before.dev&&opened.ino===before.ino&&opened.size===before.size,'INPUT_CHANGED');
    const chunks=[];let size=0;const buffer=Buffer.allocUnsafe(64*1024);
    for(;;){const row=await handle.read(buffer,0,Math.min(buffer.length,maximum+1-size),null);
      need(Number.isSafeInteger(row.bytesRead)&&row.bytesRead>=0&&row.bytesRead<=buffer.length,'READ');
      if(!row.bytesRead)break;size+=row.bytesRead;need(size<=maximum,'INPUT_SIZE');
      chunks.push(Buffer.from(buffer.subarray(0,row.bytesRead)));}
    raw=Buffer.concat(chunks,size);
    for(const after of [await handle.stat({bigint:true}),await fs.lstat(absolute,{bigint:true})]){
      need(after.dev===before.dev&&after.ino===before.ino&&after.size===before.size
        &&after.mtimeNs===before.mtimeNs&&after.ctimeNs===before.ctimeNs,'INPUT_CHANGED');
    }
    need(BigInt(raw.length)===before.size,'INPUT_CHANGED');await sameParents(parents);
  }catch(error){first=error;hasFirst=true;}
  if(handle){
    try{await handle.close();}catch(error){if(!hasFirst){first=error;hasFirst=true;}}
    if(!await ownedFileDescriptorClosed(fd,identity)){failedCloses.set(absolute,handle);
      if(!hasFirst){first=Object.assign(new Error(profile.errorPrefix+'CLOSE_UNPROVED'),
        {code:profile.errorPrefix+'CLOSE_UNPROVED'});hasFirst=true;}}
  }
  if(hasFirst)throw first;return raw;
}
async function qualifyProducer(producer,frozenRoot){
  need(HEAD.test(producer),'PRODUCER');
  const head=await git(['rev-parse','HEAD']);need(HEAD.test(head),'SOURCE_HEAD');
  if(process.env.GITHUB_SHA!==undefined)need(process.env.GITHUB_SHA===head,'SOURCE_HEAD');
  // Preserve the original v1 ancestor test and EXACT two required source blobs.
  // The comparison endpoint must be OLD family bytes, not changed future files.
  await git(['merge-base','--is-ancestor',producer,head]);
  for(let index=0;index<REQUIRED.length;index++){
    const file=REQUIRED[index],raw=await fs.readFile(path.join(frozenRoot,file));
    need(sha(raw)===REQUIRED_SHA[index],'FROZEN_SOURCE_CHANGED');
    const expected=await git(['rev-parse',SOURCE+':'+file]);
    need(await git(['rev-parse',producer+':'+file])===expected,'PRODUCER_SEMANTICS_CHANGED');
  }
  need(await git(['rev-parse',SOURCE+':'+POLICY])===POLICY_BLOB,'FROZEN_POLICY_CHANGED');
  need(await git(['rev-parse',producer+':'+POLICY])===POLICY_BLOB,'PRODUCER_POLICY_CHANGED');
  need(await git(['rev-parse','HEAD:'+POLICY])===POLICY_BLOB,'SOURCE_POLICY_CHANGED');
  return Object.freeze({consumerHead:head,producerHead:producer,sourceFamilyHead:SOURCE,ownerPolicyGitBlob:POLICY_BLOB});
}
async function fixedPaths(){
  // Fixed caller roles only: SOURCE prewrite must not borrow the current-output bundle.
  const privateRoot=process.env[profile===STAGED588?'RAVRADAR_PREDECESSOR_PRIVATE_ROOT':'RAVRADAR_PRIVATE_RUNTIME_ROOT'];
  const bundlePath=process.env[profile===STAGED588?'RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE':'RAVRADAR_PRIVATE_RUNTIME_BUNDLE'];
  need(typeof privateRoot==='string'&&path.isAbsolute(privateRoot)&&typeof bundlePath==='string'
    &&path.isAbsolute(bundlePath),'FIXED_WORKFLOW_PATHS');
  const root=path.resolve(privateRoot),bundle=path.resolve(bundlePath);
  need(path.dirname(bundle)===root,'FIXED_WORKFLOW_PATHS');
  await noLinks(root);await noLinks(bundle);
  need(await fs.realpath(root)===root&&await fs.realpath(bundle)===bundle,'FIXED_WORKFLOW_PATHS');
  return {privateRoot:root,bundlePath:bundle};
}
async function readAuthenticatedPredecessor(){
  need(arguments.length===0,'ARGUMENTS');
  // These normal workflow paths select already restored immutable B; they are
  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.
  const paths=await fixedPaths();
  return profile.withSource(async frozenRoot=>{
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);
    const [protectedB,protectedS,bundle,normalS,workflow,model,dataAssertions,descriptorIO]=await Promise.all([
      load('scripts/protected-private-production-runtime.mjs'),load('scripts/protected-ravscore-continuation-checkpoint.mjs'),
      load('scripts/private-production-runtime-bundle.mjs'),load('scripts/ravscore-continuation-checkpoint.mjs'),
      load('scripts/private-production-runtime-workflow.mjs'),load('js/core/ravscore-model-contract.js'),
      load(profile.assertionPath),load('scripts/lib/private-weather-component-pack.mjs')]);
    const read=async(file,max)=>ownedBytes(file,max,descriptorIO);
    const centralPath=path.join(ROOT,'data/live/coastal-parts-v2.json');
    const central=JSON.parse((await read(centralPath,16*MB)).toString('utf8'));
    const request=protectedB.createProtectedPrivateRuntimeClients({storageBackend:'supabase'}).documentRequest;
    const checkpointRequest=protectedS.createProtectedRavScoreCheckpointRequester();
    async function pointer(){
      const key=protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;
      const rows=await request('?document_key=eq.'+encodeURIComponent(key)+'&select=document_key,payload,version&limit=2',{},'read');
      need(Array.isArray(rows)&&rows.length===1&&rows[0].document_key===key
        &&Number.isSafeInteger(Number(rows[0].version))&&Number(rows[0].version)>0,'POINTER');
      return {version:Number(rows[0].version),pointer:protectedB.validateProtectedPrivateRuntimePointer(rows[0].payload,
        {allowHistoricalCurrentModelBinding:true})};
    }
    const before=await pointer(),descriptor=before.pointer.current;
    need(same(descriptor.modelBinding,model.ravScoreModelBinding())
      &&same(descriptor.contractHashes,await workflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot})),'OLD_FAMILY');
    const producer=await qualifyProducer(descriptor.sourceHead,frozenRoot);
    const verified=await bundle.verifyPrivateProductionRuntimeBundle({...paths,repositoryRoot:frozenRoot,
      expected:{modelBinding:descriptor.modelBinding,contractHashes:descriptor.contractHashes,datasetId:descriptor.datasetId,
        productionReferenceAt:descriptor.productionReferenceAt,generatedAt:descriptor.generatedAt,bundleContentSha256:descriptor.bundleContentSha256}});
    const conditionsPath=path.join(paths.bundlePath,'payload/data/live/conditions.json');
    const originalBytes=await read(conditionsPath,256*MB);
    const inventory=verified.files.find(row=>row.relativePath==='data/live/conditions.json');
    need(inventory&&inventory.bytes===originalBytes.length&&inventory.sha256===sha(originalBytes),'B_CONDITIONS_CHANGED');
    const conditions=JSON.parse(originalBytes.toString('utf8'));
    need(conditions[ATTEST]!==undefined,'ATTESTATION_REQUIRED');
    const parent=await fs.realpath(os.tmpdir()),work=await fs.mkdtemp(path.join(parent,profile.temporaryPrefix));
    const workIdentity=await fs.lstat(work,{bigint:true}),workParents=await noLinks(work);
    let saved,savedIdentity,derived,first,SRows,checkpointVersion,hasFirst=false;
    try{
      const normalPath=path.join(work,'b-derived.json');
      const checkpointPath=path.join(work,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
      await normalS.saveRavScoreContinuationCheckpoint({sourcePath:conditionsPath,checkpointPath:normalPath,repositoryRoot:frozenRoot});
      const fixedRequest=async(...args)=>{const rows=await checkpointRequest(...args);
        need(SRows===undefined,'S_READ_COUNT');SRows=structuredClone(rows);return rows;};
      const restored=await protectedS.restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath,targetReference:descriptor.productionReferenceAt,request:fixedRequest});
      need(restored.restored===true,'S_MISSING');
      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
      need(Array.isArray(SRows)&&SRows.length===1&&SRows[0].document_key===SKey
        &&Number.isSafeInteger(SRows[0].version)&&SRows[0].version>0,'S_VERSION');
      checkpointVersion=SRows[0].version; // Actual authenticated row, not a caller baseline.
      derived=JSON.parse((await read(normalPath,16*MB)).toString('utf8'));
      const savedRaw=await read(checkpointPath,16*MB);
      savedIdentity={bytes:savedRaw.length,sha256:sha(savedRaw)};
      saved=JSON.parse(savedRaw.toString('utf8'));
      need(same(derived,saved),'B_S_DIFFER');
      // Normal loader validated original state/companion/generation digests.
      // The frozen data assertions do not substitute for that protected load.
      await dataAssertions[profile.assertionExport]({descriptor,conditions,centralContract:central,checkpoint:saved});
      need(same(await pointer(),before),'SOURCE_CHANGED');
      need(same(await checkpointRequest('?document_key=eq.'+encodeURIComponent(SKey)
        +'&select=document_key,payload,version&limit=2',{},'read'),SRows),'S_CHANGED');
      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');
      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');
      need(same(await qualifyProducer(descriptor.sourceHead,frozenRoot),producer),'SOURCE_CHANGED');
    }catch(error){first=error;hasFirst=true;}
    try{
      await sameParents(workParents);const after=await fs.lstat(work,{bigint:true});
      need(path.dirname(work)===parent&&await fs.realpath(work)===work&&after.isDirectory()&&!after.isSymbolicLink()
        &&after.dev===workIdentity.dev&&after.ino===workIdentity.ino,'WORK_CHANGED');
      await fs.rm(work,{recursive:true,force:false});
    }catch(error){if(!hasFirst){first=error;hasFirst=true;}}
    if(hasFirst)throw first;
    const handle=Object.freeze({});
    contexts.set(handle,freeze({descriptor:structuredClone(descriptor),pointerVersion:before.version,checkpointVersion,
      checkpoint:saved,checkpointIdentity:savedIdentity,centralContract:central,attestation:structuredClone(conditions[ATTEST]),
      verified:structuredClone(verified),conditionsPath,
      conditionsIdentity:{bytes:originalBytes.length,sha256:inventory.sha256},sourceQualification:producer}));
    // Lexical fresh guard: only an actual authenticated opaque handle can
    // reach the normal pointer/version readers. No JSON/PASS/grant is read.
    refreshers.set(handle,async()=>{
      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');
      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');
      need(same(await pointer(),before),'SOURCE_CHANGED');
      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
      const versionRequest=protectedS.createProtectedRavScoreCheckpointVersionRequester();
      const rows=await versionRequest('?document_key=eq.'+encodeURIComponent(SKey)
        +'&select=document_key,version&limit=2',{},'version read');
      need(Array.isArray(rows)&&rows.length===1&&rows[0].document_key===SKey
        &&same(Object.keys(rows[0]).sort(),['document_key','version'])
        &&Number.isSafeInteger(rows[0].version)&&rows[0].version>0
        &&rows[0].version===checkpointVersion,'S_CHANGED');
    });
    return handle;
  });
}
// Snapshot-only accessor: cannot mint a handle from JSON, choose a family,
// authorize ForPart/finalizer, or issue SAME_H0_MODEL_METADATA admission.
function assertAuthenticatedSnapshot(handle){
  need(arguments.length===1,'ARGUMENTS');const context=contexts.get(handle);need(context,'HANDLE');
  return freeze(structuredClone(context));
}

// Refuses serialized contexts and stale/ABA S versions. Does not mint or
// return runtime/SQL authority, re-decode banks, project or replace originals.
async function assertAuthenticatedSnapshotFresh(handle){
  need(arguments.length===1,'ARGUMENTS');const refresh=refreshers.get(handle);need(refresh,'HANDLE');
  await refresh();
}

  return Object.freeze({read:readAuthenticatedPredecessor,snapshot:assertAuthenticatedSnapshot,
    fresh:assertAuthenticatedSnapshotFresh});
}
const FROZEN586=Object.freeze({
  sourceHead:'7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',
  requiredSha:Object.freeze([
    'b67f460aa9b01ff9d0ff03bfbbed5c9d570425196bf929f9bd8d7b4b67b586b1',
    '8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758']),
  withSource:withAuthenticated586PredecessorSource,
  assertionPath:'scripts/lib/established-native-current-origin-586-assertion.mjs',
  assertionExport:'assertFrozen586OriginSnapshotData',
  temporaryPrefix:'rr-frozen586-snapshot-',errorPrefix:'FROZEN586_PREDECESSOR_'});
const FROZEN587=Object.freeze({
  sourceHead:'aab72babd27175a4276c2a2f1965c74bb021b4af',
  requiredSha:Object.freeze([
    '5ebeea93ee7da95011ecc3c589e2a1a54a7ac821ad938997aea0b6444aa607bf',
    '8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758']),
  withSource:withAuthenticated587PredecessorSource,
  assertionPath:'scripts/lib/established-native-current-origin-587-assertion.mjs',
  assertionExport:'assertFrozen587OriginSnapshotData',
  temporaryPrefix:'rr-frozen587-snapshot-',errorPrefix:'FROZEN587_PREDECESSOR_'});
const FROZEN588=Object.freeze({
  sourceHead:'4845e6c6622333ad4e8454b0b43f5f94ae42233e',
  requiredSha:Object.freeze([
    '5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69',
    '8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758']),
  withSource:withAuthenticated588PredecessorSource,
  assertionPath:'scripts/lib/established-native-current-origin-588-assertion.mjs',
  assertionExport:'assertFrozen588OriginSnapshotData',
  temporaryPrefix:'rr-frozen588-snapshot-',errorPrefix:'FROZEN588_PREDECESSOR_'});
// Same actual588 code, distinct fixed workflow paths and distinct opaque capability banks.
const STAGED588=Object.freeze({...FROZEN588,temporaryPrefix:'rr-staged588-snapshot-',errorPrefix:'STAGED588_PREDECESSOR_'});
const snapshot586=fixedSnapshot(FROZEN586),snapshot587=fixedSnapshot(FROZEN587),snapshot588=fixedSnapshot(FROZEN588),
  staged588=fixedSnapshot(STAGED588);
// Kun disse navngivne indgange; ingen caller-valgt profil, root, head eller tuple.
export async function readAuthenticatedFrozen586Predecessor(){
  return snapshot586.read(...arguments);
}
export function assertAuthenticatedFrozen586Snapshot(handle){
  return snapshot586.snapshot(...arguments);
}
export async function assertAuthenticatedFrozen586SnapshotFresh(handle){
  return snapshot586.fresh(...arguments);
}
export async function readAuthenticatedFrozen587Predecessor(){
  return snapshot587.read(...arguments);
}
export function assertAuthenticatedFrozen587Snapshot(handle){
  return snapshot587.snapshot(...arguments);
}
export async function assertAuthenticatedFrozen587SnapshotFresh(handle){
  return snapshot587.fresh(...arguments);
}

// No588 snapshot is manufactured from a code pin or serialized production data.
export async function readAuthenticatedFrozen588Predecessor(){
  assertFrozen588CodeSourceSelected(); // Before paths/I/O while the proposed code freeze is unselected.
  return snapshot588.read(...arguments);
}
export function assertAuthenticatedFrozen588Snapshot(handle){
  return snapshot588.snapshot(...arguments);
}
export async function assertAuthenticatedFrozen588SnapshotFresh(handle){
  return snapshot588.fresh(...arguments);
}

// SOURCE's normal staging owns PREDECESSOR paths; no CURRENT/path fallback.
export async function readAuthenticatedStaged588Predecessor(){
  assertFrozen588CodeSourceSelected();
  return staged588.read(...arguments);
}
export function assertAuthenticatedStaged588Snapshot(handle){
  return staged588.snapshot(...arguments);
}
export async function assertAuthenticatedStaged588SnapshotFresh(handle){
  return staged588.fresh(...arguments);
}
