// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260916120000_valid_data_before_local_missing_binding.sql';
const destination =
  'supabase/migrations/20260917001500_partial_zone_public_metadata_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '95272e1f95d07f2616cd4bc2057cbe3c82837bea1057e04bdece33e5e2958796',
  'Applied valid-data-before-local-missing predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '8727feba7227fa546861ec73091879ca9fec07b6375f81b219c752e5d25df733',
    'd9ba75ed7f7ff2b477676e418a3ede61adf90b00aca77259bb6ccd73ee3f2906',
    3,
  ],
  [
    '65d26045e5ecd760f165fe8b7cef1d1e91ec0b2b96310a018be87a1e4c1a2959',
    'da27b811159b768bc33972e6a20621782179a7b0b1f96232a6dfd946c2cadbc7',
    2,
  ],
  [
    '3b9b0fd53b02e18fa2c3b85efe3a2108fb488e9c1ae738b998ec0476e932292c',
    'd20939c1b141a763fb20aa39b39506d79bf150860714bf1ce306f64d5314e7e6',
    1,
  ],
  ['20260916120000', '20260917001500', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated valid-data-before-local-missing binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated partial-zone public-metadata binding successor; predecessor remains immutable.',
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
    'Partial-zone public-metadata binding successor is stale',
  );
}
console.log(
  'Partial-zone public-metadata binding migration verified against immutable predecessor; no database access.',
);
