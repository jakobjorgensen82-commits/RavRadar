// PRIVATE operative-prefix adapter. INACTIVE/UNRUN. The genuine e7 source
// owns all public/readiness/rollback/transition/resolver computations. e8f9
// remains the immutable data-family verifier, not this operational host.
// Root must qualify/bind this exact new host before execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {requireSourceProducerOutput,requireSourceProducerBinding} from '../lib/source-producer-successor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING as LEGACY585_BINDING} from '../lib/account-statistics-assistant-successor-source.mjs';
import {SOURCE_PRODUCER_BEFORE as CURRENT594_BINDING} from '../lib/source-producer-successor-source.mjs';
import {verifyIntegratedDatabaseReadback as verifyCurrentSourceDatabaseReadback} from '../integrated-cutover-readiness.mjs';
import {createSupabaseAdminRequester} from '../lib/supabase-admin-rest.mjs';

const OPERATIVE_HEAD='e7c2e14a6403870e8a1df6c91862980640684733';
const OPERATIVE_TREE='10799761addcd1976055d9051bc5062f02eaf9f6';
const CURRENT594_HEAD='37a34703d9ae8bfb2c28056f21a7ea73944033ae';
const CURRENT594_TREE='09aef7f6f5d965f565fadabea203b50687acc255';
const CHECKPOINT='.cache/ravscore-continuation-checkpoint/checkpoint.json';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const same=(a,b)=>assert.deepEqual(a,b);
const sameBinding=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length
  &&Object.keys(b).every(key=>Object.hasOwn(a,key)&&a[key]===b[key]);
const fail=reason=>{const error=Error('CURRENT_NATIVE_INITIAL_'+reason);error.reason=reason;throw error;};
const inside=(root,file)=>{const r=path.relative(root,file);return r===''||(!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep));};
const load=(root,relative)=>import(pathToFileURL(path.join(root,relative)).href);
let phase='OWN_GUARDS';

async function noLinks(file){for(let at=file;;at=path.dirname(at)){
  const s=await fs.lstat(at);assert(!s.isSymbolicLink());if(at===path.dirname(at))break;}}
async function regular(root,relative){
  assert(relative&&!path.isAbsolute(relative)&&!relative.split(/[\\/]/).includes('..'));
  const file=path.resolve(root,relative);assert(inside(root,file)&&file!==root);await noLinks(file);
  const before=await fs.lstat(file,{bigint:true});assert(before.isFile()&&before.nlink===1n&&before.ino>0n);
  const raw=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
  same([after.dev,after.ino,after.size],[before.dev,before.ino,before.size]);return raw;
}
const document=async(root,file)=>JSON.parse((await regular(root,file)).toString('utf8'));
function git(root,...args){return cp.execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:4*1024*1024}).trim();}

function localPublicFetch(root,publicPaths){
  // Transport ONLY. Restrict the normal verifier to its actual closure and
  // public manifest/delivery namespace. Private conditions/B/S are never served.
  return async input=>{
    const url=new URL(input);assert.equal(url.origin,'https://current-native-public.invalid');
    const relative=decodeURIComponent(url.pathname.slice(1));
    if(!publicPaths.has(relative)&&!/^data\/live\/forecast\/[a-f0-9]{64}\.json$/.test(relative))fail('NONPUBLIC_FETCH');
    return new Response(await regular(root,relative),{status:200});
  };
}
async function implementation(root,frozen,model,binding){
  const closure=(await frozen.closure.computeRavScorePublicBrowserClosure({root})).manifest;
  const contractText=(await regular(root,'js/core/ravscore-model-contract.js')).toString('utf8');
  const bundleText=(await regular(root,'js/core/ravscore-model-bundle.generated.js')).toString('utf8');
  const identity=frozen.pages.computeSealedPublicImplementationClosureIdentity({expectedModel:model,expectedBinding:binding,
    expectedContractText:contractText,expectedBundleText:bundleText,expectedPublicClosure:closure});
  return {closure,contractText,bundleText,identity};
}
async function publicEvidence(root,frozen,model,binding,sourceHead=OPERATIVE_HEAD){
  const impl=await implementation(root,frozen,model,binding),manifest=await document(root,'data/live/manifest.json');
  const paths=new Set([...impl.closure.files.map(row=>row.path),...impl.closure.htmlEntrypoints.map(row=>row.path),
    'data/live/manifest.json','data/live/public-conditions.json','data/live/public-condition-details.json',
    'data/live/coastal-parts-v2.json','data/zones.geojson']);
  const verification=await frozen.pages.verifyRavScoreOperationalPagesDeployment({
    baseUrl:'https://current-native-public.invalid/',sourceHead,expectedManifest:manifest,expectedModel:model,
    expectedBinding:binding,expectedContractText:impl.contractText,expectedBundleText:impl.bundleText,
    expectedPublicClosure:impl.closure,observationNonce:crypto.randomBytes(16).toString('hex'),
    attempts:1,retryDelayMs:0,fetchImpl:localPublicFetch(root,paths)});
  assert.equal(verification.implementationClosureSha256,impl.identity.implementationClosureSha256);
  return {manifest,verification,...impl};
}
async function centralRows(request,op,profile){
  const rows=await request('?select=document_key,payload,version&document_key=in.('+op+','+profile+')',{});
  assert(Array.isArray(rows)&&rows.length<=2);const map=new Map();
  for(const row of rows){assert([op,profile].includes(row.document_key)&&!map.has(row.document_key));
    assert(Number.isSafeInteger(Number(row.version))&&Number(row.version)>0);map.set(row.document_key,row);}
  return {operationalRow:map.get(op)??null,profileRow:map.get(profile)??null};
}
async function copyStage(source,stage){
  await fs.mkdir(stage,{recursive:false,mode:0o700});
  const omitted=new Set(['.git','.cache','node_modules','_site','_support','.geometry-v2-work']);
  await fs.cp(source,stage,{recursive:true,force:false,errorOnExist:true,dereference:false,
    filter:async file=>{
      const relative=path.relative(source,file);if(relative&&relative.split(path.sep).some(part=>omitted.has(part)))return false;
      const stat=await fs.lstat(file);assert(!stat.isSymbolicLink()&&(stat.isDirectory()||stat.isFile()));return true;
    }});
  // The same TWO overlays installed before sealing in the normal workflow.
  for(const name of ['ravscore-model-contract.js','ravscore-model-bundle.generated.js']){
    const raw=await regular(source,'scripts/rollback-assets/'+name);
    await fs.writeFile(path.join(stage,'js/core',name),raw,{mode:0o644});
    same(await regular(stage,'js/core/'+name),raw);
  }
}

