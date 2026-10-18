import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import * as normalDmiRecord from './lib/private-dmi-recovery-record.mjs';
import { currentFamilyColdStartScalarRecord } from './current-family-cold-start.mjs';
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
import { createDmiForecastRecord, DMI_FORECAST_HOURS, normalizeForecastHourly }
  from './lib/dmi-forecast-store.mjs';
import { verifiedDmiNativeComponentSource, verifiedDmiForecastComponentSource }
  from './lib/ravscore-production-adapters.mjs';
import { buildDmiMarineComponentwiseHourly, recoverDmiMarineRunSeamHours }
  from './lib/dmi-marine-run-seam-recovery.mjs';
import { preferQualifiedDmiComponentSource } from './lib/weather-component-selection.mjs';
import { dmiWaveDirectionMatchesSource } from './lib/dmi-wave-tuple-proof.mjs';
import { repairWaterLevelContinuity } from './lib/water-level-continuity.mjs';
import { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';
import { FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,
  FEGGESUND_WAVE_DISPOSITIONS, buildFeggesundWaveProxy, bindVerifiedFeggesundWaveSource,
  buildFeggesundWaveInputProofEntry, buildFeggesundWaveCoverageProof }
  from './lib/feggesund-wave-proxy.mjs';

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
// The actual producer reads its default-OFF diagnostic flag. Keep these
// ordinary VM callers credential-free and independent of the host environment.
const ordinaryProcess = Object.freeze({ env: Object.freeze({}) });

test('normal PART production plans on current central identity and passes the prepared indexes into scoring', async () => {
  let planned = false, scored = false, originRead = false;
  const safeLogs = [];
  const output = { weatherEngine: {} };
  const waterSourceRoutingContext = { sources: [], index: new Map(), routing: {}, haversineKm: () => 0 };
  const context = vm.createContext({ path, process: ordinaryProcess, output, generatedAt: reference,
    safeWeatherComponentSummary, console: { log: line => safeLogs.push(JSON.parse(line)) },
    coastalPartsContract: { enabled: true, zones: { CURRENT: [part] } },
    features: [{ properties: { id: 'CURRENT' } }], nextDmiForecastStore: {}, dmiBulkCache: {},
    persistedDmiPartRows: new Map(), historicalDmiBulkCache: {}, activeParts: [part],
    deployedDmiBulkCache: {}, liveCurrentPilot: {}, previous: {}, previousPrivateCandidateGRuntime: null,
    coastalPointStateInjections: {}, ravScoreCheckpoint: { loaded: false },
    historicalWaveInputTransition: null, stateEpochView: null,
    currentFamilyColdStart: null, coldInputs: null,
    readEstablishedNativeCurrentOrigin: async contract => {
      assert.equal(planned, true, 'fixed origin read follows prepared normal inputs');
      assert.equal(contract, context.coastalPartsContract);
      originRead = true;
      return null; // This legacy orchestration fixture claims no origin/native authority.
    },
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
      assert.equal(originRead, true, 'fixed origin read must finish before scoring');
      assert.equal(args[19], null, 'unqualified fixture retains the full old pipeline path');
      assert.equal(args[14], waterSourceRoutingContext);
      assert.equal(args[15], context.persistedDmiPartRows);
      assert.equal(args[18], null, 'ordinary weather does not request a new epoch');
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
  const score = source.indexOf('coastalPartScoreBuild = coastalPartsContract.enabled');
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
  const planningEnd = source.indexOf('\nlet coastalPartScoreBuild;', start);
  const scoreStart = source.indexOf('      const operationalDmiRecord = applyFeggesundOperationalWaveProxy(');
  const scoreEnd = source.indexOf('\n      if (routedWater.diagnostic)', scoreStart);
  assert.ok(planningEnd > start && scoreStart >= 0 && scoreEnd > scoreStart);
  const common = { path, process: ordinaryProcess, generatedAt: at, liveCurrentPilot: null,
    currentFamilyColdStart: null, coldInputs: null,
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
    let planned, originRead = false;
    const context = vm.createContext({ ...common,
      output: { weatherEngine: {} }, console: { log() {} }, safeWeatherComponentSummary,
      coastalPartsContract: { enabled: true, zones: { [selectedPart.zoneId]: [selectedPart] } },
      readEstablishedNativeCurrentOrigin: async contract => {
        assert.ok(planned, 'fixed origin read follows actual scalar planning');
        assert.equal(contract, context.coastalPartsContract);
        assert.equal(originRead, false, 'one fixed origin read per normal planning pass');
        originRead = true;
        return null; // Legacy scalar fixture has no authenticated origin handle.
      },
      features: [{ properties: { id: selectedPart.zoneId } }], nextDmiForecastStore: {},
      dmiBulkCache: original.bulk, deployedDmiBulkCache: null, historicalDmiBulkCache: null,
      persistedDmiPartRows: new Map(), coastalPointStateInjections: {}, stateEpochView: null,
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
    assert.equal(originRead, true, 'normal planning excerpt completed its fixed origin read');
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

test('Feggesund wave-only preflight retains original 3x118 wave choices without authorizing unknown current', () => {
  const extract = (first, next) => {
    const from = source.indexOf(first), until = source.indexOf(next, from);
    assert.ok(from >= 0 && until > from, `normal producer boundary ${first}`);
    return source.slice(from, until);
  };
  const originalFixture = fs.readFileSync(
    new URL('./test-dmi-protected-tuple-continuity.mjs', import.meta.url), 'utf8');
  const fixtureSlice = (first, next) => {
    const from = originalFixture.indexOf(first), until = originalFixture.indexOf(next, from);
    assert.ok(from >= 0 && until > from, `existing original fixture ${first}`);
    return originalFixture.slice(from, until);
  };
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const dependencyScope = {
    ...normalDmiRecord,
    createDmiForecastRecord, DMI_FORECAST_HOURS, normalizeForecastHourly,
    verifiedDmiNativeComponentSource, verifiedDmiForecastComponentSource,
    verifiedBulkCurrent, verifiedIntegratedPartHourly, dmiExpectedIdentityForPart,
    buildDmiMarineComponentwiseHourly, recoverDmiMarineRunSeamHours,
    preferQualifiedDmiComponentSource, dmiWaveDirectionMatchesSource,
    repairWaterLevelContinuity, localPartRuntimeProperties,
    FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,
    FEGGESUND_WAVE_DISPOSITIONS, buildFeggesundWaveProxy,
    bindVerifiedFeggesundWaveSource, buildFeggesundWaveInputProofEntry,
    buildFeggesundWaveCoverageProof,
    ravScoreNumber: number, num: number,
    CURRENT_VECTOR_SEMANTICS_VERSION: 3, RAVSCORE_PUBLIC_FORECAST_HOURS: 118,
    ACCEPTED_FORECAST_HOURS: 118, SHORT_DMI_WATER_GAP_HOURS: 6,
    WATER_LEVEL_JUMP_WARN_CM: 35,
  };
  const normal = Function(...Object.keys(dependencyScope),
    `${extract('function feggesundNeighborSourcesByTime(', 'function mergeBulkCacheIntoForecastStore(')}
     return { buildPartDmiForecastWithProtectedRetention, applyFeggesundOperationalWaveProxy,
       preflightFeggesundOperationalWaveReadiness, verifiedFeggesundNeighborSource };`)(
    ...Object.values(dependencyScope));
  const at = '2026-09-01T00:00:00.000Z';
  const time = offset => new Date(Date.parse(at) + offset * 3_600_000).toISOString();
  const zoneId = FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID;
  const parts = ['DIRECT', 'HISTORICAL', 'PROXY'].map(name => ({
    partId: `SYNTHETIC-FEGGESUND-${name}`, name, parentZoneId: zoneId, zoneId,
    waterPoint: [8, 55], landPoint: [8, 55.01], onshoreDirectionDeg: 90,
  }));
  const makeOriginal = (part, identity = dmiExpectedIdentityForPart(part)) => Function(
    'part', 'identity', 'time',
    `${fixtureSlice('const vectorSelection =', 'const options =')}
     ${fixtureSlice('const asNative = rows =>', 'const nativeHistorical =')}
     return { row, bulk, asNative };`)(part, identity, time);
  const originals = parts.map(part => makeOriginal(part));
  const active = { ...originals[0].bulk, generatedAt: at, zones: {} };
  const deployed = { ...active, zones: {} }, historical = { ...active, zones: {} };
  const removeWave = row => {
    for (const key of ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg']) delete row[key];
    delete row.sources.wave;
    return row;
  };
  for (const [index, part] of parts.entries()) {
    const fixture = originals[index], id = dmiExpectedIdentityForPart(part).entityId;
    const rows = (run, revision, delta, waveAt) => Array.from({ length: 121 }, (_, offset) => {
      const row = fixture.row(offset, run, revision, delta);
      return waveAt(offset) ? row : removeWave(row);
    });
    active.zones[id] = fixture.asNative(rows(-6, -5, 1,
      offset => index === 0 && offset < 59)).zones[id];
    deployed.zones[id] = fixture.asNative(rows(-12, -11, 0,
      () => index === 0)).zones[id];
    historical.zones[id] = fixture.asNative(rows(-18, -17, 0,
      offset => index === 1 && offset < 59)).zones[id];
  }
  const sourcesByTime = new Map();
  for (let offset = 0; offset < 59; offset += 1) {
    const sources = FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.map(parentZoneId => {
      const identity = { entityId: parentZoneId, parentZoneId, entityType: 'parent-zone',
        samplingContext: 'parent-zone-water-point', samplingPoint: [8, 55] };
      const fixture = makeOriginal({ waterPoint: [8, 55] }, identity);
      const bound = normal.verifiedFeggesundNeighborSource(fixture.row(offset), identity);
      assert.ok(bound, 'neighbor tuple must pass the actual DMI source verifier');
      return bound;
    });
    sourcesByTime.set(time(offset), sources);
  }
  const parent = { properties: { id: zoneId, coastType: 'east' } };
  const inputs = { contract: { zones: { [zoneId]: parts } },
    parentById: new Map([[zoneId, parent]]), bulkCache: active, deployedBulkCache: deployed,
    historicalBulkCache: historical, persistedDmiPartRows: new Map(),
    pointStateInjections: {}, generatedAt: at, forecastStartAt: at, sourcesByTime,
    componentInputs: { requireNativeGridSampling: true } };
  const originalBytes = JSON.stringify({ active, deployed, historical, sources: [...sourcesByTime] });
  const selected = parts.map(part => {
    const identity = dmiExpectedIdentityForPart(part);
    const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: part.waterPoint },
      properties: localPartRuntimeProperties(parent.properties, part, identity.entityId) };
    const record = normal.buildPartDmiForecastWithProtectedRetention(feature, active, deployed, at,
      { startAt: at, expectedIdentity: identity, historicalBulkCache: historical });
    assert.equal(record.hourly.length, 121, 'all private T+3 support hours are retained');
    const operational = normal.applyFeggesundOperationalWaveProxy(record, part, sourcesByTime);
    const sanitized = verifiedIntegratedPartHourly(operational, active, identity.entityId, part,
      { requireNativeGridSampling: false });
    assert.equal(sanitized.length, 121);
    assert.equal(typeof sanitized[117].waterLevelTrendCm3h, 'number',
      'the last public water trend uses the original T+3 endpoint');
    assert.throws(() => verifiedIntegratedPartHourly(operational, active, identity.entityId, part,
      { requireNativeGridSampling: true }), error =>
      error.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'unknown',
    'actual selected-current use stays fail-closed; wave readiness is not current authority');
    return { record, sanitized };
  });
  assert.equal(selected[0].record.hourly[0].sources.wave.modelRun, time(-6),
    'genuinely newer active wave keeps normal priority');
  assert.equal(selected[0].record.hourly[117].sources.wave.modelRun, time(-12),
    'the original protected wave fills the exact active hole');
  assert.equal(selected[1].record.hourly[0].sources.wave.modelRun, time(-18),
    'the original historical wave fills the exact active/protected hole');
  const proof = normal.preflightFeggesundOperationalWaveReadiness(inputs);
  assert.equal(proof.entries.length, 354);
  for (const disposition of Object.values(FEGGESUND_WAVE_DISPOSITIONS)) {
    assert.ok(proof.counts[disposition] > 0, 'direct, proxy and honest MISSING are all exercised');
  }
  const expected = buildFeggesundWaveCoverageProof({ forecastStartAt: at, forecastHours: 118,
    partIds: parts.map(part => part.partId), entries: selected.flatMap(({ sanitized }, index) =>
      sanitized.slice(0, 118).map(hour => buildFeggesundWaveInputProofEntry({
        partId: parts[index].partId, time: hour.time, hour, part: parts[index],
        componentInputs: inputs.componentInputs }))) });
  assert.deepEqual(proof, expected, 'readiness exactly matches normal wave selection, not a count waiver');
  assert.equal(inputs.componentInputs.requireNativeGridSampling, true,
    'the wave-only wrapper must not mutate shared scoring inputs');
  assert.equal(JSON.stringify({ active, deployed, historical, sources: [...sourcesByTime] }), originalBytes,
    'all original cache bytes and neighbor proofs remain unchanged');
});

test('epoch scalar bridge reaches actual score/preflight/proxy and packed121 rows without OLD current', async () => {
  const fixtureText = fs.readFileSync(new URL('./test-dmi-protected-tuple-continuity.mjs', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const fixture = fixtureText.slice(fixtureText.indexOf('const vectorSelection ='), fixtureText.indexOf('const options ='));
  assert.equal(crypto.createHash('sha256').update(fixture).digest('hex'), '599011b47d8f8f4fea8fc41293e0306a3c6b1209ab217ace9f16e89126105c31');
  const at = '2026-09-01T00:00:00.000Z', time = h => new Date(Date.parse(at) + h * 3_600_000).toISOString();
  const selectedPart = { partId: 'EPOCH-SCALAR-PART', zoneId: 'EPOCH-SCALAR-ZONE', parentZoneId: 'EPOCH-SCALAR-ZONE', waterPoint: [8, 55] };
  const identity = dmiExpectedIdentityForPart(selectedPart);
  const factory = Function('part', 'identity', 'time', fixture + '; return {row, bulk};')(selectedPart, identity, time);
  const oldRecord = {zoneId: identity.entityId, point: selectedPart.waterPoint,
    hourly: Array.from({length: DMI_FORECAST_HOURS}, (_, h) => ({...factory.row(h),
      currentUMps: 999, currentVMps: 998, currentStateOnlyHold: {OLD: true}, currentCoastNormalSpeedMps: 997}))};
  const fresh = {zoneId: identity.entityId, point: selectedPart.waterPoint,
    hourly: Array.from({length: DMI_FORECAST_HOURS}, (_, h) => ({time: time(h), currentUMps: 0.4, currentVMps: 0.3,
      sources: {current: factory.row(h, -6, -5).sources.current}}))};
  const originals = JSON.stringify({oldRecord, fresh});
  const clearAt = source.indexOf('  planningRecords.clear();', start);
  const setup = source.slice(source.lastIndexOf('\n  });', clearAt) + '\n  });'.length, clearAt + '  planningRecords.clear();'.length);
  assert.ok(clearAt > start && setup.includes('planningRecords.clear();'));
  const makeInputs = (record = oldRecord, epoch = true) => {
    const planningRecords = new Map([[selectedPart.partId, record]]), weatherComponents = {inputs: {}};
    // This source-boundary seam starts AFTER genuine archive/view admission.
    // A sentinel here exercises only route selection, not a fake epoch brand.
    Function('stateEpochView', 'planningRecords', 'weatherComponents', 'withoutCurrent',
      'currentFamilyColdStart', 'currentFamilyColdStartScalarRecord', setup)(
      epoch ? {} : null, planningRecords, weatherComponents, normalDmiRecord.withoutCurrent,
      null, currentFamilyColdStartScalarRecord);
    assert.equal(planningRecords.size, 0, 'the ordinary bounded planning map is still released');
    return weatherComponents.inputs;
  };
  const helperStart = source.indexOf('function weatherStateEpochScalarHourly(');
  const helper = helperStart < 0 ? '' : source.slice(helperStart, source.indexOf('\nfunction preflightFeggesundOperationalWaveReadiness(', helperStart));
  const proxyStart = source.indexOf('function applyFeggesundOperationalWaveProxy(');
  const proxy = source.slice(proxyStart, source.indexOf('function missingFeggesundWaveHour(', proxyStart));
  const scorer = source.indexOf('function scoreCoastalPartsRuntime(');
  const scoreStart = source.indexOf('      if (!dmiRecord)', scorer);
  const scoreBody = source.slice(scoreStart, source.indexOf('      const record = mergeActiveNativeLiveCurrentPilotIntoRecord(', scoreStart));
  const preflight = source.indexOf('function preflightFeggesundOperationalWaveReadiness(');
  const preStart = source.indexOf('    if (!dmiRecord)', preflight);
  const preBody = source.slice(preStart, source.indexOf('    // This readiness ledger consumes waves only.', preStart));
  const run = (body, result, record, inputs, part = selectedPart, neighbors = new Map()) => Function(
    'mergeHourlyPreferDmi', 'withoutCurrent', 'buildFeggesundWaveProxy', 'FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID',
    'ravScoreNumber', 'dmiRecord', 'componentInputs', 'part', 'generatedAt', 'sourcesByTime',
    'feggesundSourcesByTime', 'partForecastStartAt', 'forecastStartAt', 'expectedIdentity', 'partDmiIdentity',
    'partWithZone', 'zoneId', 'selectedDmiPartRecords', helper + proxy + body + '\nreturn ' + result + ';')(
      normalDmiRecord.mergeHourlyPreferDmi, normalDmiRecord.withoutCurrent, buildFeggesundWaveProxy,
      FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, value => typeof value === 'number' && Number.isFinite(value) ? value : null,
      structuredClone(record), inputs, part, at, neighbors, neighbors, at, at, dmiExpectedIdentityForPart(part),
      dmiExpectedIdentityForPart(part), part, part.zoneId, new Map());
  const score = (record, inputs, part = selectedPart, neighbors = new Map()) => run(scoreBody,
    '({record: operationalDmiRecord, selected: selectedDmiPartRecords})', record, inputs, part, neighbors);
  const pre = (record, inputs, part = selectedPart, neighbors = new Map()) => run(preBody,
    'operationalRecord', record, inputs, part, neighbors);
  const inputs = makeInputs(), projected = score(fresh, inputs);
  const scalarValues = row => [row.windSpeedMps, row.waveHeightM, row.waterLevelCm, row.waterTemperatureC];
  assert.deepEqual(scalarValues(projected.record.hourly[0]), [5, 1, 12, 14],
    'all four genuine retained scalar tuples must survive the actual scorer input boundary');
  assert.equal(inputs.weatherStateEpochScalarPartRecords instanceof Map, true);
  const scalar = inputs.weatherStateEpochScalarPartRecords.get(selectedPart.partId);
  for (const row of scalar.hourly) {
    for (const key of ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg',
      'currentProvenance', 'currentStateOnlyHold', 'currentCoastNormalSpeedMps']) assert.equal(Object.hasOwn(row, key), false, key);
    assert.equal(Object.hasOwn(row.sources, 'current'), false);
  }
  const selected = projected.selected.get(selectedPart.partId);
  assert.deepEqual(selected.hourly, projected.record.hourly, 'the bridged RAW selection reaches actual selectedMap before the normal proxy');
  assert.deepEqual(pre(fresh, inputs).hourly, projected.record.hourly, 'preflight and scoring consume the same scalar selection');
  for (const row of selected.hourly) {
    assert.equal(row.currentUMps, 0.4); assert.equal(row.currentVMps, 0.3);
    assert.equal(row.currentStateOnlyHold, undefined); assert.equal(row.currentCoastNormalSpeedMps, undefined);
  }
  for (const field of ['wind', 'wave', 'waterLevel', 'waterTemperature'])
    assert.deepEqual(selected.hourly[0].sources[field], oldRecord.hourly[0].sources[field], 'verbatim scalar provenance ' + field);
  const noCurrent = structuredClone(fresh);
  for (const row of noCurrent.hourly) { delete row.currentUMps; delete row.currentVMps; delete row.sources.current; }
  const noCurrentResult = score(noCurrent, inputs).record;
  assert.equal(noCurrentResult.hourly[0].currentUMps, null); assert.equal(noCurrentResult.hourly[0].currentVMps, null);
  assert.equal(noCurrentResult.hourly[0].sources.current.provider, 'missing', 'OLD current never fills an absent NEW vector');
  assert.deepEqual(scalarValues(noCurrentResult.hourly[0]), [5, 1, 12, 14]);
  const ordinary = makeInputs(oldRecord, false);
  assert.equal(ordinary.weatherStateEpochScalarPartRecords, undefined);
  assert.deepEqual(score(fresh, ordinary).record.hourly, fresh.hourly, 'non-epoch behavior remains byte-equivalent');
  for (const mutation of ['identity', 'provenance']) {
    const invalid = structuredClone(oldRecord);
    for (const row of invalid.hourly) for (const field of ['wind', 'wave', 'waterLevel', 'waterTemperature']) {
      if (mutation === 'identity') row.sources[field].entityId = 'PART::OTHER';
      else row.sources[field].assetIdentitySha256 = 'not-a-hash';
    }
    assert.deepEqual(scalarValues(score(fresh, makeInputs(invalid)).record.hourly[0]), [null, null, null, null], mutation);
  }
  const newest = structuredClone(fresh);
  for (let h = 0; h < newest.hourly.length; h++) {
    const row = factory.row(h, -6, -5, 1);
    Object.assign(newest.hourly[h], {windSpeedMps: row.windSpeedMps, windDirectionDeg: row.windDirectionDeg});
    newest.hourly[h].sources.wind = row.sources.wind;
  }
  assert.equal(score(newest, inputs).record.hourly[0].windSpeedMps, 6, 'normal genuinely newer qualified primary still wins');
  const continuity = await import('./lib/dmi-part-continuity.mjs');
  const pack = await continuity.packDmiPartContinuity(projected.selected, [selectedPart], at);
  const restored = await continuity.unpackDmiPartContinuity(pack, [selectedPart], time(1));
  assert.equal(restored.get(selectedPart.partId).hourly.length, 121);
  assert.deepEqual(restored.get(selectedPart.partId).hourly, selected.hourly, 'actual normal pack/restore retains the bridged RAW record');
  assert.deepEqual(scalarValues(restored.get(selectedPart.partId).hourly[120]), [5, 1, 12, 14], 'the private final T+3 support is preserved');
  const clean = verifiedIntegratedPartHourly(projected.record, factory.bulk, identity.entityId, selectedPart,
    {requireNativeGridSampling: false});
  assert.deepEqual(scalarValues(clean[0]), [5, 1, 12, 14]);
  assert.equal(clean[117].waterLevelTrendCm3h, 0, 'the normal final-public T+3 sanitizer still sees its scalar support');
  const proxyPart = {...selectedPart, zoneId: FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID, parentZoneId: FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID};
  const proxyFresh = structuredClone(fresh);
  for (const row of proxyFresh.hourly) {
    for (const src of Object.values(row.sources)) src.parentZoneId = proxyPart.zoneId;
  }
  const waveMissing = structuredClone(oldRecord);
  for (const row of waveMissing.hourly) {
    delete row.waveHeightM; delete row.wavePeriodS; delete row.waveDirectionDeg; delete row.sources.wave;
    for (const src of Object.values(row.sources)) src.parentZoneId = proxyPart.zoneId;
  }
  const neighbors = new Map([[at, FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS.map((parentZoneId, i) => ({
    parentZoneId, validTime: at, provider: 'dmi', collection: 'wam_dw', component: 'wave', fallback: false,
    modelRun: time(-12), waveHeightM: 1.2, wavePeriodS: 7, waveDirectionDeg: 265, evidenceSha256: String(i + 1).repeat(64),
  }))]]);
  const proxied = score(proxyFresh, makeInputs(waveMissing), proxyPart, neighbors);
  const preProxy = pre(proxyFresh, makeInputs(waveMissing), proxyPart, neighbors);
  assert.deepEqual(preProxy.hourly, proxied.record.hourly, 'actual normal Feggesund proxy has identical scalar preflight/scoring inputs');
  assert.equal(proxied.record.hourly[0].waveInputSource, undefined, 'normal proxy proof remains in sources.wave until normal sanitizer');
  assert.equal(proxied.record.hourly[0].sources.wave.sourceClass, 'owner-approved-neighbor-wave-proxy');
  const proxyClean = verifiedIntegratedPartHourly(proxied.record, null, identity.entityId, proxyPart,
    {requireNativeGridSampling: false});
  assert.equal(proxyClean[0].waveInputSource, 'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION');
  assert.equal(proxyClean[0].waveHeightM, 1.2, 'the unchanged normal compact proxy proof passes the actual sanitizer');
  assert.equal(proxied.selected.get(selectedPart.partId).hourly[0].waveHeightM, null, 'persistence retains RAW selected input, not derived proxy');
  assert.equal(JSON.stringify({oldRecord, fresh}), originals, 'archive/NEW input records stay unchanged');
});
