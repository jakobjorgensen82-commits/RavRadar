import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent } from './lib/ravscore-production-adapters.mjs';
import { PROTECTED_DMI_NATIVE_PROOF_LIMITS, buildProtectedDmiNativeCurrentProofs,
  createProtectedDmiNativeCurrentInspector, validateProtectedDmiNativeCurrentProofs,
  verifyProtectedDmiNativeCurrentProof } from './lib/protected-dmi-native-current-proofs.mjs';

const HOUR = 3_600_000;
const epoch = Date.parse('2026-09-01T00:00:00.000Z');
const at = offset => new Date(epoch + offset * HOUR).toISOString();
const copy = value => JSON.parse(JSON.stringify(value));
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
function fixture({ partId = 'SYNTHETIC-PART', nativeHours = [0, 3], target = 1, run = -12,
  pythonTime = false } = {}) {
  const part = { partId, zoneId: 'SYNTHETIC-ZONE', waterPoint: [8, 55] };
  const expected = dmiExpectedIdentityForPart(part);
  const hourly = {};
  const nativeAt = hour => pythonTime === 'offset' ? at(hour).replace('.000Z', '+00:00')
    : pythonTime ? at(hour).replace('.000Z', 'Z') : at(hour);
  for (const hour of nativeHours) {
    const time = nativeAt(hour);
    const source = { provider: 'dmi', fallback: false, collection: 'dkss_idw', collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
      optionalFieldSet: [], modelRun: nativeAt(run), nativeValidTime: time, leadTimeHours: hour - run,
      ...expected, gridPoint: [8, 55], gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0,
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      vectorSelection, vectorSemanticsVersion: 3, verticalLayer: 'depth:1', verticalLayerRankM: 1,
      itemId: `synthetic-${partId}-${hour}`, assetIdentitySha256: 'a'.repeat(64),
      contentSha256: 'c'.repeat(64), acquiredAt: nativeAt(-1), itemUpdatedAt: nativeAt(run + 1) };
    hourly[time] = { time, 'current-u': 0.123456 + hour / 1000,
      'current-v': 0.234567 + hour / 1000, sources: { current: source } };
  }
  const bulk = { generatedAt: nativeAt(0), currentVectorSemanticsVersion: 3,
    currentVectorSelection: vectorSelection, currentMaxDistanceKm: 5, timeStrideHours: 3,
    zones: { [expected.entityId]: { ...expected, hourly } } };
  const ocean = Object.values(hourly).map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources }));
  const row = buildDmiForecastHourly({ ocean, generatedAt: at(0), startAt: at(target), hours: 1 }).hourly[0];
  return { part, row, bulk };
}
const bankFor = fixture => buildProtectedDmiNativeCurrentProofs({ selections: [fixture], contexts: [fixture.bulk] });
const inspect = (fixture, contexts = [fixture.bulk]) => createProtectedDmiNativeCurrentInspector({ contexts }).inspect(fixture);

test('native, interpolated and nearest-edge reproduce unchanged original forecast/source', () => {
  for (const options of [{ target: 0 }, { target: 1 }, { nativeHours: [0], target: 1 }, { pythonTime: 'offset' }]) {
    const f = fixture(options), before = JSON.stringify(f);
    const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
    assert.equal(proof.ok, true);
    assert.deepEqual(proof.source, f.row.sources.current);
    assert.equal(proof.currentUMps, f.row.currentUMps);
    assert.equal(proof.currentVMps, f.row.currentVMps);
    assert.equal(bank.scope, 'PUBLIC_PART_FORECAST_121');
    assert.equal(bank.nativeRows.length, f.row.sources.current.nativeSteps.length);
    assert.equal(JSON.stringify(f), before, 'inputs and original source remain immutable');
    assert.equal(inspect(f).ok, true);
  }
});

test('real Python native timestamp spelling survives exact forecast proof unchanged', () => {
  const f = fixture({ pythonTime: true }), bank = bankFor(f);
  assert.equal(inspect(f).ok, true);
  assert.equal(bank.contexts[0].value.header.generatedAt, '2026-09-01T00:00:00Z');
  assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  assert.ok(bank.nativeRows.every(record => !record.value.time.includes('.000')));
});

