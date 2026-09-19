import assert from 'node:assert/strict';
import test from 'node:test';
import { enrichCurrentProvenanceDocuments } from './enrich-current-provenance.mjs';

test('current provenance enrichment is complete and idempotent before hour sealing', () => {
  const time = '2026-09-19T02:00:00.000Z';
  const point = [10, 56];
  const source = {
    provider: 'dmi',
    vectorSemanticsVersion: 3,
    verticalLayer: 'surface',
    verticalLayerRankM: 0,
    samplingPoint: point,
    vectorSelection: 'nearest-valid-original-grid-point',
    gridPoint: point,
    distanceKm: 0,
    collection: 'dkss_nsbs',
    modelRun: '2026-09-19T00:00:00.000Z',
  };
  const bulk = {
    currentVectorSemanticsVersion: 3,
    currentVectorSelection: source.vectorSelection,
    currentMaxDistanceKm: 5,
    zones: {
      z1: {
        samplingPoint: point,
        collections: { 'current-u': 'dkss_nsbs', 'current-v': 'dkss_nsbs' },
        gridPoints: {
          'wind-u-10m': { longitude: 10.01, latitude: 56.01 },
          'wind-v-10m': { longitude: 10.01, latitude: 56.01 },
          'significant-wave-height': { longitude: 10.02, latitude: 56.02 },
          'mean-wave-dir': { longitude: 10.02, latitude: 56.02 },
        },
        hourly: {
          [time]: { time, 'current-u': 0.1, 'current-v': 0.2, sources: { current: source } },
        },
      },
    },
  };
  const conditions = {
    generatedAt: time,
    productionReferenceAt: time,
    zones: {
      z1: {
        point,
        modelSteps: { ocean: time },
        current: { time, provider: 'dmi' },
        forecast: { hourly: [{ time, sources: { current: { provider: 'dmi' } } }] },
        samples24h: [], samples72h: [], history: {},
      },
    },
  };
  const forecast = { zones: { z1: { model: {}, hourly: [
    { time, sources: { current: { provider: 'dmi' } } },
  ] } } };
  const first = enrichCurrentProvenanceDocuments({ conditions, bulk, forecast });
  assert.equal(first.skipped, false);
  assert.equal(first.verifiedHours, 1);
  assert.equal(conditions.zones.z1.current.currentProvenance.status, 'verified');
  const sealedZones = JSON.stringify(conditions.zones);
  const sealedForecast = JSON.stringify(forecast);
  const second = enrichCurrentProvenanceDocuments({ conditions, bulk, forecast });
  assert.equal(second.skipped, false);
  assert.equal(JSON.stringify(conditions.zones), sealedZones);
  assert.equal(JSON.stringify(forecast), sealedForecast);
});
