import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCopernicusComponentAuthority, validateCopernicusComponentCandidates,
  selectedCopernicusComponentRecord } from './lib/copernicus-component-index.mjs';
import { runCopernicusComponentRuntime } from './lib/copernicus-component-runtime.mjs';
import { sealCopernicusComponentProjection } from './lib/copernicus-component-projection.mjs';
import { verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';
import { buildFeggesundWaveInputProofEntry } from './lib/feggesund-wave-proxy.mjs';

const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-index-test-'));
try {
  const python = process.env.PYTHON ?? 'python';
  execFileSync(python, [fileURLToPath(new URL('./test-copernicus-component-production.py', import.meta.url)), '--prepare-fixture', folder],
    { stdio: 'pipe', env: { ...process.env, PYTHONUTF8: '1' } });
  const input = JSON.parse(await fs.readFile(path.join(folder, 'input.json'), 'utf8'));
  const options = { planPath: path.join(folder, 'plan.json'), bankPath: path.join(folder, 'bank.json'), cacheDirectory: path.join(folder, 'cache'), pythonExecutable: python };
  const result = await loadCopernicusComponentAuthority(options);
  assert.equal(result.candidates.length, 2);
  const part = { ...input.parts[0], zoneId: input.parts[0].parentZoneId, sourceZoneId: 'WRONG-HISTORICAL-SOURCE' };
  const index = validateCopernicusComponentCandidates(result.candidates, { parts: [part], authority: result.authority });
  const selected = selectedCopernicusComponentRecord(index, { part, validTime: '2026-09-19T00:00:00.000Z', component: 'wave' });
  assert.equal(selected.time, '2026-09-19T00:00:00Z');
  assert.equal(selected.source.validTime, selected.time);
  assert.equal(selectedCopernicusComponentRecord(index, { part, validTime: '2026-09-19T01:00:00.000Z', component: 'wave' }), null);
  assert.throws(() => validateCopernicusComponentCandidates(result.candidates, { parts: [part], authority: {} }), /AUTHORITY_REQUIRED/);
  const forged = structuredClone(result.candidates[0]);
  forged.values.waveHeightM = '3ff0000000000000';
  forged.projection = sealCopernicusComponentProjection(forged);
  assert.throws(() => validateCopernicusComponentCandidates([forged], { parts: [part], authority: result.authority }), /ADMISSION_FAILED/);
  assert.throws(() => validateCopernicusComponentCandidates(result.candidates, { parts: [{ ...part, zoneId: 'NEW-CENTRAL' }], authority: result.authority }), /CENTRAL_TARGETS_MISMATCH/);
  const runtime = await runCopernicusComponentRuntime({ privateCacheRoot: folder, ...options, ...input, parts: [part], budgetMs: 0 });
  assert.equal(runtime.summary.admittedCandidates, 2);
  assert.match(runtime.bankSha256, /^sha256:[0-9a-f]{64}$/);
  assert.ok(selectedCopernicusComponentRecord(runtime.index, { part, validTime: selected.time, component: 'wave' }));
  const emptyNeeds = await runCopernicusComponentRuntime({ privateCacheRoot: folder, ...options, ...input, parts: [part], needs: [], budgetMs: 0 });
  assert.equal(emptyNeeds.summary.admittedCandidates, 2);
  assert.equal(emptyNeeds.bankSha256, runtime.bankSha256);
  const reassigned = { ...part, zoneId: 'NEW-CENTRAL' };
  const rebased = await runCopernicusComponentRuntime({ privateCacheRoot: folder, ...options, ...input, parts: [reassigned], budgetMs: 0 });
  assert.equal(rebased.summary.admittedCandidates, 0);
  assert.equal(selectedCopernicusComponentRecord(rebased.index, { part: reassigned, validTime: selected.time, component: 'wave' }), null);
  const original = path.join(folder, 'cache', 'objects', selected.source.subsetSha256.slice(7) + '.nc');
  await fs.appendFile(original, 'synthetic-corruption');
  const corrupted = await loadCopernicusComponentAuthority(options);
  assert.equal(corrupted.candidates.length, 0);
  assert.equal(corrupted.recordFailures.length, 2);
  const adapterFolder = path.join(folder, 'adapter');
  execFileSync(python, [fileURLToPath(new URL('./test-copernicus-component-production.py', import.meta.url)), '--prepare-adapter-fixture', adapterFolder],
    { stdio: 'pipe', env: { ...process.env, PYTHONUTF8: '1' } });
  const adapterInput = JSON.parse(await fs.readFile(path.join(adapterFolder, 'input.json'), 'utf8'));
  const adapterRuntime = await runCopernicusComponentRuntime({ privateCacheRoot: adapterFolder, ...adapterInput,
    bankPath: path.join(adapterFolder, 'bank.json'), cacheDirectory: path.join(adapterFolder, 'cache'), parts: [part], budgetMs: 0 });
  const componentInputs = { copernicusComponentIndex: adapterRuntime.index, productionReferenceAt: '2026-09-19T00:00:00.000Z' };
  const canonicalTime = '2026-09-19T00:00:00.000Z';
  const hours = verifiedIntegratedPartHourly({ hourly: [{ time: canonicalTime }] }, {}, `PART::${part.partId}`, part, componentInputs);
  assert.equal(hours[0].waveHeightM, 1);
  assert.equal(hours[0].wavePeriodS, 5);
  assert.equal(hours[0].waveProvenance.provider, 'copernicus');
  assert.equal(hours[0].waveProvenance.status, 'verified');
  assert.equal(hours[0].waterTemperatureC, 10);
  assert.equal(hours[0].waterLevelCm, null, 'legacy reserve level is excluded by DMI-only policy');
  assert.equal(selectedCopernicusComponentRecord(adapterRuntime.index,
    { part, validTime: canonicalTime, component: 'waterLevel' }), null);
  assert.equal(adapterRuntime.summary.privateSupportCandidates, 0);
  const flow = flowPointsFromForecastRecord({ hourly: hours }, part.waterPoint, canonicalTime, part, componentInputs);
  assert.equal(flow.sources.wave, 'copernicus-wave-grid');
  const proof = buildFeggesundWaveInputProofEntry({ partId: part.partId, time: canonicalTime, hour: hours[0], part, componentInputs });
  assert.equal(proof.disposition, 'DIRECT');
  console.log('Copernicus actual-byte authority, opaque index, UTC lookup, current parent and offline runtime passed.');
} finally {
  await fs.rm(folder, { recursive: true, force: true });
}
