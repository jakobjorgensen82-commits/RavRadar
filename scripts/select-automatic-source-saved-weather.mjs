import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_PRODUCER_AFTER597_PARENT } from './lib/source-producer-after597-parent.mjs';
import { requireSourceProducerBinding, requireSourceProducerOutput } from './lib/source-producer-after597-runtime-family.mjs';
import { sourceProducerOriginalStageFamily } from './stage-source-producer-originals.mjs';
import { pinCurrentProtectedPrivateProductionRuntime, createProtectedPrivateRuntimeClients }
  from './protected-private-production-runtime.mjs';
import { readSourceCompletedPrivateRuntimePin } from './completed-private-runtime-admission.mjs';
import { createProtectedRavScoreCheckpointVersionRequester } from './protected-ravscore-continuation-checkpoint.mjs';
import { findSourceCompletedStageOccurrence } from './lib/source-completed-stage-occurrence.mjs';
import { assertSourceIntegratedPublicationPin } from './lib/source-integrated-publication-receipt.mjs';
import { readClosedUnpublishedSourcePagesOccurrence } from './lib/source-completed-public-pages-occurrence.mjs';
import { readCurrentProtectedSourcePagesHandoff } from './protected-operational-reentry-evidence.mjs';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { completedRuntimeOperationalSource, operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY, RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY }
  from './ravscore-operational-activation.mjs';

const hash = /^[a-f0-9]{64}$/;
const hour = /^\d{4}-\d\d-\d\dT\d\d:00:00(?:[.]000)?Z$/;
const generationTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function classifyAutomaticSourceSavedWeather({publicManifest,descriptor}){
  assert(publicManifest?.schemaVersion===4&&publicManifest.complete===true
    &&publicManifest.zoneCount===210&&publicManifest.coastalPartCount===673
    &&typeof publicManifest.datasetId==='string'&&publicManifest.datasetId.length>0);
  for(const generation of [publicManifest,descriptor]){
    assert(hour.test(generation?.productionReferenceAt??'')&&generationTime(generation.productionReferenceAt));
    assert(generationTime(generation.generatedAt));
  }
  const publicBinding=publicManifest.ravScoreModelBinding;
  const currentBinding=descriptor.modelBinding;
  for(const key of ['modelId','stateSchemaVersion','modelContractSha256','modelBundleSha256']){
    assert(typeof currentBinding?.[key]==='string'&&currentBinding[key].length>0);
    assert.equal(publicBinding?.[key],currentBinding[key],'SOURCE_SAVED_PUBLIC_BINDING_MISMATCH');
  }
  const publicTime=Date.parse(publicManifest.productionReferenceAt);
  const protectedTime=Date.parse(descriptor.productionReferenceAt);
  assert(protectedTime>=publicTime,'SOURCE_SAVED_CURRENT_BEHIND_PUBLIC');
  if(protectedTime===publicTime){
    assert.equal(descriptor.datasetId,publicManifest.datasetId,'SOURCE_SAVED_SAME_HOUR_DATASET_MISMATCH');
    assert.equal(descriptor.generatedAt,publicManifest.generatedAt,'SOURCE_SAVED_SAME_HOUR_GENERATION_MISMATCH');
    return 'ordinary';
  }
  assert.notEqual(descriptor.datasetId,publicManifest.datasetId,'SOURCE_SAVED_NEWER_REUSES_DATASET');
  return 'saved';
}

