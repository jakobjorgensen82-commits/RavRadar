#!/usr/bin/env node
// Exact metadata-only append. No SQL installation or private-state initializer.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWNER_WATER_LEVEL_ONLY_SUCCESSOR as previous,
  OWNER_ASSISTANT_KNOWLEDGE_SUCCESSOR as reviewedNext,
  OWNER_ASSISTANT_KNOWLEDGE_REFRESH_SUCCESSOR as reviewedRefresh } from './lib/bounded-conditions-predecessor-transition.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { computeCandidateGRollbackBundle } from './build-candidate-g-rollback-bundle.mjs';
import { computeRavScoreModelBundle } from './build-ravscore-model-bundle.mjs';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';

export const ASSISTANT_BINDING_PREDECESSOR_PATH =
  'supabase/migrations/20261005000000_owner_water_level_only_binding.sql';
export const ASSISTANT_BINDING_MIGRATION_PATH =
  'supabase/migrations/20261005060000_assistant_knowledge_binding.sql';
export const ASSISTANT_REFRESH_BINDING_MIGRATION_PATH =
  'supabase/migrations/20261007123000_assistant_knowledge_refresh_binding.sql';
const PREDECESSOR_SHA256 = '6b161bc71753b52c5728c8b9a03b02d5d0955d0e42e751a3f2a51a6ea6900496';
const REFRESH_PREDECESSOR_SHA256 = 'a141f7dead9e9bf680fc799c416a1f4f99a5c2b2a553bc061735d30744b1c6fa';
const HELPER = 'ravradar_ravscore_checkpoint_assistant_predecessor_projection';
const REFRESH_HELPER = 'ravradar_ravscore_checkpoint_assistant_refresh_predecessor_projection';
const WATER_HELPER = 'ravradar_ravscore_checkpoint_water_level_predecessor_projection';
const HASH_KEYS = Object.freeze(Object.keys(previous).sort());
const normalize = value => value.replace(/\r\n?/g, '\n');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const count = (text, value) => text.split(value).length - 1;

function definition(text, name) {
  const marker = 'create or replace function public.' + name + '(';
  const start = text.indexOf(marker), end = text.indexOf('\n$$;', start);
  assert.ok(start >= 0 && text.indexOf(marker, start + 1) === -1 && end > start,
    'Missing or duplicated exact function: ' + name);
  return text.slice(start, end + 4);
}

function once(text, before, after) {
  assert.equal(count(text, before), 1,
    'Ambiguous reviewed replacement: ' + before.slice(0, 90));
  return text.replace(before, () => after);
}

export function assertAssistantKnowledgeBindingTargets(actual, reviewed = reviewedNext) {
  assert.deepEqual(actual, reviewed,
    'Normal generated metadata and the exact original restore policy must agree');
}

export function assertAssistantKnowledgeRefreshBindingTargets(actual) {
  assert.deepEqual(actual, reviewedRefresh,
    'Normal generated 456 metadata must agree with its separate reviewed route');
}

