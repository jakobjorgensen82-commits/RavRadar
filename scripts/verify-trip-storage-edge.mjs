import { PUBLIC_CONFIG } from '../config.js';
import { createBoundedFetch } from './lib/bounded-fetch.mjs';
import {
  TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,
  TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,
  TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
  runTripStorageNoWriteContractProbe,
  waitForTripStorageEdgeReadiness,
} from './lib/trip-storage-edge-readiness.mjs';

const baseUrl = (process.env.SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl || '').replace(/\/$/, '');
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_CONFIG.supabasePublishableKey || '';
const expectedStorageMode = String(process.env.EXPECTED_TRIP_STORAGE_MODE || '').trim().toLowerCase();
const sharedSecret = process.env.TRIP_GATEWAY_SHARED_SECRET || '';
const fetchWithDeadline = createBoundedFetch({ timeoutMs: TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS });
if (!baseUrl || !publishableKey) throw new Error('Edge-verifikationens offentlige konfiguration mangler.');
if (!['d1', 'supabase', 'maintenance'].includes(expectedStorageMode)) {
  throw new Error('Edge-verifikationen kræver EXPECTED_TRIP_STORAGE_MODE=d1|supabase|maintenance.');
}

async function invoke(functionName, { origin, method = 'POST', body = '{}' } = {}) {
  const url = new URL(`${baseUrl}/functions/v1/${functionName}`);
  if (method === 'OPTIONS') url.searchParams.set('_rr_trip_attestation', crypto.randomUUID());
  return fetchWithDeadline(url, {
    method,
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      origin,
      ...(method === 'OPTIONS' ? { 'cache-control': 'no-cache, no-store', pragma: 'no-cache' } : {}),
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'OPTIONS' ? { cache: 'no-store' } : {}),
    ...(method === 'POST' ? { body } : {}),
  });
}

async function invokeNoWriteContractProbe(functionName, origin, probeKind, probeName, assertContract) {
  return runTripStorageNoWriteContractProbe({
    baseUrl,
    publishableKey,
    sharedSecret,
    functionName,
    origin,
    probeKind,
    probeName,
    assertContract,
    fetchTimeoutMs: TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,
  });
}

const readiness = await waitForTripStorageEdgeReadiness({
  baseUrl,
  publishableKey,
  expectedStorageMode,
  fetchTimeoutMs: TRIP_STORAGE_EDGE_FETCH_TIMEOUT_MS,
});
if (!readiness.ok) {
  throw new Error(`Begge levende Edge-funktioner er ikke eksakt 4.0.311/${expectedStorageMode} efter afgrænset udbredelsesventetid.`);
}

for (const functionName of ['submit-observation', 'trip-log']) {
  await invokeNoWriteContractProbe(
    functionName,
    'https://ravradar.dk',
    TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
    `${functionName}-allowed-preflight`,
    response => response.status === 204
      && response.headers.get('access-control-allow-origin') === 'https://ravradar.dk'
      && response.headers.get('x-ravradar-trip-contract-version') === '4.0.311'
      && response.headers.get('x-ravradar-trip-storage-mode') === expectedStorageMode,
  );
  await invokeNoWriteContractProbe(
    functionName,
    'https://example.invalid',
    TRIP_STORAGE_EDGE_PREFLIGHT_PROBE_KIND,
    `${functionName}-foreign-preflight`,
    response => response.status === 403
      && !response.headers.get('access-control-allow-origin'),
  );
}

await invokeNoWriteContractProbe(
  'trip-log',
  'https://ravradar.dk',
  TRIP_STORAGE_EDGE_SIGNED_LOGIN_PROBE_KIND,
  'trip-log-signed-login-response',
  async response => {
    if (response.status !== 401) return false;
    const body = await response.json().catch(() => null);
    return body?.error === 'LOGIN_REQUIRED'
      && Object.keys(body).length === 1
      && response.headers.get('x-ravradar-trip-contract-version') === '4.0.311'
      && response.headers.get('x-ravradar-trip-storage-mode') === expectedStorageMode;
  },
);

