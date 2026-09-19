// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260918190000_weather_input_resolution_binding.sql';
const destination =
  'supabase/migrations/20260919010000_current_input_foundation_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '9dd27fae7ffd93720a7c2c9c347ab8ea6df40cbc96d713cb1ff25c638078f2dc',
  'Applied weather-input resolution predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '1c142a31477ec69ccfa8d87d31ac86cc96df9f14244dfdec5b6b6ebff1c30a9e',
    'b114d226425eefd6b7a3c8280fb19982c312f0d88d2f9351c7dc6cbc4ece8c38',
    3,
  ],
  [
    'ad7a2a81e6e8da86e4e951f69d9925519ca895ad6f5856d61d2a47e0c1296b70',
    '2a0cba46ea1bb625f655ee3c58a07c90e3b6d169812f569643d0f2d924c4c09e',
    2,
  ],
  [
    'd18183fb1b0b5173fdf447e8f4e1917cc5c34ea092e44015b48a1b1064c6c386',
    '91251f6b38835040250cd5283d2b701aab38bb23f2a4a0014baa1128d59c78f4',
    1,
  ],
  ['20260918190000', '20260919010000', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated weather-input resolution binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated current-input foundation binding successor; predecessor remains immutable.',
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
    'Current-input foundation binding successor is stale',
  );
}
console.log(
  'Current-input foundation binding migration verified against immutable predecessor; no database access.',
);
