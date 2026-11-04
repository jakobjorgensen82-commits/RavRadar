import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { loadOpenMeteoPartRuntime, loadRetainedOpenMeteoPartIndex, runOpenMeteoPartRuntime } from './lib/open-meteo-part-runtime.mjs';
import { produceOpenMeteoPartComponents } from './produce-open-meteo-part-components.mjs';
import { OPEN_METEO_PART_RESPONSE_MAX_BYTES, selectedOpenMeteoPartRecord,
  buildOpenMeteoPartRequest, readOpenMeteoPartResponse, mergeOpenMeteoPartBank, openMeteoPartSha256 } from './lib/open-meteo-part-bank.mjs';

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
  const retained = await loadRetainedOpenMeteoPartIndex(input);
  assert.equal(retained.recordCount, loaded.index.recordCount);
  assert.deepEqual(selected(retained), selected(loaded.index));
  assert.equal(selectedOpenMeteoPartRecord(retained, { part, component: 'wave', validTime: reference }), null);
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
  assert.equal(result.summary.transport.budgetReached, 1);
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
  for (const rebasedInput of [
    { ...input, parts: [{ ...part, zoneId: 'NEW-ZONE' }] },
    { ...input, retentionStartAt: at(1) },
  ]) {
    const retained = await loadRetainedOpenMeteoPartIndex(rebasedInput);
    const regular = await loadOpenMeteoPartRuntime(rebasedInput);
    assert.equal(retained.recordCount, regular.index.recordCount);
    assert.equal(selected(retained), null);
  }
  assert.equal(await fs.readFile(input.bankPath, 'utf8'), before, 'read-only load never overwrites the original bank');
});

test('planning-only load checks retained source bytes, tuple and duplicate before exposing an index', async t => {
  const input = await fixture(t);
  const { bank, index } = await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => new Response(responseText) });
  const { bankSha256: _digest, ...reordered } = structuredClone(bank);
  reordered.records[0] = Object.fromEntries(Object.entries(reordered.records[0]).reverse());
  await fs.writeFile(input.bankPath, JSON.stringify({ ...reordered, bankSha256: openMeteoPartSha256(reordered) }));
  assert.deepEqual(selected(await loadRetainedOpenMeteoPartIndex(input)), selected(index));
  const failures = [
    [content => { content.records.push(content.records[0]); }, /BANK_DUPLICATE/],
    [content => { content.records[0].values.windSpeedMps += 1; }, /BANK_RECORD_INVALID/],
    [content => { content.records[0].extra = 1; }, /BANK_RECORD_INVALID/],
    [content => { Object.values(content.responses)[0].responseText += ' '; }, /BANK_EVIDENCE_INVALID/],
    [content => { content.records[0].evidenceId = 'missing'; }, /BANK_EVIDENCE_INVALID/],
  ];
  for (const [damage, reason] of failures) {
    const { bankSha256: _digest, ...content } = structuredClone(bank);
    damage(content);
    const bytes = JSON.stringify({ ...content, bankSha256: openMeteoPartSha256(content) });
    await fs.writeFile(input.bankPath, bytes);
    await assert.rejects(loadRetainedOpenMeteoPartIndex(input), reason);
    assert.equal(await fs.readFile(input.bankPath, 'utf8'), bytes);
  }
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