// Pure rendering is testable with synthetic successor hashes. It is NOT
// permission to restore a generation; the normal caller separately requires
// its exact authenticated source identity and canonical original validators.
export function buildAssistantKnowledgeBindingSuccessor({ baseSql, targetHashes } = {}) {
  assert.equal(typeof baseSql, 'string', 'Missing applied predecessor SQL');
  const base = normalize(baseSql);
  assert.equal(digest(base), PREDECESSOR_SHA256,
    'The applied water-only migration must remain immutable');
  assert.ok(targetHashes && Object.getPrototypeOf(targetHashes) === Object.prototype,
    'Successor hashes must be a plain exact object');
  assert.deepEqual(Object.keys(targetHashes).sort(), HASH_KEYS,
    'Successor hash inventory must be exact');
  for (const key of HASH_KEYS) assert.match(targetHashes[key], /^[0-9a-f]{64}$/);
  assert.equal(new Set([...Object.values(previous), ...Object.values(targetHashes)]).size, 6,
    'Successor requires three distinct new implementation hashes');
  const next = targetHashes;
  const replacements = [];
  let result = base;
  const replace = (before, after) => {
    result = once(result, before, after);
    replacements.push([before, after]);
  };
  const renameCurrentHashes = text => text.replace(/[a-f0-9]{64}/g, value => {
    const key = HASH_KEYS.find(entry => previous[entry] === value);
    return key ? next[key] : value;
  });
  for (const name of ['ravradar_ravscore_checkpoint_integrated_state_valid',
    'ravradar_ravscore_checkpoint_payload_valid',
    'ravradar_ravscore_checkpoint_integrated_state_reason',
    'ravradar_ravscore_checkpoint_payload_reason']) {
    const before = definition(base, name);
    assert.equal(count(before, previous.integratedBundleSha256), 1, name);
    replace(before, renameCurrentHashes(before));
  }
  // Keep every historical trip binding; append exactly the new pair.
  for (const key of ['integratedBundleSha256', 'candidateBundleSha256']) {
    replace("        '" + previous[key] + "'\n      )",
      "        '" + previous[key] + "',\n        '" + next[key] + "'\n      )");
  }
  const waterBefore = definition(base, WATER_HELPER);
  const mapping = {
    '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51': previous.integratedBundleSha256,
    [previous.integratedBundleSha256]: next.integratedBundleSha256,
    '3e5aae87b19934091a7882fbd8f5b5570b7c83ba786ea6f3bac52a8fd71fcd1e': previous.candidateBundleSha256,
    [previous.candidateBundleSha256]: next.candidateBundleSha256,
    '3dd9b7f054dd19400e8110ec504c2689bd62c52741cf6cf7805070e89e51d1bd': previous.continuationStateContractSha256,
    [previous.continuationStateContractSha256]: next.continuationStateContractSha256,
  };
  const projection = waterBefore.replace(WATER_HELPER, HELPER)
    .replace(/[a-f0-9]{64}/g, value => mapping[value] ?? value);
  for (const [key, expectedCount] of [['integratedBundleSha256', 2],
    ['candidateBundleSha256', 1], ['continuationStateContractSha256', 1]]) {
    assert.equal(count(projection, previous[key]), expectedCount);
    assert.equal(count(projection, next[key]), expectedCount);
  }
  const waterAfter = once(waterBefore,
    '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n'
      + '  then return v_projected; end if;',
    '  -- Preserve exact 542 -> 543, then the metadata-only assistant successor.\n'
      + '  v_projected := public.' + HELPER + '(v_projected, p_target_reference);\n'
      + '  if v_projected is not null then return v_projected; end if;');
  replace(waterBefore, projection + '\nrevoke all on function public.' + HELPER
    + '(jsonb,timestamptz) from public, anon, authenticated;\n\n' + waterAfter);
  const predecessorBefore = definition(base, 'ravradar_ravscore_checkpoint_predecessor_payload_valid');
  replace(predecessorBefore, once(renameCurrentHashes(predecessorBefore), 'begin\n',
    'begin\n  if p_current_implementation_sha256 = \'' + next.continuationStateContractSha256 + '\'\n'
      + '    and public.' + HELPER + '(p_payload, p_target_reference) is not null\n'
      + '  then return true; end if;\n'));
  replace('  v_water_level_predecessor_payload jsonb;',
    '  v_water_level_predecessor_payload jsonb;\n  v_assistant_predecessor_payload jsonb;');
  replace('    if v_central_is_compatible_predecessor and v_water_level_predecessor_payload is not null then',
    '    v_assistant_predecessor_payload := public.' + HELPER + '(v_payload, v_central_reference);\n'
      + '    if v_central_is_compatible_predecessor and v_assistant_predecessor_payload is not null then\n'
      + '      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
      + "        and (v_assistant_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
      + "          #- '{candidateGRollbackCompanion,generationSha256}')\n"
      + "        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
      + "          #- '{candidateGRollbackCompanion,generationSha256}');\n"
      + '    elsif v_central_is_compatible_predecessor and v_water_level_predecessor_payload is not null then');
  const contractBefore = definition(base, 'ravradar_ravscore_checkpoint_contract');
  let contract = once(contractBefore, '  v_water_level_projection_definition text;',
    '  v_water_level_projection_definition text;\n  v_assistant_projection_definition text;');
  contract = once(contract,
    "pg_catalog.to_regprocedure('public." + WATER_HELPER + "(jsonb,timestamptz)')\n  ];",
    "pg_catalog.to_regprocedure('public." + WATER_HELPER + "(jsonb,timestamptz)'),\n"
      + "    pg_catalog.to_regprocedure('public." + HELPER + "(jsonb,timestamptz)')\n  ];");
  contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
    "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_assistant_projection_definition\n"
      + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[10];\n\n'
      + '  v_checkpoint_definition := v_canonical_time_definition');
  contract = once(contract,
    "    || E'\\n-- water-level-predecessor-projection --\\n' || v_water_level_projection_definition;",
    "    || E'\\n-- water-level-predecessor-projection --\\n' || v_water_level_projection_definition\n"
      + "    || E'\\n-- assistant-predecessor-projection --\\n' || v_assistant_projection_definition;");
  contract = once(contract, "'20261005000000'", "'20261005060000'");
  replace(contractBefore, contract);
  replace('-- Seven coastal zones allow verified dkss_lf waterLevel ONLY. Current/temperature exclusions, physical formulas and history remain unchanged.',
    '-- Assistant knowledge metadata-only successor. Seven-zone water-only policy, physical formulas, history, authentication and no-loss remain unchanged.');
  // This inverse proves there are no unrelated edits in any function/body.
  let inverse = result;
  for (const [before, after] of [...replacements].reverse()) inverse = once(inverse, after, before);
  assert.equal(inverse, base, 'Unreviewed SQL change outside the exact assistant bridge');
  assert.equal(count(result, "set statement_timeout = '55s'"), 2);
  assert.equal(count(result, "set statement_timeout = '30s'"), 0);
  assert.equal(count(result, "'20261005060000'"), 1);
  for (const name of ['ravradar_ravscore_checkpoint_candidate_state_valid',
    'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
    'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
    'ravradar_ravscore_checkpoint_top20_predecessor_projection']) {
    assert.equal(definition(result, name), definition(base, name),
      'Historical validators/projections must remain byte-identical: ' + name);
  }
  return result;
}

