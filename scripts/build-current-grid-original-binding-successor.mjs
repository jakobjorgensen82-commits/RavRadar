#!/usr/bin/env node
// Native-grid source successor. This does NOT project/relabel old current memory.
// It accepts an immutable old central checkpoint ONLY for a strictly NEW-hour
// CAS, after full fixed original validation; new payloads use actual new globals.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ravScoreModelBinding, assertRavScoreModelBinding }
  from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding, assertRavScoreModelBinding as assertCandidateBinding }
  from './rollback-assets/ravscore-model-contract.js';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';
import { CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY as original,
  assertCurrentGridSamplingSourceSuccessor } from './lib/bounded-conditions-predecessor-transition.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CURRENT_GRID_ORIGINAL_BINDING_MIGRATION =
  'supabase/migrations/20261012000000_current_grid_original_bound_successor.sql';
const PREDECESSOR =
  'supabase/migrations/20261005000000_owner_water_level_only_binding.sql';
const PREDECESSOR_SHA256 =
  '6b161bc71753b52c5728c8b9a03b02d5d0955d0e42e751a3f2a51a6ea6900496';
const OLD_STATE = 'ravradar_ravscore_checkpoint_integrated_state_valid';
const OLD_PAYLOAD = 'ravradar_ravscore_checkpoint_payload_valid';
const ORIGINAL_STATE = 'ravradar_ravscore_checkpoint_grid_original_state_valid';
const ORIGINAL_PAYLOAD = 'ravradar_ravscore_checkpoint_grid_original_payload_valid';
const normalize = value => String(value).replace(/\r\n?/g, '\n');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const count = (source, value) => source.split(value).length - 1;

function definition(source, name) {
  const marker = 'create or replace function public.' + name + '(';
  const start = source.indexOf(marker), end = source.indexOf('\n$$;', start);
  assert.ok(start >= 0 && source.indexOf(marker, start + 1) === -1 && end > start,
    'Missing or ambiguous exact SQL function: ' + name);
  return source.slice(start, end + 4);
}
function once(source, before, after) {
  assert.equal(count(source, before), 1,
    'Ambiguous reviewed source replacement: ' + before.slice(0, 100));
  return source.replace(before, () => after);
}
function bindingLiteral(source, variable) {
  const pattern = new RegExp("if " + variable
    + " is distinct from '([\\s\\S]*?)'::jsonb then", 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, 'Exact original binding literal: ' + variable);
  return JSON.parse(matches[0][1]);
}
function fixedOriginalMarkers(source) {
  return source.replace(/RAVSCORE_CHECKPOINT_([A-Z0-9_]+)_GENERATED_(BEGIN|END)/g,
    'RAVSCORE_CURRENT_GRID_ORIGINAL_$1_FIXED_$2');
}
function mutableGeneratedMarkers(source) {
  return [...source.matchAll(
    /^[\t ]*-- (RAVSCORE_CHECKPOINT_[A-Z0-9_]+_GENERATED_(?:BEGIN|END))[\t ]*$/gm,
  )].map(match => match[1]).sort();
}

