// Reproducible binding-only successor. The applied predecessor is read-only input.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260917001500_partial_zone_public_metadata_binding.sql';
const destination =
  'supabase/migrations/20260918125600_last_mile_history_envelope_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  '548ba234d6ad2a534bef96f0068c57243c7857a71e8cbe88f262a7a46b5c826b',
  'Applied partial-zone public-metadata predecessor must remain immutable',
);
for (const [before, after, count] of [
  [
    'd9ba75ed7f7ff2b477676e418a3ede61adf90b00aca77259bb6ccd73ee3f2906',
    '039abdfe0cede8dec764bbab904096854d0757a2c5f430b296f75baf1a686d3c',
    3,
  ],
  [
    'da27b811159b768bc33972e6a20621782179a7b0b1f96232a6dfd946c2cadbc7',
    'd3ad4e8537c23865398acdb4674d141b8d94636aad0e8ddc22c5936a29cfd859',
    2,
  ],
  [
    'd20939c1b141a763fb20aa39b39506d79bf150860714bf1ce306f64d5314e7e6',
    'c294198dd7e87fb09989555f36f9e2e168d7eb5fb248584137a370ec7b41a08a',
    1,
  ],
  ['20260917001500', '20260918125600', 2],
]) {
  assert.equal(source.split(before).length - 1, count,
    'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
const predecessorComment =
  '-- Generated partial-zone public-metadata binding successor; predecessor remains immutable.';
assert.equal(source.split(predecessorComment).length - 1, 1);
source = source.replace(
  predecessorComment,
  '-- Generated last-mile history-envelope binding successor; predecessor remains immutable.',
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
    'Last-mile history-envelope binding successor is stale',
  );
}
console.log(
  'Last-mile history-envelope binding migration verified against immutable predecessor; no database access.',
);
