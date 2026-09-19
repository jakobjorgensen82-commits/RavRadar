#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { computeRavScorePublicBrowserClosure } from './lib/ravscore-public-browser-closure.mjs';
import {
  PROTECTED_OPERATIONAL_REENTRY_EVIDENCE_POLICY as policy,
  buildProtectedOperationalEvidenceArchive,
  publishProtectedOperationalEvidence,
  restoreProtectedOperationalEvidence,
  validateProtectedOperationalEvidencePointer,
} from './protected-operational-reentry-evidence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'ravradar/RavRadar';
const clone = value => structuredClone(value);

async function fixture(directory, { deploymentId, hour = '10', sourceHead = 'a'.repeat(40) }) {
  await fs.mkdir(directory, { recursive: true });
  const binding = ravScoreModelBinding();
  const closure = (await computeRavScorePublicBrowserClosure({ root })).manifest;
  const contractText = await fs.readFile(path.join(root, 'js/core/ravscore-model-contract.js'), 'utf8');
  const bundleText = await fs.readFile(path.join(root, 'js/core/ravscore-model-bundle.generated.js'), 'utf8');
  const implementation = { implementationClosureSha256: 'e'.repeat(64) };
  const [, runId, runAttempt] = deploymentId.match(/^pages-([0-9]+)-([0-9]+)$/);
  const manifest = {
    schemaVersion: 4,
    generatedAt: `2026-09-19T${hour}:05:00.000Z`,
    productionReferenceAt: `2026-09-19T${hour}:00:00.000Z`,
    datasetId: `rr-20260919${hour}0000-210`,
    complete: true,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: clone(binding),
    ravScoreRuntime: { modelBinding: clone(binding) },
  };
  const seal = {
    schemaVersion: 'ravscore-operational-pages-artifact-seal-v1',
    repository,
    runId: Number(runId),
    runAttempt: Number(runAttempt),
    headSha: sourceHead,
    ref: 'refs/heads/main',
    attemptId: deploymentId,
    artifactId: Number(runId) + 1000,
    artifactName: 'github-pages',
    artifactDigestSha256: 'b'.repeat(64),
    artifactSizeBytes: 12345,
    targetPublicManifestSha256: sha256CanonicalJson(manifest),
    targetImplementationClosureSha256: implementation.implementationClosureSha256,
    targetModelBinding: clone(binding),
    createdAt: `2026-09-19T${hour}:06:00.000Z`,
    privatePayloadIncluded: false,
  };
  const handoff = {
    schemaVersion: 'ravscore-operational-deploy-handoff-v2',
    action: 'integrated',
    sourceHead,
    centralVersion: 3,
    legacySourceRequired: false,
    checkpointDisposition: 'READY_PUBLISHED',
    checkpointDispositionSha256: 'c'.repeat(64),
    checkpointDatasetId: manifest.datasetId,
    checkpointRuntimeAuditSha256: 'd'.repeat(64),
    checkpointBuildOutcome: 'success',
    checkpointSaveOutcome: 'success',
    checkpointPublishOutcome: 'success',
    privatePayloadIncluded: false,
  };
  const writes = {
    'manifest.json': JSON.stringify(manifest),
    'handoff.json': JSON.stringify(handoff),
    'pages-artifact-seal.json': JSON.stringify(seal),
    'target-binding.json': JSON.stringify(binding),
    'target-public-closure.json': JSON.stringify(closure),
    'target-contract.js': contractText,
    'target-bundle.generated.js': bundleText,
    'public-audit.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
    'checkpoint-disposition.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
    'checkpoint-runtime-audit.json': JSON.stringify({ datasetId: manifest.datasetId, privatePayloadIncluded: false }),
  };
  await Promise.all(Object.entries(writes).map(([name, text]) => fs.writeFile(path.join(directory, name), text)));
  return { binding, closure, implementation, manifest, seal };
}

function remote() {
  let row = null;
  const objects = new Map();
  const removed = [];
  const request = async (_suffix, options = {}) => {
    const method = options.method ?? 'GET';
    if (method === 'GET') return row ? [clone(row)] : [];
    const body = JSON.parse(options.body);
    if (method === 'POST') {
      if (row) return [];
      row = { document_key: policy.documentKey, payload: body.payload, version: 1 };
      return [clone(row)];
    }
    if (method === 'PATCH') {
      row = { ...row, payload: body.payload, version: row.version + 1 };
      return [clone(row)];
    }
    throw new Error('unexpected request');
  };
  const storage = {
    ensurePrivateBucket: async () => true,
    uploadImmutable: async (objectPath, bytes) => {
      if (objects.has(objectPath)) return { created: false, alreadyExists: true };
      objects.set(objectPath, Buffer.from(bytes));
      return { created: true };
    },
    download: async objectPath => Buffer.from(objects.get(objectPath)),
    removeExact: async objectPath => { removed.push(objectPath); objects.delete(objectPath); },
    anonymousStatus: async () => 404,
  };
  return { request, storage, objects, removed, row: () => clone(row) };
}

