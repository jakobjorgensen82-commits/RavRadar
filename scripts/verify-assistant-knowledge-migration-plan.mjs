#!/usr/bin/env node
// Proposed fixed normal CLI. No caller tuple, migration ID or source override.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSupabaseMigrationList,assertSupabaseMigrationPlan,
  assertAssistantKnowledgeMigrationsApplied,assistantKnowledgeRequiredMigrations}
  from './integrated-cutover-readiness.mjs';
import {assistantKnowledgeMigration,readAssistantKnowledgeCanonicalSource,ASSISTANT_KNOWLEDGE_SOURCE_PINS}
  from './lib/assistant-knowledge-successor-source.mjs';
const PREDECESSOR='20261013230000';

function authority(environment){
  // The descriptor refuses while tuple/ID are unfrozen, before any file/client IO.
  const descriptor=assistantKnowledgeMigration();
  assert(ASSISTANT_KNOWLEDGE_SOURCE_PINS,'KB_SQL_SOURCE_UNFROZEN');
  assert.equal(environment.GITHUB_EVENT_NAME,'workflow_dispatch');
  assert.equal(environment.GITHUB_REF,'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');
  assert(['true','false'].includes(environment.RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN));
  for(const key of ['RAVRADAR_USERDATA_UPGRADE_OPT_IN',
    'RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN','RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN',
    'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN'])
    assert.notEqual(environment[key],'true','Knowledge and historical upgrade scopes are exclusive');
  return descriptor;
}

export function selectAssistantKnowledgeRoute({migrationListText,environment=process.env}){
  const descriptor=authority(environment);
  const rows=parseSupabaseMigrationList(migrationListText);
  const remote=rows.map(row=>row.remote).filter(Boolean).sort();
  for(const {version} of assistantKnowledgeRequiredMigrations().slice(0,-1))
    assert(remote.includes(version),'Knowledge requires every genuinely installed predecessor');
  const installed=remote.includes(descriptor.version);
  assert.equal(remote.at(-1),installed?descriptor.version:PREDECESSOR,
    'Knowledge route refuses an unknown later or missing predecessor migration');
  if(installed){
    assert.equal(environment.RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN,'false','No consumed-grant replay');
    return 'installed';
  }
  assert.equal(environment.RAVRADAR_KNOWLEDGE_UPGRADE_OPT_IN,'true','Named knowledge opt-in is required');
  assert.equal(environment.RAVRADAR_KNOWLEDGE_CONFIRMATION,'DEPLOY-CODE-ONLY-REPAIR');
  assert.notEqual(environment.RAVRADAR_KNOWLEDGE_SAVED_WEATHER,'true');
  assert.equal(environment.RAVRADAR_KNOWLEDGE_RECOVERY_RUN_ID,'');
  return 'before';
}

export async function verifyAssistantKnowledgePlan({phase,migrationListText,dryRunText,
  migrationsDirectory,environment=process.env}){
  const descriptor=authority(environment);
  assert(['before','installed'].includes(phase));
  assert.equal(selectAssistantKnowledgeRoute({migrationListText,environment}),phase);
  // A pinned SQL/canonical reader, not regeneration from a tuple supplied by a caller.
  await readAssistantKnowledgeCanonicalSource({migrationsDirectory});
  const result=await assertSupabaseMigrationPlan({migrationListText,dryRunText,
    migrationsDirectory,allowAssistantKnowledgePlan:true});
  if(phase==='before'){
    assert.equal(environment.RAVRADAR_KNOWLEDGE_PREWRITE_VERIFIED,'true');
    assert.deepEqual(result.pendingVersions,[descriptor.version]);
  }else{
    assertAssistantKnowledgeMigrationsApplied(migrationListText);
    assert.deepEqual(result.pendingVersions,[]);
  }
  return result;
}

async function main(){
  authority(process.env); // also before reading a migration-list file
  const args=process.argv.slice(2);
  if(args[0]==='--select'){
    assert.equal(args.length,3);assert.equal(args[1],'--migration-list');
    const phase=selectAssistantKnowledgeRoute({migrationListText:await fs.readFile(args[2],'utf8')});
    assert(typeof process.env.GITHUB_ENV==='string'&&process.env.GITHUB_ENV.length>0);
    await fs.appendFile(process.env.GITHUB_ENV,
      'RAVRADAR_KNOWLEDGE_PHASE='+phase+'\n'
      +'RAVRADAR_KNOWLEDGE_METADATA_ONLY=true\n'
      +'RAVRADAR_KNOWLEDGE_EDGE_REQUIRED=true\n');
    return;
  }
  const keys=['--phase','--migration-list','--dry-run','--migrations-directory'];
  assert.equal(args.length,8);const options=new Map();
  for(let i=0;i<args.length;i+=2){
    assert(keys.includes(args[i])&&!options.has(args[i])&&args[i+1]);
    options.set(args[i],args[i+1]);
  }
  await verifyAssistantKnowledgePlan({phase:options.get('--phase'),
    migrationListText:await fs.readFile(options.get('--migration-list'),'utf8'),
    dryRunText:await fs.readFile(options.get('--dry-run'),'utf8'),
    migrationsDirectory:path.resolve(options.get('--migrations-directory'))});
  console.log('Exact named knowledge plan verified; no installation performed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
