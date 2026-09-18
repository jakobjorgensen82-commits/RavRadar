// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260918125600_last_mile_history_envelope_binding.sql';
const destination =
  'supabase/migrations/20260918190000_weather_input_resolution_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '0548e4ad175c02b32f330c9563be89a0f7d3c4093409385155469368535d5707',
  'Applied last-mile history-envelope predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    '039abdfe0cede8dec764bbab904096854d0757a2c5f430b296f75baf1a686d3c',
    '1c142a31477ec69ccfa8d87d31ac86cc96df9f14244dfdec5b6b6ebff1c30a9e',
    3,
  ],
  [
    'd3ad4e8537c23865398acdb4674d141b8d94636aad0e8ddc22c5936a29cfd859',
    'ad7a2a81e6e8da86e4e951f69d9925519ca895ad6f5856d61d2a47e0c1296b70',
    2,
  ],
  [
    'c294198dd7e87fb09989555f36f9e2e168d7eb5fb248584137a370ec7b41a08a',
    'd18183fb1b0b5173fdf447e8f4e1917cc5c34ea092e44015b48a1b1064c6c386',
    1,
  ],
  ['20260918125600', '20260918190000', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated last-mile history-envelope binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated weather-input resolution binding successor; predecessor remains immutable.',
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
    'Weather-input resolution binding successor is stale',
  );
}
console.log(
  'Weather-input resolution binding migration verified against immutable predecessor; no database access.',
);
