// Normal current585/SOURCE caller checks. Historical584 oracles run separately,
// unchanged. A synthetic migration-list response is not an installed database,
// and these boundary checks do not authenticate a real original B/S pair.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import './test-trip-aggregate-month-rollover.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import * as SOURCE from './lib/source-producer-successor-source.mjs';
import './test-source-producer-code-only-source.mjs';
import './test-source-producer-prewrite.mjs';
import {exactRelativeModuleSpecifiers} from './lib/static-module-closure.mjs';
import {checkpointMetadataCasBlock} from './sync-ravscore-model-binding.mjs';
import {fileURLToPath} from 'node:url';
import {ravScoreModelBinding as integratedBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {accountStatisticsAssistantRequiredMigrations} from './integrated-cutover-readiness.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BEFORE as OLD, requireAccountStatisticsAssistantBinding,
  requireAccountStatisticsAssistantOutput, accountStatisticsAssistantMigration,
  readAccountStatisticsAssistantCanonicalSource,ACCOUNT_STATISTICS_ASSISTANT_ALIASES,
  accountStatisticsAssistantDefinition} from './lib/account-statistics-assistant-successor-source.mjs';
import {assertAccountStatisticsAssistantPlanCaller, selectAccountStatisticsAssistantRoute,
  verifyAccountStatisticsAssistantPlan} from './verify-account-statistics-assistant-plan.mjs';
import {assertAccountStatisticsAssistantPrewriteCaller,
  verifyAccountStatisticsAssistantPrewritePreservation} from './account-statistics-assistant-prewrite.mjs';
import {prepareAccountStatisticsAssistantRuntimeTransition,
  restoreAndPrepareAccountStatisticsAssistantRuntimeTransition,
  assertAccountStatisticsAssistantRuntimeTransitionPrepared} from './account-statistics-assistant-runtime-transition.mjs';
import {assertAuthenticatedFrozen584Snapshot} from './lib/authenticated-frozen584-predecessor.mjs';
import {buildEstablishedNativeCurrent584MetadataAttestation,
  assertEstablishedNativeCurrent584MetadataCheckpoint} from './lib/established-native-current-origin.mjs';

// No fake issued tuple and no early-UNISSUED branch that could qualify585.
const sourceIssued=SOURCE.SOURCE_PRODUCER_BINDING!==null;
if(sourceIssued){SOURCE.requireSourceProducerBinding();SOURCE.requireSourceProducerOutput();}
else assert.equal(SOURCE.SOURCE_PRODUCER_OUTPUT,null,'No partial SOURCE issuance');
const NEXT=requireAccountStatisticsAssistantBinding();
requireAccountStatisticsAssistantOutput();
const descriptor=accountStatisticsAssistantMigration();
const required=accountStatisticsAssistantRequiredMigrations();
const migrationsDirectory=fileURLToPath(new URL('../supabase/migrations',import.meta.url));
const environment=(installed=false)=>({
  GITHUB_WORKFLOW:'Deploy RavRadar code-only repair', GITHUB_EVENT_NAME:'workflow_dispatch',
  GITHUB_REF:'refs/heads/main', GITHUB_RUN_ATTEMPT:'1', GITHUB_RUN_ID:'1', GITHUB_SHA:'a'.repeat(40),
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:installed?'false':'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE:installed?'installed':'before',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_RUN_ID:'',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SAVED_WEATHER:'false',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_WRITER_ACTIVE:'false',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_GATE_RESULT:'success',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_ORIGINALS_VERIFIED:'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_NOLOSS_VERIFIED:'true',
  RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PREWRITE_VERIFIED:'true',
});
const list=(installed=false)=>'Local | Remote | Time (UTC)\n'+required.map(row=>
  `${row.version} | ${installed||row.version!==descriptor.version?row.version:''} | synthetic-caller-response`).join('\n');
const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
  +descriptor.filename+'\nFinished supabase db push.';
const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
const plan=(installed=false)=>({phase:installed?'installed':'before',migrationListText:list(installed),
  dryRunText:installed?noop:dry,migrationsDirectory,environment:environment(installed)});

test('current585 model-import guard admits only the whole reviewed first-raw-error loader',async()=>{
  const file='scripts/check-account-statistics-assistant-predecessor-source.mjs';
  const source=(await fs.readFile(new URL('./check-account-statistics-assistant-predecessor-source.mjs',import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source),'10ccdee12b112bcc323689c331a7bb068b7f47ae1ac60d535caf2d4523f465c1');
  const imports=modelSourceRelativeModuleSpecifiers(source,file);
  assert(Object.isFrozen(imports));assert.deepEqual(imports,[]);
  const once=(text,before,after)=>{assert.equal(text.split(before).length,2);return text.replace(before,()=>after);};
  let predecessor=once(source,'let result,first,hasFirst=false;','let result,first;');
  predecessor=once(predecessor,'}catch(error){first=error;hasFirst=true;}','}catch(error){first=error;}');
  predecessor=once(predecessor,'}catch(error){if(!hasFirst){first=error;hasFirst=true;}}\n  if(hasFirst)throw first;',
    '}catch(error){if(!first)first=error;}\n  if(first)throw first;');
  assert.equal(hash(predecessor),'44ed717ec5aa7df32f2fb5603c50091aa53878df57dc23e834c67ba00185a4ac');
  for(const changed of [source+'\n// changed byte\n',source+"\nimport './hidden.mjs';\n",predecessor])
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
});

test('actual585 bindings and canonical source are distinct from preserved584',async()=>{
  assert.equal(descriptor.version,'20261019100000');
  assert.equal(required.length,54);assert.equal(required.at(-2).version,OLD.version);
  assert.equal(required.at(-1).version,descriptor.version);
  if(!sourceIssued){
    assert.equal(integratedBinding().modelBundleSha256,NEXT.I);
    assert.equal(candidateBinding().modelBundleSha256,NEXT.C);
    assert.equal((await privateRuntimeContractHashes()).continuationStateContractSha256,NEXT.T);
  }else{
    const current=SOURCE.requireSourceProducerBinding();SOURCE.requireSourceProducerOutput();
    assert.equal(integratedBinding().modelBundleSha256,current.I);
    assert.equal(candidateBinding().modelBundleSha256,current.C);
    assert.equal((await privateRuntimeContractHashes()).continuationStateContractSha256,current.T);
    for(const key of ['C','I','T'])assert.equal(NEXT[key],SOURCE.SOURCE_PRODUCER_BEFORE[key],
      'The unchanged585 binding remains a real predecessor, never retagged current');
  }
  for(const key of ['C','I','T'])assert.notEqual(NEXT[key],OLD[key]);
  const source=await readAccountStatisticsAssistantCanonicalSource();
  assert.equal(source.admission,'NO_ADMISSION');
  assert.equal(source.migration.version,descriptor.version);
});

if(sourceIssued)test('actual issued SOURCE canonical SQL and physical fixedpoint retain genuine585',async()=>{
  const current=SOURCE.requireSourceProducerBinding(),pins=SOURCE.requireSourceProducerOutput();
  const {buildSourceProducerBindingSuccessor}=await import('./build-source-producer-successor.mjs');
  const fixed=await buildSourceProducerBindingSuccessor();
  assert.deepEqual({migrationSha256:fixed.migrationSha256,canonicalSha256:fixed.afterCanonicalSha256,
    checkpointContractSha256:fixed.checkpointContractSha256,tripBindingPolicySha256:fixed.tripBindingPolicySha256},pins);
  assert.deepEqual(await fs.readFile(new URL('../supabase/migrations/'+SOURCE.sourceProducerMigration().filename,import.meta.url)),
    Buffer.from(fixed.migration),'Actual generated SQL bytes, not a reported hash');
  assert.equal(fixed.wholeCanonicalInverse,true);assert.equal(fixed.sameH0MetadataOnly,true);
  assert.equal(fixed.numericalSqlRulesChanged,false);assert.equal(fixed.installationPerformed,false);
  assert.equal(fixed.sqlExecuted,false);assert.equal(current.version,SOURCE.sourceProducerMigration().version);
});

test('normal585 plan distinguishes sole pending migration from installed reentry',async()=>{
  assert.equal(selectAccountStatisticsAssistantRoute({migrationListText:list(),environment:environment()}),'before');
  assert.deepEqual((await verifyAccountStatisticsAssistantPlan(plan())).pendingVersions,[descriptor.version]);
  assert.equal(selectAccountStatisticsAssistantRoute({migrationListText:list(true),environment:environment(true)}),'installed');
  assert.deepEqual((await verifyAccountStatisticsAssistantPlan(plan(true))).pendingVersions,[]);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(true),environment:environment()}),
    /ACCOUNT_STATISTICS_ASSISTANT_NO_CONSUMED_GRANT_REPLAY/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(),environment:environment(true)}),
    /ACCOUNT_STATISTICS_ASSISTANT_NO_CONSUMED_GRANT_REPLAY/);
});

