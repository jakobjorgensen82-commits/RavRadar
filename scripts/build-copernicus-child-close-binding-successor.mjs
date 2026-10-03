#!/usr/bin/env node
// The owner's scoped CP child-close approval: an exact, append-only binding
// bridge, not a physical-score change, source alias or SQL installation.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { canonicalBundleJson } from './build-ravscore-model-bundle.mjs';

const oldHash = '3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852';
const newHash = '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948';
const continuation = '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab';
const currentContinuation = 'd983bb085f75252d00f0e2585cd0e274ea86020000f99037e9054a3989a4aef6';
const oldCandidateHash = 'a2494810db3a335376795e308d149f5856885c05665d9f155fc6b0632344c021';
const newCandidateHash = '28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7';
const destination = 'supabase/migrations/20261003080000_copernicus_child_close_binding.sql';
const normalize = text => text.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const mode = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(mode));

// Fixed metadata-only manifests keep this issued successor reproducible when
// future native code changes. Current source is independently checked by the
// native builder; no runtime consumer reads or substitutes these proof hashes.
const proof = JSON.parse(await fs.readFile(
  'scripts/fixtures/top20-display-binding-source-proof.json', 'utf8'));
assert.equal(proof.metadataOnly, true);
assert.equal(digest(canonicalBundleJson(proof.successorManifest)), oldHash);
const successorManifest = structuredClone(proof.successorManifest);
const changed = successorManifest.files.filter(entry =>
  entry.path === 'scripts/lib/copernicus-component-index.mjs');
assert.equal(changed.length, 1);
assert.equal(changed[0].sha256,
  '6119a6e5091c8a190874c19d7f6f09d2998b99ed29af285815a736e2fe2cf72d');
changed[0].sha256 = 'cfdfdab9bbd9fe286d8ab6899845263fe031e2d2e933838f99901145ca15f48f';
// The shared index also identifies Candidate G. Its normally generated HASH
// metadata is itself in the integrated closure; bind that derived file too.
// This is not a second physical implementation delta or an excluded module.
const generatedCandidateChanged = successorManifest.files.filter(entry =>
  entry.path === 'scripts/rollback-assets/ravscore-model-bundle.generated.js');
assert.equal(generatedCandidateChanged.length, 1);
generatedCandidateChanged[0].sha256 = proof.continuationSuccessorGeneratedFileSha256;
assert.equal(digest(canonicalBundleJson(successorManifest)), newHash);
assert.equal(successorManifest.files.length, 67);
assert.equal(digest(JSON.stringify(proof.candidateGRollbackManifest)), oldCandidateHash);
assert.equal(proof.candidateGRollbackContractSha256,
  'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8');
const candidateManifest = structuredClone(proof.candidateGRollbackManifest);
const candidateChanged = candidateManifest.files.filter(entry =>
  entry.file === 'scripts/lib/copernicus-component-index.mjs');
assert.equal(candidateChanged.length, 1);
assert.equal(candidateChanged[0].sha256,
  '6119a6e5091c8a190874c19d7f6f09d2998b99ed29af285815a736e2fe2cf72d');
candidateChanged[0].sha256 = changed[0].sha256;
assert.equal(digest(JSON.stringify(candidateManifest)), newCandidateHash);
assert.equal(candidateManifest.files.length, 65);
assert.equal(proof.continuationPredecessorFileHashes.length, 12);
assert.equal(digest(JSON.stringify(proof.continuationPredecessorFileHashes)), continuation);
const continuationRows = structuredClone(proof.continuationPredecessorFileHashes);
const continuationChanged = continuationRows.filter(([file]) =>
  file === 'scripts/rollback-assets/ravscore-model-bundle.generated.js');
assert.equal(continuationChanged.length, 1);
continuationChanged[0][1] = proof.continuationSuccessorGeneratedFileSha256;
assert.equal(digest(JSON.stringify(continuationRows)), currentContinuation);

