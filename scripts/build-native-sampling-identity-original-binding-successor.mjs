#!/usr/bin/env node
// Read-only append-only SOURCE renderer, not an installer. Unfrozen by design.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NATIVE_IDENTITY_PREDECESSOR as OLD, NATIVE_IDENTITY_BINDING_REVIEW,
  NATIVE_IDENTITY_REPLACEMENTS, NATIVE_IDENTITY_ORIGINAL_NAMES,
  assertNativeIdentityBindingsFrozen, assertNativeIdentityOutputFrozen,
  nativeIdentityMigration, nativeIdentitySqlDefinition as definition,
  nativeIdentitySourceSha256 as sha, readNativeIdentityPredecessorSource,
} from './lib/native-sampling-identity-successor-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CP = 'ravradar_ravscore_checkpoint_';
const once = (source, before, after) => {
  assert.equal(source.split(before).length, 2, 'One complete reviewed SQL hunk required');
  return source.replace(before, () => after);
};
const body = source => {
  assert(source.includes('as $$'));
  return source.slice(source.indexOf('as $$') + 5, source.lastIndexOf('$$;')).trim();
};
const signature = source => {
  const match = /^create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/.exec(source);
  assert(match);
  const types = match[2].trim().split(',').filter(Boolean).map(argument => {
    const words = argument.trim().split(/\s+/); assert.equal(words.length, 2); return words[1];
  });
  return 'public.' + match[1] + '(' + types.join(',') + ')';
};
function definitionGuard(sig, digest) {
  return "  if (select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc, E' \\n\\r\\t'), 'UTF8'), 'sha256'), 'hex') from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('"
    + sig + "')) is distinct from '" + digest + "' then raise exception 'native identity exact definition mismatch: " + sig + "'; end if;";
}
function casGuard() {
  return "  if not coalesce((select p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig)"
    + " and 'statement_timeout=55s'=any(p.proconfig) and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')"
    + " and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')"
    + " and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')"
    + " from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('public."
    + CP + "cas(bigint,timestamptz,jsonb)')),false) then raise exception 'native identity CAS properties changed'; end if;";
}
function originalValidatorGuard(sig) {
  return "  if not coalesce((select not p.prosecdef and p.provolatile='s' and 'search_path=pg_catalog, public'=any(p.proconfig)"
    + " and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')"
    + " and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')"
    + " from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('" + sig
    + "')),false) then raise exception 'native identity original validator properties or ACL changed'; end if;";
}
function cloneI71Original(before, index) {
  const originalName = CP + (index === 0 ? 'integrated_state_valid' : 'payload_valid');
  const name = NATIVE_IDENTITY_ORIGINAL_NAMES[index], original = definition(before, originalName);
  assert(Buffer.byteLength(name, 'utf8') <= 63, 'New PostgreSQL identifiers must not truncate');
  let result = once(original, 'function public.' + originalName + '(', 'function public.' + name + '(');
  if (index === 1) result = once(result, 'public.' + CP + 'integrated_state_valid(',
    'public.' + NATIVE_IDENTITY_ORIGINAL_NAMES[0] + '(');
  const markers = [...result.matchAll(/RAVSCORE_CHECKPOINT_[A-Z0-9_]+_GENERATED_(?:BEGIN|END)/g)].map(match => match[0]);
  for (const marker of markers) result = once(result, marker, marker.replace('RAVSCORE_CHECKPOINT_', 'NATIVE_IDENTITY_I71_ORIGINAL_'));
  let inverse = result;
  for (const marker of markers) inverse = once(inverse,
    marker.replace('RAVSCORE_CHECKPOINT_', 'NATIVE_IDENTITY_I71_ORIGINAL_'), marker);
  if (index === 1) inverse = once(inverse, 'public.' + NATIVE_IDENTITY_ORIGINAL_NAMES[0] + '(',
    'public.' + CP + 'integrated_state_valid(');
  inverse = once(inverse, 'function public.' + name + '(', 'function public.' + originalName + '(');
  assert.equal(inverse, original, 'Entire I71 validator retained without family retagging');
  return Object.freeze({ name, definition: result, signature: signature(result), before: original });
}
export async function buildNativeSamplingIdentityOriginalBindingSuccessor() {
  const next = assertNativeIdentityBindingsFrozen(); // FIRST: no fs/import or process I/O while unfrozen.
  assert.equal(arguments.length, 0, 'No caller root, source, capture, binding or validator override');
  const { canonicalSource: before, accountSource } = await readNativeIdentityPredecessorSource();
  const candidateBuilder = await import('./build-candidate-g-rollback-bundle.mjs');
  const integratedBuilder = await import('./build-ravscore-model-bundle.mjs');
  const continuation = await import('./lib/ravscore-continuation-implementation-contract.mjs');
  const candidate = await candidateBuilder.computeCandidateGRollbackBundle();
  assert.equal(candidate.modelBundleSha256, next.candidate);
  assert.equal(candidate.contractSha256, 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8');
  assert.equal(candidate.manifest.files.length, next.candidateFileCount);
  const integrated = await integratedBuilder.computeRavScoreModelBundle();
  assert.equal(integrated.modelBundleSha256, next.integrated);
  assert.equal(integrated.contractSha256, 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b');
  assert.equal(integrated.manifest.files.length, next.integratedFileCount);
  for (const [relative, rendered] of [
    ['scripts/rollback-assets/ravscore-model-bundle.generated.js', candidateBuilder.renderCandidateGRollbackGeneratedModule(candidate)],
    ['js/core/ravscore-model-bundle.generated.js', integratedBuilder.renderGeneratedBundleModule(integrated)],
  ]) {
    const file = path.join(ROOT, relative), stat = await fs.lstat(file);
    assert(stat.isFile() && !stat.isSymbolicLink());
    assert.equal((await fs.readFile(file, 'utf8')).replace(/\r\n?/g, '\n'), rendered);
  }
  assert.equal(continuation.RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES.length, next.continuationFileCount);
  assert.equal(await continuation.ravScoreContinuationImplementationSha256(), next.continuation);
  const originals = [cloneI71Original(before, 0), cloneI71Original(before, 1)];
  const changes = [];
  const add = (name, after) => changes.push({ name, before: definition(before, name), after, signature: signature(after) });
  for (const [suffix, counts] of [
    ['integrated_state_valid', [1, 0, 0]], ['payload_valid', [1, 1, 1]],
    ['integrated_state_reason', [1, 0, 0]], ['payload_reason', [1, 1, 1]],
  ]) {
    const original = definition(before, CP + suffix); let after = original;
    for (const [index, key] of ['integrated', 'candidate', 'continuation'].entries()) {
      assert.equal(original.split(OLD[key]).length - 1, counts[index]);
      after = after.split(OLD[key]).join(next[key]);
    }
    let inverse = after;
    for (const key of ['integrated', 'candidate', 'continuation']) inverse = inverse.split(next[key]).join(OLD[key]);
    assert.equal(inverse, original);
    add(CP + suffix, after);
  }
  let trip = definition(before, 'ravradar_trip_v3_binding_allowed');
  for (const key of ['integrated', 'candidate']) trip = once(trip, "        '" + OLD[key] + "'\n      )",
    "        '" + OLD[key] + "',\n        '" + next[key] + "'\n      )");
  add('ravradar_trip_v3_binding_allowed', trip);
  let cas = definition(before, CP + 'cas');
  const oldBranch = "      and p_payload ->> 'continuationStateContractSha256' = '" + OLD.continuation + "'";
  cas = once(cas, oldBranch, oldBranch.replace(OLD.continuation, next.continuation));
  const originalCase = "        when 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' then public."
    + CP + 'grid_c1ac_payload_valid(v_payload, v_central_reference)';
  const i71Case = "        when '" + OLD.integrated + "' then public."
    + originals[1].name + '(v_payload, v_central_reference)';
  cas = once(cas, originalCase, originalCase + '\n' + i71Case);
  assert.equal(once(once(cas, '\n' + i71Case, ''), oldBranch.replace(OLD.continuation, next.continuation), oldBranch),
    definition(before, CP + 'cas'), 'Entire previous CAS retained outside the exact NEW-T successor branch');
  add(CP + 'cas', cas);
  let contract = definition(before, CP + 'contract');
  contract = once(contract, '  v_grid_c1ac_payload_definition text;',
    '  v_grid_c1ac_payload_definition text;\n  v_native_identity_i71_state_definition text;\n  v_native_identity_i71_payload_definition text;');
  const lastOid = "    pg_catalog.to_regprocedure('public." + CP + "grid_c1ac_payload_valid(jsonb,timestamptz)')\n  ];";
  contract = once(contract, lastOid, lastOid.slice(0, -5) + ',\n'
    + originals.map(row => "    pg_catalog.to_regprocedure('" + row.signature + "')").join(',\n') + '\n  ];');
  const reads = originals.map((row, index) => "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_native_identity_i71_"
    + (index === 0 ? 'state' : 'payload') + '_definition\n  from pg_catalog.pg_proc p where p.oid = v_validator_oids[' + (18 + index) + '];').join('\n');
  contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
    reads + '\n\n  v_checkpoint_definition := v_canonical_time_definition');
  const tail = "    || E'\\n-- grid-original-c1ac-payload-validator --\\n' || v_grid_c1ac_payload_definition;";
  contract = once(contract, tail, tail.slice(0, -1)
    + "\n    || E'\\n-- native-identity-i71-state-validator --\\n' || v_native_identity_i71_state_definition"
    + "\n    || E'\\n-- native-identity-i71-payload-validator --\\n' || v_native_identity_i71_payload_definition;");
  contract = once(contract, "'" + OLD.currentGridVersion + "'", "'" + nativeIdentityMigration().version + "'");
  add(CP + 'contract', contract);
  assert.deepEqual(changes.map(row => row.name), NATIVE_IDENTITY_REPLACEMENTS);
  const originalDefinitions = originals.map(row => row.definition + '\nrevoke all on function '
    + row.signature + ' from public, anon, authenticated;').join('\n\n');
  let canonicalSource = before;
  for (const row of changes) canonicalSource = once(canonicalSource, row.before, row.after);
  const anchor = definition(canonicalSource, CP + 'integrated_state_valid');
  canonicalSource = once(canonicalSource, anchor, originalDefinitions + '\n\n' + anchor);
  let inverse = once(canonicalSource, originalDefinitions + '\n\n', '');
  for (const row of [...changes].reverse()) inverse = once(inverse, row.after, row.before);
  assert.equal(inverse, before, 'Whole220 canonical inverse; all six old original validators and unrelated code untouched');
  const beforeDefinitions = [...before.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)]
    .map(match => definition(before, match[1]));
  const oldOriginals = beforeDefinitions.filter(source => /^public\.ravradar_ravscore_checkpoint_grid_(?:ffc|249|c1ac)_(?:state|payload)_valid\(/
    .test(signature(source)));
  assert.equal(oldOriginals.length, 6, 'All six immutable original validators retain their existing ACL and properties');
  const physicalSignature = value => value.replace(/^public\.([a-z0-9_]+)\(/,
    (_, name) => 'public.' + name.slice(0, 63) + '(');
  assert.equal(new Set([...beforeDefinitions.map(signature), ...originals.map(row => row.signature)].map(physicalSignature)).size,
    beforeDefinitions.length + originals.length, 'No PostgreSQL signature collision');
  const beforeGuard = ['do $native_identity_before$\nbegin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '" + OLD.statisticsVersion
      + "' then raise exception 'NATIVE_IDENTITY_EXACT_230_PREDECESSOR_REQUIRED'; end if;",
    ...originals.map(row => "  if pg_catalog.to_regprocedure('" + row.signature + "') is not null then raise exception 'native identity destination exists'; end if;"),
    ...beforeDefinitions.map(source => definitionGuard(signature(source), sha(body(source)))),
    ...oldOriginals.map(source => originalValidatorGuard(signature(source))),
    casGuard(), 'end;\n$native_identity_before$;'].join('\n');
  const afterGuard = ['do $native_identity_after$\nbegin',
    ...changes.map(row => definitionGuard(row.signature, sha(body(row.after)))),
    ...beforeDefinitions.filter(source => !changes.some(row => row.signature === signature(source)))
      .map(source => definitionGuard(signature(source), sha(body(source)))),
    ...originals.map(row => definitionGuard(row.signature, sha(body(row.definition)))),
    ...oldOriginals.map(source => originalValidatorGuard(signature(source))),
    ...originals.map(row => originalValidatorGuard(row.signature)),
    casGuard(), 'end;\n$native_identity_after$;'].join('\n');
  const migration = ['-- Append-only native sampling identity SOURCE successor; not installation authority.',
    '-- Exact original I71 and FFC/249/c1ac families remain originals; NEW reference only.',
    'begin;', "set local lock_timeout = '5s';", beforeGuard, originalDefinitions,
    ...changes.map(row => row.after),
    'revoke all on function public.' + CP + 'cas(bigint,timestamptz,jsonb) from public, anon, authenticated;',
    'grant execute on function public.' + CP + 'cas(bigint,timestamptz,jsonb) to service_role;',
    'alter function public.' + CP + "cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';",
    afterGuard, "notify pgrst, 'reload schema';", 'commit;', ''].join('\n\n').trimEnd() + '\n';
  await readNativeIdentityPredecessorSource(); // Recheck immutable inputs before returning SOURCE bytes.
  return Object.freeze({ migration, canonicalSource, accountSource, migrationSha256: sha(migration),
    canonicalSha256: sha(canonicalSource), originalValidators: Object.freeze(originals),
    changedDefinitions: Object.freeze(changes), binding: NATIVE_IDENTITY_BINDING_REVIEW });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertNativeIdentityOutputFrozen(); // CLI cannot materialize or read an unfrozen output.
  assert.equal(process.argv.length, 3); assert.equal(process.argv[2], '--check');
  const result = await buildNativeSamplingIdentityOriginalBindingSuccessor();
  const { NATIVE_IDENTITY_OUTPUT_REVIEW: pins } = await import('./lib/native-sampling-identity-successor-source.mjs');
  assert.equal(result.migrationSha256, pins.migrationSha256);
  assert.equal(result.canonicalSha256, pins.canonicalSha256);
  const file = path.join(ROOT, 'supabase/migrations', nativeIdentityMigration().filename), stat = await fs.lstat(file);
  assert(stat.isFile() && !stat.isSymbolicLink());
  assert.deepEqual(await fs.readFile(file), Buffer.from(result.migration));
  console.log('Exact append-only native identity SOURCE verified; no installation or output write performed.');
}
