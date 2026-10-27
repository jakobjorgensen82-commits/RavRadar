import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { accountAssistantCatalogQuery, verifyAccountAssistantCatalogMetadata }
  from '../verify-account-assistant-schema.mjs';

const OLD_MIGRATION = '20261010130000_owner_export_origin_bound_successor.sql';
const NEW_MIGRATION = '20261012200000_checkpoint_cas_single_projection_successor.sql';
const ACCOUNT_MIGRATION = '20261013210000_account_assistant_original_bound_successor.sql';
const GRID_MIGRATION = '20261013220000_current_grid_original_bound_successor.sql';
const CAS = 'public.ravradar_ravscore_checkpoint_cas';
const KEY = 'ravscore-continuation-checkpoint';
const signatures = ['ravradar_ravscore_checkpoint_canonical_time',
  'ravradar_ravscore_checkpoint_has_forbidden_key',
  'ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_candidate_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid',
  'ravradar_ravscore_checkpoint_predecessor_payload_valid',
  'ravradar_ravscore_checkpoint_top20_predecessor_projection',
  'ravradar_ravscore_checkpoint_cp_close_predecessor_projection',
  'ravradar_ravscore_checkpoint_owner_current_predecessor_projection',
  'ravradar_ravscore_checkpoint_water_level_predecessor_projection',
  'ravradar_ravscore_checkpoint_userdata_predecessor_projection', 'version_admin_document'];
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const sqlText = text => String(text).replace(/\r\n?/g, '\n');

// Source-test diagnostic only. Raw stderr, SQL, JSON and values are never
// returned or emitted; unknown state/phase remains explicitly UNKNOWN.
const NATIVE_PSQL_PHASES = new Set(['NATIVE_SETUP', 'CAS200_MIGRATION',
  'BASELINE_FIXTURES', 'BASELINE_ADMISSION', 'BASELINE_CAS_CASES',
  'ACCOUNT213', 'CURRENT220', 'STATISTICS230', 'NATIVE_IDENTITY0600', 'CURRENT_MEMORY_WARMUP',
  'ESTABLISHED_NATIVE_CURRENT_ORIGIN', 'LAST_MILE_ENCLOSURE', 'ACCOUNT_STATISTICS_ASSISTANT', 'NATIVE_ORIGINAL_CONTINUITY', 'ASSISTANT_LATER_H0', 'ASSISTANT_PUBLIC587_SUCCESSOR', 'UNKNOWN']);
const NATIVE_PSQL_STATES = Object.freeze({
  '22003':'SQL_RANGE', '22023':'SQL_PARAMETER', '22P02':'SQL_TEXT_FORMAT',
  '23502':'SQL_NOT_NULL', '23503':'SQL_FOREIGN_KEY', '23505':'SQL_UNIQUE',
  '23514':'SQL_CHECK', '28000':'SQL_AUTHENTICATION', '40001':'SQL_CAS_CONFLICT',
  '40P01':'SQL_DEADLOCK', '42501':'SQL_PERMISSION', '42601':'SQL_SYNTAX',
  '42703':'SQL_UNDEFINED_COLUMN', '42804':'SQL_DATATYPE',
  '42809':'SQL_OBJECT_TYPE', '42883':'SQL_UNDEFINED_FUNCTION',
  '42P01':'SQL_UNDEFINED_TABLE', '53200':'SQL_MEMORY',
  '54000':'SQL_LIMIT', '54001':'SQL_COMPLEXITY', '55P03':'SQL_LOCK',
  '57014':'SQL_CANCELED', 'P0001':'SQL_RAISED_EXCEPTION', 'XX000':'SQL_INTERNAL',
});
export function nativePostgresFailureDiagnostic(phase, stderr) {
  const safePhase = NATIVE_PSQL_PHASES.has(phase) ? phase : 'UNKNOWN';
  // psql VERBOSITY=sqlstate prints only the actual code for ERROR/FATAL.
  // No guessed extraction of messages, DETAIL, CONTEXT or arbitrary keys.
  const match = typeof stderr === 'string' && Buffer.byteLength(stderr) <= 16_384
    ? /(?:^|\n)[^\r\n]*\b(?:ERROR|FATAL):[ \t]+([A-Z0-9]{5})[ \t]*\r?(?:\n|$)/.exec(stderr) : null;
  const sqlState = match && Object.hasOwn(NATIVE_PSQL_STATES, match[1]) ? match[1] : 'UNKNOWN';
  return Object.freeze({ phase:safePhase, sqlState,
    category:sqlState === 'UNKNOWN' ? 'PSQL_COMMAND_FAILURE' : NATIVE_PSQL_STATES[sqlState] });
}
export function nativePostgresFailureAnnotation(phase, stderr) {
  const safe = nativePostgresFailureDiagnostic(phase, stderr);
  return '::error title=Native PostgreSQL source command::phase=' + safe.phase
    + ' sqlstate=' + safe.sqlState + ' category=' + safe.category;
}

const command = (file, args, { input, env, timeout = 20_000 } = {}) => new Promise(resolve => {
  const child = execFile(file, args, { env, timeout, maxBuffer: 2 * 1024 * 1024 },
    (error, stdout, stderr) => resolve({ code: error ? (error.code ?? 'NATIVE_EXECFILE_UNKNOWN_ERROR') : 0,
      stdout: String(stdout ?? ''), sqlState: nativePostgresFailureDiagnostic('UNKNOWN', stderr).sqlState }));
  child.stdin?.on('error', () => {}); // Outcome is owned by execFile's actual close/error callback.
  child.stdin?.end(input ?? '');
});
const definition = (source, name) => {
  const head = `create or replace function public.${name}(`;
  const start = source.indexOf(head), end = source.indexOf('\n$$;', start);
  assert.ok(start >= 0 && end > start, 'actual SQL function definition missing');
  assert.equal(source.indexOf(head, start + head.length), -1, 'ambiguous SQL function definition');
  return source.slice(start, end + 4);
};

// Historical test input, NEVER an alternative current-runtime admission root.
// Reuse the issued-source checker's fixed Git identity/regular-blob/static-import
// checks, but materialize only the 26 imports/T inputs plus their fixed policy JSON.
const ISSUED_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ISSUED_HEAD = '044d3045fecc2e70d6f35f60010921c6bd597ecc';
const ISSUED_TREE = '4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const ISSUED_TARGET = 'scripts/test-protected-ravscore-continuation-checkpoint.mjs';
const ISSUED_T = 'scripts/lib/ravscore-continuation-implementation-contract.mjs';
const ISSUED_I = 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5';
const ISSUED_C = '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9';
const ISSUED_T_SHA = '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b';
const GRID_I = '994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399';
const GRID_C = 'd192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9';
const GRID_T = '0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a';

