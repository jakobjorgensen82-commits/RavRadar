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
import { findSourceCompletedStageOccurrence } from './lib/source-completed-stage-occurrence.mjs';
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
}

export async function readAutomaticSourcePublicManifest(env,fetchImpl=globalThis.fetch,observation='selection'){
  const run=env.GITHUB_RUN_ID, attempt=env.GITHUB_RUN_ATTEMPT;
  assert(typeof run==='string'&&/^[1-9][0-9]{0,15}$/.test(run)
    && Number.isSafeInteger(Number(run))&&attempt==='1','SOURCE_SAVED_PUBLIC_OBSERVATION_INVALID');
  const url=new URL('https://ravradar.dk/data/live/manifest.json');
  assert(['selection','before-reseal'].includes(observation),'SOURCE_SAVED_PUBLIC_OBSERVATION_INVALID');
  const nonce=run+'-'+attempt+(observation==='before-reseal'?'-before-reseal':'');
  url.searchParams.set('source-saved',nonce);
  const response=await fetchImpl(url,{headers:{'Cache-Control':'no-cache'},
    redirect:'error',signal:AbortSignal.timeout(30_000)});
  assert.equal(response.status,200,'SOURCE_SAVED_PUBLIC_MANIFEST_HTTP');
  assert(response.redirected===false&&response.url===url.href,'SOURCE_SAVED_PUBLIC_MANIFEST_ORIGIN');
  return JSON.parse(await readBoundedPublicManifest(response));
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
  const occurrence=await findSourceCompletedStageOccurrence({repository:env.GITHUB_REPOSITORY,
    generation:current.descriptor,publicReferenceAt:new Date(publicManifest.productionReferenceAt).toISOString(),
    consumerRunId,token:env.GITHUB_TOKEN});
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
