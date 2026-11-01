// TEST SUPPORT ONLY: extend an already genuine normal preparation in the SAME
// process. No saved receipt/JSON can replace its opaque token. This creates no
// fixture, host, original B, tuple, transport, SQL or publication authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {requireNativeOriginalContinuityOutput} from './native-original-continuity-successor-source.mjs';
import {assertNativeOriginalContinuityRuntimeTransitionPrepared}
  from '../native-original-continuity-runtime-transition.mjs';
import {assertEstablishedNativeCurrent585MetadataCheckpoint}
  from './established-native-current-origin.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ATTEST='privateEstablishedNativeCurrentOrigin';
const canonical=value=>JSON.stringify(value,(_key,nested)=>nested&&typeof nested==='object'&&!Array.isArray(nested)
  ?Object.fromEntries(Object.keys(nested).sort().map(key=>[key,nested[key]])):nested);
const hash=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));

export async function assertNativeOriginalContinuityPreparedOriginalTest(token){
  requireNativeOriginalContinuityOutput(); // Never a fabricated test tuple.
  assert.equal(arguments.length,1);
  await assertNativeOriginalContinuityRuntimeTransitionPrepared(token); // Real in-process producer FIRST.
  const head=execFileSync('git',['rev-parse','HEAD^{commit}'],{cwd:ROOT,encoding:'utf8',timeout:30000}).trim();
  assert.match(head,/^[a-f0-9]{40}$/);
  execFileSync('git',['diff','--exit-code','HEAD','--'],{cwd:ROOT,encoding:'utf8',timeout:30000});
  const conditions=await read(path.join(token.outputRoot,'data/live/conditions.json'));
  const centralContract=await read(path.join(ROOT,'data/live/coastal-parts-v2.json'));
  const previousCheckpoint=await read(token.originalCheckpointPath);
  const incomingCheckpoint=await read(token.checkpointPath);
  const attestation=conditions[ATTEST];
  assert.equal(attestation.producer.sourceHead,head);
  assert.equal(attestation.predecessor.sourceFamilyHead,'e8f9f7197d9e262720b7627b4970d3da82baa9d9');
  assert.equal(attestation.transition,'SAME_H0_MODEL_METADATA');
  assert.equal(incomingCheckpoint.partCount,673);
  assert.equal(Object.keys(incomingCheckpoint.states).length,673);
  assert.equal(Object.keys(incomingCheckpoint.candidateGRollbackCompanion.states).length,673);
  // This is the exact assert-only descriptor view used by the normal finalizer,
  // NOT a created or published successor B descriptor.
  const descriptor={...structuredClone(attestation.predecessor.descriptor),sourceHead:head};
  const options={descriptor,conditions,centralContract,previousCheckpoint,incomingCheckpoint};
  assert.equal(await assertEstablishedNativeCurrent585MetadataCheckpoint(options),true);
  const badParent=structuredClone(conditions),event=badParent[ATTEST];
  event.parent.bundleContentSha256=event.parent.bundleContentSha256==='0'.repeat(64)?'1'.repeat(64):'0'.repeat(64);
  const {attestationSha256:_oldHash,...content}=event;event.attestationSha256=hash(content);
  await assert.rejects(assertEstablishedNativeCurrent585MetadataCheckpoint({...options,conditions:badParent}),
    {code:'ESTABLISHED_CURRENT_ORIGIN_METADATA_ATTESTED_SOURCE'});
  await assert.rejects(assertEstablishedNativeCurrent585MetadataCheckpoint({...options,
    centralContract:{...centralContract,testOnlyUnexpectedRegistryField:true}}),
    {code:'ESTABLISHED_CURRENT_ORIGIN_METADATA_ATTESTED_SOURCE'});
  const badIncoming=structuredClone(incomingCheckpoint),first=Object.keys(badIncoming.states).sort()[0];
  badIncoming.states[first].testOnlyUnknownStateField=true;
  await assert.rejects(assertEstablishedNativeCurrent585MetadataCheckpoint({...options,incomingCheckpoint:badIncoming}),
    {code:'ESTABLISHED_CURRENT_ORIGIN_METADATA_INCOMING_B_S_DIFFER'});
  // No originals, output files, parent attestations or state arrays were edited.
  await assertNativeOriginalContinuityRuntimeTransitionPrepared(token);
  assert(same(await read(path.join(token.outputRoot,'data/live/conditions.json')),conditions),'PREPARED_CONDITIONS_CHANGED');
  assert(same(await read(token.originalCheckpointPath),previousCheckpoint),'ORIGINAL_CHECKPOINT_CHANGED');
  assert(same(await read(token.checkpointPath),incomingCheckpoint),'PREPARED_CHECKPOINT_CHANGED');
  return Object.freeze({kind:'NATIVE_ORIGINAL_CONTINUITY_GENUINE_PREPARED_TARGET',
    genuineNormalPreparation:true,partCount:673,sameH0WholeMetadataInverse:true,parentRefused:true,
    registryRefused:true,unknownStateFieldRefused:true,originalBytesUnchanged:true,
    newBundleCreated:false,newBundlePublished:false,centralWrite:false,sqlExecuted:false,
    privatePayloadIncluded:false,productionProof:false});
}
