// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260913010000_public_runtime_oracle_binding.sql';
const destination =
  'supabase/migrations/20260914010000_h0_reference_recovery_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '0e855c718611360ffaa633c6dd890632b791c82faed03bd4699c0a9f20a0ecd5',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '79d5118a1b37b542532721ebe1b943df00b646e1625b991d5a9ad597d36d0ae8',
    'b144ebcd465ef783a7edd1cdb4c4fc07ee64d88185e70b783efeda1459655e04',
    3,
  ],
  [
    '9d3960137054a1ab40ec10e4514425c436f979fac18ce3f92137512e47b629e6',
    '4894bfd82367e8de4bb37705c94c4a3a4b2db6327e4e0b79a0854e3cc6b1df7e',
    1,
  ],
  [
    '84311c920b3f2697f31fe32ebef4d7932f59f5fe784b2b7d1dbf679d9007a28c',
    'b4b258f21d645ec33d89c8bb7b41c879e7545b1dfb0b0a5d7c79217d401c16b9',
    2,
  ],
  ['20260913010000', '20260914010000', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated public-runtime oracle binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated H0 reference-recovery binding successor; predecessor remains immutable.',
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
    'H0 reference-recovery binding successor is stale',
  );
}
console.log(
  'H0 reference-recovery binding migration verified against immutable predecessor; no database access.',
);
