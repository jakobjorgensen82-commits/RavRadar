// Reproducible binding-only successor. The applied H0 migration is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260914020000_h0_state_snapshot_binding.sql';
const destination =
  'supabase/migrations/20260914234500_post_cutover_current_hold_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
const predecessorIntegratedBundleSha256 =
  '327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01';
const currentIntegratedBundleSha256 =
  '65148b4ae3e0bee78826f82cefe8d002ec5b0adcc17f97a1aca81ef1b2c095fa';
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  'f664d2a36f9a9bde668a542ac74b2312eab56c1c0ef9087cc26ef71f4f3b491c',
  'Applied H0 predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    predecessorIntegratedBundleSha256,
    currentIntegratedBundleSha256,
    3,
  ],
  [
    '1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1',
    '7fe45de727963d9cbf0285465b48dbef1e11e4b8ba1f4469c9dea59d8ccfd97b',
    2,
  ],
  [
    'e272bd48de768e593904a362df92f40b5e5ab2c3dac0263216518d04b8bf4ea1',
    '81045427e86a26b7c853a1f8832aece9f73afc2a4092c5292ec9e6730154b8a2',
    1,
  ],
  ['20260914020000', '20260914234500', 2],
]) {
  assert.equal(source.split(before).length - 1, count, 'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const integratedBindingBegin = '-- RAVSCORE_INTEGRATED_BINDING_BEGIN';
const integratedBindingEnd = '-- RAVSCORE_INTEGRATED_BINDING_END';
const integratedBindingStart = source.indexOf(integratedBindingBegin);
const integratedBindingFinish = source.indexOf(integratedBindingEnd, integratedBindingStart);
assert.ok(integratedBindingStart >= 0 && integratedBindingFinish > integratedBindingStart,
  'Integrated trip binding block is missing');
const integratedBindingBlock = source.slice(integratedBindingStart, integratedBindingFinish);
const strictBundleLine =
  `      and p_calibration_features ->> 'modelBundleSha256' = '${currentIntegratedBundleSha256}'`;
assert.equal(integratedBindingBlock.split(strictBundleLine).length - 1, 1,
  'Integrated trip binding bundle line changed unexpectedly');
const transitionBundleLines = [
  '      -- The exact public predecessor remains admissible only while the central',
  '      -- activeModelBinding still names it. The active-binding guard below rejects',
  '      -- this predecessor automatically after maintenance completion.',
  "      and p_calibration_features ->> 'modelBundleSha256' in (",
  `        '${predecessorIntegratedBundleSha256}',`,
  `        '${currentIntegratedBundleSha256}'`,
  '      )',
].join('\n');
source = source.slice(0, integratedBindingStart)
  + integratedBindingBlock.replace(strictBundleLine, transitionBundleLines)
  + source.slice(integratedBindingFinish);
assert.equal(source.split(predecessorIntegratedBundleSha256).length - 1, 1,
  'Only the exact integrated transition bridge may retain the predecessor bundle');
const predecessorComment =
  '-- Generated H0 state-snapshot binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated post-cutover current-hold binding successor; predecessor remains immutable.',
);
assert.ok(
  process.argv.length === 2
    || (process.argv.length === 3 && ['--write', '--check'].includes(process.argv[2])),
  'Unsupported migration generator option',
);
if (process.argv.includes('--write')) {
  await fs.writeFile(destination, source, 'utf8');
} else {
  assert.equal(
    normalize(await fs.readFile(destination, 'utf8')),
    source,
    'Post-cutover current-hold binding successor is stale',
  );
}
console.log(
  'Post-cutover current-hold binding migration verified against immutable H0 predecessor; no database access.',
);
