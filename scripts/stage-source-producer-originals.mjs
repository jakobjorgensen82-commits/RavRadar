// Fixed598 -> SOURCE original staging, not SQL/state/origin admission. The
// legacy585 staging caller remains unchanged. Use normal selected storage,
// including the already delivered R2 forwarding; metadata still uses request.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SOURCE_PRODUCER_BEFORE as OLD,requireSourceProducerBinding,requireSourceProducerOutput,sourceProducerReferenceHour}
  from './lib/source-producer-after597-runtime-family.mjs';
import {assertSourceProducerCodeOnlyCaller,assertSourceProducerSavedWeatherCaller}
  from './select-source-producer-code-only-source.mjs';
import {withSource598CodeParent,assertSource598CodeSourceSelected} from './check-assistant-later-h0-predecessor-source.mjs';
import {createProtectedPrivateRuntimeClients,describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime,pinCurrentProtectedPrivateProductionRuntime}
  from './protected-private-production-runtime.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const identity=['sourceHead','datasetId','productionReferenceAt','generatedAt','bundleContentSha256','modelBinding','contractHashes'];
let failureStage='OUTPUT';
async function noLinks(file){let at=path.parse(file).root;for(const part of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink(),'No aliased original destination');}}
async function absent(file){await assert.rejects(fs.lstat(file),{code:'ENOENT'});}
function absoluteEnvironmentPath(name){
  const value=process.env[name];assert(typeof value==='string'&&path.isAbsolute(value),name+' requires an absolute destination');
  assert(!/[\r\n\0]/.test(value));return path.resolve(value);
}

// Ren klassifikation til den normale kalder; dette giver ingen DATA-/SOURCE-admission.
// Den faktiske staging kræver stadig udstedt SOURCE først og derefter den fulde faste kildevært.
export function sourceProducerOriginalStageFamily(selected,next){
  assert.equal(arguments.length,2);
  assert.match(next?.I??'',/^[a-f0-9]{64}$/);assert.match(next?.T??'',/^[a-f0-9]{64}$/);
  assert.notEqual(next.I,OLD.I);assert.notEqual(next.T,OLD.T);
  const oldI=selected?.modelBinding?.modelBundleSha256===OLD.I;
  const oldT=selected?.contractHashes?.continuationStateContractSha256===OLD.T;
  const newI=selected?.modelBinding?.modelBundleSha256===next.I;
  const newT=selected?.contractHashes?.continuationStateContractSha256===next.T;
  assert.equal(oldI,oldT);assert.equal(newI,newT);
  assert(oldI!==newI,'Exactly genuine598 or already-current SOURCE family');
  return oldI?'predecessor':'current';
}

// Route selection only: fresh CURRENT metadata is not SQL, B/S or producer admission.
// The ordinary caller still executes every source, database and owner guard.
export async function selectInstalledSourceNormalRoute(options){
  requireSourceProducerOutput(); // FIRST: no metadata IO before actual issued output.
  const next=requireSourceProducerBinding();
  assert.equal(arguments.length,1,'SOURCE_ROUTE_ARGUMENTS');
  assert(options&&Object.getPrototypeOf(options)===Object.prototype,'SOURCE_ROUTE_OPTIONS');
  assert.deepEqual(Object.keys(options).sort(),['documentRequest','operational','request']);
  const {request,operational,documentRequest}=options;
  assert(request&&typeof request==='object'&&!Array.isArray(request),'SOURCE_ROUTE_REQUEST_INVALID');
  const known=['source_normal_producer','ordinary','production_target_hour','force'];
  assert.deepEqual(Object.keys(request).sort(),known.sort(),'SOURCE_ROUTE_REQUEST_KEYS');
  assert.equal(typeof request.source_normal_producer,'boolean','SOURCE_ROUTE_SELECTION_UNKNOWN');
  assert.equal(typeof request.ordinary,'boolean','SOURCE_ROUTE_PROJECTION_INVALID');
  assert.equal(typeof request.force,'boolean','SOURCE_ROUTE_FORCE_INVALID');
  assert(/^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/.test(request.production_target_hour),'SOURCE_ROUTE_TARGET_INVALID');
  const time=Date.parse(request.production_target_hour);
  assert(Number.isFinite(time)&&new Date(time).toISOString()===request.production_target_hour.replace(/(?<!\.000)Z$/,'.000Z'),'SOURCE_ROUTE_TARGET_INVALID');
  const {ordinary}=request;
  if(request.source_normal_producer)assert(ordinary,'SOURCE_ROUTE_MIXED_REQUEST');
  assert.equal(typeof documentRequest,'function','SOURCE_ROUTE_REQUESTER_REQUIRED');
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request:documentRequest});
  const family=sourceProducerOriginalStageFamily(selected,next);
  assert(same(selected.modelBinding,operational?.modelBinding),'SOURCE_ROUTE_CENTRAL_BINDING_CHANGED');
  if(family==='predecessor'){
    // SOURCE code is not a legacy598 executor during the controlled install.
    assert(!ordinary&&!request.source_normal_producer,'SOURCE_ROUTE_NOT_INSTALLED');
    return 'legacy'; // Existing special-flow guards remain authoritative.
  }
  assert(ordinary,'SOURCE_ROUTE_INSTALLED_SPECIAL_UNSUPPORTED');
  assert(operational.model==='integrated'&&operational.status==='INTEGRATED_ACTIVE'
    &&operational.pending===false&&operational.bindingCurrent===true
    &&operational.initialCutoverRequired===false&&operational.legacySourceRequired===false
    &&Number.isSafeInteger(operational.centralVersion)&&operational.centralVersion>0,'SOURCE_ROUTE_OPERATIONAL_NOT_ACTIVE');
  assert(same(selected.modelBinding,ravScoreModelBinding()),'SOURCE_ROUTE_MODEL_BINDING');
  assert(same(selected.contractHashes,await privateRuntimeContractHashes()),'SOURCE_ROUTE_CONTRACT_BINDING');
  return 'source';
}

