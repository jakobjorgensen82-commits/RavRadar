import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { loadOpenMeteoPartRuntime, runOpenMeteoPartRuntime } from './lib/open-meteo-part-runtime.mjs';
import { OPEN_METEO_PART_RESPONSE_MAX_BYTES, selectedOpenMeteoPartRecord,
  buildOpenMeteoPartRequest, readOpenMeteoPartResponse, mergeOpenMeteoPartBank } from './lib/open-meteo-part-bank.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = hour => new Date(Date.parse(reference) + hour * 3_600_000).toISOString();
const part = { partId: 'TEST', zoneId: 'ZONE', sourceZoneId: 'HISTORICAL', waterPoint: [10, 56] };
const spatialPolicies = Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature'].map(component => [
  component, { policyId: 'synthetic-exact-cell-only', maximumDistanceKm: 0,
    ...(component === 'waterTemperature' ? { cellSelection: 'nearest' } : {}) },
]));
const responseText = `${JSON.stringify({ longitude: 10, latitude: 56, utc_offset_seconds: 0,
  hourly: { time: [reference], wind_speed_10m: [4], wind_direction_10m: [90] },
  hourly_units: { wind_speed_10m: 'm/s', wind_direction_10m: '°' },
})}\n`;
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-om-part-runtime-'));
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('rr-om-part-runtime-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  return { privateCacheRoot: path.join(directory, '.cache'), bankPath: path.join(directory, '.cache', 'part-bank.json'),
    parts: [part], productionReferenceAt: reference, spatialPolicies,
    requiredPairs: [{ partId: part.partId, validTime: reference, component: 'wind' }],
    retentionStartAt: at(-48), retentionEndAt: at(120), budgetMs: 3000,
    requestTimeoutMs: 500, maxRetries: 2, now: () => Date.parse(reference) };
}
const selected = index => selectedOpenMeteoPartRecord(index, { part, component: 'wind', validTime: reference });

test('read-only runtime rejects a legacy false fill without disk mutation; ordinary retry repairs only that slot', async t => {
  const input = await fixture(t);
  const waveResponse = period => JSON.stringify({ longitude: 10, latitude: 56, utc_offset_seconds: 0,
    hourly: { time: [reference], wave_height: [1], wave_peak_period: [period], wave_direction: [180] },
    hourly_units: { wave_height: 'm', wave_peak_period: 's', wave_direction: '°' } });
  const admissions = [['wave', waveResponse(0.04)], ['wind', responseText]].map(([component, text]) =>
    readOpenMeteoPartResponse({ request: buildOpenMeteoPartRequest(part, { component, productionReferenceAt: reference }),
      responseText: text, acquiredAt: reference }, { part, spatialPolicies }));
  const legacy = mergeOpenMeteoPartBank(null, admissions, input);
  assert.equal(legacy.records.length, 2, 'the unchanged parser reproduces the original boundary mismatch');
  const originalText = JSON.stringify(legacy);
  await fs.mkdir(input.privateCacheRoot, { recursive: true });
  await fs.writeFile(input.bankPath, originalText);
  const loaded = await loadOpenMeteoPartRuntime(input);
  assert.equal(selectedOpenMeteoPartRecord(loaded.index, { part, component: 'wave', validTime: reference }), null);
  assert.equal(selected(loaded.index).values.windSpeedMps, 4);
  assert.equal(await fs.readFile(input.bankPath, 'utf8'), originalText, 'read-only verification never overwrites production evidence');
  let requests = 0;
  const repaired = await runOpenMeteoPartRuntime({ ...input,
    requiredPairs: [{ partId: part.partId, component: 'wave', validTime: reference }],
    fetchImpl: async rawUrl => {
      requests += 1;
      assert.equal(new URL(rawUrl).searchParams.get('hourly'), 'wave_height,wave_peak_period,wave_direction');
      return new Response(waveResponse(6));
    },
  });
  assert.equal(requests, 1);
  assert.equal(repaired.summary.retired.unusableComponent, 1);
  assert.equal(selectedOpenMeteoPartRecord(repaired.index, { part, component: 'wave', validTime: reference }).values.wavePeriodS, 6);
  assert.equal(selected(repaired.index).recordId, selected(loaded.index).recordId);
  assert.equal(JSON.parse(await fs.readFile(input.bankPath, 'utf8')).bankSha256, repaired.bank.bankSha256);
});

