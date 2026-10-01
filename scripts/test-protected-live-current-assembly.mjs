import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as store from './lib/dmi-forecast-store.mjs';
import * as adapters from './lib/ravscore-production-adapters.mjs';
import * as seams from './lib/dmi-marine-run-seam-recovery.mjs';
import * as pilot from './lib/live-current-pilot.mjs';
import * as waveProxy from './lib/feggesund-wave-proxy.mjs';
import * as selection from './lib/weather-component-selection.mjs';
import * as level from './lib/water-level-continuity.mjs';
import * as waveProof from './lib/dmi-wave-tuple-proof.mjs';
import * as recovery from './lib/ravscore-recovery-replay.mjs';
import * as contexts from './lib/protected-dmi-current-context.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { mergeProtectedLiveCurrentPilotIntoRecord } from './lib/protected-live-current-assembly.mjs';
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';
import { buildOperationalCurrentEntryIndex, verifyCoastalPartCurrentProjection }
  from './lib/current-spatial-runtime-proof.mjs';

// Reuse the existing sealed fixtures and actual producer extraction. No source,
// closure, admission, score or spatial-proof implementation is stubbed here.
const environment = { assert, fs, crypto, ...store, ...adapters, ...seams,
  ...pilot, ...waveProxy, ...selection, ...level, ...waveProof, ...recovery,
  ...contexts, mergeProtectedLiveCurrentPilotIntoRecord, buildNewestValidRavScoreRecoverySources };
const evaluate = (script, result) => Function(...Object.keys(environment),
  `${script}; return ${result};`)(...Object.values(environment));
const prefix = (file, start, end) => {
  const source = fs.readFileSync(file, 'utf8');
  const from = source.indexOf(start), until = source.indexOf(end, from);
  assert.ok(from >= 0 && until > from, `fixture boundary ${file}`);
  return source.slice(from, until);
};
const cp = evaluate(prefix('scripts/test-live-current-pilot-4.0.232.mjs',
  'const part =', 'const OLD_BUT_VALID_ACQUISITION_AT'),
'({live, part, REFERENCE_AT, FUTURE_AT, buildOperationalLive, copernicusEntry, futureCopernicusEntry})');
let producerFixture = fs.readFileSync('scripts/test-dmi-protected-tuple-continuity.mjs', 'utf8')
  .replace(/^import[\s\S]*?;\r?\n/gm, '');
producerFixture = producerFixture.slice(0, producerFixture.lastIndexOf('console.log('))
  .replace('2026-09-01T00:00:00.000Z', '2026-08-18T13:00:00.000Z')
  .replaceAll('SYNTHETIC-TUPLE-PART', 'P1')
  .replaceAll('SYNTHETIC-TUPLE-ZONE', 'Z1')
  .replace('waterPoint: [8, 55]', 'waterPoint: [10, 55]');
// This also retains all existing no-active-context, POINT_ACTIVATION, saved
// tuple and publicDefault assertions; none are removed to fit the new path.
const fixture = evaluate(producerFixture,
  '({runPublicPartProjection, row, bulk, part, identity, asNative})');
const om = evaluate(prefix('scripts/test-open-meteo-live-runtime.mjs',
  'const canonicalJson =', 'const oldButFutureValidAcquiredAt'),
  '({document, part, referenceAt})');
const regional = evaluate(prefix('scripts/test-current-operational-live-adapter.mjs',
  'const canonicalJson =', 'const liveWithSourceStageDisposition'),
  '({live, liveWithRegionalReference, regionalPart, REFERENCE, NATIVE_TIME, SOURCE_TIME})');
const hour = 3_600_000;
const utc = value => new Date(value).toISOString();
const direct = (part, referenceAt, ageHours = 12, validTime = referenceAt) => {
  const row = fixture.row();
  const identity = adapters.dmiExpectedIdentityForPart(part);
  row.time = utc(validTime);
  for (const source of Object.values(row.sources)) {
    Object.assign(source, identity, { samplingPoint: [...part.waterPoint],
      gridPoint: [...part.waterPoint], modelRun: utc(Date.parse(referenceAt) - ageHours * hour),
      nativeValidTime: row.time,
      leadTimeHours: (Date.parse(row.time) - Date.parse(referenceAt)) / hour + ageHours,
      acquiredAt: utc(Date.parse(referenceAt) + hour / 4),
      itemUpdatedAt: utc(Date.parse(referenceAt) - ageHours * hour),
      nativeValidTimes: [row.time] });
    Object.assign(source.nativeSteps[0], { nativeValidTime: source.nativeValidTime,
      leadTimeHours: source.leadTimeHours, acquiredAt: source.acquiredAt,
      itemUpdatedAt: source.itemUpdatedAt });
  }
  const bulk = { ...fixture.bulk, zones: { [identity.entityId]: { ...identity } } };
  assert.equal(adapters.verifiedIntegratedPartHourly({ hourly: [row] }, bulk,
    identity.entityId, part)[0].currentProvenance.status, 'verified');
  return { row, bulk, identity };
};
const currentKeys = new Set(['currentUMps', 'currentVMps', 'currentSpeedMps',
  'currentDirectionDeg', 'currentCoastNormalSpeedMps', 'currentProvenance', 'currentStateOnlyHold']);
