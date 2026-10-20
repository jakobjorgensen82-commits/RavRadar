import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import { prepareTripWeatherAggregate } from '../cloudflare/trip-gateway/trip-aggregate.js';
import { readTripWeatherAggregate } from './lib/trip-weather-aggregate-client.mjs';
import { AGGREGATE_PATH, AGGREGATE_LIMITS, previousClosedAggregateMonth, aggregateWithheldReport }
  from '../supabase/functions/_shared/trip-aggregate-contract.js';
import { createCalibrationFeatureSnapshot } from '../js/services/trip-evidence-contract.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { canonicalJson, externalOwnerSubject, externalTripRecord, sha256Hex, tripGatewaySignature }
  from '../supabase/functions/_shared/trip-storage.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KEY = 'synthetic-shared-key-for-aggregate-normal-test-only-0000';
const PSEUDONYM = 'synthetic-pseudonym-for-aggregate-normal-test-only-0000';
const SERVICE = 'synthetic-service-key-for-aggregate-normal-test-only-0000';
const BASE = 'https://afqhhdrkjfjtpadntdzo.supabase.co';
const GATEWAY = 'https://ravradar-trip-gateway.example.workers.dev';
const binding = ravScoreModelBinding();
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const month = previousClosedAggregateMonth();
const day = n => month.start.slice(0, 8) + String(n).padStart(2, '0');
const featureInput = {
  modelVersion: binding.modelId, modelBinding: binding, appVersion: '4.0.578', totalScore: 63,
  scoreBoundLower: 63, scoreBoundUpper: 63, scoreBoundModelUncertaintyPoints: 0,
  scoreBoundRawLower: 63, scoreBoundRawUpper: 63, historyCoverageHours: 48,
  scoreQuality: 'FULL_HISTORY', scoreSemantics: 'EXACT_POINT_SCORE', scoreCalibrationEligible: true,
  conservativeTailResetApplied: false, historyReasonCodes: [], huntabilityScore: 70,
  transportScore: 60, mobilisationScore: 58, windSpeedMs: 3, windDirectionDeg: 270,
  waveHeightM: .3, wavePeriodS: 6, waveDirectionDeg: 280, currentSpeedMs: .2,
  currentDirectionDeg: 260, waterLevelM: .05, waterLevelTrendM3h: 0,
  maxWaveHeight24hM: 1, hoursSinceEnergyPeak: 3, sustainedOnshoreHours: 4, reasonCodes: [],
};
function payload(n, changes = {}) {
  const features = createCalibrationFeatureSnapshot({ ...featureInput, ...(changes.featureInput ?? {}) });
  const issued = day(15) + 'T10:00:00.000Z', captured = day(15) + 'T11:00:00.000Z', valid = day(15) + 'T12:00:00.000Z';
  const row = { client_observation_id: uuid(n), trip_id: uuid(n + 10000), schema_version: 3,
    data_quality_flags: [], actual_zone_id: 'DK-B01-01', forecast_zone_id: 'DK-B01-01',
    actual_coastal_part_id: 'DK-B01-01-P01', forecast_coastal_part_id: 'DK-B01-01-P01',
    observed_at: day(15) + 'T11:30:00.000Z', trip_started_at: captured, trip_ended_at: valid,
    submitted_at: valid, search_minutes: 60, search_coverage: 'normal', hunt_mode: 'beach',
    calibration_eligible: true, found: n % 2 === 0, result: n % 2 === 0 ? 'good' : 'none',
    grams: n % 2 === 0 ? 4 : null, model_version: binding.modelId, rav_score: 63,
    forecast_snapshot_id: 'rr-synthetic-only-' + n, forecast_issued_at: issued,
    forecast_valid_at: valid, forecast_captured_at: captured, calibration_features: features,
    weather_snapshot: { schemaVersion: 4, capturedAt: captured, forecastSnapshotId: 'rr-synthetic-only-' + n,
      forecastIssuedAt: issued, forecastValidAt: valid, calibrationFeatures: structuredClone(features) },
    water_level_cm: 5, wind_speed_mps: 3, wind_direction_deg: 270, wave_height_m: .3,
    wave_period_s: 6, current_speed_mps: .2, current_direction_deg: 260 };
  const { featureInput: ignored, ...rest } = changes;
  return { ...row, ...rest };
}


export {payload as createSyntheticTripPayload};
