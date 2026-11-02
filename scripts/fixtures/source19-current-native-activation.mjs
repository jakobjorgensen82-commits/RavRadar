// Native CURRENT fixture only: normal readiness/transition/CAS producers.
// No READY/ACTIVE/profile/controller document or successful verification is
// hand-authored. A missing genuine source seed remains a prerequisite.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSupabaseAdminRequester} from '../lib/supabase-admin-rest.mjs';
import {requireSourceProducerOutput} from '../lib/source-producer-successor-source.mjs';
import {hydratePrivateConditionsHourly} from '../lib/private-conditions-hourly.mjs';
import {computeRavScorePublicBrowserClosure} from '../lib/ravscore-public-browser-closure.mjs';
import {verifyRavScoreOperationalPagesDeployment} from '../verify-ravscore-operational-pages-deployment.mjs';
import {attestLegacyCandidateGSource,verifyLegacyCandidateGSource} from '../verify-legacy-candidate-g-source.mjs';
import {auditIntegratedRavScorePublicRuntime} from '../audit-ravscore-integrated-public-runtime.mjs';
import {buildIntegratedCutoverReadiness,verifyIntegratedDatabaseReadback} from '../integrated-cutover-readiness.mjs';
import {RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY as OPERATION,
  RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY as PROFILE,RAVSCORE_INTEGRATED_RETURN_POLICY as RETURN,
  prepareIntegratedOperationalReturn,operationalIntegratedReturnTransition,
  writeCentralCas,resolveOperationalRavScoreModel} from '../ravscore-operational-activation.mjs';

const fail=reason=>{throw Error('CURRENT_NATIVE_ACTIVATION_'+reason);};
const same=(a,b)=>assert.deepEqual(a,b);
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function noLinks(file){for(let at=file;;at=path.dirname(at)){
  const stat=await fs.lstat(at);assert(!stat.isSymbolicLink());if(at===path.dirname(at))break;}}
