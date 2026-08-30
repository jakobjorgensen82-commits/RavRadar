#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  assertRavScoreModelBinding as assertCandidateGRollbackModelBinding,
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_BINDING_FILES = Object.freeze([
  'knowledge/rav-assistant-public-v1.json',
  'scripts/fixtures/rav-assistant-evals-v1.json',
]);
const EDGE_PATH = 'supabase/functions/_shared/rav-assistant-contract.ts';
const SQL_BINDING_PATHS = Object.freeze([
  'supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql',
  'supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
]);

function renderEdgeBinding(binding) {
  return [
    'export const RAV_ASSISTANT_RAVSCORE_MODEL_BINDING = Object.freeze({',
    ...Object.entries(binding).map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`),
    '});',
  ].join('\n');
}

function replaceExactlyOnce(text, pattern, replacement, label) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one binding field, found ${matches.length}`);
  return text.replace(pattern, replacement);
}

function expectedMigrationBindingBlock(source, binding, marker, labelPrefix) {
  const startMarker = `-- ${marker}_BEGIN`;
  const endMarker = `-- ${marker}_END`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start || source.indexOf(startMarker, start + 1) >= 0
    || source.indexOf(endMarker, end + 1) >= 0) {
    throw new Error(`${labelPrefix}: exact generated binding markers are missing or duplicated`);
  }
  const sectionEnd = end + endMarker.length;
  const section = source.slice(start, sectionEnd);
  const fields = [
    [/model_version\s*=\s*'[^']*'/, `model_version = '${binding.modelId}'`, 'modelVersion'],
    [/calibration_features\s*->>\s*'modelStateVersion'\s*=\s*'[^']*'/, `calibration_features ->> 'modelStateVersion' = '${binding.stateSchemaVersion}'`, 'stateSchemaVersion'],
    [/calibration_features\s*->>\s*'modelVariantId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelVariantId' = '${binding.variantId}'`, 'variantId'],
    [/calibration_features\s*->>\s*'modelProfileId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelProfileId' = '${binding.profileId}'`, 'profileId'],
    [/calibration_features\s*->>\s*'modelComponentSchemaId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelComponentSchemaId' = '${binding.componentSchemaId}'`, 'componentSchemaId'],
    [/calibration_features\s*->>\s*'modelExplanationSchemaId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelExplanationSchemaId' = '${binding.explanationSchemaId}'`, 'explanationSchemaId'],
    [/calibration_features\s*->>\s*'modelRankingPolicyId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelRankingPolicyId' = '${binding.rankingPolicyId}'`, 'rankingPolicyId'],
    [/calibration_features\s*->>\s*'modelBestTimePolicyId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelBestTimePolicyId' = '${binding.bestTimePolicyId}'`, 'bestTimePolicyId'],
    [/calibration_features\s*->>\s*'modelPresentationPolicyId'\s*=\s*'[^']*'/, `calibration_features ->> 'modelPresentationPolicyId' = '${binding.presentationPolicyId}'`, 'presentationPolicyId'],
    [/calibration_features\s*->>\s*'modelContractSha256'\s*=\s*'[^']*'/, `calibration_features ->> 'modelContractSha256' = '${binding.modelContractSha256}'`, 'modelContractSha256'],
    [/calibration_features\s*->>\s*'modelBundleSha256'\s*=\s*'[^']*'/, `calibration_features ->> 'modelBundleSha256' = '${binding.modelBundleSha256}'`, 'modelBundleSha256'],
  ];
  const expectedSection = fields.reduce((text, [pattern, replacement, label]) =>
    replaceExactlyOnce(text, pattern, replacement, `${labelPrefix} ${label}`), section);
  return `${source.slice(0, start)}${expectedSection}${source.slice(sectionEnd)}`;
}

function expectedMigration(source, binding, candidateBinding) {
  const integrated = expectedMigrationBindingBlock(
    source,
    binding,
    'RAVSCORE_INTEGRATED_BINDING',
    'trip migration integrated binding',
  );
  return expectedMigrationBindingBlock(
    integrated,
    candidateBinding,
    'RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING',
    'trip migration Candidate G rollback binding',
  );
}