async function immutable(file, expected) {
  const text = normalize(await fs.readFile(file, 'utf8'));
  assert.equal(digest(text), expected, `${file}: applied predecessor changed`);
  return text;
}
function definition(text, name) {
  const marker = `create or replace function public.${name}(`;
  const start = text.indexOf(marker);
  assert.ok(start >= 0 && text.indexOf(marker, start + 1) === -1, name);
  const end = text.indexOf('\n$$;', start);
  assert.ok(end > start, name);
  return text.slice(start, end + 4);
}
function once(text, before, after) {
  assert.equal(count(text, before), 1, `Ambiguous reviewed replacement: ${before.slice(0, 80)}`);
  return text.replace(before, () => after);
}
const base = await immutable('supabase/migrations/20261002080000_top20_display_binding.sql',
  '103de25ac4521bef4a1b041dd2ad65eb8465c6ab38dc19b23947c675ad5b60a8');
const timeout = await immutable('supabase/migrations/20261002094500_restore_checkpoint_cas_timeout.sql',
  '31632e333f16bf07f00f95cc87e19cb66a92fd4448ac0a27c1b4f7964e9eee47');
let result = base;
// Only the current state/payload validators and their matching diagnostics
// advance. Historical Top20 endpoints and all older bridge predicates remain.
for (const name of ['ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_integrated_state_reason',
  'ravradar_ravscore_checkpoint_payload_reason']) {
  const before = definition(base, name);
  assert.equal(count(before, oldHash), 1, name);
  result = once(result, before, before.replace(oldHash, newHash)
    .replaceAll(oldCandidateHash, newCandidateHash)
    .replaceAll(continuation, currentContinuation));
}
result = once(result, `        '${oldHash}'\n      )`,
  `        '${oldHash}',\n        '${newHash}'\n      )`);
result = once(result,
  `and p_calibration_features ->> 'modelBundleSha256' = '${oldCandidateHash}'`,
  `and p_calibration_features ->> 'modelBundleSha256' in (\n        '${oldCandidateHash}',\n        '${newCandidateHash}'\n      )`);

// Pure exact 3a14 -> 29ea bridge. Require all 673 homogeneous states, then
// validate the entire resulting current payload. Never rewrite a stored row,
// private cipher, time, measurement, role, history or companion state here.
const helperName = 'ravradar_ravscore_checkpoint_cp_close_predecessor_projection';
let projection = definition(base, 'ravradar_ravscore_checkpoint_top20_predecessor_projection')
  .replace('ravradar_ravscore_checkpoint_top20_predecessor_projection', helperName)
  .replaceAll('c557f91a520ae64211f9441f25fc72a9c230691cdb7b48551ecb7286463420eb', oldHash)
  .replaceAll(`pg_catalog.to_jsonb('${oldHash}'::text)`, `pg_catalog.to_jsonb('${newHash}'::text)`);
projection = once(projection,
  "    or pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'",
  `    or p_payload #>> '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}'\n      is distinct from '${oldCandidateHash}'\n    or pg_catalog.jsonb_typeof(p_payload -> 'states') is distinct from 'object'`);
projection = once(projection,
  '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)',
  `  v_projected := pg_catalog.jsonb_set(pg_catalog.jsonb_set(v_projected,\n    '{continuationStateContractSha256}', pg_catalog.to_jsonb('${currentContinuation}'::text), false),\n    '{candidateGRollbackCompanion,modelBinding,modelBundleSha256}',\n    pg_catalog.to_jsonb('${newCandidateHash}'::text), false);\n  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)`);
const projectionWithAcl = `${projection}\nrevoke all on function public.${helperName}(jsonb,timestamptz)\n  from public, anon, authenticated;\n`;
const top20Before = definition(base, 'ravradar_ravscore_checkpoint_top20_predecessor_projection');
const top20After = once(top20Before,
  '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n  then return v_projected; end if;',
  `  -- Keep the exact historical c557 -> 3a14 projection, then the separately\n  -- attested CP bridge and its full current validator. No other binding enters.\n  v_projected := public.${helperName}(v_projected, p_target_reference);\n  if v_projected is not null then return v_projected; end if;`);
