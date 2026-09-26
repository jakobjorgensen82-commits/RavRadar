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

test('bounded Copernicus upgrade pass overtakes admitted Open-Meteo wave and temperature', async t => {
  const calls = [];
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: (_part, inputs) => {
      const values = rows();
      for (const [offset, component] of [[0, 'wave'], [1, 'waterTemperature']]) {
        values[offset][`${component}Provenance`].provider =
          inputs.copernicusComponentIndex?.replacement ? 'copernicus' : 'open-meteo';
      }
      values[2].windProvenance.provider = 'open-meteo';
      return values;
    },
    runCopernicus: async options => {
      calls.push(['cp', options.budgetMs]);
      if (options.budgetMs > 0) {
        assert.deepEqual(options.needs.map(row => [row.component, row.purpose]), [
          ['wave', 'OPEN_METEO_UPGRADE'], ['waterTemperature', 'OPEN_METEO_UPGRADE'],
        ]);
        return cp('d', { replacement: true });
      }
      return cp('c');
    },
    runOpenMeteo: async options => {
      calls.push(['om', options.budgetMs]);
      assert.deepEqual(options.requiredPairs, []);
      return om('b');
    },
  }));
  assert.deepEqual(calls, [['cp', 0], ['cp', 1000], ['om', 1000]]);
  assert.equal(result.summary.pendingCopernicusUpgrades, 0);
  assert.deepEqual(result.copernicusUpgradeNeeds, []);
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

test('Copernicus reports critical and upgrade attempts separately and totals both passes', async t => {
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: (_part, inputs) => {
      const values = rows();
      if (!inputs.copernicusComponentIndex?.criticalDone) values[0].wavePeriodS = null;
      values[1].waterTemperatureProvenance.provider = inputs.copernicusComponentIndex?.upgradeDone
        ? 'copernicus' : 'open-meteo';
      return values;
    },
    runCopernicus: async options => {
      if (options.budgetMs === 0) return cp('c');
      const upgrade = options.needs[0].purpose === 'OPEN_METEO_UPGRADE';
      return { ...cp(upgrade ? 'e' : 'd', { criticalDone: true, upgradeDone: upgrade }), summary: {
        status: 'CANDIDATES_READY', admittedCandidates: upgrade ? 17 : 15,
        remainingNeeds: 0, attempts: upgrade ? 3 : 2, retryableAttempts: upgrade ? 2 : 1,
        retryableReasons: { CP_COMPONENT_REQUEST_TIMEOUT: upgrade ? 2 : 1 },
        transportFailure: null, attemptCountsComplete: true,
      } };
    },
  }));
  const summary = result.summary.copernicus;
  assert.equal(summary.attempts, 5);
  assert.equal(summary.retryableAttempts, 3);
  assert.deepEqual(summary.retryableReasons, { CP_COMPONENT_REQUEST_TIMEOUT: 3 });
  assert.equal(summary.admittedCandidates, 17, 'final bank inventory, not two summed snapshots');
  assert.equal(summary.attemptCountsComplete, true);
  assert.equal(summary.passes.critical.attempts, 2);
  assert.equal(summary.passes.upgrade.attempts, 3);
  assert.equal(summary.passes.critical.requestedNeeds, 1);
  assert.equal(summary.passes.upgrade.requestedNeeds, 1);
  assert.equal(summary.remainingNeeds, 0);
  assert.equal(summary.remainingUpgradeNeeds, 0);
  assert.equal(result.sourceMarker.copernicusBankSha256, `sha256:${sha('e')}`);
});

test('an interrupted critical pass cannot be hidden by a later successful upgrade or offline reread', async t => {
  let interrupted = false;
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: (_part, inputs) => {
      const values = rows();
      values[0].wavePeriodS = null;
      values[1].waterTemperatureProvenance.provider = inputs.copernicusComponentIndex?.upgradeDone
        ? 'copernicus' : 'open-meteo';
      return values;
    },
    runCopernicus: async options => {
      if (options.budgetMs === 0) return cp(interrupted ? 'd' : 'c');
      if (options.needs[0].purpose !== 'OPEN_METEO_UPGRADE') {
        interrupted = true;
        throw new Error('private provider detail must not appear in the safe report');
      }
      return { ...cp('e', { upgradeDone: true }), summary: {
        status: 'CANDIDATES_READY', attempts: 3, retryableAttempts: 0,
        retryableReasons: {}, remainingNeeds: 0, transportFailure: null, attemptCountsComplete: true,
      } };
    },
  }));
  const summary = result.summary.copernicus;
  assert.equal(summary.attempts, 3, 'known attempts only, not an assertion of total work');
  assert.equal(summary.attemptCountsComplete, false);
  assert.equal(summary.transportFailure, 'CP_COMPONENT_REFRESH_FAILED');
  assert.equal(summary.passes.critical.outcome, 'FAILED');
  assert.equal(summary.passes.critical.attempts, null);
  assert.equal(summary.passes.upgrade.outcome, 'COMPLETED');
  assert.equal(summary.remainingNeeds, 1, 'current critical gap, not last upgrade stage remainingNeeds=0');
  assert.equal(summary.remainingUpgradeNeeds, 0);
  assert.ok(!JSON.stringify(summary).includes('private provider detail'));
});

test('offline recovery preserves explicit unknown attempt counts for its interrupted invocation', async t => {
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: () => { const values = rows(); values[0].wavePeriodS = null; return values; },
    runCopernicus: async options => ({ ...cp('d'), summary: {
      status: 'IN_PROGRESS', attempts: 0, retryableAttempts: 0, retryableReasons: {}, remainingNeeds: 1,
      transportFailure: options.budgetMs > 0 ? 'CP_COMPONENT_PRODUCER_FAILED_OR_TIMED_OUT' : null,
      attemptCountsComplete: options.budgetMs === 0,
    } }),
  }));
  assert.equal(result.summary.copernicus.attemptCountsComplete, false);
  assert.equal(result.summary.copernicus.passes.critical.outcome, 'RECOVERED_AFTER_TRANSPORT_FAILURE');
  assert.equal(result.summary.copernicus.passes.upgrade, null);
  assert.equal(result.summary.copernicus.transportFailure, 'CP_COMPONENT_PRODUCER_FAILED_OR_TIMED_OUT');
});

test('later Open-Meteo gains must not be attributed to the Copernicus boundary', async t => {
  const result = await prepareWeatherComponentRuntime(await fixture(t, {
    readVerifiedHourly: (_part, inputs) => {
      const values = rows();
      if (!inputs.openMeteoComponentIndex?.filled) values[0].wavePeriodS = null;
      return values;
    },
    runOpenMeteo: async () => om('d', { filled: true }),
  }));
  assert.equal(result.summary.afterCopernicus.wave.missing, 1);
  assert.equal(result.summary.copernicus.remainingNeeds, 1);
  assert.equal(result.summary.after.wave.missing, 0);
  assert.equal(result.remainingNeeds.length, 0);
});