const otherFields = row => ({ ...Object.fromEntries(Object.entries(row)
  .filter(([key]) => !currentKeys.has(key) && key !== 'sources')),
sources: Object.fromEntries(Object.entries(row.sources ?? {}).filter(([key]) => key !== 'current')) });
const run = (input, part, live, referenceAt, overrides = {}) => {
  const record = { point: part.waterPoint, hourly: [input.row] };
  const untouched = structuredClone({ record, live });
  const options = { currentContexts: [input.bulk], bulkId: input.identity.entityId,
    productionReferenceAt: utc(referenceAt), ...overrides };
  const ordinary = pilot.mergeLiveCurrentPilotIntoRecord(record, part, live, options);
  const actual = mergeProtectedLiveCurrentPilotIntoRecord(record, part, live, options);
  const canonical = contexts.verifiedProtectedDmiPartHourly(actual,
    options.currentContexts, options.bulkId, part)[0];
  assert.deepEqual({ record, live }, untouched, 'rows, closure assignments and hashes stay unchanged');
  assert.deepEqual(otherFields(actual.hourly[0]), otherFields(ordinary.hourly[0]),
    'all four other weather families and source fields remain untouched');
  return { actual, canonical };
};

const cpPart = { ...cp.part, onshoreDirectionDeg: 90 };
const primary = direct(cpPart, cp.REFERENCE_AT);
const oldPath = pilot.mergeLiveCurrentPilotIntoRecord({ hourly: [primary.row] }, cpPart, cp.live,
  { primaryCurrentVerified: () => true });
assert.equal(adapters.verifiedIntegratedPartHourly(oldPath, primary.bulk,
  primary.identity.entityId, cpPart)[0].currentProvenance.provider, 'copernicus',
'the unchanged old merger reproduces reserve displacement even with primaryCurrentVerified=true');

// Actual producer calls: replay now preserves admitted DMI before selection,
// but PUBLIC stays byte-unchanged and still takes its existing closure choice.
const active = fixture.asNative([fixture.row(0)]);
const activeBefore = structuredClone(active);
const publicLive = cp.buildOperationalLive([cp.copernicusEntry]);
const liveBefore = structuredClone(publicLive);
const fullPublic = fixture.runPublicPartProjection({ active, pilot: publicLive });
assert.equal(fullPublic.verifiedHourly[0].currentProvenance.provider, 'copernicus',
  'PUBLIC priority reconciliation is explicitly deferred, not fixed by this replay-only release');
assert.equal(fullPublic.record.model.completeness.supplementalCurrentHours, 1);
assert.equal(fullPublic.record.model.completeness.protectedDmiCurrentRetentionHours, undefined);
assert.deepEqual(fullPublic.verifiedHourly, adapters.verifiedIntegratedPartHourly(
  fullPublic.record, active, fixture.identity.entityId, fixture.part),
'PUBLIC retains precisely its existing active-context sanitizer');
assert.deepEqual(active, activeBefore);
assert.deepEqual(publicLive, liveBefore);
const actualReplay = fixture.runPublicPartProjection({ active, deployed: active,
  pilot: publicLive, replay: true });
for (const source of [actualReplay.deployedRecoverySource, actualReplay.progressiveRecoverySource]) {
  assert.equal(source.record.hourly[0].currentProvenance.provider, 'dmi',
    'both actual replay assemblers retain 12h-old valid DMI before the recovery selector');
}
const target = utc(Date.parse(cp.REFERENCE_AT) + hour);
const replayed = recovery.buildRavScoreRecoveryReplay({
  part: fixture.part, initialState: null, targetReferenceAt: target,
  sourceRecords: actualReplay.recoverySources, publicHourly: [{ time: target }],
});
assert.equal(replayed.replayedHourCount, 1,
  'actual two-caller assembly and priority feed the unchanged strict replay');
const score = buildIntegratedPartScoreSeries({ part: fixture.part,
  zone: { id: fixture.part.parentZoneId, onshoreDirectionDeg: fixture.part.onshoreDirectionDeg },
  hourly: fullPublic.verifiedHourly,
}).scores[0];
const flowPoints = flowPointsFromForecastRecord(fullPublic.record,
  fixture.part.waterPoint, score.time, fixture.part);
