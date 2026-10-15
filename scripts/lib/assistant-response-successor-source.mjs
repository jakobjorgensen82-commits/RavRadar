// Separate response successor. Issued213/220/230/14140000 remain immutable.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {kbDefinition,statisticsSchema2Initializer} from './assistant-knowledge-successor-source.mjs';
import {readCurrentGridCanonicalSource} from './current-grid-successor-source.mjs';
import {buildStatisticsPreferenceRevision,STATISTICS_REVISION_MIGRATION}
  from '../build-statistics-preference-revision.mjs';

export const ASSISTANT_RESPONSE_MIGRATION=Object.freeze({
  version:'20261015030000',id:'20261015030000_assistant_response_bound_successor',
  filename:'20261015030000_assistant_response_bound_successor.sql',
});
// ROOT alone freezes these from the actual, merged/versioned product source.
// No caller override, historical alias or guessed tuple/output digest.
export const ASSISTANT_RESPONSE_BINDING=Object.freeze({
  version:'20261015030000',
  C:'65492ff076d0424beb11e625f88631dea92619ee536afcc5131f6f7f767d8ccf',
  I:'7c2bf57395aaa2a7d81db5fd9e4b5948c99f338225315a85144661fcf8047bc0',
  T:'af93c8536d8752c4de937c06e00372e4f4dc19fd5019fcd98523bd9efa0fb478',
  candidateManifestSha256:'65492ff076d0424beb11e625f88631dea92619ee536afcc5131f6f7f767d8ccf',
  integratedManifestSha256:'5ca43f4a7495a32d0f06ca230d5527613f7326d282eb8ecf221f3b7dd580cc8d',
});
export const ASSISTANT_RESPONSE_SOURCE_PINS=Object.freeze({
  migrationSha256:'0a531836a28151acbad609419e77de746402a165e269f7633eb5c43a64685072',
  canonicalSha256:'13e0cb0de6a48c3dc15dfd42b6bb7b062f92b1cf86218c8bf29f5c233ff5f8e7',
  schema2InitializerSha256:'ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305',
});
export const RESPONSE_PROJECTION='ravradar_ravscore_checkpoint_rsp_predecessor_projection';
export const RESPONSE_SCHEMA1_SHA='a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8';
export const RESPONSE_BEFORE_PINS=Object.freeze({
  migrationSha256:'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae',
  canonicalSha256:'52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894',
  schema2InitializerSha256:'ee68e62d59e7d1c92ec0f0629c669f7e9c9756f30e86bc08af21cebdedbbe305',
});
const CP='ravradar_ravscore_checkpoint_';
export const RESPONSE_REPLACEMENTS=Object.freeze([
  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  'ravradar_trip_v3_binding_allowed',CP+'predecessor_payload_valid',CP+'cas',CP+'contract',
]);
const MIGRATIONS=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../supabase/migrations');
const IMMUTABLE=Object.freeze([
  ['20261010130000_owner_export_origin_bound_successor.sql','55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6'],
  ['20261012200000_checkpoint_cas_single_projection_successor.sql','b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18'],
  ['20261013210000_account_assistant_original_bound_successor.sql','80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d'],
  ['20261013220000_current_grid_original_bound_successor.sql','77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b'],
  ['20261013230000_account_statistics_revision.sql',RESPONSE_BEFORE_PINS.migrationSha256],
]);
// Source archive is bound to this module's repository, not the active SQL view.
// A direct installation view must omit this never-installed migration.
const ISSUED_KNOWLEDGE_ARCHIVE=Object.freeze({
  filename:'20261014140000_assistant_knowledge_bound_successor.sql',
  sha256:'64f51a8a4a44e1094c97bfdf4fd48db7a276393410b27bb370fbd4ea2af1e74f',
});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
export function requireAssistantResponseBinding(){
  assert.equal(arguments.length,0,'No caller binding or source override');
  assert(ASSISTANT_RESPONSE_BINDING,'RESPONSE_BINDING_UNFROZEN');
  const value=ASSISTANT_RESPONSE_BINDING;
  assert.deepEqual(Object.keys(value).sort(),
    ['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  assert.equal(value.version,ASSISTANT_RESPONSE_MIGRATION.version);
  for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])
    assert.match(value[key],/^[a-f0-9]{64}$/);
  assert.equal(new Set([value.C,value.I,value.T]).size,3);
  return value;
}
export function assistantResponseMigration(){
  assert.equal(arguments.length,0,'No caller migration override');
  requireAssistantResponseBinding();
  return ASSISTANT_RESPONSE_MIGRATION;
}
export async function readAssistantResponseBeforeSource(options={}){
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert(Object.keys(options).every(key=>key==='migrationsDirectory'),'Only the normal SQL fixture-directory seam');
  const {migrationsDirectory=MIGRATIONS}=options;
  assert.equal(typeof migrationsDirectory,'string');assert(path.isAbsolute(migrationsDirectory));
  const archiveFilename=path.join(MIGRATIONS,ISSUED_KNOWLEDGE_ARCHIVE.filename);
  const archiveStat=await fs.lstat(archiveFilename);
  assert(archiveStat.isFile()&&!archiveStat.isSymbolicLink(),'Regular fixed source archive required');
  assert.equal(sha(await fs.readFile(archiveFilename)),ISSUED_KNOWLEDGE_ARCHIVE.sha256,
    'Exact module-bound issued14140000 source archive');
  for(const [file,digest] of IMMUTABLE){
    const filename=path.join(migrationsDirectory,file),stat=await fs.lstat(filename);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular issued SQL required');
    assert.equal(sha(await fs.readFile(filename)),digest,'Exact raw issued SQL: '+file);
  }
  const {canonicalSource,accountSource:historicalSchema1}=
    await readCurrentGridCanonicalSource({migrationsDirectory});
  assert.equal(sha(canonicalSource),RESPONSE_BEFORE_PINS.canonicalSha256);
  assert.equal(sha(historicalSchema1),RESPONSE_SCHEMA1_SHA);
  assert(!canonicalSource.includes(CP+'kb_predecessor_projection'),'No archived14140000 runtime projection');
  const statistics=await buildStatisticsPreferenceRevision({migrationsDirectory});
  assert.equal(statistics.migrationSha256,RESPONSE_BEFORE_PINS.migrationSha256);
  assert.deepEqual(await fs.readFile(path.join(migrationsDirectory,STATISTICS_REVISION_MIGRATION.filename)),
    Buffer.from(statistics.migration),'Exact normal230 source');
  assert.equal(statistics.afterExpected.schemaVersion,2);
  const statisticsSchema2Source=statisticsSchema2Initializer(historicalSchema1,statistics.revisionSource);
  assert.equal(sha(statisticsSchema2Source),RESPONSE_BEFORE_PINS.schema2InitializerSha256);
  return Object.freeze({canonicalSource,historicalSchema1,statisticsSchema2Source,
    statisticsSchemaVersion:2,statisticsExpected:statistics.afterExpected,migration:STATISTICS_REVISION_MIGRATION});
}
export async function readAssistantResponseCanonicalSource(options={}){
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert(Object.keys(options).every(key=>key==='migrationsDirectory'),'Only the normal SQL fixture-directory seam');
  const {migrationsDirectory=MIGRATIONS}=options;
  assert.equal(typeof migrationsDirectory,'string');assert(path.isAbsolute(migrationsDirectory));
  const migrationDescriptor=assistantResponseMigration();
  assert(ASSISTANT_RESPONSE_SOURCE_PINS,'RESPONSE_SQL_SOURCE_UNFROZEN');
  const pins=ASSISTANT_RESPONSE_SOURCE_PINS;
  assert.deepEqual(Object.keys(pins).sort(),['canonicalSha256','migrationSha256','schema2InitializerSha256']);
  for(const digest of Object.values(pins))assert.match(digest,/^[a-f0-9]{64}$/);
  assert.equal(pins.schema2InitializerSha256,RESPONSE_BEFORE_PINS.schema2InitializerSha256);
  const read=async(file,digest)=>{
    const filename=path.join(migrationsDirectory,file),stat=await fs.lstat(filename);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular issued SQL required');
    const bytes=await fs.readFile(filename);assert.equal(sha(bytes),digest,'Exact raw issued SQL: '+file);
    return bytes.toString('utf8');
  };
  const prior=await readAssistantResponseBeforeSource({migrationsDirectory});
  assert.equal(prior.migration.version,'20261013230000');
  assert.equal(sha(prior.canonicalSource),RESPONSE_BEFORE_PINS.canonicalSha256);
  assert.equal(sha(prior.historicalSchema1),RESPONSE_SCHEMA1_SHA);
  assert.equal(prior.statisticsSchemaVersion,2);
  assert.equal(sha(prior.statisticsSchema2Source),pins.schema2InitializerSha256);
  const migration=await read(migrationDescriptor.filename,pins.migrationSha256);
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [RESPONSE_PROJECTION,...RESPONSE_REPLACEMENTS]);
  let canonicalSource=prior.canonicalSource;
  for(const name of RESPONSE_REPLACEMENTS)
    canonicalSource=once(canonicalSource,kbDefinition(canonicalSource,name),kbDefinition(migration,name));
  const insertion=kbDefinition(migration,RESPONSE_PROJECTION)+'\nrevoke all on function public.'+RESPONSE_PROJECTION
    +'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  const anchor=kbDefinition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...RESPONSE_REPLACEMENTS].reverse())
    inverse=once(inverse,kbDefinition(inverse,name),kbDefinition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole immutable220 canonical inverse');
  assert(!canonicalSource.includes(CP+'kb_predecessor_projection'),'Archived14140000 is not a runtime phase');
  return Object.freeze({...prior,canonicalSource,migration:migrationDescriptor});
}
