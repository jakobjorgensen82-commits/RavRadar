import assert from 'node:assert/strict';
import test from 'node:test';
import {
  backfillVerifiedOpenMeteoPartBank, buildOpenMeteoPartRequest,
  mergeOpenMeteoPartBank, openMeteoPartSha256,
  openMeteoMfNearestGridPoint, openMeteoComponentRequestParts, OPEN_METEO_COMPONENT_MODELS,
  readOpenMeteoPartResponse, selectedOpenMeteoPartRecord, validateOpenMeteoPartBank,
} from './lib/open-meteo-part-bank.mjs';
import { produceOpenMeteoPartComponents } from './produce-open-meteo-part-components.mjs';
import { mergeVerifiedOpenMeteoGenerations } from './lib/verified-open-meteo-generation-union.mjs';
import { responseBoundModelRun, selectQualifiedWeatherComponent } from './lib/weather-component-selection.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = hour => new Date(Date.parse(reference) + hour * 3_600_000).toISOString();
const part = { partId: 'TEST', sourceZoneId: 'ZONE', waterPoint: openMeteoMfNearestGridPoint([10, 56]) };
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
  .map(component => [component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0,
    ...(component === 'waterTemperature' ? { cellSelection: 'nearest' } : {}) }]));
const components = ['wind', 'wave', 'waterTemperature'];
const options = { parts: [part], spatialPolicies, retentionStartAt: at(-48), retentionEndAt: at(120),
  requiredPairs: Array.from({ length: 121 }, (_, hour) => components.map(component => ({
    partId: part.partId, validTime: at(hour), component,
  }))).flat() };
const request = component => buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference,
  cellSelection: spatialPolicies[component].cellSelection });
const response = (component, times = [reference, at(3), at(120)]) => ({
  longitude: part.waterPoint[0], latitude: part.waterPoint[1], utc_offset_seconds: 0,
  hourly: { time: times, ...(component === 'wind'
    ? { wind_speed_10m: times.map(() => 4), wind_direction_10m: times.map(() => 360) }
    : { wave_height: times.map(() => 1), wave_peak_period: times.map(() => 6),
      wave_direction: times.map(() => 180), sea_level_height_msl: times.map(() => 0.2),
      sea_surface_temperature: times.map(() => 15) }) },
  hourly_units: component === 'wind' ? { wind_speed_10m: 'm/s', wind_direction_10m: '°' }
    : { wave_height: 'm', wave_peak_period: 's', wave_direction: '°', sea_level_height_msl: 'm', sea_surface_temperature: '°C' },
});
const admit = (component, document = response(component), acquiredAt = reference) => readOpenMeteoPartResponse({
  request: request(component), responseText: JSON.stringify(document), acquiredAt,
}, { part, spatialPolicies });
const marineAdmissions = (document = response('wave'), acquiredAt = reference) =>
  ['wave', 'waterTemperature'].map(component => admit(component, document, acquiredAt));
const selected = (bank, component, validTime = reference, target = part) => selectedOpenMeteoPartRecord(
  validateOpenMeteoPartBank(bank, options), { part: target, component, validTime });

test('one explicit product per atomic component prevents mixed-model/grid response relabeling', () => {
  assert.deepEqual(OPEN_METEO_COMPONENT_MODELS, { wind: 'ecmwf_ifs025', wave: 'ecmwf_wam025',
    waterTemperature: 'meteofrance_currents' });
  assert.equal(openMeteoComponentRequestParts('wave').query.hourly, 'wave_height,wave_peak_period,wave_direction');
  assert.equal(openMeteoComponentRequestParts('wind').query.models, 'ecmwf_ifs025');
  for (const component of components) {
    const req = request(component);
    assert.notEqual(req.query.models, 'best_match');
    // Synthetic responses intentionally contain unrequested sibling fields.
    const admission = admit(component);
    assert.ok(admission.records.every(record => record.component === component));
    assert.ok(admission.records.every(record => record.source.requestedModel === req.query.models));
  }
  const wrongModel = request('wave');
  wrongModel.query.models = 'best_match';
  const { requestSha256: _old, ...content } = wrongModel;
  wrongModel.requestSha256 = openMeteoPartSha256(content);
  assert.throws(() => readOpenMeteoPartResponse({ request: wrongModel,
    responseText: JSON.stringify(response('wave')), acquiredAt: reference }, { part, spatialPolicies }), /REQUEST_BINDING_INVALID/);
});