export async function requireAutomaticSourcePublicSeal({request,publicManifest,route,reentryAction}){
  if(reentryAction==='SOURCE_INTEGRATED_RESEALED'){
    assert.equal(route,'ordinary','SOURCE_RESEALED_PUBLIC_ROUTE_MOVED');
  }else if(reentryAction!=='NONE'){
    assert(route==='ordinary'&&['SAFE_SOURCE_ABORT','TARGET_RECONCILE','EXACT_TARGET_REDEPLOY',
      'PRE_ACTIVATION_RESUME','COMPLETED_PRE_ACTIVATION'].includes(reentryAction),
    'SOURCE_SAVED_PENDING_OR_UNKNOWN_REENTRY');
    return;
  }
  const operationKey=RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY;
  const profileKey=RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY;
  const rows=await request('?select=document_key,payload,version&document_key=in.('+operationKey+','+profileKey+')',
    {},'automatic SOURCE operational/profile read');
  assert(Array.isArray(rows)&&rows.length===2,'SOURCE_SAVED_ACTIVE_ROWS_INVALID');
  const operational=rows.find(row=>row?.document_key===operationKey);
  const profile=rows.find(row=>row?.document_key===profileKey);
  assert(operational&&profile,'SOURCE_SAVED_ACTIVE_ROWS_INVALID');
  const active=completedRuntimeOperationalSource(operational,profile);
  assert(operationalResolvedBindingCurrent(active),'SOURCE_SAVED_ACTIVE_BINDING_CHANGED');
  assert(active.datasetId===publicManifest.datasetId
    && Date.parse(active.productionReferenceAt)===Date.parse(publicManifest.productionReferenceAt)
    && active.publicManifestSha256===sha256CanonicalJson(publicManifest),'SOURCE_SAVED_PUBLIC_OPERATIONAL_SEAL_MISMATCH');
  return active;
}

export async function readAutomaticSourcePublicManifest(env,fetchImpl=globalThis.fetch,observation='selection'){
  const run=env.GITHUB_RUN_ID, attempt=env.GITHUB_RUN_ATTEMPT;
  assert(typeof run==='string'&&/^[1-9][0-9]{0,15}$/.test(run)
    && Number.isSafeInteger(Number(run))&&attempt==='1','SOURCE_SAVED_PUBLIC_OBSERVATION_INVALID');
  const url=new URL('https://ravradar.dk/data/live/manifest.json');
  assert(['selection','before-reseal','closed-pages-recheck','closed-pages-before-upload'].includes(observation),'SOURCE_SAVED_PUBLIC_OBSERVATION_INVALID');
  const nonce=run+'-'+attempt+(observation==='selection'?'':'-'+observation);
  url.searchParams.set('source-saved',nonce);
  const response=await fetchImpl(url,{headers:{'Cache-Control':'no-cache'},
    redirect:'error',signal:AbortSignal.timeout(30_000)});
  assert.equal(response.status,200,'SOURCE_SAVED_PUBLIC_MANIFEST_HTTP');
  assert(response.redirected===false&&response.url===url.href,'SOURCE_SAVED_PUBLIC_MANIFEST_ORIGIN');
  return JSON.parse(await readBoundedPublicManifest(response));
}

function requireClosedPagesCaller(env, producer) {
  const consumerRunId=Number(env.GITHUB_RUN_ID);
  assert(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='jakobjorgensen82-commits/RavRadar'
    &&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_WORKFLOW==='Run current RavRadar weather once'
    &&env.GITHUB_JOB===(producer?'build-and-prepare':'current-main-target')
    &&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_RUN_ATTEMPT==='1'
    &&env.GITHUB_ACTOR==='github-actions[bot]'&&env.GITHUB_TRIGGERING_ACTOR==='github-actions[bot]'
    &&(producer?env.OPERATIONAL_ACTION==='integrated':env.SOURCE_ROUTE_REQUESTED==='false'
      &&env.SOURCE_ROUTE_ORDINARY==='true'&&env.SOURCE_SAVED_REENTRY_ACTION==='NONE')
    &&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??'')&&Number.isSafeInteger(consumerRunId)&&consumerRunId>0
    &&String(consumerRunId)===env.GITHUB_RUN_ID,'SOURCE_CLOSED_PAGES_CALLER');
  return consumerRunId;
}

export function scheduledSourceClosedPagesPin(env, proof) {
  assert.equal(proof.kind,'SOURCE_SCHEDULED_CLOSED_PAGES_INPUTS_V1');
  return sha256CanonicalJson({ consumerRunId:env.GITHUB_RUN_ID, sourceHead:env.GITHUB_SHA, proof });
}