const runtimePart = { flowPoints, current: { time: score.time, weather: score.weather } };
const publicProvenanceFields = [
  'status', 'reason', 'provider', 'collection', 'source', 'sourceClass', 'controlledLivePilot',
  'temporalResolution', 'verticalLayer', 'vectorSelection', 'vectorSemanticsVersion', 'method',
  'fallback', 'distanceKm',
];
const publicPart = { flowPoints: structuredClone(flowPoints), current: {
  time: score.time, weather: { currentSpeedMps: score.weather.currentSpeedMps,
    currentDirectionDeg: score.weather.currentDirectionDeg,
    currentProvenance: Object.fromEntries(publicProvenanceFields
      .filter(field => score.weather.currentProvenance?.[field] !== undefined)
      .map(field => [field, score.weather.currentProvenance[field]])),
  },
} };
const spatialProof = bulkZone => verifyCoastalPartCurrentProjection({
  part: fixture.part, runtimePart, publicPart, bulkZone,
  operationalEntryIndex: buildOperationalCurrentEntryIndex(publicLive),
  verifyBulkRow: () => { throw new Error('Unchanged PUBLIC reserve must use its sealed closure proof'); },
});
const activeZone = active.zones[fixture.identity.entityId];
assert.equal(spatialProof(activeZone).ok, true,
  'unchanged PUBLIC producer, adapter, score/arrow and spatial proof remain consistent');
assert.equal(spatialProof(activeZone).sourceClass, 'copernicus-local');
assert.equal(spatialProof({ ...activeZone, hourly: {} }).ok, true,
  'unchanged PUBLIC reserve does not borrow DMI-header authority for a missing raw row');
const historicalOnly = fixture.runPublicPartProjection({
  active: { ...active, zones: {} }, historical: active, pilot: publicLive,
});
assert.equal(historicalOnly.verifiedHourly[0].currentProvenance.provider, 'copernicus',
  'historical DMI must not acquire new PUBLIC authority over the valid reserve');
const headerOnly = fixture.runPublicPartProjection({
  active: { ...active, zones: { [fixture.identity.entityId]: { ...activeZone, hourly: {} } } },
  historical: active, pilot: publicLive,
});
assert.equal(headerOnly.verifiedHourly[0].currentProvenance.provider, 'copernicus',
  'an active header plus historical donor cannot activate the deferred PUBLIC retention path');

const boundCp = (modelRun, { futureOnly = false, acquisitionAt = null } = {}) => {
  const live = cp.buildOperationalLive(futureOnly ? [cp.futureCopernicusEntry] : [cp.copernicusEntry]);
  for (const entry of live.entries) {
    entry.recordProjectionContractId = 'copernicus-live-current-record-fixed-decimal-model-reference-v2';
    entry.modelRun = utc(modelRun).replace('.000Z', 'Z');
    entry.subsetSha256 = `sha256:${'c'.repeat(64)}`;
    if (acquisitionAt) entry.capturedAt = entry.acquisitionAt = acquisitionAt;
    entry.modelReference = { kind: 'subset-forecast-reference-time', payloadSha256: entry.subsetSha256,
      modelRun: entry.modelRun, validTime: entry.validTime, referenceVariable: 'forecast_reference_time',
      referenceIndex: null, forecastPeriodVariable: null, forecastPeriodChecked: false,
      leadSeconds: (Date.parse(entry.validTime) - Date.parse(entry.modelRun)) / 1000 };
    entry.recordProjectionSha256 = pilot.copernicusLiveRecordProjectionSha256(entry);
    assert.ok(entry.recordProjectionSha256);
  }
  assert.equal(pilot.controlledLiveCurrentEnabled(live), true);
  return live;
};
const newerCp = boundCp(Date.parse(cp.REFERENCE_AT) - 6 * hour);
for (const [age, expected] of [[12, 'dmi'], [96 - 1 / hour, 'dmi'], [96, 'copernicus'], [120, 'copernicus']]) {
  assert.equal(run(direct(cpPart, cp.REFERENCE_AT, age), cpPart, newerCp,
    cp.REFERENCE_AT).canonical.currentProvenance.provider, expected);
}
for (const age of [12, 96, 120]) {
  assert.equal(run(direct(cpPart, cp.REFERENCE_AT, age), cpPart, cp.live,
    cp.REFERENCE_AT).canonical.currentProvenance.provider, 'dmi',
  'unknown model age cannot win on acquisition time');
}
const olderCp = boundCp(Date.parse(cp.REFERENCE_AT) - 130 * hour);
assert.equal(run(direct(cpPart, cp.REFERENCE_AT, 120), cpPart, olderCp,
  cp.REFERENCE_AT).canonical.currentProvenance.provider, 'dmi');
const futureCp = boundCp(Date.parse(cp.REFERENCE_AT) + hour,
  { futureOnly: true, acquisitionAt: '2026-08-18T15:00:00Z' });
