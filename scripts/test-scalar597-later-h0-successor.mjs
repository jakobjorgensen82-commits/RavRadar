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
import {assertScalar597LaterH0MigrationPlan,installed593Original591RequiredMigrations,
  accountStatisticsAssistantRequiredMigrations,scalar597LaterH0RequiredMigrations}
  from './integrated-cutover-readiness.mjs';
import {compareScalar597LaterH0Successor,prepareScalar597NativeFixtureWindow} from './lib/assistant-later-h0-postgres.mjs';
import {currentMemoryWarmupPreservationInventorySql} from './lib/current-memory-warmup-postgres.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=(root,relative)=>import(pathToFileURL(path.join(root,relative)).href);
const H0='2026-11-03T20:00:00.000Z';
const later='2026-11-04T00:00:00.000Z';
const descriptor={modelBinding:{modelBundleSha256:before.I},productionReferenceAt:H0,
  contractHashes:{continuationStateContractSha256:before.T}};

test('scalar597 fixture-vindue bevarer hele baseline og triggerhistorik før673-pakker',async t=>{
  // Streng syntetisk transport for den FAKTISKE native-adapters fixturevindue.
  // Ingen PostgreSQL-/RPC-bevispåstand og ingen original- eller B/S-kapabilitet.
  const oldBinding={...ravScoreModelBinding(),modelBundleSha256:before.I};
  const oldProfile={sourceVersion:'4.0.594',modelBundleSha256:before.I,syntheticUnknownField:'bevares'};
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const inventory=currentMemoryWarmupPreservationInventorySql('preserved');
  const prior=await readInstalled593Original591CanonicalSource();
  const trigger=definition(prior.canonicalSource,'version_admin_document');
  assert(trigger.includes("'ravscore-operational-model-activation'"));
  assert(!trigger.includes("'ravscore-profile-selection'"),'Profilændringer danner faktisk historik i den normale trigger');
  const source=await fs.readFile(path.join(ROOT,'scripts/lib/assistant-later-h0-postgres.mjs'),'utf8');
  const normalStart=source.indexOf("phase='BEFORE_INVENTORY';");
  const normalInstall=source.indexOf("phase='INSTALL';",normalStart);
  assert(normalStart>=0&&normalInstall>normalStart);
  assert.equal(source.slice(normalStart,normalInstall).split('await prepareScalar597NativeFixtureWindow(').length,2,
    'Den normale adapter skal bruge det samme prøvede vindue før sin baseline og SQL');
  const fixture=(fault=null)=>{
    let documents=new Map([['synthetic-original',{document_key:'synthetic-original',payload:{unknown:17},
      version:9,extraColumn:'bevares'}]]);
    let history=[{document_key:'synthetic-original',payload:{unknown:16},version:8,extraColumn:'bevares'}];
    const initialDocuments=structuredClone(documents),initialHistory=structuredClone(history);
    const nativeError=new Error('NATIVE_POSTGRES_SQL_COMMAND_FAILED');
    let puts=0,transactions=0,inventoryReads=0;
    const selectedDocuments=()=>[...documents].filter(([key])=>[opKey,profileKey].includes(key))
      .sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,row])=>row);
    const fingerprint=()=>JSON.stringify({documents:[...documents].sort(([a],[b])=>a<b?-1:a>b?1:0),history,
      unknownOriginalBankRow:{allFields:'bevares'}});
    const allowed=bundle=>documents.get(opKey)?.payload.status==='INTEGRATED_ACTIVE'
      &&documents.get(opKey)?.payload.activeModelBinding.modelBundleSha256===bundle
      &&documents.get(profileKey)?.payload.modelBundleSha256===bundle;
    const applyPuts=query=>{
      const pattern=/insert into admin_documents\(document_key,payload\) values\('([^']+)',\$scalar_trip\$([\s\S]*?)\$scalar_trip\$::jsonb\) on conflict\(document_key\) do update set payload=excluded.payload;/g;
      let count=0;
      for(const row of query.matchAll(pattern)){
        puts++;count++;const key=row[1],payload=JSON.parse(row[2]),old=documents.get(key);
        if(old&&JSON.stringify(old.payload)===JSON.stringify(payload))continue;
        if(old&&key!==opKey)history.push({document_key:key,payload:structuredClone(old.payload),version:old.version});
        documents.set(key,old?{...old,payload,version:old.version+1}:{document_key:key,payload,version:1});
      }
      assert(count>0);return count;
    };
    if(fault==='existing')documents.set(profileKey,{document_key:profileKey,payload:{modelBundleSha256:before.I},version:4});
    const psql=async query=>{
      if(query===inventory){inventoryReads++;return fingerprint();}
      if(query.startsWith('select to_regprocedure(')&&query.endsWith(' is null;'))return 'f';
      if(query.startsWith('select jsonb_object_agg(p.oid::regprocedure::text,'))return '{"wholeSyntheticFunctionCatalog":"bevares"}';
      if(query.startsWith('select coalesce(jsonb_agg(to_jsonb(d) order by document_key)'))return JSON.stringify(selectedDocuments());
      if(query.startsWith('select coalesce(jsonb_agg(to_jsonb(v)'))return JSON.stringify(history);
      if(query.startsWith('insert into admin_documents(')){applyPuts(query);return '';}
      if(query.includes("select public.consume_public_request_limit('ravradar-assistant:minute'"))return 't';
      if(query.startsWith("set request.jwt.claim.role='service_role';set role service_role;select public.ravradar_trip_v3_active_binding_admitted(")){
        const bundle=query.includes("'"+before.I+"'")?before.I:profile.binding.I;
        assert(query.includes("'"+bundle+"'"));return allowed(bundle)?'t':'f';
      }
      if(query.startsWith('begin;')){
        transactions++;assert(query.endsWith('rollback;'));
        assert(query.includes("set local request.jwt.claim.role='service_role';set local role service_role;"));
        if(fault==='command')throw nativeError;
        const oldDocuments=structuredClone(documents),oldHistory=structuredClone(history);
        applyPuts(query);
        const observed={oldAllowed:allowed(before.I),nextAllowed:allowed(profile.binding.I)};
        documents=oldDocuments;history=oldHistory;
        if(fault==='document')documents.get(opKey).payload.unexpected='afvises';
        if(fault==='history')history.push({document_key:'synthetic-unrelated-history',payload:{unknown:99},version:1});
        return JSON.stringify(observed);
      }
      throw new Error('Uventet SQL-type i den afgrænsede syntetiske transport');
    };
    return {psql,initialDocuments,initialHistory,nativeError,get documents(){return documents;},get history(){return history;},
      get puts(){return puts;},get transactions(){return transactions;},get inventoryReads(){return inventoryReads;},fingerprint};
  };
  await t.test('hele inventaret tages efter fixtureoprettelse og forbliver ens efter rollback',async()=>{
    const db=fixture();
    const window=await prepareScalar597NativeFixtureWindow({psql:db.psql,oldBinding,newBundle:profile.binding.I,oldProfile});
    assert.equal(window.preservedSql,inventory);assert.equal(db.inventoryReads,1);
    assert.equal(db.documents.size,3);assert.equal(window.preserved,db.fingerprint());
    assert.deepEqual(db.history,db.initialHistory);
    assert.deepEqual(db.documents.get('synthetic-original'),db.initialDocuments.get('synthetic-original'));
    const report=await window.checkIntermediate();
    assert.equal(report.pendingBothRefused,true);assert.equal(report.nextActiveAfterCompletion,true);
    assert.equal(report.oldRefusedAfterCompletion,true);assert.equal(report.activeDocumentsUnchangedBySql,true);
    assert.equal(db.transactions,2);assert.equal(window.preserved,db.fingerprint());
    assert.deepEqual(db.history,db.initialHistory);
  });
  for(const fault of ['document','history'])await t.test('ufuldstændig rollback af '+fault+' afvises uden filtrering',async()=>{
    const db=fixture(fault);
    const window=await prepareScalar597NativeFixtureWindow({psql:db.psql,oldBinding,newBundle:profile.binding.I,oldProfile});
    await assert.rejects(window.checkIntermediate(),{code:'ERR_ASSERTION'});
  });
  await t.test('psql-fejl bevares og udløser hverken fallback eller gentagelse',async()=>{
    const db=fixture('command');
    const window=await prepareScalar597NativeFixtureWindow({psql:db.psql,oldBinding,newBundle:profile.binding.I,oldProfile});
    await assert.rejects(window.checkIntermediate(),error=>error===db.nativeError);
    assert.equal(db.transactions,1);assert.equal(db.puts,2);assert.equal(window.preserved,db.fingerprint());
  });
  await t.test('ukendt eksisterende profildokument afvises før nogen fixtureskrivning',async()=>{
    const db=fixture('existing'),original=structuredClone(db.documents);
    await assert.rejects(prepareScalar597NativeFixtureWindow({psql:db.psql,oldBinding,newBundle:profile.binding.I,oldProfile}),
      {code:'ERR_ASSERTION'});
    assert.equal(db.puts,0);assert.equal(db.inventoryReads,0);assert.deepEqual(db.documents,original);
    assert.deepEqual(db.history,db.initialHistory);
  });
});

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