test('explicit offsets and microsecond producer generation are accepted without rewriting proof', () => {
  for (const generatedAt of ['2026-09-01T00:00:00.116728Z', '2026-09-01T00:00:00.116728+00:00']) {
    const f = fixture({ pythonTime: true });
    f.bulk.generatedAt = generatedAt;
    // The raw row's spelling can differ from the provenance's same instant.
    for (const native of Object.values(Object.values(f.bulk.zones)[0].hourly)) {
      native.time = native.time.replace('Z', '+00:00');
    }
    const bank = bankFor(f);
    assert.equal(inspect(f).ok, true);
    assert.equal(bank.contexts[0].value.header.generatedAt, generatedAt);
    assert.ok(bank.nativeRows.every(record => record.value.time.endsWith('+00:00')));
    assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  }
  const noTimezone = fixture(); noTimezone.bulk.generatedAt = '2026-09-01T00:00:00';
  assert.equal(inspect(noTimezone).code, 'DMI_NATIVE_PROOF_CONTEXT_INVALID');
});

test('valid metadata alone is not actual native U/V proof', () => {
  const f = fixture();
  const expected = dmiExpectedIdentityForPart(f.part);
  assert.ok(verifiedBulkCurrent(f.bulk, f.bulk.zones[expected.entityId], f.part.waterPoint,
    f.row.sources.current, f.row.time, expected));
  f.bulk.zones[expected.entityId].hourly = {};
  assert.deepEqual(inspect(f), { ok: false, code: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' });
  assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING/);
});

test('derived forecast row cannot masquerade as an actual native endpoint', () => {
  const f = fixture({ target: 0 });
  const native = f.bulk.zones[dmiExpectedIdentityForPart(f.part).entityId].hourly[at(0)];
  native.sources.current = copy(f.row.sources.current);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
});

test('wrong native tuple, point, asset, layer and source-only additions fail closed', () => {
  const changes = [
    f => { f.row.currentUMps += 0.01; },
    f => { f.part.waterPoint[0] += 0.01; },
    f => { f.row.sources.current.assetIdentitySha256 = 'd'.repeat(64); },
    f => { f.row.sources.current.verticalLayer = 'depth:2'; },
    f => { f.row.sources.current.unknownField = 'not present on native'; },
  ];
  for (const mutate of changes) {
    const f = fixture(); mutate(f);
    assert.equal(inspect(f).ok, false);
    assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_/);
  }
});

test('bank hashes bind native payload, source, selected tuple and diagnostic age', () => {
  const f = fixture(), bank = bankFor(f);
  for (const mutate of [
    b => { b.nativeRows[0].value.uMps += 0.01; },
    b => { b.contexts[0].value.zone.samplingPoint[0] += 0.01; },
    b => { b.selections[0].forecastAgeHours += 1; },
    b => { b.selections[0].tupleSha256 = 'd'.repeat(64); },
    b => { b.nativeRows.reverse(); },
  ]) {
    const changed = copy(bank); mutate(changed);
    assert.equal(verifyProtectedDmiNativeCurrentProof(changed, f).ok, false);
    assert.throws(() => validateProtectedDmiNativeCurrentProofs(changed), /DMI_NATIVE_PROOF_/);
  }
});

test('age is diagnostic only; cannot select run, endpoint, tuple or silently mutate proof', () => {
  const f = fixture(), original = copy(f.row.sources.current), originalBank = bankFor(f);
  f.row.sources.current.forecastAgeHours = 999;
  const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
  assert.equal(proof.ok, true, 'native identity is independent of the age diagnostic');
  assert.equal(proof.source.forecastAgeHours, 999, 'the exact authenticated diagnostic is preserved');
  assert.equal(proof.source.modelRun, original.modelRun);
  assert.deepEqual(proof.source.nativeSteps, original.nativeSteps);
  assert.equal(verifyProtectedDmiNativeCurrentProof(originalBank, f).ok, false,
    'an old bank does not authenticate a changed age value');
  f.row.sources.current.nativeSteps[0].nativeValidTime = at(-1);
  assert.equal(inspect(f).ok, false, 'age cannot manufacture a native endpoint');
});

test('identical donors dedupe; same immutable native identity with conflicting U/V rejects', () => {
  const f = fixture();
  const once = bankFor(f);
  const twice = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [f.bulk, copy(f.bulk)] });
  assert.deepEqual(twice, once);
  const conflicting = copy(f.bulk);
  Object.values(conflicting.zones)[0].hourly[at(0)]['current-u'] += 0.01;
  assert.equal(inspect(f, [f.bulk, conflicting]).code, 'DMI_NATIVE_PROOF_NATIVE_CONFLICT');
});

test('single-donor availability does not claim split endpoint completeness', () => {
  const f = fixture(), before = copy(f.bulk), after = copy(f.bulk);
  delete Object.values(before.zones)[0].hourly[at(3)];
  delete Object.values(after.zones)[0].hourly[at(0)];
  assert.equal(inspect(f, [before]).ok, false);
  assert.equal(inspect(f, [after]).ok, false);
  assert.equal(inspect(f, [before, after]).ok, true,
    'only an explicitly combined authenticated donor set proves both endpoints');
});

