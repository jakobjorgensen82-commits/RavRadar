// Native adapter source/normal-factory check only. NO native PostgreSQL claim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {withNative0600CheckpointFactory,assertCurrentMemoryWarmupTransactionBounds} from './lib/current-memory-warmup-postgres.mjs';
import {CURRENT_MEMORY_WARMUP_BEFORE as OLD,CURRENT_MEMORY_WARMUP_OUTPUT as PINS,
  readCurrentMemoryWarmupCanonicalSource,currentMemoryWarmupMigration} from './lib/current-memory-warmup-successor-source.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy} from './integrated-cutover-readiness.mjs';
test('new native phase uses whole issued SQL/new contracts and genuine fixed60d original factory',async()=>{
  const source=await readCurrentMemoryWarmupCanonicalSource();assert.equal(source.admission,'NO_ADMISSION');
  const sql=await fs.readFile(new URL('../supabase/migrations/'+currentMemoryWarmupMigration().filename,import.meta.url),'utf8');
  assertCurrentMemoryWarmupTransactionBounds(sql);
  assert.throws(()=>assertCurrentMemoryWarmupTransactionBounds(sql.replace("set local statement_timeout = '55s';","set local statement_timeout = '54s';")));
  assert.throws(()=>assertCurrentMemoryWarmupTransactionBounds(sql.replace("set local lock_timeout = '5s';","set local lock_timeout = '6s';")));
  assert.equal((await expectedCheckpointCasContract()).sha256,PINS.checkpointContractSha256);
  assert.equal((await expectedTripBindingPolicy()).sha256,PINS.tripBindingPolicySha256);
  let called=false;
  await withNative0600CheckpointFactory(async old=>{
    called=true;assert.equal(old.sourceHead,'60d999a68136c43acb4d3664bbd66eed47283bb2');
    assert.equal(old.ravScoreModelBinding().modelBundleSha256,OLD.integrated);
    assert.equal(old.candidateGRollbackModelBinding().modelBundleSha256,OLD.candidate);
    assert.equal(old.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,OLD.continuation);
    assert.equal(old.atHour(49),'2026-08-03T01:00:00.000Z');assert.equal(typeof old.sourceDocumentAt,'function');
    assert.equal(typeof old.saveRavScoreContinuationCheckpoint,'function');
  });assert.equal(called,true);
  await assert.rejects(withNative0600CheckpointFactory(()=>{}, {sourceHead:'other'}),/strictly equal/);
});