test('normal585 caller rejects missing584, unknown migrations and duplicate sources',()=>{
  for(const suffix of ['\n20991019060000 | 20991019060000 | unknown-future',
    '\n20261019080000 | 20261019080000 | unknown-between',
    '\n20261019100001 | | unknown-pending'])
    assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()+suffix,environment:environment()}),
      /ACCOUNT_STATISTICS_ASSISTANT_UNKNOWN_POST_CUTOVER_VERSION/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list().replace(
    `${OLD.version} | ${OLD.version}`,`${OLD.version} | `),environment:environment()}),
    /ACCOUNT_STATISTICS_ASSISTANT_MISSING_INSTALLED_PREDECESSOR/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list().replace(
    `${descriptor.version} | `,' | '),environment:environment()}),
    /Supabase migration-list row contained neither a local nor a remote version/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list(true).replace(
    `${descriptor.version} | ${descriptor.version}`,` | ${descriptor.version}`),environment:environment(true)}),
    /ACCOUNT_STATISTICS_ASSISTANT_MISSING_LOCAL_SOURCE/);
  assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()
    +`\n${descriptor.version} | | duplicate`,environment:environment()}),
    /Supabase migration-list output repeated migration version 20261019100000 across rows/);
  for(const version of ['20261014140000','20261015030000','20261016030000'])
    assert.throws(()=>selectAccountStatisticsAssistantRoute({migrationListText:list()
      +`\n${version} | ${version} | forbidden-archive`,environment:environment()}));
});

test('before-plan requires every fresh preservation flag and the exact dry-run',async()=>{
  for(const key of ['RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_ORIGINALS_VERIFIED',
    'RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_NOLOSS_VERIFIED','RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PREWRITE_VERIFIED'])
    await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),environment:{...environment(),[key]:'false'}}),
      /Exact fresh B\/S and prepared byte preservation required before SQL/);
  await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),dryRunText:noop}));
  await assert.rejects(verifyAccountStatisticsAssistantPlan({...plan(),dryRunText:dry.replace(
    'Finished supabase db push.',' • 20991019100001_extra.sql\nFinished supabase db push.')}));
});

test('plan and prewrite cannot combine historical grants or an active writer',()=>{
  for(const installed of [false,true]){
    const env=environment(installed);
    assert.equal(assertAccountStatisticsAssistantPlanCaller(env).version,descriptor.version);
    assert.doesNotThrow(()=>assertAccountStatisticsAssistantPrewriteCaller(env));
    for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
      'RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN','RAVRADAR_CURRENT_MEMORY_WARMUP_UPGRADE_OPT_IN',
      'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN',
      'RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN','RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN',
      'RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN','RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN']){
      assert.throws(()=>assertAccountStatisticsAssistantPlanCaller({...env,[key]:'true'}));
      assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,[key]:'true'}));
    }
    for(const [key,value] of [['GITHUB_RUN_ATTEMPT','2'],['GITHUB_REF','refs/heads/other'],
      ['RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_WRITER_ACTIVE','true']]){
      assert.throws(()=>assertAccountStatisticsAssistantPlanCaller({...env,[key]:value}));
      assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,[key]:value}));
    }
    assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE:installed?'before':'installed'}));
    assert.throws(()=>assertAccountStatisticsAssistantPrewriteCaller({...env,
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_RECOVERY_GATE_RESULT:'failure'}));
  }
});

test('serialized origin or prepared PASS cannot mint metadata or prewrite authority',async()=>{
  for(const forged of [{},{status:'passed'},Object.freeze({admission:'NO_ADMISSION',
    originalReferenceAt:'2026-10-19T00:00:00.000Z',targetReferenceAt:'2026-10-19T00:00:00.000Z'})]){
    assert.throws(()=>assertAuthenticatedFrozen584Snapshot(forged),/FROZEN584_PREDECESSOR_HANDLE/);
    await assert.rejects(buildEstablishedNativeCurrent584MetadataAttestation(forged,
      {centralContract:null,conditions:null}),/FROZEN584_PREDECESSOR_HANDLE/);
    await assert.rejects(assertAccountStatisticsAssistantRuntimeTransitionPrepared(forged),
      /Only this actual normal preparation, never a serialized receipt/);
  }
  // All reject their fixed argument envelope before paths, clients or I/O.
  const forged={status:'passed'};
  await assert.rejects(prepareAccountStatisticsAssistantRuntimeTransition(forged));
  await assert.rejects(restoreAndPrepareAccountStatisticsAssistantRuntimeTransition(forged));
  await assert.rejects(verifyAccountStatisticsAssistantPrewritePreservation(forged));
  await assert.rejects(assertEstablishedNativeCurrent584MetadataCheckpoint(forged),/ARGUMENTS/);
});

test(sourceIssued?'normal SOURCE mutable consumer uses actual current SQL and retains all old aliases':'normal585 mutable consumer reads the actual issued source and preserves all original584 aliases',async()=>{
  const {canonicalSource}=sourceIssued?await SOURCE.readSourceProducerCanonicalSource():await readAccountStatisticsAssistantCanonicalSource();
  const currentT=sourceIssued?SOURCE.requireSourceProducerBinding().T:NEXT.T;
  const block=checkpointMetadataCasBlock(canonicalSource,integratedBinding(),candidateBinding(),currentT);
  for(const row of [...ACCOUNT_STATISTICS_ASSISTANT_ALIASES,...(sourceIssued?SOURCE.SOURCE_PRODUCER_ALIASES:[])]){
    const whole=accountStatisticsAssistantDefinition(canonicalSource,row.name);
    assert(block.includes(whole),'Mutable output retains the whole original or projection definition');
  }
  const whole=accountStatisticsAssistantDefinition(canonicalSource,ACCOUNT_STATISTICS_ASSISTANT_ALIASES[0].name);
  for(const changed of [canonicalSource.replace(whole,whole.replace('begin\n','begin\n  -- CHANGED ORIGINAL\n')),
    canonicalSource.replace(whole,''),canonicalSource+'\n'+whole+'\n'])
    assert.throws(()=>checkpointMetadataCasBlock(changed,integratedBinding(),candidateBinding(),currentT));
});