test('tail capacity: bounded scalar fairness reaches temperature under sustained critical work', async t => {
  await t.test('2026 queue: 673 jobs per family and 515 starts retain critical progress and reach 171 temperatures', async () => {
    const parts = Array.from({ length: 673 }, (_, index) => ({ ...part, partId: `QUEUE-${index}` }));
    const requiredPairs = parts.flatMap(row => [
      { partId: row.partId, component: 'wave', validTime: at(114) },
      { partId: row.partId, component: 'wind', validTime: at(115) },
      { partId: row.partId, component: 'waterTemperature', validTime: at(117) },
    ]);
    const started = []; let active = 0, maximumActive = 0;
    const result = await produceOpenMeteoPartComponents({ parts, spatialPolicies, requiredPairs,
      productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120),
      startAfterPartId: parts[6].partId, shouldContinue: () => started.length < 515,
      fetchResponse: async request => {
        started.push({ partId: request.identity.entityId.slice(6), component: request.component });
        active++; maximumActive = Math.max(maximumActive, active);
        try { await Promise.resolve(); throw new Error('synthetic permanent provider refusal'); }
        finally { active--; }
      },
    });
    t.diagnostic(JSON.stringify({ kind: 'SYNTHETIC_2026_QUEUE_COUNTS', requests: result.summary.requests,
      requestsByComponent: result.summary.requestsByComponent, deferredByComponent: result.summary.deferredByComponent }));
    assert.equal(result.summary.requests, 515);
    assert.deepEqual(result.summary.requestsByComponent, { wind: 172, wave: 172, waterTemperature: 171 });
    assert.deepEqual(result.summary.deferredByComponent, { wind: 501, wave: 501, waterTemperature: 502 });
    assert.equal(result.summary.deferred, 1504);
    assert.equal(result.summary.failures.length, 515);
    assert.equal(result.bank.records.length, 0, 'request fairness never fabricates provider values');
    assert.equal(active, 0); assert.equal(maximumActive, 2);
    // Current canonical string order replaces the former numeric input-order assertion.
    const rotated = [
      'QUEUE-60', 'QUEUE-600', 'QUEUE-601', 'QUEUE-602', 'QUEUE-603', 'QUEUE-604', 'QUEUE-605', 'QUEUE-606',
      'QUEUE-607', 'QUEUE-608', 'QUEUE-609', 'QUEUE-61', 'QUEUE-610', 'QUEUE-611', 'QUEUE-612', 'QUEUE-613',
      'QUEUE-614', 'QUEUE-615', 'QUEUE-616', 'QUEUE-617', 'QUEUE-618', 'QUEUE-619', 'QUEUE-62', 'QUEUE-620',
      'QUEUE-621', 'QUEUE-622', 'QUEUE-623', 'QUEUE-624', 'QUEUE-625', 'QUEUE-626', 'QUEUE-627', 'QUEUE-628',
      'QUEUE-629', 'QUEUE-63', 'QUEUE-630', 'QUEUE-631', 'QUEUE-632', 'QUEUE-633', 'QUEUE-634', 'QUEUE-635',
      'QUEUE-636', 'QUEUE-637', 'QUEUE-638', 'QUEUE-639', 'QUEUE-64', 'QUEUE-640', 'QUEUE-641', 'QUEUE-642',
      'QUEUE-643', 'QUEUE-644', 'QUEUE-645', 'QUEUE-646', 'QUEUE-647', 'QUEUE-648', 'QUEUE-649', 'QUEUE-65',
      'QUEUE-650', 'QUEUE-651', 'QUEUE-652', 'QUEUE-653', 'QUEUE-654', 'QUEUE-655', 'QUEUE-656', 'QUEUE-657',
      'QUEUE-658', 'QUEUE-659', 'QUEUE-66', 'QUEUE-660', 'QUEUE-661', 'QUEUE-662', 'QUEUE-663', 'QUEUE-664',
      'QUEUE-665', 'QUEUE-666', 'QUEUE-667', 'QUEUE-668', 'QUEUE-669', 'QUEUE-67', 'QUEUE-670', 'QUEUE-671',
      'QUEUE-672', 'QUEUE-68', 'QUEUE-69', 'QUEUE-7', 'QUEUE-70', 'QUEUE-71', 'QUEUE-72', 'QUEUE-73',
      'QUEUE-74', 'QUEUE-75', 'QUEUE-76', 'QUEUE-77', 'QUEUE-78', 'QUEUE-79', 'QUEUE-8', 'QUEUE-80',
      'QUEUE-81', 'QUEUE-82', 'QUEUE-83', 'QUEUE-84', 'QUEUE-85', 'QUEUE-86', 'QUEUE-87', 'QUEUE-88',
      'QUEUE-89', 'QUEUE-9', 'QUEUE-90', 'QUEUE-91', 'QUEUE-92', 'QUEUE-93', 'QUEUE-94', 'QUEUE-95',
      'QUEUE-96', 'QUEUE-97', 'QUEUE-98', 'QUEUE-99', 'QUEUE-0', 'QUEUE-1', 'QUEUE-10', 'QUEUE-100',
      'QUEUE-101', 'QUEUE-102', 'QUEUE-103', 'QUEUE-104', 'QUEUE-105', 'QUEUE-106', 'QUEUE-107', 'QUEUE-108',
      'QUEUE-109', 'QUEUE-11', 'QUEUE-110', 'QUEUE-111', 'QUEUE-112', 'QUEUE-113', 'QUEUE-114', 'QUEUE-115',
      'QUEUE-116', 'QUEUE-117', 'QUEUE-118', 'QUEUE-119', 'QUEUE-12', 'QUEUE-120', 'QUEUE-121', 'QUEUE-122',
      'QUEUE-123', 'QUEUE-124', 'QUEUE-125', 'QUEUE-126', 'QUEUE-127', 'QUEUE-128', 'QUEUE-129', 'QUEUE-13',
      'QUEUE-130', 'QUEUE-131', 'QUEUE-132', 'QUEUE-133', 'QUEUE-134', 'QUEUE-135', 'QUEUE-136', 'QUEUE-137',
      'QUEUE-138', 'QUEUE-139', 'QUEUE-14', 'QUEUE-140', 'QUEUE-141', 'QUEUE-142', 'QUEUE-143', 'QUEUE-144',
      'QUEUE-145', 'QUEUE-146', 'QUEUE-147', 'QUEUE-148',
    ];
    assert.deepEqual(started.filter(row => row.component === 'waterTemperature').map(row => row.partId), rotated.slice(0, 171));
    assert.deepEqual(started.filter(row => row.component !== 'waterTemperature').map(row => [row.partId, row.component]),
      rotated.slice(0, 172).flatMap(id => [[id, 'wave'], [id, 'wind']]));
  });
  await t.test('normal paced runtime keeps rotation, four HTTP cap and a real temperature start', async t => {
    const input = await fixture(t);
    const second = { ...part, partId: 'SECOND', waterPoint: [11, 56] };
    const parts = [part, second];
    const requiredPairs = parts.flatMap(row => [
      { partId: row.partId, component: 'waterTemperature', validTime: reference },
      { partId: row.partId, component: 'wind', validTime: at(100) },
      { partId: row.partId, component: 'wave', validTime: at(101) },
    ]);
    await fs.mkdir(input.privateCacheRoot, { recursive: true });
    await fs.writeFile(path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json'),
      JSON.stringify({ kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1, openMeteoLastAttemptedPartId: part.partId }));
    const order = [];
    const result = await runOpenMeteoPartRuntime({ ...input, parts, requiredPairs,
      budgetMs: 10_000, maxHttpAttempts: 4,
      fetchImpl: async raw => { const url = new URL(raw); order.push([url.searchParams.get('longitude'), url.searchParams.get('hourly')]); return new Response('synthetic permanent miss', { status: 400 }); },
    });
    assert.deepEqual(order.map(([longitude, fields]) => [longitude, fields.startsWith('wind_') ? 'wind' : fields.startsWith('wave_') ? 'wave' : 'temperature']),
      [['11', 'wind'], ['11', 'wave'], ['11', 'temperature'], ['10', 'wind']]);
    assert.equal(result.summary.requests, 4);
    assert.deepEqual(result.summary.requestsByComponent, { wind: 2, wave: 1, waterTemperature: 1 });
    assert.deepEqual(result.summary.deferredByComponent, { wind: 0, wave: 1, waterTemperature: 1 });
    assert.equal(result.summary.deferred, 2);
    assert.equal(result.summary.lastAttemptedPartId, part.partId);
    assert.equal(result.summary.transport.httpAttempts, 4);
    assert.equal(result.bank.records.length, 0);
  });
  await t.test('empty and short tiers drain without invented work or starvation claims below three starts', async t => {
    for (const components of [[], ['wind'], ['waterTemperature'], ['wind', 'waterTemperature'], ['wave', 'wind', 'waterTemperature']]) {
      const input = await fixture(t), order = [];
      const requiredPairs = components.map((component, index) => ({ partId: part.partId, component, validTime: at(index) }));
      const result = await produceOpenMeteoPartComponents({ ...input, requiredPairs,
        fetchResponse: async request => { order.push(request.component); throw new Error('synthetic permanent provider refusal'); } });
      assert.deepEqual(order, components);
      assert.equal(result.summary.requests, components.length); assert.equal(result.summary.deferred, 0);
      assert.equal(result.bank.records.length, 0);
    }
    const input = await fixture(t), order = [];
    const result = await produceOpenMeteoPartComponents({ ...input,
      requiredPairs: ['wind', 'wave', 'waterTemperature'].map((component, index) => ({ partId: part.partId, component, validTime: at(index) })),
      shouldContinue: () => order.length < 2,
      fetchResponse: async request => { order.push(request.component); throw new Error('synthetic permanent provider refusal'); },
    });
    assert.deepEqual(order, ['wind', 'wave']);
    assert.equal(result.summary.requestsByComponent.waterTemperature, 0);
    assert.equal(result.summary.deferredByComponent.waterTemperature, 1);
  });
  await t.test('a timed-out critical response settles before the shared budget permits a temperature request', async t => {
    const input = await fixture(t), order = []; let pending = 0;
    const result = await runOpenMeteoPartRuntime({ ...input, budgetMs: 2_000, requestTimeoutMs: 20, maxRetries: 0,
      requiredPairs: ['wind', 'wave', 'waterTemperature'].map((component, index) => ({ partId: part.partId, component, validTime: at(index) })),
      fetchImpl: (raw, { signal }) => {
        const fields = new URL(raw).searchParams.get('hourly'); order.push(fields);
        if (fields.startsWith('wind_')) return new Promise((resolve, reject) => {
          pending++; signal.addEventListener('abort', () => { pending--; reject(new Error('synthetic owned timeout')); }, { once: true });
        });
        return Promise.resolve(new Response('synthetic permanent miss', { status: 400 }));
      },
    });
    assert.deepEqual(order, ['wind_speed_10m,wind_direction_10m', 'wave_height,wave_peak_period,wave_direction', 'sea_surface_temperature']);
    assert.equal(pending, 0); assert.equal(result.summary.transport.timeouts, 1);
    assert.deepEqual(result.summary.requestsByComponent, { wind: 1, wave: 1, waterTemperature: 1 });
    assert.equal(result.bank.records.length, 0);
  });

  await t.test('national zone breadth precedes repeated PARTs inside each unchanged tier', async () => {
    const parts = Array.from({ length: 210 }, (_, zone) => Array.from({ length: zone < 43 ? 4 : 3 }, (_, index) =>
      ({ ...part, zoneId: `ZONE-${zone}`, partId: `PART-${zone}-${index}` }))).flat();
    assert.equal(parts.length, 673);
    const requiredPairs = parts.flatMap(row => ['wind', 'wave', 'waterTemperature'].map(component =>
      ({ partId: row.partId, component, validTime: reference })));
    const starts = []; let active = 0, maximumActive = 0;
    const result = await produceOpenMeteoPartComponents({ parts, spatialPolicies, requiredPairs,
      productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120),
      shouldContinue: () => starts.length < 678,
      fetchResponse: async request => {
        starts.push({ partId: request.identity.entityId.slice(6), zone: request.identity.parentZoneId, component: request.component });
        maximumActive = Math.max(maximumActive, ++active);
        try { await Promise.resolve(); throw new Error('synthetic permanent provider refusal'); }
        finally { active--; }
      },
    });
    assert.deepEqual(result.summary.requestsByComponent, { wind: 226, wave: 226, waterTemperature: 226 });
    for (const component of ['wind', 'wave', 'waterTemperature']) {
      const sequence = starts.filter(row => row.component === component);
      assert.equal(new Set(sequence.slice(0, 210).map(row => row.zone)).size, 210);
      assert.equal(new Set(sequence.map(row => row.partId)).size, 226);
    }
    assert.equal(result.summary.deferred, 1341);
    assert.equal(result.bank.records.length, 0, 'ordering never creates weather values');
    assert.equal(active, 0); assert.equal(maximumActive, 2);
  });
  await t.test('unequal zones rotate all needy PARTs over runs without resetting at H0 or array reordering', async () => {
    const parts = [4, 2, 1].flatMap((count, zone) => Array.from({ length: count }, (_, index) =>
      ({ ...part, zoneId: `ZONE-${zone}`, partId: `PART-${zone}-${index}` })));
    const seen = new Set(); let cursor, lastPart;
    for (let run = 0; run < 4; run++) {
      const starts = [];
      const result = await produceOpenMeteoPartComponents({ parts, spatialPolicies,
        productionReferenceAt: at(run), retentionStartAt: at(-48), retentionEndAt: at(120 + run),
        requiredPairs: parts.map(row => ({ partId: row.partId, component: 'wind', validTime: at(run) })),
        advisoryZoneRotation: cursor, startAfterPartId: lastPart, shouldContinue: () => starts.length < 3,
        fetchResponse: async request => { starts.push(request.identity); throw new Error('synthetic permanent provider refusal'); },
      });
      assert.equal(new Set(starts.map(row => row.parentZoneId)).size, 3);
      starts.forEach(row => seen.add(row.entityId));
      if (cursor) assert.equal(result.zoneRotation.domainSha256, cursor.domainSha256);
      cursor = result.zoneRotation; lastPart = result.summary.lastAttemptedPartId;
    }
    assert.equal(seen.size, 7);
    const noWork = await produceOpenMeteoPartComponents({ parts: [...parts].reverse(), spatialPolicies,
      productionReferenceAt: at(4), retentionStartAt: at(-48), retentionEndAt: at(124), requiredPairs: [],
      advisoryZoneRotation: cursor, startAfterPartId: lastPart,
      fetchResponse: async () => { assert.fail('no invented work'); },
    });
    assert.deepEqual(noWork.zoneRotation, cursor);
    const changed = parts.map((row, index) => index ? row : { ...row, waterPoint: [10.1, 56] });
    const reset = await produceOpenMeteoPartComponents({ parts: changed, spatialPolicies,
      productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120), requiredPairs: [],
      advisoryZoneRotation: cursor, startAfterPartId: lastPart, fetchResponse: async () => assert.fail('no invented work'),
    });
    assert.notEqual(reset.zoneRotation.domainSha256, cursor.domainSha256);
    assert.equal(reset.summary.lastAttemptedPartId, null);
    assert.equal(reset.zoneRotation.critical.lastZoneId, parts.find(row => row.partId === lastPart).zoneId);
  });
  await t.test('active runs cannot starve a PART by alternating equivalent registry array orders', async () => {
    const parts = ['A1', 'A2', 'A3'].map(partId => ({ ...part, partId }));
    let cursor, lastPart; const starts = [];
    for (let run = 0; run < 6; run++) {
      const result = await produceOpenMeteoPartComponents({ parts: run % 2 ? [...parts].reverse() : parts,
        spatialPolicies, productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120),
        requiredPairs: parts.map(row => ({ partId: row.partId, component: 'wind', validTime: reference })),
        advisoryZoneRotation: cursor, startAfterPartId: lastPart, shouldContinue: () => starts.length <= run,
        fetchResponse: async request => { starts.push(request.identity.entityId.slice(6)); throw new Error('synthetic refusal'); },
      });
      if (cursor) assert.equal(result.zoneRotation.domainSha256, cursor.domainSha256);
      cursor = result.zoneRotation; lastPart = result.summary.lastAttemptedPartId;
    }
    assert.deepEqual(starts, ['A1', 'A2', 'A3', 'A1', 'A2', 'A3']);
  });
  await t.test('skewed tiers retain 2:1 and claim zone breadth within each tier, not across tiers', async () => {
    const parts = ['A', 'B', 'C'].flatMap(zoneId => [0, 1].map(index => ({ ...part, zoneId, partId: `${zoneId}${index}` })));
    const requiredPairs = parts.flatMap(row => (row.zoneId === 'A' ? ['wind', 'wave'] : ['waterTemperature'])
      .map(component => ({ partId: row.partId, component, validTime: reference })));
    const starts = [];
    const result = await produceOpenMeteoPartComponents({ parts: [...parts].reverse(), spatialPolicies, requiredPairs,
      productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120),
      shouldContinue: () => starts.length < 6,
      fetchResponse: async request => { starts.push([request.identity.entityId.slice(6), request.component]); throw new Error('synthetic refusal'); },
    });
    assert.deepEqual(starts, [['A0', 'wind'], ['A0', 'wave'], ['B0', 'waterTemperature'],
      ['A1', 'wind'], ['A1', 'wave'], ['C0', 'waterTemperature']]);
    assert.deepEqual(result.summary.requestsByComponent, { wind: 2, wave: 2, waterTemperature: 2 });
    assert.equal(result.bank.records.length, 0);
  });
  await t.test('only the actually started tier advances, including reversed completion and sparse needs', async t => {
    const input = await fixture(t);
    const parts = ['A', 'B', 'C'].flatMap(zoneId => [0, 1].map(index => ({ ...part, zoneId, partId: `${zoneId}-${index}` })));
    const cursorFile = path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json');
    const starts = [];
    const run = async components => {
      starts.length = 0;
      const result = await runOpenMeteoPartRuntime({ ...input, parts, budgetMs: 10_000, maxHttpAttempts: 3,
        requiredPairs: parts.flatMap(row => components.map(component => ({ partId: row.partId, component, validTime: reference }))),
        fetchImpl: async raw => { starts.push(new URL(raw).searchParams.get('hourly')); return new Response('synthetic refusal', { status: 400 }); },
      });
      return JSON.parse(await fs.readFile(cursorFile, 'utf8'));
    };
    const temperature = await run(['waterTemperature']);
    const critical = await run(['wind']);
    assert.deepEqual(critical.zoneRotation.temperature, temperature.zoneRotation.temperature);
    const temperatureAgain = await run(['waterTemperature']);
    assert.deepEqual(temperatureAgain.zoneRotation.critical, critical.zoneRotation.critical);
    assert.notDeepEqual(temperatureAgain.zoneRotation.temperature, temperature.zoneRotation.temperature);
    const sparse = parts.filter(row => row.partId === 'A-1' || row.partId === 'C-0');
    const sparseStarts = [];
    let releaseFirst;
    const first = new Promise(resolve => { releaseFirst = resolve; });
    const result = await produceOpenMeteoPartComponents({ ...input, parts, advisoryZoneRotation: temperatureAgain.zoneRotation,
      startAfterPartId: temperatureAgain.openMeteoLastAttemptedPartId,
      requiredPairs: sparse.map(row => ({ partId: row.partId, component: 'wind', validTime: reference })),
      fetchResponse: async request => {
        sparseStarts.push(request.identity);
        if (sparseStarts.length === 1) await first;
        else releaseFirst();
        throw new Error('synthetic refusal');
      },
    });
    assert.equal(sparseStarts.length, 2);
    assert.deepEqual(new Set(sparseStarts.map(row => row.parentZoneId)), new Set(['A', 'C']));
    assert.equal(result.zoneRotation.critical.lastZoneId, sparseStarts[1].parentZoneId);
    assert.deepEqual(result.zoneRotation.temperature, temperatureAgain.zoneRotation.temperature);
  });
  await t.test('offline bank recovery ignores malformed optional state, online rejects it, legacy checks remain strict', async t => {
    const input = await fixture(t);
    await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => new Response(responseText) });
    const cursorFile = path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json');
    const valid = JSON.parse(await fs.readFile(cursorFile, 'utf8'));
    const bankBefore = await fs.readFile(input.bankPath);
    const invalid = [null, { schemaVersion: 99 }, { ...valid.zoneRotation, extra: true },
      { ...valid.zoneRotation, critical: { lastZoneId: 'FOREIGN', lastParts: [['FOREIGN', part.partId]] } },
      { ...valid.zoneRotation, temperature: { lastZoneId: 'ZONE', lastParts: [['ZONE', part.partId], ['ZONE', part.partId]] } }];
    for (const zoneRotation of invalid) {
      const bytes = ` ${JSON.stringify({ ...valid, zoneRotation })}\n`;
      await fs.writeFile(cursorFile, bytes);
      const offline = await runOpenMeteoPartRuntime({ ...input, budgetMs: 0, fetchImpl: async () => assert.fail('offline HTTP') });
      assert.equal(selected(offline.index).values.windSpeedMps, 4);
      assert.equal(await fs.readFile(cursorFile, 'utf8'), bytes);
      await assert.rejects(runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => assert.fail('invalid advisory HTTP') }),
        /OPEN_METEO_PART_CURSOR_INVALID/);
      assert.equal(await fs.readFile(cursorFile, 'utf8'), bytes);
      assert.deepEqual(await fs.readFile(input.bankPath), bankBefore);
    }
    const legacy = ` {"schemaVersion":1,"kind":"WEATHER_COMPONENT_FALLBACK_CURSOR","openMeteoLastAttemptedPartId":"TEST"}\n`;
    await fs.writeFile(cursorFile, legacy);
    await runOpenMeteoPartRuntime({ ...input, budgetMs: 0, fetchImpl: async () => assert.fail('offline HTTP') });
    assert.equal(await fs.readFile(cursorFile, 'utf8'), legacy, 'no start never migrates legacy bytes');
    for (const bad of [{ ...valid, schemaVersion: 2 }, { ...valid, kind: 'UNKNOWN' }, { ...valid, openMeteoLastAttemptedPartId: '' }]) {
      const bytes = JSON.stringify(bad); await fs.writeFile(cursorFile, bytes);
      await assert.rejects(runOpenMeteoPartRuntime({ ...input, budgetMs: 0 }), /OPEN_METEO_PART_CURSOR_INVALID/);
      assert.equal(await fs.readFile(cursorFile, 'utf8'), bytes);
    }
  });
  await t.test('cursor writes obey the existing 64 KiB read cap and never retry a failed rename', async t => {
    const input = await fixture(t);
    const cursorFile = path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json');
    const legacy = JSON.stringify({ kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1, openMeteoLastAttemptedPartId: 'TEST' });
    await fs.mkdir(input.privateCacheRoot, { recursive: true }); await fs.writeFile(cursorFile, legacy);
    const huge = { ...part, partId: 'P'.repeat(64 * 1024) };
    let calls = 0;
    await assert.rejects(runOpenMeteoPartRuntime({ ...input, parts: [huge],
      requiredPairs: [{ partId: huge.partId, component: 'wind', validTime: reference }],
      fetchImpl: async () => { calls++; return new Response('synthetic refusal', { status: 400 }); },
    }), /OPEN_METEO_PRIVATE_BANK_SIZE_INVALID/);
    assert.equal(calls, 1); assert.equal(await fs.readFile(cursorFile, 'utf8'), legacy);
    assert.equal((await fs.readdir(input.privateCacheRoot)).some(name => name.includes('.tmp-')), false);
    for (const afterRename of [false, true]) {
      await fs.writeFile(cursorFile, legacy); let cursorRenames = 0;
      const originalRename = fs.rename;
      const mock = t.mock.method(fs, 'rename', async (from, to) => {
        if (to !== cursorFile) return originalRename(from, to);
        cursorRenames++;
        if (afterRename) await originalRename(from, to);
        throw Object.assign(new Error('synthetic cursor save failure'), { code: 'EACCES' });
      });
      try {
        await assert.rejects(runOpenMeteoPartRuntime({ ...input,
          fetchImpl: async () => new Response('synthetic refusal', { status: 400 }),
        }), /synthetic cursor save failure/);
      } finally { mock.mock.restore(); }
      assert.equal(cursorRenames, 1);
      const actual = await fs.readFile(cursorFile, 'utf8');
      if (afterRename) assert.ok(JSON.parse(actual).zoneRotation, 'unknown outcome preserves actual new bytes without rollback');
      else assert.equal(actual, legacy);
    }
  });
  await t.test('STOP_UNPROVED never persists started advisory progress', async t => {
    const input = await fixture(t);
    const cursorFile = path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json');
    await runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => new Response('synthetic refusal', { status: 400 }) });
    const bytes = await fs.readFile(cursorFile, 'utf8');
    const code = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs/promises';
      import { runOpenMeteoPartRuntime } from './scripts/lib/open-meteo-part-runtime.mjs';
      import { isWeatherTransportStopUnproved } from './scripts/lib/weather-transport-settlement.mjs';
      const input = ${JSON.stringify({ ...input, now: undefined })};
      const cursorFile = ${JSON.stringify(cursorFile)};
      const before = await fs.readFile(cursorFile, 'utf8');
      const response = new Response(new ReadableStream({ cancel() { return Promise.reject(new Error('synthetic cleanup failure')); } }));
      Object.defineProperty(response, 'url', { get() { throw new Error('synthetic first failure'); } });
      await assert.rejects(runOpenMeteoPartRuntime({ ...input, fetchImpl: async () => response }), isWeatherTransportStopUnproved);
      assert.equal(await fs.readFile(cursorFile, 'utf8'), before);
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    });
    assert.equal(child.error, undefined); assert.equal(child.status, 0, child.stderr);
    assert.equal(await fs.readFile(cursorFile, 'utf8'), bytes);
  });

});

