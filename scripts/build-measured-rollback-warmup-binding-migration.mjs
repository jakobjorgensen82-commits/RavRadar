// Reproducible, binding-only successor. The applied predecessor is a read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const predecessor =
  'supabase/migrations/20260909194000_wam_same_run_resolution_binding.sql';
const destination =
  'supabase/migrations/20260912122607_measured_rollback_warmup_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  'a76ae8bd0de79cbbbc79edcff0af92e37c2dfb3d5798e9c35e4337cbfea6606d',
  'Applied predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '8a94a4ef1f33c7e9714ac5b634037ae3a4b5d9b7c2861230f32e766696d02c80',
    ravScoreModelBinding().modelBundleSha256,
    3,
  ],
  [
    '1e6d4e747dc89be971dc01f3cc51a0710fadda4bb49920b597b359d6ca520ad5',
    rollbackBinding().modelBundleSha256,
    2,
  ],
  [
    'ff1d884f32825f44fd5c1cafa6b3e211e44900dc0663261b86b890e0cbbb85f3',
    await ravScoreContinuationImplementationSha256(),
    1,
  ],
  ['20260909194000', '20260912122607', 2],
]) {
  assert.equal(
    source.split(before).length - 1,
    count,
    'Unexpected predecessor binding inventory',
  );
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated WAM same-run resolution binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated measured rollback-warmup binding successor; predecessor remains immutable.',
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
    'Measured rollback-warmup binding successor is stale',
  );
}
console.log(
  'Measured rollback-warmup binding migration verified against immutable predecessor; no database access.',
);
