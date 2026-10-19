import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {LAST_MILE_ENCLOSURE_BINDING,LAST_MILE_ENCLOSURE_OUTPUT,lastMileEnclosureMigration,
  readLastMileEnclosureCanonicalSource} from './lib/last-mile-enclosure-successor-source.mjs';
import {lastMileEnclosureRequiredMigrations} from './integrated-cutover-readiness.mjs';
import {assertLastMileEnclosurePlanCaller,selectLastMileEnclosureRoute,verifyLastMileEnclosurePlan}
  from './verify-last-mile-enclosure-plan.mjs';
import {verifyLastMileEnclosurePrewriteReadiness,verifyLastMileEnclosureInstalledReadiness,
  assertLastMileEnclosureRuntimeAudit} from './last-mile-enclosure-prewrite-readiness.mjs';

// This is a normal targeted source command, not an invented passing tuple.
// NULL source exercises ONLY the early unissued boundary. Actual issued
// source automatically exercises the real current SQL/plan cases below.
const unissued=LAST_MILE_ENCLOSURE_BINDING===null||LAST_MILE_ENCLOSURE_OUTPUT===null;
const script=fileURLToPath(new URL('./verify-last-mile-enclosure-plan.mjs',import.meta.url));
const migrationsDirectory=fileURLToPath(new URL('../supabase/migrations',import.meta.url));
const refusal=/LAST_MILE_ENCLOSURE_(?:OUTPUT_)?UNISSUED/;
if(unissued){
  test('UNISSUED selector refuses before caller getters or unknown/extra pending input',()=>{
    let reads=0;const poison=Object.defineProperty({},'migrationListText',{get(){reads++;throw new Error('CALLER_READ_BEFORE_ISSUANCE');}});
    assert.throws(()=>selectLastMileEnclosureRoute(poison),refusal);assert.equal(reads,0);
    for(const migrationListText of ['unknown',
      'Local | Remote | Time (UTC)\n20991019060000 | | unknown-extra-pending'])
      assert.throws(()=>selectLastMileEnclosureRoute({migrationListText}),refusal);
    // These are NOT evidence that issued unknown/pending parsing was reached.
  });
  test('UNISSUED normal plan/readiness/audit refuse before paths credentials or supplied reports',async()=>{
    const poison=Object.defineProperty({},'environment',{get(){throw new Error('ENV_READ_BEFORE_ISSUANCE');}});
    assert.throws(()=>assertLastMileEnclosurePlanCaller(poison),refusal);
    await assert.rejects(verifyLastMileEnclosurePlan(poison),refusal);
    await assert.rejects(verifyLastMileEnclosurePrewriteReadiness(poison),refusal);
    await assert.rejects(verifyLastMileEnclosureInstalledReadiness(poison),refusal);
    assert.throws(()=>assertLastMileEnclosureRuntimeAudit({status:'passed'}),refusal);
  });
  test('UNISSUED real CLI stops before missing migration-list file read',()=>{
    const actual=spawnSync(process.execPath,[script,'--select','--migration-list',path.join(migrationsDirectory,'must-not-be-read.txt')],
      {encoding:'utf8',windowsHide:true});
    assert.equal(actual.status,1);assert.match(actual.stderr,refusal);assert(!actual.stderr.includes('ENOENT'));
  });
}else{
  const descriptor=lastMileEnclosureMigration(),required=lastMileEnclosureRequiredMigrations();
  const environment=(installed=false)=>({GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',
    GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_RUN_ID:'1',GITHUB_SHA:'a'.repeat(40),
    RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN:installed?'false':'true',
    RAVRADAR_LAST_MILE_ENCLOSURE_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',
    RAVRADAR_LAST_MILE_ENCLOSURE_WRITER_ACTIVE:'false',RAVRADAR_WEATHER_CACHE_ONLY:'true'});
  const list=(installed=false)=>'Local | Remote | Time (UTC)\n'+required
    .map(row=>`${row.version} | ${installed||row.version!==descriptor.version?row.version:''} | synthetic-metadata-only`).join('\n');
  const dry='DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '
    +descriptor.filename+'\nFinished supabase db push.';
  const noop='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.';
  test('issued source reads actual canonical584 and only the real060000 pending plan',async()=>{
    assert.equal(required.length,53);assert.equal(descriptor.version,'20261019060000');
    const source=await readLastMileEnclosureCanonicalSource();assert.equal(source.admission,'NO_ADMISSION');
    assert.equal(selectLastMileEnclosureRoute({migrationListText:list(),environment:environment()}),'before');
    const result=await verifyLastMileEnclosurePlan({phase:'before',migrationListText:list(),dryRunText:dry,
      migrationsDirectory,environment:environment()});
    assert.deepEqual(result.pendingVersions,[descriptor.version]);
  });
  test('actual installed source is read-only reentry with no consumed installation replay',async()=>{
    assert.equal(selectLastMileEnclosureRoute({migrationListText:list(true),environment:environment(true)}),'installed');
    assert.deepEqual((await verifyLastMileEnclosurePlan({phase:'installed',migrationListText:list(true),dryRunText:noop,
      migrationsDirectory,environment:environment(true)})).pendingVersions,[]);
    assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list(true),environment:environment()}));
  });
  test('unknown future or intermediate migrations and extra local pending sources fail issued selector',()=>{
    for(const suffix of ['\n20991019060000 | 20991019060000 | unknown',
      '\n20261018010000 | 20261018010000 | unknown-intermediate',
      '\n20261019060001 | | extra-pending'])
      assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list()+suffix,environment:environment()}),
        /LAST_MILE_ENCLOSURE_UNKNOWN_POST_CUTOVER_VERSION/);
  });
  test('missing immediate predecessor or local584 source cannot masquerade as initial installation',()=>{
    assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list()
      .replace('20261017140000 | 20261017140000','20261017140000 | '),environment:environment()}));
    assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list()
      .replace(`${descriptor.version} | `,' | '),environment:environment()}));
  });
  test('historical archived migrations and duplicate584 rows remain rejected',()=>{
    for(const version of ['20261014140000','20261015030000','20261016030000',descriptor.version])
      assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list()+`\n${version} | ${version} | forbidden`,environment:environment()}));
  });
  test('real plan refuses no-op before install or any additional dry-run migration',async()=>{
    await assert.rejects(verifyLastMileEnclosurePlan({phase:'before',migrationListText:list(),dryRunText:noop,
      migrationsDirectory,environment:environment()}));
    await assert.rejects(verifyLastMileEnclosurePlan({phase:'before',migrationListText:list(),
      dryRunText:dry.replace('Finished supabase db push.',' • 20991019060001_extra.sql\nFinished supabase db push.'),
      migrationsDirectory,environment:environment()}));
  });
  test('old SAME_H0 and historical grant flags cannot authorize the new installation phase',()=>{
    for(const key of ['RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_CURRENT_FAMILY_EPOCH_UPGRADE_OPT_IN',
      'RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN'])
      assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list(),environment:{...environment(),[key]:'true'}}),
        /LAST_MILE_ENCLOSURE_EXCLUSIVE_SOURCE_PHASE/);
    assert.throws(()=>selectLastMileEnclosureRoute({migrationListText:list(),environment:{...environment(),
      RAVRADAR_LAST_MILE_ENCLOSURE_WRITER_ACTIVE:'true'}}));
  });
  test('issued prewrite refuses fake archive object before transport credentials or schema queries',async()=>{
    let calls=0;
    await assert.rejects(verifyLastMileEnclosurePrewriteReadiness({archiveCapability:{status:'passed'},
      centralContract:{},targetReferenceAt:'2026-10-19T06:00:00.000Z',migrationListText:list(),dryRunText:dry,
      migrationsDirectory,environment:environment(),url:'https://example.invalid',serviceRoleKey:'not-used',accessToken:'not-used',
      fetchImpl(){calls++;throw new Error('UNEXPECTED_NETWORK');}}),/UNPAIRED_HANDLE_INVALID/);
    assert.equal(calls,0);
  });
  test('saved generic PASS report is never a substitute for actual runtime audit inputs',()=>{
    assert.throws(()=>assertLastMileEnclosureRuntimeAudit({status:'passed'}),/LAST_MILE_ENCLOSURE_FIXED_READINESS_ARGUMENTS/);
  });
}