test('historical584 national evidence inverts only the reviewed current90-minute job and exact national wrapper',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {ORIGIN:old,WORKFLOW,BEFORE_BLOCK,AFTER_BLOCK,BEFORE_JOB,AFTER_JOB,CURRENT_JOB,inverseSourceNode24Workflow,inverseCandidatePublicSourceRunLine,verifyWorkflow:verifyCurrentWorkflow,
    verifyReviewed90Workflow:verifyWorkflow}=await import('./national584-source-evidence.mjs');
  const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  assert.equal(git('rev-parse',old.head+'^{tree}').toString().trim(),'400babda9377e43ea7ee1444008f7accd1aded32');
  assert.equal(git('rev-parse',fixture+'^{tree}').toString().trim(),'b3fe05c0b6356ead06fb91a957113d10553d7631');
  const before=git('show',old.head+':'+WORKFLOW).toString();
  const recorded=git('show',fixture+':'+WORKFLOW).toString();
  const actual=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  verifyCurrentWorkflow(actual);
  const current=inverseCandidatePublicSourceRunLine(inverseSourceNode24Workflow(actual)).replace(CURRENT_JOB,AFTER_JOB);
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(before),'55bd264d8cc8fb7301d6b403f7035f644625d08528514fab3200e7e435f1d2d0');
  assert.equal(recorded.split(AFTER_BLOCK).length,2);assert.equal(recorded.split(AFTER_JOB).length,2);
  assert.equal(hash(recorded.replace(AFTER_BLOCK,BEFORE_BLOCK)),'bd78b6279be1f9677bc04748f71f60553c1b2220f878bffbc0e2714a7841bcf6');
  assert.equal(recorded.replace(AFTER_BLOCK,BEFORE_BLOCK).replace(AFTER_JOB,BEFORE_JOB),before,
    'The entire genuine old workflow is preserved, not a repinned current hash');
  assert.doesNotThrow(()=>verifyWorkflow(recorded));assert.doesNotThrow(()=>verifyWorkflow(current));
  assert.throws(()=>verifyWorkflow(before),'A historical75-minute job is not the current source contract');
  const once=(text,from,to)=>{assert.equal(text.split(from).length,2);return text.replace(from,()=>to);};
  const mutations=[
    ...[75,89,91].map(minutes=>once(recorded,AFTER_JOB,AFTER_JOB.replace('timeout-minutes: 90','timeout-minutes: '+minutes))),
    once(recorded,AFTER_JOB,AFTER_JOB+AFTER_JOB),
    once(recorded,AFTER_BLOCK,AFTER_BLOCK+AFTER_BLOCK),
    once(recorded,'  contents: read\n','  contents: write\n'),
    once(recorded,"        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs\n","        run: true && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs\n"),
    once(recorded,'          node scripts/native-postgres-evidence.mjs\n','          true\n'),
    once(recorded,AFTER_BLOCK,AFTER_BLOCK.replace('github.token','secrets.UNRELATED')),
    once(recorded,AFTER_BLOCK,'')+AFTER_BLOCK,
    recorded+'\n# unreviewed byte\n',
  ];
  for(const changed of mutations)assert.throws(()=>verifyWorkflow(changed));
});

test('source-PR-only120-minute job preserves genuine90 workflow and rejects every other budget',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {WORKFLOW,CURRENT_JOB,AFTER_JOB,CURRENT_SOURCE_RUN_LINE,inverseSourceNode24Workflow,inverseCandidatePublicSourceRunLine,
    verifyWorkflow,verifyReviewed90Workflow}=await import('./national584-source-evidence.mjs');
  const fixture='b02745d6d2987ed0fd2913623b3809fd0ea02dd6';
  const recorded=execFileSync('git',['show',fixture+':'+WORKFLOW],{maxBuffer:65536,timeout:30000,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}}).toString();
  const actual=(await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  assert.equal(recorded.split(AFTER_JOB).length,2);assert.equal(actual.split(CURRENT_JOB).length,2);
  assert.equal(inverseCandidatePublicSourceRunLine(inverseSourceNode24Workflow(actual)).replace(CURRENT_JOB,AFTER_JOB),recorded,
    'The WHOLE genuine90 workflow is reconstructed');
  assert.doesNotThrow(()=>verifyWorkflow(actual));assert.doesNotThrow(()=>verifyReviewed90Workflow(recorded));
  assert.throws(()=>verifyWorkflow(recorded),'Historical90 is not current120 admission');
  assert.throws(()=>verifyReviewed90Workflow(actual),'Current120 is not silently accepted as historical90');
  for(const minutes of [75,89,90,91,119,121,180,360])
    assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_JOB,CURRENT_JOB.replace('timeout-minutes: 120','timeout-minutes: '+minutes))));
  assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_JOB,CURRENT_JOB+CURRENT_JOB)));
  for(const command of ['node scripts/test-prepare-candidate-g-operational-rollback.mjs',
    'node scripts/test-candidate-g-rollback-public-stage.mjs']) {
    assert.equal(actual.split(command).length,2,'Each appended Candidate command occurs exactly once');
    assert.throws(()=>verifyWorkflow(actual.replace(' && '+command,'')),
      'Missing Candidate command is not a current source-PR runline');
    assert.throws(()=>verifyWorkflow(actual.replace(command,command.replace('.mjs','-changed.mjs'))),
      'Changed Candidate command is not a current source-PR runline');
    assert.throws(()=>verifyWorkflow(actual.replace(command,command+' && '+command)),
      'Duplicate Candidate command is not a current source-PR runline');
  }
  assert.throws(()=>verifyWorkflow(actual.replace(CURRENT_SOURCE_RUN_LINE,CURRENT_SOURCE_RUN_LINE+CURRENT_SOURCE_RUN_LINE)));
  assert.throws(()=>verifyWorkflow(actual.replace('  contents: read\n','  contents: write\n')),
    'An unrelated workflow change must still fail after the exact runline inverse');
  assert.throws(()=>verifyWorkflow(actual+'\n# unknown source change\n'));
});

