#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const predecessor = 'supabase/migrations/20260919231000_public_hour_delivery_binding.sql';
const destination = 'supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql';
const oldIntegratedBundle = '315525d0e00d336660791fe32f4f5a6b2eb6962081aae4aa914f65590d8c7030';
const currentIntegratedBundle = '14f3f0c9b1d91df0d23f94e1d56852a34f8d6a232e23da74590921be8f058904';
const oldCandidateBundle = 'd740e2f74796971d1d60e1ab8e6a3365b0eb1dae0d674847ed9369c4a85c6a27';
const currentCandidateBundle = '618b2b44c93316f6798a17fbbd020cdacda9aff73bfde4cbbbaa05d3fa197ace';
const oldContinuationHash = '3d4e51b9dca15bafac98cf5c1e69f0b60d6ca354d3aa9e05bf9302d8622c8f77';
const currentContinuationHash = '9702630e114ab4cd09b185b397b302afcaf4a81881f6aae3ec0b6995419525e0';
const oldMigrationVersion = '20260919231000';
const currentMigrationVersion = '20260920220000';

const normalize = text => text.replace(/\r\n?/g, '\n');
const source = normalize(await fs.readFile(predecessor, 'utf8'));
assert.equal(
  source.split(oldIntegratedBundle).length - 1,
  3,
  'Den append-only forgænger har ikke den forventede integrerede binding',
);
assert.equal(
  source.split(oldMigrationVersion).length - 1,
  2,
  'Den append-only forgænger har ikke den forventede migrationsversion',
);
assert.equal(
  source.split(oldCandidateBundle).length - 1,
  2,
  'Den append-only forgænger har ikke den forventede Candidate G-binding',
);
assert.equal(source.split(oldContinuationHash).length - 1, 1,
  'Den append-only forgænger har ikke den forventede continuation-binding');
const successor = source
  .replaceAll(oldIntegratedBundle, currentIntegratedBundle)
  .replaceAll(oldCandidateBundle, currentCandidateBundle)
  .replaceAll(oldContinuationHash, currentContinuationHash)
  .replaceAll(oldMigrationVersion, currentMigrationVersion)
  .replace(
    '-- Generated public-hour delivery binding successor; predecessor remains immutable.',
    '-- Generated public-hour pack capacity binding successor; predecessor remains immutable.',
  );

if (process.argv.includes('--write')) {
  await fs.writeFile(destination, successor, 'utf8');
} else {
  assert.equal(normalize(await fs.readFile(destination, 'utf8')), successor,
    'Public-hour pack capacity migration is stale');
}
console.log(`Public-hour pack capacity migration ${process.argv.includes('--write') ? 'written' : 'verified'}.`);
