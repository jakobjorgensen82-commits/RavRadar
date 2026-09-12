// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql';
const destination =
  'supabase/migrations/20260912141641_state_only_hold_closure_v2_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    'e545cb547923aeabc503b9d0178a996ca2ce2427200121cef6228ece29748b5a',
    'c1e753719e856b2c97291c01cd18186598f6acc4409e619681e0c45752acab19',
    3,
  ],
  [
    '157698f07f017516e52cf8f47680a2ac7c37008d8b3f9a4ee665eba2ad03e1bd',
    'd4fd862002642b173f937b8ded725e15a5ca752ebb5143a5b60386f72133ae89',
    2,
  ],
  [
    'b7555f6312519ed4e4f5fb1cd545dccd2745ce2437ce0bbd466926ecb90ecee2',
    '7f6e1c2d1f30a0a81c61bfdd9af43fe5c4c541c469de6eb4551ed613ec9baf43',
    1,
  ],
  ['20260912122607', '20260912141641', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated measured rollback-warmup binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated state-only hold closure-v2 binding successor; predecessor remains immutable.',
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
    'State-only hold closure-v2 binding successor is stale',
  );
}
console.log(
  'State-only hold closure-v2 binding migration verified against immutable predecessor; no database access.',
);
