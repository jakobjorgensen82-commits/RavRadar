// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260912194206_local_unavailable_cutover_binding.sql';
const destination =
  'supabase/migrations/20260913010000_public_runtime_oracle_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '24a7450ae913ceef37375e6df200a0e85e6a001128c4a1ca9b6652ae6642fbd8',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    'a575f767abf127ec1677268b9f310f5c6f569ea6d822af5ab09e16c187389bd6',
    '79d5118a1b37b542532721ebe1b943df00b646e1625b991d5a9ad597d36d0ae8',
    3,
  ],
  [
    'dce13d51ab2cdbf80effb17634c451f7318a88efee021d542f0e7656a689ea5f',
    '9d3960137054a1ab40ec10e4514425c436f979fac18ce3f92137512e47b629e6',
    1,
  ],
  [
    'ca18452294f87451bda4e73c188e18990379f9328ca1107a571459f5ae1d9528',
    '84311c920b3f2697f31fe32ebef4d7932f59f5fe784b2b7d1dbf679d9007a28c',
    2,
  ],
  ['20260912194206', '20260913010000', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated local-unavailable cutover binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated public-runtime oracle binding successor; predecessor remains immutable.',
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
    'Public-runtime oracle binding successor is stale',
  );
}
console.log(
  'Public-runtime oracle binding migration verified against immutable predecessor; no database access.',
);
