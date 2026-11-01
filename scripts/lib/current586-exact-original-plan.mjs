// Fixed CURRENT586 acquisition metadata only. Never native proof or admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fstatSync, constants } from 'node:fs';
import path from 'node:path';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
export const CURRENT586_EXACT_ORIGINAL_RESTORE = Object.freeze({
  scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1',
  failedRun:'39666991481',failedAttempt:1,targetReferenceAt:'2026-10-21T20:00:00.000Z',
  sourceHead:'94b2b6173747b9d1f7d261c5110042a657af0cac',
  protectedBundleSha256:'e9e7b9327df875133b7c2c00ef6440bc411ef2178a9edf9d6cb1ba1a3e7555c3',
  modelBundleSha256:'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805',
  rawCacheKey:'dmi-grib-v4-Linux-2026-W43-39520623069-1',
  rawCacheId:9250979458,rawCacheArchiveBytes:2729841089,
});
// Exact reviewed restoration scope only. The workflow input stays default OFF;
// actual execution still requires live main/source, authentic B/S and RAW gates.
export const CURRENT586_EXACT_ORIGINAL_EXECUTION=Object.freeze({scope:'CURRENT586_EXACT_ORIGINAL_RESTORE_39666991481_1'});
const SHA=/^[a-f0-9]{64}$/,HEAD=/^[a-f0-9]{40}$/;
export const current586OriginalCanonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const hash=value=>crypto.createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:current586OriginalCanonical(value)).digest('hex');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const need=(value,code='PLAN_REJECTED')=>{if(!value)throw Object.assign(new Error('DMI_CURRENT586_ORIGINAL_'+code),{code:'DMI_CURRENT586_ORIGINAL_'+code});};
const instant=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
export function requireCurrent586ExactOriginalExecution(){
  need(arguments.length===0&&exact(CURRENT586_EXACT_ORIGINAL_EXECUTION,['scope'])
    &&CURRENT586_EXACT_ORIGINAL_EXECUTION.scope===CURRENT586_EXACT_ORIGINAL_RESTORE.scope,'UNISSUED');
}
const fields=['scope','failedRun','failedAttempt','targetReferenceAt','sourceHead','executionHead','protectedBundleSha256',
  'protectedDatasetId','protectedProductionReferenceAt','protectedGeneratedAt','sourceDescriptorSha256','modelBindingSha256',
  'modelBundleSha256','conditionsSha256','checkpointGenerationSha256','remoteCheckpointSha256','remoteCheckpointVersion',
  'discoverySha256','originalsSha256','partCount','nonce'];