test('SST requires explicit nearest policy and returned native center; no sea-mask neighbour or invented run', () => {
  assert.throws(() => buildOpenMeteoPartRequest(part, { component: 'waterTemperature',
    productionReferenceAt: reference }), /EXPLICIT_NEAREST_POLICY_REQUIRED/);
  assert.throws(() => openMeteoComponentRequestParts('waterTemperature', { cellSelection: 'sea' }), /EXPLICIT_NEAREST_POLICY_REQUIRED/);
  const noNearestPolicy = structuredClone(spatialPolicies);
  delete noNearestPolicy.waterTemperature.cellSelection;
  assert.throws(() => readOpenMeteoPartResponse({ request: request('waterTemperature'),
    responseText: JSON.stringify(response('waterTemperature')), acquiredAt: reference },
  { part, spatialPolicies: noNearestPolicy }), /EXPLICIT_NEAREST_POLICY_REQUIRED/);
  const moved = response('waterTemperature');
  moved.longitude += 1 / 12;
  assert.throws(() => admit('waterTemperature', moved), /SST_RESPONSE_GRID_MISMATCH/);
  const absent = response('waterTemperature');
  absent.hourly.sea_surface_temperature = [null, null, null];
  assert.equal(admit('waterTemperature', absent).records.length, 0);
  const [record] = admit('waterTemperature').records;
  assert.equal(record.source.model, 'meteofrance_sea_surface_temperature');
  assert.equal(record.source.requestedModel, 'meteofrance_currents');
  assert.equal(record.source.modelRun, null);
  assert.equal(record.source.spatialSelection, 'provider-nearest-native-center');
  assert.deepEqual(openMeteoMfNearestGridPoint(part.waterPoint), part.waterPoint);
  assert.equal(openMeteoMfNearestGridPoint([10, -90]), null);
});

test('PART-bound exact response admits three reserve tuples, never DMI-only water level', () => {
  const bank = mergeOpenMeteoPartBank(null, components.map(component => admit(component)), options);
  assert.equal(bank.records.length, 9);
  for (const component of components) {
    const record = selected(bank, component, at(120));
    assert.equal(record.source.entityId, 'PART::TEST');
    assert.equal(record.source.modelRun, null);
    assert.equal(responseBoundModelRun(record.source), null);
    assert.equal(record.source.acquiredAt, reference);
  }
  assert.equal(selected(bank, 'wind').values.windDirectionDeg, 0);
  assert.equal(selected(bank, 'wave').source.periodSemantics, 'peak');
  assert.equal(selected(bank, 'waterLevel'), null);
  assert.throws(() => request('waterLevel'), /DMI_ONLY/);
  assert.equal(selected(bank, 'wind', reference, { ...part, waterPoint: [10.1, 56] }), null);
});

test('two protected generations retain newer Open-Meteo tuples and backfill only proved holes', () => {
  const latest = mergeOpenMeteoPartBank(null, [admit('wind')], options);
  const olderWind = response('wind');
  olderWind.hourly.wind_speed_10m = olderWind.hourly.wind_speed_10m.map(() => 7);
  const complete = mergeOpenMeteoPartBank(null, [
    admit('wind', olderWind), ...marineAdmissions(),
  ], options);
  const recovered = backfillVerifiedOpenMeteoPartBank(latest, complete, options);
  assert.equal(recovered.records.length, 9);
  assert.deepEqual(mergeVerifiedOpenMeteoGenerations(latest, complete, options), recovered);
  assert.equal(selected(recovered, 'wind').values.windSpeedMps, 4,
    'the latest generation keeps its independently valid exact tuple');
  assert.equal(selected(recovered, 'wave').values.waveHeightM, 1);
  assert.equal(selected(recovered, 'waterTemperature').values.waterTemperatureC, 15);
  assert.equal(selected(recovered, 'waterLevel'), null);
  const forged = structuredClone(complete);
  const evidenceId = forged.records.find(record => record.component === 'wave').evidenceId;
  forged.responses[evidenceId].responseText = '{}';
  const { bankSha256: _previousHash, ...body } = forged;
  forged.bankSha256 = openMeteoPartSha256(body);
  assert.throws(() => mergeVerifiedOpenMeteoGenerations(latest, forged, options));
  assert.throws(() => backfillVerifiedOpenMeteoPartBank(latest, forged, options),
    /OPEN_METEO_PART_.*INVALID|OPEN_METEO.*RESPONSE/);
});

