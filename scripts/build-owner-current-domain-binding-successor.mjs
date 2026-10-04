#!/usr/bin/env node
// DEC-0291: exact append-only technical binding. No score/state reconstruction
// or installation happens in SQL; source-clean current replay is a NEW-T caller.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const oldHash = '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948';
const newHash = '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51';
const oldCandidate = '28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7';
const newCandidate = '3e5aae87b19934091a7882fbd8f5b5570b7c83ba786ea6f3bac52a8fd71fcd1e';
const oldContinuation = 'd983bb085f75252d00f0e2585cd0e274ea86020000f99037e9054a3989a4aef6';
const newContinuation = '3dd9b7f054dd19400e8110ec504c2689bd62c52741cf6cf7805070e89e51d1bd';
const destination = 'supabase/migrations/20261004190000_owner_current_source_domain_binding.sql';
const mode = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(mode));
const normalize = text => text.replace(/\r\n?/g, '\n');
const count = (text, value) => text.split(value).length - 1;
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const base = normalize(await fs.readFile(
  'supabase/migrations/20261003080000_copernicus_child_close_binding.sql', 'utf8'));
assert.equal(digest(base), 'b673b75476709c8bb51c5c2caba9e3acfa8f64b6666f4a74de3213ba961eb505',
  'The applied CP predecessor is immutable');
function definition(text, name) {
  const marker = 'create or replace function public.' + name + '(';
  const start = text.indexOf(marker);
  assert.ok(start >= 0 && text.indexOf(marker, start + 1) === -1, name);
  const end = text.indexOf('\n$$;', start);
  assert.ok(end > start, name);
  return text.slice(start, end + 4);
}
function once(text, before, after) {
  assert.equal(count(text, before), 1, 'Ambiguous reviewed replacement: ' + before.slice(0, 100));
  return text.replace(before, () => after);
}
const replacements = [];
let result = base;
function replace(before, after) {
  result = once(result, before, after);
  replacements.push([before, after]);
}
function renameHashes(text) {
  const pairs = { [oldHash]: newHash, [oldCandidate]: newCandidate,
    [oldContinuation]: newContinuation };
  return text.replace(/[a-f0-9]{64}/g, value => pairs[value] ?? value);
}
for (const name of ['ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_integrated_state_reason',
  'ravradar_ravscore_checkpoint_payload_reason']) {
  const before = definition(base, name);
  assert.equal(count(before, oldHash), 1, name);
  replace(before, renameHashes(before));
}
// Historical trip bindings remain admitted; only the exact new identifiers add.
replace("        '" + oldHash + "'\n      )",
  "        '" + oldHash + "',\n        '" + newHash + "'\n      )");
replace("        '" + oldCandidate + "'\n      )",
  "        '" + oldCandidate + "',\n        '" + newCandidate + "'\n      )");

const helper = 'ravradar_ravscore_checkpoint_owner_current_predecessor_projection';
const cpBefore = definition(base, 'ravradar_ravscore_checkpoint_cp_close_predecessor_projection');
const mapping = {
  '3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852': oldHash,
  [oldHash]: newHash,
  'a2494810db3a335376795e308d149f5856885c05665d9f155fc6b0632344c021': oldCandidate,
  [oldCandidate]: newCandidate,
  '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab': oldContinuation,
  [oldContinuation]: newContinuation,
};
const projection = cpBefore.replace('ravradar_ravscore_checkpoint_cp_close_predecessor_projection', helper)
  .replace(/[a-f0-9]{64}/g, value => mapping[value] ?? value);
assert.equal(count(projection, oldHash), 2);
assert.equal(count(projection, newHash), 2);
assert.equal(count(projection, oldCandidate), 1);
assert.equal(count(projection, newCandidate), 1);
assert.equal(count(projection, oldContinuation), 1);
assert.equal(count(projection, newContinuation), 1);
const cpAfter = once(cpBefore,
  '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n  then return v_projected; end if;',
  '  -- Preserve the historical CP projection, then the exact owner binding.\n'
  + '  v_projected := public.' + helper + '(v_projected, p_target_reference);\n'
  + '  if v_projected is not null then return v_projected; end if;');
