import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES } from './lib/open-meteo-part-bank.mjs';
import { applyVerifiedWaterSourceRoutingToPartHourly } from './lib/water-source-forecast-routing.mjs';
import { assertDmiPartHourlyGridSamplingApplicable, verifiedIntegratedPartHourly,
  verifiedBulkCurrent, dmiExpectedIdentityForPart } from './lib/ravscore-production-adapters.mjs';
import crypto from 'node:crypto';
import { mergeActiveNativeLiveCurrentPilotIntoRecord } from './lib/protected-live-current-assembly.mjs';
import { copernicusLiveRecordProjectionSha256 } from './lib/live-current-pilot.mjs';
import { buildWeatherComponentNeeds } from './lib/weather-component-needs.mjs';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';
import { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES } from './private-production-runtime-workflow.mjs';

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
  const safeLogs = [];
  const output = { weatherEngine: {} };
  const waterSourceRoutingContext = { sources: [], index: new Map(), routing: {}, haversineKm: () => 0 };
  const context = vm.createContext({ path, output, generatedAt: reference,
    safeWeatherComponentSummary, console: { log: line => safeLogs.push(JSON.parse(line)) },
    coastalPartsContract: { enabled: true, zones: { CURRENT: [part] } },
    features: [{ properties: { id: 'CURRENT' } }], nextDmiForecastStore: {}, dmiBulkCache: {},
    persistedDmiPartRows: new Map(), historicalDmiBulkCache: {}, activeParts: [part],
    deployedDmiBulkCache: {}, liveCurrentPilot: {}, previous: {}, previousPrivateCandidateGRuntime: null,
    coastalPointStateInjections: {}, ravScoreCheckpoint: { loaded: false },
    historicalWaveInputTransition: null,
    waterSourceRoutingContext, applyVerifiedWaterSourceRoutingToPartHourly,
    assertDmiPartHourlyGridSamplingApplicable,
    RESEARCH_HISTORY_HOURS: 72, OPEN_METEO_FUTURE_HOURS: 121, OPEN_METEO_NATIVE_NEAREST_POLICIES,
    COMPONENT_COPERNICUS_BUDGET_MS: 0, COMPONENT_OPEN_METEO_BUDGET_MS: 0,
    reportWeatherBuildStage: () => {},
    feggesundNeighborSourcesByTime: () => new Map(),
    dmiExpectedIdentityForPart: target => {
      assert.equal(target.zoneId, 'CURRENT');
      return { entityId: `PART::${target.partId}` };
    },
    localPartRuntimeProperties: (_parent, _part, id) => ({ id }),
    buildPartDmiForecastWithProtectedRetention: (_feature, _bulk, protectedBulk, at, options) => {
      assert.equal(at, reference);
      assert.equal(protectedBulk, context.deployedDmiBulkCache);
      assert.equal(options.startAt, reference);
      return { hourly: [{ time: reference }], localMaterialization: true };
    },
    applyFeggesundOperationalWaveProxy: record => record,
    verifiedIntegratedPartHourly: (record, _bulk, id, target, inputs) => {
      assert.equal(record.localMaterialization, true); assert.equal(id, 'PART::P1');
      assert.equal(target.zoneId, 'CURRENT');
      assert.notEqual(inputs, verifiedInputs, 'planning owns only its explicit applicability wrapper');
      assert.deepEqual(Object.keys(inputs).sort(),
        [...Object.keys(verifiedInputs), 'requireNativeGridSampling', 'liveCurrentPilot'].sort());
      for (const [key, value] of Object.entries(verifiedInputs)) assert.equal(inputs[key], value);
      assert.equal(inputs.requireNativeGridSampling, false);
      assert.equal(inputs.liveCurrentPilot, context.liveCurrentPilot);
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
      assert.equal(safeLogs.length, 1, 'supplier evidence is emitted before replay can fail');
      assert.equal(safeLogs[0].kind, 'weather-component-coverage');
      assert.equal(planned, true); assert.equal(args[12], verifiedInputs);
      assert.equal(args[14], waterSourceRoutingContext);
      assert.equal(args[15], context.persistedDmiPartRows);
      assert.equal(args[16], context.historicalDmiBulkCache);
      scored = true; return { completeLocalBuild: true };
    },
    packDmiPartContinuity: async (_selected, selectedParts, at) => {
      assert.equal(selectedParts, context.activeParts);
      assert.equal(at, reference);
      return { synthetic: true };
    },
  });
  await vm.runInContext(`(async () => { ${source.slice(start, end)} })()`, context);
  assert.equal(scored, true);
  assert.equal(output.weatherEngine.componentFallback.prepared, true);
  assert.equal(safeLogs[0].prepared, undefined, 'raw summary fields do not reach logs');
});