test('recovery preserves the selected hours of overlapping responses, independent of record order', () => {
  // The first response owns hour 1. A later, wider response only filled hour 0.
  // Replaying that wider response first must not replace the stored hour 1.
  const first = response('wind', [at(1)]);
  const wider = response('wind', [at(0), at(1), at(2)]);
  wider.hourly.wind_speed_10m = [7, 8, 9];
  const complete = mergeOpenMeteoPartBank(null, [admit('wind', first), admit('wind', wider)], options);
  const latest = mergeOpenMeteoPartBank(null, [], options);
  const recovered = mergeVerifiedOpenMeteoGenerations(latest, complete, options);
  assert.equal(selected(recovered, 'wind', at(0)).values.windSpeedMps, 7);
  assert.equal(selected(recovered, 'wind', at(1)).values.windSpeedMps, 4);
  assert.deepEqual(recovered.records, complete.records);
  const reverse = structuredClone(complete);
  reverse.records.reverse();
  const { bankSha256: _old, ...body } = reverse;
  reverse.bankSha256 = openMeteoPartSha256(body);
  assert.deepEqual(mergeVerifiedOpenMeteoGenerations(latest, reverse, options), recovered);
  // Original bytes can contain unselected hours; restore only retained records.
  const narrowed = structuredClone(complete);
  narrowed.records = narrowed.records.filter(record => record.validTime !== at(2));
  const { bankSha256: _narrowHash, ...narrowBody } = narrowed;
  narrowed.bankSha256 = openMeteoPartSha256(narrowBody);
  const subset = mergeVerifiedOpenMeteoGenerations(latest, narrowed, options);
  assert.equal(subset.records.length, 2);
  assert.equal(selected(subset, 'wind', at(2)), null);
});

test('wrong units and missing wave fields leave independent temperature and valid sibling times intact', () => {
  const document = response('wave');
  document.hourly.wave_direction[1] = null;
  document.hourly_units.sea_level_height_msl = 'cm';
  const bank = mergeOpenMeteoPartBank(null, marineAdmissions(document), options);
  assert.ok(selected(bank, 'wave'));
  assert.equal(selected(bank, 'wave', at(3)), null);
  assert.equal(selected(bank, 'waterLevel'), null);
  assert.ok(selected(bank, 'waterTemperature', at(3)));
  delete document.hourly.wave_peak_period;
  document.hourly.wave_period = [6, 6, 6];
  assert.equal(admit('wave', document).records.some(record => record.component === 'wave'), false);
});

test('a legacy level bank is retired component-wise without losing valid wave/SST originals', () => {
  const bank = mergeOpenMeteoPartBank(null, marineAdmissions(), options);
  const legacyRequest = { ...request('waterTemperature'), component: 'waterLevel', cellSelection: 'sea',
    query: { ...request('waterTemperature').query, hourly: 'sea_level_height_msl', cell_selection: 'sea' } };
  delete legacyRequest.requestSha256;
  legacyRequest.requestSha256 = openMeteoPartSha256(legacyRequest);
  const evidence = { request: legacyRequest, responseText: JSON.stringify(response('wave')), acquiredAt: reference };
  const evidenceId = openMeteoPartSha256(evidence);
  const old = { ...bank, records: [...bank.records, { recordId: 'b'.repeat(64), partId: part.partId,
    validTime: reference, component: 'waterLevel', values: { seaSurfaceHeightM: 0.2 }, evidenceId }],
  responses: { ...bank.responses, [evidenceId]: evidence } };
  delete old.bankSha256;
  old.bankSha256 = openMeteoPartSha256(old);
  assert.equal(selected(old, 'waterLevel'), null);
  assert.ok(selected(old, 'wave'));
  assert.deepEqual(mergeOpenMeteoPartBank(old, [], options), bank);
});

