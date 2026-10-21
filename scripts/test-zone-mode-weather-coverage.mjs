import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { buildZoneModeWeatherCoverage } from './lib/zone-mode-weather-coverage.mjs';
import { packPrivateConditionsHourly, hydratePrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { buildSourceValidationPlan } from './validate-source-once.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = ['wind', 'wave', 'current', 'waterLevel', 'waterTemperature', 'allFive'];
const HOUR = 3_600_000;
const weather = () => ({ windSpeedMps: 1, windDirectionDeg: 0,
  waveHeightM: 1, wavePeriodS: 3, waveDirectionDeg: 0,
  currentSpeedMps: 0, currentDirectionDeg: 0, waterLevelCm: 0, waterTemperatureC: 0 });
function fixture(count = 2, reference = '2026-10-20T08:00:00.000Z') {
  const ids = Array.from({ length: count }, (_, i) => `TEST-ZONE-${i + 1}`);
  const binding = ravScoreModelBinding();
  const zonesDocument = { type: 'FeatureCollection', features: ids.map(id => ({
    type: 'Feature', properties: { id, zoneStatus: 'active' }, geometry: null,
  })) };
  const conditions = { datasetId: 'rr-synthetic-local-coverage', productionReferenceAt: reference, generatedAt: reference, zones: {},
    coastalParts: { enabled: true, modelBinding: binding, zones: {} } };
  for (const id of ids) {
    const hourly = Array.from({ length: 118 }, (_, index) => ({
      time: new Date(Date.parse(reference) + index * HOUR).toISOString(),
      ...Object.fromEntries(['waders', 'beach'].map(mode => [mode, {
        available: true, modelBinding: { ...binding }, winningPartId: `${id}-${mode}`,
        scoreQuality: 'HISTORY_INCOMPLETE', weather: weather(),
      }])),
    }));
    conditions.coastalParts.zones[id] = { expectedPartCount: 2, scoredPartCount: 2, hourly };
    conditions.zones[id] = { forecast: { hourly: hourly.map(row => ({ time: row.time,
      ...weather(), waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: null })) } };
  }
  return { conditions, zonesDocument, ids };
}
const build = f => buildZoneModeWeatherCoverage(f);
const hours = (f, id = f.ids[0]) => f.conditions.coastalParts.zones[id].hourly;
function accounting(report) {
  for (const mode of ['waders', 'beach']) for (const name of COMPONENTS) {
    const value = report.modes[mode][name];
    assert.equal(value.available + value.missing + value.unknown, value.expected);
  }
}

test('local diagnostic counts the full118x210 denominator, not clock, parents or existing rows', () => {
  const f = fixture(210), before = JSON.stringify(f);
  const packed = packPrivateConditionsHourly(f.conditions);
  assert.equal(packed.coastalParts.zones[f.ids[0]].hourly, undefined);
  const hydrated = hydratePrivateConditionsHourly(JSON.parse(JSON.stringify(packed)));
  assert.equal(hydrated.coastalParts.zones[f.ids[0]].hourly.length, 118);
  const report = build({ ...f, conditions: hydrated });
  assert.equal(report.axis.expectedHours, 118);
  assert.equal(report.axis.expectedZones, 210);
  assert.equal(report.axis.expectedZoneHoursPerMode, 24780);
  assert.equal(report.axis.lastHour, '2026-10-25T05:00:00.000Z');
  for (const mode of ['waders', 'beach']) for (const component of COMPONENTS) {
    assert.deepEqual(report.modes[mode][component], {
      expected: 24780, available: 24780, missing: 0, unknown: 0, availablePercent: 100,
    });
  }
  assert.equal(report.perLocalCalendarDay.reduce((n, day) => n + day.hourCount, 0), 118);
  assert.equal(report.perLocalCalendarDay.at(-1).hourCount, 8);
  assert.equal(report.admissionGrantedByThisReport, false);
  assert.equal(report.nativeOrProvenanceProofClaimed, false);
  assert.equal(report.scoreHistoryCompletenessClaimed, false);
  assert.equal(JSON.stringify(f), before, 'diagnostic must never mutate admitted weather');
  accounting(report);
});

test('missing zone, missing hour, absent mode and explicit null have separate honest accounting', () => {
  const f = fixture();
  delete f.conditions.coastalParts.zones[f.ids[1]];
  hours(f).splice(1, 1);
  delete hours(f)[1].beach;
  for (const mode of ['waders', 'beach']) hours(f).at(-1)[mode].weather.waveHeightM = null;
  const r = build(f);
  assert.equal(r.modes.waders.allFive.unknown, 119);
  assert.equal(r.modes.beach.allFive.unknown, 120);
  assert.equal(r.modes.waders.wave.missing, 1);
  assert.equal(r.modes.beach.wave.missing, 1);
  assert.equal(r.modes.waders.allFive.available, 116);
  assert.equal(r.modes.beach.allFive.available, 115);
  assert.equal(r.modes.waders.wind.missing, 0);
  accounting(r);
});

test('normal semantics distinguish legitimate zero/calm from null, strings and invalid wave tuples', () => {
  const f = fixture(1);
  for (const row of hours(f)) for (const mode of ['waders', 'beach']) Object.assign(row[mode].weather,
    { windSpeedMps: 0, waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: null });
  assert.equal(build(f).modes.waders.allFive.available, 118);
  for (const [field, value] of [['waveHeightM', null], ['waveHeightM', '0'], ['waveHeightM', -1],
    ['wavePeriodS', null], ['waveDirectionDeg', 360]]) {
    const g = structuredClone(f); hours(g)[0].waders.weather[field] = value;
    const r = build(g); assert.equal(r.modes.waders.wave.available, 117);
    assert.equal(r.modes.waders.wave.missing, 1); accounting(r);
  }
});

test('waders and beach use their own winner weather and cannot fill each other', () => {
  const f = fixture(1);
  hours(f)[0].beach.weather.waveHeightM = null;
  const r = build(f);
  assert.notEqual(hours(f)[0].waders.winningPartId, hours(f)[0].beach.winningPartId);
  assert.equal(r.modes.waders.wave.available, 118);
  assert.equal(r.modes.beach.wave.available, 117);
  assert.equal(r.modes.beach.allFive.missing, 1);
  accounting(r);
});

test('unknown root/model, wrong mode binding and unavailable mode cannot become available', () => {
  const f = fixture(1);
  delete f.conditions.coastalParts.modelBinding;
  for (const mode of ['waders', 'beach']) assert.equal(build(f).modes[mode].allFive.unknown, 118);
  const g = fixture(1);
  hours(g)[0].waders.modelBinding.modelBundleSha256 = '0'.repeat(64);
  hours(g)[1].beach.available = false;
  const r = build(g);
  assert.equal(r.modes.waders.allFive.unknown, 1);
  assert.equal(r.modes.beach.allFive.unknown, 1);
  accounting(r);
});

test('duplicate and malformed times never supply a valid cell; outside-axis rows cannot enlarge it', () => {
  const f = fixture(1);
  hours(f).push(structuredClone(hours(f)[0]));
  const r = build(f);
  assert.equal(r.diagnostics.duplicateHourCells, 1);
  assert.equal(r.modes.waders.allFive.unknown, 1);
  assert.equal(r.modes.waders.allFive.available, 117);
  const g = fixture(1);
  hours(g).push({ ...structuredClone(hours(g)[0]), time: '2026-10-20T08:30:00.000Z' });
  assert.equal(build(g).modes.waders.allFive.unknown, 118);
  const h = fixture(1);
  hours(h).push({ ...structuredClone(hours(h)[0]), time: '2026-10-20T07:00:00.000Z' });
  const outside = build(h);
  assert.equal(outside.diagnostics.offAxisRows, 1);
  assert.equal(outside.modes.waders.allFive.expected, 118);
  assert.equal(outside.modes.waders.allFive.available, 118);
});

test('a weather time mismatch and a bad production reference stay unknown', () => {
  const f = fixture(1);
  hours(f)[0].waders.weather.time = hours(f)[1].time;
  assert.equal(build(f).modes.waders.allFive.unknown, 1);
  f.conditions.productionReferenceAt = '2026-10-20T08:00:00Z';
  const r = build(f);
  assert.equal(r.checks.exactReferenceKnown, false);
  assert.equal(r.modes.waders.allFive.unknown, 118);
  assert.equal(r.perLocalCalendarDay.length, 0);
});

test('Europe/Copenhagen distribution counts both repeated DST hours on25October', () => {
  const r = build(fixture(2, '2026-10-23T00:00:00.000Z'));
  const day = r.perLocalCalendarDay.find(row => row.date === '2026-10-25');
  assert.equal(day.hourCount, 25);
  assert.equal(day.expectedZoneHoursPerMode, 50);
  assert.equal(day.modes.waders.allFive.available, 50);
  assert.equal(r.perLocalCalendarDay.reduce((n, row) => n + row.expectedZoneHoursPerMode, 0), 236);
  accounting(r);
});

test('unknown or duplicate hydrated registry and unexpected source zones never claim coverage', () => {
  for (const changes of [null, { features: [] },
    { features: fixture(1).zonesDocument.features },
    { type: 'Feature', features: fixture(1).zonesDocument.features }]) {
    const f = fixture(1); f.zonesDocument = changes;
    const r = build(f); assert.equal(r.axis.expectedZoneHoursPerMode, null);
    assert.equal(r.modes.waders.allFive.available, 0);
    assert.equal(r.modes.waders.allFive.unknown, null);
    assert.equal(r.modes.waders.allFive.availablePercent, null);
  }
  const g = fixture(1); g.zonesDocument.features.push(structuredClone(g.zonesDocument.features[0]));
  assert.equal(build(g).checks.registryKnown, false);
  const h = fixture(1); h.conditions.coastalParts.zones.UNKNOWN = structuredClone(h.conditions.coastalParts.zones[h.ids[0]]);
  const r = build(h); assert.equal(r.checks.sourceZoneSetCompatible, false);
  assert.equal(r.modes.waders.allFive.unknown, 118);
});

test('the actual normal audit preserves schema4 parent counts and emits separate local coverage', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-local-coverage-audit-'));
  try {
    const f = fixture();
    fs.mkdirSync(path.join(directory, 'data/live'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
      version: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version,
    }));
    fs.writeFileSync(path.join(directory, 'data/zones.geojson'), JSON.stringify(f.zonesDocument));
    fs.writeFileSync(path.join(directory, 'data/live/conditions.json'), JSON.stringify(f.conditions));
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/audit-implementation-plan-4.0.25.mjs')],
      { cwd: directory, encoding: 'utf8', timeout: 60_000, maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, RAVRADAR_AUDIT_STRICT: 'false' }, windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    const r = JSON.parse(result.stdout);
    assert.equal(r.schemaVersion, 4);
    assert.equal(r.componentIntervalCoverageScope, 'LEGACY_PARENT_POINT_FORECAST_ALL_FIELDS_FINITE');
    assert.equal(r.componentIntervalCoverage.wave.validHours, 0);
    assert.equal(r.componentIntervalCoverage.wave.missingHours, 236);
    assert.equal(r.componentMissingZones.wave, 2);
    assert.equal(r.zoneModeWeatherCoverage.modes.waders.wave.available, 236);
    assert.equal(r.zoneModeWeatherCoverage.modes.beach.wave.available, 236);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'data/diagnostics/implementation-plan-audit.json'))), r);
    const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).scripts;
    const plan = buildSourceValidationPlan(scripts);
    assert.equal(plan.remaining.filter(command => command.includes('scripts/test-weather-component-safe-summary.mjs')).length, 1);
    const seam = fs.readFileSync(path.join(ROOT, 'scripts/test-weather-component-safe-summary.mjs'), 'utf8');
    assert.equal((seam.match(/^import '\.\/test-zone-mode-weather-coverage\.mjs';$/gm) ?? []).length, 1);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('rr-local-coverage-audit-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