test('durable selected-input marker precedes provenance, public shards and compact private output', () => {
  const score = source.indexOf('const coastalPartScoreBuild =');
  const save = source.indexOf('output.weatherComponentInputs = await persistWeatherComponentSelections(weatherComponents);');
  const provenance = source.indexOf('enrichCurrentProvenanceDocuments({', save);
  const publicRuntime = source.indexOf('writePublicRuntimeFromFull(output)', provenance);
  const compact = source.indexOf('compactPrivateConditionsForPersistence(output, publicHourPack.marker)', publicRuntime);
  const conditions = source.indexOf('writeBoundedJsonAtomic(stagedConditionsPath, privateOutput)', compact);
  assert.ok(score > 0 && save > score && provenance > save && publicRuntime > provenance
    && compact > publicRuntime && conditions > compact);
  assert.match(source, /recordSelectedWeatherComponents\(componentInputs\.componentSelectionHistory, \{ \.\.\.part, zoneId \}, hourly\)/);
  assert.match(source, /COMPONENT_COPERNICUS_BUDGET_MS = WEATHER_CACHE_ONLY \? 0/);
  assert.match(source, /COMPONENT_OPEN_METEO_BUDGET_MS = WEATHER_CACHE_ONLY \? 0/);
  const routing = source.indexOf('const routedWater = waterSourceRoutingContext');
  const trace = source.indexOf('furWaterRoutingTrace = routedWater.diagnostic', routing);
  const wrap = source.indexOf('const furWaterRoutingDiagnostic = buildFurWaterRoutingDiagnostic(');
  const persist = source.indexOf('output.furWaterRoutingDiagnostic = furWaterRoutingDiagnostic', wrap);
  assert.ok(routing > 0 && trace > routing && wrap > score && persist > wrap && persist < publicRuntime);
  assert.match(source,/previousRoutingDiagnostic: previous\?\.furWaterRoutingDiagnostic \?\? null/);
  assert.match(source,/diagnosticReferenceAt: generatedAt/);
  assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes('scripts/lib/fur-water-routing-diagnostic.mjs'));
});