async function issued213Factory(root) {
  const git = args => new Promise((resolve, reject) => {
    execFile('git', ['-C', ISSUED_ROOT, ...args],
      { encoding: 'buffer', timeout: 30_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => error ? reject(error) : resolve(stdout));
  });
  assert.equal(String(await git(['rev-parse', ISSUED_HEAD + '^{tree}'])).trim(), ISSUED_TREE);
  const regular = new Map(String(await git(['ls-tree', '-r', '-z', ISSUED_HEAD]))
    .split('\0').filter(Boolean).map(row => {
      const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
      return match ? [match[3], match[2]] : [null, null];
    }).filter(([name]) => name !== null));
  const bytes = new Map();
  const read = async relative => {
    assert.match(relative, /^[A-Za-z0-9_./-]+$/);
    assert.equal(path.posix.normalize(relative), relative);
    assert(!path.posix.isAbsolute(relative) && !relative.startsWith('../'));
    assert(regular.has(relative), 'Pinned regular non-symlink source required');
    if (!bytes.has(relative)) bytes.set(relative, await git(['show', ISSUED_HEAD + ':' + relative]));
    return bytes.get(relative);
  };
  const target = String(await read(ISSUED_TARGET));
  assert.equal(hash(target), '420b2dc97c9de1ee9ce3cf658df5b8449454693d8ac33fa15f607144074eacdb');
  const slice = (start, end) => {
    assert.equal(target.split(start).length, 2); assert.equal(target.split(end).length, 2);
    assert(target.indexOf(start) < target.indexOf(end));
    return target.slice(target.indexOf(start), target.indexOf(end));
  };
  // EXACT original declarations, not a rewritten fixture or rebound new states.
  const factory = slice('const PART_COUNT =', 'const safeShape =')
    + slice('const samples =', 'const sourceDocument =');
  assert.equal(hash(factory), '71ce29ec98e43bfa02017a145c4438346f1d8a1f4323526ec58e4b1081d81e36');
  // Kun den historiske closure bruger sin hele genuine044d-scanner.
  // Den aktuelle scanner og dens rettede deklarationsgrammatik ændres ikke.
  const scannerSource = await read('scripts/lib/static-module-closure.mjs');
  assert.equal(scannerSource.length, 6790, 'Exact issued scanner byte length');
  assert.equal(hash(scannerSource), '675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0',
    'Exact issued scanner whole bytes');
  const { exactRelativeModuleSpecifiers } = await import(
    'data:text/javascript;base64,' + scannerSource.toString('base64'));
  const tSource = String(await read(ISSUED_T));
  const declaration = /export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(declaration, 'Exact historical T declaration required');
  const tFiles = [...declaration[1].matchAll(/  '([^']+)',/g)].map(match => match[1]);
  assert.equal(tFiles.length, 12); assert.equal(new Set(tFiles).size, 12);
  const tRows = [];
  for (const file of [...tFiles].sort()) tRows.push([file, hash(String(await read(file)).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'))]);
  assert.equal(hash(JSON.stringify(tRows)), ISSUED_T_SHA, 'All twelve original T bytes before import');
  const imports = [
    ['buildIntegratedRavScoreStateSeries', 'js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries', 'js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding', 'js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding', 'scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey', 'scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID', 'scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint', 'scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256', ISSUED_T],
  ];
  const pending = [...imports.map(([, file]) => file), 'package.json'];
  const selected = new Set(tFiles), visited = new Set();
  while (pending.length) {
    const file = pending.pop(); if (visited.has(file)) continue;
    visited.add(file); selected.add(file);
    const source = String(await read(file));
    if (!/\.(?:js|mjs|ts)$/.test(file)) continue;
    for (const specifier of exactRelativeModuleSpecifiers(source, file)) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier.split(/[?#]/, 1)[0]));
      const candidates = path.posix.extname(base) ? [base] : [base, base + '.js', base + '.mjs', base + '.json', base + '/index.js'];
      const resolved = candidates.find(candidate => regular.has(candidate));
      assert(resolved, 'Every historical static import must resolve to its fixed regular blob');
      pending.push(resolved);
    }
  }
  const pins = [];
  for (const file of [...selected].sort()) {
    const buffer = await read(file); pins.push({ file, bytes: buffer.length, sha256: hash(buffer) });
  }
  assert.equal(pins.length, 26);
  assert.equal(hash(JSON.stringify(pins)), 'b95874fa463885112b3e9e2fa5f9963a98c4c996486994a845139494acc248f5');
  // The genuine loader uses readFileSync, not an ESM import. Admit this ONE
  // immutable data dependency explicitly; never copy a directory or relax26.
  const policyFile = 'scripts/lib/dmi-marine-zone-exclusions.json';
  assert(!selected.has(policyFile));
  const policyBytes = await read(policyFile);
  assert.equal(policyBytes.length, 416);
  assert.equal(hash(policyBytes), 'b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16');
  pins.push({ file: policyFile, bytes: policyBytes.length, sha256: hash(policyBytes) });
  pins.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  assert.equal(pins.length, 27);
  assert.equal(hash(JSON.stringify(pins)), '387018040982cba1428b1b3887b476e1e6ff8fe3017b78c7a5fe2d5f6b3d1d3b');
  for (const [file, sha] of [['js/core/ravscore-model-bundle.generated.js', ISSUED_I],
    ['scripts/rollback-assets/ravscore-model-bundle.generated.js', ISSUED_C]]) {
    assert.match(String(await read(file)), new RegExp("GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = ['\"]" + sha + "['\"]"));
  }
  // Nothing is written/evaluated until the whole fixed closure/factory/T pins pass.
  const directory = path.join(root, 'issued213');
  await fs.mkdir(directory, { mode: 0o700 });
  const canonical = await fs.realpath(directory);
  assert.equal(path.dirname(canonical), await fs.realpath(root));
  for (const row of pins) {
    const destination = path.join(directory, row.file), parent = path.dirname(destination);
    await fs.mkdir(parent, { recursive: true });
    const relative = path.relative(canonical, await fs.realpath(parent));
    assert(relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)));
    await fs.writeFile(destination, await read(row.file), { flag: 'wx', mode: 0o600 });
    assert.equal(hash(await fs.readFile(destination)), row.sha256);
  }
  const moduleSource = "import crypto from 'node:crypto';\n"
    + imports.map(([names, file]) => 'import { ' + names + ' } from '
      + JSON.stringify(pathToFileURL(path.join(directory, file)).href) + ';').join('\n')
    + '\n' + factory
    + '\nexport { sourceDocumentAt, atHour, saveRavScoreContinuationCheckpoint, CURRENT_CONTINUATION_IMPLEMENTATION_SHA256, ravScoreModelBinding, candidateGRollbackModelBinding };';
  const loaded = await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256, ISSUED_I);
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256, ISSUED_C);
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256, ISSUED_T_SHA);
  return { ...loaded, sourceReceipt: { head: ISSUED_HEAD, tree: ISSUED_TREE, fileCount: pins.length,
    factorySha256: hash(factory), closureSha256: hash(JSON.stringify(pins)) } };
}

// Source-only integration control; this does not run, skip, or certify PostgreSQL.
// No caller-selected historical root, binding, factory or destination is accepted.
export async function verifyIssuedNativeCheckpointFixture() {
  const parent = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(parent, 'rr-checkpoint-pg-'));
  const identity = await fs.lstat(root, { bigint: true });
  try {
    const issued = await issued213Factory(root);
    const sourcePath = path.join(root, 'issued-source.json'), checkpointPath = path.join(root, 'issued-checkpoint.json');
    await fs.writeFile(sourcePath, JSON.stringify(issued.sourceDocumentAt(49, 'rr-native-sql-49')), { flag: 'wx' });
    await issued.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
    const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
    assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
    assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
    assert.equal(payload.modelBinding.modelBundleSha256, ISSUED_I);
    assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, ISSUED_C);
    assert.equal(payload.continuationStateContractSha256, ISSUED_T_SHA);
    return { kind: 'ISSUED213_NATIVE_FIXTURE_SOURCE_ONLY', ...issued.sourceReceipt,
      partCount: 673, normalSaver: true, sqlExecuted: false };
  } finally {
    const actual = await fs.lstat(root, { bigint: true });
    assert.equal(await fs.realpath(root), root); assert.equal(path.dirname(root), parent);
    assert(actual.isDirectory() && !actual.isSymbolicLink() && actual.ino > 0n);
    assert.deepEqual([actual.dev, actual.ino, actual.birthtimeNs], [identity.dev, identity.ino, identity.birthtimeNs]);
    await fs.rm(root, { recursive: true, force: false });
  }
}

async function nativePrograms() {
  if (process.platform !== 'linux') throw new Error('NATIVE_POSTGRES_UNAVAILABLE_ON_THIS_HOST');
  const configured = await command('pg_config', ['--bindir']);
  if (configured.code !== 0) throw new Error('NATIVE_POSTGRES_PG_CONFIG_UNAVAILABLE');
  const candidates = [configured.stdout.trim()];
  try {
    candidates.push(...(await fs.readdir('/usr/lib/postgresql')).filter(value => /^\d+$/.test(value))
      .sort((a, b) => Number(b) - Number(a)).slice(0, 4)
      .map(value => `/usr/lib/postgresql/${value}/bin`));
  } catch { /* No installation, package download or alternative service. */ }
  for (const directory of [...new Set(candidates)]) {
    if (!path.isAbsolute(directory)) continue;
    const programs = Object.fromEntries(['initdb', 'pg_ctl', 'psql', 'postgres']
      .map(name => [name, path.join(directory, name)]));
    try { await Promise.all(Object.values(programs).map(file => fs.access(file, fs.constants.X_OK))); }
    catch { continue; }
    const versions = await Promise.all(Object.values(programs).map(file => command(file, ['--version'])));
    const majors = versions.map(result => result.code === 0 ? result.stdout.match(/\b(\d+)\.\d+\b/)?.[1] : null);
    if (majors.every(value => value !== null && value === majors[0]) && Number(majors[0]) >= 16) {
      return { ...programs, majorVersion: Number(majors[0]) };
    }
  }
  throw new Error('NATIVE_POSTGRES_COMPLETE_EXISTING_BINARIES_UNAVAILABLE');
}


