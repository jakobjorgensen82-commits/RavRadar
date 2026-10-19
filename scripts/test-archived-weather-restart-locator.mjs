import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeArchivedWeatherRestartOriginalIdentity as summarize,
  prepareArchivedWeatherRestart, loadArchivedWeatherRestartInputViewForTarget,
  ARCHIVED_WEATHER_RESTART_CONTEXT_ENV } from './archived-weather-restart.mjs';

test('normal locator identity stays small with a checkpoint exceeding the locator bound', () => {
  const payload = { data: 'x'.repeat(5 * 1024 * 1024), nested: { z: 1, a: 2 } };
  const state = { pointer: { document_key: 'ravscore-private-production-runtime-pointer', version: 11,
    payload: { current: { generation: 'SYNTHETIC_IDENTITY_ONLY', bytes: 123 } } },
  checkpoint: { document_key: 'ravscore-continuation-checkpoint', version: 7, payload } };
  const before = JSON.stringify(state);
  assert(Buffer.byteLength(JSON.stringify(state.checkpoint)) > 4 * 1024 * 1024);
  const identity = summarize(state);
  assert(Buffer.byteLength(JSON.stringify(identity)) < 1024);
  assert.deepEqual(Object.keys(identity).sort(), ['checkpoint', 'pointer']);
  for (const value of Object.values(identity)) {
    assert.deepEqual(Object.keys(value).sort(), ['documentKey', 'payloadSha256', 'version']);
    assert.match(value.payloadSha256, /^[a-f0-9]{64}$/);
    assert.equal(Object.hasOwn(value, 'payload'), false);
  }
  assert.equal(JSON.stringify(state), before, 'The whole original remains unchanged.');
  assert.deepEqual(summarize({ ...state, checkpoint: { ...state.checkpoint,
    payload: { nested: { a: 2, z: 1 }, data: payload.data } } }), identity,
  'JSONB member order is not a change of the complete values.');
  assert.notEqual(summarize({ ...state, checkpoint: { ...state.checkpoint,
    payload: { ...payload, data: payload.data.slice(0, -1) + 'y' } } }).checkpoint.payloadSha256,
  identity.checkpoint.payloadSha256, 'Even the final byte is bound.');
  assert.notDeepEqual(summarize({ ...state, checkpoint: { ...state.checkpoint, version: 8 } }), identity);
});

test('normal prepare rejects bad option shape before paths, writes or transport', async t => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('NO_TRANSPORT_FOR_BAD_LOCATOR_OPTIONS'); };
  t.after(() => { globalThis.fetch = previous; assert.equal(calls, 0); });
  for (const options of [undefined, null, {}, { workRoot: 'not-a-path', publicRoot: 'not-a-path',
    targetReferenceAt: '2026-10-19T00:00:00.000Z', passed: true }])
    await assert.rejects(prepareArchivedWeatherRestart(options), /ARCHIVED_WEATHER_RESTART_ARGUMENTS/);
});

test('ordinary absent locator is unchanged; partial and bad-digest locators fail before transport', async t => {
  const keys = [ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.path, ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.sha256,
    'RAVRADAR_WEATHER_CACHE_ONLY'];
  const original = new Map(keys.map(key => [key, process.env[key]]));
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('NO_TRANSPORT_FOR_BAD_LOCATOR'); };
  t.after(() => {
    globalThis.fetch = previous;
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    assert.equal(calls, 0);
  });
  for (const key of keys) delete process.env[key];
  const options = { registry: {}, targetReferenceAt: '2026-10-19T00:00:00.000Z' };
  assert.equal(await loadArchivedWeatherRestartInputViewForTarget(options), null);
  process.env.RAVRADAR_WEATHER_CACHE_ONLY = 'true';
  process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.path] = 'NEVER_READ';
  await assert.rejects(loadArchivedWeatherRestartInputViewForTarget(options), /ARCHIVED_WEATHER_RESTART_CONTEXT_ENV/);
  process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.sha256] = 'not-a-sha';
  await assert.rejects(loadArchivedWeatherRestartInputViewForTarget(options), /ARCHIVED_WEATHER_RESTART_CONTEXT_ARGUMENTS/);
});
