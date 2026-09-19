import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  binary64Hex, sealCopernicusComponentProjection, verifyCopernicusComponentProjection,
} from './lib/copernicus-component-projection.mjs';

const candidate = {
  partId: 'SYNTHETIC-PART', component: 'wave', time: '2026-09-19T00:00:00Z',
  values: { waveHeightM: 0.1, wavePeriodS: 1, waveDirectionDeg: -0 },
  source: { modelRun: null, gridPoint: [2.00000000001, 1], distanceKm: 0,
    nativeTimeIndex: 2, subsetSha256: `sha256:${'a'.repeat(64)}`,
    modelReference: null, referenceVariable: 'synthetic-æøå' },
  eligibleForRequestedPurpose: true, nativeDatumOnly: false,
};
const code = `import json, sys
sys.path.insert(0, 'scripts')
from lib.copernicus_weather_component_bank import binary64_hex, seal_component_projection
candidate = json.load(sys.stdin)
one = seal_component_projection({'value': 1})
one_float = seal_component_projection({'value': 1.0})
assert one == one_float
assert one != seal_component_projection({'value': '3ff0000000000000'})
assert binary64_hex(-0.0) == binary64_hex(0)
print(json.dumps(seal_component_projection(candidate), ensure_ascii=False))`;
const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', code], {
  input: JSON.stringify(candidate), encoding: 'utf8', timeout: 15000,
  env: { ...process.env, PYTHONUTF8: '1' },
});
assert.equal(result.status, 0, result.error?.message ?? result.stderr);
const fromPython = JSON.parse(result.stdout);
assert.deepEqual(fromPython, sealCopernicusComponentProjection(candidate));
const bound = { ...candidate, projection: fromPython };
assert.equal(verifyCopernicusComponentProjection(bound), true);
assert.equal(binary64Hex(1), '3ff0000000000000');
assert.equal(binary64Hex(-0), '0000000000000000');
assert.equal(binary64Hex(0.1), '3fb999999999999a');
assert.notDeepEqual(sealCopernicusComponentProjection({ value: 1 }),
  sealCopernicusComponentProjection({ value: '3ff0000000000000' }));
assert.notDeepEqual(sealCopernicusComponentProjection({ value: 1 }),
  sealCopernicusComponentProjection({ value: 'n:3ff0000000000000' }));
assert.throws(() => binary64Hex(NaN));
assert.throws(() => binary64Hex(Infinity));
assert.throws(() => binary64Hex('1'));
for (const mutate of [
  row => { row.values.waveHeightM += 1e-12; },
  row => { row.values.waveHeightM = binary64Hex(row.values.waveHeightM); },
  row => { row.source.gridPoint[0] = binary64Hex(row.source.gridPoint[0]); },
  row => { row.source.gridPoint[0] += 1e-12; },
  row => { row.source.subsetSha256 = `sha256:${'b'.repeat(64)}`; },
  row => { row.source.modelRun = '2026-09-19T00:00:00Z'; },
  row => { row.source.requestSha256 = `sha256:${'c'.repeat(64)}`; },
  row => { row.eligibleForRequestedPurpose = false; },
  row => { row.projection.extra = true; },
]) {
  const changed = structuredClone(bound);
  mutate(changed);
  assert.equal(verifyCopernicusComponentProjection(changed), false);
}
console.log('OK: Python/JS binary64 projection binds exact values and proof; 1/1.0 and +/-0 canonical.');