// Same native server/owner, after all thirteen old130000/200000 comparisons.
// This is a source fixture, not an installed account or production checkpoint.
async function compareAccountAssistantSuccessor({ psql, runSql, source, oldSource,
  oldFixtures, currentFixtures, cases, atHour, oldCas, newCas }) {
  assert.equal(hash(source), '80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
  await psql("insert into supabase_migrations.schema_migrations values('20261012200000');");
  const noAccountObjects = async () => assert.equal(await psql(
    "select to_regclass('public.account_activity_journal') is null and "
    + "to_regclass('public.account_statistics_preferences') is null and "
    + "to_regprocedure('public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection(jsonb,timestamptz)') is null;"), 't');
  // Test the REAL beforeGuard, not a hand-written equivalent. Each failed
  // whole transaction must leave account objects absent and CAS body unchanged.
  for (const [drift, restore] of [
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) security invoker;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) security definer;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=public;",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set search_path=pg_catalog,public;"],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ["revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from service_role;",
     "grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to service_role;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to anon;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from anon;"],
    ["grant execute on function " + CAS + "(bigint,timestamptz,jsonb) to authenticated;",
     "revoke execute on function " + CAS + "(bigint,timestamptz,jsonb) from authenticated;"],
  ]) {
    await psql(drift);
    assert.notEqual((await runSql(source)).code, 0, 'actual beforeGuard must reject predecessor properties/ACL drift');
    await noAccountObjects();
    await psql(restore);
    const stored = await psql("select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;");
    const expected = newCas.slice(newCas.indexOf('as $$') + 5, newCas.lastIndexOf('$$;')).trim();
    assert.equal(stored, expected, 'refused whole migration must preserve actual200000 CAS');
  }
  // Apply the WHOLE new append-only SOURCE, including transaction, BEFORE,
  // account DDL, exact projections/functions, AFTER ACL/body guards and notify.
  await psql(source);
  assert.equal(await psql("select current_setting('lock_timeout');"), '0');
  await psql("insert into supabase_migrations.schema_migrations values('20261013210000');");
  assert.notEqual((await runSql(source)).code, 0, 'already-installed migration must not replay');

  const successor = structuredClone(currentFixtures);
  successor.predecessor = structuredClone(oldFixtures.current);
  successor.unknown = structuredClone(successor.predecessor);
  successor.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
  successor.invalid = structuredClone(successor.current); successor.invalid.partCount = 672;
  successor.mixed = structuredClone(successor.predecessor);
  Object.values(successor.mixed.states)[0].modelBundleSha256 = successor.current.modelBinding.modelBundleSha256;
  successor.wrongCandidate = structuredClone(successor.predecessor);
  successor.wrongCandidate.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = 'f'.repeat(64);
  await psql('truncate public.native_checkpoint_payloads;');
  for (const [name,payload] of Object.entries(successor)) {
    const json=JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + json + "$native_fixture$::jsonb);");
  }
  const projection='public.ravradar_ravscore_checkpoint_account_assistant_predecessor_projection';
  const whole=JSON.parse(await psql("select jsonb_build_object("
    + "'wholeEqual'," + projection + "((select payload from native_checkpoint_payloads where name='predecessor'),'"
    + atHour(49) + "')=(select payload from native_checkpoint_payloads where name='current'),"
    + "'mixedRefused'," + projection + "((select payload from native_checkpoint_payloads where name='mixed'),'" + atHour(49) + "') is null,"
    + "'candidateRefused'," + projection + "((select payload from native_checkpoint_payloads where name='wrongCandidate'),'" + atHour(49) + "') is null);"));
  assert.deepEqual(whole,{wholeEqual:true,mixedRefused:true,candidateRefused:true},
    'whole 673 payload projection, not selected state fields, must match the normal builder output');

  const properties=JSON.parse(await psql("select jsonb_build_object("
    + "'definer',p.prosecdef,'searchPath','search_path=pg_catalog, public'=any(p.proconfig),"
    + "'timeout','statement_timeout=55s'=any(p.proconfig),"
    + "'service',has_function_privilege('service_role',p.oid,'execute'),"
    + "'anon',has_function_privilege('anon',p.oid,'execute'),"
    + "'authenticated',has_function_privilege('authenticated',p.oid,'execute'),"
    + "'bodySha',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'))"
    + " from pg_proc p where p.oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"));
  const successorCas=definition(source,'ravradar_ravscore_checkpoint_cas');
  assert.deepEqual(properties,{definer:true,searchPath:true,timeout:true,service:true,anon:false,
    authenticated:false,bodySha:hash(successorCas.slice(successorCas.indexOf('as $$')+5,successorCas.lastIndexOf('$$;')).trim())});
  const reports=[];
  for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
    role='service_role',claimRole=role] of cases) {
    const reset="truncate public.admin_documents;" + (central
      ? "insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';" : '');
    const observed=JSON.parse(await psql(reset + "\nset statement_timeout='55s';"
      + " do $$ begin perform set_config('request.jwt.claim.role','" + claimRole + "',false); end $$; set role " + role + ";"
      + " select public.native_checkpoint_attempt(false," + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
    assert.equal(observed.sqlstate,expectedCode,'new full-migration case ' + name);
    if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
    assert.equal(observed.stored?.version,storedVersion);
    if (expectedCode || disposition==='unchanged') {
      assert.equal(observed.stored.ownerIsNull,false);
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'new refusal/unchanged must preserve whole payload/reference/version/owner');
    } else { assert.equal(observed.stored.ownerIsNull,true); assert.equal(observed.stored.storedPayloadMatchesIncoming,true); }
    reports.push({case:name,sqlstate:expectedCode,disposition,storedVersion});
  }

  // Explicit receipt-difference oracle. Both generation receipts must remain
  // equal because the full validator requires that invariant. They therefore
  // change as a pair; no individual mismatch is admitted by the comparator.
  const receiptCases=[];
  for (const fields of [['generationPair'],['stateSha256'],['generationPair','stateSha256']]) {
    const payload=structuredClone(successor.current);
    if(fields.includes('generationPair')) {
      payload.generationSha256=hash('native successor generation receipt');
      payload.candidateGRollbackCompanion.generationSha256=payload.generationSha256;
    }
    if(fields.includes('stateSha256')) payload.stateSha256=hash('native successor state receipt');
    assert.notDeepEqual(payload,successor.current);
    const stripReceipts=value=>{
      const copy=structuredClone(value); delete copy.generationSha256; delete copy.stateSha256;
      delete copy.candidateGRollbackCompanion.generationSha256; return copy;
    };
    assert.deepEqual(stripReceipts(payload),stripReceipts(successor.current),
      'only the three already allowed receipt leaves differ in this positive fixture');
    receiptCases.push({name:'receipt-'+fields.join('-'),payload,valid:true,sqlstate:null});
  }
  const badGeneration=structuredClone(successor.current);
  badGeneration.generationSha256=hash('unpaired generation receipt');
  receiptCases.push({name:'unpaired-generation',payload:badGeneration,valid:false,sqlstate:'22023'});
  const candidateReceipt=structuredClone(successor.current);
  candidateReceipt.candidateGRollbackCompanion.stateSha256=hash('changed Candidate state receipt');
  assert.deepEqual(candidateReceipt.candidateGRollbackCompanion.states,successor.current.candidateGRollbackCompanion.states);
  receiptCases.push({name:'candidate-state-receipt',payload:candidateReceipt,valid:true,sqlstate:'23505'});
  const changedHistory=structuredClone(successor.current);
  changedHistory.candidateGRollbackCompanion.states=structuredClone(successor.changed.candidateGRollbackCompanion.states);
  assert.notDeepEqual(Object.values(changedHistory.candidateGRollbackCompanion.states)[0].transportEvidence,
    Object.values(successor.current.candidateGRollbackCompanion.states)[0].transportEvidence,
    'the existing normal Candidate builder produces genuinely different history, not a metadata-only variation');
  receiptCases.push({name:'candidate-history',payload:changedHistory,valid:true,sqlstate:'23505'});
  for(const {name,payload,valid,sqlstate} of receiptCases) {
    const json=JSON.stringify(payload);assert.equal(json.includes('$native_fixture$'),false);
    await psql("insert into public.native_checkpoint_payloads values('receipt-incoming',$native_fixture$"+json+"$native_fixture$::jsonb);");
    assert.equal(await psql("select public.ravradar_ravscore_checkpoint_payload_valid("
      + "(select payload from native_checkpoint_payloads where name='receipt-incoming'),'"+atHour(49)+"');"),valid?'t':'f',
      'receipt oracle must prove full-validator admission independently: '+name);
    const observed=JSON.parse(await psql("truncate public.admin_documents;"
      + "insert into public.admin_documents(document_key,payload,version,updated_by) select '"+KEY
      + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='predecessor';"
      + " set statement_timeout='55s'; select set_config('request.jwt.claim.role','service_role',false); set role service_role;"
      + " select public.native_checkpoint_attempt(false,1,(select payload from native_checkpoint_payloads where name='receipt-incoming'));").then(output=>output.split('\n').at(-1)));
    assert.equal(observed.sqlstate,sqlstate,name);
    if(sqlstate===null) {
      assert.equal(observed.result.disposition,'updated');assert.equal(observed.result.centralVersion,2);
      assert.equal(observed.stored.storedPayloadMatchesIncoming,true);assert.equal(observed.stored.ownerIsNull,true);
    } else {
      const {storedPayloadMatchesIncoming,...stored}=observed.stored;
      assert.deepEqual(stored,observed.previous,'receipt/history refusal preserves the entire stored original');
      assert.equal(stored.ownerIsNull,false);
    }
    await psql("delete from public.native_checkpoint_payloads where name='receipt-incoming';");
  }
  const catalogMetadata=JSON.parse(await psql(accountAssistantCatalogQuery));
  const catalogReceipt=await verifyAccountAssistantCatalogMetadata(catalogMetadata);
  assert.equal(catalogReceipt.status,'ACCOUNT_ASSISTANT_SCHEMA_MATCH');
  assert.equal(catalogReceipt.accountRowsRead,false);
  for(const drift of [
    'grant execute on function public.get_own_statistics_preference() to authenticated with grant option;',
    'create role native_catalog_unexpected nologin; grant select(user_id) on public.account_statistics_preferences to native_catalog_unexpected;',
  ]) {
    const unsafe=JSON.parse(await psql('begin;'+drift+accountAssistantCatalogQuery+'rollback;'));
    await assert.rejects(verifyAccountAssistantCatalogMetadata(unsafe),
      /ACCOUNT_ASSISTANT_CATALOG_MISMATCH/,
      'the installed catalog reader must reject delegated RPC and hidden column grants');
  }
  assert.deepEqual(await verifyAccountAssistantCatalogMetadata(JSON.parse(await psql(accountAssistantCatalogQuery))),
    catalogReceipt,'transactional metadata negatives restore the exact account catalog');

  const ownerA='00000000-0000-0000-0000-000000000001';
  const ownerB='00000000-0000-0000-0000-000000000002';
  const missing='00000000-0000-0000-0000-000000000003';
  await psql("insert into public.profiles(id) values('" + ownerA + "'),('" + ownerB + "');");
  const accountSession=(uid,role='authenticated',claim=role)=>"select set_config('request.jwt.claim.sub','" + uid
    + "',false); select set_config('request.jwt.claim.role','" + claim + "',false); set role " + role + ";";
  const ownCall=async (uid,name)=>JSON.parse((await psql(accountSession(uid)
    + 'select public.' + name + '();')).split('\n').at(-1));
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'0',
    'default read is not a stored opt-in or statistic processing');
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'get_own_statistics_preference'),{enabled:true,source:'default'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerB,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'get_own_statistics_preference'),{enabled:false,source:'stored'},
    'another owner cannot overwrite a stored false');
  assert.deepEqual(await ownCall(ownerA,'enable_own_statistics_preference'),{enabled:true,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'disable_own_statistics_preference'),{enabled:false,source:'stored'});
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  const first=await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';");
  assert.deepEqual(await ownCall(ownerA,'record_account_activity'),{recorded:true});
  assert.equal(await psql("select first_observed_at::text from public.account_activity_journal where user_id='" + ownerA + "';"),first);
  assert.equal(await psql("select last_activity_at>=first_observed_at from public.account_activity_journal where user_id='" + ownerA + "';"),'t');
  assert.equal(await psql("select count(*) from public.account_activity_journal where user_id='" + ownerB + "';"),'0');

  // Use real SQL identities/ACL/RLS, not a mocked auth return or request payload.
  for (const uid of ['',missing]) for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    assert.notEqual((await runSql(accountSession(uid)+'select public.'+name+'();')).code,0);
  }
  for (const name of ['record_account_activity','get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference']) {
    for (const role of ['anon','service_role']) assert.notEqual((await runSql(accountSession(ownerA,role)+'select public.'+name+'();')).code,0);
  }
  for (const table of ['account_activity_journal','account_statistics_preferences']) {
    assert.equal(await psql("select relrowsecurity from pg_class where oid='public."+table+"'::regclass;"),'t');
    assert.notEqual((await runSql(accountSession(ownerA)+'select * from public.'+table+';')).code,0,
      'ordinary authenticated table read must be denied, including its own rows');
    // Temporary fixture-only grant demonstrates that the actual enabled RLS
    // still denies all direct rows; rollback preserves the migration ACL.
    const rls=(await psql('begin; grant select on public.'+table+' to authenticated;'
      + accountSession(ownerA)+'select count(*) from public.'+table+'; rollback;')).split('\n').at(-1);
    assert.equal(rls,'0');
    assert.equal(await psql("select has_table_privilege('authenticated','public."+table+"','select');"),'f');
  }
  assert.equal(await psql('select count(*) from public.account_statistics_preferences;'),'2');
  return {kind:'NATIVE_ACCOUNT_ASSISTANT_SUCCESSOR',wholeMigrationExecuted:true,
    migrationSQLSha256:hash(source),normalModelPartCount:673,wholeProjectionEqual:true,
    oldSemanticsRechecked:reports.length,beforeGuardDriftCases:6,accountOwnerAclRls:true,
    receiptDifferenceCases:receiptCases.length,installedCatalog:catalogReceipt,reports};
}