test('runtime persists original bytes atomically, returns checked index and reuses a full residual', async t => {
  const input = await fixture(t);
  let calls = 0;
  const fetchImpl = async (rawUrl, init) => {
    calls += 1;
    const url = new URL(rawUrl);
    assert.equal(url.origin, 'https://api.open-meteo.com');
    assert.equal(url.pathname, '/v1/forecast');
    assert.equal(url.searchParams.get('models'), 'ecmwf_ifs025');
    assert.equal(url.searchParams.get('longitude'), '10');
    assert.equal(init.redirect, 'error');
    assert.equal(init.method, 'GET');
    return new Response(responseText);
  };
  const result = await runOpenMeteoPartRuntime({ ...input, fetchImpl });
  assert.equal(calls, 1);
  assert.equal(selected(result.index).values.windSpeedMps, 4);
  const disk = JSON.parse(await fs.readFile(input.bankPath, 'utf8'));
  assert.equal(Object.values(disk.responses)[0].responseText, responseText);
  assert.deepEqual((await fs.readdir(input.privateCacheRoot)).sort(), ['part-bank.json', 'weather-component-fallback-cursor.json']);
  const loaded = await loadOpenMeteoPartRuntime(input);
  assert.equal(loaded.bank.bankSha256, result.bank.bankSha256);
  assert.equal(selected(loaded.index).source.parentZoneId, 'ZONE');
  const repeated = await runOpenMeteoPartRuntime({ ...input, fetchImpl });
  assert.equal(calls, 1);
  assert.equal(repeated.summary.transport.httpAttempts, 0);
  assert.equal(repeated.bank.bankSha256, result.bank.bankSha256);
});

test('transient HTTP failure retries within total budget and does not store its error body', async t => {
  const input = await fixture(t);
  let calls = 0;
  const result = await runOpenMeteoPartRuntime({ ...input,
    fetchImpl: async () => ++calls === 1 ? new Response('temporary error', { status: 503 }) : new Response(responseText),
  });
  assert.equal(calls, 2);
  assert.equal(result.summary.transport.retries, 1);
  assert.equal(result.summary.failures.length, 0);
  assert.equal(Object.keys(result.bank.responses).length, 1);
  assert.equal(selected(result.index).values.windSpeedMps, 4);
});

test('budget does not wait through Retry-After and zero budget never starts transport', async t => {
  const input = await fixture(t);
  let calls = 0;
  const result = await runOpenMeteoPartRuntime({ ...input, budgetMs: 100,
    fetchImpl: async () => { calls += 1; return new Response('rate limit', { status: 429, headers: { 'retry-after': '3600' } }); },
  });
  assert.equal(calls, 1);
  assert.equal(result.summary.transport.retries, 0);
  assert.equal(result.summary.failures.length, 1);
  const noBudget = await runOpenMeteoPartRuntime({ ...input, budgetMs: 0,
    fetchImpl: () => { throw new Error('must not call transport'); },
  });
  assert.equal(noBudget.summary.transport.httpAttempts, 0);
  assert.equal(noBudget.summary.deferred, 1);
});