test('normal native597 callback retains exact seeded history and genuine594 fixtures before its SQL boundary',async t=>{
  const host=await fs.readFile(path.join(ROOT,'scripts/lib/checkpoint-cas-native-postgres.mjs'),'utf8');
  assert(host.includes("create table supabase_migrations.schema_migrations(version text primary key);\ninsert into supabase_migrations.schema_migrations values('20261010130000');"));
  const nativeBefore=['20261010130000','20261012200000','20261013210000','20261013220000','20261013230000',
    '20261016060000','20261017020000','20261017140000','20261019060000','20261019100000'];
  const baseline=accountStatisticsAssistantRequiredMigrations(),prior=installed593Original591RequiredMigrations();
  const next=scalar597LaterH0RequiredMigrations();
  assert.equal(baseline.length,54);assert.equal(prior.length,61);assert.equal(next.length,62);
  assert.deepEqual(baseline.slice(44).map(row=>row.version),nativeBefore);
  const source=await fs.readFile(path.join(ROOT,'scripts/test-protected-ravscore-continuation-checkpoint.mjs'),'utf8');
  const start=source.indexOf('const samples = Array.from'),end=source.indexOf('const sourceDocument = sourceDocumentAt(',start);
  assert(start>=0&&end>start);
  const factory=await fixtureFactory(ROOT,source.slice(start,end));
  const normal=await load(ROOT,'scripts/ravscore-continuation-checkpoint.mjs');
  const work=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'rr597-native-history-'));
  const stop=Object.freeze({synthetic:'first-real597-native-sql-boundary'});
  const archived=await Promise.all(prior.slice(54).map(row=>fs.readFile(path.join(ROOT,'supabase/migrations',row.filename),'utf8')));
  let rows=[...nativeBefore],historyReads=0,archiveCalls=0,originals=0;
  const options={root:work,atHour:factory.atHour,sourceDocumentAt:factory.sourceDocumentAt,
    saveCheckpoint:normal.saveRavScoreContinuationCheckpoint,runSql:async()=>{throw Error('No SQL execution');}};
  t.mock.method(console,'error',()=>{});
  try{
    await assert.rejects(compareScalar597LaterH0Successor({...options,psql:async query=>{
      if(query==='select json_agg(version order by version) from supabase_migrations.schema_migrations;'){
        historyReads++;assert(historyReads<=2);return JSON.stringify(rows);
      }
      if(query==='select max(version) from supabase_migrations.schema_migrations;')throw stop;
      if(archiveCalls<7&&query===archived[archiveCalls]){archiveCalls++;return '';}
      const inserted=/^insert into supabase_migrations[.]schema_migrations values\('(\d+)'\);$/.exec(query);
      if(inserted){assert.equal(inserted[1],prior[53+archiveCalls].version);rows.push(inserted[1]);return '';}
      const old=/^insert into native_checkpoint_payloads values\('scalar597-original594-(same|newer)',\$scalar_original_fixture\$(.*)\$scalar_original_fixture\$::jsonb\);$/.exec(query);
      assert(old,'Only the two normal genuine594 fixtures precede the new SQL boundary');
      const payload=JSON.parse(old[2]);
      assert.equal(payload.modelBinding.modelBundleSha256,before.I);
      assert.equal(payload.continuationStateContractSha256,before.T);
      assert.equal(payload.productionReferenceAt,factory.atHour(old[1]==='same'?49:50));
      assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      originals++;return '';
    }}),error=>error===stop);
    assert.equal(historyReads,2);assert.equal(archiveCalls,7);assert.equal(originals,2);
    assert.deepEqual(rows,prior.slice(44).map(row=>row.version));assert.equal(rows.length,17);
    assert.equal(next.slice(44).length,18);
    for(const invalid of [nativeBefore.slice(1),[...nativeBefore,'20990101000000'],[...nativeBefore,nativeBefore.at(-1)]]){
      let calls=0;
      await assert.rejects(compareScalar597LaterH0Successor({...options,psql:async query=>{
        calls++;assert.equal(query,'select json_agg(version order by version) from supabase_migrations.schema_migrations;');
        return JSON.stringify(invalid);
      }}),{code:'ERR_ASSERTION'});
      assert.equal(calls,1,'Changed history must stop before any archived SQL or original fixture');
    }
  }finally{
    t.mock.restoreAll();
    for(const name of ['same','newer'])for(const kind of ['conditions','checkpoint'])
      await fs.unlink(path.join(work,'scalar597-original594-'+name+'-'+kind+'.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
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