// A separate phase AFTER the unchanged historical thirteen/213 cases. The
// incoming generation is built by genuine fixed37 normal code; old states stay old.
async function compareCurrentGridSuccessor({ psql, runSql, source, accountSource,
  oldFixtures, issuedFixtures, sourceDocumentAt, atHour, saveCheckpoint, root }) {
  assert.equal(hash(source), '77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b');
  assert.match(source, /\bbegin;\s+set local lock_timeout = '5s';/);
  const originalNames = ['ffc', '249', 'c1ac'].flatMap(family => ['state', 'payload']
    .map(kind => 'ravradar_ravscore_checkpoint_grid_' + family + '_' + kind + '_valid'));
  const migrationNames = [...source.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(match => match[1]);
  assert.equal(migrationNames.length, 13);
  assert.deepEqual(migrationNames.slice(0, 6), originalNames);
  const originals = { ffc: structuredClone(oldFixtures.predecessor),
    '249': structuredClone(oldFixtures.current), c1ac: structuredClone(issuedFixtures.current) };
  const originalPins = Object.fromEntries(Object.entries(originals).map(([name, payload]) => [name, hash(JSON.stringify(payload))]));
  const put = async (name, payload) => {
    assert.match(name, /^[a-z0-9-]+$/);
    const json = JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'), false);
    await psql("insert into public.native_checkpoint_payloads values('" + name + "',$native_fixture$" + json + "$native_fixture$::jsonb);");
  };
  await psql('truncate public.native_checkpoint_payloads;');
  for (const [name, payload] of Object.entries(originals)) await put('original-' + name, payload);
  const bankHash = () => psql("select md5(jsonb_agg(jsonb_build_array(name,payload) order by name)::text) from public.native_checkpoint_payloads;");
  const bankBefore = await bankHash();
  const preserved = () => psql("select md5(jsonb_build_object('checkpoint',(select jsonb_agg(to_jsonb(d) order by document_key) from public.admin_documents d),'activity',(select jsonb_agg(to_jsonb(a) order by user_id) from public.account_activity_journal a),'preference',(select jsonb_agg(to_jsonb(s) order by user_id) from public.account_statistics_preferences s))::text);");
  const rowsBefore = await preserved();
  const oldBody = definition(accountSource, 'ravradar_ravscore_checkpoint_cas');
  const body = text => text.slice(text.indexOf('as $$') + 5, text.lastIndexOf('$$;')).trim();
  for (const [drift, restore] of [
    ["delete from supabase_migrations.schema_migrations where version='20261013210000';",
     "insert into supabase_migrations.schema_migrations values('20261013210000');"],
    ['alter function ' + CAS + '(bigint,timestamptz,jsonb) security invoker;',
     'alter function ' + CAS + '(bigint,timestamptz,jsonb) security definer;'],
    ['alter function ' + CAS + '(bigint,timestamptz,jsonb) set search_path=public;',
     'alter function ' + CAS + '(bigint,timestamptz,jsonb) set search_path=pg_catalog,public;'],
    ["alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='54s';",
     "alter function " + CAS + "(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ['revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from service_role;',
     'grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to service_role;'],
    ['grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to anon;',
     'revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from anon;'],
    ['grant execute on function ' + CAS + '(bigint,timestamptz,jsonb) to authenticated;',
     'revoke execute on function ' + CAS + '(bigint,timestamptz,jsonb) from authenticated;'],
  ]) {
    await psql(drift);
    assert.notEqual((await runSql(source)).code, 0, 'whole220 BEFORE must reject actual predecessor/ACL drift');
    assert.equal(await psql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (" + originalNames.map(name => "'" + name + "'").join(',') + ');'), '0');
    await psql(restore);
    assert.equal(await psql("select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"), body(oldBody));
    assert.equal(await bankHash(), bankBefore); assert.equal(await preserved(), rowsBefore);
  }
  await psql(source); // Entire transaction/BEFORE/definitions/AFTER/ACL/notify/COMMIT.
  assert.equal(await psql("select current_setting('lock_timeout');"), '0');
  assert.equal(await bankHash(), bankBefore); assert.equal(await preserved(), rowsBefore,
    'installing220 must not rewrite an original checkpoint, account or preference row');
  await psql("insert into supabase_migrations.schema_migrations values('20261013220000');");
  assert.notEqual((await runSql(source)).code, 0, 'whole220 may not replay');
  const definitions = JSON.parse(await psql("select jsonb_object_agg(p.proname,encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (" + migrationNames.map(name => "'" + name + "'").join(',') + ');'));
  assert.deepEqual(definitions, Object.fromEntries(migrationNames.map(name => [name, hash(body(definition(source, name)))])),
    'actual native bodies include all six whole original validators and seven replacements');
  const properties = JSON.parse(await psql("select jsonb_build_object('definer',p.prosecdef,'searchPath','search_path=pg_catalog, public'=any(p.proconfig),'timeout','statement_timeout=55s'=any(p.proconfig),'service',has_function_privilege('service_role',p.oid,'execute'),'anon',has_function_privilege('anon',p.oid,'execute'),'authenticated',has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p where p.oid='" + CAS + "(bigint,timestamptz,jsonb)'::regprocedure;"));
  assert.deepEqual(properties, { definer: true, searchPath: true, timeout: true, service: true, anon: false, authenticated: false });
  assert.equal(await psql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname in (" + originalNames.map(name => "'" + name + "'").join(',') + ") and a.privilege_type='EXECUTE' and (a.grantee=0 or a.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')));"), '0');
  for (const [family, payload] of Object.entries(originals)) {
    assert.equal(await psql('select public.ravradar_ravscore_checkpoint_grid_' + family
      + "_payload_valid((select payload from native_checkpoint_payloads where name='original-" + family + "'),'" + atHour(49) + "');"), 't',
    'all 673 original pairs must pass their OWN unchanged whole validator: ' + family);
    assert.equal(hash(JSON.stringify(payload)), originalPins[family]);
  }
  const current = {};
  for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
    const sourcePath = path.join(root, 'grid-' + name + '-source.json');
    const checkpointPath = path.join(root, 'grid-' + name + '-checkpoint.json');
    await fs.writeFile(sourcePath, JSON.stringify(sourceDocumentAt(hour, 'rr-native-grid-' + hour, options)), { flag: 'wx' });
    await saveCheckpoint({ sourcePath, checkpointPath });
    const payload = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
    assert.equal(payload.modelBinding.modelBundleSha256, GRID_I);
    assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256, GRID_C);
    assert.equal(payload.continuationStateContractSha256, GRID_T);
    assert.equal(payload.partCount, 673); assert.equal(Object.keys(payload.states).length, 673);
    assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length, 673);
    current[name] = payload; await put('grid-' + name, payload);
    assert.equal(await psql("select public.ravradar_ravscore_checkpoint_payload_valid((select payload from native_checkpoint_payloads where name='grid-" + name + "'),'" + atHour(hour) + "');"), 't');
  }
  const cases = [
    ['insert',null,'grid-current',0,null,'inserted',1],
    ['equal-stale-version','grid-current','grid-current',0,null,'unchanged',1],
    ['same-reference-changed-state','grid-current','grid-changed',1,'23505',null,1],
    ['regression','grid-future','grid-current',1,'22023',null,1],
    ['wrong-version','grid-current','grid-future',0,'40001',null,1],
    ['higher-reference','grid-current','grid-future',1,null,'updated',2],
    ['negative-version','grid-current','grid-current',-1,'22023',null,1],
    ['role-rejection','grid-current','grid-current',1,'42501',null,1,'service_role','anon'],
    ['ACL-rejection','grid-current','grid-current',1,'42501',null,1,'anon','anon'],
  ];
  for (const [family, payload] of Object.entries(originals)) {
    cases.push(['newer-' + family,'original-' + family,'grid-future',1,null,'updated',2],
      ['same-reference-' + family,'original-' + family,'grid-current',1,'22023',null,1],
      ['version-' + family,'original-' + family,'grid-future',0,'40001',null,1]);
    const invalids = {
      mixed: value => { Object.values(value.states)[0].modelBundleSha256 = GRID_I; },
      candidate: value => { value.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = GRID_C; },
      continuation: value => { value.continuationStateContractSha256 = GRID_T; },
      generation: value => { value.candidateGRollbackCompanion.generationSha256 = hash('unpaired old generation'); },
      sampling: value => { Object.values(value.states)[0].samplingContextKey = null; },
      missing: value => { delete value.states[Object.keys(value.states)[0]]; },
    };
    for (const [kind, mutate] of Object.entries(invalids)) {
      const invalid = structuredClone(payload); mutate(invalid);
      const name = family + '-' + kind; await put(name, invalid);
      assert.equal(await psql('select public.ravradar_ravscore_checkpoint_grid_' + family
        + "_payload_valid((select payload from native_checkpoint_payloads where name='" + name + "'),'" + atHour(49) + "');"), 'f');
      cases.push([name, name, 'grid-future', 1, '22023', null, 1]);
    }
  }
  const invalidIncoming = structuredClone(current.future); invalidIncoming.partCount = 672;
  await put('grid-invalid', invalidIncoming);
  cases.push(['invalid-incoming','original-c1ac','grid-invalid',1,'22023',null,1]);
  const reports = [];
  for (const [name, central, incoming, version, expectedCode, disposition, storedVersion,
    role = 'service_role', claimRole = role] of cases) {
    const reset = 'truncate public.admin_documents;' + (central
      ? "insert into public.admin_documents(document_key,payload,version,updated_by) select '" + KEY
        + "',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='" + central + "';" : '');
    const observed = JSON.parse(await psql(reset + " set statement_timeout='55s'; do $$ begin perform set_config('request.jwt.claim.role','"
      + claimRole + "',false); end $$; set role " + role + '; select public.native_checkpoint_attempt(false,'
      + version + ",(select payload from native_checkpoint_payloads where name='" + incoming + "'));"));
    assert.equal(observed.sqlstate, expectedCode, 'native220 case ' + name);
    assert.equal(observed.stored?.version, storedVersion);
    if (disposition) { assert.equal(observed.result.disposition, disposition); assert.equal(observed.result.centralVersion, storedVersion); }
    if (expectedCode || disposition === 'unchanged') {
      const { storedPayloadMatchesIncoming, ...stored } = observed.stored;
      assert.deepEqual(stored, observed.previous, '220 refusal/equality preserves exact original row: ' + name);
      assert.equal(stored.ownerIsNull, false);
    } else { assert.equal(observed.stored.ownerIsNull, true); assert.equal(observed.stored.storedPayloadMatchesIncoming, true); }
    reports.push({ case: name, sqlstate: expectedCode, disposition, storedVersion });
  }
  for (const [family, payload] of Object.entries(originals)) assert.equal(hash(JSON.stringify(payload)), originalPins[family]);
  return { kind: 'NATIVE_CURRENT_GRID_SUCCESSOR', wholeMigrationExecuted: true,
    migrationSQLSha256: hash(source), currentPartCount: 673, originalFamilies: ['ffc','249','c1ac'],
    beforeGuardDriftCases: 7, actualDefinitionCount: 13, timeoutSeconds: 55,
    migrationLocalLockTimeoutSeconds: 5, accountRowsPreserved: true, reports };
}

// Called ONLY by the existing protected-checkpoint target's native-only branch.
// Its real 673 model builders and normal checkpoint saver supply the fixtures.
export async function runNativeCheckpointSqlComparison({ repositoryRoot,
  sourceDocumentAt, atHour, saveCheckpoint, includeStatisticsRevision = false,
  includeNativeIdentity = false, includeCurrentMemoryWarmup = false, includeEstablishedNativeCurrentOrigin = false,
  includeLastMileEnclosure = false, includeAccountStatisticsAssistant = false,
  includeNativeOriginalContinuity = false, includeAssistantLaterH0 = false,
  includeAssistantPublic587Successor = false } = {}) {
  assert.equal(typeof includeStatisticsRevision,'boolean');
  assert.equal(typeof includeNativeIdentity,'boolean');
  assert.equal(typeof includeCurrentMemoryWarmup,'boolean');
  assert.equal(typeof includeEstablishedNativeCurrentOrigin,'boolean');
  assert.equal(typeof includeLastMileEnclosure,'boolean');
  assert.equal(typeof includeAccountStatisticsAssistant,'boolean');
  assert.equal(typeof includeNativeOriginalContinuity,'boolean');
  assert.equal(typeof includeAssistantLaterH0,'boolean');
  assert.equal(typeof includeAssistantPublic587Successor,'boolean');
  assert(!includeAssistantPublic587Successor || includeAssistantLaterH0,
    'Public587 successor requires the genuine complete587 native phase');
  if(includeAssistantPublic587Successor){
    const {requireAssistantPublic587SuccessorRelease}=await import('./assistant-later-h0-successor-source.mjs');
    requireAssistantPublic587SuccessorRelease(); // UNISSUED before programs, host, factory or SQL.
  }
  assert(!includeAssistantLaterH0 || includeNativeOriginalContinuity,'Assistant later-H0 requires the genuine complete586 native phase');
  if(includeAssistantLaterH0){
    const {requireAssistantLaterH0Release}=await import('./assistant-later-h0-successor-source.mjs');
    requireAssistantLaterH0Release(); // Before programs, host, factory or SQL.
  }
  assert(!includeNativeOriginalContinuity || includeAccountStatisticsAssistant,
    'Native continuity requires the genuine complete585 native phase');
  if(includeNativeOriginalContinuity){
    const {requireNativeOriginalContinuityOutput}=await import('./native-original-continuity-successor-source.mjs');
    requireNativeOriginalContinuityOutput(); // UNISSUED before programs, host or SQL.
  }
  assert(!includeAccountStatisticsAssistant || includeLastMileEnclosure,'585 requires the genuine complete584 native phase');
  assert(!includeLastMileEnclosure || includeEstablishedNativeCurrentOrigin,'Last-mile enclosure requires every genuine historical native phase');
  assert(!includeEstablishedNativeCurrentOrigin || includeCurrentMemoryWarmup,'Established origin requires every unchanged historical native phase');
  assert(!includeCurrentMemoryWarmup || (includeNativeIdentity && includeStatisticsRevision), 'CurrentMemoryWarmup requires every unchanged historical native phase');
  assert(!includeNativeIdentity || includeStatisticsRevision, 'NEW requires the unchanged statistics230 phase');
  const programs = await nativePrograms();
  assert.ok(typeof sourceDocumentAt === 'function' && typeof atHour === 'function'
    && typeof saveCheckpoint === 'function', 'normal fixture constructors are required');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-pg-'));
  assert.match(root, /^[A-Za-z0-9_/-]+$/, 'private native directory cannot be passed safely to pg_ctl');
  const data = path.join(root, 'database'), socket = path.join(root, 'socket');
  await fs.mkdir(socket, { mode: 0o700 });
  const env = { PATH: process.env.PATH, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC',
    PGHOST: socket, PGPORT: '5432', PGDATABASE: 'postgres', PGUSER: 'rr_native_test',
    PGPASSFILE: path.join(root, 'absent-password-file'), PGSSLMODE: 'disable' };
  let nativePhase = 'NATIVE_SETUP';
  const runSql = (input, timeout = 70_000) => command(programs.psql,
    ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
    { input, env, timeout });
  const psql = async (input, timeout = 70_000) => {
    const result = await command(programs.psql,
      ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-h', socket, '-p', '5432', '-U', 'rr_native_test', '-d', 'postgres'],
      { input, env, timeout });
    if (result.code !== 0) {
      // Emit the FIRST failed normal psql call before cleanup, using ONLY the
      // static phase/state/category projection, never raw stderr or input.
      console.error(nativePostgresFailureAnnotation(nativePhase,
        result.sqlState === 'UNKNOWN' ? '' : 'ERROR: ' + result.sqlState));
      throw new Error('NATIVE_POSTGRES_SQL_COMMAND_FAILED');
    }
    return result.stdout.trim();
  };
  let owner = null, started = false, stopped = false, cleanupAllowed = false;
  let statisticsRevisionFailure = null;
  const readOwner = async () => {
    const pid = Number((await fs.readFile(path.join(data, 'postmaster.pid'), 'utf8')).split('\n')[0]);
    assert.ok(Number.isSafeInteger(pid) && pid > 1, 'owned server PID missing');
    const argv = (await fs.readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0');
    assert.ok(argv.includes(data), 'native PostgreSQL is not bound to its owned directory');
    const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
    return { pid, birth: stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] };
  };
  try {
    const initialized = await command(programs.initdb,
      ['-D', data, '-U', 'rr_native_test', '--no-locale', '--encoding=UTF8', '--auth-local=trust', '--auth-host=reject'], { env });
    assert.equal(initialized.code, 0, 'existing native initdb failed');
    // An unknown launch outcome must preserve this private directory.
    const launch = await command(programs.pg_ctl, ['-D', data, '-l', path.join(root,'server.log'), '-w', '-t', '20', 'start', '-o',
      `-k ${socket} -p 5432 -c listen_addresses='' -c unix_socket_permissions=0700 -c log_statement=none -c log_min_error_statement=panic -c log_error_verbosity=terse`], { env });
    assert.equal(launch.code, 0, 'private Unix-socket PostgreSQL failed to start');
    started = true; owner = await readOwner();
    assert.equal(await psql("select current_setting('listen_addresses');"), '', 'TCP must remain disabled');
    const oldSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', OLD_MIGRATION), 'utf8'));
    const newSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', NEW_MIGRATION), 'utf8'));
    const accountSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', ACCOUNT_MIGRATION), 'utf8'));
    const gridSource = sqlText(await fs.readFile(path.join(repositoryRoot, 'supabase/migrations', GRID_MIGRATION), 'utf8'));
    const issued = await issued213Factory(root);
    assert.equal(issued.atHour(49), atHour(49));
    const oldCas = definition(oldSource, 'ravradar_ravscore_checkpoint_cas');
    const newCas = definition(newSource, 'ravradar_ravscore_checkpoint_cas');
    const aliasCas = oldCas.replace(`function ${CAS}(`, `function ${CAS}_baseline(`);
    const setup = `
create schema auth; create schema extensions; create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
insert into supabase_migrations.schema_migrations values('20261010130000');
create extension pgcrypto with schema extensions;
create role service_role nologin bypassrls; create role anon nologin; create role authenticated nologin;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.profiles(id uuid primary key);
grant usage on schema public,auth to service_role,anon,authenticated;
create table public.admin_documents(document_key text primary key,payload jsonb not null,
  version bigint not null default 1,updated_by uuid,updated_at timestamptz not null default now());
create table public.admin_document_versions(document_key text,payload jsonb,version bigint,created_by uuid);
create table public.native_checkpoint_payloads(name text primary key,payload jsonb not null);
grant select on public.admin_documents,public.native_checkpoint_payloads to service_role,anon,authenticated;
${signatures.map(name => definition(oldSource, name)).join('\n')}
${definition(oldSource,'ravradar_trip_v3_calibration_truth_allowed')}
revoke all on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)
  to service_role;
${['ravradar_ravscore_checkpoint_integrated_state_reason','ravradar_ravscore_checkpoint_payload_reason',
  'ravradar_trip_v3_binding_allowed','ravradar_ravscore_checkpoint_contract'].map(name => definition(oldSource,name)).join('\n')}
create trigger native_checkpoint_version before update on public.admin_documents
for each row execute function public.version_admin_document();
${aliasCas}\n${oldCas}
revoke all on function ${CAS}(bigint,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function ${CAS}_baseline(bigint,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function ${CAS}(bigint,timestamptz,jsonb),${CAS}_baseline(bigint,timestamptz,jsonb) to service_role;
alter function ${CAS}(bigint,timestamptz,jsonb) set statement_timeout='55s';
alter function ${CAS}_baseline(bigint,timestamptz,jsonb) set statement_timeout='55s';
create function public.native_checkpoint_attempt(p_baseline boolean,p_expected bigint,p_payload jsonb)
returns jsonb language plpgsql as $$
declare result jsonb; code text; stored jsonb; previous jsonb; started timestamptz:=clock_timestamp();
begin
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'payloadMd5',md5(payload::text),'ownerIsNull',updated_by is null) into previous
    from public.admin_documents where document_key='${KEY}';
  begin
    if p_baseline then result:=public.ravradar_ravscore_checkpoint_cas_baseline(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload);
    else result:=public.ravradar_ravscore_checkpoint_cas(p_expected,(p_payload->>'productionReferenceAt')::timestamptz,p_payload); end if;
  exception when query_canceled then get stacked diagnostics code=returned_sqlstate;
    when others then get stacked diagnostics code=returned_sqlstate; end;
  select jsonb_build_object('version',version,'reference',payload->>'productionReferenceAt',
    'storedPayloadMatchesIncoming',payload=p_payload,'payloadMd5',md5(payload::text),
    'ownerIsNull',updated_by is null) into stored from public.admin_documents where document_key='${KEY}';
  return jsonb_build_object('sqlstate',code,'result',result,'stored',stored,'previous',previous,
    'elapsedMs',extract(epoch from (clock_timestamp()-started))*1000);
end $$;
grant execute on function public.native_checkpoint_attempt(boolean,bigint,jsonb) to service_role,anon,authenticated;`;
    await psql(setup);
    const calibrationSignature='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)';
    const calibrationAcl=JSON.parse(await psql("select jsonb_build_object("
      + "'public',exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a"
      + " where p.oid='"+calibrationSignature+"'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'),"
      + "'anon',has_function_privilege('anon','"+calibrationSignature+"','EXECUTE'),"
      + "'authenticated',has_function_privilege('authenticated','"+calibrationSignature+"','EXECUTE'),"
      + "'service',has_function_privilege('service_role','"+calibrationSignature+"','EXECUTE'));"));
    assert.deepEqual(calibrationAcl,{public:false,anon:false,authenticated:false,service:true},
      'actual old calibration-truth definition retains its original service-only ACL');
    // Execute the ENTIRE append-only migration: registered predecessor and exact
    // installed old body, transaction, lock timeout, replacement, ACL and notify.
    // Its own precondition/permissions are not reimplemented by this fixture.
    nativePhase = 'CAS200_MIGRATION';
    await psql(newSource);
    assert.equal(await psql("select current_setting('lock_timeout');"), '0',
      'complete migration must commit/reset its transaction-local lock timeout');
    const fixtures = {}, currentFixtures = {};
    const oldTuple={integrated:'249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
      candidate:'55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
      continuation:'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'};
    const newTuple={integrated:'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
      candidate:'2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
      continuation:'7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'};
    function metadataFixture(payload,from,to) {
      assert.equal(payload.modelBinding.modelBundleSha256,from.integrated);
      assert.equal(payload.continuationStateContractSha256,from.continuation);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,from.candidate);
      const copy=structuredClone(payload);
      copy.modelBinding.modelBundleSha256=to.integrated;
      copy.continuationStateContractSha256=to.continuation;
      copy.candidateGRollbackCompanion.modelBinding.modelBundleSha256=to.candidate;
      for(const state of Object.values(copy.states)) {
        assert.equal(state.modelBundleSha256,from.integrated); state.modelBundleSha256=to.integrated;
      }
      return copy;
    }
    for (const [name, hour, options] of [['current',49,{}],['future',50,{}],['changed',49,{ candidateCurrentSpeedMps:0.18 }]]) {
      const sourcePath = path.join(root, `${name}-source.json`), checkpointPath = path.join(root, `${name}-checkpoint.json`);
      await fs.writeFile(sourcePath, JSON.stringify(issued.sourceDocumentAt(hour, `rr-native-sql-${hour}`, options)));
      await issued.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath });
      fixtures[name] = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
      assert.equal(fixtures[name].partCount, 673); assert.equal(Object.keys(fixtures[name].states).length, 673);
      currentFixtures[name]=structuredClone(fixtures[name]);
      fixtures[name]=metadataFixture(currentFixtures[name],newTuple,oldTuple);
      assert.deepEqual(metadataFixture(fixtures[name],oldTuple,newTuple),currentFixtures[name],
        'historical thirteen-case fixture differs only in exact binding metadata');
    }
    // Exact metadata-only predecessor of the normal current-builder fixture.
    // Native SQL must itself validate its unchanged 673 state values/projection.
    fixtures.predecessor = structuredClone(fixtures.current);
    fixtures.predecessor.modelBinding.modelBundleSha256 = 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb';
    fixtures.predecessor.continuationStateContractSha256 = '4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51';
    fixtures.predecessor.candidateGRollbackCompanion.modelBinding.modelBundleSha256 = '8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3';
    Object.values(fixtures.predecessor.states).forEach(state => { state.modelBundleSha256 = fixtures.predecessor.modelBinding.modelBundleSha256; });
    fixtures.unknown = structuredClone(fixtures.predecessor); fixtures.unknown.modelBinding.modelBundleSha256 = 'e'.repeat(64);
    fixtures.invalid = structuredClone(fixtures.current); fixtures.invalid.partCount = 672;
    nativePhase = 'BASELINE_FIXTURES';
    for (const [name,payload] of Object.entries(fixtures)) {
      const json = JSON.stringify(payload); assert.equal(json.includes('$native_fixture$'),false);
      await psql(`insert into public.native_checkpoint_payloads values('${name}',$native_fixture$${json}$native_fixture$::jsonb);`);
    }
    nativePhase = 'BASELINE_ADMISSION';
    const checked = JSON.parse(await psql(`select jsonb_build_object('current',public.ravradar_ravscore_checkpoint_payload_valid((select payload from native_checkpoint_payloads where name='current'),'${atHour(49)}'),
      'predecessor',public.ravradar_ravscore_checkpoint_userdata_predecessor_projection((select payload from native_checkpoint_payloads where name='predecessor'),'${atHour(49)}') is not null,
      'definer',(select prosecdef from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'timeout',(select 'statement_timeout=55s'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'searchPath',(select 'search_path=pg_catalog, public'=any(proconfig) from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'anonCanExecute',has_function_privilege('anon','${CAS}(bigint,timestamptz,jsonb)','execute'),
      'newBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}(bigint,timestamptz,jsonb)'::regprocedure),
      'oldBodySha256',(select encode(extensions.digest(btrim(prosrc,E' \\r\\n\\t')::bytea,'sha256'),'hex') from pg_proc where oid='${CAS}_baseline(bigint,timestamptz,jsonb)'::regprocedure));`));
    const body = source => source.slice(source.indexOf('as $$')+5,source.lastIndexOf('$$;')).trim();
    assert.deepEqual(checked,{ current:true,predecessor:true,definer:true,timeout:true,
      searchPath:true,anonCanExecute:false,newBodySha256:hash(body(newCas)),oldBodySha256:hash(body(oldCas)) });
    const cases = [
      ['insert',null,'current',0,null,'inserted',1],
      ['equal-stale-version','current','current',999,null,'unchanged',1],
      ['same-reference-changed-state','current','changed',1,'23505',null,1],
      ['regression','future','current',1,'22023',null,1],
      ['wrong-version','current','future',0,'40001',null,1],
      ['higher-reference','current','future',1,null,'updated',2],
      ['negative-version','current','current',-1,'22023',null,1],
      ['role-rejection','current','current',1,'42501',null,1,'service_role','anon'],
      ['ACL-rejection','current','current',1,'42501',null,1,'anon','anon'],
      ['same-predecessor','predecessor','current',1,null,'updated',2],
      ['changed-predecessor-state','predecessor','changed',1,'23505',null,1],
      ['unknown-predecessor','unknown','current',1,'22023',null,1],
      ['invalid-incoming','current','invalid',1,'22023',null,1],
    ];
    nativePhase = 'BASELINE_CAS_CASES';
    const reports=[];
    for (const [name,central,incoming,version,expectedCode,disposition,storedVersion,
      role='service_role',claimRole=role] of cases) {
      const observations=[];
      for (const baseline of [true,false]) {
        const reset = `truncate public.admin_documents;${central ? `insert into public.admin_documents(document_key,payload,version,updated_by) select '${KEY}',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='${central}';` : ''}`;
        const observed=JSON.parse(await psql(`${reset}
set statement_timeout='55s'; do $$ begin perform set_config('request.jwt.claim.role','${claimRole}',false); end $$; set role ${role};
select public.native_checkpoint_attempt(${baseline},${version},(select payload from native_checkpoint_payloads where name='${incoming}'));`));
        if (observed.sqlstate!==expectedCode) {
          throw new Error(`NATIVE_POSTGRES_CASE_${name.replace(/-/g,'_').toUpperCase()}_SQLSTATE_${observed.sqlstate??'OK'}`);
        }
        if (disposition) { assert.equal(observed.result.disposition,disposition); assert.equal(observed.result.centralVersion,storedVersion); }
        assert.equal(observed.stored?.version,storedVersion);
        if (expectedCode || disposition==='unchanged') {
          assert.equal(observed.stored.ownerIsNull,false,'refused/unchanged CAS must preserve stored owner');
          const { storedPayloadMatchesIncoming,...stored }=observed.stored;
          assert.deepEqual(stored,observed.previous,'refused/unchanged CAS must preserve exact native stored payload/reference/version/owner');
        } else assert.equal(observed.stored.ownerIsNull,true);
        observations.push(observed);
      }
      const withoutTiming = value => { const { elapsedMs,...semantic }=value;return semantic; };
      assert.deepEqual(withoutTiming(observations[1]),withoutTiming(observations[0]),`native old/new ${name} invariance`);
      reports.push({case:name,oldElapsedMs:observations[0].elapsedMs,newElapsedMs:observations[1].elapsedMs,sqlstate:expectedCode,disposition,storedVersion});
    }
    nativePhase = 'ACCOUNT213';
    const accountAssistant=await compareAccountAssistantSuccessor({psql,runSql,source:accountSource,oldSource,
      oldFixtures:fixtures,currentFixtures,cases,atHour,oldCas,newCas});
    nativePhase = 'CURRENT220';
    const {withNativeI71CheckpointFactory,compareNativeSamplingIdentitySuccessor}=
      await import('./native-identity-checkpoint-postgres.mjs');
    const currentGrid=await withNativeI71CheckpointFactory(async old=>{
      assert.equal(old.atHour(49),atHour(49));
      return compareCurrentGridSuccessor({psql,runSql,source:gridSource,accountSource,
        oldFixtures:fixtures,issuedFixtures:currentFixtures,sourceDocumentAt:old.sourceDocumentAt,
        atHour:old.atHour,saveCheckpoint:old.saveRavScoreContinuationCheckpoint,root});
    });
    let statisticsRevision;
    if (includeStatisticsRevision) {
      nativePhase = 'STATISTICS230';
      try {
        const adapterUrl=new URL('./statistics-preference-revision-native-postgres.mjs',import.meta.url);
        const adapterStat=await fs.lstat(adapterUrl);
        assert.ok(adapterStat.isFile()&&!adapterStat.isSymbolicLink(),'fixed normal revision adapter must be a regular file');
        assert.equal(hash(await fs.readFile(adapterUrl)),'bd763c72cf4a32b1093b7a19d324f688ae61897e9697c7cf31d33ce6b308d51a');
        const {runNativeStatisticsRevisionProposal}=await import(adapterUrl.href);
        statisticsRevision=await runNativeStatisticsRevisionProposal({
          repositoryRoot,clusterDirectory:root,psqlExecutable:programs.psql,
        });
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let nativeIdentity;
    if (includeNativeIdentity) {
      nativePhase = 'NATIVE_IDENTITY0600';
      try {
        const {withNative0600CheckpointFactory} = await import('./current-memory-warmup-postgres.mjs');
        nativeIdentity=await withNative0600CheckpointFactory(async original =>
          compareNativeSamplingIdentitySuccessor({psql,runSql,root,
            sourceDocumentAt:original.sourceDocumentAt,atHour:original.atHour,
            saveCheckpoint:original.saveRavScoreContinuationCheckpoint,oldSource}));
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let currentMemoryWarmup;
    if (includeCurrentMemoryWarmup) {
      nativePhase = 'CURRENT_MEMORY_WARMUP';
      try {
        const {withFrozenCurrentMemoryWarmupPostgresSource} = await import('../run-frozen-current-memory-warmup-source-targets.mjs');
        const frozenWarmup=await withFrozenCurrentMemoryWarmupPostgresSource(async ({adapter,repositoryRoot,factory})=>
          adapter.compareCurrentMemoryWarmupSuccessor({psql,runSql,root,repositoryRoot,
            sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,
            saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
        currentMemoryWarmup=frozenWarmup.result;
      } catch (error) { statisticsRevisionFailure={error}; throw error; }
    }
    let establishedNativeCurrentOrigin;
    if (includeEstablishedNativeCurrentOrigin) {
      nativePhase='ESTABLISHED_NATIVE_CURRENT_ORIGIN';
      const {withFrozenEstablishedNativeCurrentOriginPostgresSource}=await import('../run-frozen-established-native-current-origin-source-targets.mjs');
      establishedNativeCurrentOrigin=await withFrozenEstablishedNativeCurrentOriginPostgresSource(async({adapter,factory})=>
        adapter.compareEstablishedNativeCurrentOriginSuccessor({psql,runSql,root,
          sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,
          saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
    }
    let lastMileEnclosure;
    if (includeLastMileEnclosure) {
      nativePhase='LAST_MILE_ENCLOSURE';
      if(includeAccountStatisticsAssistant){
        const {withFrozen584CheckpointPostgresSource}=await import('../run-frozen584-checkpoint-postgres-source.mjs');
        lastMileEnclosure=await withFrozen584CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareLastMileEnclosureSuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareLastMileEnclosureSuccessor}=await import('./last-mile-enclosure-postgres.mjs');
        lastMileEnclosure=await compareLastMileEnclosureSuccessor({
          psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let accountStatisticsAssistant;
    if(includeAccountStatisticsAssistant){
      nativePhase='ACCOUNT_STATISTICS_ASSISTANT';
      if(includeNativeOriginalContinuity){
        const {withFrozen585CheckpointPostgresSource}=await import('../run-frozen585-native-continuity-postgres-source.mjs');
        accountStatisticsAssistant=await withFrozen585CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareAccountStatisticsAssistantSuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareAccountStatisticsAssistantSuccessor}=await import('./account-statistics-assistant-postgres.mjs');
        accountStatisticsAssistant=await compareAccountStatisticsAssistantSuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let nativeOriginalContinuity;
    if(includeNativeOriginalContinuity){
      nativePhase='NATIVE_ORIGINAL_CONTINUITY';
      if(includeAssistantLaterH0){
        const {withFrozen586CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
        nativeOriginalContinuity=await withFrozen586CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareNativeOriginalContinuitySuccessor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
      const {compareNativeOriginalContinuitySuccessor}=await import('./native-original-continuity-postgres.mjs');
      nativeOriginalContinuity=await compareNativeOriginalContinuitySuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let assistantLaterH0;
    if(includeAssistantLaterH0){
      nativePhase='ASSISTANT_LATER_H0';
      if(includeAssistantPublic587Successor){
        const {withFrozen587CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
        assistantLaterH0=await withFrozen587CheckpointPostgresSource(async({adapter,factory})=>
          adapter.compareAssistantLaterH0Successor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,
            atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}));
      }else{
        const {compareAssistantLaterH0Successor}=await import('./assistant-later-h0-postgres.mjs');
        assistantLaterH0=await compareAssistantLaterH0Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
      }
    }
    let assistantPublic587Successor;
    if(includeAssistantPublic587Successor){
      nativePhase='ASSISTANT_PUBLIC587_SUCCESSOR';
      const {compareAssistantPublic587Successor}=await import('./assistant-later-h0-postgres.mjs');
      assistantPublic587Successor=await compareAssistantPublic587Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint});
    }
    return {kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',accountAssistant,currentGrid,
      ...(includeStatisticsRevision?{statisticsRevision}:{}),
      ...(includeNativeIdentity?{nativeIdentity}:{}),
      ...(includeCurrentMemoryWarmup?{currentMemoryWarmup}:{}),
      ...(includeEstablishedNativeCurrentOrigin?{establishedNativeCurrentOrigin}:{}),
      ...(includeLastMileEnclosure?{lastMileEnclosure}:{}),
      ...(includeAccountStatisticsAssistant?{accountStatisticsAssistant}:{}),
      ...(includeNativeOriginalContinuity?{nativeOriginalContinuity}:{}),
      ...(includeAssistantLaterH0?{assistantLaterH0}:{}),
      ...(includeAssistantPublic587Successor?{assistantPublic587Successor}:{}),
      issuedSource:issued.sourceReceipt,postgresMajorVersion:programs.majorVersion,
      tcpEnabled:false,normalModelPartCount:673,sqlExecuted:true,migrationExecuted:true,
      migrationSQLSha256:hash(newSource),caseCount:reports.length,
      oldCasDefinitionSha256:hash(oldCas),newCasDefinitionSha256:hash(newCas),reports};
  } finally {
    try {
    if (started) {
      const current = await readOwner(); assert.deepEqual(current,owner,'native server ownership changed; preserve directory');
      const stop=await command(programs.pg_ctl,['-D',data,'-m','immediate','-w','-t','20','stop'],{env});
      assert.equal(stop.code,0,'native server stop was not proved; preserve directory');
      const status=await command(programs.pg_ctl,['-D',data,'status'],{env});
      assert.equal(status.code,3,'native server is not physically terminal; preserve directory');
      stopped=true;
      cleanupAllowed=true;
    }
    const resolved=path.resolve(root), temp=path.resolve(os.tmpdir());
    assert.ok(path.dirname(resolved)===temp && path.basename(resolved).startsWith('rr-checkpoint-pg-'));
    if (cleanupAllowed && (!started || stopped)) await fs.rm(resolved,{recursive:true,force:false});
    } catch (cleanupError) {
      // Keep the first revision failure; unknown/failed stop retains the same
      // owned directory. Never turn physical cleanup failure into success.
      if (statisticsRevisionFailure!==null) throw statisticsRevisionFailure.error;
      throw cleanupError;
    }
  }
}
