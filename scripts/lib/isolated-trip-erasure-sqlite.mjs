import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {deleteCloudflareTrips} from '../../supabase/functions/_shared/trip-storage.js';
import {handleRequest} from '../../cloudflare/trip-gateway/worker.js';

const fixtureGateway = 'https://isolated-account-erasure.workers.dev';
const fixtureSecret = 'synthetic-local-trip-erasure-gateway-only';
const migrationNames = ['001_trip_observations.sql','002_owner_export_keyset.sql','003_owner_erasure_insert_guard.sql'];
const insert = `insert into trip_observations (owner_subject,owner_kind,client_observation_id,observed_at,submitted_at,payload_json,payload_sha256,source)
  values (?, 'user', ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '{}', ?, 'live')`;
const registry = `insert into trip_observation_registry (client_observation_id,owner_subject,payload_sha256,target_database_index)
  values (?, ?, ?, ?)`;
const fixtureDigest = 'b'.repeat(64);

function binding(database) {
  return {prepare(text) {
    const statement = database.prepare(text);
    const bound = values => ({
      async run() { return {success:true,meta:{changes:Number(statement.run(...values).changes)}}; },
      async all() { return {success:true,results:statement.all(...values)}; },
    });
    return {...bound([]),bind:(...values)=>bound(values)};
  }};
}

export async function exerciseIsolatedTripErasureSqlite(ownerSubject, otherSubject) {
  assert.match(ownerSubject,/^usr_v1_[A-Za-z0-9_-]{43}$/);
  assert.match(otherSubject,/^usr_v1_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(ownerSubject,otherSubject);
  const databases = [];
  const migrations = migrationNames.map(name=>readFileSync(
    new URL('../../cloudflare/trip-gateway/migrations/'+name,import.meta.url),'utf8'));
  try {
    for (let index=0; index<10; index+=1) {
      const db=new DatabaseSync(':memory:');
      databases.push(db);
      for (const migration of migrations) db.exec(migration);
      db.prepare(insert).run(ownerSubject,'erased-'+index,fixtureDigest);
      db.prepare(insert).run(otherSubject,'kept-'+index,fixtureDigest);
    }
    const control=databases[0];
    for (let index=0; index<10; index+=1) {
      control.prepare(registry).run('erased-'+index,ownerSubject,fixtureDigest,index);
      control.prepare(registry).run('kept-'+index,otherSubject,fixtureDigest,index);
    }
    const env={TRIP_GATEWAY_SHARED_SECRET:fixtureSecret};
    for (const [index,db] of databases.entries()) env['TRIP_DB_'+index]=binding(db);
    const remove=()=>deleteCloudflareTrips({
      gatewayUrl:fixtureGateway,sharedSecret:fixtureSecret,ownerSubject,
      fetchImpl(input,init) {
        assert.equal(String(input),fixtureGateway+'/v1/trips/delete-owner');
        return handleRequest(new Request(input,init),env);
      },
    });
    assert.equal(await remove(),10);
    for (const [index,db] of databases.entries()) {
      const ownerCount=db.prepare('select count(*) as count from trip_observations where owner_subject=?');
      assert.equal(ownerCount.get(ownerSubject).count,0);
      assert.equal(ownerCount.get(otherSubject).count,1);
      assert.equal(db.prepare('select count(*) as count from trip_owner_erasure_tombstones where owner_subject=?')
        .get(ownerSubject).count,1);
      assert.throws(()=>db.prepare(insert).run(ownerSubject,'erased-'+index,fixtureDigest),/TRIP_OWNER_ERASED/);
      assert.equal(ownerCount.get(ownerSubject).count,0);
    }
    const registryCount=control.prepare('select count(*) as count from trip_observation_registry where owner_subject=?');
    assert.equal(registryCount.get(ownerSubject).count,0);
    assert.equal(registryCount.get(otherSubject).count,10);
    assert.equal(await remove(),0);
    return {deletedCount:10,shards:databases.length,tombstonesVerified:true,
      oldRowReinsertRejected:true,otherOwnerPreserved:true,fullRestoreExecuted:false,hostedD1Executed:false};
  } finally {
    for (const db of databases) db.close();
  }
}
