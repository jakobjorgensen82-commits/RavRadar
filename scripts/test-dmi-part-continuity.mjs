import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { DMI_FORECAST_HOURS } from './lib/dmi-forecast-store.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { WEATHER_PROGRESS_MAX_CIPHER_BYTES } from './weather-component-progress-cache.mjs';
import { assertDmiPartContinuityTotalSize, MAX_TOTAL_RAW_BYTES,
  MAX_TOTAL_COMPRESSED_BYTES, packDmiPartContinuity,
  unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';

// The former 512/96 MiB ceilings rejected a legitimate 673-PART build after
// providers had run. Exercise both independent bounds without allocating GiB.
assert.ok(MAX_TOTAL_RAW_BYTES >= 4 * 512 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES >= 160 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES < 256 * 1024 * 1024);
assert.ok(MAX_TOTAL_COMPRESSED_BYTES < WEATHER_PROGRESS_MAX_CIPHER_BYTES / 2);
const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES } = await import('./private-production-runtime-workflow.mjs');
assert(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes('scripts/read-authenticated-dmi-current-companions.mjs'),
  'The actual authenticated-original controller must remain in normal producer source review');
assert.ok(MAX_TOTAL_COMPRESSED_BYTES
  < PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes / 2);
assert.doesNotThrow(() => assertDmiPartContinuityTotalSize(
  512 * 1024 * 1024 + 1, 96 * 1024 * 1024 + 1));
assert.throws(() => assertDmiPartContinuityTotalSize(MAX_TOTAL_RAW_BYTES + 1, 1),
  /TOTAL_RAW_SIZE_LIMIT/);
assert.throws(() => assertDmiPartContinuityTotalSize(1, MAX_TOTAL_COMPRESSED_BYTES + 1),
  /TOTAL_COMPRESSED_SIZE_LIMIT/);

const start = '2026-09-27T10:00:00.000Z';
const parts = [{ partId: 'A', zoneId: 'SYNTHETIC-ZONE', waterPoint: [10, 56] },
  { partId: 'B', zoneId: 'SYNTHETIC-ZONE', waterPoint: [11, 57] }];
const hours = Array.from({ length: DMI_FORECAST_HOURS }, (_, index) => ({
  time: new Date(Date.parse(start) + index * 3_600_000).toISOString(),
  waterTemperatureC: index === 36 ? 12.3 : null,
  sources: { waterTemperature: index === 36
    ? { provider: 'dmi', modelRun: '2026-09-26T18:00:00.000Z' }
    : { provider: 'missing' } },
}));
const records = new Map(parts.map(part => [part.partId, {
  zoneId: `PART::${part.partId}`, point: part.waterPoint, hourly: hours,
}]));
const pack = await packDmiPartContinuity(records, parts, start);
const next = await unpackDmiPartContinuity(pack, parts, '2026-09-27T11:00:00.000Z');
assert.equal(next.size, 2);
assert.deepEqual(next.get('A').hourly, hours);
assert.equal((await unpackDmiPartContinuity(pack, [
  { ...parts[0], waterPoint: [10.1, 56] }, parts[1],
], '2026-09-27T11:00:00.000Z')).has('A'), false);
await assert.rejects(unpackDmiPartContinuity({
  ...pack, entries: [{ ...pack.entries[0], compressedSha256: '0'.repeat(64) },
    ...pack.entries.slice(1)],
}, parts, '2026-09-27T11:00:00.000Z'), /DIGEST/);
await assert.rejects(unpackDmiPartContinuity(pack, parts, '2026-09-27T09:00:00.000Z'),
  /MARKER/);