async function regular(root,relative){
  assert(relative&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..'));
  const file=path.join(root,relative);await noLinks(file);const before=await fs.lstat(file,{bigint:true});
  assert(before.isFile()&&before.nlink===1n&&before.ino>0n);
  const raw=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
  same([after.dev,after.ino,after.size],[before.dev,before.ino,before.size]);return raw;
}
async function document(root,file){return JSON.parse((await regular(root,file)).toString('utf8'));}
function localPublicFetch(root){
  // Transport only. The normal verifier derives every successful result from
  // actual immutable public/implementation bytes, never prebuilt JSON proof.
  return async input=>{
    const url=new URL(input);assert.equal(url.origin,'https://current-native-public.invalid');
    const relative=decodeURIComponent(url.pathname.slice(1));
    if(!/^(?:data\/(?:live\/|zones\.geojson$)|js\/|scripts\/rollback-assets\/|index\.html$|admin\.html$|bootstrap\.js$|app\.js$|service-worker\.js$|config\.js$)/.test(relative))
      fail('NONPUBLIC_FETCH');
    if(relative.includes('conditions.json')&&!relative.includes('public-conditions.json'))fail('PRIVATE_FETCH');
    const raw=await regular(root,relative);return new Response(raw,{status:200});
  };
}
async function publicEvidence(root,sourceHead,model){
  const manifest=await document(root,'data/live/manifest.json');
  const closure=(await computeRavScorePublicBrowserClosure({root})).manifest;
  const contract=model==='candidate-g'?'scripts/rollback-assets/ravscore-model-contract.js':'js/core/ravscore-model-contract.js';
  const bundle=model==='candidate-g'?'scripts/rollback-assets/ravscore-model-bundle.generated.js':'js/core/ravscore-model-bundle.generated.js';
  const verification=await verifyRavScoreOperationalPagesDeployment({
    baseUrl:'https://current-native-public.invalid/',sourceHead,expectedManifest:manifest,expectedModel:model,
    expectedContractText:(await regular(root,contract)).toString('utf8'),
    expectedBundleText:(await regular(root,bundle)).toString('utf8'),expectedPublicClosure:closure,
    observationNonce:crypto.randomBytes(16).toString('hex'),attempts:1,retryDelayMs:0,fetchImpl:localPublicFetch(root)});
  return {manifest,closure,verification};
}
async function centralRows(request){
  const rows=await request('?select=document_key,payload,version&document_key=in.('+OPERATION+','+PROFILE+')',{});
  assert(Array.isArray(rows)&&rows.length<=2);const byKey=new Map();
  for(const row of rows){assert([OPERATION,PROFILE].includes(row.document_key)&&!byKey.has(row.document_key));
    assert(Number.isSafeInteger(Number(row.version))&&Number(row.version)>0);byKey.set(row.document_key,row);}
  return {operationalRow:byKey.get(OPERATION)??null,profileRow:byKey.get(PROFILE)??null};
}

export async function activateCurrentSourceNativeCentral(options){
  requireSourceProducerOutput(); // Before options/getters, paths or transports.
  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options).sort(),['atomicRequest','request','sourceHead','sourceRoot','targetRoot']);
  const {request,atomicRequest,sourceHead}=options;
  assert.equal(typeof request,'function');assert.equal(typeof atomicRequest,'function');
  assert.match(sourceHead,/^[a-f0-9]{40}$/);
  const source=path.resolve(options.sourceRoot),target=path.resolve(options.targetRoot),parent=path.dirname(target);
  assert.equal(path.basename(target),'current-source-native');assert.equal(path.dirname(source),parent);
  assert.equal(path.basename(source),'current-activation-source');assert.match(path.basename(parent),/^rr-source19-union-native-/);
  assert.notEqual(source,target);await noLinks(source);await noLinks(target);
  // Exact normal readback, not a caller callback that could skip verification.
  // The profile's existing closed TLS proxy routes these requests to SAME PG.
  assert.match(process.env.HTTPS_PROXY??'',/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);
  assert.equal(process.env.NODE_USE_ENV_PROXY,'1');
  const verifyDatabase=()=>verifyIntegratedDatabaseReadback({url:'https://fixture.invalid',
    serviceRoleKey:'sb_secret_source19_synthetic',sourcePhase:'source-producer'});
  await verifyDatabase();
  const targetPublic=await publicEvidence(target,sourceHead,'integrated');
  const [fullRaw,startupRaw,detailsRaw,coastalRaw,zonesRaw]=await Promise.all([
    regular(target,'data/live/conditions.json'),regular(target,'data/live/public-conditions.json'),
    regular(target,'data/live/public-condition-details.json'),regular(target,'data/live/coastal-parts-v2.json'),regular(target,'data/zones.geojson')]);
  const full=hydratePrivateConditionsHourly(JSON.parse(fullRaw));
  const publicAudit=auditIntegratedRavScorePublicRuntime(full,{startup:JSON.parse(startupRaw),startupText:startupRaw.toString('utf8'),
    details:JSON.parse(detailsRaw),detailsText:detailsRaw.toString('utf8'),coastalPartsText:coastalRaw.toString('utf8'),
    zoneRegistryText:zonesRaw.toString('utf8'),manifest:targetPublic.manifest});
  const readiness=await buildIntegratedCutoverReadiness(sourceHead,{publicImplementationClosureSha256:targetPublic.verification.implementationClosureSha256});
  let rows=await centralRows(request);
  if(!rows.profileRow){
    // Only an ACTUAL normal source profile may initialize the fixture table.
    // This creates no ACTIVE controller and does not pretend it already exists.
    const sourceProfile=await document(source,'data/admin/ravscore-profile-selection.json');
    resolveOperationalRavScoreModel(null,{profileRow:{version:1,payload:sourceProfile}});
    const inserted=await request('?on_conflict=document_key&select=document_key,payload,version',{
      method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify({document_key:PROFILE,payload:sourceProfile,updated_by:null})});
    assert(Array.isArray(inserted)&&inserted.length===1);rows=await centralRows(request);
    same(rows.profileRow.payload,sourceProfile);
  }
  const resolved=resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  if(resolved.model==='integrated'){
    // Existing genuine same-host ACTIVE rows need no invented first-cutover.
    assert(Number(rows.operationalRow?.version)>0);return {rows,created:false,normalReadback:true,productionProof:false};
  }
  let sourcePublic,sourceAttestation=null;
  if(resolved.model==='legacy-candidate-g'){
    const manifest=await document(source,'data/live/manifest.json');
    const conditions=JSON.parse(await regular(source,'data/live/conditions.json'));
    sourceAttestation=attestLegacyCandidateGSource({manifest,conditions});
    const verification=await verifyLegacyCandidateGSource({baseUrl:'https://current-native-public.invalid/',sourceHead,
      expectedManifest:manifest,localAttestation:sourceAttestation,fetchImpl:localPublicFetch(source),root:source});
    sourcePublic={manifest,verification};
  }else if(resolved.model==='candidate-g')sourcePublic=await publicEvidence(source,sourceHead,'candidate-g');
  else fail('GENUINE_SOURCE_REQUIRED');
  const initial=resolved.initialCutoverRequired===true;
  const plan=prepareIntegratedOperationalReturn({currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    sourceHead,publicManifest:targetPublic.manifest,publicAudit,readiness,
    sourceImplementationClosureSha256:sourcePublic.verification.implementationClosureSha256,
    requestedImplementationClosureSha256:targetPublic.verification.implementationClosureSha256,
    eventName:RETURN.manualEventName,ref:RETURN.mainRef,githubSha:sourceHead,
    confirmation:initial?'':RETURN.confirmation,initialCutoverRequested:initial,
    initialCutoverConfirmation:initial?RETURN.initialCutoverConfirmation:''});
  const begin=operationalIntegratedReturnTransition({action:'return-begin',currentRow:rows.operationalRow,
    currentProfileRow:rows.profileRow,expectedVersion:Number(rows.operationalRow?.version??0),plan,readiness,
    publicManifest:targetPublic.manifest,publicAudit,sourceManifest:sourcePublic.manifest,
    sourceAttestation,sourceVerification:sourcePublic.verification,sourceDeploymentId:'native-actual-source',
    deploymentId:'native-integrated-target',now:new Date().toISOString()});
  await writeCentralCas(atomicRequest,request,rows,begin,readiness.centralProfile);
  rows=await centralRows(request);same(rows.operationalRow.payload,begin.document);
  const complete=operationalIntegratedReturnTransition({action:'return-complete',currentRow:rows.operationalRow,
    currentProfileRow:rows.profileRow,expectedVersion:Number(rows.operationalRow.version),plan,readiness,
    publicManifest:targetPublic.manifest,publicAudit,publicVerification:targetPublic.verification,
    deploymentId:'native-integrated-target',now:new Date().toISOString()});
  await writeCentralCas(atomicRequest,request,rows,complete,readiness.centralProfile);
  rows=await centralRows(request);same(rows.operationalRow.payload,complete.document);
  const active=resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  assert.equal(active.model,'integrated');assert.equal(active.pending,false);
  await verifyDatabase();
  return {rows,created:true,sourcePublicManifestSha256:sourcePublic.verification.publicManifestSha256,
    targetPublicManifestSha256:targetPublic.verification.publicManifestSha256,
    activeProfileSha256:sha(JSON.stringify(rows.profileRow.payload)),normalReadback:true,productionProof:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    requireSourceProducerOutput();assert.deepEqual(process.argv.slice(2),['--native-current-central']);
    let input='';for await(const chunk of process.stdin){input+=chunk;assert(Buffer.byteLength(input)<=16384);}
    const options=JSON.parse(input);assert.deepEqual(Object.keys(options).sort(),['sourceHead','sourceRoot','targetRoot']);
    const endpoint='https://fixture.invalid/rest/v1/',key='sb_secret_source19_synthetic';
    const result=await activateCurrentSourceNativeCentral({...options,
      request:createSupabaseAdminRequester({endpoint:endpoint+'admin_documents',key}),
      atomicRequest:createSupabaseAdminRequester({endpoint:endpoint+'rpc/ravradar_ravscore_operational_cas',key})});
    console.log(JSON.stringify({kind:'CURRENT_NATIVE_NORMAL_CENTRAL_RESULT',created:result.created,
      normalReadback:result.normalReadback,productionProof:false}));
  }catch(error){
    // Exact fixed categories only; never normal producer exception text.
    const reason=error?.code==='ENOENT'?'GENUINE_SOURCE_INPUT_MISSING':
      error?.message==='SOURCE_PRODUCER_UNISSUED'?'SOURCE_UNISSUED':
      /(?:attested Candidate G source|legacy Candidate G attestation|source closure parity)/.test(error?.message??'')
        ?'GENUINE_SOURCE_SEAL_REQUIRED':'NORMAL_ACTIVATION_REFUSED';
    console.log(JSON.stringify({kind:'CURRENT_SOURCE_NATIVE_FIRST_FAILURE',phase:'CENTRAL_ACTIVATION',reason,
      sqlstate:'UNKNOWN',route:'OPERATIONAL_CAS',privatePayloadIncluded:false}));process.exitCode=1;
  }
}
