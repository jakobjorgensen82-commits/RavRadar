// Reproducible, binding-only successor. Applied migrations are read-only inputs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';

const predecessor = 'supabase/migrations/20260907084343_horizon_valid_weather_binding.sql';
const destination = 'supabase/migrations/20260909194000_wam_same_run_resolution_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
let source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'),
  'f22ce2b3ee2e45c4fc86ce6a71b7a48543aef47dbbe014ecf41bd95558421c0d',
  'Applied predecessor must remain immutable');
for (const [before, after, count] of [
  ['155fd8f4f9ea59f0dfed01ebe25c5e923e16228db4c9f2cf9cf71415d4047cd9', ravScoreModelBinding().modelBundleSha256, 3],
  ['4da64d0c8d09a0a32c8b10526f39f58a4acef131a359d31edc2fbca1e3eb20c8', rollbackBinding().modelBundleSha256, 2],
  ['260efa3b94759ff7d5816d3c93889b8e27c8fdd2ef09b166e952d387a0d5a5cb', await ravScoreContinuationImplementationSha256(), 1],
  ['20260907084343', '20260909194000', 2],
]) {
  assert.equal(source.split(before).length - 1, count, 'Unexpected predecessor binding inventory');
  source = source.replaceAll(before, after);
}
source = source.replace('-- Append-only per-pair verified weather-fallback binding refresh.',
  '-- Generated WAM same-run resolution binding successor; predecessor remains immutable.');
assert.ok(process.argv.length === 2 || (process.argv.length === 3
  && ['--write', '--check'].includes(process.argv[2])), 'Unsupported migration generator option');
if (process.argv.includes('--write')) {
  await fs.writeFile(destination, source, 'utf8');
} else {
  assert.equal(normalize(await fs.readFile(destination, 'utf8')), source,
    'WAM binding successor is stale; rebuild after rollback and integrated bundles');
}
console.log('WAM binding-only migration verified against immutable predecessor; no database access.');