async function inspectClosedPages(env, {readPublic,readPin,readActive,readHandoff,readOccurrence}, producer) {
  const consumerRunId=requireClosedPagesCaller(env, producer);
  const [publicManifest,livePin]=await Promise.all([readPublic('selection'),readPin()]);
  assert.equal(classifyAutomaticSourceSavedWeather({publicManifest,descriptor:livePin.descriptor}),'saved',
    'SOURCE_CLOSED_PAGES_NO_UNPUBLISHED_PAIR');
  const active=await readActive(publicManifest);
  const archived=await readHandoff();
  const {descriptor,seal,handoff}=archived;
  const publicSha=sha256CanonicalJson(publicManifest);
  assert(active.model==='integrated'&&active.pending===false&&active.publicManifestSha256===publicSha
    &&Number.isSafeInteger(active.sourceRows?.profileVersion)&&active.sourceRows.profileVersion>0
    &&handoff.centralVersion===active.centralVersion&&active.centralVersion===active.sourceRows?.operationalVersion,
  'SOURCE_CLOSED_PAGES_PUBLIC_ACTIVE_BINDING');
  assert(handoff.savedWeatherContinuation!==true&&seal.runId<consumerRunId&&seal.headSha===env.GITHUB_SHA
    &&descriptor.repository===env.GITHUB_REPOSITORY&&descriptor.deploymentId===seal.attemptId
    &&descriptor.publicManifestSha256===seal.targetPublicManifestSha256,'SOURCE_CLOSED_PAGES_HANDOFF_IDENTITY');
  const bound=assertSourceIntegratedPublicationPin({...archived,livePin});
  const occurrence=await readOccurrence({repository:env.GITHUB_REPOSITORY,currentMainHead:env.GITHUB_SHA,
    artifactSeal:seal,token:env.GITHUB_TOKEN});
  assert(occurrence.kind==='SOURCE_CLOSED_UNPUBLISHED_PAGES_OCCURRENCE_V1'
    &&occurrence.runId===seal.runId&&occurrence.runAttempt===seal.runAttempt&&occurrence.sourceHead===seal.headSha
    &&occurrence.artifactId===seal.artifactId&&occurrence.artifactDigestSha256===seal.artifactDigestSha256
    &&occurrence.targetPublicManifestSha256===bound.targetManifestSha256,'SOURCE_CLOSED_PAGES_OCCURRENCE_UNPROVED');
  const confirm = async observation => {
    const [publicAgain,pinAgain]=await Promise.all([
      readPublic(observation),readPin(),archived.assertCurrent(),
    ]);
    assert.equal(sha256CanonicalJson(publicAgain),publicSha,'SOURCE_CLOSED_PAGES_PUBLIC_MOVED');
    assert.deepEqual(pinAgain,livePin,'SOURCE_CLOSED_PAGES_PAIR_MOVED');
    assert.deepEqual(await readActive(publicAgain),active,'SOURCE_CLOSED_PAGES_ACTIVE_MOVED');
    return publicAgain;
  };
  const publicAgain=await confirm('closed-pages-recheck');
  const proof=Object.freeze({kind:'SOURCE_SCHEDULED_CLOSED_PAGES_INPUTS_V1',occurrence,
    pairSha256:bound.pairSha256,pointerVersion:livePin.pointerVersion,pointerSha256:livePin.pointerSha256,
    publicManifestSha256:publicSha,activeVersion:active.centralVersion,
    profileVersion:active.sourceRows?.profileVersion,evidenceVersion:archived.evidenceVersion,
    productionReferenceAt:livePin.descriptor.productionReferenceAt});
  if (!producer) return proof;
  return Object.freeze({proof, protectedPin:livePin,
    publicReferenceAt:publicAgain.productionReferenceAt, publicManifestJson:JSON.stringify(publicAgain),
    assertCurrent:async()=>{await confirm('closed-pages-before-upload');},
  });
}