export async function synchronizeRavScoreModelBinding({ write = false, root = ROOT } = {}) {
  const binding = ravScoreModelBinding();
  assertRavScoreModelBinding(binding);
  const candidateBinding = candidateGRollbackModelBinding();
  assertCandidateGRollbackModelBinding(candidateBinding);
  const changed = [];
  for (const relative of JSON_BINDING_FILES) {
    const absolute = path.join(root, relative);
    const document = JSON.parse(await fs.readFile(absolute, 'utf8'));
    if (write) {
      document.ravScoreModelBinding = { ...binding };
      await fs.writeFile(absolute, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
      changed.push(relative);
    } else {
      assertRavScoreModelBinding(document.ravScoreModelBinding, `${relative} RavScore model binding`);
      assert.deepEqual(document.ravScoreModelBinding, binding, `${relative} has a stale RavScore model binding`);
    }
  }

  const adminPath = path.join(root, 'data/admin/ravscore-profile-selection.json');
  const admin = JSON.parse(await fs.readFile(adminPath, 'utf8'));
  if (write) {
    admin.requestedProfileId = binding.modelId;
    admin.activeModelId = binding.modelId;
    admin.stateSchemaVersion = binding.stateSchemaVersion;
    admin.variantId = binding.variantId;
    admin.profileId = binding.profileId;
    admin.componentSchemaId = binding.componentSchemaId;
    admin.explanationSchemaId = binding.explanationSchemaId;
    admin.rankingPolicyId = binding.rankingPolicyId;
    admin.bestTimePolicyId = binding.bestTimePolicyId;
    admin.presentationPolicyId = binding.presentationPolicyId;
    admin.modelContractSha256 = binding.modelContractSha256;
    admin.modelBundleSha256 = binding.modelBundleSha256;
    await fs.writeFile(adminPath, `${JSON.stringify(admin, null, 2)}\n`, 'utf8');
    changed.push('data/admin/ravscore-profile-selection.json');
  } else {
    assert.equal(admin.requestedProfileId, binding.modelId);
    assert.equal(admin.activeModelId, binding.modelId);
    assert.equal(admin.stateSchemaVersion, binding.stateSchemaVersion);
    assert.equal(admin.variantId, binding.variantId);
    assert.equal(admin.profileId, binding.profileId);
    assert.equal(admin.componentSchemaId, binding.componentSchemaId);
    assert.equal(admin.explanationSchemaId, binding.explanationSchemaId);
    assert.equal(admin.rankingPolicyId, binding.rankingPolicyId);
    assert.equal(admin.bestTimePolicyId, binding.bestTimePolicyId);
    assert.equal(admin.presentationPolicyId, binding.presentationPolicyId);
    assert.equal(admin.modelContractSha256, binding.modelContractSha256);
    assert.equal(admin.modelBundleSha256, binding.modelBundleSha256);
  }

  const edgePath = path.join(root, EDGE_PATH);
  const edge = (await fs.readFile(edgePath, 'utf8')).replace(/\r\n?/g, '\n');
  const edgePattern = /export const RAV_ASSISTANT_RAVSCORE_MODEL_BINDING = Object\.freeze\(\{[\s\S]*?\n\}\);/;
  const expectedEdge = replaceExactlyOnce(edge, edgePattern, renderEdgeBinding(binding), 'Edge assistant binding');
  if (write) {
    await fs.writeFile(edgePath, expectedEdge, 'utf8');
    changed.push(EDGE_PATH);
  } else {
    assert.equal(edge, expectedEdge, `${EDGE_PATH} has a stale generated RavScore binding`);
  }

  for (const relative of SQL_BINDING_PATHS) {
    const sqlPath = path.join(root, relative);
    const sql = (await fs.readFile(sqlPath, 'utf8')).replace(/\r\n?/g, '\n');
    const expectedSql = expectedMigration(sql, binding, candidateBinding);
    if (write) {
      await fs.writeFile(sqlPath, expectedSql, 'utf8');
      changed.push(relative);
    } else {
      assert.equal(sql, expectedSql, `${relative} has a stale RavScore binding`);
    }
  }
  return Object.freeze({ binding, candidateBinding, changed: Object.freeze(changed) });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const write = process.argv.includes('--write');
    const result = await synchronizeRavScoreModelBinding({ write });
    console.log(`RavScore binding ${write ? 'synchronized' : 'verified'} for ${JSON_BINDING_FILES.length + SQL_BINDING_PATHS.length + 2} consumers: ${result.binding.modelBundleSha256}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'RavScore binding synchronization failed');
    process.exitCode = 1;
  }
}
