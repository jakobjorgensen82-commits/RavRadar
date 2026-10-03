import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import { copernicusOfflineEnvironment } from './lib/copernicus-offline-environment.mjs';
import { prepareWeatherComponentRuntime, persistWeatherComponentSelections } from './lib/weather-component-runtime.mjs';
import { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';
import { recordSelectedWeatherComponents, snapshotWeatherComponentSelectionHistory }
  from './lib/weather-component-selection-history.mjs';
import { loadCopernicusComponentAuthority } from './lib/copernicus-component-index.mjs';
import { runCopernicusComponentRuntime } from './lib/copernicus-component-runtime.mjs';

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
  const logged = safeWeatherComponentSummary(result.summary).copernicus;
  for (const [scope, unaccounted] of [[logged, 3], [logged.passes.critical, 1], [logged.passes.upgrade, 2]]) {
    assert.deepEqual(scope.retryableReasonAccounting, { knownReasonReportedAttempts: 0,
      unaccountedReasonReportedAttempts: unaccounted, reportedCountsConsistent: true });
    assert.equal(scope.attemptCountsComplete, true);
  }
  assert.ok(!JSON.stringify(logged).includes('CP_COMPONENT_REQUEST_TIMEOUT'),
    'real combined/pass output exposes only the reported remainder, not an unlisted reason');
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
  const logged = safeWeatherComponentSummary(result.summary).copernicus;
  assert.deepEqual(logged.retryableReasonAccounting, { knownReasonReportedAttempts: 0,
    unaccountedReasonReportedAttempts: 0, reportedCountsConsistent: true });
  assert.equal(logged.attemptCountsComplete, false, 'reconciled reported totals are not full history');
  assert.deepEqual(logged.passes.critical.retryableReasonAccounting, { knownReasonReportedAttempts: 0,
    unaccountedReasonReportedAttempts: null, reportedCountsConsistent: null });
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
  const logged = safeWeatherComponentSummary(result.summary).copernicus;
  for (const scope of [logged, logged.passes.critical]) {
    assert.deepEqual(scope.retryableReasonAccounting, { knownReasonReportedAttempts: 0,
      unaccountedReasonReportedAttempts: 0, reportedCountsConsistent: true });
    assert.equal(scope.attemptCountsComplete, false, 'recovered zero is not evidence of zero actual work');
  }
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

test('selection persistence preserves primary write/sync/rename error through own close and cleanup failures', async t => {
  for (const stage of ['writeFile', 'sync', 'rename']) {
    await t.test(stage, async st => {
      const prepared = await prepareWeatherComponentRuntime(await fixture(st, {
        copernicusBudgetMs: 0, openMeteoBudgetMs: 0,
      }));
      await persistWeatherComponentSelections(prepared);
      const baseline = await fs.readFile(prepared.historyPath);
      recordSelectedWeatherComponents(prepared.inputs.componentSelectionHistory, parts[0], [{ time: at(0),
        windProvenance: { status: 'verified', provider: 'open-meteo', componentRecordId: sha('f'),
          sourceClass: 'response-bound-official-component', entityId: 'PART::P1', parentZoneId: 'Z1',
          samplingPoint: parts[0].waterPoint } }]);
      const originalOpen = fs.open.bind(fs), originalRename = fs.rename.bind(fs);
      const originalRm = fs.rm.bind(fs);
      const primary = new Error(`SYNTHETIC_SELECTION_${stage.toUpperCase()}`);
      const closeFailure = new Error('SYNTHETIC_SELECTION_CLOSE');
      const cleanupFailure = new Error('SYNTHETIC_SELECTION_CLEANUP');
      let temporary, closes = 0, cleanups = 0;
      st.mock.method(fs, 'open', async (file, ...args) => {
        const handle = await originalOpen(file, ...args);
        if (!String(file).startsWith(`${prepared.historyPath}.`)) return handle;
        temporary = file;
        return {
          writeFile: async (...values) => {
            await handle.writeFile(...values);
            if (stage === 'writeFile') throw primary;
          },
          sync: async () => {
            await handle.sync();
            if (stage === 'sync') throw primary;
          },
          close: async () => {
            closes += 1;
            await handle.close();
            if (stage !== 'rename') throw closeFailure;
          },
        };
      });
      st.mock.method(fs, 'rename', async (from, to) => {
        if (from === temporary && stage === 'rename') throw primary;
        return originalRename(from, to);
      });
      st.mock.method(fs, 'rm', async (file, ...args) => {
        if (file === temporary) { cleanups += 1; throw cleanupFailure; }
        return originalRm(file, ...args);
      });
      await assert.rejects(persistWeatherComponentSelections(prepared), error => error === primary);
      assert.equal(closes, 1, 'attempt only the owned handle close');
      assert.equal(cleanups, 1, 'attempt only this write temporary cleanup');
      assert.deepEqual(await fs.readFile(prepared.historyPath), baseline,
        'the previous committed selection history is not replaced after failure');
      assert.ok((await fs.stat(temporary)).isFile(), 'failed cleanup is not repaired persistence');
    });
  }
});

test('selection persistence keeps close-only and cleanup-only failures hard', async t => {
  for (const stage of ['close', 'cleanup']) {
    await t.test(stage, async st => {
      const prepared = await prepareWeatherComponentRuntime(await fixture(st, {
        copernicusBudgetMs: 0, openMeteoBudgetMs: 0,
      }));
      await persistWeatherComponentSelections(prepared);
      const baseline = await fs.readFile(prepared.historyPath);
      recordSelectedWeatherComponents(prepared.inputs.componentSelectionHistory, parts[0], [{ time: at(0),
        windProvenance: { status: 'verified', provider: 'open-meteo', componentRecordId: sha('f'),
          sourceClass: 'response-bound-official-component', entityId: 'PART::P1', parentZoneId: 'Z1',
          samplingPoint: parts[0].waterPoint } }]);
      const originalOpen = fs.open.bind(fs), originalRm = fs.rm.bind(fs);
      const failure = new Error(`SYNTHETIC_SELECTION_${stage.toUpperCase()}`);
      let temporary, closes = 0, cleanups = 0;
      st.mock.method(fs, 'open', async (file, ...args) => {
        const handle = await originalOpen(file, ...args);
        if (!String(file).startsWith(`${prepared.historyPath}.`)) return handle;
        temporary = file;
        return {
          writeFile: (...values) => handle.writeFile(...values),
          sync: () => handle.sync(),
          close: async () => {
            closes += 1;
            await handle.close();
            if (stage === 'close') throw failure;
          },
        };
      });
      st.mock.method(fs, 'rm', async (file, ...args) => {
        if (file === temporary) {
          cleanups += 1;
          if (stage === 'cleanup') throw failure;
        }
        return originalRm(file, ...args);
      });
      await assert.rejects(persistWeatherComponentSelections(prepared), error => error === failure);
      assert.equal(closes, 1);
      assert.equal(cleanups, 1);
      const committed = await fs.readFile(prepared.historyPath);
      if (stage === 'close') assert.deepEqual(committed, baseline);
      else {
        assert.notDeepEqual(committed, baseline, 'the complete new ledger was atomically installed');
        assert.deepEqual(JSON.parse(committed), snapshotWeatherComponentSelectionHistory(
          prepared.inputs.componentSelectionHistory));
      }
      // Cleanup-only follows a successful atomic rename; it must not claim
      // a successful return or roll back/remove the valid committed history.
      await assert.rejects(fs.stat(temporary), { code: 'ENOENT' });
    });
  }
});

test('actual offline CP authority retains its child output failure through owned cleanup', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-output-failure-test-'));
  const remove = fs.rm.bind(fs), makeTemporary = fs.mkdtemp.bind(fs);
  const actualSpawn = childProcess.spawn.bind(childProcess);
  const python = process.env.PYTHON ?? 'python';
  const runner = fileURLToPath(new URL('./run-copernicus-weather-components.py', import.meta.url));
  try {
    childProcess.execFileSync(python, [fileURLToPath(new URL(
      './test-copernicus-component-production.py', import.meta.url)), '--prepare-fixture', root],
    { windowsHide: true, stdio: 'ignore', env: copernicusOfflineEnvironment() });
    const options = { planPath: path.join(root, 'plan.json'), bankPath: path.join(root, 'bank.json'),
      cacheDirectory: path.join(root, 'cache'), pythonExecutable: python };
    const originalBank = await fs.readFile(options.bankPath);
    for (const stage of ['valid-output-control', 'output-failure-only', 'output-and-cleanup-failure',
      'cleanup-failure-only', 'post-spawn-error-and-cleanup-failure']) {
      await t.test(stage, async st => {
        let temporary, output, closeResult, closePromise, launches = 0, cleanups = 0;
        const collision = stage.startsWith('output-');
        const postSpawnError = stage === 'post-spawn-error-and-cleanup-failure';
        const cleanupFailure = new Error('SYNTHETIC_CP_OWN_AUTHORITY_CLEANUP_FAILED');
        st.mock.method(fs, 'mkdtemp', async prefix => {
          const created = await makeTemporary(prefix);
          if (path.basename(String(prefix)) !== 'rr-cp-component-authority-') return created;
          assert.equal(path.dirname(created), os.tmpdir());
          temporary = created;
          output = path.join(created, 'authority.json');
          // A directory at the actual owned output file prevents its real
          // atomic commit. No argv, executable, verifier or factory is replaced.
          if (collision) await fs.mkdir(output);
          return created;
        });
        st.mock.method(childProcess, 'spawn', (executable, args, spawnOptions) => {
          assert.equal(executable, python);
          assert.deepEqual(args, [runner, '--plan', options.planPath, '--bank', options.bankPath,
            '--cache-directory', options.cacheDirectory, '--output', output, '--verify-only']);
          assert.equal(spawnOptions.windowsHide, true);
          assert.equal(spawnOptions.stdio, 'ignore');
          assert.equal(spawnOptions.detached, process.platform !== 'win32');
          const child = actualSpawn(executable, args, spawnOptions);
          launches++;
          assert.ok(Number.isInteger(child.pid) && child.pid > 0);
          closePromise = new Promise(resolve => child.once('close', (code, signal) => {
            closeResult = { code, signal };
            resolve();
          }));
          if (postSpawnError) child.once('spawn', () => {
            assert.equal(closeResult, undefined);
            assert.equal(cleanups, 0);
            // Observe a genuine running OS child through the same event seam.
            // The actual CLI, argv, bytes, PID and eventual close are untouched.
            child.emit('error', new Error('SYNTHETIC_CP_POST_SPAWN_ERROR'));
            child.emit('error', new Error('SYNTHETIC_CP_SECOND_POST_SPAWN_ERROR'));
          });
          return child;
        });
        st.mock.method(fs, 'rm', async (file, ...args) => {
          if (file === temporary) {
            cleanups++;
            assert.deepEqual(closeResult, { code: collision ? 1 : 0, signal: null },
              'the real Python child must close before owned authority cleanup');
            if (stage === 'output-and-cleanup-failure' || stage === 'cleanup-failure-only' || postSpawnError) throw cleanupFailure;
          }
          return remove(file, ...args);
        });
        syncBuiltinESMExports();
        try {
          let result, failure;
          try { result = await loadCopernicusComponentAuthority(options); }
          catch (error) { failure = error; }
          assert.equal(launches, 1);
          assert.equal(cleanups, 1);
          assert.deepEqual(await fs.readFile(options.bankPath), originalBank);
          if (stage === 'cleanup-failure-only') {
            assert.equal(result, undefined);
            assert.equal(failure, cleanupFailure, 'cleanup-only failure must remain a hard rejection');
          } else if (!collision && !postSpawnError) {
            assert.equal(failure, undefined);
            assert.equal(result.candidates.length, 2);
          } else {
            assert.equal(result, undefined);
            assert.equal(failure?.message, postSpawnError
              ? 'CP_COMPONENT_BYTE_VERIFIER_UNAVAILABLE' : 'CP_COMPONENT_BYTE_VERIFICATION_FAILED',
              'owned cleanup must not mask the safe real-child output failure');
            assert.equal(failure.cause, undefined);
            assert.notEqual(failure, cleanupFailure);
          }
        } finally {
          if (closePromise) await closePromise;
          st.mock.restoreAll();
          syncBuiltinESMExports();
          if (temporary) {
            assert.equal(path.dirname(temporary), os.tmpdir());
            assert.ok(path.basename(temporary).startsWith('rr-cp-component-authority-'));
            await remove(temporary, { recursive: true, force: true });
          }
        }
      });
    }
  } finally {
    await remove(root, { recursive: true, force: true });
  }
});

