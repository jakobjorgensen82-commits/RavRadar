import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
// Refuse the new command before model/T calculation, files or native processes.
if(process.argv.includes('--source-producer')||process.argv.includes('--current-source-native-profile'))requireSourceProducerOutput();
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { buildCandidateGDerivedStateSeries } from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';
import {
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST,
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES,
  PROTECTED_RAVSCORE_CHECKPOINT_RPC,
  PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
  createProtectedRavScoreCheckpointRequester,
  createProtectedRavScoreCheckpointRpcRequester,
  createProtectedRavScoreCheckpointVersionRequester,
  publishProtectedRavScoreContinuationCheckpoint,
  restoreProtectedRavScoreContinuationCheckpoint,
  summarizeCheckpointStateShape,
} from './protected-ravscore-continuation-checkpoint.mjs';
import {
  RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS,
  RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
  saveRavScoreContinuationCheckpoint,
} from './ravscore-continuation-checkpoint.mjs';
import {
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';
import { candidateGStateKey } from './lib/coastal-point-staging-contract.mjs';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

const PART_COUNT = RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.expectedPartCount;
const START = Date.parse('2026-08-01T00:00:00.000Z');
const atHour = hour => new Date(START + hour * 3_600_000).toISOString();
const clone = value => JSON.parse(JSON.stringify(value));
const reorderObjectMembers = value => Array.isArray(value)
  ? value.map(reorderObjectMembers)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse()
      .map(([key, child]) => [key, reorderObjectMembers(child)]))
    : value;
const contextFor = partId => `sha256:${crypto.createHash('sha256').update(partId).digest('hex')}`;
const sha256 = value => crypto.createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');
const CURRENT_CONTINUATION_IMPLEMENTATION_SHA256 =
  await ravScoreContinuationImplementationSha256();
const safeShape = summarizeCheckpointStateShape({
  states: {
    secretPartA: {
      currentReferenceAt: '2026-09-23T05:00:00.000Z',
      currentEvidence: [],
      currentMemoryStatus: 'WINDOW_INCOMPLETE',
    },
    secretPartB: {
      currentReferenceAt: '2026-09-23T05:00:00.000Z',
      currentEvidence: [{ time: '2026-09-23T04:00:00.000Z', strength: 0.2 }],
      currentMemoryStatus: 'LATEST_SAMPLE_MISSING',
    },
  },
  candidateGRollbackCompanion: { states: {
    secretPartA: {
      transportReferenceAt: '2026-09-23T05:00:00.000Z',
      transportEvidence: [{ time: '2026-09-23T04:00:00.000Z', strength: null }],
      transportMemoryStatus: 'LATEST_SAMPLE_MISSING',
    },
  } },
});
assert.equal(safeShape.integratedEmptyEvidence, 1);
assert.equal(safeShape.integratedLastBeforeReference, 1);
assert.equal(safeShape.candidateLastBeforeReference, 1);
assert.equal(safeShape.candidateNullLast, 1);
assert.doesNotMatch(JSON.stringify(safeShape), /secretPart|2026-|0\.2/,
  'safe rejection diagnostics must not expose private IDs, times or evidence');

const samples = Array.from({ length: 51 }, (_, hour) => ({
  time: atHour(hour),
  currentSpeedMps: 0.12,
  currentAlignment: 0.75,
  currentVerified: true,
  waveHeightM: 1.2,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
}));
const stateSeries = buildIntegratedRavScoreStateSeries(samples, {
  samplingContextKey: contextFor('template'),
  onshoreDirectionDeg: 90,
});
const partIds = Array.from(
  { length: PART_COUNT },
  (_, index) => `part-${String(index + 1).padStart(3, '0')}`,
);
const partFor = partId => ({
  partId,
  zoneId: 'fixture-zone',
  landPoint: [10, 56],
  waterPoint: [10.01, 56.01],
  onshoreDirectionDeg: 90,
});
const candidateTemplateByHour = new Map();
const candidateStateFor = (partId, hour, currentSpeedMps = 0.12) => {
  const templateKey = `${hour}:${currentSpeedMps}`;
  let template = candidateTemplateByHour.get(templateKey);
  if (!template) {
    const rows = Array.from({ length: 49 }, (_, index) => ({
      time: atHour(hour - 48 + index),
      currentSpeedMps,
      currentAlignment: 0.75,
      currentVerified: true,
      waveHeightM: 1.2,
      wavePeriodS: 6,
    }));
    template = buildCandidateGDerivedStateSeries(rows, {
      stateKey: candidateGStateKey(partFor('candidate-template')),
    }).continuationState;
    candidateTemplateByHour.set(templateKey, template);
  }
  return { ...clone(template), stateKey: candidateGStateKey(partFor(partId)) };
};
const sourceDocumentAt = (
  hour,
  datasetId = `rr-protected-schema6-${hour}`,
  { candidateCurrentSpeedMps = 0.12 } = {},
) => {
  const parts = Object.fromEntries(partIds.map(partId => [partId, {
    ...partFor(partId),
    ravScoreModel: {
      currentState: {
        ...clone(stateSeries.rows[hour].continuationState),
        samplingContextKey: contextFor(partId),
      },
    },
  }]));
  return {
    datasetId,
    productionReferenceAt: atHour(hour),
    coastalParts: { parts },
    ravScoreCandidateGRollback: {
      schemaVersion: '1.0.0',
      kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
      sourceModelBinding: ravScoreModelBinding(),
      rollbackModelBinding: candidateGRollbackModelBinding(),
      rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
      automaticActivationAllowed: false,
      publicDuringNormalOperation: false,
      runtime: {
        modelBinding: candidateGRollbackModelBinding(),
        expectedPartCount: PART_COUNT,
        scoredPartCount: PART_COUNT,
        scoreProfile: {
          modelCoverageReady: true,
          modelMemoryReady: true,
          modelMigrationReady: true,
        },
        parts: Object.fromEntries(partIds.map(partId => [partId, {
          ravScoreModel: {
            currentState: candidateStateFor(partId, hour, candidateCurrentSpeedMps),
          },
        }])),
      },
    },
  };
};
const sourceDocument = sourceDocumentAt(49, 'rr-protected-schema6-synthetic');

const checkpointPathFor = label => path.join(
  tempRoot,
  label,
  '.cache',
  'ravscore-continuation-checkpoint',
  'checkpoint.json',
);

const rowFor = (payload, version = 1) => ({
  document_key: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  payload: clone(payload),
  version,
});

const payloadsAreEquivalent = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const payloadWithoutContinuationReattestationFields = payload => {
  const result = clone(payload);
  delete result.schemaVersion;
  delete result.status;
  delete result.candidateGRollbackCompanion.schemaVersion;
  delete result.candidateGRollbackCompanion.status;
  delete result.continuationStateContractSha256;
  delete result.generationSha256;
  delete result.candidateGRollbackCompanion.generationSha256;
  return result;
};

const isExactPredecessorSameTargetTransition = (current, incoming) =>
  current.continuationStateContractSha256
    === RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS[0].implementationSha256
  && incoming.continuationStateContractSha256
    === CURRENT_CONTINUATION_IMPLEMENTATION_SHA256
  && current.productionReferenceAt === incoming.productionReferenceAt
  && payloadsAreEquivalent(
    payloadWithoutContinuationReattestationFields(current),
    payloadWithoutContinuationReattestationFields(incoming),
  );

const checkpointWithImplementation = (checkpoint, implementationSha256) => {
  const result = clone(checkpoint);
  if (RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS.some(item => item.implementationSha256 === implementationSha256)) {
    result.schemaVersion = 4;
    result.status = 'ravscore-schema6-with-candidate-g-rollback-companion';
    result.candidateGRollbackCompanion.schemaVersion = 1;
    result.candidateGRollbackCompanion.status = 'candidate-g-rollback-ready-companion';
  }
  result.continuationStateContractSha256 = implementationSha256;
  result.generationSha256 = sha256({
    schemaVersion: result.schemaVersion,
    status: result.status,
    datasetId: result.datasetId,
    productionReferenceAt: result.productionReferenceAt,
    modelBinding: result.modelBinding,
    candidateModelBinding: result.candidateGRollbackCompanion.modelBinding,
    continuationStateContractSha256: implementationSha256,
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    partCount: result.partCount,
    stateSha256: result.stateSha256,
    candidateStateSha256: result.candidateGRollbackCompanion.stateSha256,
  });
  result.candidateGRollbackCompanion.generationSha256 =
    result.generationSha256;
  return result;
};