test('timeout bounds stalled headers and response body, not only initial fetch', async t => {
  const input = await fixture(t);
  const stalledHeader = await runOpenMeteoPartRuntime({ ...input, requestTimeoutMs: 20, maxRetries: 0,
    fetchImpl: (_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  });
  assert.equal(stalledHeader.summary.transport.timeouts, 1);
  assert.equal(stalledHeader.summary.failures.length, 1);
  const stalledBody = await runOpenMeteoPartRuntime({ ...input, requestTimeoutMs: 20, maxRetries: 0,
    fetchImpl: async (_url, { signal }) => new Response(new ReadableStream({ start(controller) {
      signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
    } })),
  });
  assert.equal(stalledBody.summary.transport.timeouts, 1);
  assert.equal(stalledBody.summary.failures.length, 1);
});

test('oversized, invalid UTF8 and permanent HTTP responses are not retried or admitted', async t => {
  const input = await fixture(t);
  for (const response of [
    () => new Response('x', { headers: { 'content-length': String(OPEN_METEO_PART_RESPONSE_MAX_BYTES + 1) } }),
    () => new Response(new Uint8Array([0xc3, 0x28])),
    () => new Response('bad request', { status: 400 }),
  ]) {
    let calls = 0;
    const result = await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => { calls += 1; return response(); } });
    assert.equal(calls, 1);
    assert.equal(result.summary.failures.length, 1);
    assert.equal(result.bank.records.length, 0);
  }
});

test('invalid bank/plan cannot cause cache overwrite or network, paths stay in explicit private root', async t => {
  const input = await fixture(t);
  await fs.mkdir(input.privateCacheRoot);
  await fs.writeFile(input.bankPath, 'not a bank');
  const fetchImpl = () => { throw new Error('must not call transport'); };
  await assert.rejects(runOpenMeteoPartRuntime({ ...input, fetchImpl }), /BANK_PARSE_INVALID/);
  assert.equal(await fs.readFile(input.bankPath, 'utf8'), 'not a bank');
  await fs.unlink(input.bankPath);
  await assert.rejects(runOpenMeteoPartRuntime({ ...input, requiredPairs: undefined, fetchImpl }), /RESIDUAL_INVALID/);
  await assert.rejects(fs.access(input.bankPath), /ENOENT/);
  await assert.rejects(runOpenMeteoPartRuntime({ ...input,
    bankPath: path.join(input.privateCacheRoot, '..', 'public.json'), fetchImpl }), /PRIVATE_PATH_INVALID/);
});

test('read-only load rebases a legitimate central parent change without silently retaining wrong identity', async t => {
  const input = await fixture(t);
  const result = await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => new Response(responseText) });
  const before = await fs.readFile(input.bankPath, 'utf8');
  const rebased = await loadOpenMeteoPartRuntime({ ...input, parts: [{ ...part, zoneId: 'NEW-ZONE' }] });
  assert.equal(result.bank.records.length, 1);
  assert.equal(rebased.bank.records.length, 0);
  assert.equal(await fs.readFile(input.bankPath, 'utf8'), before, 'read-only load never overwrites the original bank');
});

const settlementDeferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const settlementPause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

test('PART settlement: HTTP retry waits for actual body cancellation', async t => {
  const input = await fixture(t), cancel = settlementDeferred(), entered = settlementDeferred();
  let calls = 0, settled = false, operation;
  try {
    operation = runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => {
      calls++;
      if (calls > 1) return new Response(responseText);
      return new Response(new ReadableStream({ cancel() { entered.resolve(); return cancel.promise; } }), { status: 503 });
    } });
    operation.then(() => { settled = true; }, () => { settled = true; });
    await entered.promise;
    await settlementPause(300);
    assert.deepEqual({ calls, settled }, { calls: 1, settled: false }, 'cancel request is not completed teardown');
    await assert.rejects(fs.access(path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json')), /ENOENT/);
    cancel.resolve();
    const result = await operation;
    assert.equal(calls, 2);
    assert.equal(result.summary.transport.retries, 1);
    assert.equal(selected(result.index).values.windSpeedMps, 4);
  } finally { cancel.resolve(); if (operation) await operation.catch(() => {}); }
});

