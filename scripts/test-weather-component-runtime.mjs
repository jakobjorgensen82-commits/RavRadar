import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareWeatherComponentRuntime, persistWeatherComponentSelections } from './lib/weather-component-runtime.mjs';

const reference = '2026-09-19T00:00:00.000Z';
const at = offset => new Date(Date.parse(reference) + offset * 3_600_000).toISOString();
const parts = [{ partId: 'P1', zoneId: 'Z1', waterPoint: [10, 56] }];
const sha = char => char.repeat(64);
const cp = (char, index = {}) => ({ index, bankSha256: `sha256:${sha(char)}`, summary: { source: 'cp' } });
const om = (char, index = {}) => ({ index, bank: { bankSha256: sha(char) }, summary: { source: 'om' } });
const rows = () => Array.from({ length: 121 }, (_, i) => ({ time: at(i),
  windSpeedMps: 5, windDirectionDeg: 90, waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: 180,
  waterLevelCm: 10, waterLevelTrendCm3h: 0, waterTemperatureC: 15,
  ...Object.fromEntries(['wind', 'wave', 'waterLevel', 'waterTemperature'].map(component => [
    `${component}Provenance`, { status: 'verified', provider: 'dmi', modelRun: at(-6) },
  ])),
}));
async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-component-runtime-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { privateCacheRoot: root, parts, productionReferenceAt: reference,
    retentionStartAt: at(-48), retentionEndAt: at(120),
    readVerifiedHourly: rows, copernicusBudgetMs: 1000, openMeteoBudgetMs: 1000,
    loadOpenMeteo: async () => om('a'), runOpenMeteo: async () => om('b'),
    runCopernicus: async () => cp('c'), ...overrides };
}

test('CP runs first; OM receives only recomputed real holes, not aged-DMI challenges', async t => {
  const calls = [];
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: (_part, inputs) => {
      const values = rows();
      if (!inputs.copernicusComponentIndex?.wave) values[0].wavePeriodS = null;
      if (!inputs.openMeteoComponentIndex?.temperature) values[1].waterTemperatureC = null;
      values[2].waveProvenance.modelRun = at(-96);
      return values;
    },
    runCopernicus: async options => {
      calls.push(['cp', options.budgetMs]);
      if (options.budgetMs > 0) {
        assert.deepEqual(options.needs.map(row => row.purpose), ['GAP', 'GAP', 'AGED_DMI_CHALLENGE']);
        return cp('d', { wave: true });
      }
      return cp('c');
    },
    runOpenMeteo: async options => {
      calls.push(['om', options.budgetMs]);
      assert.deepEqual(options.requiredPairs, [{ partId: 'P1', component: 'waterTemperature', validTime: at(1) }]);
      return om('b', { temperature: true });
    },
  }));
  assert.deepEqual(calls, [['cp', 0], ['cp', 1000], ['om', 1000]]);
  assert.equal(result.remainingNeeds.length, 1);
  assert.equal(result.remainingNeeds[0].purpose, 'AGED_DMI_CHALLENGE');
  assert.deepEqual(result.summary.failures, []);
});

test('provider-free build does not enter a positive-budget acquisition; saved marker binds exact ledger bytes', async t => {
  const calls = [];
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    copernicusBudgetMs: 0, openMeteoBudgetMs: 0,
    runCopernicus: async options => { calls.push(options.budgetMs); return cp('c'); },
    runOpenMeteo: async options => { calls.push(options.budgetMs); return om('b'); },
  }));
  assert.deepEqual(calls, [0, 0]);
  const marker = await persistWeatherComponentSelections(result);
  assert.equal(marker.openMeteoBankSha256, sha('b'), 'not the read-only in-memory generation');
  assert.equal(marker.selectedComponentsSha256, createHash('sha256')
    .update(await fs.readFile(result.historyPath)).digest('hex'));
});

test('failed provider refresh rereads partial durable work offline and preserves sibling source', async t => {
  let cpCalls = 0, omCalls = 0;
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: () => { const values = rows(); values[0].windSpeedMps = null; return values; },
    runCopernicus: async options => {
      cpCalls += 1;
      if (options.budgetMs > 0) throw new Error('transport interrupted after checkpoint');
      assert.equal(options.budgetMs, 0);
      return cp(cpCalls === 1 ? 'c' : 'd', { durablePartial: cpCalls > 1 });
    },
    runOpenMeteo: async options => {
      omCalls += 1;
      if (options.budgetMs > 0) throw new Error('cursor write failed after bank checkpoint');
      assert.deepEqual(options.requiredPairs, []);
      return om('e', { durablePartial: true });
    },
  }));
  assert.equal(cpCalls, 3);
  assert.equal(omCalls, 2);
  assert.equal(result.sourceMarker.copernicusBankSha256, `sha256:${sha('d')}`);
  assert.equal(result.sourceMarker.openMeteoBankSha256, sha('e'));
  assert.equal(result.inputs.copernicusComponentIndex.durablePartial, true);
  assert.equal(result.inputs.openMeteoComponentIndex.durablePartial, true);
});

test('unreadable persistence cannot masquerade as saved in-memory OM bank; CP survives', async t => {
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    runOpenMeteo: async () => { throw new Error('storage unavailable'); },
  }));
  assert.equal(result.sourceMarker.openMeteoBankSha256, null);
  assert.equal(result.inputs.openMeteoComponentIndex, null);
  assert.equal(result.sourceMarker.copernicusBankSha256, `sha256:${sha('c')}`);
  assert.ok(result.summary.failures.includes('OPEN_METEO_COMPONENT_DURABLE_SNAPSHOT_UNAVAILABLE'));
});

test('DMI-only level cannot consume reserve budget or disappear from missing totals', async t => {
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: () => { const values = rows(); values[0].waterLevelCm = null; return values; },
    runCopernicus: async options => { assert.equal(options.budgetMs, 0); assert.deepEqual(options.needs, []); return cp('c'); },
    runOpenMeteo: async options => { assert.deepEqual(options.requiredPairs, []); return om('b'); },
  }));
  assert.deepEqual(result.summary.pendingAdmissionComponents, []);
  assert.deepEqual(result.summary.dmiOnlyComponents, ['waterLevel']);
  assert.equal(result.dmiOnlyNeeds.length, 1);
  assert.equal(result.summary.after.waterLevel.missing, 1);
  assert.equal(result.remainingNeeds[0].component, 'waterLevel');
});