test('scalar planning and public current scoring use their own exact applicability horizons', async () => {
  // Existing complete synthetic originals/closure; no new provenance labels.
  const fixtureSlice = (file, from, until) => {
    const text = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    const first = text.indexOf(from), last = text.indexOf(until, first);
    assert.ok(first >= 0 && last > first, `existing fixture boundary ${file}`);
    return text.slice(first, last);
  };
  const closure = Function('crypto', 'copernicusLiveRecordProjectionSha256',
    fixtureSlice('./test-current-operational-live-adapter.mjs',
      'const canonicalJson =', 'const regionalReferenceSeed =')
      + '; return { live, part: copPart, reference: REFERENCE };')(
    crypto, copernicusLiveRecordProjectionSha256);
  const selectedPart = { ...closure.part, onshoreDirectionDeg: 90 };
  const at = new Date(closure.reference).toISOString();
  const time = offset => new Date(Date.parse(at) + offset * 3600000).toISOString();
  const identity = dmiExpectedIdentityForPart(selectedPart);
  const original = Function('part', 'identity', 'time',
    fixtureSlice('./test-dmi-protected-tuple-continuity.mjs',
      'const vectorSelection =', 'const options =') + '; return { row, bulk };')(
    selectedPart, identity, time);
  const record = { point: selectedPart.waterPoint,
    hourly: Array.from({ length: 121 }, (_, i) => original.row(i)) };
  const sanitize = value => verifiedIntegratedPartHourly(value, original.bulk,
    identity.entityId, selectedPart, { requireNativeGridSampling: false });
  const originalBytes = JSON.stringify({ record, bulk: original.bulk, live: closure.live });
  const scalarFields = ['windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'wavePeriodS',
    'waveDirectionDeg', 'waterLevelCm', 'waterLevelTrendCm3h', 'waterTemperatureC'];
  const scalarView = rows => rows.map(row => Object.fromEntries(
    ['time', ...scalarFields].map(key => [key, row[key]])));
  const routing = { sources: [], index: new Map(), routing: {}, haversineKm: () => 0 };
  const planningEnd = source.indexOf('\nconst coastalPartScoreBuild =', start);
  const scoreStart = source.indexOf('      const operationalDmiRecord = applyFeggesundOperationalWaveProxy(');
  const scoreEnd = source.indexOf('\n      if (routedWater.diagnostic)', scoreStart);
  assert.ok(planningEnd > start && scoreStart >= 0 && scoreEnd > scoreStart);
  const common = { path, generatedAt: at, liveCurrentPilot: null,
    applyVerifiedWaterSourceRoutingToPartHourly, assertDmiPartHourlyGridSamplingApplicable,
    verifiedIntegratedPartHourly, verifiedBulkCurrent, dmiExpectedIdentityForPart,
    mergeActiveNativeLiveCurrentPilotIntoRecord,
    applyFeggesundOperationalWaveProxy: value => value,
    waterSourceRoutingContext: routing };
  const runScore = (input, live = null) => vm.runInNewContext(
    `(() => { ${source.slice(scoreStart, scoreEnd)}; return hourly; })()`, {
      ...common, liveCurrentPilot: live, dmiRecord: input, part: selectedPart,
      zoneId: selectedPart.zoneId, bulkCache: original.bulk, bulkId: identity.entityId,
      partDmiIdentity: identity, feggesundSourcesByTime: new Map(), componentInputs: {},
      parent: { properties: { id: selectedPart.zoneId } }, partForecastStartAt: at,
      RAVSCORE_PUBLIC_FORECAST_HOURS: 118,
    });
  const runPlan = async input => {
    let planned;
    const context = vm.createContext({ ...common,
      output: { weatherEngine: {} }, console: { log() {} }, safeWeatherComponentSummary,
      coastalPartsContract: { enabled: true, zones: { [selectedPart.zoneId]: [selectedPart] } },
      features: [{ properties: { id: selectedPart.zoneId } }], nextDmiForecastStore: {},
      dmiBulkCache: original.bulk, deployedDmiBulkCache: null, historicalDmiBulkCache: null,
      persistedDmiPartRows: new Map(), coastalPointStateInjections: {},
      RESEARCH_HISTORY_HOURS: 72, OPEN_METEO_FUTURE_HOURS: 121,
      OPEN_METEO_NATIVE_NEAREST_POLICIES, COMPONENT_COPERNICUS_BUDGET_MS: 0,
      COMPONENT_OPEN_METEO_BUDGET_MS: 0, reportWeatherBuildStage() {},
      feggesundNeighborSourcesByTime: () => new Map(),
      localPartRuntimeProperties: (_parent, _part, id) => ({ id }),
      buildPartDmiForecastWithProtectedRetention: () => input,
      prepareWeatherComponentRuntime: async options => {
        const hourly = options.readVerifiedHourly(options.parts[0], {});
        const needs = buildWeatherComponentNeeds({ parts: options.parts,
          productionReferenceAt: at, readVerifiedHourly: () => hourly });
        planned = { hourly, needs };
        return { inputs: {}, summary: {} };
      },
    });
    await vm.runInContext(`(async () => { ${source.slice(start, planningEnd)} })()`, context);
    return planned;
  };
  const plan = await runPlan(record);
  assert.equal(plan.hourly.length, 121);
  assert.deepEqual(scalarView(plan.hourly), scalarView(sanitize(record)));
  for (const [component, coverage] of Object.entries(plan.needs.summary)) {
    assert.notEqual(component, 'current');
    assert.equal(coverage.valid, 118);
    assert.equal(coverage.missing, 0);
  }
  assert.equal(plan.needs.summary.waterLevel.trendMissing, 0,
    'all last public T+3 trends retain their actual private support');
  assert.equal(plan.needs.needs.length, 0);
  const waterOnly = structuredClone(record);
  for (const row of waterOnly.hourly) {
    for (const key of ['currentUMps', 'currentVMps', 'windSpeedMps', 'windDirectionDeg',
      'waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'waterTemperatureC']) delete row[key];
    for (const component of ['current', 'wind', 'wave', 'waterTemperature']) delete row.sources[component];
  }
  const waterPlan = await runPlan(waterOnly);
  assert.equal(waterPlan.needs.summary.waterLevel.valid, 118);
  assert.equal(waterPlan.needs.summary.waterLevel.trendMissing, 0);
  assert.equal(waterPlan.needs.summary.wind.missing, 118);
  const unknown = error => error.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED'
    && error.samplingStatus === 'unknown';
  assert.throws(() => runScore(record), unknown, 'unknown public current still stops scoring');
  const first = { ...record, hourly: record.hourly.slice(0, 1) };
  assert.equal(runScore(first, closure.live)[0].currentProvenance.provider, 'copernicus',
    'actual scoring assembles an independently qualified closure before its strict gate');
  for (const live of [{ ...closure.live, operationalClosure: null },
    { ...closure.live, entries: closure.live.entries.map(entry => entry.partId === selectedPart.partId
      ? { ...entry, recordProjectionSha256: `sha256:${'0'.repeat(64)}` } : entry) }]) {
    assert.throws(() => runScore(first, live), unknown);
  }
  const corrected = structuredClone(record);
  for (const row of corrected.hourly.slice(0, 118)) {
    const current = row.sources.current;
    const sampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 0,
      gridIndexIdentitySha256: 'c'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: current.gridDefinitionSha256, gridPoint: [...current.gridPoint],
      fieldSet: [...current.fieldSet], optionalFieldSet: [...current.optionalFieldSet] };
    current.nativeGridSampling = sampling;
    current.nativeSteps[0].nativeGridSampling = structuredClone(sampling);
  }
  const scored = runScore(corrected);
  assert.equal(scored.length, 121, 'scope the gate, never truncate scalar/continuity output');
  assert.deepEqual(scalarView(scored), scalarView(plan.hourly));
  for (let index = 0; index < 121; index++) {
    assert.deepEqual(scored[index].sources, corrected.hourly[index].sources);
  }
  for (const index of [0, 117]) {
    const missing = structuredClone(corrected);
    delete missing.hourly[index].sources.current.nativeGridSampling;
    delete missing.hourly[index].sources.current.nativeSteps[0].nativeGridSampling;
    assert.throws(() => runScore(missing), unknown, `public H${index} remains fail-closed`);
  }
  const contradictory = structuredClone(corrected);
  contradictory.hourly[117].sources.current.nativeGridSampling.elementIndex += 1;
  assert.throws(() => runScore(contradictory), error =>
    error.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'contradictory');
  assert.equal(JSON.stringify({ record, bulk: original.bulk, live: closure.live }), originalBytes,
    'original payloads, historical source fields and closure are never repaired or mutated');
});