test('actual CP callers retain the owned child before fallback or outer cleanup after post-spawn error', async t => {
  for (const caller of ['authority', 'cp-runtime', 'normal-prepare']) await t.test(caller, async st => {
    const options = await fixture(st, { copernicusBudgetMs: 0, openMeteoBudgetMs: 0 });
    const input = path.join(options.privateCacheRoot, 'synthetic-plan-input.json');
    await fs.writeFile(input, '{}', 'utf8');
    const children = [], remove = fs.rm.bind(fs), timer = globalThis.setTimeout;
    let settled = false, cleanupCalls = 0, omAfterCp = 0, operation, stop, terminalError;
    let stopAttempts = 0;
    let asynchronousStopFailure = false;
    const stopFailure = new Error('SYNTHETIC_CP_STOP_EXECUTION_FAILED');
    st.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) => {
      if (delay >= 120_000) stop = callback;
      return timer(callback, delay, ...args);
    });
    st.mock.method(process, 'kill', () => { stopAttempts++; throw stopFailure; });
    st.mock.method(childProcess, 'spawn', (executable, args) => {
      // No fake PID is ever sent to an OS stop command.
      if (executable === 'taskkill.exe') {
        stopAttempts++;
        if (!asynchronousStopFailure) throw stopFailure;
        const killer = new EventEmitter();
        queueMicrotask(() => killer.emit('error', stopFailure));
        return killer;
      }
      assert.ok(args.includes('--plan-input'));
      assert.ok(children.every(child => child.testClosed), 'a fallback may only launch after earlier owned children close');
      // Existing subprocess seam, never an authority/factory replacement.
      // No OS process/provider is launched and these placeholder plan bytes
      // are never admitted. A known-owned child has not yet emitted close.
      const child = new EventEmitter();
      child.pid = 12345; // Retained synthetic object only; never an OS target.
      child.kill = () => { stopAttempts++; throw stopFailure; };
      children.push(child);
      queueMicrotask(() => {
        child.emit('spawn');
        child.emit('error', new Error('SYNTHETIC_CP_POST_SPAWN_ERROR'));
      });
      return child;
    });
    st.mock.method(fs, 'rm', async (file, ...args) => {
      if (path.basename(String(file)).startsWith('rr-cp-component-')) {
        assert.ok(children.every(child => child.testClosed), 'outer cleanup must await every launched child close');
        cleanupCalls++;
      }
      return remove(file, ...args);
    });
    syncBuiltinESMExports();
    try {
      const cpOptions = { privateCacheRoot: options.privateCacheRoot, parts,
        productionReferenceAt: reference, retentionStartAt: at(-48), retentionEndAt: at(120),
        planInputPath: input, bankPath: path.join(options.privateCacheRoot, 'synthetic-bank.json'),
        cacheDirectory: path.join(options.privateCacheRoot, 'synthetic-cache') };
      operation = caller === 'authority' ? loadCopernicusComponentAuthority(cpOptions)
        : caller === 'cp-runtime' ? runCopernicusComponentRuntime({ ...cpOptions,
          needs: [{ component: 'wave' }], budgetMs: 1000, requestTimeoutMs: 500,
          maximumRequests: 1, maximumDownloadBytes: 1 })
          : prepareWeatherComponentRuntime({ ...options, runCopernicus: undefined,
            runOpenMeteo: async () => { omAfterCp++; return om('b'); } });
      operation.then(() => { settled = true; }, error => { terminalError = error; settled = true; });
      for (let i = 0; i < 500 && !children.length && !settled; i++) {
        await new Promise(resolve => timer(resolve, 2));
      }
      assert.ok(children.length, 'the actual CP launcher must be reached');
      await new Promise(resolve => timer(resolve, 50));
      assert.deepEqual({ settled, cleanupCalls, launched: children.length, omAfterCp },
        { settled: false, cleanupCalls: 0, launched: 1, omAfterCp: 0 },
        'unclosed owned CP child must retain authority/plan files and block fallback/OM');
      assert.equal(typeof stop, 'function', 'post-spawn error must retain the existing stop timer');
      assert.doesNotThrow(stop, 'failed owned stop must keep awaiting close, not crash or release callers');
      assert.ok(stopAttempts > 0);
      asynchronousStopFailure = true;
      assert.doesNotThrow(stop, 'the existing fallback kill may also fail without proving closure');
      children[0].emit('error', new Error('SYNTHETIC_CP_SECOND_POST_SPAWN_ERROR'));
      await new Promise(resolve => timer(resolve, 20));
      assert.deepEqual({ settled, cleanupCalls, launched: children.length, omAfterCp },
        { settled: false, cleanupCalls: 0, launched: 1, omAfterCp: 0 },
        'failed stop and repeated error are still not closure evidence');
    } finally {
      // Test teardown closes every retained artificial child before any
      // fixture cleanup. No actual process or production data exists here.
      for (let i = 0; i < 500; i++) {
        for (const child of children) if (!child.testClosed) {
          child.testClosed = true;
          child.emit('close', 1, null);
        }
        if (settled) break;
        await new Promise(resolve => timer(resolve, 2));
      }
      if (operation) await operation.catch(() => {});
      st.mock.restoreAll();
      syncBuiltinESMExports();
    }
    if (caller === 'authority') {
      assert.equal(terminalError?.message, 'CP_COMPONENT_BYTE_VERIFIER_UNAVAILABLE');
      assert.equal(terminalError.cause, undefined);
    }
  });
});