test('response-bound identity, exact axes and distance cannot be relabeled', () => {
  const wrongCell = { ...response('wind'), longitude: 11 };
  assert.equal(admit('wind', wrongCell).records.length, 0);
  const duplicate = response('wind', [reference, reference]);
  assert.throws(() => admit('wind', duplicate), /TIME_AXIS_INVALID/);
  const shifted = response('wind', ['2026-09-19T00:30:00.000Z']);
  assert.throws(() => admit('wind', shifted), /TIME_AXIS_INVALID/);
  assert.throws(() => readOpenMeteoPartResponse({ request: request('wind'),
    responseText: JSON.stringify(response('wind')), acquiredAt: reference },
  { part: { ...part, partId: 'OTHER' }, spatialPolicies }), /REQUEST_BINDING_INVALID/);
  assert.throws(() => readOpenMeteoPartResponse({ request: request('wind'),
    responseText: JSON.stringify(response('wind')), acquiredAt: reference }, { part }), /SPATIAL_POLICY_REQUIRED/);
});

test('bank checks original bytes, tuples, opaque admission and exact canonical request', () => {
  const original = mergeOpenMeteoPartBank(null, marineAdmissions(), options);
  const reseal = bank => { const { bankSha256: _old, ...content } = bank; bank.bankSha256 = openMeteoPartSha256(content); return bank; };
  const changed = structuredClone(original);
  changed.records[0].values = { waveHeightM: 999 };
  assert.throws(() => validateOpenMeteoPartBank(reseal(changed), options), /RECORD_INVALID/);
  const changedEvidence = structuredClone(original);
  Object.values(changedEvidence.responses)[0].responseText += ' ';
  assert.throws(() => validateOpenMeteoPartBank(reseal(changedEvidence), options), /EVIDENCE_INVALID/);
  const changedRequest = structuredClone(request('wind'));
  changedRequest.query.latitude = '55';
  assert.throws(() => readOpenMeteoPartResponse({ request: changedRequest,
    responseText: JSON.stringify(response('wind')), acquiredAt: reference }, { part, spatialPolicies }), /REQUEST_BINDING_INVALID/);
  assert.equal(selectedOpenMeteoPartRecord(new Map(), { part, component: 'wave', validTime: reference }), null);
  const index = validateOpenMeteoPartBank(original, options);
  const value = selectedOpenMeteoPartRecord(index, { part, component: 'wave', validTime: reference });
  value.values.waveHeightM = 999;
  assert.equal(selectedOpenMeteoPartRecord(index, { part, component: 'wave', validTime: reference }).values.waveHeightM, 1);
});

test('new incomplete acquisition retains valid old siblings and cannot claim a newer model', () => {
  const old = mergeOpenMeteoPartBank(null, marineAdmissions(), options);
  const fresh = response('wave', [reference, at(1)]);
  fresh.hourly.wave_height = [9, 2];
  fresh.hourly.sea_surface_temperature = [null, 16];
  const bank = mergeOpenMeteoPartBank(old, marineAdmissions(fresh, at(1)), options);
  assert.equal(selected(bank, 'wave').values.waveHeightM, 1);
  assert.equal(selected(bank, 'wave', at(1)).values.waveHeightM, 2);
  assert.equal(selected(bank, 'waterTemperature').values.waterTemperatureC, 15);
  const fallback = selected(bank, 'wave');
  const dmi = { source: { provider: 'dmi', modelRun: at(-100) } };
  const choice = selectQualifiedWeatherComponent([dmi, fallback], {
    component: 'wave', productionReferenceAt: reference, admit: candidate => candidate.source,
  });
  assert.equal(choice.candidate, dmi);
});