test('tail capacity: HTTP cap includes retries and never advances cursor for a paced task with no HTTP', async t => {
  const input = await fixture(t);
  const second = { ...part, partId: 'SECOND', waterPoint: [11, 56] };
  let calls = 0; const startedPartIds = [];
  const result = await runOpenMeteoPartRuntime({ ...input, parts: [part, second], budgetMs: 5_000,
    requiredPairs: [part, second].map(row => ({ partId: row.partId, component: 'wind', validTime: reference })),
    maxHttpAttempts: 1, fetchImpl: async raw => {
      calls++;
      const target = [part, second].find(row => String(row.waterPoint[0]) === new URL(raw).searchParams.get('longitude'));
      assert.ok(target); startedPartIds.push(target.partId);
      return new Response('synthetic retryable', { status: 503 });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.summary.requests, 1);
  assert.equal(result.summary.deferred, 1);
  assert.deepEqual(startedPartIds, ['SECOND'], 'the canonical first PART actually reached HTTP');
  assert.equal(result.summary.lastAttemptedPartId, startedPartIds[0]);
  assert.deepEqual(result.summary.requestsByComponent, { wind: 1, wave: 0, waterTemperature: 0 });
  assert.deepEqual(result.summary.deferredByComponent, { wind: 1, wave: 0, waterTemperature: 0 });
  assert.equal(result.summary.transport.httpAttempts, 1);
  assert.equal(result.summary.transport.retries, 0);
  assert.equal(result.summary.transport.httpAttemptLimitReached, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json'), 'utf8')).openMeteoLastAttemptedPartId, startedPartIds[0]);
  let retryCalls = 0;
  const retry = await runOpenMeteoPartRuntime({ ...input, budgetMs: 5_000, maxHttpAttempts: 2,
    fetchImpl: async () => { retryCalls++; return new Response('synthetic retryable', { status: 503 }); },
  });
  assert.equal(retryCalls, 2);
  assert.equal(retry.summary.transport.httpAttempts, 2);
  assert.equal(retry.summary.transport.retries, 1);
  assert.equal(retry.summary.requests, 1);
});

test('tail capacity: pacing is global, slots remain independent, and completed wind is durable', async t => {
  const input = await fixture(t);
  const parts = [part, { ...part, partId: 'SECOND', waterPoint: [11, 56] }, { ...part, partId: 'THIRD', waterPoint: [12, 56] }];
  let releaseFirst, active = 0, maximumActive = 0;
  const first = new Promise(resolve => { releaseFirst = resolve; });
  const starts = [];
  const result = await runOpenMeteoPartRuntime({ ...input, parts, budgetMs: 5_000, requestTimeoutMs: 2_000,
    requiredPairs: parts.map(row => ({ partId: row.partId, component: 'wind', validTime: reference })),
    fetchImpl: async raw => {
      starts.push(performance.now()); active++; maximumActive = Math.max(maximumActive, active);
      if (starts.length === 1) await first;
      else if (starts.length === 3) releaseFirst();
      active--;
      const url = new URL(raw); const text = JSON.parse(responseText);
      text.longitude = +url.searchParams.get('longitude');
      return new Response(JSON.stringify(text));
    },
  });
  assert.equal(starts.length, 3);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 150, JSON.stringify(starts));
  assert.equal(maximumActive, 2, 'a slow first request must not idle the other transport slot');
  assert.equal(active, 0);
  assert.equal(result.summary.transport.pacingMinimumIntervalMs, 150);
  assert.equal(result.summary.transport.httpAttemptLimit, 800);
  assert.equal(result.summary.requestsByComponent.wind, 3);
  assert.equal(result.bank.records.length, 3);
  assert.equal(JSON.parse(await fs.readFile(input.bankPath, 'utf8')).bankSha256, result.bank.bankSha256);
  const zero = await runOpenMeteoPartRuntime({ ...input, parts, budgetMs: 0,
    requiredPairs: [{ partId: parts[0].partId, component: 'wind', validTime: at(1) }],
    fetchImpl: () => { throw new Error('zero budget must never use HTTP'); },
  });
  assert.equal(zero.summary.requests, 0);
  assert.equal(zero.summary.transport.httpAttempts, 0);
  assert.equal(zero.summary.deferredByComponent.wind, 1);
  assert.equal(zero.bank.records.length, 3);
});

test('tail capacity: pacing cannot extend deadline or claim an unstarted PART', async t => {
  for (const setupMs of [0, 79, 80, 81]) await t.test(`bank setup consumes ${setupMs} of 80 ms`, async t => {
    const input = await fixture(t);
    const second = { ...part, partId: 'SECOND', waterPoint: [11, 56] };
    const cursorPath = path.join(input.privateCacheRoot, 'weather-component-fallback-cursor.json');
    const priorCursor = JSON.stringify({ kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1,
      openMeteoLastAttemptedPartId: second.partId });
    await fs.mkdir(input.privateCacheRoot, { recursive: true });
    await fs.writeFile(cursorPath, priorCursor);
    // Control only the test clock: ordinary bank I/O still runs, and the
    // production deadline must include it rather than restart after setup.
    let elapsed = 0, setupObserved = false;
    const originalLstat = fs.lstat;
    t.mock.method(performance, 'now', () => elapsed);
    t.mock.method(fs, 'lstat', async (...args) => {
      const result = await originalLstat(...args);
      if (!setupObserved && args[0] === input.privateCacheRoot) {
        setupObserved = true;
        elapsed = setupMs;
      }
      return result;
    });
    const starts = [];
    const result = await runOpenMeteoPartRuntime({ ...input, parts: [part, second], budgetMs: 80,
      requiredPairs: [part, second].map(row => ({ partId: row.partId, component: 'wind', validTime: reference })),
      fetchImpl: async () => { starts.push(performance.now()); return new Response(responseText); },
    });
    const expectedStarts = setupMs < 80 ? 1 : 0;
    assert.equal(setupObserved, true);
    assert.deepEqual(starts, expectedStarts ? [setupMs] : []);
    assert.ok(starts.every(instant => instant < 80), 'no HTTP start at or after the original deadline');
    assert.equal(result.summary.requests, expectedStarts);
    assert.equal(result.summary.transport.httpAttempts, expectedStarts);
    assert.equal(result.summary.transport.budgetReached, 1);
    assert.equal(result.summary.transport.httpAttemptLimit, 800);
    assert.equal(result.summary.transport.pacingMinimumIntervalMs, 150);
    assert.equal(result.summary.deferred, 2 - expectedStarts);
    assert.equal(result.summary.deferredByComponent.wind, 2 - expectedStarts);
    assert.equal(result.summary.lastAttemptedPartId, expectedStarts ? part.partId : null);
    assert.equal(result.summary.failures.length, 0);
    assert.equal(result.bank.records.length, expectedStarts);
    const cursorText = await fs.readFile(cursorPath, 'utf8');
    if (expectedStarts) {
      assert.equal(JSON.parse(cursorText).openMeteoLastAttemptedPartId, part.partId);
      assert.equal(selected(result.index).values.windSpeedMps, 4);
    } else assert.equal(cursorText, priorCursor, 'pre-start deferral leaves the saved cursor unchanged');
    assert.equal(JSON.parse(await fs.readFile(input.bankPath, 'utf8')).bankSha256, result.bank.bankSha256);
  });
  const input = await fixture(t);
  for (const options of [{ maxHttpAttempts: 801 }, { maxHttpAttempts: 0 }, { minimumHttpStartIntervalMs: 149 }]) {
    await assert.rejects(runOpenMeteoPartRuntime({ ...input, ...options,
      fetchImpl: () => { throw new Error('invalid bounds must stop before HTTP'); } }), /BUDGET_INVALID/);
  }
});