// Exercise the actual updater's completed pack/retirement block, not a second
// implementation or a fake codec. This proves reference/byte behaviour only;
// the deliberately retained fixture observations cannot prove a heap peak.
const updater = (await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8'))
  .replace(/\r\n/g, '\n');
const packStart = 'if (coastalPartScoreBuild) {\n  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(';
const packEnd = "reportWeatherBuildStage('coastal-score-runtime-ready', {";
assert.equal(updater.split(packStart).length, 2, 'Actual updater pack block must be unique');
assert.equal(updater.split(packEnd).length, 2, 'Actual updater pack boundary must be unique');
const packStartAt = updater.indexOf(packStart);
const packEndAt = updater.indexOf(packEnd, packStartAt);
assert.ok(packEndAt > packStartAt, 'Actual updater pack must precede score-ready reporting');
const packBlock = updater.slice(packStartAt, packEndAt);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runActualPackBlock = new AsyncFunction(
  'coastalPartScoreBuild', 'persistedDmiPartRows', 'nextDmiForecastStore',
  'activeParts', 'generatedAt', 'packDmiPartContinuity',
  `let failurePresent = false, firstFailure;\ntry {\n${packBlock}\n}
   catch (error) { failurePresent = true; firstFailure = error; }
   return { failurePresent, firstFailure,
     selectedReference: coastalPartScoreBuild?.selectedDmiPartRecords,
     nativeProofReference: coastalPartScoreBuild?.selectedDmiPartNativeProofs,
     persistedReference: persistedDmiPartRows,
     partContinuity: nextDmiForecastStore.partContinuity };`,
);
const persistedRows = new Map([...records].map(([id, record]) =>
  [id, { point: record.point, hourly: record.hourly }]));
const originalRecords = structuredClone(records);
const originalPersistedRows = structuredClone(persistedRows);
const originalRecordA = records.get('A');
const originalHoursA = records.get('A').hourly;
const originalPackBytes = Buffer.from(JSON.stringify(pack));
assert.equal(pack.schemaVersion, 1);
assert.deepEqual(Buffer.from(JSON.stringify(await packDmiPartContinuity(records, parts, start))), originalPackBytes,
  'The old three-argument schema1 whole-byte contract remains separate');
const nullNativeProofs = new Map(parts.map(part => [part.partId, null]));
const expectedNewPack = await packDmiPartContinuity(records, parts, start,
  { nativeCurrentProofsByPart: nullNativeProofs });
assert.equal(expectedNewPack.schemaVersion, 2);
const expectedNewPackBytes = Buffer.from(JSON.stringify(expectedNewPack));

// Real normal-codec refusal must occur before either reference is retired and
// must preserve the previous bound pack. No replacement codec or error stub.
const invalidRecords = new Map(records);
invalidRecords.set('A', { ...records.get('A'),
  hourly: records.get('A').hourly.map((row, index) => index === 0
    ? { ...row, time: 'not-an-exact-hour' } : row) });
const invalidSnapshot = structuredClone(invalidRecords);
const refused = await runActualPackBlock(
  { selectedDmiPartRecords: invalidRecords, selectedDmiPartNativeProofs: nullNativeProofs }, persistedRows, { partContinuity: pack },
  parts, start, packDmiPartContinuity,
);
assert.equal(refused.failurePresent, true);
assert.match(refused.firstFailure?.message ?? '', /^DMI_PART_CONTINUITY_RECORD_INVALID$/);
assert.equal(refused.selectedReference, invalidRecords);
assert.equal(refused.nativeProofReference, nullNativeProofs);
assert.equal(refused.persistedReference, persistedRows);
assert.equal(refused.partContinuity, pack);
assert.deepEqual(invalidRecords, invalidSnapshot);

const completed = await runActualPackBlock(
  { selectedDmiPartRecords: records, selectedDmiPartNativeProofs: nullNativeProofs }, persistedRows, { partContinuity: null },
  parts, start, packDmiPartContinuity,
);
assert.equal(completed.failurePresent, false);
assert.deepEqual(Buffer.from(JSON.stringify(completed.partContinuity)), expectedNewPackBytes,
  'Retirement must preserve the entire hash-bound pack byte-for-byte');
const completedRows = await unpackDmiPartContinuity(completed.partContinuity, parts,
  '2026-09-27T11:00:00.000Z');
for (const part of parts) assert.deepEqual(completedRows.get(part.partId).hourly, hours);
assert.deepEqual(records, originalRecords);
assert.deepEqual(persistedRows, originalPersistedRows);
assert.equal(records.get('A'), originalRecordA);
assert.equal(records.get('A').hourly, originalHoursA);
assert.equal(completed.selectedReference === null, true,
  'DMI_CONTINUITY_SELECTED_REFERENCE_NOT_RETIRED');
assert.equal(completed.persistedReference === null, true,
  'DMI_CONTINUITY_PERSISTED_REFERENCE_NOT_RETIRED');
assert.equal(completed.nativeProofReference === null, true,
  'DMI_CONTINUITY_NATIVE_PROOF_REFERENCE_NOT_RETIRED');
assert.match(updater, /^let persistedDmiPartRows =/m,
  'The actual updater binding must permit reference retirement');
console.log('DMI PART continuity codec: roundtrip, tamper, time and size limits passed');


// Additive schema2 proposal. Synthetic native INPUTS use the real normal
// forecast constructor and proof-bank builder. Not GRIB/B/GCM/native evidence.
{
  const { buildDmiForecastHourly } = await import('./lib/dmi-forecast-store.mjs');
  const { dmiExpectedIdentityForPart } = await import('./lib/ravscore-production-adapters.mjs');
  const { buildProtectedDmiNativeCurrentProofs } = await import('./lib/protected-dmi-native-current-proofs.mjs');
  const crypto = await import('node:crypto');
  const zlib = await import('node:zlib');
  const os = await import('node:os');
  const path = await import('node:path');
  const { writeDmiForecastFileAtomic, inspectDmiForecastFile, readDmiForecastRecord } =
    await import('./lib/dmi-forecast-file.mjs');
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const clone = value => JSON.parse(JSON.stringify(value));
  const at = n => new Date(Date.parse(start) + n * 3_600_000).toISOString();
  const part = { partId: 'SYNTHETIC-CONTINUITY-PART', zoneId: 'SYNTHETIC-ZONE', waterPoint: [8, 55] };
  const identity = dmiExpectedIdentityForPart(part);
  const selection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
  const nativeRow = n => {
    const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'], optionalFieldSet: [],
      modelRun: at(-12), nativeValidTime: at(n), leadTimeHours: 12 + n, ...identity, gridPoint: [8, 55],
      gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0, spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation',
      spatialSemanticsVersion: 1, vectorSelection: selection, vectorSemanticsVersion: 3, verticalLayer: 'depth:1', verticalLayerRankM: 1,
      itemId: `synthetic-continuity-${n}`, assetIdentitySha256: 'a'.repeat(64), contentSha256: 'c'.repeat(64), acquiredAt: at(-1), itemUpdatedAt: at(-11) };
    return { time: at(n), 'current-u': n / 100, 'current-v': 0, sources: { current: source } };
  };
  const native = [0, 3].map(nativeRow);
  const bulk = { generatedAt: at(0), currentVectorSemanticsVersion: 3, currentVectorSelection: selection,
    currentMaxDistanceKm: 5, timeStrideHours: 3, zones: { [identity.entityId]: { ...identity,
      hourly: Object.fromEntries(native.map(row => [row.time, row])) } } };
  const rows = buildDmiForecastHourly({ ocean: native.map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: at(0), startAt: at(0), hours: DMI_FORECAST_HOURS }).hourly;
  assert.equal(rows.length, 121);
  // Deliberate absent and alternate-kind slots are preserved, never proved.
  rows[10] = { ...rows[10], currentStateOnlyHold: { fixtureOnly: true } };
  rows[11] = { ...rows[11], currentUMps: 0, currentVMps: 0, sources: { current: { vectorSemanticsVersion: 4 } } };
  const bank = buildProtectedDmiNativeCurrentProofs({ selections: [{ part, row: rows[0] }, { part, row: rows[1] }], contexts: [bulk] });
  const source = new Map([[part.partId, { zoneId: identity.entityId, point: part.waterPoint, hourly: rows }]]);
  const options = { nativeCurrentProofsByPart: new Map([[part.partId, bank]]) };
  const original = JSON.stringify({ rows, bank, part });
  const second = await packDmiPartContinuity(source, [part], start, options);
  assert.equal(second.schemaVersion, 2);
  const decoded = (await unpackDmiPartContinuity(second, [part], at(1))).get(part.partId);
  assert.equal(JSON.stringify(decoded.hourly), JSON.stringify(rows));
  assert.deepEqual(decoded.nativeCurrentOriginals.bank, bank);
  assert.equal(decoded.nativeCurrentOriginals.coverage[0].status, 'DMI_ORIGINAL_PROVED');
  assert.equal(decoded.nativeCurrentOriginals.coverage[0].sampling, 'unknown');
  assert.equal(decoded.nativeCurrentOriginals.coverage[2].status, 'DMI_SELECTION_PROOF_NOT_STORED');
  assert.equal(bank.selections.some(row => row.time === at(2)), false,
    'Missing stored selection does not mean its native0/3 originals are absent');
  assert.equal(decoded.nativeCurrentOriginals.coverage[10].status, 'STATE_ONLY_HOLD_NOT_NATIVE_PROOF');
  assert.equal(decoded.nativeCurrentOriginals.coverage[11].status, 'REGIONAL_CURRENT_NOT_NATIVE_PROOF');
  assert.equal(decoded.nativeCurrentOriginals.coverage[120].status, 'NO_CURRENT');
  assert.equal((await unpackDmiPartContinuity(second, [{ ...part, waterPoint: [8.1, 55] }], at(1))).size, 0);
  assert.equal((await unpackDmiPartContinuity(second, [{ ...part, zoneId: 'OTHER' }], at(1))).size, 0);
  assert.equal(JSON.stringify({ rows, bank, part }), original);
  const legacy = await packDmiPartContinuity(source, [part], start);
  assert.equal(legacy.schemaVersion, 1);
  assert.equal(Object.hasOwn((await unpackDmiPartContinuity(legacy, [part], at(1))).get(part.partId), 'nativeCurrentOriginals'), false);
  const noBank = await packDmiPartContinuity(source, [part], start,
    { nativeCurrentProofsByPart: new Map([[part.partId, null]]) });
  assert.equal((await unpackDmiPartContinuity(noBank, [part], at(1))).get(part.partId).nativeCurrentOriginals.coverage[0].status, 'DMI_SELECTION_PROOF_NOT_STORED');
  for (const mutate of [
    value => { value.selections[0].partId = 'OTHER'; },
    value => { value.selections[0].time = at(120); },
    value => { value.selections[0].sourceSha256 = '0'.repeat(64); },
    value => { value.nativeRows[0].value.uMps += 1; },
  ]) { const wrong = clone(bank); mutate(wrong);
    await assert.rejects(packDmiPartContinuity(source, [part], start,
      { nativeCurrentProofsByPart: new Map([[part.partId, wrong]]) })); }
  const wrongTuple = new Map([[part.partId, { ...source.get(part.partId), hourly: clone(rows) }]]);
  wrongTuple.get(part.partId).hourly[0].currentUMps += 0.01;
  await assert.rejects(packDmiPartContinuity(wrongTuple, [part], start, options), { message: 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH' });
  await assert.rejects(packDmiPartContinuity(source, [part], start,
    { nativeCurrentProofsByPart: new Map() }), /INPUT_INVALID/);
  // Rehash/recompress the outer container: inner row/evidence binding must fail.
  const tampered = clone(second), entry = tampered.entries[0];
  const body = JSON.parse(zlib.gunzipSync(Buffer.from(entry.gzipBase64, 'base64')));
  body.nativeCurrentOriginals.coverage[0].status = 'NO_CURRENT';
  const raw = Buffer.from(JSON.stringify(body)), compressed = zlib.gzipSync(raw, { level: 6 });
  Object.assign(entry, { rawBytes: raw.length, rawSha256: sha(raw), compressedBytes: compressed.length,
    compressedSha256: sha(compressed), gzipBase64: compressed.toString('base64') });
  tampered.rawBytes = raw.length; tampered.compressedBytes = compressed.length;
  await assert.rejects(unpackDmiPartContinuity(tampered, [part], at(1)), /NATIVE_ORIGINAL_INVALID/);
  // Bounds reject before full-bank work, not merely at a changed bank digest.
  for (const field of ['nativeRows', 'contexts']) {
    const oversized = clone(bank);
    const count = field === 'nativeRows' ? 2 * bank.selections.length + 1 : bank.nativeRows.length + 1;
    oversized[field] = Array.from({ length: count }, () => clone(bank[field][0]));
    await assert.rejects(packDmiPartContinuity(source, [part], start,
      { nativeCurrentProofsByPart: new Map([[part.partId, oversized]]) }), /NATIVE_ORIGINAL_INVALID/);
  }
  // A valid own-native rebuild is insufficient if its selected source/age
  // differs from the supplied bank's original canonical selection identity.
  const changedAge = new Map([[part.partId, { ...source.get(part.partId), hourly: clone(rows) }]]);
  changedAge.get(part.partId).hourly[0].sources.current.forecastAgeHours += 1;
  await assert.rejects(packDmiPartContinuity(changedAge, [part], start, options), /NATIVE_ORIGINAL_INVALID/);

  // Exercise all 121 saved selections through the same normal bank builder.
  // This is bounded synthetic evidence, not a national performance benchmark.
  const fullNative = Array.from({ length: 41 }, (_, index) => nativeRow(index * 3));
  const fullBulk = { ...bulk, zones: { [identity.entityId]: { ...identity,
    hourly: Object.fromEntries(fullNative.map(row => [row.time, row])) } } };
  const fullRows = buildDmiForecastHourly({ ocean: fullNative.map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
    generatedAt: at(0), startAt: at(0), hours: DMI_FORECAST_HOURS }).hourly;
  const fullBank = buildProtectedDmiNativeCurrentProofs({
    selections: fullRows.map(row => ({ part, row })), contexts: [fullBulk],
  });
  const fullSnapshot = JSON.stringify({ fullRows, fullBank });
  const fullPack = await packDmiPartContinuity(new Map([[part.partId, {
    zoneId: identity.entityId, point: part.waterPoint, hourly: fullRows,
  }]]), [part], start, { nativeCurrentProofsByPart: new Map([[part.partId, fullBank]]) });
  const fullDecoded = (await unpackDmiPartContinuity(fullPack, [part], at(1))).get(part.partId);
  assert.equal(fullDecoded.nativeCurrentOriginals.coverage.length, 121);
  assert(fullDecoded.nativeCurrentOriginals.coverage.every(row => row.status === 'DMI_ORIGINAL_PROVED'));
  assert.equal(JSON.stringify({ fullRows, fullBank }), fullSnapshot);
  assert.deepEqual(fullDecoded.nativeCurrentOriginals.bank, fullBank);
  const codec = await fs.readFile(new URL('./lib/dmi-part-continuity.mjs', import.meta.url), 'utf8');
  const coverage = codec.slice(codec.indexOf('function originalCoverage('), codec.indexOf('function createSavedOriginals('));
  assert.equal((coverage.match(/buildProtectedDmiNativeCurrentProofs\(/g) ?? []).length, 1);
  assert.match(coverage, /selections, contexts: \[\], previousBank: bank/);
  assert.doesNotMatch(coverage, /verifyProtectedDmiNativeCurrentProof|validateProtectedDmiNativeCurrentProofs/);
  // Exercise the actual updater's pure bank/gate functions, not a copied
  // implementation. All proof math and inspectors are the real normal kernel.
  const { createProtectedDmiNativeCurrentInspector } = await import('./lib/protected-dmi-native-current-proofs.mjs');
  const { ravScoreNumber: strictRavScoreNumber } = await import('./lib/private-dmi-recovery-record.mjs');
  const { buildNewestValidRavScoreRecoverySources } = await import('./lib/ravscore-recovery-source-priority.mjs');
  const helperBegin = '// BEGIN normal PART native-original continuity';
  const helperEnd = '// END normal PART native-original continuity';
  assert.equal(updater.split(helperBegin).length, 2);
  assert.equal(updater.split(helperEnd).length, 2);
  const helperText = updater.slice(updater.indexOf(helperBegin), updater.indexOf(helperEnd) + helperEnd.length);
  const producer = new Function('buildProtectedDmiNativeCurrentProofs', 'createProtectedDmiNativeCurrentInspector',
    'ravScoreNumber', 'DMI_FORECAST_HOURS', helperText + '\nreturn { buildSelectedDmiPartNativeProofBank, assertSelectedDmiNativeOriginalsBeforeScore };')(
    buildProtectedDmiNativeCurrentProofs, createProtectedDmiNativeCurrentInspector, strictRavScoreNumber, DMI_FORECAST_HOURS,
  );
  const nativeRecord = { zoneId: identity.entityId, point: part.waterPoint, hourly: fullRows };
  const producerSnapshot = JSON.stringify({ nativeRecord, fullBank, fullBulk });
  const producedBank = producer.buildSelectedDmiPartNativeProofBank(part, nativeRecord, [fullBulk]);
  assert.deepEqual(producedBank, fullBank);
  const fromPrevious = producer.buildSelectedDmiPartNativeProofBank(part, nativeRecord, [], fullBank);
  assert.deepEqual(fromPrevious, fullBank,
    'A saved per-PART bank supplies real originals when the mutable native document no longer does');
  assert.throws(() => producer.buildSelectedDmiPartNativeProofBank(part, nativeRecord, []),
    { message: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' });
  assert.throws(() => producer.buildSelectedDmiPartNativeProofBank({ ...part, partId: 'OTHER' }, nativeRecord, [], fullBank),
    /DMI_PART_NATIVE_ORIGINAL_BANK_DOMAIN_INVALID/);
  const protectedSource = { source: 'deployed-private-runtime', nativeCurrentContexts: [],
    nativeCurrentOriginals: fullDecoded.nativeCurrentOriginals, record: nativeRecord };
  const priorityRows = buildNewestValidRavScoreRecoverySources({ fallbackSource: protectedSource,
    protectedPreviousSource: protectedSource, part, productionReferenceAt: at(3) });
  producer.assertSelectedDmiNativeOriginalsBeforeScore({ part, publicHourly: fullRows.slice(3), publicBank: fullBank,
    publicContexts: [], recoverySources: priorityRows, forwardStartAt: at(0), targetReferenceAt: at(3) });
  const unprovedSources = priorityRows.map(source => ({ ...source, nativeCurrentOriginals: null }));
  assert.throws(() => producer.assertSelectedDmiNativeOriginalsBeforeScore({ part, publicHourly: fullRows.slice(3),
    publicBank: fullBank, publicContexts: [], recoverySources: unprovedSources,
    forwardStartAt: at(0), targetReferenceAt: at(3) }), { message: 'DMI_PART_NATIVE_ORIGINAL_BEFORE_SCORE_UNPROVED',
    nativeOriginalProofCode: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' });
  const alteredPublic = clone(fullRows.slice(3));alteredPublic[0].currentUMps += 0.01;
  assert.throws(() => producer.assertSelectedDmiNativeOriginalsBeforeScore({ part, publicHourly: alteredPublic,
    publicBank: fullBank, publicContexts: [], recoverySources: priorityRows,
    forwardStartAt: at(0), targetReferenceAt: at(3) }), { message: 'DMI_PART_NATIVE_ORIGINAL_BEFORE_SCORE_UNPROVED',
    nativeOriginalProofCode: 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH' });
  const excludedRows = fullRows.map((row, index) => index % 2
    ? { ...row, sources: { current: { vectorSemanticsVersion: 4 } } }
    : { ...row, currentStateOnlyHold: { fixtureOnly: true } });
  assert.equal(producer.buildSelectedDmiPartNativeProofBank(part, { ...nativeRecord, hourly: excludedRows }, [], fullBank), null,
    'HOLD and V4 do not receive a native-current bank; their separate admission is not proved here');
  const noCurrentRows = fullRows.map(row => ({ time: row.time }));
  assert.equal(producer.buildSelectedDmiPartNativeProofBank(part, { ...nativeRecord, hourly: noCurrentRows }, []), null);
  assert.equal(JSON.stringify({ nativeRecord, fullBank, fullBulk }), producerSnapshot);
  assert(updater.indexOf('selectedDmiPartNativeProofs.set(part.partId, selectedDmiPartNativeBank)')
    < updater.indexOf('const operationalDmiRecord = applyFeggesundOperationalWaveProxy(', updater.indexOf('selectedDmiPartRecords.set(part.partId, dmiRecord)')));
  assert(updater.indexOf('assertSelectedDmiNativeOriginalsBeforeScore({', updater.indexOf('let productionSeries;'))
    < updater.indexOf('productionSeries = buildRavScoreProductionPartSeries({'));

  // The actual normal PUBLIC selector must see the saved old native bank,
  // not merely fail at the later before-score gate. These complete captures
  // are synthetic test inputs; no GRIB/provider/B authentication is claimed.
  const { buildPartDmiForecastWithProtectedRetention, buildPrivateDmiRecoveryRecord } =
    await import('./lib/private-dmi-recovery-record.mjs');
  const { inspectDmiForecastGridSampling } = await import('./lib/dmi-forecast-store.mjs');
  const capturedOld = clone(fullBulk);
  for (const native of Object.values(capturedOld.zones[identity.entityId].hourly)) {
    Object.assign(native.sources.current, { contentLengthBytes: 128, assetSizeBytes: 128 });
  }
  const corrected = clone(capturedOld);
  for (const native of Object.values(corrected.zones[identity.entityId].hourly)) {
    const s = native.sources.current;
    native['current-u'] += 0.02;
    native['current-v'] += 0.01;
    s.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: sha('continuity-public-synthetic-message-order'),
      coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: s.gridDefinitionSha256, gridPoint: [...s.gridPoint],
      fieldSet: [...s.fieldSet], optionalFieldSet: [...s.optionalFieldSet] };
  }
  const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: part.waterPoint },
    properties: { id: identity.entityId, dataPoint: part.waterPoint, coastType: 'east' } };
  const oldPublic = buildPartDmiForecastWithProtectedRetention(feature, capturedOld, null, start,
    { startAt: start, expectedIdentity: identity });
  const oldPublicBank = buildProtectedDmiNativeCurrentProofs({
    selections: oldPublic.hourly.map(row => ({ part, row })), contexts: [capturedOld],
  });
  const oldPublicPack = await packDmiPartContinuity(new Map([[part.partId, oldPublic]]), [part], start,
    { nativeCurrentProofsByPart: new Map([[part.partId, oldPublicBank]]) });
  const savedPublic = (await unpackDmiPartContinuity(oldPublicPack, [part], at(1))).get(part.partId);
  const savedSnapshot = JSON.stringify({ capturedOld, corrected, oldPublic, oldPublicBank, savedPublic });
  const publicFrom = (historical, nativeCurrentOriginals = null, protectedCompanionContexts = []) =>
    buildPartDmiForecastWithProtectedRetention(feature, null, null, start, {
      startAt: start, expectedIdentity: identity, persistedHourly: savedPublic.hourly,
      historicalBulkCache: historical,
      currentDecoderTransitionPart: part, nativeCurrentOriginals, protectedCompanionContexts,
    });
  const currentAt = record => record.hourly.find(row => row.time === at(1));
  const statusAt = record => inspectDmiForecastGridSampling(currentAt(record).sources.current,
    'current', at(1), identity).status;
  assert.equal(statusAt(publicFrom(corrected)), 'unknown',
    'Fresh corrected originals alone do not authenticate the old different projection');
  const publicSelected = publicFrom(corrected, savedPublic.nativeCurrentOriginals);
  assert.equal(statusAt(publicSelected), 'coherent');
  assert.notEqual(currentAt(publicSelected).currentUMps, currentAt(oldPublic).currentUMps);
  assert.equal(publicSelected.hourly.length, 121);
  assert.deepEqual(publicSelected.hourly.map(row => row.time), oldPublic.hourly.map(row => row.time));
  const companionSelected = publicFrom(corrected, null, [capturedOld]);
  assert.deepEqual(companionSelected.hourly, publicSelected.hourly,
    'An explicitly supplied original context is proof-only, never another forecast candidate');
  const differentCapture = clone(corrected);
  differentCapture.zones[identity.entityId].hourly[at(0)].sources.current.contentSha256 = sha('different-public-capture');
  assert.equal(statusAt(publicFrom(differentCapture, savedPublic.nativeCurrentOriginals)), 'unknown',
    'A different capture must not receive same-original PUBLIC preference');
  assert.throws(() => publicFrom(corrected, { ...savedPublic.nativeCurrentOriginals,
    identity: { ...savedPublic.nativeCurrentOriginals.identity, parentZoneId: 'OTHER' } }),
  { message: 'DMI_NATIVE_PROOF_SELECTION_INVALID' });
  assert.throws(() => publicFrom(corrected, savedPublic.nativeCurrentOriginals,
    [capturedOld, capturedOld, capturedOld]), { message: 'DMI_PART_NATIVE_ORIGINAL_COMPANION_BOUND' });
  const alteredBank = clone(savedPublic.nativeCurrentOriginals);
  alteredBank.bank.nativeRows[0].value.uMps += 0.01;
  assert.throws(() => publicFrom(corrected, alteredBank), { message: 'DMI_NATIVE_PROOF_BANK_INVALID' });
  const protectedReplay = buildPrivateDmiRecoveryRecord(feature, corrected, start, {
    startAt: start, expectedIdentity: identity, persistedHourly: savedPublic.hourly,
    protectPreviousDmi: true, nativeCurrentOriginals: savedPublic.nativeCurrentOriginals,
    protectedCompanionContexts: [capturedOld],
  });
  assert.equal(statusAt(protectedReplay), 'unknown', 'Protected replay must not gain PUBLIC-only preference');
  assert.deepEqual(protectedReplay.hourly, oldPublic.hourly);
  assert.equal(JSON.stringify({ capturedOld, corrected, oldPublic, oldPublicBank, savedPublic }), savedSnapshot,
    'Public preference and refusals leave every original, saved row and bank unchanged');

  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-continuity-originals-'));
  try {
    const file = path.join(folder, 'forecast.json');
    await writeDmiForecastFileAtomic(file, { zones: {}, partContinuity: second });
    const index = await inspectDmiForecastFile(file), item = await readDmiForecastRecord(index, index.continuity.entries[0]);
    const streamed = await unpackDmiPartContinuity({ ...index.continuity.metadata, entries: [item] }, [part], at(1));
    assert.deepEqual(streamed.get(part.partId), decoded);
  } finally { await fs.rm(folder, { recursive: true, force: false }); }
  console.log('DMI PART continuity schema2: real bank/row binding and streaming assertions passed; not native/production proof');
}
