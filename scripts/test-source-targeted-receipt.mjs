import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-targeted-receipt-'));
const owned=fs.lstatSync(root,{bigint:true}),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const git=(args,options={})=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['pipe','pipe','pipe'],...options});
const write=(name,body)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body);};
const commit=message=>{git(['add','--all']);git(['commit','-qm',message]);return git(['rev-parse','HEAD']).trim();};
const files=['package.json','scripts/validate-source-once.mjs','scripts/source-impact-plan.mjs',
  'scripts/source-impact-git-diff.mjs','scripts/source-targeted-receipt.mjs','scripts/lib/source-tree-content.mjs',
  'js/ui/about-i18n.js','js/ui/about-explainer-i18n.js','js/ui/learn-i18n.js',
  'js/ui/learn-i18n-de.js','js/ui/learn-i18n-en.js'];let passed=0;
try{
  git(['init','-q']);git(['config','user.name','Synthetic targeted test']);git(['config','user.email','fixture@example.invalid']);
  git(['config','core.autocrlf','false']);for(const file of files)write(file,fs.readFileSync(path.join(SOURCE,file)));
  const base=commit('synthetic complete baseline');
  const about=fs.readFileSync(path.join(root,'js/ui/about-i18n.js'),'utf8');
  write('js/ui/about-i18n.js',about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'"));
  const head=commit('synthetic about text');
  const {planSourceImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-git-diff.mjs')).href);
  const {sourceTreeContentSha256}=await import(pathToFileURL(path.join(root,'scripts/lib/source-tree-content.mjs')).href);
  const {buildTargetedSourceReceipt:build,validateTargetedSourceReceipt:validate,targetedSourceArtifactName:name}=
    await import(pathToFileURL(path.join(root,'scripts/source-targeted-receipt.mjs')).href);
  const content=ref=>sourceTreeContentSha256(ref,{git:(args,options)=>git(args,{...options,encoding:'buffer'})});
  const current={repository:'fixture/RavRadar',head,sourceTreeSha256:content(head),pullRequest:2,runId:2,runAttempt:1,jobId:20};
  // Synthetic reference DATA: no GitHub qualification or actual product target
  // is claimed. ROOT must provide its live FULL result in the normal workflow.
  const fullBaseline={schemaVersion:1,kind:'RAVRADAR_SOURCE_IMPACT_FULL_BASELINE_V1',scope:'FULL_SOURCE',
    repository:current.repository,mergeCommit:base,producerHead:base,sourceTreeSha256:content(base),
    pullRequest:1,runId:1,runAttempt:1,jobId:10,finalArtifactId:11,
    finalArtifactDigest:'sha256:'+sha('synthetic final ZIP'),finalProofSha256:sha('synthetic final JSON'),
    nativeArtifactId:12,nativeArtifactDigest:'sha256:'+sha('synthetic native ZIP'),
    gitTree:git(['rev-parse',base+'^{tree}']).trim(),historicalNationalScope:'HISTORICAL_584_NATIONAL_ONLY',providerOrProductionProof:false};
  const gitPlan=plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
  const commandResults=gitPlan.plan.commands.map(command=>({phase:'check',command,elapsedMs:1,outcome:'PASS'}));
  const input={current,fullBaseline,gitPlan,commandResults},receipt=build(input),accepted=validate(receipt,input);
  assert.equal(accepted.validStructure,true);assert.equal(accepted.deliveryAuthority,false);
  assert.equal(receipt.database.executed,false);assert.equal(receipt.national.executed,false);
  assert.equal(receipt.database.status,'NOT_APPLICABLE');assert.equal(receipt.national.status,'NOT_APPLICABLE');
  assert.equal(receipt.fullSourceValidationClaimed,false);assert.equal(receipt.baselineQualifiedByThisModule,false);
  assert.equal(receipt.artifactName,name({pullRequest:current.pullRequest,head,sourceTreeSha256:current.sourceTreeSha256}));
  assert(!receipt.artifactName.startsWith('ravradar-source-validation-v2-'));
  assert(!Object.hasOwn(receipt,'nativePostgres'));assert(!Object.hasOwn(receipt,'historical584National'));passed++;
  assert.throws(()=>name(current),/SOURCE_TARGETED_SHAPE/);passed++;
  const badInput=mutate=>{const clone=structuredClone(input);mutate(clone);assert.throws(()=>build(clone),/^Error: SOURCE_TARGETED_/);passed++;};
  badInput(value=>{value.fullBaseline.kind='RAVRADAR_SOURCE_TARGETED_RECEIPT_V1';});
  badInput(value=>{value.fullBaseline.verified=true;});
  badInput(value=>{value.fullBaseline.providerOrProductionProof=true;});
  badInput(value=>{value.fullBaseline.runId=current.runId;});
  badInput(value=>{value.gitPlan.git.rawInventorySha256='0'.repeat(64);});
  badInput(value=>{value.gitPlan.inventory=[];});
  badInput(value=>{value.gitPlan.plan.commands=[];});
  badInput(value=>{value.commandResults.pop();});
  badInput(value=>{value.commandResults[0].outcome='FAIL';});
  badInput(value=>{value.commandResults[0].outcome='SKIPPED';});
  badInput(value=>{value.commandResults.reverse();});
  badInput(value=>{value.commandResults[0].elapsedMs=-1;});
  badInput(value=>{value.commandResults[0].stdout='unapproved payload';});
  for(const mutate of [value=>{value.database.executed=true;},value=>{value.national.status='EXECUTED';},
    value=>{value.deliveryAuthority=true;},value=>{value.artifactName='ravradar-source-validation-v2-false';},
    value=>{value.current.head=base;},value=>{value.baselineReference.finalProofSha256='f'.repeat(64);}]){
    const clone=structuredClone(receipt);mutate(clone);assert.throws(()=>validate(clone,input),/^Error: SOURCE_TARGETED_/);passed++;
  }
  const otherFull=structuredClone(input);otherFull.fullBaseline.gitTree='f'.repeat(40);
  assert.throws(()=>validate(receipt,otherFull),/RECEIPT_MISMATCH/);passed++;
  const merge=git(['commit-tree',git(['rev-parse',head+'^{tree}']).trim(),'-p',head,'-m','synthetic same-tree main wrapper']).trim();
  git(['update-ref','HEAD',merge]);assert.equal(content(merge),current.sourceTreeSha256);
  const onMain={...input,gitPlan:plan({baselineCommit:base,candidateCommit:merge,expectedHead:merge})};
  assert.equal(validate(receipt,onMain).validStructure,true);
  assert.equal(validate(receipt,onMain).producerMergeIdentityVerified,false);
  assert.throws(()=>build(input),/COMPLETE_GIT_PLAN_MISMATCH/);passed++;
  write('js/core/unreviewed-state.js','export const changed=true;\n');const protectedHead=commit('synthetic protected change');
  const changed=structuredClone(input);changed.current.head=protectedHead;changed.current.sourceTreeSha256=content(protectedHead);
  changed.gitPlan=plan({baselineCommit:base,candidateCommit:protectedHead,expectedHead:protectedHead});
  assert.equal(changed.gitPlan.plan.selection,'FULL');assert.throws(()=>build(changed),/TARGETED_COMPLETE_DIFF_REQUIRED/);passed++;
}finally{
  assert.equal(path.dirname(fs.realpathSync(root)),temporary);const actual=fs.lstatSync(root,{bigint:true});
  assert.equal(actual.dev,owned.dev);assert.equal(actual.ino,owned.ino);assert.equal(actual.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'PRIVATE_TARGETED_RECEIPT_STRUCTURE_TARGET',passed,failed:0,
  realLocalGitDiff:true,syntheticCommandObservations:true,productSourceCommandsExecuted:0,
  liveGitHubBaselineVerified:false,nativeSqlExecuted:false,deliveryAuthority:false,production:false}));