test('normal original584 staging forwards the selected R2 storage into the real frozen restore',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const {createProtectedPrivateRuntimeClients}=await import('./protected-private-production-runtime.mjs');
  const {withAuthenticated584PredecessorSource}=await import('./check-account-statistics-assistant-predecessor-source.mjs');
  const stageFile='scripts/stage-account-statistics-assistant-originals.mjs';
  const current=await fs.readFile(new URL('./stage-account-statistics-assistant-originals.mjs',import.meta.url),'utf8');
  const before=execFileSync('git',['show','e7b7436afb0c9388b7e9015ad60b361704950550:'+stageFile],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:30000,maxBuffer:65536,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'},
  });
  const seams=source=>{
    const factory=[...source.matchAll(/^  (const \{documentRequest:request(?:,storage)?\}=createProtectedPrivateRuntimeClients\((?:\{storageBackend:'supabase'\})?\);)\r?$/gm)];
    const restore=[...source.matchAll(/^    (const restored=await protectedB\.restoreProtectedPrivateProductionRuntime\(\{privateRoot,bundlePath,repositoryRoot:frozenRoot,expected,request(?:,storage)?\}\);)\r?$/gm)];
    assert.equal(factory.length,1,'One actual normal clientfactory seam');
    assert.equal(restore.length,1,'One actual normal frozen584 restore seam');
    return {factory:factory[0][1],restore:restore[0][1]};
  };
  const actual=seams(current),historical=seams(before);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  await withAuthenticated584PredecessorSource(async frozenRoot=>{
    const protectedB=await import(pathToFileURL(join(frozenRoot,'scripts/protected-private-production-runtime.mjs')).href);
    const invoke=async(seam,observed)=>{
      observed.pointerReads=0;
      const factory=(...args)=>{
        assert(args.length<=1);observed.factoryArguments=args;
        const synthetic={RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND:'r2',
          RAVRADAR_R2_ACCOUNT_ID:'a'.repeat(32),RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-r2-access',
          RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-secret'};
        const saved=Object.fromEntries(Object.keys(synthetic).map(key=>[key,process.env[key]]));
        try{
          Object.assign(process.env,synthetic);
          observed.clients=createProtectedPrivateRuntimeClients({
            supabaseUrl:'https://synthetic.invalid',serviceRoleKey:'synthetic-service-role-key',
            fetchImpl:async(url,options={})=>{
              const target=new URL(url);
              assert.equal(target.origin,'https://synthetic.invalid');
              assert.equal(target.pathname,'/rest/v1/admin_documents');
              assert.equal(options.method??'GET','GET');
              assert.equal(target.searchParams.get('document_key'),'eq.ravscore-private-production-runtime-pointer');
              assert.equal(target.searchParams.get('select'),'document_key,payload,version');
              assert.equal(target.searchParams.get('limit'),'2');
              observed.pointerReads++;
              return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
            },...args[0],
          });
          return observed.clients;
        }finally{
          for(const key of Object.keys(synthetic)){
            if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
          }
        }
      };
      // Both executable statements are the actual stage source, not a repaired
      // product copy. Only the transport/configuration uses synthetic fixtures.
      const execute=new AsyncFunction('createProtectedPrivateRuntimeClients','protectedB','frozenRoot',
        "const privateRoot=frozenRoot+'/unused-private',bundlePath=privateRoot+'/bundle',expected={};\n"
        +seam.factory+'\n'+seam.restore+'\nreturn restored;');
      return execute(factory,protectedB,frozenRoot);
    };
    const oldObservation={};
    await assert.rejects(invoke(historical,oldObservation),/Private runtime storage client lacks ensurePrivateBucket/);
    assert.deepEqual(oldObservation.factoryArguments,[{storageBackend:'supabase'}]);
    assert.equal(typeof oldObservation.clients.storage.bucketUsage,'undefined','Actual old factory overrode the selected R2 backend');
    assert.equal(oldObservation.pointerReads,0,'The genuine old restore refuses before reading a pointer');
    const observation={},result=await invoke(actual,observation);
    assert.deepEqual(observation.factoryArguments,[],'The actual stage must retain the normally selected backend');
    assert.equal(typeof observation.clients.storage.bucketUsage,'function','The real selected R2 adapter was constructed');
    assert.equal(observation.pointerReads,1,'The genuine frozen584 document reader was reached');
    assert.deepEqual(result,{restored:false,reason:'protected-private-runtime-not-found',targetUnchanged:true,privatePayloadLogged:false});
    const dropped=actual.restore.replace(',request,storage}',',request}');
    assert.notEqual(dropped,actual.restore,'The actual after-call forwards storage explicitly');
    const droppedObservation={};
    await assert.rejects(invoke({...actual,restore:dropped},droppedObservation),/Private runtime storage client lacks ensurePrivateBucket/);
    assert.equal(droppedObservation.pointerReads,0);
  });
  // A deliberately empty pointer proves client/call wiring only: no archive
  // download, private payload, B/S admission, SQL or publication is exercised.
});

test('current national package follows only the genuine current source phase and preserves every old package assertion',async()=>{
  const {verifyPackage,CURRENT585_ROOT_TARGET}=await import('./national584-source-evidence.mjs');
  const source=await import('./lib/source-producer-successor-source.mjs');
  const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
  const issued=source.SOURCE_PRODUCER_BINDING!==null;
  if(issued){source.requireSourceProducerBinding();source.requireSourceProducerOutput();}
  else assert.equal(source.SOURCE_PRODUCER_OUTPUT,null);
  const expected=issued?source.SOURCE_PRODUCER_PROPOSED_RELEASE:'4.0.585';
  assert.equal(pkg.version,expected);assert.equal(verifyPackage(pkg),undefined);
  const changed=update=>{const copy=structuredClone(pkg);update(copy);return copy;};
  for(const version of [issued?'4.0.585':source.SOURCE_PRODUCER_PROPOSED_RELEASE,'4.0.999',undefined])
    assert.throws(()=>verifyPackage({...pkg,version}));
  for(const candidate of [
    changed(copy=>{copy.scripts['test:account-statistics-assistant-source']='node unreviewed-source.mjs';}),
    changed(copy=>{copy.scripts['test:ravscore-source-critical']=copy.scripts['test:ravscore-source-critical']
      .replace('npm run test:account-statistics-assistant-source','npm run test:account-statistics-assistant-source && npm run test:account-statistics-assistant-source');}),
    changed(copy=>{copy.scripts['test:ravscore-source-critical']=copy.scripts['test:ravscore-source-critical']
      .replace('npm run test:last-mile-enclosure','node unreviewed-predecessor.mjs');}),
    changed(copy=>{copy.scripts.extra='node '+CURRENT585_ROOT_TARGET;}),
    changed(copy=>{copy.scripts['test:last-mile-enclosure']=copy.scripts['test:last-mile-enclosure']
      .replace('node scripts/national584-source-evidence.mjs source','node unreviewed-historical-target.mjs');}),
  ])assert.throws(()=>verifyPackage(candidate));
});

test('current national gate requires the exact executed SOURCE native receipt without relabeling historical584',async()=>{
  const {verifyCurrentNativePostgresReceipt}=await import('./national584-source-evidence.mjs');
  const {CURRENT_COMMANDS,ACCOUNT_STATISTICS_ASSISTANT_COMMANDS,COMMANDS}=await import('./native-postgres-evidence.mjs');
  const identity={head:'a'.repeat(40),run:123,attempt:1};
  const receipt={status:'EXECUTED',executedInThisRun:true,origin:null,current:{...identity},commands:[...CURRENT_COMMANDS]};
  const before=structuredClone(receipt);
  assert.equal(verifyCurrentNativePostgresReceipt(receipt,identity),undefined);
  assert.deepEqual(receipt,before,'Receipt validation cannot rewrite or promote evidence');
  assert.equal(CURRENT_COMMANDS.length,2);assert(CURRENT_COMMANDS[1].endsWith(' --source-producer'));
  for(const changed of [
    undefined,
    {...receipt,status:'REUSED'},
    {...receipt,executedInThisRun:false},
    {...receipt,origin:{run:122}},
    {...receipt,current:{...identity,head:'b'.repeat(40)}},
    {...receipt,current:{...identity,run:124}},
    {...receipt,current:{...identity,attempt:2}},
    {...receipt,commands:[...ACCOUNT_STATISTICS_ASSISTANT_COMMANDS]},
    {...receipt,commands:[...COMMANDS]},
    {...receipt,commands:[...CURRENT_COMMANDS].reverse()},
    {...receipt,commands:[...CURRENT_COMMANDS,CURRENT_COMMANDS[1]]},
    {...receipt,commands:[CURRENT_COMMANDS[0],CURRENT_COMMANDS[1]+' --unknown-native-phase']},
  ])assert.throws(()=>verifyCurrentNativePostgresReceipt(changed,identity));
});

