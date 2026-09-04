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
import {
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_BINDING_FILES = Object.freeze([
  'knowledge/rav-assistant-public-v1.json',
  'scripts/fixtures/rav-assistant-evals-v1.json',
]);
const VERSION_PATH = 'version.json';
const EDGE_PATH = 'supabase/functions/_shared/rav-assistant-contract.ts';
const SQL_BINDING_PATHS = Object.freeze([
  'supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
]);
const CHECKPOINT_METADATA_CAS_MIGRATION_PATH =
  'supabase/migrations/20260904140000_harmonie_wind_reference_binding.sql';
const CHECKPOINT_METADATA_CAS_MARKER = 'RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED';
const CHECKPOINT_METADATA_CAS_INNER_MARKERS = Object.freeze([
  'RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED',
  'RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED',
  'RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED',
  'RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED',
  'RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED',
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactGeneratedBlock(source, marker, label) {
  const markerLine = suffix => new RegExp(
    `^[\\t ]*-- ${escapeRegExp(marker)}_${suffix}[\\t ]*$`,
    'gm',
  );
  const starts = [...source.matchAll(markerLine('BEGIN'))];
  const ends = [...source.matchAll(markerLine('END'))];
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(
      `${label}: exact generated binding markers are missing or duplicated `
      + `(BEGIN=${starts.length}, END=${ends.length})`,
    );
  }
  const start = starts[0].index;
  const end = ends[0].index + ends[0][0].length;
  if (ends[0].index <= start) {
    throw new Error(`${label}: generated binding markers are reversed or overlapping`);
  }
  return Object.freeze({ start, end, text: source.slice(start, end) });
}

function assertStateBindingBlock(block, expectedEntries, label) {
  const matches = [...block.matchAll(
    /p_state\s*->>\s*'([^']+)'\s*is\s*distinct\s*from\s*'([^']*)'/g,
  )];
  const actualEntries = matches.map(match => [match[1], match[2]]);
  assert.deepEqual(
    actualEntries,
    expectedEntries,
    `${label}: exact state binding fields or values drifted`,
  );
}

function assertJsonBindingBlock(block, binding, assertion, label) {
  const matches = [...block.matchAll(/\bis\s+distinct\s+from\s+'(\{[\s\S]*?\})'::jsonb\s+then\b/g)];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one JSONB binding literal, found ${matches.length}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch {
    throw new Error(`${label}: JSONB binding literal is not valid JSON`);
  }
  assertion(parsed, label);
  assert.deepEqual(parsed, binding, `${label}: exact model binding drifted`);
}

function checkpointMetadataCasBlock(source, binding, candidateBinding, continuationHash) {
  const label = `${CHECKPOINT_METADATA_CAS_MIGRATION_PATH} checkpoint metadata CAS`;
  const outer = exactGeneratedBlock(source, CHECKPOINT_METADATA_CAS_MARKER, label);
  const innerBlocks = Object.fromEntries(CHECKPOINT_METADATA_CAS_INNER_MARKERS.map(marker => [
    marker,
    exactGeneratedBlock(source, marker, `${label} ${marker}`),
  ]));
  for (const [marker, block] of Object.entries(innerBlocks)) {
    if (block.start <= outer.start || block.end >= outer.end) {
      throw new Error(`${label}: ${marker} is not strictly contained by the outer generated block`);
    }
  }

  const expectedMarkerNames = [CHECKPOINT_METADATA_CAS_MARKER, ...CHECKPOINT_METADATA_CAS_INNER_MARKERS]
    .flatMap(marker => [`${marker}_BEGIN`, `${marker}_END`])
    .sort();
  const actualMarkerNames = [...source.matchAll(
    /^[\t ]*-- (RAVSCORE_CHECKPOINT_[A-Z0-9_]+_GENERATED_(?:BEGIN|END))[\t ]*$/gm,
  )].map(match => match[1]).sort();
  assert.deepEqual(
    actualMarkerNames,
    expectedMarkerNames,
    `${label}: exact generated marker inventory drifted`,
  );

  assertStateBindingBlock(
    innerBlocks.RAVSCORE_CHECKPOINT_INTEGRATED_STATE_BINDING_GENERATED.text,
    [
      ['schemaVersion', binding.stateSchemaVersion],
      ['modelId', binding.modelId],
      ['variantId', binding.variantId],
      ['profileId', binding.profileId],
      ['componentSchemaId', binding.componentSchemaId],
      ['explanationSchemaId', binding.explanationSchemaId],
      ['rankingPolicyId', binding.rankingPolicyId],
      ['bestTimePolicyId', binding.bestTimePolicyId],
      ['presentationPolicyId', binding.presentationPolicyId],
      ['modelContractSha256', binding.modelContractSha256],
      ['modelBundleSha256', binding.modelBundleSha256],
    ],
    `${label} integrated-state binding`,
  );
  assertStateBindingBlock(
    innerBlocks.RAVSCORE_CHECKPOINT_CANDIDATE_STATE_BINDING_GENERATED.text,
    [
      ['schemaVersion', candidateBinding.stateSchemaVersion],
      ['modelId', candidateBinding.modelId],
      ['variantId', candidateBinding.variantId],
      ['profileId', candidateBinding.profileId],
    ],
    `${label} Candidate G state binding`,
  );

  const continuationBlock =
    innerBlocks.RAVSCORE_CHECKPOINT_CONTINUATION_STATE_CONTRACT_GENERATED.text;
  const continuationMatches = [...continuationBlock.matchAll(
    /p_payload\s*->>\s*'continuationStateContractSha256'\s*is\s*distinct\s*from\s*'([^']*)'/g,
  )];
  if (continuationMatches.length !== 1) {
    throw new Error(
      `${label} continuation-state contract: expected exactly one hash binding, `
      + `found ${continuationMatches.length}`,
    );
  }
  assert.equal(
    continuationMatches[0][1],
    continuationHash,
    `${label}: continuation-state contract hash drifted`,
  );

  assertJsonBindingBlock(
    innerBlocks.RAVSCORE_CHECKPOINT_INTEGRATED_BINDING_GENERATED.text,
    binding,
    assertRavScoreModelBinding,
    `${label} integrated payload binding`,
  );
  assertJsonBindingBlock(
    innerBlocks.RAVSCORE_CHECKPOINT_CANDIDATE_G_ROLLBACK_BINDING_GENERATED.text,
    candidateBinding,
    assertCandidateGRollbackModelBinding,
    `${label} Candidate G rollback payload binding`,
  );
  return outer.text;
}

