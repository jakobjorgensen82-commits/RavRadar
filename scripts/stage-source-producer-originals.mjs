// Fixed585 -> SOURCE original staging, not SQL/state/origin admission. The
// legacy585 staging caller remains unchanged. Use normal selected storage,
// including the already delivered R2 forwarding; metadata still uses request.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SOURCE_PRODUCER_BEFORE as OLD,requireSourceProducerBinding,requireSourceProducerOutput}
  from './lib/source-producer-successor-source.mjs';
import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';
import {withAuthenticated585PredecessorSource} from './check-source-producer-predecessor-source.mjs';
import {createProtectedPrivateRuntimeClients,describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime} from './protected-private-production-runtime.mjs';
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

export async function stageSourceProducerOriginals(){
  requireSourceProducerOutput(); // FIRST, before arguments, environment, files or clients.
  assert.equal(arguments.length,0);
  failureStage='CALLER';assertSourceProducerCodeOnlyCaller(process.env);
  assert.equal(process.env.RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE,'true');
  const next=requireSourceProducerBinding();
  failureStage='SOURCE_HEAD';
  const gitEnvironment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  const read=args=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:65536,env:gitEnvironment}).trim();
  const head=read(['rev-parse','HEAD^{commit}']),remote=read(['rev-parse','origin/main^{commit}']);
  assert.equal(head,process.env.GITHUB_SHA);assert.equal(remote,head);
  const envPath=absoluteEnvironmentPath('GITHUB_ENV');
  failureStage='CLIENTS';
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients();
  failureStage='CURRENT_DESCRIPTOR';
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request});
  assert.equal(selected.productionReferenceAt,process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,
    'Metadata code-only delivery retains the exact CURRENT original H0');
  failureStage='CURRENT_FAMILY';
  const oldI=selected.modelBinding.modelBundleSha256===OLD.I;
  const oldT=selected.contractHashes.continuationStateContractSha256===OLD.T;
  const newI=selected.modelBinding.modelBundleSha256===next.I;
  const newT=selected.contractHashes.continuationStateContractSha256===next.T;
  assert.equal(oldI,oldT);assert.equal(newI,newT);assert(oldI!==newI,'Exactly OLD585 or already-current SOURCE family');
  if(newI){
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
  await withAuthenticated585PredecessorSource(async frozenRoot=>{
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
  console.log('Exact immutable CURRENT585 restored through genuine normal585 source; no origin or remote write.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{requireSourceProducerOutput();assert.equal(process.argv.length,2);await stageSourceProducerOriginals();}
  catch{console.error('SOURCE_PRODUCER_ORIGINAL_STAGE_REFUSED stage='+failureStage);process.exitCode=1;}
}