// The target job and the actual fixed producer both revalidate the live stage.
export function inspectScheduledSourceClosedPages(env, readers) {
  return inspectClosedPages(env, readers, false);
}

function readClosedPagesInputs(env, producer, fetchImpl) {
  requireClosedPagesCaller(env, producer);
  requireSourceProducerOutput();
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients({storageBackend:'supabase',fetchImpl});
  const checkpointVersionRequest=createProtectedRavScoreCheckpointVersionRequester({fetchImpl});
  return inspectClosedPages(env,{
    readPublic:observation=>readAutomaticSourcePublicManifest(env,fetchImpl,observation),
    readPin:async()=>{
      const live=await readSourceCompletedPrivateRuntimePin({request,checkpointVersionRequest});
      assert.equal(sourceProducerOriginalStageFamily(live.descriptor,requireSourceProducerBinding()),'current',
        'SOURCE_ROUTE_NOT_INSTALLED');
      return live;
    },
    readActive:publicManifest=>requireAutomaticSourcePublicSeal({request,publicManifest,route:'saved',reentryAction:'NONE'}),
    readHandoff:()=>readCurrentProtectedSourcePagesHandoff({repository:env.GITHUB_REPOSITORY,request,storage}),
    readOccurrence:request=>readClosedUnpublishedSourcePagesOccurrence({...request,fetchImpl}),
  },producer);
}

export function readScheduledSourceClosedPagesInputs(env) {
  return readClosedPagesInputs(env,false,globalThis.fetch);
}

// Only the already-qualified lexical producer passes its original deadline.
export function readSourceClosedPagesProducerInput(env, fetchImpl) {
  assert.equal(typeof fetchImpl,'function','SOURCE_CLOSED_PAGES_PRODUCER_FETCH');
  return readClosedPagesInputs(env,true,fetchImpl);
}

async function chooseSourceWeatherOccurrence(env, current, publicManifest, consumerRunId,
  {readSaved = findSourceCompletedStageOccurrence, readClosed = readScheduledSourceClosedPagesInputs} = {}) {
  try {
    const occurrence = await readSaved({repository:env.GITHUB_REPOSITORY, generation:current.descriptor,
      publicReferenceAt:new Date(publicManifest.productionReferenceAt).toISOString(),
      consumerRunId,token:env.GITHUB_TOKEN});
    return {occurrence};
  } catch (error) {
    // Only the existing saved reader's Pages-specific stop can try the
    // independent sealed terminal proof. It never authorizes the fresh path.
    if (error?.message!=='SOURCE_COMPLETED_OCCURRENCE_PAGES_REENTRY_REQUIRED'
      || env.SOURCE_CLOSED_PAGES_DEFAULT_ELIGIBLE!=='true'
      || env.GITHUB_ACTOR!=='github-actions[bot]' || env.GITHUB_TRIGGERING_ACTOR!=='github-actions[bot]'
      || env.SOURCE_ROUTE_REQUESTED!=='false' || env.SOURCE_SAVED_REENTRY_ACTION!=='NONE') throw error;
    const proof = await readClosed(env);
    assert(proof.pointerVersion===current.pointerVersion && proof.pointerSha256===current.pointerSha256
      && proof.productionReferenceAt===current.descriptor.productionReferenceAt
      && proof.publicManifestSha256===sha256CanonicalJson(publicManifest),'SOURCE_CLOSED_PAGES_SELECTION_DRIFT');
    return {closedPin:scheduledSourceClosedPagesPin(env,proof)};
  }
}

