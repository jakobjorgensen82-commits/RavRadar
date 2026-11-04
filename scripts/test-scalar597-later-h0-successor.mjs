import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {withSource594OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {isScalar597OriginParentBinding,assertScalar597OriginParentMetadata}
  from './lib/established-native-current-origin.mjs';
import {
  INACTIVE_SCALAR597_LATER_H0_SUCCESSOR as profile,
  SCALAR597_LATER_H0_BEFORE as before,
  assertScalar597LaterH0CheckpointInverse,
  assistantLaterH0Definition as definition,
  readInstalled593Original591CanonicalSource,
} from './lib/assistant-later-h0-successor-source.mjs';
import {buildScalar597LaterH0BindingSuccessor} from './build-assistant-later-h0-successor.mjs';
import {assertScalar597LaterH0MigrationPlan,installed593Original591RequiredMigrations}
  from './integrated-cutover-readiness.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=(root,relative)=>import(pathToFileURL(path.join(root,relative)).href);
const H0='2026-11-03T20:00:00.000Z';
const later='2026-11-04T00:00:00.000Z';
const descriptor={modelBinding:{modelBundleSha256:before.I},productionReferenceAt:H0,
  contractHashes:{continuationStateContractSha256:before.T}};

test('fixed 594 parent and normal callers require a strictly newer whole hour',()=>{
  assert.equal(profile.assertTarget(descriptor,later),true);
  assert.throws(()=>profile.assertTarget(descriptor,H0),/SCALAR597_STRICTLY_LATER/);
  assert.throws(()=>profile.assertTarget(descriptor,'2026-11-03T19:00:00.000Z'),/SCALAR597_STRICTLY_LATER/);
  assert.throws(()=>profile.assertTarget(descriptor,'2026-11-04T00:15:00.000Z'));
  assert.throws(()=>profile.assertTarget({...descriptor,modelBinding:{modelBundleSha256:'0'.repeat(64)}},later));
  const caller={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',
    GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ATTEMPT:'1',OPERATIONAL_ACTION:'integrated-historical-maintenance'};
  for(const name of ['Run current RavRadar weather once','Update weather and deploy RavRadar']){
    const normal={...caller,GITHUB_WORKFLOW:name};
    assert.doesNotThrow(()=>profile.assertCaller(normal));
    assert.throws(()=>profile.assertCaller({...normal,CHECKPOINT_ONLY:'true'}));
    assert.throws(()=>profile.assertCaller({...normal,COMPLETED_PRIVATE_RUNTIME:'true'}));
  }
  assert.throws(()=>profile.assertCaller({...caller,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair'}));
});

test('normal constructor keeps installed 594 and every earlier SQL body, adding a later-only CAS arm',async()=>{
  const migrations=installed593Original591RequiredMigrations();
  assert.equal(migrations.length,61);assert.equal(migrations.at(-1).version,before.version);
  await assert.rejects(buildScalar597LaterH0BindingSuccessor({version:'20261103012633'}));
  const prior=await readInstalled593Original591CanonicalSource();
  // A fixed test timestamp. The constructor returns bytes in memory only.
  const built=await buildScalar597LaterH0BindingSuccessor({version:'20990101000000'});
  assert.equal(built.sameH0Capability,false);assert.equal(built.wholeCanonicalInverse,true);
  assert.equal(built.numericalSqlRulesChanged,false);assert.equal(built.migrationIssued,false);
  assert.equal(built.originalCanonicalSha256,before.canonicalSha256);assert.equal(built.aliases.length,2);
  const cas='ravradar_ravscore_checkpoint_cas';
  const branch="    elsif p_target_reference > v_central_reference\n"
    +"      and p_payload ->> 'continuationStateContractSha256' = '"+built.nextBinding.T+"'\n"
    +"      and public."+built.aliases[1].name+"(v_payload,v_central_reference)\n"
    +"    then\n      -- Authenticated immutable594 predecessor; only a strictly LATER ordinary generation.\n"
    +"      v_central_is_compatible_predecessor := false;\n";
  const changed=definition(built.canonicalSource,cas);
  assert.equal(changed.split(branch).length,2);
  assert.equal(changed.replace(branch,''),definition(prior.canonicalSource,cas));
  assert.match(built.migration,/ASSISTANT_LATER_H0_EXACT_INSTALLED594_REQUIRED/);
  const trip='ravradar_trip_v3_binding_allowed';
  const oldTrip=definition(prior.canonicalSource,trip);
  let nextTrip=definition(built.canonicalSource,trip);
  for(const key of ['I','C']){
    assert(nextTrip.includes("'"+before[key]+"'"),'The active 594 binding stays permitted');
    const appended=",\n        '"+built.nextBinding[key]+"'";
    assert.equal(nextTrip.split(appended).length,2);
    nextTrip=nextTrip.replace(appended,'');
  }
  assert.equal(nextTrip,oldTrip,'Only the future binding is added to the trip allowlist');
  assert(!built.changes.some(change=>change.name.includes('active_binding_admitted')));
  if(profile.binding===null)
    await assert.rejects(assertScalar597LaterH0MigrationPlan(),/SCALAR597_LATER_H0_UNISSUED/);
});

async function fixtureFactory(root,fixture){
  const dependencies=[
    ['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
  ];
  const imports=dependencies.map(([name,file])=>'import { '+name+' } from '+JSON.stringify(pathToFileURL(path.join(root,file)).href)+';');
  const support=[
    "import crypto from 'node:crypto';","const PART_COUNT=673;",
    "const START=Date.parse('2026-08-01T00:00:00.000Z');",
    'const atHour=hour=>new Date(START+hour*3600000).toISOString();',
    'const clone=value=>JSON.parse(JSON.stringify(value));',
    "const contextFor=partId=>'sha256:'+crypto.createHash('sha256').update(partId).digest('hex');",
  ];
  const text=[...imports,...support,fixture,'export {sourceDocumentAt,atHour};'].join('\n');
  return import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
}

test('ordinary checkpoint writers preserve all 673 original states in the metadata working view',async()=>{
  const source=await fs.readFile(path.join(ROOT,'scripts/test-protected-ravscore-continuation-checkpoint.mjs'),'utf8');
  const start=source.indexOf('const samples = Array.from');
  const stop=source.indexOf('const sourceDocument = sourceDocumentAt(',start);
  assert(start>=0&&stop>start);
  const fixture=source.slice(start,stop);
  const work=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'rr597-original-fixture-'));
  let oldCheckpointPath,original;
  async function build(root,stem){
    const factory=await fixtureFactory(root,fixture);
    const normal=await load(root,'scripts/ravscore-continuation-checkpoint.mjs');
    const sourcePath=path.join(work,stem+'-conditions.json');
    const checkpointPath=path.join(work,stem+'-checkpoint.json');
    await fs.writeFile(sourcePath,JSON.stringify(factory.sourceDocumentAt(49,'rr-scalar597-synthetic-original')),{flag:'wx'});
    await normal.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot:root});
    const {loaded,partCount,continuationAvailable}=await normal.loadRavScoreContinuationCheckpointForTarget({
      checkpointPath,targetReference:factory.atHour(50),repositoryRoot:root});
    assert(loaded&&continuationAvailable);assert.equal(partCount,673);
    return {checkpointPath,raw:await fs.readFile(checkpointPath)};
  }
  try{
    await withSource594OriginalDataSource(async root=>{
      const oldOrigin=await load(root,'scripts/lib/established-native-current-origin-594-assertion.mjs');
      await assert.rejects(oldOrigin.assertFrozen594OriginSnapshotData({}));
      const saved=await build(root,'old');
      oldCheckpointPath=saved.checkpointPath;original=saved.raw;
    });
    const saved=await build(ROOT,'working');
    const prior=JSON.parse(original),incoming=JSON.parse(saved.raw);
    const authenticatedFamily={modelBinding:prior.modelBinding,
      contractHashes:{continuationStateContractSha256:prior.continuationStateContractSha256}};
    assert.equal(isScalar597OriginParentBinding(prior.modelBinding),true);
    assert.equal(isScalar597OriginParentBinding(incoming.modelBinding),false);
    assert.equal(assertScalar597OriginParentMetadata(authenticatedFamily,prior),true);
    assert.throws(()=>assertScalar597OriginParentMetadata({...authenticatedFamily,
      contractHashes:{continuationStateContractSha256:'0'.repeat(64)}},prior));
    assert.throws(()=>assertScalar597OriginParentMetadata(authenticatedFamily,incoming));
    const next={I:incoming.modelBinding.modelBundleSha256,
      C:incoming.candidateGRollbackCompanion.modelBinding.modelBundleSha256,
      T:incoming.continuationStateContractSha256};
    assert.equal(assertScalar597LaterH0CheckpointInverse(prior,incoming,next),true);
    const changed=structuredClone(incoming);
    changed.states[Object.keys(changed.states)[0]].unreviewedValue=1;
    assert.throws(()=>assertScalar597LaterH0CheckpointInverse(prior,changed,next));
    const partial=structuredClone(incoming);
    delete partial.candidateGRollbackCompanion.states[Object.keys(partial.states)[0]];
    assert.throws(()=>assertScalar597LaterH0CheckpointInverse(prior,partial,next));
    assert.deepEqual(await fs.readFile(oldCheckpointPath),original);
  }finally{
    for(const name of ['old-conditions.json','old-checkpoint.json','working-conditions.json','working-checkpoint.json'])
      await fs.unlink(path.join(work,name)).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(work);
  }
});

test('normal workflow remains B-before-S with late Edge tied to the completed new generation',async()=>{
  const weather=await fs.readFile(path.join(ROOT,'.github/workflows/reusable-weather-build.yml'),'utf8');
  const once=await fs.readFile(path.join(ROOT,'.github/workflows/run-current-weather-once.yml'),'utf8');
  assert.match(once,/name: Run current RavRadar weather once/);
  assert.match(once,/uses: \.\/\.github\/workflows\/reusable-weather-build\.yml/);
  const b=weather.indexOf('id: private-runtime-publish');
  const s=weather.indexOf('id: checkpoint-publish');
  const edge=weather.indexOf('id: current-grid-edge-publication');
  assert(b>0&&s>b&&edge>s);
  assert.match(weather.slice(s,s+1100),/private-runtime-publish\.outcome == 'success'/);
  const edgeGate=weather.slice(edge,edge+4100);
  assert.match(edgeGate,/steps\.private-runtime-publish\.outcome.* = success/);
  assert.match(edgeGate,/steps\.checkpoint-publish\.outcome.* = success/);
  assert.match(edgeGate,/steps\.current-grid-pages-artifact-seal\.outcome.* = success/);
  assert.match(once,/uses: \.\/\.github\/workflows\/reusable-pages-deploy\.yml/);
  assert.match(once,/needs\.build-and-prepare\.outputs\.should_deploy == 'true'/);
});