function rpcMetadataFor(payload, disposition, centralVersion) {
  return {
    schemaVersion: '1.0.0',
    disposition,
    documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
    centralVersion,
    productionReferenceAt: payload.productionReferenceAt,
    modelId: payload.modelBinding.modelId,
    stateSchemaVersion: payload.modelBinding.stateSchemaVersion,
    modelContractSha256: payload.modelBinding.modelContractSha256,
    modelBundleSha256: payload.modelBinding.modelBundleSha256,
    generationSha256: payload.generationSha256,
    partCount: payload.partCount,
    candidatePartCount: payload.candidateGRollbackCompanion.partCount,
  };
}

function memoryCentral(initialRow = null) {
  let row = initialRow ? clone(initialRow) : null;
  const calls = [];

  const versionRequest = async (suffix, options = {}, operation = '') => {
    calls.push({
      channel: 'version',
      suffix,
      options: { ...options },
      operation,
    });
    if (suffix !== '?document_key=eq.ravscore-continuation-checkpoint'
        + '&select=document_key,version&limit=2'
      || Object.keys(options).length !== 0
      || operation !== 'version read') {
      throw new Error('Synthetic version requester received a non-exact metadata GET');
    }
    return row
      ? [{
        document_key: row.document_key,
        version: row.version,
      }]
      : [];
  };

  const rpcRequest = async (body, operation = '') => {
    calls.push({
      channel: 'rpc',
      body: clone(body),
      operation,
    });
    if (!body
      || JSON.stringify(Object.keys(body).sort())
        !== JSON.stringify([
          'p_expected_version',
          'p_payload',
          'p_target_reference',
        ])
      || operation !== 'publish'
      || body.p_target_reference !== body.p_payload?.productionReferenceAt) {
      throw new Error('Synthetic checkpoint RPC received a non-exact request');
    }
    const incoming = body.p_payload;
    const expectedVersion = body.p_expected_version;

    // Equality is deliberately evaluated before version/time checks. This
    // models a response-lost retry after the first call committed.
    if (row && payloadsAreEquivalent(row.payload, incoming)) {
      return rpcMetadataFor(incoming, 'unchanged', row.version);
    }

    if (!row) {
      if (expectedVersion !== 0) {
        throw new Error('Protected RavScore checkpoint compare-and-swap lost a concurrent write');
      }
      row = rowFor(incoming, 1);
      return rpcMetadataFor(incoming, 'inserted', 1);
    }

    const incomingTime = Date.parse(incoming.productionReferenceAt);
    const currentTime = Date.parse(row.payload.productionReferenceAt);
    if (incomingTime < currentTime) {
      throw new Error('Protected RavScore checkpoint would regress central state');
    }
    if (incomingTime === currentTime
      && !isExactPredecessorSameTargetTransition(row.payload, incoming)) {
      throw new Error(
        'Protected RavScore checkpoint conflicts at the same reference time',
      );
    }
    if (expectedVersion !== row.version) {
      throw new Error('Protected RavScore checkpoint compare-and-swap lost a concurrent write');
    }

    row = rowFor(incoming, row.version + 1);
    return rpcMetadataFor(incoming, 'updated', row.version);
  };

  const restoreRequest = async (suffix, options = {}, operation = '') => {
    calls.push({
      channel: 'restore',
      suffix,
      options: { ...options },
      operation,
    });
    if (suffix !== '?document_key=eq.ravscore-continuation-checkpoint'
        + '&select=document_key,payload,version&limit=2'
      || Object.keys(options).length !== 0
      || operation !== 'read') {
      throw new Error('Synthetic restore requester received a non-exact full GET');
    }
    return row ? [clone(row)] : [];
  };

  return {
    calls,
    versionRequest,
    rpcRequest,
    restoreRequest,
    row: () => clone(row),
  };
}

const rpcFailureIncludes = pattern => error => {
  assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
  assert.match(error.message, /RPC publish failed closed/);
  assert.match(error.cause?.message ?? '', pattern);
  return true;
};



// Pure classification of the real native caller's bounded failure output.
// These assertions are not PostgreSQL/SQL/installation proof.
if (!process.argv.includes('--native-postgres') && !process.argv.includes('--native-statistics-revision')
    && !process.argv.includes('--native-sampling-identity') && !process.argv.includes('--current-memory-warmup')
    && !process.argv.includes('--account-statistics-assistant') && !process.argv.includes('--source-producer')
    && !process.argv.includes('--current-source-native-profile')) {
  const { nativePostgresFailureDiagnostic: diagnose,
    nativePostgresFailureAnnotation: annotate } =
      await import('./lib/checkpoint-cas-native-postgres.mjs');
  assert.deepEqual(diagnose('CURRENT220', 'psql:<stdin>: ERROR: 42P01\n'),
    {phase:'CURRENT220',sqlState:'42P01',category:'SQL_UNDEFINED_TABLE'});
  assert.deepEqual(diagnose('ACCOUNT213', 'ERROR: 42501\r\n'),
    {phase:'ACCOUNT213',sqlState:'42501',category:'SQL_PERMISSION'});
  assert.deepEqual(diagnose('BASELINE_ADMISSION', 'ERROR: 57014\n'),
    {phase:'BASELINE_ADMISSION',sqlState:'57014',category:'SQL_CANCELED'});
  assert.deepEqual(diagnose('CURRENT220', 'ERROR: P0001\n'),
    {phase:'CURRENT220',sqlState:'P0001',category:'SQL_RAISED_EXCEPTION'});
  for (const raw of [undefined, null, {}, '', 'ERROR: 12345\n',
    'ERROR: 42P01 raw SQL or private value\n', 'DETAIL: 42P01\n',
    JSON.stringify({private:'ERROR: 42P01'}), 'x'.repeat(16_385)]) {
    assert.deepEqual(diagnose('CURRENT220', raw),
      {phase:'CURRENT220',sqlState:'UNKNOWN',category:'PSQL_COMMAND_FAILURE'});
  }
  const sensitive = 'ERROR: 42P01\nDETAIL: private-fixture-string\nCONTEXT: raw fixture SQL\n';
  assert.equal(annotate('CURRENT220', sensitive),
    '::error title=Native PostgreSQL source command::phase=CURRENT220 sqlstate=42P01 category=SQL_UNDEFINED_TABLE');
  assert.doesNotMatch(annotate('CURRENT220', sensitive), /private-fixture-string|DETAIL|CONTEXT|raw fixture SQL/);
  assert.equal(annotate('BAD\n::error::private', 'ERROR: 42501\n'),
    '::error title=Native PostgreSQL source command::phase=UNKNOWN sqlstate=42501 category=SQL_PERMISSION');
  assert.equal(annotate('NATIVE_SETUP', ''),
    '::error title=Native PostgreSQL source command::phase=NATIVE_SETUP sqlstate=UNKNOWN category=PSQL_COMMAND_FAILURE');
}