async function main(){
  const source=SOURCE_PRODUCER_AFTER597_PARENT;
  const unissued=source.binding===null&&source.output===null&&source.nextRelease===null;
  if(!unissued)requireSourceProducerOutput();
  const env=process.env;
  assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(env.GITHUB_REF,'refs/heads/main');
  assert.equal(env.GITHUB_WORKFLOW,'Run current RavRadar weather once');
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
  assert(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''));
  const consumerRunId=Number(env.GITHUB_RUN_ID);
  assert(Number.isSafeInteger(consumerRunId)&&consumerRunId>0);
  const {SOURCE_ROUTE_REQUESTED: requested,SOURCE_ROUTE_ORDINARY: ordinary}=env;
  assert([requested,ordinary].every(value=>['true','false'].includes(value)),'SOURCE_ROUTE_PROJECTION_INVALID');
  if(ordinary!=='true')return;
  if(unissued){
    assert.equal(requested,'false','SOURCE_ROUTE_UNISSUED');
    await fs.appendFile(env.GITHUB_OUTPUT,'recovery_family=ordinary\n');
    return;
  }
  const {documentRequest:request}=createProtectedPrivateRuntimeClients({storageBackend:'supabase'});
  const [publicManifest,current]=await Promise.all([readAutomaticSourcePublicManifest(env),
    pinCurrentProtectedPrivateProductionRuntime({request})]);
  // I and T must identify the same installed family. An issued checkout is
  // not an ordinary predecessor executor during the controlled handover.
  assert.equal(sourceProducerOriginalStageFamily(current.descriptor,requireSourceProducerBinding()),
    'current','SOURCE_ROUTE_NOT_INSTALLED');
  const route=classifyAutomaticSourceSavedWeather({publicManifest,descriptor:current.descriptor});
  await requireAutomaticSourcePublicSeal({request,publicManifest,route,reentryAction:env.SOURCE_SAVED_REENTRY_ACTION});
  if(route==='ordinary'){
    await fs.appendFile(env.GITHUB_OUTPUT,'recovery_family=source\n');
    return;
  }
  const {occurrence,closedPin}=await chooseSourceWeatherOccurrence(env,current,publicManifest,consumerRunId);
  if (closedPin) {
    await fs.appendFile(env.GITHUB_OUTPUT,
      'recovery_family=source\nsource_closed_pages=true\nsource_closed_pages_pin='+closedPin+'\n');
    return;
  }
  const pin=await readSourceCompletedPrivateRuntimePin({request});
  const {descriptor,pointerSha256,pointerVersion}=pin;
  assert.deepEqual({descriptor,pointerSha256,pointerVersion},current,'SOURCE_SAVED_CURRENT_DRIFT');
  assert(hash.test(pin.pin));
  assert.equal(occurrence.sourceHead,descriptor.sourceHead);
  assert.equal(occurrence.datasetId,descriptor.datasetId);
  assert.equal(occurrence.productionReferenceAt,descriptor.productionReferenceAt);
  assert(occurrence.pagesOutcome==='NOT_STARTED' && occurrence.pagesProof===undefined
    || occurrence.pagesOutcome==='SOURCE_METADATA_VISIBILITY_EXHAUSTED' && hash.test(occurrence.pagesProof??''),
    'SOURCE_SAVED_PAGES_OUTCOME');
  assert([occurrence.runId,occurrence.runAttempt,occurrence.artifactId].every(value=>Number.isSafeInteger(value)&&value>0));
  const locator=[occurrence.runId,occurrence.runAttempt,occurrence.sourceHead,occurrence.artifactId].join('-');
  const target=descriptor.productionReferenceAt.replace('.000Z','Z');
  await fs.appendFile(env.GITHUB_OUTPUT,[
    'recovery_family=source','target_hour='+target,'selected=true','pair_pin='+pin.pin,'occurrence='+locator,
    ...(occurrence.pagesProof ? ['pages_proof='+occurrence.pagesProof] : []),
    'public_manifest_sha256='+sha256CanonicalJson(publicManifest),'',
  ].join('\n'));
  console.log('Verified an exact saved SOURCE generation is available for automatic recovery.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,2);
  await main().catch(error=>{
    const reason=typeof error?.message==='string'&&/^SOURCE_[A-Z0-9_]+$/.test(error.message)
      ? error.message:'SOURCE_SAVED_SELECTION_REFUSED';
    console.error(reason);process.exitCode=1;
  });
}
