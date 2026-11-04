import assert from 'node:assert/strict';
import test from 'node:test';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES as policies, buildOpenMeteoPartRequest,
  openMeteoComponentRequestParts, openMeteoComponentGridMatches, openMeteoMfNearestGridPoint,
  readOpenMeteoPartResponse, mergeOpenMeteoPartBank, validateOpenMeteoPartBank,
  selectedOpenMeteoPartRecord, readRetainedOpenMeteoPartIndex, openMeteoPartSha256 } from './lib/open-meteo-part-bank.mjs';
import { openMeteoO1280NearestGridPoint } from './lib/open-meteo-o1280-grid.mjs';
import { produceOpenMeteoPartComponents } from './produce-open-meteo-part-components.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = hour => new Date(Date.parse(reference) + hour * 3600000).toISOString();
const part = { partId: 'SYNTHETIC', zoneId: 'DK-B05-11', waterPoint: [10.03, 56.02], onshoreDirectionDeg: 90 };
const options = { parts: [part], spatialPolicies: policies, retentionStartAt: at(-48), retentionEndAt: at(120) };
const components = ['wind', 'wave', 'waterTemperature'];
const request = component => buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference, spatialPolicy: policies[component] });
function response(component) {
  const point = component === 'waterTemperature' ? openMeteoMfNearestGridPoint(part.waterPoint) : openMeteoO1280NearestGridPoint(part.waterPoint);
  const hourly = { time: [reference, at(120)] };
  const units = {};
  const fields = component === 'wind' ? { wind_speed_10m: [4, 'm/s'], wind_direction_10m: [90, '°'] }
    : component === 'wave' ? { wave_height: [1, 'm'], wave_peak_period: [6, 's'], wave_direction: [180, '°'] }
      : { sea_surface_temperature: [15, '°C'] };
  for (const [field, [value, unit]] of Object.entries(fields)) { hourly[field] = [value, value]; units[field] = unit; }
  return { longitude: point[0], latitude: point[1], utc_offset_seconds: 0, hourly, hourly_units: units };
}
const admit = (component, document = response(component), req = request(component)) => readOpenMeteoPartResponse({
  request: req, responseText: JSON.stringify(document), acquiredAt: reference,
}, { part, spatialPolicies: policies });

test('explicit native policies bind one product and exact returned center without a distance radius', () => {
  for (const component of components) {
    const req = request(component), document = response(component);
    assert.equal(req.contractId, 'open-meteo-part-component-request-v3');
    assert.equal(req.query.models, policies[component].model);
    assert.equal(req.query.cell_selection, 'nearest');
    assert.equal(Object.hasOwn(req.spatialPolicy, 'maximumDistanceKm'), false);
    assert.equal(openMeteoComponentRequestParts(component, { spatialPolicy: policies[component] }).query.models, req.query.models);
    assert.ok(openMeteoComponentGridMatches(component, part.waterPoint, [document.longitude, document.latitude], policies[component]));
    const records = admit(component).records;
    assert.equal(records.length, 2);
    assert.equal(records[0].source.modelRun, null);
    assert.equal(records[0].source.modelReference, null);
    assert.equal(records[0].source.supplierInterpolationPossible, true);
    assert.equal(records[0].source.nativeTimeExact, false, 'Hourly API response does not prove native hourly forecast or history');
    assert.equal(records[0].source.calibrationEligible, false);
  }
  assert.equal(request('wave').query.models, 'ecmwf_wam');
  assert.equal(request('wind').query.models, 'ecmwf_ifs');
});

test('nearby/sea/025 cells and rewritten model or native policy cannot qualify', () => {
  for (const component of components) {
    const moved = response(component);
    moved.longitude += 0.001;
    assert.throws(() => admit(component, moved), /NATIVE_RESPONSE_GRID_MISMATCH/);
    assert.throws(() => buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference,
      spatialPolicy: policies[component], cellSelection: 'sea' }), /CELL_SELECTION_INVALID/);
    assert.throws(() => buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference,
      spatialPolicy: { ...policies[component], maximumDistanceKm: 40 } }), /NATIVE_POLICY_INVALID/);
  }
  const rewritten = request('wave');
  rewritten.query.models = 'best_match';
  const { requestSha256: _hash, ...body } = rewritten;
  rewritten.requestSha256 = openMeteoPartSha256(body);
  assert.throws(() => admit('wave', response('wave'), rewritten), /REQUEST_BINDING_INVALID/);
});

