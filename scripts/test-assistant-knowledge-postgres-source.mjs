// Native adapter source/normal-factory check only. NO native PostgreSQL claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {withIssued0200CheckpointFactory,assertAssistantKnowledgeTransactionBounds} from './lib/assistant-knowledge-postgres.mjs';
import * as nativePhase from './lib/assistant-knowledge-postgres.mjs';
import {ASSISTANT_KNOWLEDGE_BEFORE as OLD,ASSISTANT_KNOWLEDGE_OUTPUT as PINS,
  readAssistantKnowledgeCanonicalSource,assistantKnowledgeMigration} from './lib/assistant-knowledge-successor-source.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy} from './integrated-cutover-readiness.mjs';
test('new native phase uses whole issued SQL/new contracts and genuine fixed229d original factory',async()=>{
  const source=await readAssistantKnowledgeCanonicalSource();assert.equal(source.admission,'NO_ADMISSION');
  const sql=await fs.readFile(new URL('../supabase/migrations/'+assistantKnowledgeMigration().filename,import.meta.url),'utf8');
  assertAssistantKnowledgeTransactionBounds(sql);
  assert.throws(()=>assertAssistantKnowledgeTransactionBounds(sql.replace("set local statement_timeout = '55s';","set local statement_timeout = '54s';")));
  assert.throws(()=>assertAssistantKnowledgeTransactionBounds(sql.replace("set local lock_timeout = '5s';","set local lock_timeout = '6s';")));
  assert.equal((await expectedCheckpointCasContract()).sha256,PINS.checkpointContractSha256);
  assert.equal((await expectedTripBindingPolicy()).sha256,PINS.tripBindingPolicySha256);
  let called=false;
  await withIssued0200CheckpointFactory(async old=>{
    called=true;assert.equal(old.sourceHead,'229d11935776871083116c41b8e230b7841a4038');
    assert.equal(old.ravScoreModelBinding().modelBundleSha256,OLD.integrated);
    assert.equal(old.candidateGRollbackModelBinding().modelBundleSha256,OLD.candidate);
    assert.equal(old.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,OLD.continuation);
    assert.equal(old.atHour(49),'2026-08-03T01:00:00.000Z');assert.equal(typeof old.sourceDocumentAt,'function');
    assert.equal(typeof old.saveRavScoreContinuationCheckpoint,'function');
  });assert.equal(called,true);
  await assert.rejects(withIssued0200CheckpointFactory(()=>{}, {sourceHead:'other'}),/strictly equal/);
});

test('native preservation uses bounded full-row SHA256 inventories and fixed BEFORE subphases',async()=>{
  const source=await fs.readFile(new URL('./lib/assistant-knowledge-postgres.mjs',import.meta.url),'utf8');
  assert.equal(/const (?:preservedSql|originalBankSql)=[^\n]*jsonb_agg/.test(source),false,
    'Never aggregate the complete large checkpoint bank into one JSONB value');
  const all=nativePhase.assistantKnowledgePreservationInventorySql('preserved');
  const originals=nativePhase.assistantKnowledgePreservationInventorySql('original-bank');
  for(const query of [all,originals]){
    assert.doesNotMatch(query,/jsonb_agg|string_agg|\bmd5\s*\(/i);
    assert.match(query,/row_fingerprints as materialized/);
    assert.match(query,/convert_to\(to_jsonb\(t\)::text,'UTF8'\)/);
    assert.match(query,/octet_length\(row_bytes\)/);
    assert.match(query,/encode\(extensions\.digest\(row_bytes,'sha256'\),'hex'\)/);
    assert.match(query,/count\(f\.row_sha256\)/);
    assert.match(query,/coalesce\(sum\(f\.row_bytes\),0\)/);
    assert.match(query,/group by table_name,row_sha256,row_bytes/);
    assert.match(query,/row_sha256,row_bytes,count\(\*\)/);
    assert.match(query,/order by table_name collate "C",kind,row_sha256 collate "C",row_bytes/);
  }
  for(const table of ['admin_documents','admin_document_versions','account_activity_journal','account_statistics_preferences','native_checkpoint_payloads']){
    assert.match(all,new RegExp('from public\\.'+table+' t'));
  }
  assert.equal((all.match(/to_jsonb\(t\)/g)||[]).length,5,'Every complete table row, not a numerical/known-field projection');
  assert.equal((originals.match(/to_jsonb\(t\)/g)||[]).length,1);
  assert.match(originals,/from public\.native_checkpoint_payloads t where t\.name not like 'after0200-%'/);
  assert.doesNotMatch(all,/where t\.name/);
  assert.throws(()=>nativePhase.assistantKnowledgePreservationInventorySql('other'));
  const caller=nativePhase.compareAssistantKnowledgeSuccessor.toString();
  assert.match(caller,/const preservedSql=assistantKnowledgePreservationInventorySql\('preserved'\)/);
  assert.match(caller,/const originalBankSql=assistantKnowledgePreservationInventorySql\('original-bank'\)/);
  for(const phase of ['BEFORE_VERSION','BEFORE_CATALOG','BEFORE_INVENTORY'])assert(caller.includes("phase='"+phase+"'"));
  assert(caller.indexOf("phase='BEFORE_VERSION'")<caller.indexOf("phase='BEFORE_CATALOG'"));
  assert(caller.indexOf("phase='BEFORE_CATALOG'")<caller.indexOf("phase='BEFORE_INVENTORY'"));
});