test('ten subsequent selected-only generations retain proof without accumulating donors', () => {
  const f = fixture();
  let bank = bankFor(f);
  const original = copy(bank);
  for (let generation = 0; generation < 10; generation++) {
    bank = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [], previousBank: bank });
    assert.deepEqual(bank, original);
    assert.equal(verifyProtectedDmiNativeCurrentProof(bank, f).ok, true);
  }
  const empty = buildProtectedDmiNativeCurrentProofs({ selections: [], previousBank: bank });
  assert.equal(empty.nativeRows.length, 0);
  assert.equal(empty.contexts.length, 0);
});

test('does not select an older donor instead of an already selected newer forecast', () => {
  const older = fixture(), newer = fixture({ run: -6 });
  assert.equal(inspect(newer, [older.bulk]).ok, false);
  const bank = buildProtectedDmiNativeCurrentProofs({ selections: [newer], contexts: [older.bulk, newer.bulk] });
  const proof = verifyProtectedDmiNativeCurrentProof(bank, newer);
  assert.equal(proof.ok, true);
  assert.equal(proof.source.modelRun, newer.row.sources.current.modelRun);
});

test('strict domain, per-record and donor-count bounds apply before persistence', () => {
  const f = fixture();
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: [f, f], contexts: [f.bulk] }),
    /DMI_NATIVE_PROOF_SELECTION_DUPLICATE/);
  assert.throws(() => createProtectedDmiNativeCurrentInspector({ contexts: Array(17).fill(f.bulk) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  f.row.sources.current.padding = 'x'.repeat(PROTECTED_DMI_NATIVE_PROOF_LIMITS.recordBytes + 1);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_RECORD_BOUND');
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: Array(PROTECTED_DMI_NATIVE_PROOF_LIMITS.selections + 1) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  const huge = fixture();
  huge.row.sources.current.nativeSteps = Array(100_000).fill(huge.row.sources.current.nativeSteps[0]);
  assert.equal(inspect(huge).code, 'DMI_NATIVE_PROOF_RECORD_BOUND', 'bound before temporal verifier traverses input');
  const oversizedDonor = fixture();
  const zone = Object.values(oversizedDonor.bulk.zones)[0], one = Object.values(zone.hourly)[0];
  zone.hourly = Object.fromEntries(Array.from({ length: 10_001 }, (_, i) => [String(i), one]));
  assert.equal(inspect(oversizedDonor).code, 'DMI_NATIVE_PROOF_DONOR_BOUND');
});

test('per-PART bank scope rejects the 122nd selected hour without partial output', () => {
  const nativeHours = Array.from({ length: 123 }, (_, index) => index);
  const f = fixture({ nativeHours, target: 0 });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 122,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  const selections = rows.map(row => ({ part: f.part, row }));
  assert.equal(buildProtectedDmiNativeCurrentProofs({ selections: selections.slice(0, 121), contexts: [f.bulk] }).selections.length, 121);
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections, contexts: [f.bulk] }), /DMI_NATIVE_PROOF_DOMAIN_BOUND/);
});

test('inspector caches one PART and safely handles sequential parts', () => {
  const first = fixture(), second = fixture({ partId: 'SECOND-SYNTHETIC-PART' });
  const bulk = { ...first.bulk, zones: { ...first.bulk.zones, ...second.bulk.zones } };
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [bulk] });
  for (const input of [first, first, second, second, first]) assert.equal(inspector.inspect(input).ok, true);
});

if (process.env.RAVRADAR_NATIVE_PROOF_BENCHMARK === '1') test('opt-in dense 673 x 121 inspector CPU measurement', () => {
  const f = fixture({ nativeHours: Array.from({ length: 43 }, (_, i) => i * 3), target: 0, pythonTime: true });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 121,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  let complete = 0;
  const started = performance.now();
  for (let part = 0; part < 673; part++) {
    // Recreate the index for each part, as a real sequential-PART scan does.
    // Geometry/file decoding/transport are not included in this CPU floor.
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] });
    for (const row of rows) {
      assert.equal(inspector.inspect({ part: f.part, row }).ok, true);
      complete++;
    }
  }
  assert.equal(complete, 673 * 121);
  console.log(JSON.stringify({ syntheticNativeInspector: { selections: complete,
    elapsedMs: Math.round(performance.now() - started), maximumRssBytes: process.resourceUsage().maxRSS * 1024,
    includesFileDecodeOrRemote: false } }));
});