// Additive current SOURCE import checks only. The original585 cases and the
// genuine historical model-import suite above/under its frozen runner remain
// unchanged. These assertions issue no C/I/T, B/S, origin or owner permission.
const sourceReviewedImportCases = Object.freeze([
  {
    "file": "scripts/protected-private-production-runtime.mjs",
    "sha256": "380bb5420a833d4541cee4aa1f3889c4023087182580e18ccb16de8d0ab299da",
    "imports": [
      "./private-production-runtime-bundle.mjs",
      "./lib/supabase-admin-rest.mjs",
      "../js/core/ravscore-model-contract.js",
      "./lib/r2-private-runtime-storage.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./source-normal-producer-entry.mjs"
    ],
    "computedExpressions": [
      "import(pathToFileURL(path.join(\n        oldRoot, 'js/core/ravscore-model-contract.js')).href)",
      "import(pathToFileURL(path.join(\n        oldRoot, 'scripts/private-production-runtime-bundle.mjs')).href)"
    ]
  },
  {
    "file": "scripts/reconcile-private-runtime-checkpoint.mjs",
    "sha256": "e938b6607bc9cacad90e175555bfa9c7c6450b105a3589538c787577f70927a8",
    "imports": [
      "./protected-private-production-runtime.mjs",
      "./private-production-runtime-bundle.mjs",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "./lib/last-mile-enclosure-successor-source.mjs",
      "./check-last-mile-enclosure-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/established-native-current-origin.mjs",
      "./account-statistics-assistant-prewrite.mjs",
      "./lib/private-weather-component-pack.mjs",
      "./check-production-target-freshness.mjs"
    ],
    "computedExpressions": [
      "import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)",
      "import(pathToFileURL(path.join(sourceRoot,\n      'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)"
    ]
  },
  {
    "file": "scripts/check-last-mile-enclosure-predecessor-source.mjs",
    "sha256": "ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3",
    "imports": [],
    "computedExpressions": [
      "import('data:text/javascript;base64,'+content.get(entry.file).toString('base64'))",
      "import('data:text/javascript;base64,'+content.get(SCANNER).toString('base64'))",
      "import(pathToFileURL(path.join(root,source.inventory.t.module)).href)",
      "import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href)",
      "import(pathToFileURL(path.join(root,'scripts/private-production-runtime-bundle.mjs')).href)",
      "import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)",
      "import(pathToFileURL(path.join(root,'scripts/ravscore-continuation-checkpoint.mjs')).href)"
    ]
  },
  {
    "file": "scripts/account-statistics-assistant-prewrite.mjs",
    "sha256": "44c1ef4edaab1d446cf7696eb5dcacfd49a618ee8788997ce88c740fe59a7761",
    "imports": [
      "./account-statistics-assistant-runtime-transition.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs"
    ],
    "computedExpressions": [
      "import(pathToFileURL(path.join(frozenRoot,p)).href)"
    ]
  },
  {
    "file": "scripts/account-statistics-assistant-runtime-transition.mjs",
    "sha256": "f3101b3d5d6c7df7dd42d560d2a9d99c6dbee6cc6904397c95c6256f8144d8fd",
    "imports": [
      "./lib/bounded-json-writer.mjs",
      "./lib/established-native-current-origin.mjs",
      "./lib/authenticated-frozen584-predecessor.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./protected-private-production-runtime.mjs"
    ],
    "computedExpressions": [
      "import(pathToFileURL(path.join(frozenRoot,p)).href)",
      "import(pathToFileURL(path.join(frozenRoot,p)).href)",
      "import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)"
    ]
  },
  {
    "file": "scripts/migrate-post-cutover-private-runtime.mjs",
    "sha256": "1b097d22f4102dc80f8d2c917dbaead896ceb3e7b8f364992d3422c4d010d9f6",
    "imports": [
      "./private-production-runtime-workflow.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/public-hour-delivery-pack.mjs",
      "./lib/rebind-public-hour-pack-exact.mjs",
      "./lib/private-conditions-hourly.mjs",
      "./public-conditions-lib.mjs",
      "../js/core/ravscore-public-runtime-contract.js",
      "./lib/coastal-point-staging-contract.mjs",
      "../js/core/ravscore-model-contract.js",
      "../js/core/ravscore-public-profile-contract.js",
      "../js/core/ravscore-integrated-state-pipeline.js",
      "../js/core/ravscore-integrated.js",
      "../js/core/ravscore-public-model.js",
      "./lib/ravscore-production-adapters.mjs",
      "./lib/ravscore-integrated-runtime.mjs",
      "./audit-ravscore-integrated-public-runtime.mjs",
      "./rollback-assets/ravscore-model-contract.js",
      "./runtime-binding-registry.mjs",
      "./lib/bounded-json-writer.mjs",
      "./lib/ravscore-production-part-pipeline.mjs",
      "./lib/dmi-marine-zone-exclusions.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./private-production-runtime-bundle.mjs",
      "./protected-private-production-runtime.mjs",
      "./check-native-identity-frozen-i71-source.mjs"
    ],
    "computedExpressions": [
      "import(`${stagingUrl.href}${query}`)",
      "import(`${integratedUrl.href}${query}`)",
      "import(`${candidateUrl.href}${query}`)",
      "import(pathToFileURL(path.join(predecessor,\n    'scripts/private-production-runtime-bundle.mjs')).href)",
      "import(pathToFileURL(path.join(frozenRoot, relative)).href)"
    ]
  },
  {
    "file": "scripts/check-native-identity-frozen-i71-source.mjs",
    "sha256": "21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    "imports": [],
    "computedExpressions": [
      "import('data:text/javascript;base64,' + (await bytes(file, inventory)).toString('base64'))",
      "import('data:text/javascript;base64,' + (await bytes(SCANNER, inventory)).toString('base64'))",
      "import(pathToFileURL(path.join(temporary, T)).href)"
    ]
  }
].map(Object.freeze));
test('SOURCE current import variants require exact bytes and preserve the old protected variant', async () => {
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  for (const row of sourceReviewedImportCases) {
    const source = (await fs.readFile(new URL('../' + row.file, import.meta.url), 'utf8'))
      .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    assert.equal(hash(source), row.sha256);
    const imports = modelSourceRelativeModuleSpecifiers(source, row.file);
    assert(Object.isFrozen(imports));
    assert.deepEqual(imports, row.imports);
    assert.equal(new Set(imports).size, imports.length);
    assert.deepEqual(modelSourceRelativeModuleSpecifiers('\uFEFF' + source.replaceAll('\n', '\r\n'), row.file), imports);
    for (const changed of [source + '\n// changed byte\n', source + "\nimport './hidden.mjs';\n"])
      assert.throws(() => modelSourceRelativeModuleSpecifiers(changed, row.file), /Whole reviewed model import source changed/);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'scripts/not-a-reviewed-source.mjs'),
      /non-literal or unparsed dynamic import/);
  }
  const {execFileSync} = await import('node:child_process');
  const old = execFileSync('git', ['-C', fileURLToPath(new URL('..', import.meta.url)), 'show',
    'e8f9f7197d9e262720b7627b4970d3da82baa9d9:scripts/protected-private-production-runtime.mjs'],
    {encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,
      env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}})
    .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  assert.equal(hash(old), 'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762');
  const file = 'scripts/protected-private-production-runtime.mjs';
  assert.equal(modelSourceRelativeModuleSpecifiers(old, file).length, 6);
  assert.equal(modelSourceRelativeModuleSpecifiers(
    (await fs.readFile(new URL('../' + file, import.meta.url), 'utf8')), file).length, 7);
});
test('SOURCE reviewed inventories include every ordinary import with exact historical-site inverses', async () => {
  for (const row of sourceReviewedImportCases) {
    const source = (await fs.readFile(new URL('../' + row.file, import.meta.url), 'utf8'))
      .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    for (const expression of new Set(row.computedExpressions))
      assert.equal(source.split(expression).length - 1,
        row.computedExpressions.filter(value => value === expression).length, row.file + ' exact computed-site count');
    let view = source;
    const edits = row.computedExpressions.map((expression, index) => {
      const marker = "import('node:fs') /* SOURCE_IMPORT_ASSERTION_VIEW_" + index + " */";
      assert(view.includes(expression)); view = view.replace(expression, () => marker);
      return {expression, marker};
    });
    assert.deepEqual(exactRelativeModuleSpecifiers(view, row.file), row.imports);
    for (const edit of [...edits].reverse()) {
      assert.equal(view.split(edit.marker).length, 2);
      view = view.replace(edit.marker, () => edit.expression);
    }
    assert.equal(view, source, row.file + ' WHOLE original source inverse');
  }
  // This actual tail has only literal/static module specifiers; it must retain
  // the ordinary lexer, not gain an unnecessary reviewed/scanner escape.
  const tail = await fs.readFile(new URL('./source-normal-producer-tail.mjs', import.meta.url), 'utf8');
  const ordinary = exactRelativeModuleSpecifiers(tail, 'scripts/source-normal-producer-tail.mjs');
  assert.equal(ordinary.length, 17);
  assert.deepEqual(modelSourceRelativeModuleSpecifiers(tail, 'scripts/source-normal-producer-tail.mjs'), ordinary);
  for (const source of ["import {x} from './a.mjs';", "const x = import('./literal.mjs');"])
    assert.deepEqual(modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'),
      exactRelativeModuleSpecifiers(source, 'ordinary.mjs'));
  for (const source of ['import(variable)', "import('./x.mjs' + suffix)", 'import(unknown.path)'])
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'));
});