test('producer preserves successful sibling, checkpoints it and requests actual PART water point', async () => {
  let checkpoints = 0;
  const result = await produceOpenMeteoPartComponents({ ...options, productionReferenceAt: reference,
    fetchResponse: req => {
      assert.equal(req.query.longitude, String(part.waterPoint[0]));
      assert.equal(req.query.end_hour, at(120).slice(0, 16));
      if (req.channel === 'marine') throw new Error('synthetic marine failure');
      return { responseText: JSON.stringify(response('wind')), acquiredAt: reference };
    }, checkpoint: async bank => { checkpoints += 1; assert.equal(bank.records.length, checkpoints === 1 ? 0 : 3); },
  });
  assert.equal(result.summary.requests, 3);
  assert.equal(result.summary.failures.length, 2);
  assert.deepEqual(result.summary.componentWarnings, {});
  assert.equal(checkpoints, 2);
  assert.ok(selected(result.bank, 'wind'));
  assert.equal(selected(result.bank, 'wave'), null);
});

test('producer skips complete channels and defers safely on budget stop without erasing old data', async () => {
  const times = Array.from({ length: 121 }, (_, hour) => at(hour));
  const bank = mergeOpenMeteoPartBank(null, [admit('wind', response('wind', times))], options);
  const result = await produceOpenMeteoPartComponents({ ...options, productionReferenceAt: reference,
    previousBank: bank, shouldContinue: () => false,
    fetchResponse: () => { throw new Error('must not fetch'); },
  });
  assert.equal(result.summary.requests, 0);
  assert.equal(result.summary.deferred, 2);
  assert.equal(result.bank.bankSha256, bank.bankSha256);
});

test('exact residual only requests needed provider channel, and invalid residual cannot start transport', async () => {
  const calls = [];
  const input = { ...options, productionReferenceAt: reference,
    requiredPairs: [{ partId: part.partId, validTime: reference, component: 'wind' }],
    fetchResponse: req => { calls.push(req.component); return {
      responseText: JSON.stringify(response(req.component)), acquiredAt: reference,
    }; },
  };
  await produceOpenMeteoPartComponents(input);
  assert.deepEqual(calls, ['wind']);
  calls.length = 0;
  await produceOpenMeteoPartComponents({ ...input, requiredPairs: [] });
  assert.deepEqual(calls, []);
  await assert.rejects(produceOpenMeteoPartComponents({ ...input,
    requiredPairs: [{ partId: 'WRONG', validTime: reference, component: 'wind' }],
  }), /RESIDUAL_INVALID/);
  assert.deepEqual(calls, []);
  await assert.rejects(produceOpenMeteoPartComponents({ ...input, requiredPairs: undefined }), /RESIDUAL_INVALID/);
  assert.deepEqual(calls, []);
});

test('separate marine failures preserve wind/SST and two-request concurrency bound', async () => {
  let active = 0;
  let maxActive = 0;
  const result = await produceOpenMeteoPartComponents({ ...options, productionReferenceAt: reference,
    fetchResponse: async req => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      if (req.component === 'wave') throw new Error('synthetic wave-only failure');
      return { responseText: JSON.stringify(response(req.component)), acquiredAt: reference };
    },
  });
  assert.equal(maxActive, 2);
  assert.equal(result.summary.requests, 3);
  assert.equal(result.summary.failures.length, 1);
  assert.equal(result.summary.failures[0].component, 'wave');
  assert.equal(selected(result.bank, 'wave'), null);
  for (const component of ['wind', 'waterTemperature']) assert.ok(selected(result.bank, component));
});

test('locked validity interval prunes only outside history/horizon, never by acquisition time', () => {
  const old = mergeOpenMeteoPartBank(null, marineAdmissions(), options);
  const retained = mergeOpenMeteoPartBank(old, [], { ...options, retentionStartAt: reference, retentionEndAt: at(3) });
  assert.equal(retained.records.length, 4);
  assert.ok(selected(retained, 'wave'));
  assert.equal(selected(retained, 'wave').source.acquiredAt, reference);
  assert.equal(selected(retained, 'wave', at(120)), null);
  const empty = mergeOpenMeteoPartBank(old, [], { ...options, retentionStartAt: at(1), retentionEndAt: at(2) });
  assert.equal(empty.records.length, 0);
  assert.deepEqual(empty.responses, {});
  assert.throws(() => mergeOpenMeteoPartBank(old, [], { ...options, retentionStartAt: undefined }), /RETENTION_INTERVAL_REQUIRED/);
});

