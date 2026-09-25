import assert from 'node:assert/strict';
import test from 'node:test';
import { createWeatherComponentSelectionHistory, recordSelectedWeatherComponents,
  retainPreviouslySelectedReserve, snapshotWeatherComponentSelectionHistory } from './lib/weather-component-selection-history.mjs';
import { selectQualifiedWeatherComponent } from './lib/weather-component-selection.mjs';

const time = '2026-09-19T00:00:00.000Z';
const part = { partId: 'P1', zoneId: 'Z1', waterPoint: [10, 56] };
const options = { parts: [part], retentionStartAt: time, retentionEndAt: '2026-09-24T00:00:00.000Z' };
const proof = provider => ({ status: 'verified', provider, componentRecordId: 'a'.repeat(64),
  sourceClass: 'response-bound-official-component', entityId: 'PART::P1', parentZoneId: 'Z1', samplingPoint: [10, 56] });
const candidates = [{ source: { provider: 'copernicus' } }, { source: { provider: 'open-meteo' } }];
const choose = choices => selectQualifiedWeatherComponent(choices, { component: 'wave', productionReferenceAt: time,
  admit: candidate => candidate.source }).candidate.source.provider;

test('previous OM survives restart until admitted CP or DMI takes over', () => {
  const history = createWeatherComponentSelectionHistory(null, options);
  assert.equal(choose(candidates), 'copernicus', 'CP is first reserve for an actual new gap');
  recordSelectedWeatherComponents(history, part, [{ time, waveProvenance: proof('open-meteo') }]);
  const restored = createWeatherComponentSelectionHistory(snapshotWeatherComponentSelectionHistory(history), options);
  const retained = retainPreviouslySelectedReserve(candidates, restored, { part, time, component: 'wave' });
  assert.equal(choose(retained), 'copernicus');
  assert.equal(choose([...retained, { source: { provider: 'dmi', modelRun: time } }]), 'dmi');
  recordSelectedWeatherComponents(restored, part, [{ time, waveProvenance: { status: 'verified', provider: 'dmi' } }]);
  assert.equal(snapshotWeatherComponentSelectionHistory(restored).records.length, 0);
});

test('real central point/parent changes retire only that previous source selection', () => {
  const sibling = { ...part, partId: 'P2' };
  const settings = { ...options, parts: [part, sibling] };
  const history = createWeatherComponentSelectionHistory(null, settings);
  for (const target of settings.parts) recordSelectedWeatherComponents(history, target, [{ time,
    windProvenance: { ...proof('open-meteo'), entityId: `PART::${target.partId}` } }]);
  const moved = { ...part, zoneId: 'Z2', sourceZoneId: 'Z1' };
  const restored = createWeatherComponentSelectionHistory(snapshotWeatherComponentSelectionHistory(history),
    { ...settings, parts: [moved, sibling] });
  assert.deepEqual(snapshotWeatherComponentSelectionHistory(restored).records.map(row => row.partId), ['P2']);
  assert.equal(choose(retainPreviouslySelectedReserve(candidates, restored, { part: moved, time, component: 'wind' })), 'copernicus');
});

test('unbound history edits and false source identities cannot establish previous ownership', () => {
  const history = createWeatherComponentSelectionHistory(null, options);
  assert.throws(() => recordSelectedWeatherComponents(history, part, [{ time,
    windProvenance: { ...proof('open-meteo'), parentZoneId: 'WRONG' } }]), /SOURCE_INVALID/);
  const saved = snapshotWeatherComponentSelectionHistory(history);
  saved.records.push({ provider: 'open-meteo' });
  assert.throws(() => createWeatherComponentSelectionHistory(saved, options), /HISTORY_INVALID/);
  assert.equal(choose(retainPreviouslySelectedReserve(candidates, {}, { part, time, component: 'wave' })), 'copernicus');
});