// Run the actual native SQL-prefix assertion before any historical PG phase.
// Whole issued-source hashing separately protects the CAS 55-second timeout.
if (process.argv.includes('--native-sampling-identity') || process.argv.includes('--native-identity-source-only')) {
  const { runInNewContext } = await import('node:vm');
  const { nativeIdentityMigration, nativeIdentitySourceSha256, assertNativeIdentityOutputFrozen } =
    await import('./lib/native-sampling-identity-successor-source.mjs');
  const nativeSource = (await fs.readFile('scripts/lib/native-identity-checkpoint-postgres.mjs', 'utf8')).replace(/\r\n?/g, '\n');
  const assertions = nativeSource.match(/^    assert\.match\(sql, \/.*\/\);$/gm) ?? [];
  assert.equal(assertions.length, 1, 'Use the one actual native migration-prefix assertion');
  const checkPrefix = sql => runInNewContext(assertions[0], { assert, sql }, { timeout: 1_000 });
  const sql = (await fs.readFile(path.join('supabase/migrations', nativeIdentityMigration().filename), 'utf8')).replace(/\r\n?/g, '\n');
  const checkIssuedBytes = value => assert.equal(nativeIdentitySourceSha256(value), assertNativeIdentityOutputFrozen().migrationSha256);
  checkIssuedBytes(sql);
  checkPrefix(sql);
  for (const [before, after] of [["set local lock_timeout = '5s';", "set local lock_timeout = '4s';"], ['begin;\n\n', '']]) {
    assert.equal(sql.split(before).length, 2);
    assert.throws(() => checkPrefix(sql.replace(before, after)), { code: 'ERR_ASSERTION' });
  }
  const timeout = "set statement_timeout = '55s';";
  assert.equal(sql.split(timeout).length, 2);
  assert.throws(() => checkIssuedBytes(sql.replace(timeout, "set statement_timeout = '54s';")), { code: 'ERR_ASSERTION' });
  assert.deepEqual([...nativeSource.matchAll(/(?:let )?phase = '(SOURCE_[A-Z]+)'/g)].map(match => match[1]),
    ['SOURCE_PREDECESSOR', 'SOURCE_CANONICAL', 'SOURCE_CONTRACTS', 'SOURCE_MIGRATION', 'SOURCE_HISTORY']);
  assert.deepEqual([...nativeSource.matchAll(/phase = '(HISTORICAL_CATALOG_[A-Z_]+)';/g)].map(match => match[1]),
    ['HISTORICAL_CATALOG_SETUP', 'HISTORICAL_CATALOG_PRESERVED_ROWS',
      'HISTORICAL_CATALOG_ORIGINAL_ROWS', 'HISTORICAL_CATALOG_ACCOUNT_ROWS',
      'HISTORICAL_CATALOG_READ', 'HISTORICAL_CATALOG_FUNCTION_SET']);
  assert(nativeSource.includes("phase = 'HISTORICAL_CATALOG_BODY_' + name.toUpperCase();"));
  const catalogDeclarations = nativeSource.match(/^    const catalogSql = names => .*;$/gm) ?? [];
  assert.equal(catalogDeclarations.length, 1, 'Exercise the actual native catalog query');
  const catalogSql = runInNewContext(catalogDeclarations[0] + '\ncatalogSql;', {}, { timeout: 1_000 });
  const longNames = ['ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
    'ravradar_ravscore_checkpoint_account_assistant_predecessor_projection'];
  assert.deepEqual(longNames.map(name => Buffer.byteLength(name)), [65, 69]);
  const checkCatalogNames = query => {
    assert(query.startsWith('select jsonb_object_agg(requested.source_name,'));
    assert(query.includes('join (values ' + longNames.map(name => "('" + name + "')").join(',')
      + ') as requested(source_name) on p.proname=requested.source_name::pg_catalog.name'));
    assert(query.endsWith("where n.nspname='public';"));
  };
  const catalogQuery = catalogSql(longNames);
  checkCatalogNames(catalogQuery);
  assert.throws(() => checkCatalogNames(catalogQuery.replace('jsonb_object_agg(requested.source_name,', 'jsonb_object_agg(p.proname,')));
  assert.throws(() => checkCatalogNames(catalogQuery.replace('::pg_catalog.name', '::text')));
  const { LATEST_RAVSCORE_BINDING_MIGRATION } = await import('./integrated-cutover-readiness.mjs');
  const contractVersionAssertions = nativeSource.match(/assert\.equal\(contract\.appliedMigrationVersion, [^)]+\);/g) ?? [];
  assert.equal(contractVersionAssertions.length, 1, 'Exercise the actual native contract-version assertion');
  const checkContractVersion = version => runInNewContext(contractVersionAssertions[0], {
    assert, contract: { appliedMigrationVersion: version }, migration: nativeIdentityMigration(),
    LATEST_RAVSCORE_BINDING_MIGRATION,
  }, { timeout: 1_000 });
  const baseVersion = LATEST_RAVSCORE_BINDING_MIGRATION.version;
  assert(sql.includes("where m.version::text = '" + nativeIdentityMigration().version + "'\n    ) then '" + baseVersion + "' else null end,"));
  checkContractVersion(baseVersion);
  assert.throws(() => checkContractVersion(nativeIdentityMigration().version), { code: 'ERR_ASSERTION' });
  assert.throws(() => checkContractVersion(null), { code: 'ERR_ASSERTION' });
  console.log(JSON.stringify({ kind: 'NATIVE_IDENTITY_MIGRATION_SOURCE_ASSERTIONS',
    actualPrefix: true, frozenSql: true, negativeCases: 7, sourcePhases: 5,
    exactLongCatalogNames: true, normalBaseContractVersion: true, sqlExecuted: false }));
}

// Source-only control of genuine fixed37 constructors and CURRENT constructors.
// This never starts PostgreSQL, runs SQL or certifies the new migration.
if (process.argv.includes('--native-identity-source-only')) {
  assert.deepEqual(process.argv.slice(2), ['--native-identity-source-only']);
  const { withNativeI71CheckpointFactory, nativeIdentityHistoricalCatalogSetup } =
    await import('./lib/native-identity-checkpoint-postgres.mjs');
  const { NATIVE_IDENTITY_PREDECESSOR: before, NATIVE_IDENTITY_BINDING_REVIEW: after,
    readNativeIdentityCanonicalSource, readNativeIdentityPredecessorSource } =
    await import('./lib/native-sampling-identity-successor-source.mjs');
  const { nativeSamplingIdentityExpectedDatabaseContracts } =
    await import('./native-sampling-identity-successor-readiness.mjs');
  const oldSql = (await fs.readFile('supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql', 'utf8')).replace(/\r\n?/g, '\n');
  const catalog = nativeIdentityHistoricalCatalogSetup(oldSql);
  assert.equal((catalog.match(/^revoke all on function/gm) ?? []).length, 15);
  assert.equal((catalog.match(/^grant execute on function/gm) ?? []).length, 2);
  assert.equal((catalog.match(/^create policy/gm) ?? []).length, 2);
  assert.throws(() => nativeIdentityHistoricalCatalogSetup(oldSql.replace('from public, anon, authenticated;', 'from public, anon;')));
  assert.throws(() => nativeIdentityHistoricalCatalogSetup(oldSql + '\n'));
  const canonical = await readNativeIdentityCanonicalSource();
  const predecessor = await readNativeIdentityPredecessorSource();
  const expected = await nativeSamplingIdentityExpectedDatabaseContracts();
  assert.equal(expected.checkpoint.sha256.length, 64); assert.equal(expected.trip.sha256.length, 64);
  assert(canonical.canonicalSource.includes('native_identity_i71_payload_valid'));
  assert(!predecessor.canonicalSource.includes('native_identity_i71_payload_valid'));
  const fixtureRoot = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'rr-native-identity-source-'));
  const own = await fs.lstat(fixtureRoot, { bigint: true });
  const ownedFiles = [];
  try {
    await withNativeI71CheckpointFactory(async old => {
      for (const [prefix, factory, saver, tuple] of [
        ['old', old.sourceDocumentAt, old.saveRavScoreContinuationCheckpoint, before],
        ['new', sourceDocumentAt, saveRavScoreContinuationCheckpoint, after],
      ]) {
        const sourcePath = path.join(fixtureRoot, prefix + '.source.json');
        const checkpointPath = path.join(fixtureRoot, prefix + '.checkpoint.json');
        ownedFiles.push(sourcePath, checkpointPath);
        await fs.writeFile(sourcePath, JSON.stringify(factory(49, 'rr-native-identity-49')), { flag: 'wx' });
        const original = await fs.readFile(sourcePath);
        await saver({ sourcePath, checkpointPath });
        assert.deepEqual(await fs.readFile(sourcePath), original);
        const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
        assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
        assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
        assert.equal(payload.modelBinding.modelBundleSha256, tuple.integrated);
        assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, tuple.candidate);
        assert.equal(payload.continuationStateContractSha256, tuple.continuation);
      }
    });
  } finally {
    const actual = await fs.lstat(fixtureRoot, { bigint: true });
    assert.equal(await fs.realpath(fixtureRoot), fixtureRoot);
    assert.deepEqual([actual.dev, actual.ino, actual.birthtimeNs], [own.dev, own.ino, own.birthtimeNs]);
    assert.deepEqual((await fs.readdir(fixtureRoot)).sort(), ownedFiles.map(file => path.basename(file)).sort());
    for (const file of ownedFiles) { const stat = await fs.lstat(file); assert(stat.isFile() && !stat.isSymbolicLink()); await fs.unlink(file); }
    await fs.rmdir(fixtureRoot);
  }
  console.log(JSON.stringify({ kind: 'NATIVE_IDENTITY_SOURCE_FIXTURES', oldPartCount: 673,
    newPartCount: 673, genuineFixed37: true, normalSavers: true, oldSqlPreserved: true,
    sourceUnchanged: true, ownedCleanup: true, sqlExecuted: false, nativePostgres: 'UNRUN' }));
  process.exit(0);
}