test('PART settlement: late headers are cancelled before timeout returns and never admitted', async t => {
  const input = await fixture(t), headers = settlementDeferred(), aborted = settlementDeferred();
  const cancel = settlementDeferred(), cancelling = settlementDeferred();
  let controller, operation, settled = false, cancelCalls = 0;
  const response = new Response(new ReadableStream({
    start(value) { controller = value; },
    cancel() { cancelCalls++; cancelling.resolve(); return cancel.promise; },
  }));
  try {
    operation = runOpenMeteoPartRuntime({ ...input, requestTimeoutMs: 20, maxRetries: 0,
      fetchImpl: (_url, { signal }) => {
        signal.addEventListener('abort', aborted.resolve, { once: true });
        return headers.promise;
      },
    });
    operation.then(() => { settled = true; }, () => { settled = true; });
    await aborted.promise;
    await settlementPause(20);
    assert.equal(settled, false, 'timed-out fetch is still actually pending');
    headers.resolve(response);
    await Promise.race([cancelling.promise, settlementPause(100)]);
    assert.equal(cancelCalls, 1, 'late headers must enter owned cancellation');
    assert.equal(settled, false, 'late response cancellation must itself finish');
    cancel.resolve();
    const result = await operation;
    assert.equal(result.summary.transport.timeouts, 1);
    assert.equal(result.summary.failures.length, 1);
    assert.equal(result.bank.records.length, 0);
  } finally {
    headers.resolve(response); cancel.resolve();
    try { controller.close(); } catch { /* Already cancelled by the actual caller. */ }
    if (operation) await operation.catch(() => {});
  }
});

test('PART settlement: timed-out reader awaits cancellation before cursor or return', async t => {
  const input = await fixture(t), aborted = settlementDeferred(), cancel = settlementDeferred();
  let controller, operation, settled = false, cancellations = 0;
  try {
    operation = runOpenMeteoPartRuntime({ ...input, requestTimeoutMs: 20, maxRetries: 0,
      fetchImpl: async (_url, { signal }) => {
        signal.addEventListener('abort', aborted.resolve, { once: true });
        return new Response(new ReadableStream({ start(value) { controller = value; },
          cancel() { cancellations++; return cancel.promise; } }));
      },
    });
    operation.then(() => { settled = true; }, () => { settled = true; });
    await aborted.promise;
    await settlementPause(20);
    assert.equal(settled, false);
    assert.equal(cancellations, 1);
    await assert.rejects(fs.access(path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json')), /ENOENT/);
    cancel.resolve();
    const result = await operation;
    assert.equal(result.summary.transport.timeouts, 1);
    assert.equal(result.bank.records.length, 0);
  } finally {
    cancel.resolve(); try { controller?.close(); } catch { /* Actual cancellation already closed it. */ }
    if (operation) await operation.catch(() => {});
  }
});

test('PART settlement: rejected cancellation retains the actual resource and falsy first cause', async t => {
  for (const first of [0, null]) await t.test(String(first), async st => {
    const input = await fixture(st);
    // Each ordinary module instance has a permanent STOP latch. An isolated
    // child owns only these synthetic streams; no public reset or provider.
    const code = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs/promises';
      import { runOpenMeteoPartRuntime } from './scripts/lib/open-meteo-part-runtime.mjs';
      import { assertWeatherTransportSettlement, isWeatherTransportStopUnproved } from './scripts/lib/weather-transport-settlement.mjs';
      const input = ${JSON.stringify({ ...input, now: undefined })};
      const first = ${JSON.stringify(first)};
      let calls = 0, cancellationCalls = 0, caught;
      const response = new Response(new ReadableStream({ cancel() { cancellationCalls++; return Promise.reject(new Error('synthetic cleanup failure')); } }));
      Object.defineProperty(response, 'url', { get() { throw first; } });
      try { await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => { calls++; return response; } }); }
      catch (error) { caught = error; }
      assert.equal(isWeatherTransportStopUnproved(caught), true);
      assert.equal(caught.cause, first);
      assert.equal(calls, 1); assert.equal(cancellationCalls, 1);
      assert.throws(assertWeatherTransportSettlement, error => error === caught);
      await assert.rejects(runOpenMeteoPartRuntime({ ...input, budgetMs: 0, fetchImpl: () => { calls++; } }), error => error === caught);
      assert.equal(calls, 1);
      await assert.rejects(fs.access(input.privateCacheRoot + '/weather-component-fallback-cursor.json'), /ENOENT/);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, '');
  });
});
