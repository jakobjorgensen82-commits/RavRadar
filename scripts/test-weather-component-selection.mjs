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

test('reserve priority at a hole does not become general CP-over-OM overwrite', () => {
  const cp = reserve('copernicus', 1);
  const selectedOm = reserve('open-meteo', 6, { selected: true });
  assert.equal(choose([cp, selectedOm]).candidate, selectedOm);
  const newerOm = reserve('open-meteo', 1);
  assert.equal(choose([cp, selectedOm, newerOm]).candidate, newerOm);
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