result = once(result, top20Before, `${projectionWithAcl}\n${top20After}`);
const predecessorBefore = definition(base, 'ravradar_ravscore_checkpoint_predecessor_payload_valid');
result = once(result, predecessorBefore, once(predecessorBefore.replaceAll(continuation, currentContinuation), 'begin\n',
  `begin\n  if p_current_implementation_sha256 = '${currentContinuation}'\n    and public.${helperName}(p_payload, p_target_reference) is not null\n  then return true; end if;\n`));
result = once(result, '  v_top20_predecessor_payload jsonb;',
  '  v_top20_predecessor_payload jsonb;\n  v_cp_close_predecessor_payload jsonb;');
result = once(result,
  '    if v_central_is_compatible_predecessor and v_top20_predecessor_payload is not null then',
  `    v_cp_close_predecessor_payload := public.${helperName}(\n      v_payload, v_central_reference);\n    if v_central_is_compatible_predecessor and v_cp_close_predecessor_payload is not null then\n      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n        and (v_cp_close_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}')\n        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}');\n    elsif v_central_is_compatible_predecessor and v_top20_predecessor_payload is not null then`);

// Retain the actual established 55s pg_proc check and ACL/search-path checks,
// and include BOTH exact bridge definitions in live metadata attestation.
let contract = definition(timeout, 'ravradar_ravscore_checkpoint_contract');
contract = once(contract, '  v_top20_projection_definition text;',
  '  v_top20_projection_definition text;\n  v_cp_close_projection_definition text;');
contract = once(contract,
  "'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'\n    )\n  ];",
  `\'public.ravradar_ravscore_checkpoint_top20_predecessor_projection(jsonb,timestamptz)'\n    ),\n    pg_catalog.to_regprocedure(\n      'public.${helperName}(jsonb,timestamptz)'\n    )\n  ];`);
contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
  `  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_cp_close_projection_definition\n  from pg_catalog.pg_proc p where p.oid = v_validator_oids[7];\n\n  v_checkpoint_definition := v_canonical_time_definition`);
contract = once(contract,
  "    || E'\\n-- top20-predecessor-projection --\\n' || v_top20_projection_definition;",
  "    || E'\\n-- top20-predecessor-projection --\\n' || v_top20_projection_definition\n    || E'\\n-- cp-close-predecessor-projection --\\n' || v_cp_close_projection_definition;");
contract = once(contract, "'20261002094500'", "'20261003080000'");
result = once(result, definition(base, 'ravradar_ravscore_checkpoint_contract'), contract);
const timeoutSetting = "alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';";
result = once(result, '-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END',
  `${timeoutSetting}\n-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_END`);
result = once(result,
  "alter function public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb) set statement_timeout = '30s';", timeoutSetting);
result = once(result,
  '-- DEC-0278: bind ONLY the Top20 display-count implementation; physical score rules are unchanged.',
  '-- Scoped CP child-close binding: only the verified index implementation changes; physical score rules are unchanged.');
assert.equal(count(result, oldHash), 5); // old trip, historical destinations, new exact preconditions
assert.equal(count(result, newHash), 7); // trip, four current validators/diagnostics, two projection destinations
assert.equal(count(result, oldCandidateHash), 2); // old active trip + exact companion precondition
assert.equal(count(result, newCandidateHash), 4); // trip + payload/diagnostic + projected companion
assert.equal(count(result, continuation), 2); // exact input to Top20 and CP projections
assert.equal(count(result, currentContinuation), 6); // validators, current predicates, projected continuation
assert.equal(count(result, "'20261003080000'"), 1);
assert.equal(count(result, "set statement_timeout = '55s'"), 2);
assert.equal(count(result, "set statement_timeout = '30s'"), 0);
assert.ok(result.includes("'checkpointCasStatementTimeout55Seconds'"));
if (mode === '--write') await fs.writeFile(destination, result, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), result);
console.log('CP child-close successor: immutable predecessors, exact state-preserving bridges, 55s attested.');
