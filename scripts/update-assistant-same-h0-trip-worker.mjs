import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { deployTripWorker } from './lib/trip-worker-deploy-process.mjs';
import { verifyExistingWorkerBindings } from './verify-cloudflare-trip-gateway.mjs';
import { waitForTripStorageEdgeReadiness } from './lib/trip-storage-edge-readiness.mjs';
import { assertAssistantSameH0MigrationsApplied, verifyIntegratedDatabaseReadback, assistantSameH0RequiredMigrations, inspectMigrationSources }
  from './integrated-cutover-readiness.mjs';
import { requireAssistantSameH0Output } from './lib/assistant-same-h0-successor-source.mjs';

// Workflow-only orchestration. No DDL, new secret, storage adoption or SQL grant.
// The unissued SAME_H0 source rejects before I/O until normal issuance is complete.
const CONFIG = '/tmp/ravradar-assistant-same-h0-worker-wrangler.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FAILURE = 'ASSISTANT_SAME_H0_WORKER_UPDATE_FAILED';

export async function updateAssistantSameH0TripWorker() {
  const env = { ...process.env, TRIP_WRANGLER_CONFIG_PATH: CONFIG,
    TRIP_STORAGE_OWNER_EXPORT_UPGRADE: '0', TRIP_STORAGE_OWNER_ERASURE_GUARD: '0',
    TRIP_STORAGE_UPGRADE_PREFLIGHT: '1' };
  const databasePassword=env.SUPABASE_DB_PASSWORD,serviceRoleKey=env.SUPABASE_SERVICE_ROLE_KEY;
  delete env.SUPABASE_DB_PASSWORD; delete env.SUPABASE_SERVICE_ROLE_KEY;
  delete env.EXPECTED_TRIP_WORKER_VERSION;
  let stage = 'AUTHORITY', interrupted = false, intent = false, stopKnown = true;
  let deadline = 0, primaryVersion = null, firstFailure = null, recoveryAttempted = false;
  const onSignal = () => { interrupted = true; };
  const failure = () => Object.assign(new Error(FAILURE), { stage, recoveryAttempted });
  const run = (command, args, extra = {}, cwd = process.cwd()) => {
    try { return execFileSync(command, args, { env: { ...env, ...extra }, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'], cwd, timeout: 240000, maxBuffer: 2 * 1024 * 1024 }); }
    catch { throw failure(); } // Never relay subprocess stderr/credentials.
  };
  const exactMain = () => {
    if (interrupted || process.platform !== 'linux' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || env.GITHUB_WORKFLOW !== 'Deploy RavRadar code-only repair'
      || env.GITHUB_REF !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '')
      || env.GITHUB_RUN_ATTEMPT !== '1' || env.SUPABASE_PROJECT_ID !== 'afqhhdrkjfjtpadntdzo'
      || env.RAVRADAR_ASSISTANT_SAME_H0_CONFIRMATION !== 'DEPLOY-CODE-ONLY-REPAIR'
      || !['before', 'installed'].includes(env.RAVRADAR_ASSISTANT_SAME_H0_PHASE)
      || env.RAVRADAR_ASSISTANT_SAME_H0_EDGE_REQUIRED !== 'true'
      || env.RAVRADAR_USERDATA_UPGRADE_OPT_IN === 'true'
      || env.RAVRADAR_USERDATA_PREWRITE_REQUIRED === 'true') throw failure();
    run('git', ['fetch', '--no-tags', '--prune', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
    if (run('git', ['rev-parse', 'HEAD^{commit}']).trim() !== env.GITHUB_SHA
      || run('git', ['rev-parse', 'origin/main^{commit}']).trim() !== env.GITHUB_SHA) throw failure();
  };
  const migrationView = async () => {
    const view = env.RAVRADAR_ASSISTANT_SAME_H0_MIGRATION_VIEW;
    const root = path.resolve(process.cwd());
    if (typeof view !== 'string' || !view || !path.isAbsolute(view)
      || path.resolve(view) !== view || view === path.parse(view).root
      || view === root || view.startsWith(root + path.sep)) throw failure();
    let at = path.parse(view).root;
    for (const component of path.relative(at, view).split(path.sep).filter(Boolean)) {
      at = path.join(at, component); const stat = fs.lstatSync(at);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw failure();
    }
    const plain = (file, maximum) => {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maximum
        || fs.realpathSync(file) !== file) throw failure();
      const bytes = fs.readFileSync(file);
      if (bytes.length !== stat.size) throw failure(); return bytes;
    };
    if (plain(path.join(view,'supabase/.temp/project-ref'),256).toString('utf8').trim() !== env.SUPABASE_PROJECT_ID
      || !plain(path.join(view,'supabase/config.toml'),1024*1024)
        .equals(plain(path.join(root,'supabase/config.toml'),1024*1024))) throw failure();
    const directory = path.join(view,'supabase/migrations');
    await inspectMigrationSources({migrationsDirectory:directory,sourcePhase:'assistant-same-h0'});
    const required = assistantSameH0RequiredMigrations(), names = new Set(required.map(row=>row.filename));
    let total = 0;
    for (const row of required) {
      const original = plain(path.join(root,'supabase/migrations',row.filename),4*1024*1024);
      const staged = plain(path.join(directory,row.filename),4*1024*1024); total += staged.length;
      if (total > 64*1024*1024 || !original.equals(staged)) throw failure();
    }
    // Reuse only the normal hydrator's exact already-applied pre-cutover placeholders.
    for (const name of fs.readdirSync(directory)) if (!names.has(name)) {
      const match = /^(\d{8,14})_remote_applied_history_placeholder\.sql$/.exec(name);
      if (!match || BigInt(match[1].padEnd(14,'0')) >= BigInt(required[0].version.padEnd(14,'0'))) throw failure();
      const expected = '-- Temporary CI-only placeholder for already-applied remote migration '+match[1]+'.\n'
        +'-- It is never committed and contains no executable SQL.\n';
      if (plain(path.join(directory,name),1024).toString('utf8') !== expected) throw failure();
    }
    return view;
  };
  const installed = async () => {
    stage = 'INSTALLED_DATABASE';
    requireAssistantSameH0Output();
    // Strict new migration catalogue, not historical verify-db's default phase.
    if (typeof databasePassword !== 'string' || !databasePassword) throw failure();
    const view = await migrationView();
    assertAssistantSameH0MigrationsApplied(run('supabase', ['migration', 'list', '--linked'], {SUPABASE_DB_PASSWORD:databasePassword}, view));
    await verifyIntegratedDatabaseReadback({ url: env.SUPABASE_URL,
      serviceRoleKey, sourcePhase: 'assistant-same-h0' });
  };
  const edge = mode => run('node', ['scripts/verify-trip-storage-edge.mjs'],
    { EXPECTED_TRIP_STORAGE_MODE: mode, TRIP_STORAGE_UPGRADE_PREFLIGHT: '1' });
  const workerHealth = version => run('node', ['scripts/verify-cloudflare-trip-gateway.mjs'],
    version ? { EXPECTED_TRIP_WORKER_VERSION: version, TRIP_STORAGE_UPGRADE_PREFLIGHT: '0' }
      : { TRIP_STORAGE_UPGRADE_PREFLIGHT: '1' });
  const readConfiguration = () => {
    const stat = fs.lstatSync(CONFIG);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 65536) throw failure();
    const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (config.name !== 'ravradar-trip-gateway' || !Array.isArray(config.d1_databases)
      || config.d1_databases.length !== 10) throw failure();
    return config;
  };
  let configuration, originalSchema;
  const schema = () => {
    // Fixed PLAN is read-only. Missing 002 or any 003 trigger stops; never apply.
    const result = JSON.parse(run('node', ['scripts/prepare-cloudflare-trip-storage.mjs',
      '--existing-owner-erasure-guard-plan'], { TRIP_STORAGE_OWNER_ERASURE_GUARD: '1' }));
    if (result.kind !== 'TRIP_OWNER_ERASURE_INSERT_FENCE_SCHEMA_PLAN'
      || result.sourceSha !== env.GITHUB_SHA || !UUID.test(result.workerVersionId || '')
      || !Array.isArray(result.missingShards) || result.missingShards.length !== 0
      || !Array.isArray(result.shardIdentities) || result.shardIdentities.length !== 10
      || result.shardIdentities.some(value => !/^[a-f0-9]{64}$/.test(value))
      || new Set(result.shardIdentities).size !== 10
      || ['bindingMappingSha256', 'triggerDefinitionSha256', 'migrationSha256']
        .some(key => !/^[a-f0-9]{64}$/.test(result[key] || ''))) throw failure();
    if (originalSchema && !isDeepStrictEqual(
      { ...result, workerVersionId: null }, { ...originalSchema, workerVersionId: null })) throw failure();
    return result;
  };
  const attest = async version => {
    if (!isDeepStrictEqual(readConfiguration(), configuration)) throw failure();
    const observed = await verifyExistingWorkerBindings({ accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN, workerName: configuration.name,
      expectedBindings: configuration.d1_databases, expectedVersion: version });
    if (version && observed.versionId !== version) throw failure();
    const currentSchema = schema();
    if (currentSchema.workerVersionId !== observed.versionId) throw failure();
    workerHealth(version);
    return observed.versionId;
  };
  const lease = minimumSeconds => {
    const remaining = deadline - Date.now();
    if (interrupted || remaining < minimumSeconds * 1000 || remaining > 20 * 60000) throw failure();
  };
  const quiesce = () => {
    stage = 'QUIESCE'; exactMain(); deadline = Date.now() + 20 * 60000;
    intent = true; // Unknown secrets-set outcome still requires bounded recovery handling.
    run('supabase', ['secrets', 'set', '--project-ref', env.SUPABASE_PROJECT_ID,
      `TRIP_STORAGE_MODE=maintenance:${new Date(deadline).toISOString()}`]);
    edge('maintenance'); run('sleep', ['20']);
  };
  const replace = async () => {
    stage = 'REPLACE'; await attest(); exactMain(); lease(600);
    stopKnown = false;
    let result;
    try {
      result = await deployTripWorker({ configPath: CONFIG, env });
      stopKnown = result?.terminationConfirmed === true;
      if (!stopKnown) throw failure();
    } catch (error) {
      if (error?.terminationConfirmed === true) stopKnown = true;
      throw failure();
    }
    const versions = [...result.stdout.matchAll(/^Current Version ID:\s*([a-f0-9-]+)\s*$/gim)];
    if (versions.length !== 1 || !UUID.test(versions[0][1])) throw failure();
    const version = versions[0][1];
    stage = 'WORKER_ATTEST'; await attest(version);
    return version;
  };
  const restore = async version => {
    stage = 'RESTORE'; await attest(version); exactMain(); lease(1);
    run('supabase', ['secrets', 'set', '--project-ref', env.SUPABASE_PROJECT_ID, 'TRIP_STORAGE_MODE=d1']);
    edge('d1'); await attest(version);
  };
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  try {
    requireAssistantSameH0Output(); // Including fresh-main reads: no I/O while unissued.
    exactMain(); await installed(); exactMain(); stage = 'READ_ONLY_PREFLIGHT';
    run('node', ['scripts/prepare-cloudflare-trip-storage.mjs', '--existing-worker-repair']);
    configuration = readConfiguration(); originalSchema = schema();
    run('node', ['scripts/audit-cloudflare-trip-storage.mjs']); edge('d1'); await attest();
    try { quiesce(); primaryVersion = await replace(); await restore(primaryVersion); }
    catch (error) {
      firstFailure = error?.message === FAILURE ? error : failure();
      if (intent && stopKnown && !interrupted) {
        recoveryAttempted = true;
        try {
          stage = 'RECOVERY_READ_ONLY';
          const options = { baseUrl: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
            preUpgrade: true };
          const maintenance = await waitForTripStorageEdgeReadiness({ ...options, expectedStorageMode: 'maintenance' });
          const d1 = maintenance.ok ? null
            : await waitForTripStorageEdgeReadiness({ ...options, expectedStorageMode: 'd1' });
          if (!maintenance.ok && !d1?.ok) throw failure();
          await installed(); quiesce(); const recoveredVersion = await replace(); await restore(recoveredVersion);
        } catch { /* Keep the first failure; never a second repair or a success claim. */ }
      }
      throw Object.assign(firstFailure, { recoveryAttempted, terminationConfirmed: stopKnown });
    }
    return { kind: 'ASSISTANT_SAME_H0_WORKER_ATTESTED', sourceSha: env.GITHUB_SHA,
      versionId: primaryVersion, schemaInstalled: true, storageMode: 'd1',
      edgeReadiness: 'PRE_UPGRADE_ONLY', currentEdgesAttested: false,
      sqlApplied: false, schemaApplied: false, statisticsActivated: false };
  } catch (error) {
    throw error?.message === FAILURE ? error : failure();
  } finally {
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) throw new Error(FAILURE);
  try { console.log(JSON.stringify(await updateAssistantSameH0TripWorker())); }
  catch (error) {
    console.error(JSON.stringify({ kind: FAILURE, stage: error.stage || 'UNKNOWN',
      recoveryAttempted: error.recoveryAttempted === true,
      terminationConfirmed: error.terminationConfirmed === true }));
    process.exitCode = 1;
  }
}
