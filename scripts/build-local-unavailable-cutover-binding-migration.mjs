// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260912141641_state_only_hold_closure_v2_binding.sql';
const destination =
  'supabase/migrations/20260912194206_local_unavailable_cutover_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '548c29250363ecb45d19408141ff5206e86de273092c4a9d15add2e774a8cfc9',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    'c1e753719e856b2c97291c01cd18186598f6acc4409e619681e0c45752acab19',
    'd3b6c829dfb0d66251d7ebf0b0f4d0a1c357bbf0083aa6076b3f8743eaca397d',
    3,
  ],
  [
    '7f6e1c2d1f30a0a81c61bfdd9af43fe5c4c541c469de6eb4551ed613ec9baf43',
    '87ea235809d1c305d93fd04ae434ecca07e2c573b5e4929b5b8a7446687eec06',
    1,
  ],
  [
    'd4fd862002642b173f937b8ded725e15a5ca752ebb5143a5b60386f72133ae89',
    '343f9f539146c61fbd0b75e2c4d1148189f56602abb85bff24bbbd708e43aae2',
    2,
  ],
  ['20260912141641', '20260912194206', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated state-only hold closure-v2 binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated local-unavailable cutover binding successor; predecessor remains immutable.',
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
    'Local-unavailable cutover binding successor is stale',
  );
}
console.log(
  'Local-unavailable cutover binding migration verified against immutable predecessor; no database access.',
);
