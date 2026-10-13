#!/usr/bin/env node
// Local append-only SOURCE preparation, not an installer or activation route.
// Historical migrations and generated model files are read-only inputs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeCandidateGRollbackBundle,
  renderCandidateGRollbackGeneratedModule,
} from './build-candidate-g-rollback-bundle.mjs';
import {
  computeRavScoreModelBundle,
  renderGeneratedBundleModule,
} from './build-ravscore-model-bundle.mjs';
import {
  RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,
  ravScoreContinuationImplementationSha256,
} from './lib/ravscore-continuation-implementation-contract.mjs';
import { readAccountAssistantCanonicalSource } from './lib/account-assistant-successor-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CP = 'ravradar_ravscore_checkpoint_';
export const CURRENT_GRID_SUCCESSOR_MIGRATION = Object.freeze({
  version: '20261013220000',
  id: '20261013220000_current_grid_original_bound_successor',
  filename: '20261013220000_current_grid_original_bound_successor.sql',
});
export const CURRENT_GRID_SUCCESSOR_PATH =
  'supabase/migrations/' + CURRENT_GRID_SUCCESSOR_MIGRATION.filename;

const SOURCE_FILES = Object.freeze([
  ['20261005000000_owner_water_level_only_binding.sql',
    '6b161bc71753b52c5728c8b9a03b02d5d0955d0e42e751a3f2a51a6ea6900496'],
  ['20261010130000_owner_export_origin_bound_successor.sql',
    '55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6'],
  ['20261012200000_checkpoint_cas_single_projection_successor.sql',
    'b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18'],
  ['20261013210000_account_assistant_original_bound_successor.sql',
    '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d'],
]);
const CANONICAL_213_SHA = '7a2f0490f744c49d9e9f2b7c77a41057d5c6aa420a23e133a04e9ab590b7ead1';
const ACCOUNT_SOURCE_SHA = 'a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8';
const ORIGINALS = Object.freeze([
  Object.freeze({
    label: 'ffc', sourceIndex: 0,
    I: 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb',
    C: '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3',
    T: '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51',
    state: '3521863b7c0f9ca11a4a9b13e56350832a63c0ad09d46779c0dd0b2f9b142d46',
    payload: '9c3b3488265378050451a6000377a517659dce1949c57e06a39c17a743c5143c',
  }),
  Object.freeze({
    label: '249', sourceIndex: 1,
    I: '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
    C: '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
    T: 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0',
    state: 'dffc5058d9e957591dd099574cb652cd8b86edeb40df9fce4b1080480c0860cd',
    payload: '9d28f56011dfbf8beedee049bc7632899d22174276cd60287533c7a62fb59c54',
  }),
  Object.freeze({
    label: 'c1ac', sourceIndex: 3,
    I: 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
    C: '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
    T: '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b',
    state: '436924399e70446e6f79504bb05bea92bdf57b511a6af9e0f035e43b162fb957',
    payload: 'ce847004aac7d976a02651412105990ac81168f4450c76f06d9ae8a497e77eb4',
  }),
]);
const NEXT = Object.freeze({
  I: '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399',
  C: 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9',
  T: '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a',
});
const PHYSICAL = Object.freeze({
  I: 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b',
  C: 'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8',
});
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => value.replace(/\r\n?/g, '\n');
const count = (source, value) => source.split(value).length - 1;
function once(source, before, after) {
  assert.equal(count(source, before), 1, 'Exact unique source hunk required: ' + before.slice(0, 100));
  return source.replace(before, () => after);
}
function definition(source, name) {
  const marker = 'create or replace function public.' + name + '(';
  assert.equal(count(source, marker), 1, 'Exact complete SQL function required: ' + name);
  const start = source.indexOf(marker);
  const end = source.indexOf('\n$$;', start);
  assert(end > start, 'SQL function delimiter missing: ' + name);
  return source.slice(start, end + 4);
}
function body(source) {
  const start = source.indexOf('as $$');
  assert(start > 0);
  return source.slice(start + 5, source.lastIndexOf('$$;')).trim();
}
function signature(source) {
  const match = /^create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/.exec(source);
  assert(match);
  const types = match[2].trim() ? match[2].split(',').map(argument => {
    const words = argument.trim().split(/\s+/);
    assert.equal(words.length, 2, 'Only the exact existing fixed signatures are supported');
    return words[1];
  }) : [];
  return 'public.' + match[1] + '(' + types.join(',') + ')';
}
function postgresSignatureIdentity(sig) {
  // Historical SQL already contains long unquoted ASCII identifiers. Keep
  // their source spellings; compare the identities PostgreSQL actually uses.
  assert(/^public\.[a-z0-9_]+\(/.test(sig), 'Exact unquoted ASCII signature required');
  return sig.replace(/^public\.([a-z0-9_]+)\(/,
    (_, name) => 'public.' + name.slice(0, 63) + '(');
}
async function readRegular(relative) {
  const absolute = path.join(ROOT, relative);
  const stat = await fs.lstat(absolute);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Regular non-symlink source required: ' + relative);
  return normalize(await fs.readFile(absolute, 'utf8'));
}
function replaceCurrentHashes(source, expectedCounts) {
  const old = ORIGINALS[2];
  let result = source;
  for (const key of ['I', 'C', 'T']) {
    assert.equal(count(source, old[key]), expectedCounts[key] ?? 0, 'Current binding occurrence: ' + key);
    result = result.split(old[key]).join(NEXT[key]);
  }
  let inverse = result;
  for (const key of ['I', 'C', 'T']) inverse = inverse.split(NEXT[key]).join(old[key]);
  assert.equal(inverse, source, 'Current definition inverse');
  return result;
}
function cloneOriginal(source, family, kind) {
  const sourceName = CP + (kind === 'state' ? 'integrated_state_valid' : 'payload_valid');
  const name = CP + 'grid_' + family.label + '_' + kind + '_valid';
  assert(Buffer.byteLength(name, 'utf8') <= 63, 'New PostgreSQL identifier would truncate');
  const original = definition(source, sourceName);
  assert.equal(sha(original), family[kind], 'Whole immutable original validator');
  let after = original;
  const edits = [];
  const edit = (before, replacement) => {
    after = once(after, before, replacement);
    edits.push([before, replacement]);
  };
  edit('function public.' + sourceName + '(', 'function public.' + name + '(');
  if (kind === 'payload') {
    edit('public.' + CP + 'integrated_state_valid(',
      'public.' + CP + 'grid_' + family.label + '_state_valid(');
  }
  // Keep historical binding literals, but remove these copies from the normal
  // CURRENT generated-marker namespace. A later sync must never retag them.
  const markers = [...after.matchAll(/RAVSCORE_CHECKPOINT_[A-Z0-9_]+_GENERATED_(?:BEGIN|END)/g)]
    .map(match => match[0]);
  assert.equal(new Set(markers).size, markers.length);
  for (const marker of markers) {
    edit(marker, marker.replace('RAVSCORE_CHECKPOINT_', 'CURRENT_GRID_ORIGINAL_' + family.label.toUpperCase() + '_'));
  }
  let inverse = after;
  for (const [before, replacement] of [...edits].reverse()) inverse = once(inverse, replacement, before);
  assert.equal(inverse, original, 'Whole original validator inverse: ' + name);
  for (const key of ['I', 'C', 'T']) {
    assert.equal(count(after, family[key]), count(original, family[key]), 'Original family literal changed');
  }
  return Object.freeze({
    name, signature: signature(after), definition: after,
    sourceSha256: sha(original), definitionSha256: sha(body(after)),
    family: family.label, kind,
  });
}
function pgDefinitionCheck(sig, digest) {
  return "  if (select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc, E' \\n\\r\\t'), 'UTF8'), 'sha256'), 'hex') from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('"
    + sig + "')) is distinct from '" + digest
    + "' then raise exception 'current-grid function definition mismatch: " + sig + "'; end if;";
}
function casPropertiesCheck() {
  return [
    '  if not coalesce((select p.prosecdef',
    "    and 'search_path=pg_catalog, public'=any(p.proconfig)",
    "    and 'statement_timeout=55s'=any(p.proconfig)",
    "    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')",
    "    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')",
    "    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')",
    '    from pg_catalog.pg_proc p',
    "    where p.oid=pg_catalog.to_regprocedure('public." + CP + "cas(bigint,timestamptz,jsonb)')),false)",
    "  then raise exception 'checkpoint CAS properties or ACL changed'; end if;",
  ].join('\n');
}
function originalPropertiesCheck(row) {
  return "  if not coalesce((select not p.prosecdef and p.provolatile='s'"
    + " and 'search_path=pg_catalog, public'=any(p.proconfig)"
    + " and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')"
    + " and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')"
    + " from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('" + row.signature
    + "')),false) then raise exception 'current-grid original validator properties or ACL changed'; end if;";
}

export async function buildCurrentGridOriginalBindingSuccessor() {
  assert.equal(arguments.length, 0, 'No caller root, hashes, family, or source override is accepted');
  const immutable = [];
  for (const [filename, digest] of SOURCE_FILES) {
    const source = await readRegular('supabase/migrations/' + filename);
    assert.equal(sha(source), digest, 'Immutable SQL source changed: ' + filename);
    immutable.push(source);
  }
  // This is the existing exact canonical READ view, not a replay/rebuild of
  // the historical account builder against changed current source.
  const { canonicalSource: before, accountSource } = await readAccountAssistantCanonicalSource();
  assert.equal(sha(before), CANONICAL_213_SHA);
  assert.equal(sha(accountSource), ACCOUNT_SOURCE_SHA);
  for (const suffix of ['canonical_time', 'has_forbidden_key', 'candidate_state_valid']) {
    assert.equal(definition(immutable[0], CP + suffix), definition(before, CP + suffix),
      'Unchanged complete original-validator dependency: ' + suffix);
  }

  // Normal actual-disk C -> I -> T only. No sourceOverrides, copied source
  // bank, root option, generated-file write, or old issued-source rebuild.
  const candidate = await computeCandidateGRollbackBundle();
  assert.equal(candidate.modelBundleSha256, NEXT.C);
  assert.equal(candidate.contractSha256, PHYSICAL.C);
  assert.equal(candidate.manifest.files.length, 69);
  assert.equal(await readRegular('scripts/rollback-assets/ravscore-model-bundle.generated.js'),
    renderCandidateGRollbackGeneratedModule(candidate));
  const integrated = await computeRavScoreModelBundle();
  assert.equal(integrated.modelBundleSha256, NEXT.I);
  assert.equal(integrated.contractSha256, PHYSICAL.I);
  assert.equal(integrated.manifest.files.length, 71);
  assert.equal(await readRegular('js/core/ravscore-model-bundle.generated.js'),
    renderGeneratedBundleModule(integrated));
  assert.equal(RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES.length, 12);
  assert.equal(await ravScoreContinuationImplementationSha256(), NEXT.T);

  const originals = ORIGINALS.flatMap(family => ['state', 'payload'].map(kind =>
    cloneOriginal(immutable[family.sourceIndex], family, kind)));
  assert.equal(originals.length, 6);
  const changes = [];
  const add = (name, after) => {
    const original = definition(before, name);
    changes.push(Object.freeze({ name, before: original, after, signature: signature(original) }));
  };
  for (const [suffix, counts] of [
    ['integrated_state_valid', { I: 1 }],
    ['payload_valid', { I: 1, C: 1, T: 1 }],
    ['integrated_state_reason', { I: 1 }],
    ['payload_reason', { I: 1, C: 1, T: 1 }],
  ]) add(CP + suffix, replaceCurrentHashes(definition(before, CP + suffix), counts));

  // Preserve all historical trip bindings and the separate existing central
  // active-binding guard. Merely append the exact newly measured I/C pair.
  let trip = definition(before, 'ravradar_trip_v3_binding_allowed');
  for (const key of ['I', 'C']) {
    trip = once(trip, "        '" + ORIGINALS[2][key] + "'\n      )",
      "        '" + ORIGINALS[2][key] + "',\n        '" + NEXT[key] + "'\n      )");
  }
  add('ravradar_trip_v3_binding_allowed', trip);

  // Keep the ACTUAL 213/200 single-projection CAS, including old dispatch,
  // equality, same-reference rejection, version checks, lock and write.
  // The new branch validates an original as ORIGINAL. It neither projects
  // its numbers/metadata nor enables the old same-reference metadata bridge.
  let cas = definition(before, CP + 'cas');
  const currentValidation = '    elsif public.' + CP + 'payload_valid(\n'
    + '      v_payload,\n      v_central_reference\n    ) then';
  const originalBranch = [
    '    elsif p_target_reference > v_central_reference',
    "      and p_payload ->> 'continuationStateContractSha256' = '" + NEXT.T + "'",
    "      and case v_payload #>> '{modelBinding,modelBundleSha256}'",
    ...ORIGINALS.map(family => "        when '" + family.I + "' then public."
      + CP + 'grid_' + family.label + '_payload_valid(v_payload, v_central_reference)'),
    '        else false',
    '      end',
    '    then',
    '      -- A genuinely newer current generation; no metadata projection or same-reference waiver.',
    '      v_central_is_compatible_predecessor := false;',
  ].join('\n');
  cas = once(cas, currentValidation, originalBranch + '\n' + currentValidation);
  assert.equal(once(cas, originalBranch + '\n', ''), definition(before, CP + 'cas'),
    'No other 213/200 CAS change');
  add(CP + 'cas', cas);

  let contract = definition(before, CP + 'contract');
  const declarations = originals.map(row =>
    '  v_grid_' + row.family + '_' + row.kind + '_definition text;').join('\n');
  contract = once(contract, '  v_account_assistant_projection_definition text;',
    '  v_account_assistant_projection_definition text;\n' + declarations);
  const lastOid = "    pg_catalog.to_regprocedure('public." + CP
    + "account_assistant_predecessor_projection(jsonb,timestamptz)')\n  ];";
  contract = once(contract, lastOid, lastOid.slice(0, -5) + ',\n'
    + originals.map(row => "    pg_catalog.to_regprocedure('" + row.signature + "')").join(',\n') + '\n  ];');
  const reads = originals.map((row, index) =>
    "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_grid_"
    + row.family + '_' + row.kind + '_definition\n'
    + '  from pg_catalog.pg_proc p where p.oid = v_validator_oids[' + (12 + index) + '];').join('\n');
  contract = once(contract, '  v_checkpoint_definition := v_canonical_time_definition',
    reads + '\n\n  v_checkpoint_definition := v_canonical_time_definition');
  const oldTail = "    || E'\\n-- account-assistant-predecessor-projection --\\n' || v_account_assistant_projection_definition;";
  const newTail = oldTail.slice(0, -1) + '\n' + originals.map(row =>
    "    || E'\\n-- grid-original-" + row.family + '-' + row.kind + "-validator --\\n' || v_grid_"
    + row.family + '_' + row.kind + '_definition').join('\n') + ';';
  contract = once(contract, oldTail, newTail);
  contract = once(contract, "'20261013210000'", "'" + CURRENT_GRID_SUCCESSOR_MIGRATION.version + "'");
  add(CP + 'contract', contract);
  assert.equal(changes.length, 7);

  const originalDefinitions = originals.map(row => row.definition
    + '\nrevoke all on function ' + row.signature + ' from public, anon, authenticated;').join('\n\n');
  let canonicalSource = before;
  for (const row of changes) canonicalSource = once(canonicalSource, row.before, row.after);
  const insertion = definition(canonicalSource, CP + 'integrated_state_valid');
  canonicalSource = once(canonicalSource, insertion, originalDefinitions + '\n\n' + insertion);
  let inverse = once(canonicalSource, originalDefinitions + '\n\n', '');
  for (const row of [...changes].reverse()) inverse = once(inverse, row.after, row.before);
  assert.equal(inverse, before, 'Whole 213 canonical source inverse: only seven replacements plus six originals');
  // Historical account schema and all unrelated helper/projector/history
  // definitions remain untouched, not re-executed by the sparse migration.
  assert.equal(sha(accountSource), ACCOUNT_SOURCE_SHA);

  const dependencyNames = [...before.matchAll(/^create or replace function public\.(ravradar_ravscore_checkpoint_[a-z0-9_]+|version_admin_document)\(/gm)]
    .map(match => match[1]);
  assert.equal(new Set(dependencyNames).size, dependencyNames.length);
  const beforeDefinitions = [...new Set([...dependencyNames, 'ravradar_trip_v3_binding_allowed'])].map(name => {
    const source = definition(before, name);
    return { signature: signature(source), digest: sha(body(source)) };
  });
  const physicalIdentities = [...beforeDefinitions, ...originals]
    .map(row => postgresSignatureIdentity(row.signature));
  assert.equal(new Set(physicalIdentities).size, physicalIdentities.length,
    'Historical or new PostgreSQL signatures collide after identifier truncation');
  const beforeGuard = [
    'do $current_grid_before$\nbegin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '20261013210000' then raise exception 'current-grid successor requires exact installed 21310000 predecessor'; end if;",
    ...originals.map(row => "  if pg_catalog.to_regprocedure('" + row.signature
      + "') is not null then raise exception 'current-grid original validator already exists'; end if;"),
    ...beforeDefinitions.map(row => pgDefinitionCheck(row.signature, row.digest)),
    casPropertiesCheck(),
    'end;\n$current_grid_before$;',
  ].join('\n');
  const afterGuard = [
    'do $current_grid_after$\nbegin',
    ...changes.map(row => pgDefinitionCheck(row.signature, sha(body(row.after)))),
    ...originals.map(row => pgDefinitionCheck(row.signature, row.definitionSha256)),
    ...originals.map(originalPropertiesCheck),
    casPropertiesCheck(),
    'end;\n$current_grid_after$;',
  ].join('\n');
  const casAcl = [
    'revoke all on function public.' + CP + 'cas(bigint,timestamptz,jsonb) from public, anon, authenticated;',
    'grant execute on function public.' + CP + 'cas(bigint,timestamptz,jsonb) to service_role;',
    'alter function public.' + CP + "cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';",
  ].join('\n');
  const migration = [
    '-- Append-only current-grid SOURCE successor; no installation or production authority.',
    '-- Original FFC/249c/c1ac validators retain their full immutable families and all 673 states.',
    '-- Numeric current transition is newer-reference-only; no old-state projection or history rewrite.',
    'begin;',
    "set local lock_timeout = '5s';",
    beforeGuard,
    originalDefinitions,
    ...changes.map(row => row.after),
    casAcl,
    afterGuard,
    "notify pgrst, 'reload schema';",
    'commit;',
  ].join('\n\n') + '\n';
  const actualFunctions = [...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)]
    .map(match => match[1]);
  assert.deepEqual(actualFunctions, [...originals.map(row => row.name), ...changes.map(row => row.name)]);
  assert.equal(count(migration, '\nbegin;'), 1);
  assert.equal(count(migration, '\ncommit;'), 1);
  assert.equal(count(migration, 'set local lock_timeout'), 1);
  assert.equal(count(migration, 'set statement_timeout'), 1);
  // Recheck immutable input bytes after composition, before any CLI publication.
  for (const [filename, digest] of SOURCE_FILES) {
    assert.equal(sha(await readRegular('supabase/migrations/' + filename)), digest);
  }
  return Object.freeze({
    migration, canonicalSource, accountSource,
    sourcePins: Object.freeze(Object.fromEntries(SOURCE_FILES)),
    canonicalPredecessorSha256: CANONICAL_213_SHA,
    canonicalSuccessorSha256: sha(canonicalSource),
    originalValidators: Object.freeze(originals),
    changedDefinitions: Object.freeze(changes.map(row => Object.freeze({
      name: row.name, signature: row.signature,
      beforeBodySha256: sha(body(row.before)), afterBodySha256: sha(body(row.after)),
    }))),
    oldBindings: ORIGINALS, newBinding: NEXT,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Only one fixed --write or --check mode is accepted');
  const mode = process.argv[2];
  assert(['--write', '--check'].includes(mode), 'Only --write or --check is accepted');
  const result = await buildCurrentGridOriginalBindingSuccessor();
  const destination = path.join(ROOT, CURRENT_GRID_SUCCESSOR_PATH);
  if (mode === '--write') {
    try {
      await fs.writeFile(destination, result.migration, { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  // Existing migrations are never overwritten. An existing exact whole-byte
  // result is the only accepted no-op; a mismatch is a terminal refusal.
  const stat = await fs.lstat(destination);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Regular non-symlink fixed successor required');
  assert.deepEqual(await fs.readFile(destination), Buffer.from(result.migration, 'utf8'),
    'Current-grid successor differs from exact normal source rendering');
  console.log('Exact current-grid successor source: C69/I71/T12, three full original families, newer reference only, 55s/5s unchanged. No installation performed.');
}