test('fixed585 predecessor DATA host qualifies real source without issuing authority', {timeout:120000}, async () => {
  const {withAuthenticated585PredecessorSource} = await import('./check-source-producer-predecessor-source.mjs');
  const {pathToFileURL} = await import('node:url');
  const path = await import('node:path');
  let callbacks = 0, retainedRoot;
  const result = await withAuthenticated585PredecessorSource(async sourceRoot => {
    callbacks += 1;
    retainedRoot = sourceRoot;
    assert(path.isAbsolute(sourceRoot));
    const data = await import(pathToFileURL(path.join(sourceRoot,
      'scripts/lib/established-native-current-origin-585-assertion.mjs')).href);
    assert.equal(typeof data.assertFrozen585OriginSnapshotData, 'function');
    assert.equal(typeof data.assertFrozen585MetadataOriginData, 'function');
    await assert.rejects(data.assertFrozen585OriginSnapshotData({}), /ARGUMENTS/);
    await assert.rejects(data.assertFrozen585MetadataOriginData({}), /ARGUMENTS/);
    // The genuine fixed585 builder/source checks already ran inside the host.
    // No B/S factory, snapshot, origin issuer, owner or installation is invoked.
  });
  assert.equal(result, undefined);
  assert.equal(callbacks, 1);
  await assert.rejects(fs.lstat(retainedRoot), {code:'ENOENT'});
});

test("SOURCE post585 import variants admit only exact v2 sources and refuse unknown imports", async () => {
  const rows = [
    {
      "file": "scripts/lib/established-native-current-origin.mjs",
      "sha256": "c3c52d867ed6b29c10986bc16f4052a1d639ef7ba508d0e20cad7be40110babc",
      "imports": [
        "../protected-private-production-runtime.mjs",
        "../protected-ravscore-continuation-checkpoint.mjs",
        "../private-production-runtime-bundle.mjs",
        "./weather-state-epoch-archive.mjs",
        "../ravscore-continuation-checkpoint.mjs",
        "../private-production-runtime-workflow.mjs",
        "../../js/core/ravscore-model-contract.js",
        "../rollback-assets/ravscore-model-contract.js",
        "../../js/core/ravscore-model-bundle.generated.js",
        "./ravscore-sampling-context.mjs",
        "./coastal-point-staging-contract.mjs",
        "./ravscore-candidate-g-rollback-runtime.mjs",
        "./private-weather-component-pack.mjs",
        "../check-native-current-reanalysis-predecessor-source.mjs",
        "./authenticated-frozen584-predecessor.mjs",
        "../check-account-statistics-assistant-predecessor-source.mjs",
        "./authenticated-frozen585-predecessor.mjs",
        "../check-source-producer-predecessor-source.mjs",
        "./ravscore-production-part-pipeline.mjs"
      ],
      "computedExpressions": [
        "import(pathToFileURL(path.join(sourceRoot, file)).href)",
        "import(pathToFileURL(path.join(frozenRoot,\n      'scripts/lib/established-native-current-origin-584-assertion.mjs')).href)",
        "import(pathToFileURL(path.join(frozenRoot,\n      'scripts/lib/established-native-current-origin-585-assertion.mjs')).href)"
      ]
    },
    {
      "file": "scripts/lib/authenticated-frozen585-predecessor.mjs",
      "sha256": "7a7e18b625a99c28dc8a3331d374e9d8fbbf19a64c8a323b1af99bfe1f60679e",
      "imports": [
        "../check-source-producer-predecessor-source.mjs"
      ],
      "computedExpressions": [
        "import(pathToFileURL(path.join(frozenRoot,file)).href)"
      ]
    },
    {
      "file": "scripts/check-source-producer-predecessor-source.mjs",
      "sha256": "17b3ce539b1f296fb75bf592fcd7393569f0dd3614974e6d7d06a836a0020922",
      "imports": [],
      "computedExpressions": [
        "import('data:text/javascript;base64,'+Buffer.from(executableModel).toString('base64'))",
        "import('data:text/javascript;base64,'+(await bytes(file,index)).toString('base64'))",
        "import(pathToFileURL(path.join(root,T)).href)",
        "import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href)"
      ]
    }
  ];
  const hash = source => crypto.createHash('sha256').update(source).digest('hex');
  for (const row of rows) {
    const source = (await fs.readFile(new URL('../' + row.file, import.meta.url), 'utf8'))
      .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    assert.equal(hash(source), row.sha256, row.file + ' whole exact afterimage');
    const imports = modelSourceRelativeModuleSpecifiers(source, row.file);
    assert(Object.isFrozen(imports));
    assert.deepEqual(imports, row.imports);
    for (const changed of [source + '\n// unknown byte\n',
      source + "\nimport('./unknown-post585.mjs');\n",
      source + "\nimport('./unknown-post585.mjs' + suffix);\n"])
      assert.throws(() => modelSourceRelativeModuleSpecifiers(changed, row.file),
        /Whole reviewed model import source changed/);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'scripts/post585-import-unknown.mjs'),
      /non-literal or unparsed dynamic import/);
    let view = source;
    const edits = row.computedExpressions.map((expression, index) => {
      assert.equal(view.split(expression).length, 2, row.file + ' one exact computed site');
      const marker = "import('node:fs') /* POST585_IMPORT_ASSERTION_VIEW_" + index + " */";
      view = view.replace(expression, () => marker);
      return {expression, marker};
    });
    assert.deepEqual(exactRelativeModuleSpecifiers(view, row.file), row.imports);
    for (const edit of [...edits].reverse()) {
      assert.equal(view.split(edit.marker).length, 2);
      view = view.replace(edit.marker, () => edit.expression);
    }
    assert.equal(view, source, row.file + ' whole computed-site inverse');
  }
});

