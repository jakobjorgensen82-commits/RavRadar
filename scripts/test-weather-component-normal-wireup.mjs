import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES } from './lib/open-meteo-part-bank.mjs';

// Execute the actual normal producer's integration block without calling its
// network/storage entry point. Provider byte admission has separate real-file
// tests; this boundary ensures their prepared inputs reach normal scoring.
const source = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const start = source.indexOf('let weatherComponents = null;');
const end = source.indexOf('\nif (RAVSCORE_CURRENT_TRACE_PATH)', start);
assert.ok(start >= 0 && end > start);
const reference = '2026-09-19T12:00:00.000Z';
const part = { partId: 'P1', waterPoint: [10, 56], sourceZoneId: 'OLD' };
const verifiedInputs = Object.freeze({ fromPrivateAuthority: true });

test('normal PART production plans on current central identity and passes the prepared indexes into scoring', async () => {
  let planned = false, scored = false;
  const output = { weatherEngine: {} };
  const context = vm.createContext({ path, output, generatedAt: reference,
    coastalPartsContract: { enabled: true, zones: { CURRENT: [part] } },
    features: [{ properties: { id: 'CURRENT' } }], nextDmiForecastStore: {}, dmiBulkCache: {},
    deployedDmiBulkCache: {}, liveCurrentPilot: {}, previous: {}, previousPrivateCandidateGRuntime: null,
    coastalPointStateInjections: {}, ravScoreCheckpoint: { loaded: false },
    historicalWaveInputTransition: null,
    RESEARCH_HISTORY_HOURS: 72, OPEN_METEO_FUTURE_HOURS: 121, OPEN_METEO_NATIVE_NEAREST_POLICIES,
    COMPONENT_COPERNICUS_BUDGET_MS: 0, COMPONENT_OPEN_METEO_BUDGET_MS: 0,
    feggesundNeighborSourcesByTime: () => new Map(),
    dmiExpectedIdentityForPart: target => {
      assert.equal(target.zoneId, 'CURRENT');
      return { entityId: `PART::${target.partId}` };
    },
    localPartRuntimeProperties: (_parent, _part, id) => ({ id }),
    bulkZoneToForecastRecord: (_feature, _bulk, at, _previous, options) => {
      assert.equal(at, reference); assert.equal(options.materializeMissingHorizon, true);
      return { hourly: [{ time: reference }], localMaterialization: true };
    },
    applyFeggesundOperationalWaveProxy: record => record,
    verifiedIntegratedPartHourly: (record, _bulk, id, target, inputs) => {
      assert.equal(record.localMaterialization, true); assert.equal(id, 'PART::P1');
      assert.equal(target.zoneId, 'CURRENT'); assert.equal(inputs, verifiedInputs);
      return record.hourly;
    },
    prepareWeatherComponentRuntime: async options => {
      planned = true;
      assert.equal(options.productionReferenceAt, reference);
      assert.equal(options.retentionStartAt, '2026-09-16T12:00:00.000Z');
      assert.equal(options.retentionEndAt, '2026-09-24T12:00:00.000Z');
      assert.equal(options.openMeteoSpatialPolicies, OPEN_METEO_NATIVE_NEAREST_POLICIES);
      assert.equal(options.copernicusBudgetMs, 0); assert.equal(options.openMeteoBudgetMs, 0);
      assert.equal(options.readVerifiedHourly(options.parts[0], verifiedInputs)[0].time, reference);
      return { inputs: verifiedInputs, summary: { prepared: true } };
    },
    scoreCoastalPartsRuntime: (...args) => {
      assert.equal(planned, true); assert.equal(args[12], verifiedInputs);
      scored = true; return { completeLocalBuild: true };
    },
  });
  await vm.runInContext(`(async () => { ${source.slice(start, end)} })()`, context);
  assert.equal(scored, true);
  assert.equal(output.weatherEngine.componentFallback.prepared, true);
});

test('durable selected-input marker is written after scoring and before private conditions output', () => {
  const score = source.indexOf('const coastalPartScoreBuild =');
  const save = source.indexOf('output.weatherComponentInputs = await persistWeatherComponentSelections(weatherComponents);');
  const conditions = source.indexOf('await writeBoundedJsonAtomic(OUTPUT_PATH, output)', save);
  assert.ok(score > 0 && save > score && conditions > save);
  assert.match(source, /recordSelectedWeatherComponents\(componentInputs\.componentSelectionHistory, \{ \.\.\.part, zoneId \}, hourly\)/);
  assert.match(source, /COMPONENT_COPERNICUS_BUDGET_MS = WEATHER_CACHE_ONLY \? 0/);
  assert.match(source, /COMPONENT_OPEN_METEO_BUDGET_MS = WEATHER_CACHE_ONLY \? 0/);
});
