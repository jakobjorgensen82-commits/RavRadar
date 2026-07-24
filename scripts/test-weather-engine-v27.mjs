import assert from 'node:assert/strict';
import {
  clearWeatherCache,
  getWaterLevel,
  getWeatherDiagnostics,
  getWeatherControlCenter,
  getWeatherHealth,
  getWeatherSourceDecision,
  calculateWaterLevelScore
} from '../dmi.js';

const originalFetch = globalThis.fetch;

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

try {
  clearWeatherCache();
  globalThis.RAVRADAR_WEATHER_CONFIG = {
    dmiWaterLevelUrl: 'https://example.test/dmi',
    openMeteoMarineUrl: 'https://example.test/open-meteo',
    metNorwayUrl: 'https://example.test/met',
    retries: 0,
    timeoutMs: 500
  };

  // DMI succeeds and is selected first.
  globalThis.fetch = async url => {
    assert.match(String(url), /example\.test\/dmi/);
    return jsonResponse({ forecast: [{ time: '2026-01-01T00:00:00Z', levelCm: 17 }] });
  };
  const dmi = await getWaterLevel(56.1, 10.2, { forceRefresh: true });
  assert.equal(dmi.source, 'dmi-live');
  assert.equal(dmi.provider, 'dmi');
  assert.equal(dmi.forecast[0].levelCm, 17);

  // Fresh cache is used without another request.
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not be called'); };
  const cached = await getWaterLevel(56.1, 10.2);
  assert.equal(cached.source, 'cache');
  assert.equal(called, false);

  // DMI failure routes to Open-Meteo Marine.
  clearWeatherCache();
  globalThis.fetch = async url => {
    if (String(url).includes('/dmi')) return jsonResponse({}, 503);
    if (String(url).includes('/open-meteo')) {
      return jsonResponse({ hourly: { time: ['2026-01-01T00:00'], sea_level_height_msl: [0.23] } });
    }
    throw new Error('unexpected provider');
  };
  const openMeteo = await getWaterLevel(57.0, 9.9, { forceRefresh: true });
  assert.equal(openMeteo.source, 'open-meteo-live');
  assert.equal(openMeteo.forecast[0].levelCm, 23);
  assert.deepEqual(getWeatherControlCenter().attemptedSources, ['dmi', 'open-meteo']);

  // All live providers fail: synthetic fallback remains backwards compatible.
  clearWeatherCache();
  globalThis.fetch = async () => jsonResponse({}, 503);
  const fallback = await getWaterLevel(55.5, 11.5, { forceRefresh: true });
  assert.equal(fallback.status, 'ok');
  assert.equal(fallback.source, 'fallback-model');
  assert.equal(fallback.forecast.length, 120);
  assert.ok(Number.isFinite(calculateWaterLevelScore(fallback)));

  const diagnostics = await getWeatherDiagnostics(55.5, 11.5);
  assert.equal(diagnostics.version, '2.7.0');
  assert.ok(diagnostics.controlCenter);
  assert.ok(diagnostics.completeness >= 0 && diagnostics.completeness <= 100);
  assert.ok(Object.keys(getWeatherHealth().providers).length >= 3);

  const control = getWeatherControlCenter();
  assert.ok(['cache', 'fallback', 'live', 'error'].includes(control.status));
  assert.ok(control.quality.score >= 0 && control.quality.score <= 100);
  assert.ok(Array.isArray(control.attemptedSources));
  const decision = getWeatherSourceDecision(control);
  assert.ok(['live', 'cache', 'fallback'].includes(decision.source));

  console.log('Weather Engine 2.7 provider routing, cache, diagnostics and failover bestået.');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.RAVRADAR_WEATHER_CONFIG;
  clearWeatherCache();
}
