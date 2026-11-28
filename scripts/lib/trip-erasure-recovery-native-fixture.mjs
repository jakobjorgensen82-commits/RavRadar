import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tripRecoveryCatalogQuery } from '../verify-account-erasure-schema.mjs';

export const TRIP_ERASURE_RECOVERY_MIGRATION = '20261127095500_trip_owner_erasure_intents.sql';
const hold = '70000000-0000-4000-8000-000000000001';
const otherHold = '70000000-0000-4000-8000-000000000002';
const operation = '30000000-0000-4000-8000-000000000061';
const otherOperation = '30000000-0000-4000-8000-000000000062';
const otherUser = '20000000-0000-4000-8000-000000000062';
const attempt = '70000000-0000-4000-8000-000000000003';
const ownerSubject = 'usr_v1_' + 'A'.repeat(43);
const tripSubject = 'usr_v1_' + 'B'.repeat(43);
const lateSubject = 'usr_v1_' + 'C'.repeat(43);

// These checks run in the existing account-erasure fixture database, on the
// socket-only synthetic host. No production transport is accepted or used.
export async function exerciseTripErasureRecoveryHold({
  pg, raw, waitApplication, seed, prepare, stage, repositoryRoot, ownerRole, serviceRole, actor,
}) {
  assert.equal(await pg(`select current_database()='rr_account_erasure_native_fixture'
    and current_user='rr_native_test' and inet_server_addr() is null
    and current_setting('listen_addresses')='';`), 't', 'Owned synthetic socket-only PostgreSQL required');
  const migrationSql = await fs.readFile(path.join(repositoryRoot, 'supabase', 'migrations', TRIP_ERASURE_RECOVERY_MIGRATION));
  await pg(new TextDecoder('utf8', { fatal: true }).decode(migrationSql));
  const catalog = tripRecoveryCatalogQuery.trim().replace(/;$/, '');
  assert.deepEqual(JSON.parse(await pg(`select row_to_json(c) from (${catalog}) c;`)),
    {functions_ok:true,tables_ok:true,triggers_ok:true});
  const readHold = 'public.read_trip_erasure_recovery_hold()';
  const observedHold = async () => JSON.parse(await pg(serviceRole
    + `set time zone 'Pacific/Auckland'; select json_agg(state) from ${readHold} as state;`));
  assert.deepEqual(await observedHold(), [{ hold_id: null, held_at: null }]);
  assert.equal((await raw(serviceRole + 'delete from public.observations where false;')).code, 0);
  for (const role of ['anon', 'authenticated']) {
    const refused = await raw(`set role ${role}; select * from ${readHold};`);
    assert.equal(refused.code, 3);
    assert.equal(refused.sqlState, '42501');
  }
  assert.equal(await pg(`select p.provolatile = 's' and p.prosecdef
    and not has_table_privilege('service_role', 'public.trip_erasure_recovery_gate', 'SELECT')
    and not exists (select 1 from pg_catalog.aclexplode(p.proacl) as acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE')
    from pg_catalog.pg_proc as p where p.oid = '${readHold}'::regprocedure;`), 't');
  await seed(61);
  await seed(62);
  assert.equal((await prepare(61)).state, 'PREPARED');
  assert.equal((await stage(61)).pgStageCommitted, true);

  // A fixture-only signal lets the observer release a writer only after it
  // has seen the other PostgreSQL session waiting for its transaction lock.
  await pg(`create table public.rr_trip_recovery_race_signal (released boolean not null);
    insert into public.rr_trip_recovery_race_signal values (false);`);
  const pause = `reset role;
    do $fixture$ declare deadline timestamptz := clock_timestamp() + interval '8 seconds';
    begin
      while not (select released from public.rr_trip_recovery_race_signal) loop
        if clock_timestamp() >= deadline then raise exception 'SYNTHETIC_RACE_SIGNAL_TIMEOUT'; end if;
        perform pg_sleep(0.04);
      end loop;
    end; $fixture$;`;
  const releaseSignal = () => pg('update public.rr_trip_recovery_race_signal set released=true;');
  const armSignal = () => pg('update public.rr_trip_recovery_race_signal set released=false;');
  const acquire = `public.acquire_trip_erasure_recovery_hold('${hold}')`;
  const record = subject => `public.record_trip_owner_erasure_intent('${subject}',false)`;
  const expectedJournal = `select array_agg(owner_subject order by owner_subject collate "C")
    = array['${ownerSubject}','${tripSubject}'] from public.read_trip_erasure_restore_subjects(
      '${hold}', statement_timestamp()-interval '1 day', statement_timestamp(), null);`;
  const expectRejected = (call, message) => `do $fixture$ begin
    perform ${call};
    raise exception 'SYNTHETIC_HOLD_ACCEPTED_UNEXPECTEDLY';
  exception when sqlstate '55000' then
    if sqlerrm <> '${message}' then raise; end if;
  end; $fixture$;`;
  async function runRace(blocker, blockingSql, waiter, waitingSql) {
    const first = raw(`begin; set local application_name='${blocker}';${blockingSql}${pause}commit;`);
    let second;
    try {
      await waitApplication(blocker);
      second = raw(`set application_name='${waiter}';${waitingSql}`);
      await waitApplication(waiter, 'Lock');
      assert.equal(await pg(`select exists (select from pg_catalog.pg_stat_activity waiting
        join pg_catalog.pg_stat_activity holding on holding.pid = any(pg_catalog.pg_blocking_pids(waiting.pid))
        where waiting.datname=current_database() and holding.datname=current_database()
          and waiting.application_name='${waiter}' and holding.application_name='${blocker}');`), 't');
    } finally {
      await releaseSignal();
    }
    const results = await Promise.all([first, second]);
    for (const result of results) assert.equal(result.code, 0, 'Concurrent synthetic PostgreSQL session failed');
    return results.map(result => result.stdout.trim());
  }

  const [claimed] = await runRace('rr_trip_recovery_claim', serviceRole
    + `select (public.claim_account_erasure_auth('${operation}','${actor}',null,'${attempt}',
          '2026-01-01T00:00:00.123456Z','${ownerSubject}')->>'shouldIssueDelete')::boolean;`,
  'rr_trip_recovery_after_claim', serviceRole
    + expectRejected(acquire, 'TRIP_ERASURE_RECOVERY_ADMISSION_BLOCKED'));
  assert.equal(claimed, 't');
  assert.equal(await pg('select hold_id is null from public.trip_erasure_recovery_gate;'), 't');
  // SQL fixture only. The actual Auth server is never called or attested.
  assert.equal(await pg(serviceRole + `select (public.acknowledge_account_erasure_auth_absent(
    '${operation}','${actor}','${attempt}','${attempt}','${ownerSubject}')->>'authAbsent')::boolean;`), 't');

  await armSignal();
  const [recorded, journal] = await runRace('rr_trip_recovery_record', serviceRole + `select ${record(tripSubject)};`,
    'rr_trip_recovery_after_record', `begin;${serviceRole}select ${acquire};${expectedJournal}rollback;`);
  assert.equal(recorded, 't');
  assert.equal(journal.split(/\r?\n/).at(-1), 't');
  assert.equal(await pg('select hold_id is null from public.trip_erasure_recovery_gate;'), 't');

  // The previously open gate is still uncommitted while a late writer waits.
  // The writer must re-read the row after the new hold commits and refuse.
  await armSignal();
  const [heldAt] = await runRace('rr_trip_recovery_held_trip', serviceRole + `select ${acquire};`,
    'rr_trip_recovery_late_trip', serviceRole + expectRejected(record(lateSubject), 'TRIP_ERASURE_RECOVERY_HOLD'));
  assert(heldAt, 'Fresh hold must commit its timestamp');
  const observed = await observedHold();
  assert.equal(observed.length, 1);
  assert.equal(observed[0].hold_id, hold);
  const preciseHeldAt = observed[0].held_at;
  assert.match(preciseHeldAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
  assert.equal(await pg(`select held_at = '${preciseHeldAt}'::timestamptz
    from public.trip_erasure_recovery_gate where singleton;`), 't');
  assert.equal(await pg(serviceRole + expectedJournal), 't');
  // Reentering that committed hold still serializes the account journal.
  await armSignal();
  await runRace('rr_trip_recovery_held_account', serviceRole + `select ${acquire};`,
    'rr_trip_recovery_late_account', ownerRole + expectRejected(
      `public.prepare_account_erasure('${otherOperation}','${otherUser}')`, 'TRIP_ERASURE_RECOVERY_HOLD'));

  await pg(serviceRole + expectRejected(`public.acquire_trip_erasure_recovery_hold('${otherHold}')`,
    'TRIP_ERASURE_RECOVERY_ADMISSION_BLOCKED'));
  await pg(serviceRole + expectRejected(`public.read_trip_erasure_restore_subjects(
    '${otherHold}', statement_timestamp()-interval '1 day', statement_timestamp(), null)`,
  'TRIP_ERASURE_RECOVERY_HOLD_UNVERIFIED'));
  assert.equal(await pg(serviceRole + `select ${acquire};`), heldAt);
  for (const statement of [
    'insert into public.observations(id,user_id) values(613,null);',
    'update public.observations set user_id=null where false;',
    'delete from public.observations where false;',
  ]) {
    const refused = await raw(serviceRole + statement);
    assert.equal(refused.code, 3);
    assert.equal(refused.sqlState, '55000');
  }
  assert.equal(await pg(`select not exists (select from public.trip_owner_erasure_intents where owner_subject='${lateSubject}')
    and not exists (select from public.account_erasure_operations where operation_id='${otherOperation}');`), 't');
  return {
    migration: TRIP_ERASURE_RECOVERY_MIGRATION,
    migrationSha256: createHash('sha256').update(migrationSql).digest('hex'),
    actualPostgres: true, syntheticSqlHost: true, realGoTrue: false,
    accountClaimCommitRefusesHold: true, priorTripIntentInHeldJournal: true,
    heldTripAndAccountWritesRefused: true, supabaseObservationWritesRefused: true, sameHoldIdRequired: true,
    productionReleaseVerified: false,
  };
}