test(sourceIssued?"SOURCE post585 caller imports and actual issued canonical phase":"SOURCE post585 caller imports and unissued phase refuse before IO", async () => {
  const rows = [
    {
      "file": "scripts/source-producer-runtime-transition.mjs",
      "sha256": "012d0c50b675bf8d2a4e0cd71ab51a78f19da3548d9647b18f7aeb554fee81f5",
      "relativeImportCount": 11,
      "computedExpressions": [
        "import(pathToFileURL(path.join(frozenRoot,p)).href)",
        "import(pathToFileURL(path.join(frozenRoot,p)).href)",
        "import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)"
      ]
    },
    {
      "file": "scripts/reconcile-private-runtime-checkpoint.mjs",
      "sha256": "0d39bb342673321abf6481a4a3527bb3717dc4b2604688550d23e5d928b467f4",
      "relativeImportCount": 17,
      "computedExpressions": [
        "import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)",
        "import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)",
        "import(pathToFileURL(path.join(sourceRoot,\n      'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)"
      ]
    }
  ];
  const hash = source => crypto.createHash('sha256').update(source).digest('hex');
  for (const row of rows) {
    const source = (await fs.readFile(new URL('../' + row.file, import.meta.url), 'utf8'))
      .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    assert.equal(hash(source), row.sha256, row.file + ' exact materialized caller');
    const imports = modelSourceRelativeModuleSpecifiers(source, row.file);
    assert(Object.isFrozen(imports)); assert.equal(imports.length, row.relativeImportCount);
    for (const changed of [source + '\n// unknown byte\n',
      source + "\nimport('./unknown-post585-caller.mjs');\n",
      source + "\nimport('./unknown-post585-caller.mjs' + suffix);\n"])
      assert.throws(() => modelSourceRelativeModuleSpecifiers(changed, row.file),
        /Whole reviewed model import source changed/);
    let view = source;
    const edits = row.computedExpressions.map((expression, index) => {
      assert(view.includes(expression));
      const marker = "import('node:fs') /* POST585_CALLER_VIEW_" + index + " */";
      view = view.replace(expression, () => marker);
      return {expression, marker};
    });
    assert.deepEqual(exactRelativeModuleSpecifiers(view, row.file), imports);
    for (const edit of [...edits].reverse()) {
      assert.equal(view.split(edit.marker).length, 2);
      view = view.replace(edit.marker, () => edit.expression);
    }
    assert.equal(view, source, row.file + ' whole computed-site inverse');
  }
  const readinessFile = 'scripts/integrated-cutover-readiness.mjs';
  const readinessSource = (await fs.readFile(new URL('./integrated-cutover-readiness.mjs', import.meta.url), 'utf8'))
    .replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  assert.equal(hash(readinessSource), '0af01f729e59f8518174667c730861303bef109aea16350372d909593d01a3d2');
  const ordinary = exactRelativeModuleSpecifiers(readinessSource, readinessFile);
  assert.equal(ordinary.length, 14); assert(ordinary.includes('./lib/source-producer-successor-source.mjs'));
  assert.deepEqual(modelSourceRelativeModuleSpecifiers(readinessSource, readinessFile), ordinary);
  assert.throws(() => modelSourceRelativeModuleSpecifiers(readinessSource + '\nimport(moduleName);\n', readinessFile),
    /non-literal or unparsed dynamic import/);
  const source = await import('./lib/source-producer-successor-source.mjs');
  const runtime = await import('./source-producer-runtime-transition.mjs');
  const readiness = await import('./integrated-cutover-readiness.mjs');
  if(!sourceIssued){
  assert.equal(source.SOURCE_PRODUCER_VERSION, null);
  assert.equal(source.SOURCE_PRODUCER_BINDING, null);
  assert.equal(source.SOURCE_PRODUCER_OUTPUT, null);
  assert.equal(readiness.DEFAULT_CUTOVER_SOURCE_PHASE, 'account-statistics-assistant');
  let inputAccesses = 0, fetchCalls = 0;
  const untouched = new Proxy({}, {
    get() { inputAccesses++; throw new Error('UNEXPECTED_INPUT_ACCESS'); },
    ownKeys() { inputAccesses++; throw new Error('UNEXPECTED_INPUT_ACCESS'); },
    getPrototypeOf() { inputAccesses++; throw new Error('UNEXPECTED_INPUT_ACCESS'); },
  });
  for (const reject of [() => source.requireSourceProducerBinding(),
    () => source.requireSourceProducerOutput(), () => source.sourceProducerMigration(),
    () => readiness.sourceProducerRequiredMigrations(),
    () => readiness.assertSourceProducerMigrationsApplied(untouched)])
    assert.throws(reject, /SOURCE_PRODUCER_UNISSUED/);
  for (const reject of [
    () => runtime.restoreAndPrepareSourceProducerRuntimeTransition(untouched),
    () => runtime.prepareSourceProducerRuntimeTransition(untouched),
    () => readiness.assertSourceProducerMigrationPlan({migrationListText:untouched,dryRunText:untouched,migrationsDirectory:untouched}),
    () => readiness.prepareSourceProducerCutoverWorkdir({workdir:untouched}),
    () => readiness.hydrateSourceProducerRemoteMigrationHistory(untouched),
    () => readiness.inspectMigrationSources({sourcePhase:'source-producer',migrationsDirectory:untouched}),
    () => readiness.expectedCheckpointCasContract({sourcePhase:'source-producer',migrationsDirectory:untouched}),
    () => readiness.verifyIntegratedDatabaseReadback({sourcePhase:'source-producer',
      url:'https://never.invalid',serviceRoleKey:'synthetic-no-network',
      fetchImpl:async()=>{fetchCalls++;throw new Error('UNEXPECTED_FETCH');}}),
  ]) await assert.rejects(reject, /SOURCE_PRODUCER_UNISSUED/);
  assert.equal(inputAccesses, 0, 'Unissued entry points never inspect supplied I/O operands');
  assert.equal(fetchCalls, 0, 'Explicit unissued phase never fetches');
  }else{
    const current=source.requireSourceProducerBinding(),pins=source.requireSourceProducerOutput();
    assert.equal(readiness.DEFAULT_CUTOVER_SOURCE_PHASE,'source-producer');
    const inventory=readiness.sourceProducerRequiredMigrations();
    assert.equal(inventory.length,55);assert.equal(inventory.at(-2).version,descriptor.version);
    assert.equal(inventory.at(-1).version,current.version);
    const canonical=await source.readSourceProducerCanonicalSource();
    assert.equal(canonical.admission,'NO_ADMISSION');assert.equal(canonical.migration.version,current.version);
    assert.equal(crypto.createHash('sha256').update(canonical.canonicalSource).digest('hex'),pins.canonicalSha256);
    assert.equal((await readiness.expectedCheckpointCasContract({sourcePhase:'source-producer'})).sha256,pins.checkpointContractSha256);
    assert.equal((await readiness.expectedTripBindingPolicy({sourcePhase:'source-producer'})).sha256,pins.tripBindingPolicySha256);
    let remote=0;
    const forbidden=async()=>{remote++;throw new Error('UNEXPECTED_REMOTE_IO');};
    const oldFetch=globalThis.fetch;globalThis.fetch=forbidden;
    try{
      for(const action of [()=>source.requireSourceProducerBinding({}),()=>source.requireSourceProducerOutput({}),
        ()=>source.sourceProducerMigration({})])assert.throws(action,{code:'ERR_ASSERTION'});
      for(const action of [
        ()=>runtime.restoreAndPrepareSourceProducerRuntimeTransition({}),
        ()=>runtime.prepareSourceProducerRuntimeTransition({}),
        ()=>source.readSourceProducerCanonicalSource({migrationsDirectory:'relative'}),
        ()=>readiness.inspectMigrationSources({sourcePhase:'unknown-source-phase'}),
        ()=>readiness.expectedCheckpointCasContract({sourcePhase:'unknown-source-phase'}),
      ])await assert.rejects(action,{code:'ERR_ASSERTION'});
      assert.equal(remote,0);
    }finally{assert.equal(globalThis.fetch,forbidden);globalThis.fetch=oldFetch;}
  }
  await assert.rejects(runtime.assertSourceProducerRuntimeTransitionPrepared({}),
    /Only this actual normal preparation/);
});

