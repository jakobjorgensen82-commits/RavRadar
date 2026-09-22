#!/usr/bin/env node

// Reproducible append-only successor for a generated integrated-model binding.
// The applied predecessor is immutable; only the successor may carry the new
// transitive implementation hash into the current SQL consumers.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor =
  'supabase/migrations/20260922100000_integrated_trip_binding_repair.sql';
const destination =
  'supabase/migrations/20260922170000_integrated_model_binding_successor.sql';
const oldVersion = '20260922100000';
const newVersion = '20260922170000';
const oldIntegratedBundleSha256 =
  'dafee01903ccb643b59572539104f879d99903bd622be8997cb20d1cc25d729d';
const newIntegratedBundleSha256 =
  '2c26b855fc0e93754c5f0ba586f6d2a2864c6de17880717ab6cd6c8cbc3bcad7';
const predecessorSha256 =
  'f44465ffb4a4f253a15becf5b1a449781e05a120fec95de1a1ad35f959067e69';

const normalize = text => text.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;

const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  crypto.createHash('sha256').update(source).digest('hex'),
  predecessorSha256,
  'The applied integrated-binding predecessor must remain immutable',
);
assert.equal(count(source, oldVersion), 1, 'Unexpected predecessor-version inventory');
assert.equal(count(source, oldIntegratedBundleSha256), 3,
  'Unexpected predecessor integrated-bundle inventory');
assert.equal(count(source, newIntegratedBundleSha256), 0,
  'Successor bundle hash already appears in the predecessor');

let successor = source.replaceAll(oldVersion, newVersion);
successor = successor.replaceAll(oldIntegratedBundleSha256, newIntegratedBundleSha256);

const transitionAfterReplacement = [
  '        \'327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01\',',
  '        \'14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904\',',
  `        '${newIntegratedBundleSha256}'`,
].join('\n');
const transitionWithPredecessor = [
  '        \'327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01\',',
  '        \'14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904\',',
  `        '${oldIntegratedBundleSha256}',`,
  `        '${newIntegratedBundleSha256}'`,
].join('\n');
assert.equal(
  count(successor, transitionAfterReplacement),
  1,
  'Integrated transition bridge is missing or duplicated',
);
successor = successor.replace(transitionAfterReplacement, transitionWithPredecessor);

successor = successor.replace(
  '-- Re-assert the exact trip-policy functions after an out-of-band or partial\n'
    + '-- database deployment drifted from the checked-in 20260920220000 binding.\n'
    + '-- This is append-only and intentionally contains no model-rule change: the\n'
    + '-- function bodies are byte-for-byte the current integrated/Candidate G policy.',
  '-- Re-assert the exact trip-policy and checkpoint binding after the generated\n'
    + '-- integrated model bundle changed. The 20260922100000 predecessor remains\n'
    + '-- immutable; this append-only successor is the current binding authority.\n'
    + '-- No score rule, provider rule, state row or history is rewritten.',
);

// The predecessor version is intentionally mentioned once in the immutable-
// predecessor comment; it must not appear in executable SQL or migration IDs.
assert.equal(count(successor, oldVersion), 1, 'Predecessor version leaked into successor');
assert.equal(count(successor, newVersion), 1, 'Successor version inventory drifted');
assert.equal(count(successor, oldIntegratedBundleSha256), 1,
  'Only the explicit transition bridge may retain the predecessor bundle');
assert.equal(count(successor, newIntegratedBundleSha256), 3,
  'Successor integrated-bundle inventory drifted');

const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check',
  'Unsupported migration generator option');
if (mode === '--write') {
  await fs.writeFile(destination, successor, 'utf8');
} else {
  assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
    'Integrated model-binding successor is stale');
}
console.log('Integrated model-binding successor verified against immutable predecessor.');
