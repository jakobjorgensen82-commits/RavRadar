// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260914010000_h0_reference_recovery_binding.sql';
const destination =
  'supabase/migrations/20260914020000_h0_state_snapshot_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '298e0a4c849d3dee363792b3cf4bad302f9eb7d724dc5f686a1f9bf602d38040',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    'b144ebcd465ef783a7edd1cdb4c4fc07ee64d88185e70b783efeda1459655e04',
    '327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01',
    3,
  ],
  [
    'b4b258f21d645ec33d89c8bb7b41c879e7545b1dfb0b0a5d7c79217d401c16b9',
    '1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1',
    2,
  ],
  [
    '4894bfd82367e8de4bb37705c94c4a3a4b2db6327e4e0b79a0854e3cc6b1df7e',
    'e272bd48de768e593904a362df92f40b5e5ab2c3dac0263216518d04b8bf4ea1',
    1,
  ],
  ['20260914010000', '20260914020000', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated H0 reference-recovery binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated H0 state-snapshot binding successor; predecessor remains immutable.',
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
    'H0 state-snapshot binding successor is stale',
  );
}
console.log(
  'H0 state-snapshot binding migration verified against immutable predecessor; no database access.',
);