test('builds a bounded payload-free exact archive and rejects private or unknown input', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-evidence-'));
  try {
    const directory = path.join(work, 'handoff');
    await fixture(directory, { deploymentId: 'pages-12345-1' });
    const built = await buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    });
    assert.ok(built.archive.length < policy.maximumArchiveBytes);
    assert.equal(built.descriptor.deploymentId, 'pages-12345-1');
    assert.equal(built.descriptor.publicManifestSha256.length, 64);
    await fs.writeFile(path.join(directory, 'unknown.json'), '{}');
    await assert.rejects(buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    }), /unknown entry/);
    await fs.rm(path.join(directory, 'unknown.json'));
    await fs.writeFile(path.join(directory, 'public-audit.json'), '{"waterPoint":[1,2]}');
    await assert.rejects(buildProtectedOperationalEvidenceArchive({
      directory, deploymentId: 'pages-12345-1', repository,
    }), /forbidden private field/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('retains the exact active source across repeated failed target publications', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-retention-'));
  const state = remote();
  try {
    let activeManifestSha256 = null;
    for (const [deploymentId, hour, letter] of [
      ['pages-100-1', '10', 'a'],
      ['pages-200-1', '11', 'b'],
      ['pages-300-1', '12', 'c'],
    ]) {
      const directory = path.join(work, deploymentId);
      const evidence = await fixture(directory, { deploymentId, hour, sourceHead: letter.repeat(40) });
      if (deploymentId === 'pages-100-1') {
        activeManifestSha256 = evidence.seal.targetPublicManifestSha256;
      }
      await publishProtectedOperationalEvidence({
        directory,
        deploymentId,
        retainPublicManifestSha256: deploymentId === 'pages-100-1'
          ? null : activeManifestSha256,
        requireRetained: deploymentId !== 'pages-100-1',
        repository,
        request: state.request,
        storage: state.storage,
      });
    }
    const pointer = validateProtectedOperationalEvidencePointer(state.row().payload);
    assert.equal(pointer.current.deploymentId, 'pages-300-1');
    assert.equal(pointer.previous.deploymentId, 'pages-100-1');
    assert.equal(state.objects.size, 2);
    assert.equal(state.removed.length, 1);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('restores one exact deployment atomically and refuses an unavailable generation', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-restore-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    await fixture(source, { deploymentId: 'pages-900-2' });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-900-2',
      repository,
      request: state.request,
      storage: state.storage,
    });
    const restored = path.join(work, 'restored');
    const result = await restoreProtectedOperationalEvidence({
      directory: restored,
      deploymentId: 'pages-900-2',
      repository,
      request: state.request,
      storage: state.storage,
    });
    assert.equal(result.restored, true);
    assert.equal(JSON.parse(await fs.readFile(path.join(restored, 'pages-artifact-seal.json'))).attemptId,
      'pages-900-2');
    const restoredByHash = path.join(work, 'restored-by-hash');
    const byHash = await restoreProtectedOperationalEvidence({
      directory: restoredByHash,
      publicManifestSha256: result.publicManifestSha256,
      repository,
      request: state.request,
      storage: state.storage,
    });
    assert.equal(byHash.deploymentId, 'pages-900-2');
    await assert.rejects(restoreProtectedOperationalEvidence({
      directory: path.join(work, 'missing'),
      deploymentId: 'pages-901-1',
      repository,
      request: state.request,
      storage: state.storage,
    }), /unavailable/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('does not publish a target when exact active evidence is absent', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-closed-'));
  const state = remote();
  try {
    const source = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-400-1' });
    await assert.rejects(publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-400-1',
      retainDeploymentId: 'pages-399-1',
      requireRetained: true,
      repository,
      request: state.request,
      storage: state.storage,
    }), /exact active source/);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('recovers an exact committed pointer after a lost response without a second write', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-lost-response-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    const target = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-500-1', hour: '10' });
    await fixture(target, { deploymentId: 'pages-501-1', hour: '11', sourceHead: 'b'.repeat(40) });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-500-1',
      repository,
      request: state.request,
      storage: state.storage,
    });
    let patchCount = 0;
    const requestWithLostResponse = async (suffix, options, label) => {
      if ((options?.method ?? 'GET') === 'PATCH') {
        patchCount += 1;
        const committed = await state.request(suffix, options, label);
        assert.equal(committed.length, 1);
        throw new Error('simulated response-body loss after commit');
      }
      return state.request(suffix, options, label);
    };
    const result = await publishProtectedOperationalEvidence({
      directory: target,
      deploymentId: 'pages-501-1',
      retainDeploymentId: 'pages-500-1',
      requireRetained: true,
      repository,
      request: requestWithLostResponse,
      storage: state.storage,
    });
    assert.equal(result.published, true);
    assert.equal(patchCount, 1);
    assert.equal(state.row().payload.current.deploymentId, 'pages-501-1');
    assert.equal(state.row().payload.previous.deploymentId, 'pages-500-1');
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});

test('removes only its new unreferenced object after a proven failed compare-and-swap', async () => {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-operational-cas-cleanup-'));
  const state = remote();
  try {
    const source = path.join(work, 'source');
    const target = path.join(work, 'target');
    await fixture(source, { deploymentId: 'pages-600-1', hour: '10' });
    await fixture(target, { deploymentId: 'pages-601-1', hour: '11', sourceHead: 'c'.repeat(40) });
    await publishProtectedOperationalEvidence({
      directory: source,
      deploymentId: 'pages-600-1',
      repository,
      request: state.request,
      storage: state.storage,
    });
    const sourcePath = state.row().payload.current.objectPath;
    const requestWithLostCas = async (suffix, options, label) => {
      if ((options?.method ?? 'GET') === 'PATCH') return [];
      return state.request(suffix, options, label);
    };
    await assert.rejects(publishProtectedOperationalEvidence({
      directory: target,
      deploymentId: 'pages-601-1',
      retainDeploymentId: 'pages-600-1',
      requireRetained: true,
      repository,
      request: requestWithLostCas,
      storage: state.storage,
    }), /lost a concurrent write/);
    assert.equal(state.objects.size, 1);
    assert.equal(state.objects.has(sourcePath), true);
    assert.equal(state.row().payload.current.deploymentId, 'pages-600-1');
    assert.equal(state.removed.length, 1);
    assert.notEqual(state.removed[0], sourcePath);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
});