replace(cpBefore, projection + '\nrevoke all on function public.' + helper
  + '(jsonb,timestamptz) from public, anon, authenticated;\n\n' + cpAfter);
const predecessorBefore = definition(base, 'ravradar_ravscore_checkpoint_predecessor_payload_valid');
replace(predecessorBefore, once(renameHashes(predecessorBefore), 'begin\n',
  'begin\n  if p_current_implementation_sha256 = \'' + newContinuation + '\'\n'
  + '    and public.' + helper + '(p_payload, p_target_reference) is not null\n'
  + '  then return true; end if;\n'));
replace('  v_cp_close_predecessor_payload jsonb;',
  '  v_cp_close_predecessor_payload jsonb;\n  v_owner_current_predecessor_payload jsonb;');
replace('    if v_central_is_compatible_predecessor and v_cp_close_predecessor_payload is not null then',
  '    v_owner_current_predecessor_payload := public.' + helper + '(v_payload, v_central_reference);\n'
  + '    if v_central_is_compatible_predecessor and v_owner_current_predecessor_payload is not null then\n'
  + '      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
  + "        and (v_owner_current_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}')\n"
  + "        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  + "          #- '{candidateGRollbackCompanion,generationSha256}');\n"
  + '    elsif v_central_is_compatible_predecessor and v_cp_close_predecessor_payload is not null then');

const contractBefore = definition(base, 'ravradar_ravscore_checkpoint_contract');
let contract = once(contractBefore, '  v_cp_close_projection_definition text;',
  '  v_cp_close_projection_definition text;\n  v_owner_current_projection_definition text;');
contract = once(contract,
  "'public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'\n    )\n  ];",
  "'public.ravradar_ravscore_checkpoint_cp_close_predecessor_projection(jsonb,timestamptz)'\n    ),\n"
  + "    pg_catalog.to_regprocedure('public." + helper + "(jsonb,timestamptz)')\n  ];");
contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
  "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_owner_current_projection_definition\n"
  + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[8];\n\n'
  + '  v_checkpoint_definition := v_canonical_time_definition');
contract = once(contract,
  "    || E'\\n-- cp-close-predecessor-projection --\\n' || v_cp_close_projection_definition;",
  "    || E'\\n-- cp-close-predecessor-projection --\\n' || v_cp_close_projection_definition\n"
  + "    || E'\\n-- owner-current-predecessor-projection --\\n' || v_owner_current_projection_definition;");
contract = once(contract, "'20261003080000'", "'20261004190000'");
replace(contractBefore, contract);
replace('-- Scoped CP child-close binding: only the verified index implementation changes; physical score rules are unchanged.',
  '-- DEC-0291: seven owner zones exclude dkss_lf; only technical binding advances here. Physical formulas remain unchanged.');

// Every edit has an exact inverse, including new helper/ACL and attestations.
let inverse = result;
for (const [before, after] of [...replacements].reverse()) inverse = once(inverse, after, before);
assert.equal(inverse, base, 'Unreviewed SQL delta outside the exact binding bridge');
assert.equal(count(result, "set statement_timeout = '55s'"), 2);
assert.equal(count(result, "set statement_timeout = '30s'"), 0);
assert.equal(count(result, "'20261004190000'"), 1);
assert.ok(result.includes("'checkpointCasStatementTimeout55Seconds'"));
if (mode === '--write') await fs.writeFile(destination, result, 'utf8');
else assert.equal(normalize(await fs.readFile(destination, 'utf8')), result);
console.log('Owner current binding: immutable predecessor, exact reversible SQL delta, unchanged state/physical rules and 55s contract.');