export async function stageSourceProducerOriginals(){
  requireSourceProducerOutput(); // FIRST, before arguments, environment, files or clients.
  const savedWeather=process.env.RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER==='true';
  if(!savedWeather){
    // Den særskilte598-CODE-kildevært skal være valgt; gammel593/591-DATA bruges aldrig som594.
    failureStage='PARENT_SOURCE';assertSource598CodeSourceSelected();
    assert.equal(OLD.version,'20261105064515','SOURCE_ORIGINAL_DATA_PARENT_UNAVAILABLE');
  }
  assert.equal(arguments.length,0);
  failureStage='CALLER';
  const assertCaller=savedWeather?assertSourceProducerSavedWeatherCaller:assertSourceProducerCodeOnlyCaller;
  assertCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  const next=requireSourceProducerBinding();
  failureStage='SOURCE_HEAD';
  const gitEnvironment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  const read=args=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:{...gitEnvironment,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}}).trim();
  const head=read(['rev-parse','HEAD^{commit}']),remote=read(['rev-parse','origin/main^{commit}']);
  assert.equal(head,process.env.GITHUB_SHA);assert.equal(remote,head);
  const envPath=absoluteEnvironmentPath('GITHUB_ENV');
  failureStage='CLIENTS';
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients();
  failureStage='CURRENT_DESCRIPTOR';
  const savedPin=savedWeather?await pinCurrentProtectedPrivateProductionRuntime({request}):null;
  const selected=savedPin?.descriptor??await describeCurrentProtectedPrivateProductionRuntime({request});
  assert.equal(selected.productionReferenceAt,sourceProducerReferenceHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR),
    'Provider-free delivery requires the exact CURRENT original H0');
  failureStage='CURRENT_FAMILY';
  const selectedFamily=sourceProducerOriginalStageFamily(selected,next);
  if(savedWeather){
    failureStage='SAVED_CURRENT_PIN';
    assert.equal(selectedFamily,'current','SOURCE_SAVED_WEATHER_REQUIRES_CURRENT_FAMILY');
    assert(same(selected.modelBinding,ravScoreModelBinding()));
    assert(same(selected.contractHashes,await privateRuntimeContractHashes()));
    const operationRoot=absoluteEnvironmentPath('RAVRADAR_OPERATIONAL_WORK');
    const described=path.join(operationRoot,'current-private-runtime-source.json');
    await noLinks(described);
    const describedStat=await fs.lstat(described);
    assert(describedStat.isFile()&&describedStat.size<=16*1024,'SOURCE_SAVED_WEATHER_DESCRIPTOR_FILE');
    assert(same(JSON.parse(await fs.readFile(described,'utf8')),selected),'SOURCE_SAVED_WEATHER_DESCRIPTOR_CHANGED');
    read(['merge-base','--is-ancestor',selected.sourceHead,head]);
    const pinPath=path.join(operationRoot,'source-saved-current-pin.json');
    assertCaller(process.env);
    await fs.writeFile(pinPath,JSON.stringify(savedPin)+'\n',{flag:'wx',mode:0o600});
    await fs.appendFile(envPath,'RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY=current\n');
    console.log('Authenticated SOURCE CURRENT pin saved for provider-free recovery.');return;
  }
  if(selectedFamily==='current'){
    failureStage='CURRENT_REENTRY';
    assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_PHASE,'installed');
    assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN,'false');
    assert(same(selected.modelBinding,ravScoreModelBinding()));
    assert(same(selected.contractHashes,await privateRuntimeContractHashes()));
    // Normal protected current restore and B-before-S reconciliation must
    // still follow. This flag grants no new origin, SQL or state authority.
    await fs.appendFile(envPath,'RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY=current\n');
    console.log('Already-current SOURCE metadata family selected; no predecessor restore or origin issuance.');return;
  }
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_PHASE,'before');
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN,'true');
  failureStage='PRIVATE_DESTINATION';
  const privateRoot=absoluteEnvironmentPath('RAVRADAR_PREDECESSOR_PRIVATE_ROOT');
  const bundlePath=absoluteEnvironmentPath('RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE');
  const outputPath=absoluteEnvironmentPath('RAVRADAR_PREDECESSOR_PRIVATE_RESTORE');
  assert.equal(path.dirname(bundlePath),privateRoot);assert.equal(path.dirname(outputPath),privateRoot);
  const relative=path.relative(ROOT,privateRoot);assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative));
  const operationRoot=absoluteEnvironmentPath('RAVRADAR_OPERATIONAL_WORK');await noLinks(operationRoot);
  const descriptorPath=path.join(operationRoot,'target-private-runtime-source.json');await absent(descriptorPath);
  await absent(privateRoot);await noLinks(path.dirname(privateRoot));await fs.mkdir(privateRoot);
  failureStage='FROZEN_SOURCE';
  await withSource598CodeParent(async frozenRoot=>{
    failureStage='FROZEN_CONTRACT';
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);
    const [protectedB,bundle,workflow,model]=await Promise.all([load('scripts/protected-private-production-runtime.mjs'),
      load('scripts/private-production-runtime-bundle.mjs'),load('scripts/private-production-runtime-workflow.mjs'),
      load('js/core/ravscore-model-contract.js')]);
    assert(same(selected.modelBinding,model.ravScoreModelBinding()));
    assert(same(selected.contractHashes,await workflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot})));
    const expected={modelBinding:selected.modelBinding,contractHashes:selected.contractHashes,datasetId:selected.datasetId,
      productionReferenceAt:selected.productionReferenceAt,bundleContentSha256:selected.bundleContentSha256,
      targetReferenceAt:selected.productionReferenceAt,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt};
    failureStage='ORIGINAL_RESTORE';
    const restored=await protectedB.restoreProtectedPrivateProductionRuntime({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,request,storage});
    assert.equal(restored.restored,true);assert.equal(restored.rollbackSelected,false,'No previous B fallback');
    assert.equal(restored.bundleContentSha256,selected.bundleContentSha256);
    failureStage='BUNDLE_RESTORE';
    await bundle.restorePrivateProductionRuntimeBundle({privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,outputPath,
      targetReferenceAt:selected.productionReferenceAt,minimumReferenceAt:selected.productionReferenceAt,minimumGeneratedAt:selected.generatedAt});
    failureStage='CURRENT_READBACK';
    const fresh=await describeCurrentProtectedPrivateProductionRuntime({request});assert(same(fresh,selected),'CURRENT changed during restore');
    const target=await describeTargetProtectedPrivateProductionRuntime({request,targetReferenceAt:selected.productionReferenceAt,
      datasetId:selected.datasetId,bundleContentSha256:selected.bundleContentSha256});
    for(const key of identity)assert(same(target[key],selected[key]),'Exact target identity');
    failureStage='DESCRIPTOR_SAVE';
    await fs.writeFile(descriptorPath,JSON.stringify(target)+'\n',{flag:'wx',mode:0o600});
  });
  failureStage='SELECTED_FAMILY_SAVE';
  await fs.appendFile(envPath,'RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY=predecessor\n');
  console.log('Den præcise CURRENT598-original er gendannet gennem den faste598-CODE-kilde; ingen origin eller ekstern skrivning.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{requireSourceProducerOutput();assert.equal(process.argv.length,2);await stageSourceProducerOriginals();}
  catch{console.error('SOURCE_PRODUCER_ORIGINAL_STAGE_REFUSED stage='+failureStage);process.exitCode=1;}
}