const invalidObservation = await invoke('submit-observation', { origin: 'https://ravradar.dk' });
if (invalidObservation.status !== 400) throw new Error(`Observationens feltgate svarede uventet (${invalidObservation.status}).`);

const tripQualityBase = {
  schema_version: 2,
  trip_id: '11111111-1111-4111-8111-111111111111',
  client_observation_id: '22222222-2222-4222-8222-222222222222',
  anonymous_id: '33333333-3333-4333-8333-333333333333',
  trip_started_at: '2026-08-29T08:00:00.000Z',
  trip_ended_at: '2026-08-29T09:00:00.000Z',
  observed_at: '2026-08-29T08:30:00.000Z',
  submitted_at: '2026-08-29T09:00:01.000Z',
  search_minutes: 60,
  search_coverage: 'normal',
  hunt_mode: 'beach',
  result: 'none',
  found: false,
  grams: null,
  actual_zone_id: 'DK-B01-01',
  actual_coastal_part_id: 'DK-B01-01-P01',
  forecast_zone_id: 'DK-B01-01',
  forecast_coastal_part_id: 'DK-B01-01-P01',
  forecast_snapshot_id: 'rr-contract-verification-210',
  forecast_issued_at: '2026-08-29T07:00:00.000Z',
  forecast_valid_at: '2026-08-29T08:00:00.000Z',
  forecast_captured_at: '2026-08-29T08:00:00.000Z',
  calibration_features: {
    totalScore: 50,
    huntabilityScore: 50,
    transportScore: 50,
    mobilisationScore: 50,
    reasonCodes: ['ravscore-reconstructed-derived-evidence'],
  },
  data_quality_flags: ['ravscore-reconstructed-derived-evidence'],
};

const calibrationLeak = await invoke('submit-observation', {
  origin: 'https://ravradar.dk',
  body: JSON.stringify({ ...tripQualityBase, calibration_eligible: true }),
});
const calibrationLeakBody = await calibrationLeak.json().catch(() => ({}));
if (calibrationLeak.status !== 400 || calibrationLeakBody?.error !== 'TRIP_CALIBRATION_ELIGIBILITY_INVALID') {
  throw new Error('Edge-gaten afviste ikke rekonstrueret evidens med calibration_eligible=true entydigt.');
}

const unattestedCalibrationLeak = await invoke('submit-observation', {
  origin: 'https://ravradar.dk',
  body: JSON.stringify({
    ...tripQualityBase,
    calibration_eligible: true,
    data_quality_flags: ['ravscore-evidence-trust-unattested'],
    calibration_features: {
      ...tripQualityBase.calibration_features,
      reasonCodes: ['ravscore-evidence-trust-unattested'],
    },
  }),
});
const unattestedCalibrationLeakBody = await unattestedCalibrationLeak.json().catch(() => ({}));
if (unattestedCalibrationLeak.status !== 400
  || unattestedCalibrationLeakBody?.error !== 'TRIP_CALIBRATION_ELIGIBILITY_INVALID') {
  throw new Error('Edge-gaten afviste ikke uattesteret legacy-evidens med calibration_eligible=true entydigt.');
}

const reversedQualityOrder = await invoke('submit-observation', {
  origin: 'https://ravradar.dk',
  body: JSON.stringify({
    ...tripQualityBase,
    calibration_eligible: false,
    data_quality_flags: ['ravscore-reconstructed-derived-evidence', 'public-emergency-last-complete'],
    calibration_features: {
      ...tripQualityBase.calibration_features,
      reasonCodes: ['ravscore-reconstructed-derived-evidence', 'public-emergency-last-complete'],
    },
  }),
});
const reversedQualityOrderBody = await reversedQualityOrder.json().catch(() => ({}));
if (reversedQualityOrder.status !== 400 || reversedQualityOrderBody?.error !== 'TRIP_DATA_QUALITY_FLAGS_INVALID') {
  throw new Error('Edge-gaten afviste ikke den ikke-kanoniske kvalitetsrækkefølge entydigt.');
}

console.log(`Edge-verifikation: CORS, live ${expectedStorageMode}-mode, 4.0.311-kontrakt, loginbeskyttet turlog, kvalitetsbinding og observationsvalidering er grønne uden at oprette data.`);
