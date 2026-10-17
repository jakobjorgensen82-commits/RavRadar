#!/usr/bin/env node
// Synthetic data-staging fixture only; this is not a seed/native admission test.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stageCodeOnlyPublicCoastalRegistry } from './prepare-code-only-public-runtime.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
async function fixture(t) {
  const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-registry-stage-test-'));
  t.after(async () => { await fs.rm(owned, { recursive: true, force: false }); });
  const repositoryRoot = path.join(owned, 'repo'), snapshotRoot = path.join(owned, 'snapshot');
  await fs.mkdir(path.join(repositoryRoot, 'data/live'), { recursive: true });
  await fs.mkdir(snapshotRoot);
  const initial = {
    'data/live/coastal-parts-v2.json': 'OLD_SYNTHETIC_REGISTRY\n',
    'data/live/conditions.json': 'PRIVATE_CONDITIONS_SENTINEL\n',
    'data/zones.geojson': 'GEOMETRY_SENTINEL\n',
    'data/live/water-level-station-routing.json': 'ROUTING_SENTINEL\n',
  };
  for (const [file, text] of Object.entries(initial)) {
    await fs.mkdir(path.dirname(path.join(repositoryRoot, file)), { recursive: true });
    await fs.writeFile(path.join(repositoryRoot, file), text);
  }
  const zones = Object.fromEntries(Array.from({ length: 210 }, (_, i) => [`synthetic-zone-${i}`, []]));
  for (let i = 0; i < 673; i++) zones[`synthetic-zone-${i % 210}`].push({
    partId: `synthetic-part-${i}`, sourceZoneId: `synthetic-zone-${i % 210}`,
    geometry: { type: 'LineString', coordinates: [[0, 0], [0.01, 0.01]] },
    landPoint: [0, 0], waterPoint: [0.01, 0.01], onshoreDirectionDeg: 225,
  });
  const registry = `${JSON.stringify({ schemaVersion: 2, enabled: true, zoneCount: 210, partCount: 673, zones })}\n`;
  const expectedIdentity = { datasetId: 'rr-SYNTHETIC-stage-only', productionReferenceAt: '2026-10-17T05:00:00.000Z' };
  const manifest = { schemaVersion: 4, complete: true, zoneCount: 210, coastalPartCount: 673,
    ...expectedIdentity, coastalPartsSha256: sha(registry), coastalPartsBytes: Buffer.byteLength(registry),
    ravScoreModelBinding: ravScoreModelBinding() };
  await fs.writeFile(path.join(snapshotRoot, 'coastal-parts-v2.json'), registry);
  async function saveManifest() { await fs.writeFile(path.join(snapshotRoot, 'manifest.json'), JSON.stringify(manifest)); }
  await saveManifest();
  return { repositoryRoot, snapshotRoot, initial, registry, expectedIdentity, manifest, saveManifest };
}
async function assertFiles(f, successful) {
  const files = [];
  async function visit(dir, prefix = '') {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(dir, entry.name), relative);
      else files.push(relative);
    }
  }
  await visit(f.repositoryRoot);
  assert.deepEqual(files.sort(), Object.keys(f.initial).sort(), 'no additional output or leftover temporary file');
  for (const [file, before] of Object.entries(f.initial)) assert.equal(
    await fs.readFile(path.join(f.repositoryRoot, file), 'utf8'),
    successful && file === 'data/live/coastal-parts-v2.json' ? f.registry : before,
    'only exact manifest-bound registry bytes may be staged');
}
test('current PUBLIC snapshot registry staging preserves exact source bytes and every other file', async t => {
  const f = await fixture(t);
  const report = await stageCodeOnlyPublicCoastalRegistry(f);
  assert.deepEqual(report, { kind: 'CODE_ONLY_CURRENT_PUBLIC_COASTAL_REGISTRY_STAGED',
    ...f.expectedIdentity, bytes: Buffer.byteLength(f.registry), sha256: sha(f.registry),
    zoneCount: 210, partCount: 673, freshAdminBackendRead: false, originAdmission: false,
    providerRequestsPerformed: false, privatePayloadIncluded: false });
  await assertFiles(f, true);
});
for (const [name, mutate, expected] of [
  ['SHA mismatch', f => { f.manifest.coastalPartsSha256 = '0'.repeat(64); }, /digest mismatch/],
  ['byte mismatch', f => { f.manifest.coastalPartsBytes++; }, /byte count mismatch/],
  ['dataset mismatch', f => { f.manifest.datasetId = 'rr-SYNTHETIC-other'; }, /authenticated private source identity/],
  ['reference mismatch', f => { f.manifest.productionReferenceAt = '2026-10-17T06:00:00.000Z'; }, /authenticated private source identity/],
]) test(`registry staging refuses ${name} before any repository write`, async t => {
  const f = await fixture(t); mutate(f); await f.saveManifest();
  await assert.rejects(stageCodeOnlyPublicCoastalRegistry(f), expected);
  await assertFiles(f, false);
});