// Append from the exact already-written 455 SQL, not a regenerated/overwritten
// history file. Synthetic rendering is not original authentication or install.
export function buildAssistantKnowledgeRefreshBindingSuccessor({ baseSql, targetHashes } = {}) {
  assert.equal(typeof baseSql, 'string');
  const base = normalize(baseSql);
  assert.equal(digest(base), REFRESH_PREDECESSOR_SHA256,
    'The previously written 455 migration must remain immutable');
  assert.ok(targetHashes && Object.getPrototypeOf(targetHashes) === Object.prototype);
  assert.deepEqual(Object.keys(targetHashes).sort(), HASH_KEYS);
  for (const key of HASH_KEYS) assert.match(targetHashes[key], /^[0-9a-f]{64}$/);
  assert.equal(new Set([...Object.values(reviewedNext), ...Object.values(targetHashes)]).size, 6);
  const next = targetHashes, replacements = [];
  let result = base;
  const replace = (before, after) => {
    result = once(result, before, after); replacements.push([before, after]);
  };
  const renameCurrentHashes = text => text.replace(/[a-f0-9]{64}/g, value => {
    const key = HASH_KEYS.find(entry => reviewedNext[entry] === value);
    return key ? next[key] : value;
  });
  for (const name of ['ravradar_ravscore_checkpoint_integrated_state_valid',
    'ravradar_ravscore_checkpoint_payload_valid',
    'ravradar_ravscore_checkpoint_integrated_state_reason',
    'ravradar_ravscore_checkpoint_payload_reason']) {
    const before = definition(base, name);
    assert.equal(count(before, reviewedNext.integratedBundleSha256), 1, name);
    replace(before, renameCurrentHashes(before));
  }
  for (const key of ['integratedBundleSha256', 'candidateBundleSha256']) {
    replace("        '" + reviewedNext[key] + "'\n      )",
      "        '" + reviewedNext[key] + "',\n        '" + next[key] + "'\n      )");
  }
  const oldProjection = definition(base, HELPER), mapping = {};
  for (const key of HASH_KEYS) {
    mapping[previous[key]] = reviewedNext[key]; mapping[reviewedNext[key]] = next[key];
  }
  const projection = oldProjection.replace(HELPER, REFRESH_HELPER)
    .replace(/[a-f0-9]{64}/g, value => mapping[value] ?? value);
  for (const [key, expectedCount] of [['integratedBundleSha256', 2],
    ['candidateBundleSha256', 1], ['continuationStateContractSha256', 1]]) {
    assert.equal(count(projection, reviewedNext[key]), expectedCount);
    assert.equal(count(projection, next[key]), expectedCount);
  }
  const oldProjectionAfter = once(oldProjection,
    '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n'
      + '  then return v_projected; end if;',
    '  -- Preserve exact 543 -> 455, then the separately reviewed 456 metadata.\n'
      + '  v_projected := public.' + REFRESH_HELPER + '(v_projected, p_target_reference);\n'
      + '  if v_projected is not null then return v_projected; end if;');
  replace(oldProjection, projection + '\nrevoke all on function public.' + REFRESH_HELPER
    + '(jsonb,timestamptz) from public, anon, authenticated;\n\n' + oldProjectionAfter);
  const predecessor = definition(base, 'ravradar_ravscore_checkpoint_predecessor_payload_valid');
  replace(predecessor, once(renameCurrentHashes(predecessor), 'begin\n',
    'begin\n  if p_current_implementation_sha256 = \'' + next.continuationStateContractSha256 + '\'\n'
      + '    and public.' + REFRESH_HELPER + '(p_payload, p_target_reference) is not null\n'
      + '  then return true; end if;\n'));
  replace('  v_assistant_predecessor_payload jsonb;',
    '  v_assistant_predecessor_payload jsonb;\n  v_assistant_refresh_predecessor_payload jsonb;');
  replace('    if v_central_is_compatible_predecessor and v_assistant_predecessor_payload is not null then',
    '    v_assistant_refresh_predecessor_payload := public.' + REFRESH_HELPER + '(v_payload, v_central_reference);\n'
      + '    if v_central_is_compatible_predecessor and v_assistant_refresh_predecessor_payload is not null then\n'
      + '      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
      + "        and (v_assistant_refresh_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
      + "          #- '{candidateGRollbackCompanion,generationSha256}')\n"
      + "        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
      + "          #- '{candidateGRollbackCompanion,generationSha256}');\n"
      + '    elsif v_central_is_compatible_predecessor and v_assistant_predecessor_payload is not null then');
  const contractBefore = definition(base, 'ravradar_ravscore_checkpoint_contract');
  let contract = once(contractBefore, '  v_assistant_projection_definition text;',
    '  v_assistant_projection_definition text;\n  v_assistant_refresh_projection_definition text;');
  contract = once(contract,
    "pg_catalog.to_regprocedure('public." + HELPER + "(jsonb,timestamptz)')\n  ];",
    "pg_catalog.to_regprocedure('public." + HELPER + "(jsonb,timestamptz)'),\n"
      + "    pg_catalog.to_regprocedure('public." + REFRESH_HELPER + "(jsonb,timestamptz)')\n  ];");
  contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
    "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_assistant_refresh_projection_definition\n"
      + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[11];\n\n'
      + '  v_checkpoint_definition := v_canonical_time_definition');
  contract = once(contract,
    "    || E'\\n-- assistant-predecessor-projection --\\n' || v_assistant_projection_definition;",
    "    || E'\\n-- assistant-predecessor-projection --\\n' || v_assistant_projection_definition\n"
      + "    || E'\\n-- assistant-refresh-predecessor-projection --\\n' || v_assistant_refresh_projection_definition;");
  contract = once(contract, "'20261005060000'", "'20261007123000'");
  replace(contractBefore, contract);
  replace('-- Assistant knowledge metadata-only successor. Seven-zone water-only policy, physical formulas, history, authentication and no-loss remain unchanged.',
    '-- Additive 456 assistant metadata-only successor. Both previous migrations, water-only policy, physical formulas, history, authentication and no-loss remain unchanged.');
  let inverse = result;
  for (const [before, after] of [...replacements].reverse()) inverse = once(inverse, after, before);
  assert.equal(inverse, base, 'Unreviewed SQL change outside the exact additive 456 bridge');
  assert.equal(count(result, "set statement_timeout = '55s'"), 2);
  assert.equal(count(result, "set statement_timeout = '30s'"), 0);
  assert.equal(count(result, "'20261007123000'"), 1);
  for (const name of ['ravradar_ravscore_checkpoint_candidate_state_valid', WATER_HELPER,
    'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
    'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
    'ravradar_ravscore_checkpoint_top20_predecessor_projection']) {
    assert.equal(definition(result, name), definition(base, name), name);
  }
  return result;
}