function replaceGeneratedBlock(source, marker, replacement, label) {
  const block = exactGeneratedBlock(source, marker, label);
  return `${source.slice(0, block.start)}${replacement}${source.slice(block.end)}`;
}

function assertMutableSqlBindingPath(relative) {
  const normalized = relative.replace(/\\/g, '/');
  if (normalized.startsWith('supabase/migrations/')) {
    throw new Error(`Historical migration cannot be a RavScore binding write target: ${relative}`);
  }
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
  const continuationHash = await ravScoreContinuationImplementationSha256({ repositoryRoot: root });

  // Historical migrations are immutable. The newest migration is a read-only,
  // prevalidated anchor; only its exact outer generated block may flow forward
  // into the mutable schema and installation copies.
  const checkpointMigrationPath = path.join(root, CHECKPOINT_METADATA_CAS_MIGRATION_PATH);
  const checkpointMigration = (await fs.readFile(checkpointMigrationPath, 'utf8'))
    .replace(/\r\n?/g, '\n');
  const checkpointBlock = checkpointMetadataCasBlock(
    checkpointMigration,
    binding,
    candidateBinding,
    continuationHash,
  );
  const sqlPlans = [];
  for (const relative of SQL_BINDING_PATHS) {
    assertMutableSqlBindingPath(relative);
    const sqlPath = path.join(root, relative);
    const sql = (await fs.readFile(sqlPath, 'utf8')).replace(/\r\n?/g, '\n');
    const expectedTripBindings = expectedMigration(sql, binding, candidateBinding);
    const expectedSql = replaceGeneratedBlock(
      expectedTripBindings,
      CHECKPOINT_METADATA_CAS_MARKER,
      checkpointBlock,
      `${relative} checkpoint metadata CAS`,
    );
    sqlPlans.push(Object.freeze({ relative, sqlPath, sql, expectedSql }));
  }

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

  const versionPath = path.join(root, VERSION_PATH);
  const versionDocument = JSON.parse(await fs.readFile(versionPath, 'utf8'));
  if (write) {
    const releaseContract = versionDocument.releaseContract
      && typeof versionDocument.releaseContract === 'object'
      && !Array.isArray(versionDocument.releaseContract)
      ? versionDocument.releaseContract
      : {};
    const modelBindings = releaseContract.modelBindings
      && typeof releaseContract.modelBindings === 'object'
      && !Array.isArray(releaseContract.modelBindings)
      ? releaseContract.modelBindings
      : {};
    versionDocument.releaseContract = {
      ...releaseContract,
      modelBindings: {
        ...modelBindings,
        integrated: { ...binding },
        candidateGRollback: { ...candidateBinding },
      },
    };
    await fs.writeFile(versionPath, `${JSON.stringify(versionDocument, null, 2)}\n`, 'utf8');
    changed.push(VERSION_PATH);
  } else {
    const integrated = versionDocument?.releaseContract?.modelBindings?.integrated;
    const candidateGRollback = versionDocument?.releaseContract?.modelBindings?.candidateGRollback;
    assertRavScoreModelBinding(integrated, `${VERSION_PATH} integrated release binding`);
    assert.deepEqual(integrated, binding, `${VERSION_PATH} has a stale integrated release binding`);
    assertCandidateGRollbackModelBinding(candidateGRollback, `${VERSION_PATH} Candidate G rollback release binding`);
    assert.deepEqual(candidateGRollback, candidateBinding, `${VERSION_PATH} has a stale Candidate G rollback release binding`);
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

  for (const { relative, sqlPath, sql, expectedSql } of sqlPlans) {
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
    console.log(`RavScore binding ${write ? 'synchronized' : 'verified'} for ${JSON_BINDING_FILES.length + SQL_BINDING_PATHS.length + 4} consumers: ${result.binding.modelBundleSha256}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'RavScore binding synchronization failed');
    process.exitCode = 1;
  }
}