export async function initializeOperative585CurrentNativeCentral(){
  requireSourceProducerOutput();requireSourceProducerBinding(); // BEFORE paths/options/I/O.
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),own=path.dirname(root);
  assert.equal(path.basename(root),'current-source-native');assert.match(path.basename(own),/^rr-source19-union-native-/);
  await noLinks(root);same(await fs.realpath(root),root);
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP??''),path.join(root,'runner-temp'));
  assert.match(process.env.HTTPS_PROXY??'',/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);
  assert.equal(process.env.NODE_USE_ENV_PROXY,'1');
  const work=path.join(own,'current-source-native-initial-inputs'),source=path.join(work,'normal-initial-operative585');
  await noLinks(work);await noLinks(source);assert.equal(await fs.realpath(work),work);assert.equal(await fs.realpath(source),source);
  assert.equal(git(source,'rev-parse','HEAD'),OPERATIVE_HEAD);assert.equal(git(source,'rev-parse','HEAD^{tree}'),OPERATIVE_TREE);
  const sourcePaths=['scripts','js','.github','package.json','package-lock.json'];
  assert.equal(git(source,'diff','--name-only','HEAD','--',...sourcePaths),'');
  assert.equal(git(source,'ls-files','--others','--exclude-standard','--',...sourcePaths),'');
  const resultRoot=path.join(work,'initial-central');await fs.mkdir(resultRoot,{recursive:false,mode:0o700});
  // No deletion/retry on failure: the fixed newly owned directory is retained.
  phase='OPERATIVE_IMPLEMENTATION';
  const frozen={};
  for(const [name,file] of Object.entries({
    binding:'js/core/ravscore-model-contract.js',candidateBinding:'scripts/rollback-assets/ravscore-model-contract.js',
    closure:'scripts/lib/ravscore-public-browser-closure.mjs',pages:'scripts/verify-ravscore-operational-pages-deployment.mjs',
    workflow:'scripts/private-production-runtime-workflow.mjs',bundle:'scripts/private-production-runtime-bundle.mjs',
    checkpoint:'scripts/ravscore-continuation-checkpoint.mjs',hourly:'scripts/lib/private-conditions-hourly.mjs',
    pack:'scripts/lib/public-hour-delivery-pack.mjs',rollback:'scripts/prepare-candidate-g-operational-rollback.mjs',
    installer:'scripts/install-candidate-g-rollback-stage.mjs',readiness:'scripts/integrated-cutover-readiness.mjs',
    integratedAudit:'scripts/audit-ravscore-integrated-public-runtime.mjs',activation:'scripts/ravscore-operational-activation.mjs',
  }))frozen[name]=await load(source,file);
  const integrated=frozen.binding.ravScoreModelBinding(),candidate=frozen.candidateBinding.ravScoreModelBinding();
  assert.equal(integrated.modelBundleSha256,LEGACY585_BINDING.I);
  assert.equal(candidate.modelBundleSha256,LEGACY585_BINDING.C);
  const A=frozen.activation,OP=A.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,PROFILE=A.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY;
  const endpoint='https://fixture.invalid/rest/v1/',key='sb_secret_source19_synthetic';
  const request=createSupabaseAdminRequester({endpoint:endpoint+'admin_documents',key,logger:()=>{}});
  const atomicRequest=createSupabaseAdminRequester({endpoint:endpoint+'rpc/ravradar_ravscore_operational_cas',key,logger:()=>{}});
  const rowsRead=()=>centralRows(request,OP,PROFILE);
  const verifyDatabase=()=>frozen.readiness.verifyIntegratedDatabaseReadback({url:'https://fixture.invalid',serviceRoleKey:key,
    sourcePhase:'account-statistics-assistant',modelBinding:integrated,candidateModelBinding:candidate});
  phase='ACTUAL_SOURCE_SCHEMA_585_MODELS';await verifyDatabase();
  let rows=await rowsRead();assert.equal(rows.operationalRow,null,'One genuine initial activation, never refresh/retry');
  phase='NORMAL_SAVED_B_S';
  const fullRaw=await regular(source,'data/live/conditions.json'),full=frozen.hourly.hydratePrivateConditionsHourly(JSON.parse(fullRaw));
  const saved=path.join(work,'saved585-forward');await noLinks(saved);
  const expected=await frozen.workflow.buildPrivateRuntimeExpectation({repositoryRoot:source,
    targetReferenceAt:full.productionReferenceAt});
  const B=await frozen.bundle.verifyPrivateProductionRuntimeBundle({repositoryRoot:source,privateRoot:saved,
    bundlePath:path.join(saved,'restored'),expected});assert.equal(B.verified,true);
  assert.equal(B.modelBinding.modelBundleSha256,integrated.modelBundleSha256);assert.equal(B.datasetId,full.datasetId);
  assert.equal(B.productionReferenceAt,full.productionReferenceAt);
  // Rebind no bytes: authenticate the normal saved B against the current host.
  for(const file of B.files){const raw=await regular(source,file.relativePath);
    assert.equal(raw.length,file.bytes);assert.equal(sha(raw),file.sha256);}
  const S=await frozen.checkpoint.loadRavScoreContinuationCheckpointForTarget({repositoryRoot:source,
    checkpointPath:path.join(saved,CHECKPOINT),targetReference:full.productionReferenceAt});
  assert.equal(S.loaded,true);assert.equal(S.continuationAvailable,true);assert.equal(S.partCount,673);
  assert.equal(S.sourceDatasetId,full.datasetId);assert.equal(S.checkpointAt,full.productionReferenceAt);
  assert.equal(S.modelBundleSha256,integrated.modelBundleSha256);
  same(S.candidateGRollbackModelBinding,candidate);
  phase='NORMAL_INTEGRATED_PUBLIC';
  const sourcePublic=await publicEvidence(source,frozen,'integrated',integrated);
  const [startupRaw,detailsRaw,coastalRaw,zonesRaw]=await Promise.all([
    regular(source,'data/live/public-conditions.json'),regular(source,'data/live/public-condition-details.json'),
    regular(source,'data/live/coastal-parts-v2.json'),regular(source,'data/zones.geojson')]);
  const publicAudit=frozen.integratedAudit.auditIntegratedRavScorePublicRuntime(full,{
    startup:JSON.parse(startupRaw),startupText:startupRaw.toString('utf8'),details:JSON.parse(detailsRaw),detailsText:detailsRaw.toString('utf8'),
    coastalPartsText:coastalRaw.toString('utf8'),zoneRegistryText:zonesRaw.toString('utf8'),manifest:sourcePublic.manifest});
  const readiness=await frozen.readiness.buildIntegratedCutoverReadiness(OPERATIVE_HEAD,{
    publicImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256});
  const sourceProfile=await document(source,'data/admin/ravscore-profile-selection.json');same(sourceProfile,readiness.centralProfile);
  if(rows.profileRow)same(rows.profileRow.payload,sourceProfile);
  const initial=A.resolveOperationalRavScoreModel(null,{profileRow:rows.profileRow??{version:1,payload:sourceProfile}});
  assert.equal(initial.model,'integrated');assert.equal(initial.centralVersion,0);assert.equal(initial.pending,false);
  phase='NORMAL_CANDIDATE_PREPARATION';
  const stage=path.join(resultRoot,'candidate585');await copyStage(source,stage);
  const targetImpl=await implementation(stage,frozen,'candidate-g',candidate),policy=frozen.rollback.CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY;
  const prepared=frozen.rollback.prepareCandidateGOperationalRollback(full,{expectedDatasetId:full.datasetId,sourceHead:OPERATIVE_HEAD,
    mode:policy.executeMode,eventName:policy.manualEventName,ref:policy.mainRef,githubSha:OPERATIVE_HEAD,confirmation:policy.executeConfirmation,
    privateBundleContentSha256:B.bundleContentSha256,sourceImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256,
    requestedImplementationClosureSha256:targetImpl.identity.implementationClosureSha256,centralExpectedVersion:0});
  phase='NORMAL_CANDIDATE_PUBLIC_PACK';
  const marker=frozen.pack.privatePublicHourDeliveryMarker(prepared.candidateFull);
  // Actual585 normal B has an integrated marker and the existing rollback
  // producer retains it. Normal startup prefers that I-bound forecast; both
  // Candidate audit and normal pack materialization would correctly refuse it.
  // Keep that producer defect visible, before profile insertion or any CAS.
  if(marker&&!sameBinding(marker.modelBinding,candidate))fail('CANDIDATE_PUBLIC_PACK_REBUILD_REQUIRED');
  let candidatePack=null;
  if(marker){
    const sourcePack=path.join(source,'.cache/public-hour-delivery.pack');
    await frozen.pack.inspectPrivatePublicHourDeliveryPack({packPath:sourcePack,conditions:prepared.candidateFull});
    candidatePack=path.join(stage,'.cache/public-hour-delivery.pack');await fs.mkdir(path.dirname(candidatePack),{recursive:true,mode:0o700});
    await fs.writeFile(candidatePack,await regular(source,'.cache/public-hour-delivery.pack'),{flag:'wx',mode:0o600});
  }
  const stageMarker=await frozen.installer.installCandidateGRollbackStage({stageRoot:stage,repositoryRoot:source,
    candidateFull:prepared.candidateFull,plan:prepared.plan,expectedSourceHead:OPERATIVE_HEAD,expectedDatasetId:full.datasetId});
  const stagePublic=await load(stage,'scripts/public-conditions-lib.mjs');
  await stagePublic.writePublicRuntimeFromFull(prepared.candidateFull,{publicPath:path.join(stage,'data/live/public-conditions.json'),
    detailsPath:path.join(stage,'data/live/public-condition-details.json'),manifestPath:path.join(stage,'data/live/manifest.json'),
    coastalPartsPath:path.join(stage,'data/live/coastal-parts-v2.json'),zoneRegistryPath:path.join(stage,'data/zones.geojson'),
    hourDeliveryPackPath:candidatePack});
  const [cStartup,cDetails,cManifest,cCoastal,cZones]=await Promise.all([
    regular(stage,'data/live/public-conditions.json'),regular(stage,'data/live/public-condition-details.json'),
    regular(stage,'data/live/manifest.json'),regular(stage,'data/live/coastal-parts-v2.json'),regular(stage,'data/zones.geojson')]);
  const candidateAudit=await (await load(stage,'scripts/audit-candidate-g-rollback-public-runtime.mjs')).auditCandidateGRollbackPublicRuntime({
    candidateFull:prepared.candidateFull,plan:prepared.plan,startup:JSON.parse(cStartup),startupText:cStartup.toString('utf8'),
    details:JSON.parse(cDetails),detailsText:cDetails.toString('utf8'),manifest:JSON.parse(cManifest),manifestText:cManifest.toString('utf8'),
    coastalParts:JSON.parse(cCoastal),coastalPartsText:cCoastal.toString('utf8'),zoneRegistry:JSON.parse(cZones),zoneRegistryText:cZones.toString('utf8'),
    stageMarker,expectedSourceHead:OPERATIVE_HEAD,expectedDatasetId:full.datasetId});assert.equal(candidateAudit.publicArtifactReady,true);
  const candidatePublic=await publicEvidence(stage,frozen,'candidate-g',candidate);
  // All normal B/S/public/rollback gates above MUST finish before the first
  // write. No ACTIVE row or verification object is synthesized for this step.
  phase='INITIAL_PROFILE_INSERT';
  if(!rows.profileRow){
    const inserted=await request('?on_conflict=document_key&select=document_key,payload,version',{method:'POST',
      headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify({document_key:PROFILE,payload:sourceProfile,updated_by:null})});
    assert(Array.isArray(inserted)&&inserted.length===1);rows=await rowsRead();same(rows.profileRow.payload,sourceProfile);
    assert.equal(rows.operationalRow,null);
  }
  const writeRead=async transition=>{
    const expectedProfile=A.operationalCentralProfileForTransition({transition,currentProfile:rows.profileRow.payload,
      integratedProfile:readiness.centralProfile});
    await A.writeCentralCas(atomicRequest,request,rows,transition,readiness.centralProfile);
    rows=await rowsRead();assert.equal(Number(rows.operationalRow.version),transition.nextVersion);
    same(rows.operationalRow.payload,transition.document);
    same(rows.profileRow.payload,expectedProfile);
  };
  phase='CANDIDATE_BEGIN_CAS';
  await writeRead(A.operationalActivationTransition({action:'begin',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:0,plan:prepared.plan,sourceManifest:sourcePublic.manifest,sourceVerification:sourcePublic.verification,
    requestedManifest:candidatePublic.manifest,sourceDeploymentId:'native-prefix-integrated',deploymentId:'native-prefix-candidate'}));
  phase='CANDIDATE_COMPLETE_CAS';
  await writeRead(A.operationalActivationTransition({action:'complete',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:prepared.plan,publicManifest:candidatePublic.manifest,
    publicVerification:candidatePublic.verification,deploymentId:'native-prefix-candidate'}));
  const activeCandidate=A.resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  assert.equal(activeCandidate.model,'candidate-g');assert.equal(activeCandidate.pending,false);
  phase='NORMAL_INTEGRATED_RETURN_PLAN';
  const returnPolicy=A.RAVSCORE_INTEGRATED_RETURN_POLICY;
  const returnPlan=A.prepareIntegratedOperationalReturn({currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    sourceHead:OPERATIVE_HEAD,publicManifest:sourcePublic.manifest,publicAudit,readiness,
    sourceImplementationClosureSha256:candidatePublic.identity.implementationClosureSha256,
    requestedImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256,
    eventName:returnPolicy.manualEventName,ref:returnPolicy.mainRef,githubSha:OPERATIVE_HEAD,
    confirmation:returnPolicy.confirmation,initialCutoverRequested:false,initialCutoverConfirmation:''});
  phase='INTEGRATED_RETURN_BEGIN_CAS';
  await writeRead(A.operationalIntegratedReturnTransition({action:'return-begin',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:returnPlan,readiness,publicManifest:sourcePublic.manifest,publicAudit,
    sourceManifest:candidatePublic.manifest,sourceVerification:candidatePublic.verification,
    sourceDeploymentId:'native-prefix-candidate',deploymentId:'native-prefix-integrated-return'}));
  phase='INTEGRATED_RETURN_COMPLETE_CAS';
  await writeRead(A.operationalIntegratedReturnTransition({action:'return-complete',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:returnPlan,readiness,publicManifest:sourcePublic.manifest,publicAudit,
    publicVerification:sourcePublic.verification,deploymentId:'native-prefix-integrated-return'}));
  phase='FINAL_NORMAL_RESOLVER';
  const active=A.resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  assert.equal(active.model,'integrated');assert.equal(active.pending,false);same(active.modelBinding,integrated);
  await verifyDatabase();
  // Preserve the genuine normal input, both B/S stores and the stage on failure
  // or success. The driver's following mandatory capture MUST query actual PG.
  same(await regular(source,'data/live/conditions.json'),fullRaw);
  return Object.freeze({kind:'CURRENT_NATIVE_INITIAL_CENTRAL_RESULT',profile:'current-source-native-initial',
    sourceHead:OPERATIVE_HEAD,privateBundleSha256:B.bundleContentSha256,candidatePlanSha256:prepared.plan.planSha256,
    candidatePublicManifestSha256:candidatePublic.verification.publicManifestSha256,
    integratedPublicManifestSha256:sourcePublic.verification.publicManifestSha256,
    operationalVersion:Number(rows.operationalRow.version),profileVersion:Number(rows.profileRow.version),
    normalReadback:true,localPublicVerification:true,publicDeploymentProof:false,productionProof:false});
}

