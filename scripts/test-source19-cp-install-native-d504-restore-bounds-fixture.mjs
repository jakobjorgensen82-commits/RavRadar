// Private native-fixture producer only. Never imported by a product caller.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import * as workflow from '../scripts/private-production-runtime-workflow.mjs';
import * as bundle from '../scripts/private-production-runtime-bundle.mjs';
import * as protectedRuntime from '../scripts/protected-private-production-runtime.mjs';
import * as readiness from '../scripts/integrated-cutover-readiness.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES } from '../scripts/lib/private-weather-component-inventory.mjs';
import { SOURCE_GATE_PRODUCERS } from '../scripts/lib/weather-source-gate.mjs';
import { PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY } from '../scripts/protected-ravscore-continuation-checkpoint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const lf = value => value.replace(/\r\n/g, '\n');

const fixtureIdentity=Object.freeze({
  "schemaVersion": 1,
  "kind": "PRIVATE_SOURCE19_CP_INSTALL_H70_FINAL_PR634_FRESH_FIXTURE_D504_SUCCESSOR_FIXED_DIAGNOSTICS_OBSERVATION_V2_RESTORE_BOUNDS_V3",
  "compositionId": "916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091",
  "sourceBase": "62300ce2caec6ca3c47aa44e5f983446916ad637",
  "pathCount": 27,
  "evidence": "LINUX_UNRUN_NO_ADMISSION",
  "unionH71": "OUTSIDE_H70_TARGET_SEPARATE_NATIVE_CALLER_REQUIRED",
  "syntheticProviderInput": "EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT",
  "syntheticAdminInput": "EXPLICIT_OWN_EMPTY_DOCUMENTS",
  "sourceParent": "dbb16b65e4626aa55c3ab06f7f61ac4b60fb4c60",
  "frozenFixturePath": "scripts/test-source19-cp-install-native-fixture.mjs",
  "frozenFixtureSha256": "c8555c9901b36be7d26fff415ffa3014e7104b6336a9f502379d2965b481179a",
  "successorCompositionId": "81ba8b9a448f5d475d019d5ce6c44dbd9fa3ee8bebeb9e4e4d816de2395f4dfa",
  "diagnosticBaseHead": "6969e3c161ff076640aa958247506f4eebfeb765",
  "diagnosticParentFixture": "scripts/test-source19-cp-install-native-d504-fixture.mjs",
  "diagnosticParentSha256": "83642a2aead446a85eddc98c791d53e2331963082aa6e7c567beb94a6893169a",
  "diagnosticCompositionId": "972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a",
  "diagnosticCompositionVersion": 2,
  "diagnosticV1CompositionId": "aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420",
  "diagnosticObservationTest": "scripts/test-protected-private-production-runtime.mjs",
  "diagnosticObservationParentSha256": "ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0",
  "restoreBoundsCompositionId": "916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091",
  "restoreBoundsParentCompositionId": "972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a",
  "restoreBoundsParentFixture": "scripts/test-source19-cp-install-native-d504-diagnostics-fixture.mjs",
  "restoreBoundsParentSha256": "9eef534316376da4fb850ff07347284b50f06a2f1db372657d36aa482ae556de",
  "restoreBoundsVersion": 3
});
const fixtureProductPins=Object.freeze({
  ".github/actions/save-owned-dmi-grib/index.cjs": "dd8bd752a5cef8c927db2c00e642ab240638e3ab10c56d9f57c9546ab4e02926",
  ".github/actions/save-owned-dmi-grib/package-lock.json": "920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47",
  ".github/actions/save-owned-dmi-grib/package.json": "27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99",
  "scripts/check-dmi-bulk-operational-ready.py": "0b8387364f936bf686f22806d3cf2fb88d61972cde7dcf73de265fceb95d68c4",
  "scripts/lib/copernicus_component_process.py": "aa832d73a46efd23c8466fb685fe034ad25acac44e26fcacf7fb26dca7e22e07",
  "scripts/lib/dmi-forecast-file.mjs": "467c1f8ffd6a9a8440deda6d201c0d9f9389e61dfb8441276748256c389af11f",
  "scripts/lib/private-weather-component-pack.mjs": "50ad83b417688848870e5ea772cb40a78ba51ae9b84c04556db3cf5b8b7d1b24",
  "scripts/lib/source-union-birth-journal.mjs": "896d5b52129580f3239c7be328a5a23404959567f380b221b15380e0acfcb423",
  "scripts/lib/source_union_birth_journal.py": "fe415bd438a7c89b63bb32f763121a703cb9680429e5684480cc873a3036ab44",
  "scripts/lib/verified-dmi-progress-inputs.mjs": "0ea08f33003a5a19dbea0cd7c208f441368fe437fa5c9c00d87451248beeb0e6",
  "scripts/lib/verified-protected-progress-components.mjs": "e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17",
  "scripts/materialize-dmi-bulk-storage.py": "445eec99139717b5021b38a8d6d26de9520b8c74e173d45dc8d00605dcef1e82",
  "scripts/merge-verified-current-donor-banks.py": "f5f5dfd6ddb0c5d41ecb33652c5047b8825906a61de8c1f836ae564e31ae4671",
  "scripts/migrate-post-cutover-private-runtime.mjs": "1f9daed66722801bcd6b4e710fd0c2a70fc82e73da03443ab8012afbb5effb53",
  "scripts/prepare-historical-wave-predecessor-restore.mjs": "ada6fd0dcdd0ceff359e17e21b157b1dfec736def4c29ac95cb0f1c7484b8382",
  "scripts/private-production-runtime-workflow.mjs": "629c0b7fe8ad3a4a8970b17ede87ef013e296605c736ab50c48b1d405c3c6df4",
  "scripts/protected-private-production-runtime.mjs": "9f6793a851b9a2181fe7353922474e754b059a02f32d82b9ca16424358784931",
  "scripts/run-copernicus-weather-components.py": "ad775661c9b41a801bb73d792649e72436b43efa7cfae86e8af141989547460c",
  "scripts/run-dmi-bulk-supervised.py": "3572b4e8dde5a12c290999ef2b64d2c0d059a8e72a410e65270f96b318f8e877",
  "scripts/source-progress-union-consumer.mjs": "4cc33cc26be4988e5d580e5c6e1a9ba33721ef616a8f78b7af69fe02292942e3",
  "scripts/test-dmi-supervisor-parent-loss.py": "da53d801c19801ed7539d5561d2eb9b161b44452bc61bb35cc13fc3799e1f9a1",
  "scripts/test-owned-dmi-grib-save-native.py": "675b7fbf07c125403c959d9a887669401640fc2254779b0461a6f2fef4ce129d",
  "scripts/test-protected-private-production-runtime.mjs": "aa8a7d07881f7ccf743d56a0c8e60c0ab5c88d0174ef327a28d1d861ff03380a",
  "scripts/test-weather-component-progress-workflow.mjs": "d0793d047155d80a1b9fd2edfb0d2a28e37923c10e3adc647f6958ef2ef80204",
  "scripts/verified-weather-source-handoff.mjs": "2c62ffa0d1733e1fbc6447ba54948e3f73ca3b6c7d21683d5682cb8de733a7a3",
  "scripts/weather-component-progress-cache.mjs": "e6faf23edfba043177e4de2ae7ca69677b600f11dbefb4543265e131b72a549d",
  "scripts/weather-source-gate.mjs": "3dbc78e87636f121c60c25904d97c42b79fb374adedf06ca9cb95dfbee33a3d6"
});
async function assertFixtureSourceIdentity() {
  const restoreBoundsParent = path.join(ROOT, fixtureIdentity.restoreBoundsParentFixture);
  const restoreBoundsParentStat = await fs.lstat(restoreBoundsParent);
  assert.ok(restoreBoundsParentStat.isFile() && !restoreBoundsParentStat.isSymbolicLink() && restoreBoundsParentStat.nlink === 1, 'RESTORE_BOUNDS_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(restoreBoundsParent, 'utf8'))), fixtureIdentity.restoreBoundsParentSha256, 'FROZEN_V2_FIXTURE_BYTES_CHANGED');
  const diagnosticParent = path.join(ROOT, fixtureIdentity.diagnosticParentFixture);
  const diagnosticParentStat = await fs.lstat(diagnosticParent);
  assert.ok(diagnosticParentStat.isFile() && !diagnosticParentStat.isSymbolicLink() && diagnosticParentStat.nlink === 1, 'DIAGNOSTIC_PARENT_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(diagnosticParent, 'utf8'))), fixtureIdentity.diagnosticParentSha256, 'FROZEN_D504_FIXTURE_BYTES_CHANGED');
  const frozenFixture = path.join(ROOT, fixtureIdentity.frozenFixturePath);
  const frozenStat = await fs.lstat(frozenFixture);
  assert.ok(frozenStat.isFile() && !frozenStat.isSymbolicLink() && frozenStat.nlink === 1, 'FROZEN_FIXTURE_REGULAR_SOURCE_REQUIRED');
  assert.equal(digest(lf(await fs.readFile(frozenFixture, 'utf8'))), fixtureIdentity.frozenFixtureSha256, 'FROZEN_FIXTURE_BYTES_CHANGED');
  for(const [relative,expected] of Object.entries(fixtureProductPins)) {
    const file=path.join(ROOT,relative),stat=await fs.lstat(file);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'FIXTURE_PRODUCT_FILE_INVALID');
    assert.equal(digest(lf(await fs.readFile(file,'utf8'))),expected,'FIXTURE_COMPOSED_SOURCE_CHANGED:'+relative);
  }
  return fixtureIdentity;
}
const factoryPins = Object.freeze({
  factory: '458cca26ba913f507307f2316e194fb1e0ac0826e27c82c7bcc4a119007dd065',
  setup: '2b57d6cfdcf3e7f1b5646739a7abeb8967a57cabdab44f9272e68c03776b061f',
  central: '685e83586553d9fb9c78b2e60d8e7ec6dc188c0e4d23e30cf619b9f6e4fec08d',
  rpc: 'e2629990fd209c1cca3e4d9b792965474010aa906166e6dd08774c201a0a9cfa',
});
const syntheticAdminDocuments = Object.freeze({
  'direction-reviews': { schemaVersion: 1, zones: {} },
  rules: { schemaVersion: 1, rules: [] },
  'coastline-overrides': { overrides: {}, partOwnership: {}, disabledParts: {} },
});
async function write(root, relative, value) {
  const file = path.join(root, relative);
  assert.ok(file.startsWith(root + path.sep));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
}

async function inventory() {
  await assertFixtureSourceIdentity();
  // Actual import closure plus explicitly named normal prelude/fixture assets,
  // not a checkout/revision copy and not an arbitrary external file selector.
  const names = new Set(['package.json', 'config.js',
    '.github/actions/save-owned-dmi-grib/index.cjs',
    '.github/actions/save-owned-dmi-grib/package.json',
    '.github/actions/save-owned-dmi-grib/package-lock.json',
    'scripts/run-owned-dmi-grib-save.py',
    'scripts/test-source19-cp-install-native-d504-restore-bounds-fixture.mjs',
    'scripts/test-source19-cp-install-native-d504-diagnostics-fixture.mjs',
    'scripts/test-source19-cp-install-native-d504-fixture.mjs',
    'scripts/test-source19-cp-install-native-fixture.mjs',
    'scripts/test-protected-private-production-runtime.mjs',
    'scripts/test-integrated-cutover-readiness.mjs',
    'scripts/test-owned-dmi-grib-save-native.py',
    'scripts/test-copernicus-component-production.py',
    'scripts/test-copernicus-weather-components.py',
    'scripts/run-copernicus-weather-components.py',
    'scripts/lib/copernicus_component_process.py',
    'scripts/lib/copernicus-component-spatial-policy.json',
    'scripts/lib/dmi-marine-zone-exclusions.json',
    'scripts/refine-coastlines-constrained-4.0.48.py',
    'scripts/sync-admin-config.py', 'scripts/apply-central-zone-reviews.py',
    'scripts/build-public-coastal-parts-v2.mjs',
    'scripts/integrated-cutover-readiness.mjs',
    'scripts/protected-private-production-runtime.mjs',
    'scripts/private-production-runtime-workflow.mjs',
    'scripts/protected-ravscore-continuation-checkpoint.mjs',
    'data/zones.geojson', 'data/water-level-station-routing.json',
    'data/geometry-snapshots/zones-4.0.44.geojson',
    'data/geometry-snapshots/zones-4.0.47-generated.geojson',
    'knowledge/rav-assistant-public-v1.json',
  ]);
  for (const file of Object.keys(fixtureProductPins)) names.add(file); // Exact 27-file final composition closure, never a directory wildcard.
  for (const file of Object.values(workflow.PRIVATE_RUNTIME_CONTRACT_FILES).flat()) names.add(file);
  for (const file of readiness.REQUIRED_CUTOVER_MIGRATIONS) names.add('supabase/migrations/' + file.filename);
  for (const directory of ['data/admin', 'data/geometry-v2/active-national-coastal-parts']) {
    for (const entry of await fs.readdir(path.join(ROOT, directory), { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:mjs|js|py|json|geojson)$/.test(entry.name)) names.add(directory + '/' + entry.name);
    }
  }
  const visited = new Set();
  while (visited.size < names.size) for (const file of [...names]) {
    if (visited.has(file)) continue;
    visited.add(file);
    if (!/\.(?:mjs|js|cjs|py)$/.test(file)) continue;
    if (file.startsWith('scripts/test-') && !file.endsWith('.py')
      && file !== 'scripts/test-source19-cp-install-native-d504-restore-bounds-fixture.mjs') continue;
    const source = await fs.readFile(path.join(ROOT, file), 'utf8');
    if (file.endsWith('.py')) {
      const modules = new Set();
      for (const match of source.matchAll(/^\s*from\s+(\.[\w.]+|lib\.[\w.]+)\s+import\s/gm)) modules.add(match[1]);
      for (const match of source.matchAll(/^\s*from\s+(\.|lib)\s+import\s+([^\n]+)/gm)) {
        for (const name of match[2].replace(/[()]/g, '').split(',')) {
          const module = name.trim().split(/\s+as\s+/)[0];
          assert.match(module, /^[A-Za-z_]\w*$/, 'FIXTURE_LOCAL_IMPORT_FORM_UNSUPPORTED');
          modules.add(match[1] === '.' ? '.' + module : 'lib.' + module);
        }
      }
      for (const match of source.matchAll(/^\s*import\s+(lib\.[\w.]+)/gm)) modules.add(match[1]);
      for (const module of modules) {
        assert.ok(!module.startsWith('..'), 'FIXTURE_LOCAL_IMPORT_ESCAPES');
        const relative = module.startsWith('.')
          ? path.posix.join(path.posix.dirname(file), module.slice(1).replaceAll('.', '/') + '.py')
          : 'scripts/' + module.replaceAll('.', '/') + '.py';
        names.add(relative);
      }
      assert.ok(names.size <= 900, 'FIXTURE_SOURCE_INVENTORY_BOUND');
      continue;
    }
    for (const match of source.matchAll(/(?:from\s*|(?:import|require(?:\.resolve)?)\s*\(\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1].split('?')[0];
      if (!specifier.startsWith('.')) continue;
      const relative = path.relative(ROOT, path.resolve(ROOT, path.dirname(file), specifier)).split(path.sep).join('/');
      assert.ok(!relative.startsWith('../') && !path.isAbsolute(relative));
      names.add(relative);
    }
    assert.ok(names.size <= 900, 'FIXTURE_SOURCE_INVENTORY_BOUND');
  }
  const files = [];
  for (const relativePath of [...names].sort()) {
    const stat = await fs.lstat(path.join(ROOT, relativePath));
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
    const bytes = await fs.readFile(path.join(ROOT, relativePath));
    assert.ok(bytes.length < 32 * 1024 * 1024);
    files.push({ relativePath, bytes: bytes.length, sha256: digest(bytes) });
  }
  return { files, fixtureIdentity, head: execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim() };
}

async function prepare(output, target, python) {
  await assertFixtureSourceIdentity();
  assert.equal(new Date(target).toISOString(), target);
  assert.equal(Date.parse(target) % 3_600_000, 0);
  output = await fs.realpath(output);
  const sourceTestUrl = new URL('../scripts/test-protected-private-production-runtime.mjs', import.meta.url).href;
  const test = lf(await fs.readFile(fileURLToPath(sourceTestUrl), 'utf8'));
  const first = test.indexOf('const clone = value =>');
  const end = test.indexOf('\ntry {\n  await fs.mkdir(repository', first);
  const setupEnd = test.indexOf('\n  const baselineContracts =', end);
  const centralStart = test.indexOf('async function sourceNormalCurrentFixture() {');
  const centralEnd = test.indexOf('\nawait test(', centralStart);
  const factories = test.slice(first, end), setup = test.slice(end + '\ntry {'.length, setupEnd);
  const central = test.slice(centralStart, centralEnd);
  for (const [name, text] of Object.entries({ factory: factories, setup, central })) {
    assert.equal(digest(text), factoryPins[name], 'NORMAL_FIXTURE_SOURCE_CHANGED:' + name);
  }
  const args = { fs, os, path, crypto, process, Buffer, assert,
    PRIVATE_RUNTIME_FILES: workflow.PRIVATE_RUNTIME_FILES,
    PRIVATE_RUNTIME_CONTRACT_FILES: workflow.PRIVATE_RUNTIME_CONTRACT_FILES,
    ravScoreModelBinding, buildPrivateRuntimeCreateSpec: workflow.buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation: workflow.buildPrivateRuntimeExpectation,
    createPrivateProductionRuntimeBundle: bundle.createPrivateProductionRuntimeBundle };
  // ONLY the already-existing test data/store factories are extracted. Product
  // issuers/driver/ownership bodies are never extracted or rewritten.
  const fixture = await Function(...Object.keys(args), 'return (async()=>{\n' + factories + setup
    + '\nreturn { temp, repository, privateRoot, createGeneration, fakeDocuments, fakeStorage };})()')(...Object.values(args));
  try {
    const centralCode = central.replaceAll('import.meta.url', 'sourceTestUrl')
      .replace(/import\((['"])([^'"]+)\1\)/g, (_, quote, spec) => 'import(' + JSON.stringify(new URL(spec, sourceTestUrl).href) + ')');
    const centralRows = await Function('fs', 'crypto', 'assert', 'sourceTestUrl',
      centralCode + '\nreturn sourceNormalCurrentFixture();')(fs, crypto, assert, sourceTestUrl);
    const r = lf(await fs.readFile(path.join(ROOT, 'scripts/test-integrated-cutover-readiness.mjs'), 'utf8'));
    const rpcStart = r.indexOf('const databaseReadback = {'), rpcEnd = r.indexOf('\nlet rpcRequestBody = null;', rpcStart);
    const rpcCode = r.slice(rpcStart, rpcEnd);
    assert.equal(digest(rpcCode), factoryPins.rpc);
    const rpcArgs = { REQUIRED_CUTOVER_MIGRATIONS: readiness.REQUIRED_CUTOVER_MIGRATIONS,
      LATEST_RAVSCORE_BINDING_MIGRATION: readiness.LATEST_RAVSCORE_BINDING_MIGRATION,
      expectedPolicy: await readiness.expectedTripBindingPolicy(),
      expectedActiveAdmissionPolicy: await readiness.expectedTripActiveAdmissionPolicy(),
      expectedCheckpointContract: await readiness.expectedCheckpointCasContract() };
    const rpc = Function(...Object.keys(rpcArgs), rpcCode + '\nreturn { databaseReadback, checkpointDatabaseReadback };')(...Object.values(rpcArgs));
    const cp = path.join(output, 'cp-fixture');
    execFileSync(python, ['-B', 'scripts/test-copernicus-component-production.py', '--prepare-fixture', cp],
      { cwd: ROOT, env: { ...Object.fromEntries(Object.entries(process.env).filter(([name]) =>
        ['PATH', 'LD_LIBRARY_PATH', 'LIBRARY_PATH', 'LANG', 'LC_ALL', 'LC_CTYPE'].includes(name))),
        PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' }, timeout: 60_000, stdio: 'pipe' });
    const bankBytes = await fs.readFile(path.join(cp, 'bank.json'));
    const bank = JSON.parse(bankBytes);
    assert.ok(bank.records.length > 0);
    const ledger = '{"synthetic":"SOURCE-install-only-selected-components"}\n';
    await write(fixture.repository, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank, bankBytes);
    await fs.cp(path.join(cp, 'cache'), path.join(fixture.repository, '.cache/copernicus-components'), { recursive: true });
    await write(fixture.repository, PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents, ledger);
    const previous = new Date(Date.parse(target) - 3_600_000).toISOString();
    const generation = await fixture.createGeneration(0, { metadataOverride: {
      generatedAt: previous, productionReferenceAt: previous,
      weatherComponentInputs: { schemaVersion: 1, kind: 'PRIVATE_WEATHER_COMPONENT_INPUTS', sourceSelectionApplied: true,
        openMeteoBankSha256: null, copernicusBankSha256: bank.bankSha256, selectedComponentsSha256: digest(ledger) },
    } });
    const expected = await workflow.buildPrivateRuntimeExpectation({ repositoryRoot: fixture.repository, targetReferenceAt: target, now: target });
    const documents = fixture.fakeDocuments(), storage = fixture.fakeStorage();
    const head = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
    await protectedRuntime.publishProtectedPrivateProductionRuntime({ privateRoot: fixture.privateRoot,
      bundlePath: generation.bundlePath, repositoryRoot: fixture.repository, expected,
      now: target, sourceHead: head, request: documents.request, storage: storage.client });
    const originals = [];
    for (const descriptor of workflow.PRIVATE_RUNTIME_FILES) {
      const bytes = await fs.readFile(path.join(fixture.repository, descriptor.relativePath));
      await write(output, 'originals/' + descriptor.relativePath, bytes);
      originals.push({ relativePath: descriptor.relativePath, bytes: bytes.length, sha256: digest(bytes) });
    }
    // The exact normal unpack confirms the CP source inventory, before any
    // actual SOURCE-action process is launched. This is not H ownership proof.
    const unpackRoot = path.join(output, 'unpacked-original');
    const packed = await import('../scripts/lib/private-weather-component-pack.mjs');
    const componentFiles = await packed.unpackPrivateWeatherComponentPack({ restoredRoot: fixture.repository,
      outputRoot: unpackRoot, conditions: generation.conditions, pythonExecutable: python });
    for (const file of componentFiles) {
      await write(output, 'originals/' + file.relativePath, await fs.readFile(file.sourcePath));
      originals.push({ relativePath: file.relativePath, bytes: file.bytes, sha256: file.sha256 });
    }
    const objectRows = [];
    for (const [key, bytes] of storage.objects) {
      const relative = 'objects/' + digest(key);
      await write(output, relative, bytes);
      objectRows.push({ key, relativePath: relative, bytes: bytes.length, sha256: digest(bytes) });
    }
    const admin = structuredClone(centralRows.centralRows);
    const adminMap = { 'water-level-station-routing': 'data/water-level-station-routing.json',
      'coastal-parts-v2-activation': 'data/geometry-v2/active-national-coastal-parts/manifest.json' };
    for (const [document_key, file] of Object.entries(adminMap)) admin.push({ document_key, version: 1,
      updated_at: target, payload: JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8')) });
    for (const [document_key, payload] of Object.entries(syntheticAdminDocuments)) admin.push({
      document_key, version: 1, updated_at: target, payload: structuredClone(payload) });
    admin.push({ document_key: 'dmi-water-stations', version: 1, updated_at: target,
      payload: { schemaVersion: 1, generatedAt: target, stations: [] } });
    for (const row of admin) row.updated_at ??= target;
    const policy = protectedRuntime.PROTECTED_PRIVATE_RUNTIME_POLICY;
    await write(output, 'protocol.json', { kind: 'SOURCE19_CP_INSTALL_NATIVE_SYNTHETIC_PROTOCOL', schemaVersion: 1,
      fixtureIdentity,
      head, target, admin, pointer: documents.row(), rpc, objectRows, originals,
      sourceJobName: SOURCE_GATE_PRODUCERS['.github/workflows/update-and-deploy.yml'].gates[0].job,
      checkpointDocumentKey: PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY,
      bucket: { id: policy.bucketId, name: policy.bucketId, public: false,
        file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType] } });
    console.log(JSON.stringify({ fixturePrepared: true, realCpOriginals: componentFiles.filter(x => x.relativePath.endsWith('.nc')).length,
      fabricatedIssuer: false, sourceAdmission: false, realNetwork: 0 }));
  } finally {
    const owned = await fs.realpath(fixture.temp);
    assert.equal(path.dirname(owned), await fs.realpath(os.tmpdir()));
    assert.match(path.basename(owned), /^ravradar-protected-private-runtime-/);
    await fs.rm(owned, { recursive: true, force: false }); // Existing fixture-owned temporary root only.
  }
}

if (process.argv[2] === '--inventory' && process.argv.length === 3) console.log(JSON.stringify(await inventory()));
else if (process.argv[2] === '--prepare' && process.argv.length === 6) await prepare(process.argv[3], process.argv[4], process.argv[5]);
else throw new Error('FIXTURE_ARGUMENTS_INVALID');
