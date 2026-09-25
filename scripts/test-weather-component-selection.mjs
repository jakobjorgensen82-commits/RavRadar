import assert from 'node:assert/strict';
import test from 'node:test';
import { responseBoundModelRun, selectQualifiedWeatherComponent } from './lib/weather-component-selection.mjs';

const reference = '2026-09-19T12:00:00.000Z';
const referenceMs = Date.parse(reference);
const time = offsetMs => new Date(referenceMs + offsetMs).toISOString();
const HOUR = 3_600_000;
const dmi = (ageHours, extra = {}) => ({ source: {
  provider: 'dmi', modelRun: time(-ageHours * HOUR), ...extra,
} });
const reserve = (provider, ageHours, { proved = true, selected = false } = {}) => {
  const modelRun = time(-ageHours * HOUR);
  const payloadSha256 = 'sha256:' + 'a'.repeat(64);
  return { previouslySelected: selected, source: {
    provider, model: `${provider}-test`, modelRun, sourceResponseSha256: payloadSha256,
    ...(proved ? { modelReference: { kind: 'response-forecast-reference-time', modelRun, payloadSha256 } } : {}),
  } };
};
const choose = (candidates, at = reference) => selectQualifiedWeatherComponent(candidates, {
  component: 'wind', productionReferenceAt: at,
  // These fixtures isolate selection; real producer admission is separately
  // required to prove spatial, temporal and numeric validity before this call.
  admit: candidate => candidate.invalid ? null : candidate.source,
});

test('DMI stays protected until exactly 96 elapsed UTC hours', () => {
  const native = dmi(96);
  const cp = reserve('copernicus', 6);
  assert.equal(choose([native, cp], time(-1)).candidate, native);
  assert.equal(choose([native, cp]).candidate, cp);
  assert.equal(choose([native, cp]).reason, 'AGED_DMI_REPLACED_BY_NEWER_RESERVE');
});

test('fetch time does not refresh an old run or prove a newer reserve', () => {
  const native = dmi(100, { acquiredAt: reference });
  const unknown = reserve('open-meteo', 1, { proved: false });
  unknown.source.acquiredAt = reference;
  assert.equal(choose([native, unknown]).candidate, native);
  assert.equal(choose([unknown]).candidate, unknown, 'unknown model age does not invalidate qualified gap filling');
  const cp = reserve('copernicus', 6);
  assert.equal(choose([native, cp]).candidate, cp);
});

test('missing/invalid/older/unbound reserve never erases qualified DMI', () => {
  const native = dmi(100);
  const unbound = reserve('copernicus', 2);
  unbound.source.modelReference.payloadSha256 = 'sha256:' + 'b'.repeat(64);
  for (const other of [null, { ...reserve('copernicus', 2), invalid: true },
    reserve('copernicus', 101), unbound, reserve('copernicus', -1)]) {
    assert.equal(choose(other ? [native, other] : [native]).candidate, native);
  }
});

test('new DMI reclaims reserve, while fallback fills only independent holes', () => {
  const native = dmi(6);
  const cp = reserve('copernicus', 1, { selected: true });
  const om = reserve('open-meteo', 1);
  assert.equal(choose([om, cp, native]).candidate, native);
  assert.equal(choose([om, cp]).candidate, cp);
  assert.equal(choose([om, { ...cp, invalid: true }]).candidate, om);
  assert.equal(choose([]), null);
});

test('newer independently admitted DMI run replaces an older valid grid and collection', () => {
  const common = { provider: 'dmi', entityId: 'PART::P1', parentZoneId: 'Z1',
    entityType: 'coastal-part', samplingContext: 'coastal-part-water-point',
    samplingPoint: [10, 56] };
  const older = { source: { ...common, modelRun: time(-6 * HOUR), collection: 'dkss_idw',
    gridPoint: [10.01, 56], distanceKm: 0.5, verticalLayerRankM: 0 } };
  const newer = { source: { ...common, modelRun: time(-3 * HOUR), collection: 'dkss_lf',
    gridPoint: [10.03, 56], distanceKm: 1.5, verticalLayerRankM: 0 } };
  const select = (component, rows) => selectQualifiedWeatherComponent(rows, {
    component, productionReferenceAt: reference,
    admit: candidate => candidate.invalid ? null : candidate.source,
  });
  for (const component of ['current', 'waterLevel', 'waterTemperature']) {
    assert.equal(select(component, [older, newer]).candidate, newer);
    assert.equal(select(component, [newer, older]).candidate, newer);
    assert.equal(select(component, [older, { ...newer, invalid: true }]).candidate, older);
  }
  const sameRunFarther = { source: { ...newer.source, modelRun: older.source.modelRun } };
  assert.equal(select('current', [older, sameRunFarther]).candidate, older,
    'same-run current keeps its closer admitted cell');
});

test('qualified Copernicus replaces selected Open-Meteo at the same part/time/component', () => {
  const cp = reserve('copernicus', 1);
  const selectedOm = reserve('open-meteo', 6, { selected: true });
  assert.equal(choose([cp, selectedOm]).candidate, cp);
  assert.equal(choose([cp, selectedOm]).reason, 'COPERNICUS_REPLACES_OPEN_METEO');
  const newerOm = reserve('open-meteo', 1);
  assert.equal(choose([cp, selectedOm, newerOm]).candidate, cp);
  assert.equal(choose([selectedOm, newerOm]).candidate, newerOm);
  assert.equal(choose([selectedOm, { ...cp, invalid: true }]).candidate, selectedOm);
});

test('96-hour DMI exception admits only newer proved reserves, then prefers Copernicus', () => {
  const native = dmi(100);
  const newerOm = reserve('open-meteo', 1);
  const newerCp = reserve('copernicus', 2);
  const olderCp = reserve('copernicus', 101);
  assert.equal(choose([native, newerOm, newerCp]).candidate, newerCp);
  assert.equal(choose([native, newerOm, olderCp]).candidate, newerOm);
  assert.equal(choose([dmi(95), newerOm, newerCp]).candidate.source.provider, 'dmi');
});

test('policy cannot run without explicit admission and a locked timestamp', () => {
  assert.throws(() => selectQualifiedWeatherComponent([dmi(6)], { productionReferenceAt: reference }), /ADMISSION/);
  assert.throws(() => choose([dmi(6)], '2026-09-19T12:00:00'), /LOCKED_TIME/);
  assert.equal(responseBoundModelRun(reserve('copernicus', 6, { proved: false }).source), null);
});

test('water level remains DMI-only even at a gap or after 96 hours', () => {
  const chooseLevel = candidates => selectQualifiedWeatherComponent(candidates, {
    component: 'waterLevel', productionReferenceAt: reference, admit: candidate => candidate.source,
  });
  const native = dmi(100);
  for (const provider of ['copernicus', 'open-meteo']) {
    const other = reserve(provider, 1, { selected: true });
    assert.equal(chooseLevel([other]), null);
    assert.equal(chooseLevel([native, other]).candidate, native);
    assert.equal(choose([other]).candidate, other, 'other component policies remain unchanged');
  }
});
