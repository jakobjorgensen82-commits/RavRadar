// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260919020000_measured_warmup_checkpoint.sql';
const destination =
  'supabase/migrations/20260919231000_public_hour_delivery_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '24fd06b77349fe993f844fa0401deca3d69c30d823205cd6840f51f93f4b2fe8',
  'Applied measured-warmup checkpoint predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '8f0ef7800eee6adbb5cb620fed682c2c7900ad8748a86ba84085570e44fa9c26',
    '0e1c66256587844c179380488fc87e35bcd0703adf10b697fe028cc007730c7a',
    3,
  ],
  ['20260919020000', '20260919231000', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated measured-warmup checkpoint successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated public-hour delivery binding successor; predecessor remains immutable.',
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
    'Public-hour delivery binding successor is stale',
  );
}
console.log(
  'Public-hour delivery binding migration verified against immutable predecessor; no database access.',
);
