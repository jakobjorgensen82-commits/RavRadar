// Fixed CURRENT-family selection and normal immutable584 restore. This does
// not issue an origin, rewrite a pointer, install SQL, or choose older B.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ACCOUNT_STATISTICS_ASSISTANT_BEFORE as OLD,requireAccountStatisticsAssistantBinding,
  requireAccountStatisticsAssistantOutput} from './lib/account-statistics-assistant-successor-source.mjs';
import {assertAccountStatisticsAssistantPrewriteCaller} from './account-statistics-assistant-prewrite.mjs';
import {withAuthenticated584PredecessorSource} from './check-account-statistics-assistant-predecessor-source.mjs';
import {createProtectedPrivateRuntimeClients,describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime} from './protected-private-production-runtime.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const identity=['sourceHead','datasetId','productionReferenceAt','generatedAt','bundleContentSha256','modelBinding','contractHashes'];
async function noLinks(file){let at=path.parse(file).root;for(const part of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink(),'No aliased original destination');}}
async function absent(file){await assert.rejects(fs.lstat(file),{code:'ENOENT'});}
// Fixed stages only: never log a descriptor, credential, path or raw exception.
let failureStage='OUTPUT';
async function main(){
  requireAccountStatisticsAssistantOutput(); // Before arguments, files, clients or environment authority.
  failureStage='CALLER';
  assert.equal(process.argv.length,2);assertAccountStatisticsAssistantPrewriteCaller(process.env);
  assert.equal(process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SOURCE_ACTIVE,'true');
  const next=requireAccountStatisticsAssistantBinding();
  failureStage='SOURCE_HEAD';
  const head=execFileSync('git',['rev-parse','HEAD^{commit}'],{cwd:ROOT,encoding:'utf8'}).trim();
  const remote=execFileSync('git',['rev-parse','origin/main^{commit}'],{cwd:ROOT,encoding:'utf8'}).trim();
  assert.equal(head,process.env.GITHUB_SHA);assert.equal(remote,head);
  const envPath=process.env.GITHUB_ENV;assert(typeof envPath==='string'&&envPath.length>0);
  failureStage='CLIENTS';
  const {documentRequest:request,storage}=createProtectedPrivateRuntimeClients();
  failureStage='CURRENT_DESCRIPTOR';
  const selected=await describeCurrentProtectedPrivateProductionRuntime({request});
  assert.equal(selected.productionReferenceAt,process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,
    'Metadata code-only delivery retains the exact public/current original H0');
  const oldI=selected.modelBinding.modelBundleSha256===OLD.I;
  failureStage='CURRENT_FAMILY';
  const oldT=selected.contractHashes.continuationStateContractSha256===OLD.T;
  const newI=selected.modelBinding.modelBundleSha256===next.I;
  const newT=selected.contractHashes.continuationStateContractSha256===next.T;
  assert.equal(oldI,oldT);assert.equal(newI,newT);assert(oldI!==newI,'Exactly OLD584 or already-current585 family');
  if(newI){
    failureStage='CURRENT_REENTRY';
    assert.equal(process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE,'installed');
    assert.equal(process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN,'false');
    assert(same(selected.modelBinding,ravScoreModelBinding()));
    assert(same(selected.contractHashes,await privateRuntimeContractHashes()));
    // Normal current restore/install plus B-before-S reconcile must follow.
    // No frozen584 restore, metadata issuer or consumed SQL plan is selected.
    await fs.appendFile(envPath,'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CURRENT_FAMILY=current\n');
    console.log('Already-current metadata family selected; no predecessor restore or origin issuance.');return;
  }
  failureStage='PRIVATE_DESTINATION';
  const privateRoot=path.resolve(process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT);
  const bundlePath=path.resolve(process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE);
  const outputPath=path.resolve(process.env.RAVRADAR_PREDECESSOR_PRIVATE_RESTORE);
  assert(path.isAbsolute(process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT));
  assert.equal(path.dirname(bundlePath),privateRoot);assert.equal(path.dirname(outputPath),privateRoot);
  const relative=path.relative(ROOT,privateRoot);assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative));
  await absent(privateRoot);await noLinks(path.dirname(privateRoot));await fs.mkdir(privateRoot);
  const operationRoot=path.resolve(process.env.RAVRADAR_OPERATIONAL_WORK);await noLinks(operationRoot);
  const descriptorPath=path.join(operationRoot,'target-private-runtime-source.json');await absent(descriptorPath);
  failureStage='FROZEN_SOURCE';
  await withAuthenticated584PredecessorSource(async frozenRoot=>{
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
  await fs.appendFile(envPath,'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CURRENT_FAMILY=predecessor\n');
  console.log('Exact immutable CURRENT584 restored through genuine normal584 source; no origin or remote write.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main().catch(()=>{
  console.error('ACCOUNT_STATISTICS_ASSISTANT_ORIGINAL_STAGE_REFUSED stage='+failureStage);process.exitCode=1;
});