test('changed or removed central point drops only its old donors, preserving unchanged siblings', () => {
  const other = { ...part, partId: 'OTHER', waterPoint: [10.01, 56] };
  const otherDocument = { ...response('wind'), longitude: 10.01, latitude: 56 };
  const otherAdmission = readOpenMeteoPartResponse({
    request: buildOpenMeteoPartRequest(other, { component: 'wind', productionReferenceAt: reference }),
    responseText: JSON.stringify(otherDocument), acquiredAt: reference,
  }, { part: other, spatialPolicies });
  const old = mergeOpenMeteoPartBank(null, [admit('wind'), otherAdmission], { ...options, parts: [part, other] });
  const moved = { ...other, waterPoint: [10.02, 56] };
  const newOptions = { ...options, parts: [part, moved] };
  const retained = mergeOpenMeteoPartBank(old, [], newOptions);
  const index = validateOpenMeteoPartBank(retained, newOptions);
  assert.ok(selectedOpenMeteoPartRecord(index, { part, component: 'wind', validTime: reference }));
  assert.equal(selectedOpenMeteoPartRecord(index, { part: moved, component: 'wind', validTime: reference }), null);
  assert.equal(retained.records.length, 3);
  assert.equal(Object.keys(retained.responses).length, 1);
  assert.equal(mergeOpenMeteoPartBank(old, [], options).bankSha256, retained.bankSha256);
});

test('central parent reassignment overrides historical sourceZoneId and rebases only that target', () => {
  const unchanged = { ...part, partId: 'UNCHANGED', zoneId: 'ZONE' };
  const sibling = readOpenMeteoPartResponse({
    request: buildOpenMeteoPartRequest(unchanged, { component: 'wind', productionReferenceAt: reference }),
    responseText: JSON.stringify(response('wind')), acquiredAt: reference,
  }, { part: unchanged, spatialPolicies });
  const original = mergeOpenMeteoPartBank(null, [admit('wind'), sibling], { ...options, parts: [part, unchanged] });
  const reassigned = { ...part, zoneId: 'NEW-ZONE' };
  const req = buildOpenMeteoPartRequest(reassigned, { component: 'wind', productionReferenceAt: reference });
  assert.equal(req.identity.parentZoneId, 'NEW-ZONE');
  const rebasedOptions = { ...options, parts: [reassigned, unchanged] };
  const rebased = mergeOpenMeteoPartBank(original, [], rebasedOptions);
  const index = validateOpenMeteoPartBank(rebased, rebasedOptions);
  assert.equal(selectedOpenMeteoPartRecord(index, { part: reassigned, component: 'wind', validTime: reference }), null);
  assert.ok(selectedOpenMeteoPartRecord(index, { part: unchanged, component: 'wind', validTime: reference }));
  assert.equal(rebased.records.length, 3);
});

test('rotation advances after failed attempts so early unavailable PARTs do not starve later ones', async () => {
  const parts = [part, { ...part, partId: 'SECOND' }, { ...part, partId: 'THIRD' }];
  const requiredPairs = parts.map(target => ({ partId: target.partId, validTime: reference, component: 'wind' }));
  const attempted = [];
  const first = await produceOpenMeteoPartComponents({ ...options, parts, requiredPairs, productionReferenceAt: reference,
    shouldContinue: () => attempted.length === 0,
    fetchResponse: req => { attempted.push(req.identity.entityId); throw new Error('synthetic unavailable'); },
  });
  assert.equal(first.summary.lastAttemptedPartId, 'TEST');
  assert.deepEqual(attempted, ['PART::TEST']);
  attempted.length = 0;
  const next = await produceOpenMeteoPartComponents({ ...options, parts, requiredPairs, productionReferenceAt: reference,
    startAfterPartId: first.summary.lastAttemptedPartId, shouldContinue: () => attempted.length === 0,
    fetchResponse: req => { attempted.push(req.identity.entityId); throw new Error('synthetic unavailable'); },
  });
  assert.equal(next.summary.lastAttemptedPartId, 'SECOND');
  assert.deepEqual(attempted, ['PART::SECOND']);
});