const currentSourceNativeProfile = process.argv.includes('--current-source-native-profile');
const sourceProducerNative = process.argv.includes('--source-producer') || currentSourceNativeProfile;
const accountStatisticsAssistantNative = process.argv.includes('--account-statistics-assistant') || sourceProducerNative;
// Native PostgreSQL is a separate mandatory Linux source leaf, never a
// MemoryCentral/Windows representation proof. Reuse these exact 673 builders
// and the normal checkpoint saver; do not run the simulated RPC tests here.
if (process.argv.includes('--native-postgres') || process.argv.includes('--native-statistics-revision')
    || process.argv.includes('--native-sampling-identity') || process.argv.includes('--current-memory-warmup')
    || process.argv.includes('--established-native-current-origin') || (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative)) {
  try {
    const { runNativeCheckpointSqlComparison } =
      await import('./lib/checkpoint-cas-native-postgres.mjs');
    const report = await runNativeCheckpointSqlComparison({
      repositoryRoot: path.resolve('.'), sourceDocumentAt, atHour,
      saveCheckpoint: saveRavScoreContinuationCheckpoint,
      includeStatisticsRevision: process.argv.includes('--native-statistics-revision')
        || process.argv.includes('--native-sampling-identity') || process.argv.includes('--current-memory-warmup')
        || process.argv.includes('--established-native-current-origin') || (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative),
      includeNativeIdentity: process.argv.includes('--native-sampling-identity') || process.argv.includes('--current-memory-warmup')
        || process.argv.includes('--established-native-current-origin') || (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative),
      includeCurrentMemoryWarmup: process.argv.includes('--current-memory-warmup') || process.argv.includes('--established-native-current-origin') || (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative),
      includeEstablishedNativeCurrentOrigin: process.argv.includes('--established-native-current-origin') || (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative),
      includeLastMileEnclosure: (process.argv.includes('--last-mile-enclosure') || accountStatisticsAssistantNative),
      includeAccountStatisticsAssistant: accountStatisticsAssistantNative,
      includeSourceProducer: sourceProducerNative,
      includeCurrentSourceNativeProfile: currentSourceNativeProfile,
    });
    console.log(JSON.stringify(report));
  } catch (error) {
    const category = /^NATIVE_POSTGRES_[A-Z0-9_]+$/.test(error?.message ?? '')
      ? error.message : error?.code === 'ERR_ASSERTION'
        ? 'NATIVE_POSTGRES_ASSERTION_FAILED' : 'NATIVE_POSTGRES_UNKNOWN_FAILURE';
    console.error(JSON.stringify({ kind: 'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',
      sqlProof: false, category }));
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravscore-protected-checkpoint-'));
const sourcePath = path.join(tempRoot, 'source.json');
const localCheckpointPath = checkpointPathFor('local');
const restoredCheckpointPath = checkpointPathFor('restore-root');
const predecessorRestoredCheckpointPath =
  checkpointPathFor('predecessor-restore-root');

try {
  await fs.writeFile(sourcePath, `${JSON.stringify(sourceDocument)}\n`);
  await saveRavScoreContinuationCheckpoint({
    sourcePath,
    checkpointPath: localCheckpointPath,
  });
  const checkpoint = JSON.parse(await fs.readFile(localCheckpointPath, 'utf8'));

  const companionConflictSourcePath = path.join(tempRoot, 'companion-conflict-source.json');
  const companionConflictCheckpointPath = checkpointPathFor('companion-conflict');
  await fs.writeFile(
    companionConflictSourcePath,
    `${JSON.stringify(sourceDocumentAt(
      49,
      'rr-protected-schema6-synthetic',
      { candidateCurrentSpeedMps: 0.18 },
    ))}\n`,
  );
  await saveRavScoreContinuationCheckpoint({
    sourcePath: companionConflictSourcePath,
    checkpointPath: companionConflictCheckpointPath,
  });
  const companionConflictCheckpoint = JSON.parse(
    await fs.readFile(companionConflictCheckpointPath, 'utf8'),
  );
  assert.equal(companionConflictCheckpoint.productionReferenceAt, checkpoint.productionReferenceAt);
  assert.equal(companionConflictCheckpoint.stateSha256, checkpoint.stateSha256);
  assert.notEqual(
    companionConflictCheckpoint.candidateGRollbackCompanion.stateSha256,
    checkpoint.candidateGRollbackCompanion.stateSha256,
  );
  assert.notEqual(companionConflictCheckpoint.generationSha256, checkpoint.generationSha256);

  assert.deepEqual(PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_ALLOWLIST, [
    PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
  ]);

  const memory = memoryCentral();
  const published = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: localCheckpointPath,
    targetReference: atHour(50),
    request: memory.versionRequest,
    rpcRequest: memory.rpcRequest,
    temporaryRoot: tempRoot,
  });
  assert.equal(published.published, true);
  assert.equal(published.documentKey, PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY);
  assert.equal(published.partCount, PART_COUNT);
  assert.equal(published.modelId, RAVSCORE_MODEL_ID);
  assert.equal(published.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(published.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(published.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(
    published.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  assert.equal(published.payloadLogged, false);
  assert.equal(published.preexistingHistoricalVersionsPreserved, true);
  assert.equal(published.newHistoricalVersionsRetained, false);
  assert.equal('payload' in published, false);
  assert.equal('states' in published, false);
  assert.equal(memory.calls.length, 2);
  assert.deepEqual(memory.calls.map(call => call.channel), ['version', 'rpc']);
  assert.equal(
    memory.calls[0].suffix,
    '?document_key=eq.ravscore-continuation-checkpoint'
      + '&select=document_key,version&limit=2',
  );
  assert.equal(memory.calls[0].operation, 'version read');
  assert.deepEqual(memory.calls[0].options, {});
  assert.equal(memory.calls[0].suffix.includes('payload'), false);
  assert.equal(memory.calls[1].operation, 'publish');
  assert.deepEqual(
    Object.keys(memory.calls[1].body).sort(),
    ['p_expected_version', 'p_payload', 'p_target_reference'],
  );
  assert.equal(memory.calls[1].body.p_expected_version, 0);
  assert.equal(memory.calls[1].body.p_target_reference, checkpoint.productionReferenceAt);
  assert.deepEqual(memory.calls[1].body.p_payload, checkpoint);
  assert.deepEqual(memory.row(), rowFor(checkpoint, 1));
  assert.equal(
    memory.calls.some(call =>
      call.channel === 'restore'
      || call.options?.method === 'POST'
      || call.options?.method === 'PATCH'),
    false,
    'publish must use only the metadata version GET and the fixed RPC',
  );
  await fs.mkdir(path.dirname(restoredCheckpointPath), { recursive: true });
  const restored = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(50),
    request: memory.restoreRequest,
  });
  assert.equal(restored.restored, true);
  assert.equal(restored.reason, 'protected-checkpoint-restored');
  assert.equal(restored.partCount, PART_COUNT);
  assert.equal(restored.modelId, RAVSCORE_MODEL_ID);
  assert.equal(restored.stateSchemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
  assert.equal(restored.modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
  assert.equal(restored.modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
  assert.equal(
    restored.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  assert.equal(restored.payloadLogged, false);
  assert.equal(memory.calls.length, 3);
  assert.match(
    memory.calls[2].suffix,
    /^\?document_key=eq\.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2$/,
  );
  assert.equal(memory.calls[2].channel, 'restore');
  assert.deepEqual(memory.calls[2].options, {});
  assert.equal(memory.calls[2].operation, 'read');
  assert.deepEqual(
    JSON.parse(await fs.readFile(restoredCheckpointPath, 'utf8')),
    checkpoint,
  );
  assert.deepEqual(
    await fs.readdir(path.dirname(restoredCheckpointPath)),
    ['checkpoint.json'],
    'successful restore must not leave a remote temporary file',
  );

  const predecessor = RAVSCORE_CONTINUATION_COMPATIBLE_PREDECESSORS[0];
  const reorderedCheckpoint = reorderObjectMembers(checkpoint);
  assert.deepEqual(reorderedCheckpoint, checkpoint,
    'Transport may reorder object members, never values or array elements');
  assert.notEqual(JSON.stringify(reorderedCheckpoint), JSON.stringify(checkpoint));
  const reorderedCentral = memoryCentral(rowFor(reorderedCheckpoint, 3));
  const reorderedTarget = checkpointPathFor('reordered-restore-root');
  const restoredReordered = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: reorderedTarget,
    targetReference: atHour(50),
    request: reorderedCentral.restoreRequest,
  });
  assert.equal(restoredReordered.restored, true);
  assert.equal(restoredReordered.objectMemberOrderRestored, true);
  const reorderedSaved = JSON.parse(await fs.readFile(reorderedTarget, 'utf8'));
  assert.deepEqual(reorderedSaved, checkpoint);
  assert.equal(reorderedSaved.stateSha256, checkpoint.stateSha256);
  assert.equal(reorderedSaved.generationSha256, checkpoint.generationSha256);
  const reorderedEquivalent = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: reorderedTarget,
    targetReference: atHour(50),
    request: reorderedCentral.restoreRequest,
  });
  assert.equal(reorderedEquivalent.reason, 'protected-checkpoint-equivalent');
  assert.equal(reorderedEquivalent.objectMemberOrderRestored, true);

  const protectedPredecessorCheckpoint = checkpointWithImplementation(
    checkpoint,
    predecessor.implementationSha256,
  );
  const predecessorMemory = memoryCentral(
    rowFor(protectedPredecessorCheckpoint, 7),
  );
  await fs.mkdir(path.dirname(predecessorRestoredCheckpointPath), {
    recursive: true,
  });
  const predecessorRestored =
    await restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: predecessorRestoredCheckpointPath,
      targetReference: atHour(50),
      request: predecessorMemory.restoreRequest,
    });
  assert.equal(predecessorRestored.restored, true);
  assert.equal(
    predecessorRestored.reason,
    'protected-checkpoint-restored-after-compatible-predecessor-reattest',
  );
  assert.equal(
    predecessorRestored.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  const normalizedProtectedPredecessor = JSON.parse(
    await fs.readFile(predecessorRestoredCheckpointPath, 'utf8'),
  );
  assert.equal(
    normalizedProtectedPredecessor.continuationStateContractSha256,
    checkpoint.continuationStateContractSha256,
  );
  assert.notEqual(
    normalizedProtectedPredecessor.generationSha256,
    protectedPredecessorCheckpoint.generationSha256,
  );
  assert.equal(
    normalizedProtectedPredecessor.candidateGRollbackCompanion.generationSha256,
    normalizedProtectedPredecessor.generationSha256,
  );
  assert.deepEqual(
    normalizedProtectedPredecessor.states,
    protectedPredecessorCheckpoint.states,
  );
  assert.deepEqual(
    predecessorMemory.row(),
    rowFor(protectedPredecessorCheckpoint, 7),
    'protected predecessor restore must not mutate the fixed-key central row',
  );
  const predecessorSameTargetPublished =
    await publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: predecessorRestoredCheckpointPath,
      targetReference: atHour(50),
      request: predecessorMemory.versionRequest,
      rpcRequest: predecessorMemory.rpcRequest,
      temporaryRoot: tempRoot,
    });
  assert.equal(predecessorSameTargetPublished.published, true);
  assert.equal(
    predecessorSameTargetPublished.reason,
    'protected-checkpoint-updated',
  );
  assert.equal(predecessorSameTargetPublished.centralVersion, 8);
  assert.deepEqual(
    predecessorMemory.row(),
    rowFor(normalizedProtectedPredecessor, 8),
    'the exact predecessor must be replaced by its current reattestation at the same target',
  );
  const predecessorResponseLostRetry =
    await publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: predecessorRestoredCheckpointPath,
      targetReference: atHour(50),
      request: predecessorMemory.versionRequest,
      rpcRequest: predecessorMemory.rpcRequest,
      temporaryRoot: tempRoot,
    });
  assert.equal(predecessorResponseLostRetry.published, false);
  assert.equal(
    predecessorResponseLostRetry.reason,
    'protected-checkpoint-already-current',
  );
  assert.equal(predecessorResponseLostRetry.centralVersion, 8);

  const predecessorConflictMemory = memoryCentral(
    rowFor(protectedPredecessorCheckpoint, 11),
  );
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: companionConflictCheckpointPath,
      targetReference: atHour(50),
      request: predecessorConflictMemory.versionRequest,
      rpcRequest: predecessorConflictMemory.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    rpcFailureIncludes(/conflicts at the same reference time/),
    'a predecessor row must not admit any same-target state change',
  );
  assert.deepEqual(
    predecessorConflictMemory.row(),
    rowFor(protectedPredecessorCheckpoint, 11),
    'a rejected predecessor transition must preserve the central row',
  );

  const newerSourcePath = path.join(tempRoot, 'source-newer.json');
  const newerCheckpointPath = checkpointPathFor('newer');
  await fs.writeFile(
    newerSourcePath,
    `${JSON.stringify(sourceDocumentAt(50))}\n`,
  );
  await saveRavScoreContinuationCheckpoint({
    sourcePath: newerSourcePath,
    checkpointPath: newerCheckpointPath,
  });
  const newerCheckpointText = await fs.readFile(newerCheckpointPath, 'utf8');
  const newerCheckpoint = JSON.parse(newerCheckpointText);

  const casMemory = memoryCentral(rowFor(checkpoint));
  const casPublished = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: newerCheckpointPath,
    targetReference: atHour(51),
    request: casMemory.versionRequest,
    rpcRequest: casMemory.rpcRequest,
    temporaryRoot: tempRoot,
  });
  assert.equal(casPublished.published, true);
  assert.equal(casPublished.reason, 'protected-checkpoint-updated');
  assert.equal(casPublished.centralVersion, 2);
  assert.equal(casMemory.row().version, 2);
  assert.deepEqual(casMemory.row().payload, newerCheckpoint);
  assert.deepEqual(casMemory.calls.map(call => call.channel), ['version', 'rpc']);
  assert.equal(casMemory.calls[1].body.p_expected_version, 1);

  const alreadyCurrent = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: newerCheckpointPath,
    targetReference: atHour(51),
    request: casMemory.versionRequest,
    rpcRequest: casMemory.rpcRequest,
    temporaryRoot: tempRoot,
  });
  assert.equal(alreadyCurrent.published, false);
  assert.equal(alreadyCurrent.reason, 'protected-checkpoint-already-current');
  assert.equal(alreadyCurrent.centralVersion, 2);
  assert.deepEqual(
    casMemory.calls.slice(2).map(call => call.channel),
    ['version', 'rpc'],
    'an unchanged publish still uses exactly metadata GET plus equality-first RPC',
  );

  const responseLossMemory = memoryCentral(rowFor(newerCheckpoint, 2));
  const responseLossVersionRequest = async (suffix, options, operation) => {
    const rows = await responseLossMemory.versionRequest(suffix, options, operation);
    return rows.map(row => ({ ...row, version: 1 }));
  };
  const responseLossEquivalent = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: newerCheckpointPath,
    targetReference: atHour(51),
    request: responseLossVersionRequest,
    rpcRequest: responseLossMemory.rpcRequest,
    temporaryRoot: tempRoot,
  });
  assert.equal(responseLossEquivalent.published, false);
  assert.equal(responseLossEquivalent.centralVersion, 2);
  assert.deepEqual(responseLossMemory.row(), rowFor(newerCheckpoint, 2));

  const companionConflictPublishMemory =
    memoryCentral(rowFor(companionConflictCheckpoint));
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: localCheckpointPath,
      targetReference: atHour(50),
      request: companionConflictPublishMemory.versionRequest,
      rpcRequest: companionConflictPublishMemory.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    rpcFailureIncludes(/conflicts at the same reference time/),
  );
  assert.equal(
    companionConflictPublishMemory.calls.length,
    2,
    'companion-divergent publish must stop inside the atomic RPC',
  );
  assert.deepEqual(
    companionConflictPublishMemory.row().payload,
    companionConflictCheckpoint,
  );

  const regressionMemory = memoryCentral(rowFor(newerCheckpoint, 2));
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: localCheckpointPath,
      targetReference: atHour(51),
      request: regressionMemory.versionRequest,
      rpcRequest: regressionMemory.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    rpcFailureIncludes(/would regress central state/),
  );
  assert.deepEqual(regressionMemory.row(), rowFor(newerCheckpoint, 2));

  const losingRaceMemory = memoryCentral(rowFor(checkpoint, 2));
  const staleVersionRequest = async (suffix, options, operation) => {
    const rows = await losingRaceMemory.versionRequest(suffix, options, operation);
    return rows.map(row => ({ ...row, version: 1 }));
  };
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: newerCheckpointPath,
      targetReference: atHour(51),
      request: staleVersionRequest,
      rpcRequest: losingRaceMemory.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    rpcFailureIncludes(/compare-and-swap lost a concurrent write/),
  );
  assert.deepEqual(losingRaceMemory.row(), rowFor(checkpoint, 2));

  const assertRpcMetadataRejected = async mutate => {
    const metadataMemory = memoryCentral();
    const invalidRpc = async body => {
      const value = rpcMetadataFor(body.p_payload, 'inserted', 1);
      mutate(value);
      return value;
    };
    await assert.rejects(
      publishProtectedRavScoreContinuationCheckpoint({
        checkpointPath: localCheckpointPath,
        targetReference: atHour(50),
        request: metadataMemory.versionRequest,
        rpcRequest: invalidRpc,
        temporaryRoot: tempRoot,
      }),
      /RPC metadata is incompatible/,
    );
    assert.equal(metadataMemory.row(), null);
  };
  await assertRpcMetadataRejected(metadata => {
    metadata.productionReferenceAt = atHour(48);
  });
  await assertRpcMetadataRejected(metadata => {
    metadata.unexpected = true;
  });
  await assertRpcMetadataRejected(metadata => {
    metadata.centralVersion = '1';
  });

  await fs.writeFile(restoredCheckpointPath, newerCheckpointText);
  const localNewer = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(51),
    request: memoryCentral(rowFor(checkpoint)).restoreRequest,
  });
  assert.equal(localNewer.restored, false);
  assert.equal(localNewer.reason, 'local-checkpoint-newer');
  assert.equal(localNewer.checkpointAt, atHour(50));
  assert.equal(localNewer.targetUnchanged, true);
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), newerCheckpointText);

  await fs.writeFile(restoredCheckpointPath, `${JSON.stringify(checkpoint)}\n`);
  const remoteNewer = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(51),
    request: memoryCentral(rowFor(newerCheckpoint)).restoreRequest,
  });
  assert.equal(remoteNewer.restored, true);
  assert.equal(remoteNewer.checkpointAt, atHour(50));
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), newerCheckpointText);

  await fs.writeFile(restoredCheckpointPath, `${JSON.stringify(checkpoint)}\n`);
  const equivalent = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: restoredCheckpointPath,
    targetReference: atHour(50),
    request: memoryCentral(rowFor(checkpoint)).restoreRequest,
  });
  assert.equal(equivalent.restored, false);
  assert.equal(equivalent.reason, 'protected-checkpoint-equivalent');
  assert.equal(equivalent.targetUnchanged, true);

  const companionConflictBefore = await fs.readFile(restoredCheckpointPath, 'utf8');
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: restoredCheckpointPath,
      targetReference: atHour(50),
      request: memoryCentral(rowFor(companionConflictCheckpoint)).restoreRequest,
    }),
    /conflict at the same reference time/,
  );
  assert.equal(
    await fs.readFile(restoredCheckpointPath, 'utf8'),
    companionConflictBefore,
    'companion-divergent restore must preserve the local checkpoint byte-for-byte',
  );

  const conflictSourcePath = path.join(tempRoot, 'conflict-source.json');
  const conflictCheckpointPath = checkpointPathFor('conflict');
  await fs.writeFile(
    conflictSourcePath,
    `${JSON.stringify(sourceDocumentAt(49, 'rr-protected-schema6-conflict'))}\n`,
  );
  await saveRavScoreContinuationCheckpoint({
    sourcePath: conflictSourcePath,
    checkpointPath: conflictCheckpointPath,
  });
  const sameTimeConflict = JSON.parse(await fs.readFile(conflictCheckpointPath, 'utf8'));
  const equivalentBefore = await fs.readFile(restoredCheckpointPath, 'utf8');
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: restoredCheckpointPath,
      targetReference: atHour(50),
      request: memoryCentral(rowFor(sameTimeConflict)).restoreRequest,
    }),
    /conflict at the same reference time/,
  );
  assert.equal(await fs.readFile(restoredCheckpointPath, 'utf8'), equivalentBefore);

  const absentPath = checkpointPathFor('missing-remote');
  const absent = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: absentPath,
    targetReference: atHour(50),
    request: memoryCentral().restoreRequest,
  });
  assert.deepEqual(absent, {
    restored: false,
    reason: 'protected-checkpoint-not-found',
    documentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
    targetUnchanged: true,
  });
  await assert.rejects(fs.access(absentPath), /ENOENT/);

  const outsideDedicatedCache = memoryCentral(rowFor(checkpoint));
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: path.join(tempRoot, 'arbitrary-output.json'),
      targetReference: atHour(50),
      request: outsideDedicatedCache.restoreRequest,
    }),
    /dedicated \.cache path/,
  );
  assert.equal(
    outsideDedicatedCache.calls.length,
    0,
    'an invalid restore target must be rejected before any protected fetch',
  );
  const outsidePublishCentral = memoryCentral();
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: path.join(tempRoot, 'arbitrary-publish.json'),
      targetReference: atHour(50),
      request: outsidePublishCentral.versionRequest,
      rpcRequest: outsidePublishCentral.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    /dedicated \.cache path/,
  );
  assert.equal(
    outsidePublishCentral.calls.length,
    0,
    'an invalid publish target must be rejected before metadata or RPC access',
  );

  const atomicTarget = checkpointPathFor('atomic');
  await fs.mkdir(path.dirname(atomicTarget), { recursive: true });
  const sentinel = 'known-safe-previous-checkpoint\n';
  const assertRemoteRejectsWithoutMutation = async ({
    row,
    targetReference = atHour(50),
    match,
    request,
  }) => {
    await fs.writeFile(atomicTarget, sentinel);
    await assert.rejects(
      restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath: atomicTarget,
        targetReference,
        request: request ?? memoryCentral(row).restoreRequest,
      }),
      match,
    );
    assert.equal(
      await fs.readFile(atomicTarget, 'utf8'),
      sentinel,
      'rejected protected restore must preserve the previous checkpoint byte-for-byte',
    );
    assert.deepEqual(
      await fs.readdir(path.dirname(atomicTarget)),
      ['checkpoint.json'],
      'rejected protected restore must clean its temporary file',
    );
  };

  await assertRemoteRejectsWithoutMutation({
    row: {
      document_key: 'not-allowlisted',
      payload: checkpoint,
      version: 1,
    },
    match: /unexpected document key/,
  });

  const tampered = clone(checkpoint);
  tampered.stateSha256 = '0'.repeat(64);
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(tampered),
    match: /state integrity is invalid/,
  });

  const wrongModel = clone(checkpoint);
  wrongModel.modelBinding.modelId = 'wrong-model';
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(wrongModel),
    match: /incompatible modelId/,
  });

  const wrongCount = clone(checkpoint);
  wrongCount.partCount = PART_COUNT - 1;
  await assertRemoteRejectsWithoutMutation({
    row: rowFor(wrongCount),
    match: /descriptor is invalid/,
  });

  await assertRemoteRejectsWithoutMutation({
    row: rowFor(checkpoint),
    targetReference: atHour(48),
    match: /future relative to the bound target/,
  });

  const expiredCompanionPath = checkpointPathFor('expired-companion');
  const expiredCompanionRestore = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: expiredCompanionPath,
    targetReference: atHour(
      50 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
    ),
    request: memoryCentral(rowFor(checkpoint)).restoreRequest,
  });
  assert.equal(expiredCompanionRestore.restored, true);
  assert.equal(expiredCompanionRestore.continuationAvailable, false);
  assert.equal(
    JSON.parse(await fs.readFile(expiredCompanionPath, 'utf8'))
      .candidateGRollbackCompanion.status,
    'candidate-g-measured-continuation-companion',
  );
  const expiredPublishMemory = memoryCentral();
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: localCheckpointPath,
      targetReference: atHour(
        50 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
      ),
      request: expiredPublishMemory.versionRequest,
      rpcRequest: expiredPublishMemory.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    /Expired schema-6 continuation checkpoints cannot be published/,
  );
  assert.equal(expiredPublishMemory.row(), null,
    'companion-only expiry is restorable but must never be republished as fresh state');
  assert.equal(
    expiredPublishMemory.calls.length,
    0,
    'an expired local checkpoint must fail before metadata or RPC access',
  );

  const maximumAgePath = checkpointPathFor('maximum-age');
  const maximumAgeRestore = await restoreProtectedRavScoreContinuationCheckpoint({
    checkpointPath: maximumAgePath,
    targetReference: atHour(
      49 + RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
    ),
    request: memoryCentral(rowFor(checkpoint)).restoreRequest,
  });
  assert.equal(maximumAgeRestore.restored, true);
  assert.equal(
    maximumAgeRestore.ageHours,
    RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumAgeHours,
  );

  const secretErrorText = 'must-not-log-a-protected-payload';
  await fs.writeFile(atomicTarget, sentinel);
  await assert.rejects(
    restoreProtectedRavScoreContinuationCheckpoint({
      checkpointPath: atomicTarget,
      targetReference: atHour(50),
      request: async () => { throw new Error(secretErrorText); },
    }),
    error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.message.includes(secretErrorText), false);
      assert.match(error.message, /read failed closed/);
      return true;
    },
  );
  assert.equal(await fs.readFile(atomicTarget, 'utf8'), sentinel);

  const syntheticSupabaseUrl = 'https://example.invalid';
  const syntheticServiceRoleKey = 'synthetic-service-role-key';
  const versionSuffix =
    '?document_key=eq.ravscore-continuation-checkpoint'
    + '&select=document_key,version&limit=2';
  const restoreSuffix =
    '?document_key=eq.ravscore-continuation-checkpoint'
    + '&select=document_key,payload,version&limit=2';
  const rpcBody = {
    p_expected_version: 0,
    p_target_reference: checkpoint.productionReferenceAt,
    p_payload: checkpoint,
  };

  const versionFetchCalls = [];
  const versionRequester = createProtectedRavScoreCheckpointVersionRequester({
    supabaseUrl: `${syntheticSupabaseUrl}/`,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async (endpoint, options) => {
      versionFetchCalls.push({ endpoint, options: clone(options) });
      return new Response(JSON.stringify([{
        document_key: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
        version: 7,
      }]), { status: 200 });
    },
    logger: () => {},
  });
  assert.deepEqual(
    await versionRequester(versionSuffix, {}, 'version read'),
    [{
      document_key: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
      version: 7,
    }],
  );
  assert.equal(versionFetchCalls.length, 1);
  assert.equal(
    versionFetchCalls[0].endpoint,
    `${syntheticSupabaseUrl}/rest/v1/admin_documents${versionSuffix}`,
  );
  assert.deepEqual(Object.keys(versionFetchCalls[0].options).sort(), ['headers', 'method']);
  assert.equal(versionFetchCalls[0].options.method, 'GET');
  assert.equal('body' in versionFetchCalls[0].options, false);
  assert.equal(versionFetchCalls[0].options.headers.apikey, syntheticServiceRoleKey);
  assert.equal(
    versionFetchCalls[0].options.headers.Authorization,
    `Bearer ${syntheticServiceRoleKey}`,
  );
  assert.equal(versionFetchCalls[0].endpoint.includes('payload'), false);
  await assert.rejects(
    versionRequester(restoreSuffix, {}, 'version read'),
    /rejected a non-metadata query/,
  );
  await assert.rejects(
    versionRequester(versionSuffix, { method: 'POST' }, 'version read'),
    /rejected a non-metadata query/,
  );
  await assert.rejects(
    versionRequester(versionSuffix, { body: '{}' }, 'version read'),
    /rejected a non-metadata query/,
  );
  assert.equal(versionFetchCalls.length, 1);

  const exactRpcMetadata = rpcMetadataFor(checkpoint, 'inserted', 1);
  const rpcMetadataJson = JSON.stringify(exactRpcMetadata);
  assert.ok(
    Buffer.byteLength(rpcMetadataJson, 'utf8')
      < PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
  );
  const exactBoundedRpcResponse = rpcMetadataJson.padEnd(
    PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
    ' ',
  );
  assert.equal(
    Buffer.byteLength(exactBoundedRpcResponse, 'utf8'),
    PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES,
  );
  const rpcFetchCalls = [];
  const rpcRequester = createProtectedRavScoreCheckpointRpcRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async (endpoint, options) => {
      rpcFetchCalls.push({ endpoint, options: clone(options) });
      return new Response(exactBoundedRpcResponse, { status: 200 });
    },
    logger: () => {},
  });
  assert.deepEqual(
    await rpcRequester(rpcBody, 'publish'),
    exactRpcMetadata,
    'an exact 4096-byte RPC metadata response is accepted',
  );
  assert.equal(rpcFetchCalls.length, 1);
  assert.equal(
    rpcFetchCalls[0].endpoint,
    `${syntheticSupabaseUrl}/rest/v1/rpc/${PROTECTED_RAVSCORE_CHECKPOINT_RPC}`,
  );
  assert.deepEqual(Object.keys(rpcFetchCalls[0].options).sort(), [
    'body',
    'headers',
    'method',
  ]);
  assert.equal(rpcFetchCalls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(rpcFetchCalls[0].options.body), rpcBody);
  assert.equal(rpcFetchCalls[0].options.headers.apikey, syntheticServiceRoleKey);
  assert.equal(
    rpcFetchCalls[0].options.headers.Authorization,
    `Bearer ${syntheticServiceRoleKey}`,
  );
  await assert.rejects(
    rpcRequester({ ...rpcBody, unexpected: true }, 'publish'),
    /RPC body is invalid/,
  );
  assert.equal(rpcFetchCalls.length, 1);

  const oversizedRpcRequester = createProtectedRavScoreCheckpointRpcRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async () => new Response(
      rpcMetadataJson.padEnd(
        PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES + 1,
        ' ',
      ),
      { status: 200 },
    ),
    logger: () => {},
  });
  await assert.rejects(
    oversizedRpcRequester(rpcBody, 'publish'),
    /RPC response exceeds its response bound/,
    'a 4097-byte RPC metadata response must fail closed',
  );

  const oversizedVersionRequester =
    createProtectedRavScoreCheckpointVersionRequester({
      supabaseUrl: syntheticSupabaseUrl,
      serviceRoleKey: syntheticServiceRoleKey,
      fetchImpl: async () => new Response(
        JSON.stringify([{
          document_key: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
          version: 1,
        }]).padEnd(
          PROTECTED_RAVSCORE_CHECKPOINT_RPC_MAXIMUM_RESPONSE_BYTES + 1,
          ' ',
        ),
        { status: 200 },
      ),
      logger: () => {},
    });
  await assert.rejects(
    oversizedVersionRequester(versionSuffix, {}, 'version read'),
    /version response exceeds its response bound/,
  );

  let responseLostRpcCalls = 0;
  let responseLostCommittedPayload = null;
  let responseLostDelayCalls = 0;
  const responseLostLogs = [];
  const responseLostRpcRequester = createProtectedRavScoreCheckpointRpcRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async (_endpoint, options) => {
      responseLostRpcCalls += 1;
      const body = JSON.parse(options.body);
      if (!responseLostCommittedPayload) {
        responseLostCommittedPayload = clone(body.p_payload);
        throw new Error(secretErrorText);
      }
      assert.deepEqual(body.p_payload, responseLostCommittedPayload);
      return new Response(JSON.stringify(
        rpcMetadataFor(responseLostCommittedPayload, 'unchanged', 1),
      ), { status: 200 });
    },
    retryDelayMs: 0,
    delayImpl: async () => {
      responseLostDelayCalls += 1;
    },
    logger: message => responseLostLogs.push(message),
  });
  const responseLostPublishMemory = memoryCentral();
  const responseLostPublish = await publishProtectedRavScoreContinuationCheckpoint({
    checkpointPath: localCheckpointPath,
    targetReference: atHour(50),
    request: responseLostPublishMemory.versionRequest,
    rpcRequest: responseLostRpcRequester,
    temporaryRoot: tempRoot,
  });
  assert.equal(responseLostPublish.published, false);
  assert.equal(responseLostPublish.reason, 'protected-checkpoint-already-current');
  assert.equal(responseLostPublish.centralVersion, 1);
  assert.equal(responseLostRpcCalls, 2);
  assert.equal(responseLostDelayCalls, 1);
  assert.deepEqual(responseLostCommittedPayload, checkpoint);
  assert.equal(responseLostLogs.length, 1);
  assert.equal(responseLostLogs[0].includes(secretErrorText), false);
  assert.equal(responseLostLogs[0].includes(checkpoint.datasetId), false);

  const restoreFetchCalls = [];
  const exactRestoreRequester = createProtectedRavScoreCheckpointRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async (endpoint, options) => {
      restoreFetchCalls.push({ endpoint, options: clone(options) });
      return new Response(JSON.stringify([rowFor(checkpoint)]), { status: 200 });
    },
    logger: () => {},
  });
  assert.deepEqual(
    await exactRestoreRequester(restoreSuffix, {}, 'read'),
    [rowFor(checkpoint)],
  );
  assert.equal(restoreFetchCalls.length, 1);
  assert.equal(
    restoreFetchCalls[0].endpoint,
    `${syntheticSupabaseUrl}/rest/v1/admin_documents${restoreSuffix}`,
  );
  assert.deepEqual(Object.keys(restoreFetchCalls[0].options).sort(), [
    'headers',
    'method',
  ]);
  assert.equal(restoreFetchCalls[0].options.method, 'GET');
  assert.equal('body' in restoreFetchCalls[0].options, false);
  await assert.rejects(
    exactRestoreRequester(versionSuffix, {}, 'read'),
    /rejected a non-read query/,
  );
  assert.equal(restoreFetchCalls.length, 1);

  const oversizedRestoreRequester = createProtectedRavScoreCheckpointRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async () => new Response('[]', {
      status: 200,
      headers: {
        'content-length': String(
          PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES + 1,
        ),
      },
    }),
    logger: () => {},
  });
  await assertRemoteRejectsWithoutMutation({
    request: oversizedRestoreRequester,
    match: error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.match(error.cause?.message ?? '', /restore response exceeds its response bound/);
      return true;
    },
  });

  for (const requesterFactory of [
    createProtectedRavScoreCheckpointRequester,
    createProtectedRavScoreCheckpointVersionRequester,
    createProtectedRavScoreCheckpointRpcRequester,
  ]) {
    assert.throws(
      () => requesterFactory({
        supabaseUrl: '',
        serviceRoleKey: '',
      }),
      /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required/,
    );
    assert.throws(
      () => requesterFactory({
        supabaseUrl: 'http://example.invalid',
        serviceRoleKey: 'synthetic-key',
      }),
      /SUPABASE_URL is invalid/,
    );
  }

  const rejectedCredentialRequest = createProtectedRavScoreCheckpointRequester({
    supabaseUrl: 'https://example.invalid',
    serviceRoleKey: 'synthetic-wrong-key',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        code: 'AUTH_FAILED',
        message: secretErrorText,
      }),
    }),
    retryDelayMs: 0,
    delayImpl: async () => {},
    logger: () => {},
  });
  await assertRemoteRejectsWithoutMutation({
    request: rejectedCredentialRequest,
    match: error => {
      assert.equal(error.code, 'PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR');
      assert.equal(error.message.includes(secretErrorText), false);
      return true;
    },
  });

  const rejectedCredentialRpc = createProtectedRavScoreCheckpointRpcRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: 'synthetic-wrong-key',
    fetchImpl: async () => new Response(JSON.stringify({
      code: 'AUTH_FAILED',
      message: secretErrorText,
    }), { status: 401 }),
    retryDelayMs: 0,
    delayImpl: async () => {},
    logger: () => {},
  });
  await assert.rejects(
    rejectedCredentialRpc(rpcBody, 'publish'),
    error => {
      assert.equal(error.message.includes(secretErrorText), false);
      assert.match(error.message, /HTTP 401 AUTH_FAILED/);
      assert.equal(error.safeDiagnostic, 'HTTP_401_AUTH_FAILED_UNCLASSIFIED');
      return true;
    },
  );

  const invalidCheckpointRpc = createProtectedRavScoreCheckpointRpcRequester({
    supabaseUrl: syntheticSupabaseUrl,
    serviceRoleKey: syntheticServiceRoleKey,
    fetchImpl: async () => new Response(JSON.stringify({
      code: '22023',
      message: 'invalid protected RavScore checkpoint CAS input',
      details: secretErrorText,
    }), { status: 400 }),
    retryDelayMs: 0,
    delayImpl: async () => {},
    logger: () => {},
  });
  await assert.rejects(invalidCheckpointRpc(rpcBody, 'publish'), error => {
    assert.equal(error.safeDiagnostic, 'HTTP_400_22023_INPUT_INVALID');
    assert.equal(error.message.includes(secretErrorText), false);
    return true;
  });

  const symlinkRealTarget = checkpointPathFor('symlink-real');
  const symlinkExposedTarget = checkpointPathFor('symlink-exposed');
  await fs.mkdir(path.dirname(symlinkRealTarget), { recursive: true });
  await fs.writeFile(symlinkRealTarget, `${JSON.stringify(checkpoint)}\n`);
  await fs.mkdir(
    path.dirname(path.dirname(symlinkExposedTarget)),
    { recursive: true },
  );
  let symlinkCreated = true;
  try {
    await fs.symlink(
      path.dirname(symlinkRealTarget),
      path.dirname(symlinkExposedTarget),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error?.code)) {
      throw error;
    }
    symlinkCreated = false;
  }
  if (symlinkCreated) {
    const symlinkBefore = await fs.readFile(symlinkRealTarget, 'utf8');
    const symlinkPublishMemory = memoryCentral();
    await assert.rejects(
      publishProtectedRavScoreContinuationCheckpoint({
        checkpointPath: symlinkExposedTarget,
        targetReference: atHour(50),
        request: symlinkPublishMemory.versionRequest,
        rpcRequest: symlinkPublishMemory.rpcRequest,
        temporaryRoot: tempRoot,
      }),
      /must not traverse a symlink/,
    );
    assert.equal(symlinkPublishMemory.calls.length, 0);
    assert.equal(
      await fs.readFile(symlinkRealTarget, 'utf8'),
      symlinkBefore,
      'a rejected symlink publish must not mutate the underlying checkpoint',
    );
  }

  const tamperedLocalPath = checkpointPathFor('tampered-local');
  await fs.mkdir(path.dirname(tamperedLocalPath), { recursive: true });
  await fs.writeFile(tamperedLocalPath, `${JSON.stringify(tampered)}\n`);
  const unpublished = memoryCentral();
  await assert.rejects(
    publishProtectedRavScoreContinuationCheckpoint({
      checkpointPath: tamperedLocalPath,
      targetReference: atHour(50),
      request: unpublished.versionRequest,
      rpcRequest: unpublished.rpcRequest,
      temporaryRoot: tempRoot,
    }),
    /state integrity is invalid/,
  );
  assert.equal(unpublished.calls.length, 0, 'invalid local checkpoint must not be published');
  assert.deepEqual(
    JSON.parse(await fs.readFile(localCheckpointPath, 'utf8')),
    checkpoint,
    'failed pre-publication validation must never mutate the valid local checkpoint',
  );

  console.log('Protected schema-6 RavScore checkpoint backup/restore contract passes.');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