assert.equal(run(direct(cpPart, cp.REFERENCE_AT, 120, cp.FUTURE_AT), cpPart, futureCp,
  cp.REFERENCE_AT).canonical.currentProvenance.provider, 'dmi');
const futureBound = boundCp(Date.parse(cp.REFERENCE_AT) - 6 * hour, { futureOnly: true });
assert.equal(run(direct(cpPart, cp.REFERENCE_AT, 12, cp.FUTURE_AT), cpPart, futureBound,
  cp.REFERENCE_AT).canonical.currentProvenance.provider, 'dmi', 'forecast lead does not age a model');
for (const age of [12, 120]) {
  const result = run(direct(om.part, om.referenceAt, age), om.part, om.document, om.referenceAt);
  assert.equal(result.canonical.currentProvenance.provider, 'dmi');
  assert.equal(result.actual.model.completeness.supplementalCurrentHours, 0);
}
for (const mutate of [
  row => { row.currentVMps = null; },
  row => { row.sources.current.parentZoneId = 'OTHER'; },
  row => { row.sources.current.samplingPoint = [11, 55]; },
  row => { row.sources.current.nativeValidTimes = ['2026-08-18T14:00:00Z']; },
]) {
  const invalid = direct(cpPart, cp.REFERENCE_AT);
  mutate(invalid.row);
  assert.equal(run(invalid, cpPart, cp.live, cp.REFERENCE_AT).canonical.currentProvenance.provider,
    'copernicus', 'invalid original DMI cannot suppress an admitted reserve');
}
for (const currentContexts of [[], [null], [{ ...primary.bulk, zones: {} }]]) {
  assert.equal(run(primary, cpPart, cp.live, cp.REFERENCE_AT,
    { currentContexts }).canonical.currentProvenance.provider, 'copernicus');
}
for (const mutate of [
  live => { live.entries[0].recordProjectionSha256 = `sha256:${'0'.repeat(64)}`; },
  live => { live.entries[0].samplingPoint = [11, 55]; },
  live => { live.entries[0].modelRun = '2026-08-18T12:00:00Z'; },
]) {
  const invalid = structuredClone(cp.live);
  mutate(invalid);
  const record = { point: cpPart.waterPoint, hourly: [primary.row] };
  assert.deepEqual(mergeProtectedLiveCurrentPilotIntoRecord(record, cpPart, invalid,
    { currentContexts: [primary.bulk], bulkId: primary.identity.entityId,
      productionReferenceAt: cp.REFERENCE_AT }), pilot.mergeLiveCurrentPilotIntoRecord(record, cpPart, invalid),
  'the wrapper does not admit malformed sealed input or hide it as a priority loser');
}
for (const [validTime, live, privateReferences] of [
  [regional.REFERENCE, regional.live, false],
  [regional.NATIVE_TIME, regional.live, false],
  [regional.SOURCE_TIME, regional.liveWithRegionalReference, true],
]) {
  const input = direct(regional.regionalPart, regional.REFERENCE, 12, validTime);
  const result = run(input, regional.regionalPart, live, regional.REFERENCE,
    { includePrivateNativeCadenceReferences: privateReferences });
  const at = result.actual.hourly.find(row => utc(row.time) === utc(validTime));
  assert.equal(at.currentProvenance.vectorSemanticsVersion, 3,
    'direct DMI outranks regional native, private reference and state-only hold');
  assert.equal(Object.hasOwn(at, 'currentStateOnlyHold'), false);
  input.row.currentVMps = null;
  const record = { hourly: [input.row] };
  assert.deepEqual(mergeProtectedLiveCurrentPilotIntoRecord(record, regional.regionalPart, live,
    { currentContexts: [input.bulk], bulkId: input.identity.entityId,
      productionReferenceAt: utc(regional.REFERENCE), includePrivateNativeCadenceReferences: privateReferences }),
  pilot.mergeLiveCurrentPilotIntoRecord(record, regional.regionalPart, live,
    { includePrivateNativeCadenceReferences: privateReferences }),
  'without admitted primary DMI the regional closure remains exactly unchanged');
}
const producer = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
assert.equal((producer.match(/= mergeProtectedLiveCurrentPilotIntoRecord\(/g) ?? []).length, 2);
assert.equal((producer.match(/currentContexts: \[bulkCache\], bulkId, productionReferenceAt: generatedAt/g) ?? []).length, 1);
assert.match(producer, /currentContexts: protectedCurrentContexts, bulkId, productionReferenceAt: generatedAt/);
assert.match(producer, /const record = mergeLiveCurrentPilotIntoRecord\(operationalDmiRecord,/);
assert.match(producer, /const verifiedHourly = verifiedIntegratedPartHourly\(\s*record, bulkCache, bulkId,/);
console.log('Replay-only current assembly passed: actual two callers, unchanged PUBLIC spatial proof, 96h, OM and regional holds.');