export function validateCurrent586ExactOriginalPlan(value,executionHead){
  need(arguments.length===2&&HEAD.test(executionHead??'')&&exact(value,['schemaVersion','contractId','binding','originals'])
    &&value.schemaVersion===1&&value.contractId==='dmi-current586-exact-original-restore-v1');
  const b=value.binding,p=CURRENT586_EXACT_ORIGINAL_RESTORE;
  need(exact(b,fields)&&['scope','failedRun','failedAttempt','targetReferenceAt','sourceHead','protectedBundleSha256','modelBundleSha256']
    .every(key=>b[key]===p[key])&&b.executionHead===executionHead&&b.partCount===673
    &&/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(b.protectedDatasetId??'')
    &&['protectedProductionReferenceAt','protectedGeneratedAt'].every(key=>instant(b[key]))
    &&Date.parse(b.protectedProductionReferenceAt)<Date.parse(p.targetReferenceAt)
    &&['sourceDescriptorSha256','modelBindingSha256','conditionsSha256','checkpointGenerationSha256',
      'remoteCheckpointSha256','discoverySha256','originalsSha256'].every(key=>SHA.test(b[key]??''))
    &&Number.isSafeInteger(b.remoteCheckpointVersion)&&b.remoteCheckpointVersion>0
    &&/^[a-f0-9]{32}$/.test(b.nonce??'')
    &&Array.isArray(value.originals)&&value.originals.length<=4096);
  const keys=[];
  for(const capture of value.originals){
    const saved=canonicalSavedDmiOriginalCapture(capture);
    need(saved!==null&&current586OriginalCanonical(saved)===current586OriginalCanonical(capture));keys.push(current586OriginalCanonical(capture));
  }
  need(current586OriginalCanonical(keys)===current586OriginalCanonical([...new Set(keys)].sort())
    &&b.originalsSha256===hash(value.originals));
  return value;
}
export function buildCurrent586ExactOriginalPlan({source,privateBinding,discoveries,remoteCheckpoint,
  derivedCheckpoint,remoteCheckpointVersion,executionHead,nonce=crypto.randomBytes(16).toString('hex')}={}){
  const p=CURRENT586_EXACT_ORIGINAL_RESTORE;
  need(source?.sourceHead===p.sourceHead&&source.bundleContentSha256===p.protectedBundleSha256
    &&source.modelBinding?.modelBundleSha256===p.modelBundleSha256
    &&source.expectedPartCount===673&&source.expectedZoneCount===210
    &&current586OriginalCanonical(remoteCheckpoint)===current586OriginalCanonical(derivedCheckpoint)
    &&remoteCheckpoint?.generationSha256===privateBinding?.checkpointGenerationSha256
    &&source.datasetId===privateBinding.datasetId&&source.productionReferenceAt===privateBinding.committedReferenceAt
    &&source.bundleContentSha256===privateBinding.bundleContentSha256&&privateBinding.targetReferenceAt===p.targetReferenceAt
    &&Array.isArray(discoveries)&&discoveries.length===673,'AUTHENTICATED_INPUTS_REQUIRED');
  const captures=new Map(),parts=new Set();let references=0,requestBytes=2;
  for(const entry of discoveries){
    need(exact(entry,['partId','result'])&&typeof entry.partId==='string'&&!parts.has(entry.partId),'DISCOVERY_UNRESOLVED');
    parts.add(entry.partId);const result=entry.result;
    requestBytes+=Buffer.byteLength(current586OriginalCanonical(result.privateRequests??[]))+2;
    need(requestBytes<=192*1024*1024,'PLAN_BOUND');
    need(result&&['METADATA_BOUND','NO_BOOTSTRAP_REQUIRED'].includes(result.summary?.status)
      &&result.summary.counts?.partsVisited===1&&Array.isArray(result.privateRequests)
      &&current586OriginalCanonical(result.privateBinding)===current586OriginalCanonical(privateBinding),'DISCOVERY_UNRESOLVED');
    for(const request of result.privateRequests){
      need(request.partId===entry.partId
        &&Array.isArray(request.selectionReferences),'DISCOVERY_UNRESOLVED');
      references+=request.selectionReferences.length;need(references<=2*673*(124+121),'PLAN_BOUND');
      const capture=canonicalSavedDmiOriginalCapture(request.capture);
      need(capture!==null&&current586OriginalCanonical(capture)===current586OriginalCanonical(request.capture),'DISCOVERY_UNRESOLVED');
      captures.set(current586OriginalCanonical(capture),capture);need(captures.size<=4096,'PLAN_BOUND');
    }
  }
  need(parts.size===673,'DISCOVERY_UNRESOLVED');
  const originals=[...captures].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,capture])=>capture);
  const value={schemaVersion:1,contractId:'dmi-current586-exact-original-restore-v1',binding:{
    scope:p.scope,failedRun:p.failedRun,failedAttempt:p.failedAttempt,targetReferenceAt:p.targetReferenceAt,
    sourceHead:source.sourceHead,executionHead,protectedBundleSha256:source.bundleContentSha256,
    protectedDatasetId:source.datasetId,protectedProductionReferenceAt:source.productionReferenceAt,protectedGeneratedAt:source.generatedAt,
    sourceDescriptorSha256:hash(source),modelBindingSha256:hash(source.modelBinding),modelBundleSha256:p.modelBundleSha256,
    conditionsSha256:privateBinding.conditionsSha256,checkpointGenerationSha256:privateBinding.checkpointGenerationSha256,
    remoteCheckpointSha256:hash(remoteCheckpoint),remoteCheckpointVersion,discoverySha256:hash(discoveries),
    originalsSha256:hash(originals),partCount:673,nonce},originals};
  return validateCurrent586ExactOriginalPlan(value,executionHead);
}
export function assertCurrent586ClosedOriginalTransport(receipt,plan,planSha256){
  validateCurrent586ExactOriginalPlan(plan,process.env.GITHUB_SHA);
  need(object(receipt)&&receipt.schemaVersion===1&&receipt.kind==='CURRENT586_EXACT_ORIGINAL_TRANSPORT_CLOSED'
    &&receipt.planSha256===planSha256&&current586OriginalCanonical(receipt.binding)===current586OriginalCanonical(plan.binding)
    &&receipt.originalsSha256===plan.binding.originalsSha256&&SHA.test(receipt.rawManifestSha256??'')
    &&Number.isSafeInteger(receipt.rawManifestBytes)&&receipt.rawManifestBytes>=2
    &&instant(receipt.startedAt)&&instant(receipt.completedAt)&&Date.parse(receipt.startedAt)<=Date.parse(receipt.completedAt)
    &&receipt.nativeEvidenceProduced===false&&receipt.sourceValuesChanged===false
    &&receipt.result?.status==='RESTORED'&&receipt.result.physicalGroupClosed===true
    &&receipt.result.writerClaimReleased===true&&receipt.result.planRemoved===true
    &&receipt.result.originalCount===plan.originals.length,'COHORT_UNPROVED');
  // Pure report validation, not a native-context capability or bank admission.
}
const sameStat=(a,b)=>['dev','ino','size','mtimeNs','ctimeNs','nlink'].every(key=>a[key]===b[key]);
async function close(handle,primary){
  const fd=handle.fd;try{await handle.close();}catch(error){primary??=error;}
  try{fstatSync(fd);primary??=new Error('DMI_CURRENT586_ORIGINAL_CLOSE_UNPROVED');}
  catch(error){if(error.code!=='EBADF')primary??=error;}if(primary)throw primary;
}
async function writeOnce(file,bytes){
  const handle=await fs.open(file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600);
  let error;try{await handle.writeFile(bytes);await handle.sync();}catch(value){error=value;}await close(handle,error);
}
async function directories(root){
  const resolved=path.resolve(root);need(await fs.realpath(resolved)===resolved,'PATH_REJECTED');
  for(const dir of [resolved,path.join(resolved,'.cache'),path.join(resolved,'.cache/dmi-grib')]){
    const st=await fs.lstat(dir);need(st.isDirectory()&&!st.isSymbolicLink()&&await fs.realpath(dir)===dir,'PATH_REJECTED');
  }return resolved;
}
export async function writeCurrent586ExactOriginalPlan({repositoryRoot,plan}){
  validateCurrent586ExactOriginalPlan(plan,process.env.GITHUB_SHA);
  const root=await directories(repositoryRoot),file=path.join(root,'.cache/dmi-grib/.original-recovery-plan.json');
  need(!await fs.lstat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;}),'PATH_REJECTED');
  const bytes=Buffer.from(current586OriginalCanonical(plan)+'\n');need(bytes.length<=16*1024*1024,'PLAN_BOUND');
  if(plan.originals.length)await writeOnce(file,bytes);
  return {schemaVersion:1,kind:'CURRENT586_EXACT_ORIGINAL_PREPARATION',
    status:plan.originals.length?'ORIGINAL_PLAN_PREPARED':'NO_ORIGINAL_RESTORE_REQUIRED',
    originalCount:plan.originals.length,planBytes:plan.originals.length?bytes.length:0,
    planSha256:plan.originals.length?hash(bytes):'',remoteSActuallyRead:true,derivedSUsedAsRemoteS:false,
    encryptedProgressRead:false,providerRequestsPerformed:false,remoteWrites:false,sourceAdmissionPerformed:false};
}
// Called only by the existing coordinator AFTER physical group closure, plan
// removal and actual writer release. This records transport, NEVER native proof.
export async function retainCurrent586ClosedOriginalTransport({repositoryRoot,planBytes,result,planSha256,startedAt,completedAt}){
  const plan=validateCurrent586ExactOriginalPlan(JSON.parse(planBytes),process.env.GITHUB_SHA);
  need(hash(planBytes)===planSha256&&result.status==='RESTORED'&&result.physicalGroupClosed===true
    &&result.writerClaimReleased===true&&result.planRemoved===true&&instant(startedAt)&&instant(completedAt)
    &&Date.parse(startedAt)<=Date.parse(completedAt),'COHORT_UNPROVED');
  const root=await directories(repositoryRoot),manifest=path.join(root,'.cache/dmi-grib/asset-manifest.json');
  const before=await fs.lstat(manifest,{bigint:true});need(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n,'PATH_REJECTED');
  need(before.size>=2n&&before.size<=16n*1024n*1024n,'PLAN_BOUND');
  const hashState=crypto.createHash('sha256');
  const handle=await fs.open(manifest,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  let failure;try{
    need(sameStat(before,await handle.stat({bigint:true})),'MANIFEST_CHANGED');
    const buffer=Buffer.alloc(512*1024);let offset=0;
    while(offset<Number(before.size)){
      const {bytesRead}=await handle.read(buffer,0,Math.min(buffer.length,Number(before.size)-offset),offset);
      need(bytesRead>0,'MANIFEST_CHANGED');hashState.update(buffer.subarray(0,bytesRead));offset+=bytesRead;
    }
    need((await handle.read(buffer,0,1,offset)).bytesRead===0
      &&sameStat(before,await handle.stat({bigint:true}))&&sameStat(before,await fs.lstat(manifest,{bigint:true})),'MANIFEST_CHANGED');
  }catch(error){failure=error;}await close(handle,failure);
  const target=path.join(root,'.cache/current586-exact-original-restore');
  await fs.mkdir(target,{mode:0o700});need(await fs.realpath(target)===target,'PATH_REJECTED');
  await writeOnce(path.join(target,'plan.json'),planBytes);
  const receipt={schemaVersion:1,kind:'CURRENT586_EXACT_ORIGINAL_TRANSPORT_CLOSED',planSha256,
    binding:plan.binding,originalsSha256:plan.binding.originalsSha256,startedAt,completedAt,
    rawManifestSha256:hashState.digest('hex'),rawManifestBytes:Number(before.size),
    result,nativeEvidenceProduced:false,sourceValuesChanged:false,remoteSourceFreshnessVerifiedAfterTransport:false};
  const bytes=Buffer.from(current586OriginalCanonical(receipt)+'\n');await writeOnce(path.join(target,'receipt.json'),bytes);
  need(sameStat(before,await fs.lstat(manifest,{bigint:true})),'MANIFEST_CHANGED');
  return {receiptPath:'.cache/current586-exact-original-restore/receipt.json',receiptSha256:hash(bytes),receiptBytes:bytes.length};
}
