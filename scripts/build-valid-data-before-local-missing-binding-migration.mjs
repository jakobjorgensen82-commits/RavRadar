// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260914234500_post_cutover_current_hold_binding.sql';
const destination =
  'supabase/migrations/20260916120000_valid_data_before_local_missing_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '9386e0f6754ccb28521422c73ee5eb00c6c2e4f5899609e0bc3033048a83b840',
  'Applied post-cutover predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '65148b4ae3e0bee78826f82cefe8d002ec5b0adcc17f97a1aca81ef1b2c095fa',
    '8727feba7227fa546861ec73091879ca9fec07b6375f81b219c752e5d25df733',
    3,
  ],
  [
    '7fe45de727963d9cbf0285465b48dbef1e11e4b8ba1f4469c9dea59d8ccfd97b',
    '65d26045e5ecd760f165fe8b7cef1d1e91ec0b2b96310a018be87a1e4c1a2959',
    2,
  ],
  [
    '81045427e86a26b7c853a1f8832aece9f73afc2a4092c5292ec9e6730154b8a2',
    '3b9b0fd53b02e18fa2c3b85efe3a2108fb488e9c1ae738b998ec0476e932292c',
    1,
  ],
  ['20260914234500', '20260916120000', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated post-cutover current-hold binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated valid-data-before-local-missing binding successor; predecessor remains immutable.',
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
    'Valid-data-before-local-missing binding successor is stale',
  );
}
console.log(
  'Valid-data-before-local-missing binding migration verified against immutable predecessor; no database access.',
);