test('native qualified source reaches actual PART adapter; missing level stays missing', () => {
  const bank = mergeOpenMeteoPartBank(null, components.map(component => admit(component)), options);
  const inputs = { productionReferenceAt: reference, openMeteoComponentIndex: validateOpenMeteoPartBank(bank, options) };
  const [row] = verifiedIntegratedPartHourly({ hourly: [{ time: reference }] }, {}, `PART::${part.partId}`, part, inputs);
  assert.equal(row.windSpeedMps, 4);
  assert.equal(row.wavePeriodS, 6);
  assert.equal(row.waterTemperatureC, 15);
  assert.equal(row.waterLevelCm, null);
  const planningIndex = readRetainedOpenMeteoPartIndex(bank, options);
  const [scalar] = verifiedIntegratedPartHourly({ hourly: [{ time: reference }] }, {},
    `PART::${part.partId}`, part, {
      ...inputs, openMeteoComponentIndex: planningIndex, scalarPlanningOnly: true,
    });
  for (const key of ['windSpeedMps', 'windDirectionDeg', 'windProvenance',
    'waterTemperatureC', 'waterTemperatureProvenance', 'waterLevelCm']) {
    assert.deepEqual(scalar[key], row[key]);
  }
  assert.equal(scalar.waveHeightM, null);
  const view = { part, component: 'wind', validTime: reference };
  const expected = selectedOpenMeteoPartRecord(planningIndex, view);
  selectedOpenMeteoPartRecord(planningIndex, view).source.samplingPoint[0] += 1;
  const originalWind = Object.values(bank.responses).find(evidence => evidence.request.component === 'wind');
  originalWind.request.identity.samplingPoint[0] += 1;
  assert.deepEqual(selectedOpenMeteoPartRecord(planningIndex, view), expected);
  originalWind.request.identity.samplingPoint[0] = expected.source.samplingPoint[0];
  for (const component of components) {
    for (const validTime of [reference, at(120)]) {
      const query = { part, component, validTime };
      assert.deepEqual(selectedOpenMeteoPartRecord(planningIndex, query),
        selectedOpenMeteoPartRecord(inputs.openMeteoComponentIndex, query));
    }
  }
  assert.equal(row.windProvenance.model, 'ecmwf_ifs');
  assert.equal(row.waveProvenance.model, 'ecmwf_wam');
  assert.equal(row.waveProvenance.nativeTimeExact, false);
  assert.deepEqual(row.waveProvenance.gridPoint, openMeteoO1280NearestGridPoint(part.waterPoint));
});

test('native producer excludes unqualified level and retains valid siblings across a null wave response', async () => {
  const calls = [];
  const result = await produceOpenMeteoPartComponents({ ...options, productionReferenceAt: reference,
    requiredPairs: [...components, 'waterLevel'].map(component => ({ partId: part.partId, validTime: reference, component })),
    fetchResponse: async req => {
      calls.push(req);
      const document = response(req.component);
      if (req.component === 'wave') document.hourly.wave_height = [null, null];
      return { responseText: JSON.stringify(document), acquiredAt: reference };
    },
  });
  assert.equal(result.summary.requests, 3);
  assert.equal(result.summary.componentsNotAdmitted, 0, 'DMI-only level is not pending admission');
  assert.equal(calls.some(req => req.component === 'waterLevel'), false);
  assert.ok(calls.every(req => req.contractId === 'open-meteo-part-component-request-v3'));
  const index = validateOpenMeteoPartBank(result.bank, options);
  assert.equal(selectedOpenMeteoPartRecord(index, { part, validTime: reference, component: 'wave' }), null);
  assert.equal(selectedOpenMeteoPartRecord(index, { part, validTime: reference, component: 'wind' }).values.windSpeedMps, 4);
});

test('old distance-qualified bank keeps original v2 source and is never relabeled as native', () => {
  const oldPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature']
    .map(component => [component, { policyId: 'synthetic-exact-point', maximumDistanceKm: 0,
      ...(component === 'waterTemperature' ? { cellSelection: 'nearest' } : {}) }]));
  oldPolicies.wind.cellSelection = { legacySelection: 'sea' };
  const req = buildOpenMeteoPartRequest(part, { component: 'wind', productionReferenceAt: reference });
  const document = response('wind');
  [document.longitude, document.latitude] = part.waterPoint;
  const oldAdmission = readOpenMeteoPartResponse({ request: req, responseText: JSON.stringify(document), acquiredAt: reference },
    { part, spatialPolicies: oldPolicies });
  const oldOptions = { ...options, spatialPolicies: oldPolicies };
  const oldBank = mergeOpenMeteoPartBank(null, [oldAdmission], oldOptions);
  assert.equal(selectedOpenMeteoPartRecord(validateOpenMeteoPartBank(oldBank, oldOptions),
    { part, validTime: reference, component: 'wind' }).source.model, 'ecmwf_ifs025');
  assert.deepEqual(mergeOpenMeteoPartBank(oldBank, [], oldOptions), oldBank);
  assert.throws(() => validateOpenMeteoPartBank(oldBank, options), /POLICY_CONTRACT_MISMATCH/);
  assert.throws(() => mergeOpenMeteoPartBank(oldBank, [], options), /POLICY_CONTRACT_MISMATCH/);
  assert.throws(() => openMeteoComponentRequestParts('waterLevel', { spatialPolicy: policies.waterLevel }), /DMI_ONLY/);
  const previousIndex = validateOpenMeteoPartBank(oldBank, oldOptions);
  const planningIndex = readRetainedOpenMeteoPartIndex(oldBank, oldOptions);
  const lookup = { part, validTime: reference, component: 'wind' };
  const original = selectedOpenMeteoPartRecord(previousIndex, lookup);
  oldPolicies.wind.cellSelection.legacySelection = 'caller-edited';
  assert.deepEqual(selectedOpenMeteoPartRecord(previousIndex, lookup), original);
  assert.deepEqual(selectedOpenMeteoPartRecord(planningIndex, lookup), original);
});
