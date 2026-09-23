#!/usr/bin/env node

// Append-only successor for a changed transitive RavScore implementation.
// The already applied predecessor is read-only and hash-pinned.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260922170000_integrated_model_binding_successor.sql';
const destination = 'supabase/migrations/20260923052100_integrated_current_projection_binding.sql';
const oldVersion = '20260922170000';
const newVersion = '20260923052100';
const oldBundle = '2c26b855fc0e93754c5f0ba586f6d2a2864c6de17880717ab6cd6c8cbc3bcad7';
const newBundle = '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1';
const oldRollbackBundle = '6bdae434614fd3e43db15d6d03b06916fbe9a43624e3f1b4df652866c6a46d42';
const newRollbackBundle = 'c7c4840d3c07b71610b30d1528633bc30a9e2449d77e331d3018852a4e68891c';
const oldContinuation = '6d3311c9204065b5e6246aa96aaef23e0784d83fa7210893e2e7fa03d0e8573e';
const newContinuation = '7ea4258b07a244e66cb9a1461eb77b469aa9355a28019f2fc7804bb14ee2d9ad';
const predecessorSha256 = '6746c7e9bf1a980a194aae08410bab04917b5ee0d3e6b08f7543a3470c5680d0';
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), predecessorSha256,
  'The applied model-binding predecessor must remain immutable');
assert.equal(count(source, oldVersion), 1, 'Unexpected predecessor-version inventory');
assert.equal(count(source, oldBundle), 3, 'Unexpected predecessor bundle inventory');
assert.equal(count(source, newBundle), 0, 'New bundle already appears in predecessor');
assert.equal(count(source, oldRollbackBundle), 2, 'Unexpected predecessor rollback-bundle inventory');
assert.equal(count(source, newRollbackBundle), 0, 'New rollback bundle already appears in predecessor');
assert.equal(count(source, oldContinuation), 1, 'Unexpected predecessor continuation inventory');
assert.equal(count(source, newContinuation), 0, 'New continuation already appears in predecessor');

let successor = source.replaceAll(oldVersion, newVersion)
  .replaceAll(oldBundle, newBundle)
  .replaceAll(oldRollbackBundle, newRollbackBundle)
  .replaceAll(oldContinuation, newContinuation);
const bridge = [
  "        'dafee01903ccb643b59572539104f879d99903bd622be8997cb20d1cc25d729d',",
  `        '${newBundle}'`,
].join('\n');
assert.equal(count(successor, bridge), 1, 'Integrated transition bridge is missing or duplicated');
successor = successor.replace(bridge, [
  "        'dafee01903ccb643b59572539104f879d99903bd622be8997cb20d1cc25d729d',",
  `        '${oldBundle}',`,
  `        '${newBundle}'`,
].join('\n'));
// The immutable predecessor contains one whitespace-only separator line.
// Normalize it in the new file so the append-only successor is diff-clean.
assert.equal(count(successor, '\n \nbegin;'), 1, 'Unexpected SQL separator inventory');
successor = successor.replace('\n \nbegin;', '\n\nbegin;');
assert.equal(count(successor, oldVersion), 0, 'Old migration version leaked into successor');
assert.equal(count(successor, newVersion), 1, 'Successor version inventory drifted');
assert.equal(count(successor, oldBundle), 1, 'Only the transition bridge may retain the old bundle');
assert.equal(count(successor, newBundle), 3, 'Successor bundle inventory drifted');
assert.equal(count(successor, oldRollbackBundle), 0, 'Old rollback bundle leaked into successor');
assert.equal(count(successor, newRollbackBundle), 2, 'Successor rollback-bundle inventory drifted');
assert.equal(count(successor, oldContinuation), 0, 'Old continuation leaked into successor');
assert.equal(count(successor, newContinuation), 1, 'Successor continuation inventory drifted');

const mode = process.argv[2];
assert.ok(mode === undefined || mode === '--write' || mode === '--check',
  'Unsupported migration generator option');
if (mode === '--write') await fs.writeFile(destination, successor, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
  'Current projection binding successor is stale');
console.log('Current projection binding successor verified against immutable predecessor.');