// Read-only render seam for normal SOURCE tests. No root/binding/descriptor/
// target-hour overrides are accepted. It cannot authorize installation or write
// any generation, checkpoint, public data, old migration or model binding.
export async function buildCurrentGridOriginalBindingSuccessor() {
  if (arguments.length !== 0) {
    throw new Error('Current-grid SOURCE builder accepts no arguments');
  }
  assertCurrentGridSamplingSourceSuccessor();
  const integrated = ravScoreModelBinding();
  const candidate = candidateBinding();
  assertRavScoreModelBinding(integrated);
  assertCandidateBinding(candidate);
  const contracts = await privateRuntimeContractHashes({ repositoryRoot: ROOT });
  for (const value of [integrated.modelBundleSha256, candidate.modelBundleSha256,
    ...Object.values(contracts)]) assert.match(value, /^[0-9a-f]{64}$/);
  assert.notEqual(integrated.modelBundleSha256, original.sourceModelBinding.modelBundleSha256);
  assert.notEqual(candidate.modelBundleSha256, original.sourceCandidateModelBinding.modelBundleSha256);
  assert.notEqual(contracts.continuationStateContractSha256,
    original.sourceContractHashes.continuationStateContractSha256);
  assert.equal(contracts.fullRuntimeContractSha256,
    original.sourceContractHashes.fullRuntimeContractSha256);
  assert.equal(contracts.publicProjectionContractSha256,
    original.sourceContractHashes.publicProjectionContractSha256);
  assert.deepEqual({ ...integrated,
    modelBundleSha256: original.sourceModelBinding.modelBundleSha256 },
  original.sourceModelBinding);
  assert.deepEqual({ ...candidate,
    modelBundleSha256: original.sourceCandidateModelBinding.modelBundleSha256 },
  original.sourceCandidateModelBinding);

  const base = normalize(await fs.readFile(path.join(ROOT, PREDECESSOR), 'utf8'));
  assert.equal(digest(base), PREDECESSOR_SHA256,
    'The canonical Oct5 predecessor is immutable, not an editable binding source');
  const originalState = definition(base, OLD_STATE);
  const originalPayload = definition(base, OLD_PAYLOAD);
  assert.equal(digest(originalState),
    '3521863b7c0f9ca11a4a9b13e56350832a63c0ad09d46779c0dd0b2f9b142d46');
  assert.equal(digest(originalPayload),
    '9c3b3488265378050451a6000377a517659dce1949c57e06a39c17a743c5143c');
  assert.deepEqual(bindingLiteral(originalPayload, 'v_integrated_binding'),
    original.sourceModelBinding);
  assert.deepEqual(bindingLiteral(originalPayload, 'v_candidate_binding'),
    original.sourceCandidateModelBinding);
  assert.equal(count(originalPayload,
    original.sourceContractHashes.continuationStateContractSha256), 1);

  const replacements = [];
  let result = base;
  const replace = (before, after, label) => {
    result = once(result, before, after);
    replacements.push(Object.freeze({ before, after, label }));
  };
  const newValues = {
    [original.sourceModelBinding.modelBundleSha256]: integrated.modelBundleSha256,
    [original.sourceCandidateModelBinding.modelBundleSha256]: candidate.modelBundleSha256,
    [original.sourceContractHashes.continuationStateContractSha256]:
      contracts.continuationStateContractSha256,
  };
  const currentNames = [
    OLD_STATE, OLD_PAYLOAD,
    'ravradar_ravscore_checkpoint_integrated_state_reason',
    'ravradar_ravscore_checkpoint_payload_reason',
  ];
  for (const name of currentNames) {
    const before = definition(base, name);
    const expectedCounts = name.includes('payload') ? [1, 1, 1] : [1, 0, 0];
    Object.keys(newValues).forEach((value, index) =>
      assert.equal(count(before, value), expectedCounts[index], name));
    replace(before, before.replace(/[a-f0-9]{64}/g, value => newValues[value] ?? value),
      'actual current I/C/T only: ' + name);
  }

  // Keep every historical trip binding, adding just the actual native-grid
  // source successor. The existing centrally active admission guard is unchanged.
  const tripName = 'ravradar_trip_v3_binding_allowed';
  const oldTrip = definition(base, tripName);
  let trip = oldTrip;
  for (const [beforeHash, afterHash] of Object.entries(newValues).slice(0, 2)) {
    assert.equal(count(trip, beforeHash), 1);
    trip = once(trip, "        '" + beforeHash + "'\n      )",
      "        '" + beforeHash + "',\n        '" + afterHash + "'\n      )");
  }
  replace(oldTrip, trip, 'append only exact historical trip successor I/C');

  // Preserve ALL old physical validation unchanged under original-only names.
  // Only own function/callee names and binding-comment marker namespace differ.
  // Never replace the old I/C/T literals or return a projected/rebound payload.
  const fixedState = fixedOriginalMarkers(once(originalState,
    'public.' + OLD_STATE + '(', 'public.' + ORIGINAL_STATE + '('));
  let fixedPayload = once(originalPayload,
    'public.' + OLD_PAYLOAD + '(', 'public.' + ORIGINAL_PAYLOAD + '(');
  fixedPayload = once(fixedPayload,
    'public.' + OLD_STATE + '(', 'public.' + ORIGINAL_STATE + '(');
  fixedPayload = fixedOriginalMarkers(fixedPayload);
  assert.ok(!fixedState.includes(integrated.modelBundleSha256));
  assert.ok(!fixedPayload.includes(candidate.modelBundleSha256));
  assert.ok(!fixedPayload.includes(contracts.continuationStateContractSha256));
  const fixedDefinitions = fixedState
    + '\nrevoke all on function public.' + ORIGINAL_STATE
    + '(jsonb,text) from public, anon, authenticated;\n\n'
    + fixedPayload + '\nrevoke all on function public.' + ORIGINAL_PAYLOAD
    + '(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  const currentPayload = definition(result, OLD_PAYLOAD);
  replace(currentPayload, fixedDefinitions + currentPayload,
    'fixed full original validation; no projection or initializer');

  const casName = 'ravradar_ravscore_checkpoint_cas';
  const oldCas = definition(base, casName);
  const oldBranch =
    '      v_central_is_compatible_predecessor := false;\n'
    + '    elsif public.ravradar_ravscore_checkpoint_predecessor_payload_valid(';
  const newBranch =
    '      v_central_is_compatible_predecessor := false;\n'
    + '    elsif p_target_reference > v_central_reference\n'
    + "      and p_payload ->> 'continuationStateContractSha256' =\n"
    + "        '" + contracts.continuationStateContractSha256 + "'\n"
    + '      and public.' + ORIGINAL_PAYLOAD + '(v_payload, v_central_reference)\n'
    + '    then\n'
    + '      -- Validate the immutable old central row only. It is NOT a\n'
    + '      -- projected current-memory checkpoint or same-reference successor.\n'
    + '      v_central_is_compatible_predecessor := false;\n'
    + '    elsif public.ravradar_ravscore_checkpoint_predecessor_payload_valid(';
  replace(oldCas, once(oldCas, oldBranch, newBranch),
    'strictly newer exact-T CAS over fully valid fixed original central row');

  const contractName = 'ravradar_ravscore_checkpoint_contract';
  const oldContract = definition(base, contractName);
  let contract = once(oldContract,
    '  v_water_level_projection_definition text;',
    '  v_water_level_projection_definition text;\n'
    + '  v_current_grid_original_state_definition text;\n'
    + '  v_current_grid_original_payload_definition text;');
  contract = once(contract,
    "    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)')\n  ];",
    "    pg_catalog.to_regprocedure('public.ravradar_ravscore_checkpoint_water_level_predecessor_projection(jsonb,timestamptz)'),\n"
    + "    pg_catalog.to_regprocedure('public." + ORIGINAL_STATE + "(jsonb,text)'),\n"
    + "    pg_catalog.to_regprocedure('public." + ORIGINAL_PAYLOAD + "(jsonb,timestamptz)')\n  ];");
  contract = once(contract,
    '  v_checkpoint_definition := v_canonical_time_definition',
    "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_current_grid_original_state_definition\n"
    + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[10];\n\n'
    + "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_current_grid_original_payload_definition\n"
    + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[11];\n\n'
    + '  v_checkpoint_definition := v_canonical_time_definition');
  contract = once(contract,
    "    || E'\\n-- water-level-predecessor-projection --\\n' || v_water_level_projection_definition;",
    "    || E'\\n-- water-level-predecessor-projection --\\n' || v_water_level_projection_definition\n"
    + "    || E'\\n-- current-grid-original-state-validator --\\n' || v_current_grid_original_state_definition\n"
    + "    || E'\\n-- current-grid-original-payload-validator --\\n' || v_current_grid_original_payload_definition;");
  contract = once(contract, "'20261005000000'", "'20261012000000'");
  replace(oldContract, contract,
    'exact canonical readback includes both fixed original validators and restrictions');

  replace('-- Seven coastal zones allow verified dkss_lf waterLevel ONLY. Current/temperature exclusions, physical formulas and history remain unchanged.',
    '-- Native-grid current SOURCE successor: NEW-hour current memory only; old originals/history remain unchanged. Seven coastal LF water-only policy and all physical formulas remain unchanged.',
  'source successor purpose, not metadata-only current-memory projection');

  for (const name of [
    'ravradar_trip_v3_score_quality_allowed',
    'ravradar_trip_v3_calibration_truth_allowed',
    'version_admin_document',
    'ravradar_ravscore_checkpoint_canonical_time',
    'ravradar_ravscore_checkpoint_has_forbidden_key',
    'ravradar_ravscore_checkpoint_candidate_state_valid',
    'ravradar_ravscore_checkpoint_top20_predecessor_projection',
    'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
    'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
    'ravradar_ravscore_checkpoint_water_level_predecessor_projection',
    'ravradar_ravscore_checkpoint_predecessor_payload_valid',
  ]) assert.equal(definition(result, name), definition(base, name),
    'Unchanged historical/security/physical function: ' + name);
  assert.deepEqual(mutableGeneratedMarkers(result), mutableGeneratedMarkers(base),
    'Original fixed markers must not duplicate the mutable binding inventory');
  assert.equal(count(result, "set statement_timeout = '55s'"), 2);
  assert.equal(count(result, "set statement_timeout = '30s'"), 0);
  assert.equal(count(result, "'20261012000000'"), 1);
  let inverse = result;
  for (const { before, after } of [...replacements].reverse()) inverse = once(inverse, after, before);
  assert.equal(inverse, base, 'SQL changes outside the exact SOURCE replacement ledger');
  return Object.freeze({
    source: result,
    predecessor: PREDECESSOR,
    predecessorSha256: PREDECESSOR_SHA256,
    destination: CURRENT_GRID_ORIGINAL_BINDING_MIGRATION,
    integratedBinding: Object.freeze({ ...integrated }),
    candidateBinding: Object.freeze({ ...candidate }),
    contractHashes: Object.freeze({ ...contracts }),
    fieldInventory: Object.freeze(replacements.map(({ label, before, after }) =>
      Object.freeze({ label, beforeSha256: digest(before), afterSha256: digest(after) }))),
    inverseVerified: true,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? '--check';
  assert.ok(['--check', '--write'].includes(mode));
  assert.equal(process.argv.length <= 3, true, 'No binding/root/output overrides are accepted');
  const built = await buildCurrentGridOriginalBindingSuccessor();
  const destination = path.join(ROOT, CURRENT_GRID_ORIGINAL_BINDING_MIGRATION);
  if (mode === '--write') {
    // Source-only append: never overwrite a pre-existing migration.
    await fs.writeFile(destination, built.source, { encoding: 'utf8', flag: 'wx' });
  } else {
    assert.equal(normalize(await fs.readFile(destination, 'utf8')), built.source,
      'The new canonical current-grid SOURCE migration is missing or stale');
  }
  console.log('Current-grid SOURCE successor: fixed full original validation, strict NEW-hour CAS, immutable predecessor and exact inverse.');
}