// Separate genuine594 branch in this SAME normal initial-CAS fixture.
export async function initializeCurrent594NativeCentral(){
  requireSourceProducerOutput();requireSourceProducerBinding(); // BEFORE paths/options/I/O.
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),own=path.dirname(root);
  assert.equal(path.basename(root),'current-source-native');assert.match(path.basename(own),/^rr-source19-union-native-/);
  await noLinks(root);same(await fs.realpath(root),root);
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP??''),path.join(root,'runner-temp'));
  assert.match(process.env.HTTPS_PROXY??'',/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);
  assert.equal(process.env.NODE_USE_ENV_PROXY,'1');
  const work=path.join(own,'current594-native-inputs'),source=path.join(work,'normal-genuine594');
  await noLinks(work);await noLinks(source);assert.equal(await fs.realpath(work),work);assert.equal(await fs.realpath(source),source);
  assert.equal(git(source,'rev-parse','HEAD'),CURRENT594_HEAD);assert.equal(git(source,'rev-parse','HEAD^{tree}'),CURRENT594_TREE);
  const sourcePaths=['scripts','js','.github','package.json','package-lock.json'];
  assert.equal(git(source,'diff','--name-only','HEAD','--',...sourcePaths),'');
  assert.equal(git(source,'ls-files','--others','--exclude-standard','--',...sourcePaths),'');
  const prefixBytes=await regular(work,'transport/current594-prefix-inputs.json'),prefix=JSON.parse(prefixBytes);
  assert.equal(prefix.profile,'current594-native-prefix');assert.equal(prefix.sourceHead,CURRENT594_HEAD);
  assert.equal(prefix.executionHead,git(root,'rev-parse','HEAD'));assert.equal(prefix.sourceRoot,source);
  assert.equal(prefix.saved594.sourceHead,CURRENT594_HEAD);assert.equal(prefix.saved594.referenceAt,prefix.target);
  for(const key of ['actionInvoked','sdkInvoked','sourceOwnerIssued'])assert.equal(prefix[key],false);
  const resultRoot=path.join(work,'initial-central');await fs.mkdir(resultRoot,{recursive:false,mode:0o700});
  // No deletion/retry on failure: the fixed newly owned directory is retained.
  phase='OPERATIVE_IMPLEMENTATION';
  const frozen={};
  for(const [name,file] of Object.entries({
    binding:'js/core/ravscore-model-contract.js',candidateBinding:'scripts/rollback-assets/ravscore-model-contract.js',
    closure:'scripts/lib/ravscore-public-browser-closure.mjs',pages:'scripts/verify-ravscore-operational-pages-deployment.mjs',
    workflow:'scripts/private-production-runtime-workflow.mjs',bundle:'scripts/private-production-runtime-bundle.mjs',
    checkpoint:'scripts/ravscore-continuation-checkpoint.mjs',hourly:'scripts/lib/private-conditions-hourly.mjs',
    pack:'scripts/lib/public-hour-delivery-pack.mjs',rollback:'scripts/prepare-candidate-g-operational-rollback.mjs',
    installer:'scripts/install-candidate-g-rollback-stage.mjs',readiness:'scripts/integrated-cutover-readiness.mjs',
    integratedAudit:'scripts/audit-ravscore-integrated-public-runtime.mjs',activation:'scripts/ravscore-operational-activation.mjs',
  }))frozen[name]=await load(source,file);
  const integrated=frozen.binding.ravScoreModelBinding(),candidate=frozen.candidateBinding.ravScoreModelBinding();
  assert.equal(integrated.modelBundleSha256,CURRENT594_BINDING.I);
  assert.equal(candidate.modelBundleSha256,CURRENT594_BINDING.C);
  const A=frozen.activation,OP=A.RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,PROFILE=A.RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY;
  const endpoint='https://fixture.invalid/rest/v1/',key='sb_secret_source19_synthetic';
  const request=createSupabaseAdminRequester({endpoint:endpoint+'admin_documents',key,logger:()=>{}});
  const atomicRequest=createSupabaseAdminRequester({endpoint:endpoint+'rpc/ravradar_ravscore_operational_cas',key,logger:()=>{}});
  const rowsRead=()=>centralRows(request,OP,PROFILE);
  // THIS PG already has SOURCE62. Verify its real policies with genuine594 I/C;
  // never describe this as a594 schema rollback or an authored22-field response.
  const verifyDatabase=()=>verifyCurrentSourceDatabaseReadback({url:'https://fixture.invalid',serviceRoleKey:key,
    sourcePhase:'source-producer',modelBinding:integrated,candidateModelBinding:candidate});
  phase='ACTUAL_SOURCE_SCHEMA_594_MODELS';await verifyDatabase();
  let rows=await rowsRead();assert.equal(rows.operationalRow,null,'One genuine initial activation, never refresh/retry');
  phase='NORMAL_SAVED_B_S';
  const fullRaw=await regular(source,'data/live/conditions.json'),full=frozen.hourly.hydratePrivateConditionsHourly(JSON.parse(fullRaw));
  const saved=path.join(work,'saved594');await noLinks(saved);
  const expected=await frozen.workflow.buildPrivateRuntimeExpectation({repositoryRoot:source,
    targetReferenceAt:full.productionReferenceAt});
  const B=await frozen.bundle.verifyPrivateProductionRuntimeBundle({repositoryRoot:source,privateRoot:saved,
    bundlePath:path.join(saved,'restored'),expected});assert.equal(B.verified,true);
  assert.equal(B.modelBinding.modelBundleSha256,integrated.modelBundleSha256);assert.equal(B.datasetId,full.datasetId);
  assert.equal(B.productionReferenceAt,full.productionReferenceAt);
  // Rebind no bytes: authenticate the normal saved B against the current host.
  for(const file of B.files){const raw=await regular(source,file.relativePath);
    assert.equal(raw.length,file.bytes);assert.equal(sha(raw),file.sha256);}
  const S=await frozen.checkpoint.loadRavScoreContinuationCheckpointForTarget({repositoryRoot:source,
    checkpointPath:path.join(saved,CHECKPOINT),targetReference:full.productionReferenceAt});
  assert.equal(S.loaded,true);assert.equal(S.continuationAvailable,true);assert.equal(S.partCount,673);
  assert.equal(S.sourceDatasetId,full.datasetId);assert.equal(S.checkpointAt,full.productionReferenceAt);
  assert.equal(S.modelBundleSha256,integrated.modelBundleSha256);
  same(S.candidateGRollbackModelBinding,candidate);
  same(prefix.saved594.modelBinding,integrated);same(prefix.saved594.contractHashes,await frozen.workflow.privateRuntimeContractHashes({repositoryRoot:source}));
  assert.equal(prefix.saved594.bundleContentSha256,B.bundleContentSha256);assert.equal(prefix.target,full.productionReferenceAt);
  phase='NORMAL_INTEGRATED_PUBLIC';
  const sourcePublic=await publicEvidence(source,frozen,'integrated',integrated,CURRENT594_HEAD);
  const [startupRaw,detailsRaw,coastalRaw,zonesRaw]=await Promise.all([
    regular(source,'data/live/public-conditions.json'),regular(source,'data/live/public-condition-details.json'),
    regular(source,'data/live/coastal-parts-v2.json'),regular(source,'data/zones.geojson')]);
  const publicAudit=frozen.integratedAudit.auditIntegratedRavScorePublicRuntime(full,{
    startup:JSON.parse(startupRaw),startupText:startupRaw.toString('utf8'),details:JSON.parse(detailsRaw),detailsText:detailsRaw.toString('utf8'),
    coastalPartsText:coastalRaw.toString('utf8'),zoneRegistryText:zonesRaw.toString('utf8'),manifest:sourcePublic.manifest});
  const readiness=await frozen.readiness.buildIntegratedCutoverReadiness(CURRENT594_HEAD,{
    publicImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256});
  const sourceProfile=await document(source,'data/admin/ravscore-profile-selection.json');same(sourceProfile,readiness.centralProfile);
  if(rows.profileRow)same(rows.profileRow.payload,sourceProfile);
  const initial=A.resolveOperationalRavScoreModel(null,{profileRow:rows.profileRow??{version:1,payload:sourceProfile}});
  assert.equal(initial.model,'integrated');assert.equal(initial.centralVersion,0);assert.equal(initial.pending,false);
  phase='NORMAL_CANDIDATE_PREPARATION';
  const stage=path.join(resultRoot,'candidate594');await copyStage(source,stage);
  const targetImpl=await implementation(stage,frozen,'candidate-g',candidate),policy=frozen.rollback.CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY;
  const prepared=frozen.rollback.prepareCandidateGOperationalRollback(full,{expectedDatasetId:full.datasetId,sourceHead:CURRENT594_HEAD,
    mode:policy.executeMode,eventName:policy.manualEventName,ref:policy.mainRef,githubSha:CURRENT594_HEAD,confirmation:policy.executeConfirmation,
    privateBundleContentSha256:B.bundleContentSha256,sourceImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256,
    requestedImplementationClosureSha256:targetImpl.identity.implementationClosureSha256,centralExpectedVersion:0});
  phase='NORMAL_CANDIDATE_PUBLIC_PACK';
  const marker=frozen.pack.privatePublicHourDeliveryMarker(prepared.candidateFull);
  // The normal genuine37 producer removes the source I-bound derived public
  // cache from this new Candidate projection. If a marker is still present,
  // it must match the Candidate C binding or stop before profile insertion/CAS.
  if(marker&&!sameBinding(marker.modelBinding,candidate))fail('CANDIDATE_PUBLIC_PACK_REBUILD_REQUIRED');
  let candidatePack=null;
  if(marker){
    const sourcePack=path.join(source,'.cache/public-hour-delivery.pack');
    await frozen.pack.inspectPrivatePublicHourDeliveryPack({packPath:sourcePack,conditions:prepared.candidateFull});
    candidatePack=path.join(stage,'.cache/public-hour-delivery.pack');await fs.mkdir(path.dirname(candidatePack),{recursive:true,mode:0o700});
    await fs.writeFile(candidatePack,await regular(source,'.cache/public-hour-delivery.pack'),{flag:'wx',mode:0o600});
  }
  const stageMarker=await frozen.installer.installCandidateGRollbackStage({stageRoot:stage,repositoryRoot:source,
    candidateFull:prepared.candidateFull,plan:prepared.plan,expectedSourceHead:CURRENT594_HEAD,expectedDatasetId:full.datasetId});
  const stagePublic=await load(stage,'scripts/public-conditions-lib.mjs');
  await stagePublic.writePublicRuntimeFromFull(prepared.candidateFull,{publicPath:path.join(stage,'data/live/public-conditions.json'),
    detailsPath:path.join(stage,'data/live/public-condition-details.json'),manifestPath:path.join(stage,'data/live/manifest.json'),
    coastalPartsPath:path.join(stage,'data/live/coastal-parts-v2.json'),zoneRegistryPath:path.join(stage,'data/zones.geojson'),
    hourDeliveryPackPath:candidatePack});
  const [cStartup,cDetails,cManifest,cCoastal,cZones]=await Promise.all([
    regular(stage,'data/live/public-conditions.json'),regular(stage,'data/live/public-condition-details.json'),
    regular(stage,'data/live/manifest.json'),regular(stage,'data/live/coastal-parts-v2.json'),regular(stage,'data/zones.geojson')]);
  const candidateAudit=await (await load(stage,'scripts/audit-candidate-g-rollback-public-runtime.mjs')).auditCandidateGRollbackPublicRuntime({
    candidateFull:prepared.candidateFull,plan:prepared.plan,startup:JSON.parse(cStartup),startupText:cStartup.toString('utf8'),
    details:JSON.parse(cDetails),detailsText:cDetails.toString('utf8'),manifest:JSON.parse(cManifest),manifestText:cManifest.toString('utf8'),
    coastalParts:JSON.parse(cCoastal),coastalPartsText:cCoastal.toString('utf8'),zoneRegistry:JSON.parse(cZones),zoneRegistryText:cZones.toString('utf8'),
    stageMarker,expectedSourceHead:CURRENT594_HEAD,expectedDatasetId:full.datasetId});assert.equal(candidateAudit.publicArtifactReady,true);
  const candidatePublic=await publicEvidence(stage,frozen,'candidate-g',candidate,CURRENT594_HEAD);
  // All normal B/S/public/rollback gates above MUST finish before the first
  // write. No ACTIVE row or verification object is synthesized for this step.
  phase='INITIAL_PROFILE_INSERT';
  if(!rows.profileRow){
    const inserted=await request('?on_conflict=document_key&select=document_key,payload,version',{method:'POST',
      headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify({document_key:PROFILE,payload:sourceProfile,updated_by:null})});
    assert(Array.isArray(inserted)&&inserted.length===1);rows=await rowsRead();same(rows.profileRow.payload,sourceProfile);
    assert.equal(rows.operationalRow,null);
  }
  const writeRead=async transition=>{
    const expectedProfile=A.operationalCentralProfileForTransition({transition,currentProfile:rows.profileRow.payload,
      integratedProfile:readiness.centralProfile});
    await A.writeCentralCas(atomicRequest,request,rows,transition,readiness.centralProfile);
    rows=await rowsRead();assert.equal(Number(rows.operationalRow.version),transition.nextVersion);
    same(rows.operationalRow.payload,transition.document);
    same(rows.profileRow.payload,expectedProfile);
  };
  phase='CANDIDATE_BEGIN_CAS';
  await writeRead(A.operationalActivationTransition({action:'begin',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:0,plan:prepared.plan,sourceManifest:sourcePublic.manifest,sourceVerification:sourcePublic.verification,
    requestedManifest:candidatePublic.manifest,sourceDeploymentId:'native-prefix-integrated',deploymentId:'native-prefix-candidate'}));
  phase='CANDIDATE_COMPLETE_CAS';
  await writeRead(A.operationalActivationTransition({action:'complete',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:prepared.plan,publicManifest:candidatePublic.manifest,
    publicVerification:candidatePublic.verification,deploymentId:'native-prefix-candidate'}));
  const activeCandidate=A.resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  assert.equal(activeCandidate.model,'candidate-g');assert.equal(activeCandidate.pending,false);
  phase='NORMAL_INTEGRATED_RETURN_PLAN';
  const returnPolicy=A.RAVSCORE_INTEGRATED_RETURN_POLICY;
  const returnPlan=A.prepareIntegratedOperationalReturn({currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    sourceHead:CURRENT594_HEAD,publicManifest:sourcePublic.manifest,publicAudit,readiness,
    sourceImplementationClosureSha256:candidatePublic.identity.implementationClosureSha256,
    requestedImplementationClosureSha256:sourcePublic.identity.implementationClosureSha256,
    eventName:returnPolicy.manualEventName,ref:returnPolicy.mainRef,githubSha:CURRENT594_HEAD,
    confirmation:returnPolicy.confirmation,initialCutoverRequested:false,initialCutoverConfirmation:''});
  phase='INTEGRATED_RETURN_BEGIN_CAS';
  await writeRead(A.operationalIntegratedReturnTransition({action:'return-begin',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:returnPlan,readiness,publicManifest:sourcePublic.manifest,publicAudit,
    sourceManifest:candidatePublic.manifest,sourceVerification:candidatePublic.verification,
    sourceDeploymentId:'native-prefix-candidate',deploymentId:'native-prefix-integrated-return'}));
  phase='INTEGRATED_RETURN_COMPLETE_CAS';
  await writeRead(A.operationalIntegratedReturnTransition({action:'return-complete',currentRow:rows.operationalRow,currentProfileRow:rows.profileRow,
    expectedVersion:Number(rows.operationalRow.version),plan:returnPlan,readiness,publicManifest:sourcePublic.manifest,publicAudit,
    publicVerification:sourcePublic.verification,deploymentId:'native-prefix-integrated-return'}));
  phase='FINAL_NORMAL_RESOLVER';
  const active=A.resolveOperationalRavScoreModel(rows.operationalRow,{profileRow:rows.profileRow});
  assert.equal(active.model,'integrated');assert.equal(active.pending,false);same(active.modelBinding,integrated);
  await verifyDatabase();
  // Preserve the genuine normal input, both B/S stores and the stage on failure
  // or success. The driver's following mandatory capture MUST query actual PG.
  same(await regular(source,'data/live/conditions.json'),fullRaw);
  same(await regular(work,'transport/current594-prefix-inputs.json'),prefixBytes,'Retained whole594 prefix descriptor');
  assert.equal(git(source,'rev-parse','HEAD'),CURRENT594_HEAD);assert.equal(git(source,'rev-parse','HEAD^{tree}'),CURRENT594_TREE);
  return Object.freeze({kind:'CURRENT_NATIVE_INITIAL_CENTRAL_RESULT',profile:'current594-native-prefix',
    sourceHead:CURRENT594_HEAD,privateBundleSha256:B.bundleContentSha256,candidatePlanSha256:prepared.plan.planSha256,
    candidatePublicManifestSha256:candidatePublic.verification.publicManifestSha256,
    integratedPublicManifestSha256:sourcePublic.verification.publicManifestSha256,
    operationalVersion:Number(rows.operationalRow.version),profileVersion:Number(rows.profileRow.version),
    normalReadback:true,localPublicVerification:true,publicDeploymentProof:false,productionProof:false});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    requireSourceProducerOutput();requireSourceProducerBinding();
    assert.equal(process.argv.length,3);
    assert(['--native-initial-central','--native-current594-initial-central'].includes(process.argv[2]));
    console.log(JSON.stringify(await(process.argv[2]==='--native-current594-initial-central'
      ?initializeCurrent594NativeCentral():initializeOperative585CurrentNativeCentral())));
  }catch(error){
    const fixed=new Set(['CANDIDATE_PUBLIC_PACK_REBUILD_REQUIRED','NONPUBLIC_FETCH']);
    const reason=fixed.has(error?.reason)?error.reason:error?.message==='SOURCE_PRODUCER_UNISSUED'?'SOURCE_UNISSUED':
      error?.code==='ENOENT'?'GENUINE_PREFIX_INPUT_MISSING':
      /not a READY exact continuation/.test(error?.message??'')?'CANDIDATE_NORMAL_CONTINUATION_NOT_READY':
      /lacks exact national 210\/673 readiness/.test(error?.message??'')?'CANDIDATE_NORMAL_NATIONAL_NOT_READY':'NORMAL_INITIALIZATION_REFUSED';
    const sqlstate=String(error?.message??'').match(/HTTP [0-9]{3} ([0-9A-Z]{5})(?:\s|$)/)?.[1]??'UNKNOWN';
    console.log(JSON.stringify({kind:'CURRENT_SOURCE_NATIVE_FIRST_FAILURE',phase:'CENTRAL_ACTIVATION',reason,
      sqlstate,route:phase.includes('CAS')?'OPERATIONAL_CAS':'NONE',privatePayloadIncluded:false}));process.exitCode=1;
  }
}