test(sourceIssued?'SOURCE issued native command rejects invalid operands without starting native work':'SOURCE post585 native command refuses unissued outputs before IO',async()=>{
  const {compareSourceProducerSuccessor,assertSourceProducerTransactionBounds}=await import('./lib/source-producer-postgres.mjs');
  const {runNativeSourceProducerSqlComparison}=await import('./lib/checkpoint-cas-native-postgres.mjs');
  const {withFrozen585CheckpointPostgresSource}=await import('./run-frozen585-checkpoint-postgres-source.mjs');
  const {CURRENT_COMMANDS,ACCOUNT_STATISTICS_ASSISTANT_COMMANDS,ORIGIN}=await import('./native-postgres-evidence.mjs');
  let touched=0,callbacks=0;
  const unknown=new Proxy({},{get(){touched++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},ownKeys(){touched++;throw new Error('UNEXPECTED_OPERAND_ACCESS');}});
  if(!sourceIssued){
  for(const action of[()=>compareSourceProducerSuccessor(unknown),()=>runNativeSourceProducerSqlComparison(unknown),
    ()=>withFrozen585CheckpointPostgresSource(()=>{callbacks++;})])await assert.rejects(action,/SOURCE_PRODUCER_UNISSUED/);  }else{
    SOURCE.requireSourceProducerBinding();SOURCE.requireSourceProducerOutput();
    for(const action of [()=>compareSourceProducerSuccessor({}),
      ()=>runNativeSourceProducerSqlComparison(unknown,unknown),
      ()=>withFrozen585CheckpointPostgresSource(null)])
      await assert.rejects(action,{code:'ERR_ASSERTION'});
  }
  assert.equal(touched,0);assert.equal(callbacks,0);
  assert.equal(CURRENT_COMMANDS[1],ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[1]+' --source-producer');
  assert.equal(ORIGIN.run,39203570076,'Historical native receipt is unchanged, not SOURCE evidence');
  const bounds=["begin;","set local statement_timeout = '55s';","set local lock_timeout = '5s';"].join('\n\n');
  assertSourceProducerTransactionBounds(bounds);
  for(const changed of[bounds.replace("'55s'","'54s'"),bounds.replace("'5s'","'6s'")])
    assert.throws(()=>assertSourceProducerTransactionBounds(changed));
  const cli=await fs.readFile(new URL('./test-protected-ravscore-continuation-checkpoint.mjs',import.meta.url),'utf8');
  const ownGuard="if(process.argv.includes('--source-producer')||process.argv.includes('--current-source-native-profile'))requireSourceProducerOutput();";
  const modelWork='await ravScoreContinuationImplementationSha256()';
  const requireEarlyOwnGuard=text=>{
    const guardAt=text.indexOf(ownGuard),modelAt=text.indexOf(modelWork);
    assert.equal(text.split(ownGuard).length,2,'The exact two-flag own-source guard occurs once');
    assert(guardAt>=0&&modelAt>=0&&guardAt<modelAt,'The guard exists before normal model work');
  };
  requireEarlyOwnGuard(cli);
  for(const changed of[
    cli.replace(ownGuard,''),
    cli.replace(ownGuard,"if(process.argv.includes('--source-producer'))requireSourceProducerOutput();"),
    cli.replace(ownGuard,"if(process.argv.includes('--current-source-native-profile'))requireSourceProducerOutput();"),
    cli+'\n'+ownGuard,
    cli.replace(ownGuard,'').replace(modelWork,modelWork+';\n'+ownGuard),
  ])assert.throws(()=>requireEarlyOwnGuard(changed),'Absent, one-flag, duplicate and late guards are refused');
});

test(sourceIssued?'SOURCE issued CURRENT input producer rejects invalid call forms before input or IO':'SOURCE CURRENT native input producer refuses unissued before input or IO',async()=>{
  const {produceCurrentSourceNativeInputs,prepareCurrentSourceNativeProfile}=await import('./fixtures/source19-current-normal-inputs.mjs');
  const source=await import('./lib/source-producer-successor-source.mjs');
  if(!sourceIssued){
  assert.equal(source.SOURCE_PRODUCER_VERSION,null);assert.equal(source.SOURCE_PRODUCER_BINDING,null);assert.equal(source.SOURCE_PRODUCER_OUTPUT,null);  }else{source.requireSourceProducerBinding();source.requireSourceProducerOutput();}
  let inputs=0,fetches=0,fileIO=0;const untouched=new Proxy({},{get(){inputs++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
    ownKeys(){inputs++;throw new Error('UNEXPECTED_INPUT_ENUMERATION');},getPrototypeOf(){inputs++;throw new Error('UNEXPECTED_INPUT_PROTOTYPE');}});
  const beforeFetch=globalThis.fetch,closedFetch=async()=>{fetches++;throw new Error('UNEXPECTED_FETCH');};
  const fileMethods=['readFile','writeFile','lstat','realpath','mkdir','open'],beforeFiles=Object.fromEntries(fileMethods.map(name=>[name,fs[name]]));
  globalThis.fetch=closedFetch;
  for(const name of fileMethods)fs[name]=()=>{fileIO++;throw new Error('UNEXPECTED_FILE_IO');};
  try{
    if(!sourceIssued){
      await assert.rejects(produceCurrentSourceNativeInputs(untouched),/SOURCE_PRODUCER_UNISSUED/);
      await assert.rejects(prepareCurrentSourceNativeProfile(),/SOURCE_PRODUCER_UNISSUED/);
    }else{
      await assert.rejects(produceCurrentSourceNativeInputs(untouched,untouched),{code:'ERR_ASSERTION'});
      await assert.rejects(prepareCurrentSourceNativeProfile(untouched),{code:'ERR_ASSERTION'});
    }
  }
  finally{for(const[name,method]of Object.entries(beforeFiles))fs[name]=method;assert.equal(globalThis.fetch,closedFetch);globalThis.fetch=beforeFetch;}
  assert.equal(inputs,0);assert.equal(fetches,0);assert.equal(fileIO,0);
});
