import assert from 'node:assert/strict';
import {
  clearWeatherCache,
  getWaterLevel,
  getWeatherDiagnostics,
  getWeatherControlCenter,
  calculateWaterLevelScore
} from '../dmi.js';

clearWeatherCache();
delete globalThis.RAVRADAR_WEATHER_CONFIG;

const fallback = await getWaterLevel(56.1, 10.2, { forceRefresh: true });
assert.equal(fallback.status, 'ok');
assert.equal(fallback.source, 'fallback-model');
assert.equal(fallback.forecast.length, 120);
assert.ok(Number.isFinite(calculateWaterLevelScore(fallback)));

const diagnostics = await getWeatherDiagnostics(56.1, 10.2);
assert.equal(diagnostics.version, '2.7.0');
assert.ok(['cache', 'fallback-model'].includes(diagnostics.source));
assert.ok(diagnostics.controlCenter);

const control = getWeatherControlCenter();
assert.ok(['cache', 'fallback', 'live', 'error'].includes(control.status));
assert.ok(control.quality.score >= 0 && control.quality.score <= 100);
assert.ok(Array.isArray(control.attemptedSources));

console.log('Weather Engine 2.7 Sprint 5 bestået.');