async function main() {
  const mode = process.argv[2] ?? '--refresh-check';
  assert.ok(['--check', '--write', '--refresh-check', '--refresh-write'].includes(mode) && process.argv.length <= 3);
  const refresh = mode.startsWith('--refresh-');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const [baseSql, candidateBundle, integratedBundle, contracts] = await Promise.all([
    fs.readFile(path.join(root, refresh ? ASSISTANT_BINDING_MIGRATION_PATH : ASSISTANT_BINDING_PREDECESSOR_PATH), 'utf8'),
    computeCandidateGRollbackBundle({ root }), computeRavScoreModelBundle({ root }),
    privateRuntimeContractHashes({ repositoryRoot: root }),
  ]);
  const integrated = ravScoreModelBinding(), candidate = candidateBinding();
  assert.equal(integrated.modelContractSha256, integratedBundle.contractSha256,
    'Integrated physical contract must match its actual normal source contract');
  assert.equal(candidate.modelContractSha256, candidateBundle.contractSha256,
    'Candidate physical contract must match its actual normal source contract');
  assert.equal(integrated.modelBundleSha256, integratedBundle.modelBundleSha256,
    'Integrated generated metadata must match its actual normal source closure');
  assert.equal(candidate.modelBundleSha256, candidateBundle.modelBundleSha256,
    'Candidate generated metadata must match its actual normal source closure');
  assert.equal(integrated.modelContractSha256, 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b');
  assert.equal(candidate.modelContractSha256, 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8');
  assert.equal(contracts.fullRuntimeContractSha256, 'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff');
  assert.equal(contracts.publicProjectionContractSha256, 'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09');
  const targetHashes = {
    integratedBundleSha256: integrated.modelBundleSha256,
    candidateBundleSha256: candidate.modelBundleSha256,
    continuationStateContractSha256: contracts.continuationStateContractSha256,
  };
  if (refresh) assertAssistantKnowledgeRefreshBindingTargets(targetHashes);
  else assertAssistantKnowledgeBindingTargets(targetHashes);
  const result = refresh ? buildAssistantKnowledgeRefreshBindingSuccessor({ baseSql, targetHashes })
    : buildAssistantKnowledgeBindingSuccessor({ baseSql, targetHashes });
  const destination = path.join(root, refresh ? ASSISTANT_REFRESH_BINDING_MIGRATION_PATH : ASSISTANT_BINDING_MIGRATION_PATH);
  if (mode === '--write' || mode === '--refresh-write') {
    // Creation only. Never overwrite an applied or previously written migration.
    await fs.writeFile(destination, result, { encoding: 'utf8', flag: 'wx' });
  } else {
    assert.equal(normalize(await fs.readFile(destination, 'utf8')), result,
      'Assistant migration must match the exact normal metadata and immutable predecessor');
  }
  console.log('Assistant metadata-only binding: exact inverse, historical chains, restricted helper and 55s unchanged.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
