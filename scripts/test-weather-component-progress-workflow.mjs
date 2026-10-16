import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES } from './private-production-runtime-workflow.mjs';

for (const file of ['scripts/lib/verified-protected-progress-components.mjs',
  'scripts/lib/verified-dmi-progress-inputs.mjs', 'scripts/lib/private-weather-progress-files.mjs',
  'scripts/lib/dmi_adaptive_recovery.py',
  'scripts/lib/copernicus-offline-environment.mjs',
  'scripts/lib/verified-open-meteo-generation-union.mjs', 'scripts/lib/open-meteo-usable-part-bank.mjs']) {
  assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes(file),
    'The operational recovery helpers must remain in the producer inventory');
}

const workflow = (await fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'))
  .replace(/\r\n/g, '\n');
const step = name => {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = workflow.indexOf('\n      - ', start + 1);
  return workflow.slice(start, end < 0 ? workflow.length : end);
};
const install = workflow.indexOf('id: private-runtime-install');
const capture = workflow.indexOf('id: component-progress-restore');
const weather = workflow.indexOf('id: weather\n');
const seal = workflow.indexOf('id: component-progress-seal');
const gates = workflow.indexOf('- name: Validate critical production artifact after fresh weather and current provenance');
const union = await fs.readFile('scripts/lib/verified-protected-progress-components.mjs', 'utf8');
assert.match(union, /import.*mergeVerifiedOpenMeteoGenerations.*verified-open-meteo-generation-union/);
assert.doesNotMatch(union, /backfillVerifiedOpenMeteoPartBank/,
  'Recovery must not replay unselected hours from overlapping response originals');
assert.ok(install < capture && capture < weather && weather < seal && seal < gates);
const restore = step('Restore encrypted private weather progress only');
const bind = step('Bind optional progress to the exact protected baseline');
for (const value of [restore, bind]) {
  assert.match(value, /github.ref == 'refs\/heads\/main'/);
  assert.match(value, /github.event_name != 'pull_request_target'/);
  assert.match(value, /steps.private-runtime-install.outcome == 'success'/);
  assert.match(value, /steps.weather-source-handoff.outputs.reused != 'true'/);
  assert.doesNotMatch(value, /steps.exact-weather-recovery.outputs.required != 'true'/,
    'Exact protected 11Z recovery must be allowed to restore its own authenticated progress');
}
assert.match(restore, /path: \.cache\/weather-private-progress.encrypted\s+key: weather-private-progress-encrypted-v2-/);
assert.doesNotMatch(restore, /path:.*(?:\*|bank|components\/)/);
assert.ok(restore.includes("          key: weather-private-progress-encrypted-v2-${{ runner.os }}-main-${{ inputs.quick_progress_source || format('{0}-{1}', github.run_id, github.run_attempt) }}"),
  'Full and short explicit continuation retrieve the requested exact run/attempt');
assert.ok(restore.includes("          restore-keys: ${{ !inputs.quick_confirmation && inputs.quick_progress_source == '' && format('weather-private-progress-encrypted-v2-{0}-main-', runner.os) || '' }}"),
  'Only a full ordinary run without an explicit source may use prefix recovery');
const validateSource = step('Validate requested short-confirmation progress source');
assert.match(validateSource, /QUICK_PROGRESS_SOURCE.*inputs\.quick_progress_source/);
assert.match(validateSource, /QUICK_CONFIRMATION.*inputs\.quick_confirmation/);
assert.ok(validateSource.includes("        if: inputs.quick_confirmation == true || inputs.quick_progress_source != ''\n"));
assert.match(validateSource, /"\$QUICK_PROGRESS_SOURCE" = protected-current \|\|/);
assert.match(restore, /!\(inputs\.quick_confirmation && inputs\.quick_progress_source == 'protected-current'\)/);
assert.match(validateSource, /\^\[0-9\]\+-\[1-9\]\[0-9\]\*\$/);
assert.ok(workflow.indexOf(validateSource) < workflow.indexOf(restore));
assert.doesNotMatch(bind, /continue-on-error|\|\| true/);
assert.match(bind, /capture-base[\s\S]*restore \\/);
assert.match(bind, /privateRuntimeBundleContentSha256\(manifest\)/);
assert.match(bind, /process\.env\.RAVRADAR_PRIVATE_RUNTIME_BUNDLE/);
assert.match(bind, /--protected-bundle-sha256 "\$protected_bundle_sha256"/);
assert.match(bind, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
assert.doesNotMatch(bind, /EXACT_WEATHER_RECOVERY_REQUIRED/,
  'The exact 11Z recovery may only be excluded by the snapshot binder, not by a workflow shortcut');
assert.match(bind, /report\.status === 'RESTORED' && report\.restored === true/);
assert.match(bind, /assertUsableDmiProgressRecovery\(report\.dmiProgress, \{ allowAbsent: true \}\)/,
  'Normal full runs must also reject a restored snapshot whose DMI forecast was rejected');
assert.ok(bind.indexOf('weather-component-progress-cache.mjs restore')
  < bind.indexOf('assertUsableDmiProgressRecovery(report.dmiProgress'));
const donor = step('Classify one-time DMI PART continuity donor');
assert.match(donor, /import \{ inspectDmiForecastFile \} from '\.\/scripts\/lib\/dmi-forecast-file\.mjs'/);
assert.match(donor, /await inspectDmiForecastFile\('data\/live\/dmi-forecast-cache\.json'\)/);
assert.match(donor, /if \(store\.hasPartContinuity\)/);
assert.doesNotMatch(donor, /readFile(?:Sync)?\('data\/live\/dmi-forecast-cache\.json'/,
  'The continuity donor classifier must validate the large forecast incrementally');
const confirmation = step('Require recovered progress before short confirmation');
assert.ok(confirmation.includes("        if: inputs.quick_confirmation == true || inputs.quick_progress_source != ''\n"),
  'Every explicit full-run source must pass the same exact key and authenticated recovery gate');
assert.match(bind, /QUICK_PROTECTED_BASELINE:.*inputs\.quick_confirmation && inputs\.quick_progress_source == 'protected-current'/);
assert.match(bind, /test "\$captured" = "true" && test "\$QUICK_PROTECTED_BASELINE" != "true"/);
const encryptedReportAssignment = 'report="${RAVRADAR_NATIVE_IDENTITY_OLD_GCM_REPORT:-$RUNNER_TEMP/weather-progress-restore-report.json}"';
assert.ok(confirmation.includes(encryptedReportAssignment),
  'Identity recovery must use the authenticated OLD report, while ordinary recovery retains its normal report');
assert.ok(confirmation.indexOf('if test "$QUICK_PROGRESS_SOURCE" = protected-current; then')
  < confirmation.indexOf(encryptedReportAssignment));
assert.match(confirmation, /test "\$\{\{ steps\.private-runtime-install\.outcome \}\}" = success/);
assert.match(confirmation, /test "\$\{\{ steps\.private-runtime-state\.outputs\.available \}\}" = true/);
assert.match(confirmation, /test "\$\{\{ steps\.component-progress-restore\.outputs\.captured \}\}" = true/);
for (const transition of ['exact-weather-recovery.outputs.required',
  'historical-wave-predecessor.outputs.required', 'weather-source-handoff.outputs.reused']) {
  assert.ok(confirmation.includes(`test "${'${{ steps.'}${transition} }}" != true`));
}
assert.match(confirmation, /--input "\$source_path" --output "\$RUNNER_TEMP\/protected-quick-dmi-input\.json"/);
assert.match(confirmation, /if ! test -e \.cache\/dmi-candidate-progress\.json; then/);
assert.match(confirmation, /packHash\.digest\('hex'\) !== entries\[0\]\.sha256/);
assert.doesNotMatch(confirmation, /zones":\{\}|strict_active_ready=true|ENCRYPTED_PROGRESS_RESTORED/);
assert.ok(workflow.indexOf(confirmation) < workflow.indexOf(step('Refresh DMI water-source registry')));
assert.match(confirmation, /test "\$PROGRESS_CACHE_MATCHED_KEY" = "\$expected"/);
assert.match(confirmation, /\.status == "RESTORED" and \.restored == true and \.fileCount > 0/);
assert.match(confirmation,
  /import \{ assertUsableDmiProgressRecovery \} from '\.\/scripts\/lib\/verified-dmi-progress-inputs\.mjs'/);
assert.match(confirmation, /assertUsableDmiProgressRecovery\(report\.dmiProgress, \{ allowAbsent: true \}\)/,
  'A short confirmation permits an omitted legacy forecast or valid no-change, but rejects failed forecast admission');
const encryptedConfirmation = confirmation.slice(confirmation.indexOf(encryptedReportAssignment));
assert.ok(encryptedConfirmation.indexOf('assertUsableDmiProgressRecovery(report.dmiProgress')
  < encryptedConfirmation.indexOf('test -s .cache/dmi-candidate-progress.json'));
assert.doesNotMatch(confirmation, /continue-on-error|\|\| true/,
  'A known forecast restore rejection must not be swallowed');
const assertionBlock = confirmation.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
assert.ok(assertionBlock, 'The actual quick-confirmation assertion must remain executable');
const assertionScript = assertionBlock[1].replace(/^ {10}/gm, '');
const protectedBlock = confirmation.match(/node --input-type=module <<'NODE_PROTECTED'\n([\s\S]*?)\n          NODE_PROTECTED/);
assert.ok(protectedBlock, 'The protected-current assertion must be the actual workflow code');
const protectedScript = protectedBlock[1].replace(/^ {10}/gm, '');
const protectedDmiBlock = confirmation.match(/python - <<'PYTHON_PROTECTED'\n([\s\S]*?)\n          PYTHON_PROTECTED/);
assert.ok(protectedDmiBlock);
const protectedDmiScript = protectedDmiBlock[1].replace(/^ {10}/gm, '');
const normalAssertionBlock = bind.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
assert.ok(normalAssertionBlock, 'The actual normal restore assertion must remain executable');
const normalAssertionScript = normalAssertionBlock[1].replace(/^ {10}/gm, '');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-quick-confirmation-contract-'));
try {
  const fixtureRoot = path.join(temporary, 'protected-root');
  const fixtureBundle = path.join(temporary, 'protected-bundle');
  await fs.mkdir(path.join(fixtureRoot, 'data/live'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, '.cache'), { recursive: true });
  await fs.mkdir(fixtureBundle);
  const conditionsBytes = Buffer.from('{"synthetic":true}\n');
  const dmiBytes = Buffer.from('{"zones":{"synthetic":{"hourly":[{"time":"2026-10-11T10:00:00Z"}]}}}\n');
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const fixtureManifest = { datasetId: 'synthetic', productionReferenceAt: '2026-10-11T10:00:00Z',
    generatedAt: '2026-10-11T10:01:00Z', modelBinding: { synthetic: true },
    contractHashes: { synthetic: true }, files: [
      { relativePath: 'data/live/conditions.json', bytes: conditionsBytes.length, sha256: hash(conditionsBytes) },
      { relativePath: 'data/live/dmi-bulk-cache.json', bytes: dmiBytes.length, sha256: hash(dmiBytes) },
    ], bundleContentSha256: null };
  fixtureManifest.bundleContentSha256 = privateRuntimeBundleContentSha256(fixtureManifest);
  const descriptor = { ...fixtureManifest, sourceHead: '1'.repeat(40) };
  const base = { baselineSha256: hash(conditionsBytes), protectedBundleContentSha256: fixtureManifest.bundleContentSha256 };
  const fixtures = async () => {
    await fs.writeFile(path.join(fixtureRoot, 'data/live/conditions.json'), conditionsBytes);
    await fs.writeFile(path.join(fixtureRoot, 'data/live/dmi-bulk-cache.json'), dmiBytes);
    await fs.writeFile(path.join(fixtureBundle, 'manifest.json'), JSON.stringify(fixtureManifest));
    await fs.writeFile(path.join(temporary, 'weather-progress-base.json'), JSON.stringify(base));
    for (const name of ['private-runtime-current-source.json', 'private-runtime-restored-source.json']) {
      await fs.writeFile(path.join(temporary, name), JSON.stringify(descriptor));
    }
    await fs.writeFile(path.join(fixtureRoot, '.cache/private-production-runtime-expected.json'),
      JSON.stringify({ modelBinding: fixtureManifest.modelBinding, contractHashes: fixtureManifest.contractHashes }));
  };
  const protectedEnv = { ...process.env, RUNNER_TEMP: temporary, GITHUB_WORKSPACE: fixtureRoot,
    RAVRADAR_PRIVATE_RUNTIME_BUNDLE: fixtureBundle };
  for (const name of ['exact', 'changed-conditions', 'changed-dmi', 'previous-generation',
    'base-mismatch', 'model-mismatch', 'duplicate-descriptor', 'missing-input']) {
    await fixtures();
    if (name === 'changed-conditions') await fs.appendFile(path.join(fixtureRoot, 'data/live/conditions.json'), ' ');
    if (name === 'changed-dmi') await fs.appendFile(path.join(fixtureRoot, 'data/live/dmi-bulk-cache.json'), ' ');
    if (name === 'previous-generation') await fs.writeFile(path.join(temporary, 'private-runtime-restored-source.json'),
      JSON.stringify({ ...descriptor, datasetId: 'previous' }));
    if (name === 'base-mismatch') await fs.writeFile(path.join(temporary, 'weather-progress-base.json'),
      JSON.stringify({ ...base, protectedBundleContentSha256: '0'.repeat(64) }));
    if (name === 'model-mismatch') await fs.writeFile(path.join(fixtureRoot, '.cache/private-production-runtime-expected.json'),
      JSON.stringify({ modelBinding: { different: true }, contractHashes: fixtureManifest.contractHashes }));
    if (name === 'duplicate-descriptor') {
      const duplicate = { ...fixtureManifest, files: [...fixtureManifest.files, fixtureManifest.files[1]] };
      duplicate.bundleContentSha256 = privateRuntimeBundleContentSha256(duplicate);
      await fs.writeFile(path.join(fixtureBundle, 'manifest.json'), JSON.stringify(duplicate));
    }
    if (name === 'missing-input') await fs.unlink(path.join(fixtureRoot, 'data/live/dmi-bulk-cache.json'));
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: protectedScript, encoding: 'utf8', cwd: process.cwd(), env: protectedEnv,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, name === 'exact' ? 0 : 1, `actual protected quick gate: ${name}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), name === 'exact' ? '' : 'PROTECTED_QUICK_BASELINE_REQUIRED');
  }
  for (const name of ['legitimate-distinct-candidate', 'legitimate-active', 'changed-candidate', 'foreign-candidate']) {
    await fixtures();
    const relative = name === 'legitimate-active' ? '.cache/dmi-active-complete.json' : '.cache/dmi-candidate-progress.json';
    const bytes = Buffer.from('{"zones":{"different-synthetic":{"hourly":[{"time":"2026-10-11T11:00:00Z"}]}}}\n');
    await fs.writeFile(path.join(fixtureRoot, relative), bytes);
    const packed = { kind: 'PRIVATE_WEATHER_COMPONENT_PACK', schemaVersion: 1, marker: null,
      files: [{ relativePath: relative, bytes: bytes.length, sha256: hash(bytes) }] };
    const magic = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
    const header = Buffer.from(JSON.stringify(packed));
    const length = Buffer.alloc(4);
    length.writeUInt32BE(header.length);
    const packBytes = Buffer.concat([magic, length, header, bytes]);
    const packRelative = '.cache/weather-component-inputs.pack';
    await fs.writeFile(path.join(fixtureRoot, packRelative), packBytes);
    const manifest = { ...fixtureManifest, files: [...fixtureManifest.files,
      { relativePath: packRelative, bytes: packBytes.length, sha256: hash(packBytes) }] };
    manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
    await fs.writeFile(path.join(fixtureBundle, 'manifest.json'), JSON.stringify(manifest));
    for (const file of ['private-runtime-current-source.json', 'private-runtime-restored-source.json']) {
      await fs.writeFile(path.join(temporary, file), JSON.stringify({ ...manifest, sourceHead: '1'.repeat(40) }));
    }
    await fs.writeFile(path.join(temporary, 'weather-progress-base.json'),
      JSON.stringify({ ...base, protectedBundleContentSha256: manifest.bundleContentSha256 }));
    if (name === 'changed-candidate') await fs.appendFile(path.join(fixtureRoot, relative), ' ');
    if (name === 'foreign-candidate') await fs.writeFile(path.join(fixtureRoot, '.cache/dmi-active-complete.json'), bytes);
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: protectedScript, encoding: 'utf8', cwd: process.cwd(), env: protectedEnv,
    });
    const succeeds = name.startsWith('legitimate-');
    assert.equal(result.error, undefined);
    assert.equal(result.status, succeeds ? 0 : 1, `actual protected companion binding: ${name}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), succeeds ? '' : 'PROTECTED_QUICK_BASELINE_REQUIRED');
    for (const file of [relative, packRelative, '.cache/dmi-active-complete.json']) {
      await fs.unlink(path.join(fixtureRoot, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  await fixtures();
  const python = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
  const materialized = path.join(temporary, 'protected-quick-dmi-input.json');
  const materializer = spawnSync(python, ['scripts/materialize-dmi-bulk-storage.py',
    '--input', path.join(fixtureRoot, 'data/live/dmi-bulk-cache.json'), '--output', materialized],
  { encoding: 'utf8', cwd: process.cwd(), env: protectedEnv });
  assert.equal(materializer.error, undefined);
  assert.equal(materializer.status, 0, materializer.stderr);
  assert.deepEqual(await fs.readFile(path.join(fixtureRoot, 'data/live/dmi-bulk-cache.json')), dmiBytes);
  for (const [name, bytes, succeeds] of [['materialized', null, true],
    ['empty', '{"zones":{}}', false], ['malformed', '{"PRIVATE_TOKEN_ABCDEF":', false]]) {
    if (bytes !== null) await fs.writeFile(materialized, bytes);
    const result = spawnSync(python, ['-'], { input: protectedDmiScript, encoding: 'utf8',
      cwd: process.cwd(), env: protectedEnv });
    assert.equal(result.error, undefined);
    assert.equal(result.status, succeeds ? 0 : 1, `actual protected DMI input: ${name}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), succeeds ? '' : 'PROTECTED_QUICK_DMI_INPUT_REQUIRED');
  }
  for (const [status, succeeds] of [['MERGED', true], ['ACCEPTED_NO_CHANGE', true],
    ['NOT_PRESENT', true], ['REJECTED', false], ['RETAINED', false], ['UNKNOWN', false], [null, false]]) {
    const report = { status: 'RESTORED', restored: true, fileCount: 3,
      ...(status === null ? {} : { dmiProgress: { forecast: { status,
        recoveredComponents: 0, rejectedRecords: 2, runtimeRecovered: false } } }) };
    await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), JSON.stringify(report));
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: assertionScript, encoding: 'utf8', cwd: process.cwd(),
      env: { ...process.env, RUNNER_TEMP: temporary },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, succeeds, `actual workflow assertion: ${status}`);
    if (!succeeds) assert.match(result.stderr, /DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED/);
  }
  for (const [status, forecastStatus, succeeds] of [
    ['MISS', null, true], ['BASELINE_MISMATCH', null, true],
    ['RESTORED', 'MERGED', true], ['RESTORED', 'ACCEPTED_NO_CHANGE', true],
    ['RESTORED', 'NOT_PRESENT', true], ['RESTORED', 'REJECTED', false],
    ['RESTORED', 'RETAINED', false], ['RESTORED', null, false],
  ]) {
    const report = { status, restored: status === 'RESTORED', fileCount: status === 'RESTORED' ? 3 : 0,
      ...(forecastStatus === null ? {} : { dmiProgress: { forecast: { status: forecastStatus,
        recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false } } }) };
    await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), JSON.stringify(report));
    const result = spawnSync(process.execPath, ['--input-type=module'], {
      input: normalAssertionScript, encoding: 'utf8', cwd: process.cwd(),
      env: { ...process.env, RUNNER_TEMP: temporary },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, succeeds, `normal workflow assertion: ${status}/${forecastStatus}`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), succeeds ? '' : 'DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED');
  }
  await fs.writeFile(path.join(temporary, 'weather-progress-restore-report.json'), '{"PRIVATE_TOKEN_ABCDEF":');
  const malformed = spawnSync(process.execPath, ['--input-type=module'], {
    input: normalAssertionScript, encoding: 'utf8', cwd: process.cwd(),
    env: { ...process.env, RUNNER_TEMP: temporary },
  });
  assert.equal(malformed.status, 1);
  assert.equal(malformed.stdout, '');
  assert.equal(malformed.stderr.trim(), 'DMI_FORECAST_PROGRESS_RECOVERY_REQUIRED');
} finally {
  assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith('rr-quick-confirmation-contract-'));
  await fs.rm(temporary, { recursive: true, force: true });
}
const distributionNode = step('Select Node24 for fixed raw-cache distribution preparation');
const distributionPrepare = step('Prepare locked raw-cache API under its actual owned cohort');
const distributionRestore = step('Restore Node22 for normal weather producers');
const rawSave = step('Save progressed DMI GRIB download cache');
assert.match(distributionNode, /uses: actions\/setup-node@v7[\s\S]*node-version: 24/);
assert.match(distributionPrepare, /node "\$GITHUB_WORKSPACE\/\.github\/actions\/save-owned-dmi-grib\/index\.cjs" --prepare-distribution/);
assert.doesNotMatch(distributionPrepare, /continue-on-error|\|\| true/);
assert.match(distributionRestore, /always\(\).*steps\.dmi-cache-api-node24\.outcome == 'success'/);
assert.match(distributionRestore, /node-version: 22/);
assert.ok(workflow.indexOf(distributionNode) < workflow.indexOf(distributionPrepare));
assert.ok(workflow.indexOf(distributionPrepare) < workflow.indexOf(distributionRestore));
assert.ok(workflow.indexOf(distributionRestore)
  < workflow.indexOf(step('Materialize bounded deployed DMI storage before conditional point activation')));
assert.ok(workflow.indexOf(distributionRestore) < workflow.indexOf(step('Restore bounded DMI GRIB download cache')));
assert.ok(workflow.indexOf(distributionRestore) < workflow.indexOf(step('Update DMI bulk model cache')));
assert.match(rawSave, /steps\.dmi-progress-write-authority\.outcome == 'success'/);
assert.match(rawSave, /steps\.dmi-cache-api-prepare\.outcome == 'success'/);
assert.match(rawSave, /steps\.dmi-cache-api-prepare\.outputs\.distribution_ready == 'true'/);
assert.match(rawSave, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(rawSave, /path: \.cache\/dmi-grib\s+key: dmi-grib-v4-/);
const save = step('Encrypt newly saved private weather progress before later production steps');
assert.match(save, /always\(\)/);
assert.match(save, /steps.preflight.outputs.should_run == 'true'/);
assert.match(save, /steps.component-progress-restore.outcome == 'success'/);
assert.match(save, /steps.component-progress-restore.outputs.captured == 'true'/);
assert.doesNotMatch(save, /steps.weather.outcome/,
  'Provider progress must survive even when an earlier terminal gate skips the weather builder');
assert.match(save, /saved == true/);
assert.match(save, /WEATHER_PROGRESS_MASTER_SECRET: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
const upload = step('Save only the authenticated encrypted private weather snapshot');
assert.match(upload, /always\(\).*steps.component-progress-seal.outputs.saved == 'true'/);
assert.match(upload, /steps\.component-progress-seal\.outcome == 'success'/);
assert.match(upload, /uses: \.\/\.github\/actions\/save-owned-dmi-grib/);
assert.match(upload, /operation: upload-encrypted-progress\s+key: weather-private-progress-encrypted-v2-/);
assert.doesNotMatch(upload, /\bpath:/, 'Cipher upload must derive its one fixed path, not accept caller paths');
const cipherAction = await fs.readFile('.github/actions/save-owned-dmi-grib/index.cjs', 'utf8');
assert.match(cipherAction, /const CIPHER_PATH = '\.cache\/weather-private-progress\.encrypted'/);
const cipherProducer = await fs.readFile('scripts/weather-component-progress-cache.mjs', 'utf8');
assert.match(cipherProducer, /WEATHER_PROGRESS_MAX_CIPHER_BYTES = 384 \* 1024 \* 1024/);
assert.match(cipherAction, /MAX_CIPHER_BYTES = 384 \* 1024 \* 1024/);
assert.match(cipherProducer, /boundedStream\(maximumEncryptedBytes - prefix\.length - 16\)/);
assert.match(cipherProducer, /appendFile\(cipherTemporary, cipher\.getAuthTag\(\)\)[\s\S]*encryptedBytes > maximumEncryptedBytes/);
assert.match(cipherAction, /env\.INPUT_KEY !== `weather-private-progress-encrypted-v2-Linux-main-\$\{env\.GITHUB_RUN_ID\}-\$\{env\.GITHUB_RUN_ATTEMPT\}`/);
assert.match(cipherAction, /cache\.saveCache\(\[CIPHER_PATH\], input\.key, undefined, false\)/);
assert.ok(cipherAction.indexOf('if (firstFailure !== null) throw firstFailure.value;')
  < cipherAction.indexOf("'uploaded=true\\n'"), 'Upload output follows closure and actual claim release');
for (const file of ['update-and-deploy', 'run-current-weather-once']) {
  const caller = await fs.readFile(`.github/workflows/${file}.yml`, 'utf8');
  assert.doesNotMatch(caller, /WEATHER_PROGRESS_ENCRYPTION_KEY/);
}
console.log('Encrypted private weather progress: shared normal caller order, trusted restore, ciphertext-only save and failure recovery passed.');

// Additive fixed-action protocol fixture. The official API, process/cohort and
// claim are explicitly synthetic here: these tests do NOT prove Linux shutdown,
// a real dependency distribution, provider finalization or shared exclusion.
const { default: testOwnedRawCache } = await import('node:test');
const vmOwnedRawCache = await import('node:vm');
const { createRequire: createOwnedRawRequire, registerHooks: registerOwnedRawHooks } = await import('node:module');
const { EventEmitter: OwnedRawEmitter, once: ownedRawOnce } = await import('node:events');
const { PassThrough: OwnedRawPipe } = await import('node:stream');
const { fileURLToPath: ownedRawFilePath } = await import('node:url');
const ownedRawRequire = createOwnedRawRequire(import.meta.url);
const ownedRawAction = ownedRawFilePath(new URL('../.github/actions/save-owned-dmi-grib/index.cjs', import.meta.url));
const ownedRawSource = await fs.readFile(ownedRawAction, 'utf8');
const ownedRawCurrentPackage = await fs.readFile(path.join(path.dirname(ownedRawAction), 'package.json'), 'utf8');
const ownedRawCurrentLock = await fs.readFile(path.join(path.dirname(ownedRawAction), 'package-lock.json'), 'utf8');
// Historical fixtures retain the exact old distribution; a successor is not
// relabelled old. The complete projected bytes must equal BOTH historical pins.
function ownedRawLegacyDistribution(packageText, lockText) {
  packageText = packageText.replaceAll('\r\n', '\n'); lockText = lockText.replaceAll('\r\n', '\n');
  const sha = text => crypto.createHash('sha256').update(text).digest('hex');
  const oldPackage = '111ef6137410cce15e90ddfea3fbbb70b04285a2e0c1fc04cb221c04cc3b61d8';
  const oldLock = '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5';
  if (sha(packageText) !== oldPackage || sha(lockText) !== oldLock) {
    assert.equal(sha(packageText), '27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99');
    assert.equal(sha(lockText), '920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47');
    const lock = JSON.parse(lockText), keep = new Set(), queue = ['node_modules/@actions/cache'];
    while (queue.length) {
      const key = queue.pop(); if (keep.has(key)) continue; keep.add(key);
      const row = lock.packages[key]; assert.ok(row);
      for (const name of Object.keys({ ...row.dependencies, ...row.optionalDependencies, ...row.peerDependencies })) {
        const parts = key.split('/node_modules/'); let resolved;
        while (parts.length) { const candidate = parts.join('/node_modules/') + '/node_modules/' + name;
          if (lock.packages[candidate]) { resolved = candidate; break; } parts.pop(); }
        resolved ||= lock.packages['node_modules/' + name] && 'node_modules/' + name;
        if (resolved) queue.push(resolved);
      }
    }
    assert.equal(keep.size, 49);
    for (const key of Object.keys(lock.packages)) if (key && !keep.has(key)) delete lock.packages[key];
    delete lock.packages[''].dependencies['@actions/artifact']; lockText = JSON.stringify(lock, null, 2) + '\n';
    packageText = packageText.replace(', "@actions/artifact": "6.3.1"', '');
  }
  assert.equal(sha(packageText), oldPackage); assert.equal(sha(lockText), oldLock);
  return { packageText, lockText };
}
const { packageText: ownedRawPackage, lockText: ownedRawLock } = ownedRawLegacyDistribution(ownedRawCurrentPackage, ownedRawCurrentLock);

// Run the actual workflow validator body: no copied validator, no provider or cache API.
// Non-Linux hosts retain the static contract; a skip is not actual Bash evidence.
testOwnedRawCache('explicit progress source: actual Bash accepts exact full-run source and keeps protected-current short-only',
  { skip: process.platform !== 'linux' ? 'Actual Bash validator requires the normal Linux source host' : false }, () => {
    const runMatch = validateSource.match(/        run: \|\n([\s\S]*)$/);
    assert.ok(runMatch, 'The exact normal validator body must be present');
    const script = runMatch[1].replace(/^          /gm, '');
    const fixtures = [
      ['false', '123456-1', 0], ['false', '123456-2', 0],
      ['true', '123456-1', 0], ['true', 'protected-current', 0],
      ['false', 'protected-current', 1], ['false', '', 1], ['true', '', 1],
    ];
    for (const source of ['unknown', '123456', '123456-0', '123456-01',
      '../123456-1', ' 123456-1', '123456-1 ', '123456-1\n', '123456-1\r\n',
      '123456-1; echo SHOULD_NOT_RUN']) {
      for (const quick of ['false', 'true']) fixtures.push([quick, source, 1]);
    }
    for (const [quick, source, expected] of fixtures) {
      const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', script], {
        encoding: 'utf8', timeout: 5_000, maxBuffer: 16_384,
        env: { QUICK_CONFIRMATION: quick, QUICK_PROGRESS_SOURCE: source },
      });
      const label = JSON.stringify({ quick, source });
      assert.equal(result.error, undefined, label);
      assert.equal(result.signal, null, label);
      assert.equal(result.status, expected, label);
      assert.equal(result.stdout, '', label);
      assert.equal(result.stderr, '', label);
    }
  });

testOwnedRawCache('checkpoint-only request: actual Bash locks an original hour but never acquires weather',
  { skip: process.platform !== 'linux' ? 'Actual Bash validator requires the normal Linux source host' : false }, async () => {
    const caller = (await fs.readFile('.github/workflows/run-current-weather-once.yml', 'utf8')).replaceAll('\r\n', '\n');
    const block = caller.split(/(?=^      - (?:name:|uses:))/m).find(value =>
      value.startsWith('      - name: Lock the requested original checkpoint hour without provider work\n'));
    assert.ok(block);
    const body = block.match(/        run: \|\n([\s\S]*)$/);
    assert.ok(body);
    const script = body[1].replace(/^          /gm, '');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-hour-request-'));
    const clockHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
    const at = offset => new Date(clockHour + offset * 3_600_000).toISOString().replace('.000Z', 'Z');
    const fixtures = [
      ['false', '38612563932-1', at(-5), 0],
      ['false', '38612563932-1', at(0), 0],
      ['true', '38612563932-1', at(-5), 1],
      ['false', 'protected-current', at(-5), 1],
      ['false', '', at(-5), 1],
      ['false', '38612563932-0', at(-5), 1],
      ['false', '38612563932-1', at(-118), 1],
      ['false', '38612563932-1', at(2), 1],
      ['false', '38612563932-1', '2026-02-30T18:00:00Z', 1],
      ['false', '38612563932-1', at(-5) + '; echo MUST_NOT_RUN', 1],
    ];
    try {
      for (const [index, [quick, source, target, expected]] of fixtures.entries()) {
        const output = path.join(directory, `output-${index}.txt`);
        await fs.writeFile(output, '', { flag: 'wx' });
        const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', script], {
          encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384,
          env: { PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH,
            QUICK_CONFIRMATION: quick, QUICK_PROGRESS_SOURCE: source,
            CHECKPOINT_TARGET_HOUR: target, GITHUB_OUTPUT: output },
        });
        assert.equal(result.error, undefined, `request fixture ${index}`);
        assert.equal(result.signal, null, `request fixture ${index}`);
        assert.equal(result.status, expected, `request fixture ${index}`);
        assert.equal(await fs.readFile(output, 'utf8'), expected === 0 ? `target_hour=${target}\n` : '');
        assert.equal(result.stdout.includes('MUST_NOT_RUN'), false);
      }
    } finally {
      assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
      assert.ok(path.basename(directory).startsWith('rr-checkpoint-hour-request-'));
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

testOwnedRawCache('checkpoint-only original-hour gate executes the actual post-authentication workflow body', async () => {
  const block = step('Require the authenticated original hour before provider-free continuation');
  const body = block.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/);
  assert.ok(body);
  const script = body[1].replace(/^ {10}/gm, '');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-hour-report-'));
  const target = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 - 5 * 3_600_000).toISOString();
  const correct = { status: 'RESTORED', restored: true, restoredProductionReferenceAt: target };
  const fixtures = [
    [correct, 0],
    [{ ...correct, restoredProductionReferenceAt: target.replace('.000Z', 'Z') }, 0],
    [{ ...correct, restored: false }, 1],
    [{ ...correct, status: 'CACHE_MISS' }, 1],
    [{ ...correct, restoredProductionReferenceAt: undefined }, 1],
    [{ ...correct, restoredProductionReferenceAt: new Date(Date.parse(target) + 3_600_000).toISOString() }, 1],
    [{ ...correct, restoredProductionReferenceAt: 'invalid' }, 1],
  ];
  try {
    for (const [index, [report, expected]] of fixtures.entries()) {
      await fs.writeFile(path.join(directory, 'weather-progress-restore-report.json'), JSON.stringify(report));
      const result = spawnSync(process.execPath, ['--input-type=module'], {
        input: script, encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384,
        env: { RUNNER_TEMP: directory, RAVRADAR_PRODUCTION_TARGET_HOUR: target },
      });
      assert.equal(result.error, undefined, `report fixture ${index}`);
      assert.equal(result.signal, null, `report fixture ${index}`);
      assert.equal(result.status, expected, `report fixture ${index}`);
      assert.equal(result.stdout, '');
    }
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('rr-checkpoint-hour-report-'));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

testOwnedRawCache('owned raw cache: fixed API and physically separate owner receipt', async t => {
  const apiSlot = Symbol.for('RavRadar.synthetic.ownedRawCacheApi');
  const loader = registerOwnedRawHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier !== '@actions/cache') return nextResolve(specifier, context);
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(
        'const slot=Symbol.for("RavRadar.synthetic.ownedRawCacheApi");'
        + 'export const isFeatureAvailable=()=>globalThis[slot].available;'
        + 'export const saveCache=(...args)=>globalThis[slot].save(...args);') };
    },
  });
  function fixture(options = {}) {
    const events = [];
    const ipc = [];
    const outputs = [];
    const diagnostics = [];
    let cliDone;
    const cliFinished = new Promise(resolve => { cliDone = resolve; });
    const ownerValue = Object.freeze({});
    const env = { INPUT_PATH: '.cache/dmi-grib', INPUT_KEY: 'dmi-grib-v4-Linux-2026-W41-42-1',
      RUNNER_OS: 'Linux', GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1',
      GITHUB_REF: 'refs/heads/main', GITHUB_SERVER_URL: 'https://github.com',
      ACTIONS_CACHE_SERVICE_V2: '1', GITHUB_OUTPUT: '/synthetic/outputs', ...options.env };
    const processFixture = Object.assign(new OwnedRawEmitter(), {
      env, platform: 'linux', versions: { node: '24.19.0' }, argv: ['node', ownedRawAction],
      ppid: 12345,
      chdir(value) { events.push(['cwd', value]); },
      stderr: { write(value) { diagnostics.push(value); } },
    });
    if (options.cli) Object.defineProperty(processFixture, 'exitCode', {
      set(value) { cliDone(value); },
    });
    const owner = {
      async acquireWeatherAcquisitionWriter() {
        events.push('acquire');
        if (Object.hasOwn(options, 'acquireError')) throw options.acquireError;
        return ownerValue;
      },
      async assertWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('assert');
        if (Object.hasOwn(options, 'assertError')) throw options.assertError;
      },
      retainWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('retain');
        if (Object.hasOwn(options, 'retainError')) throw options.retainError;
      },
      async releaseWeatherAcquisitionWriter(value) {
        assert.equal(value, ownerValue); events.push('release');
        if (Object.hasOwn(options, 'releaseError')) throw options.releaseError;
      },
    };
    let child;
    let signalStarted;
    const started = new Promise(resolve => { signalStarted = resolve; });
    const spawn = (command, args, settings) => {
      events.push('spawn');
      assert.equal(command, 'python3');
      assert.deepEqual(Array.from(args), ['-B', path.join(path.dirname(ownedRawAction), '../../../scripts/run-owned-dmi-grib-save.py'),
        ...(options.distribution ? ['--prepare-distribution'] : [])]);
      assert.equal(settings.env, env);
      assert.equal(settings.shell, false);
      assert.deepEqual(Array.from(settings.stdio), ['ignore', 'pipe', 'pipe', 'pipe']);
      child = Object.assign(new OwnedRawEmitter(), {
        stdout: new OwnedRawPipe(), stderr: new OwnedRawPipe(),
        kill(signal) { events.push(['stop-request', signal]); },
      });
      child.stdio = [null, child.stdout, child.stderr, new OwnedRawPipe()];
      if (Object.hasOwn(options, 'receiptSetupError')) {
        const on = child.stdout.on.bind(child.stdout);
        child.stdout.on = (name, ...args) => {
          if (name === 'data') throw options.receiptSetupError;
          return on(name, ...args);
        };
      }
      signalStarted();
      return child;
    };
    const module = { exports: {} };
    const require = specifier => {
      if (specifier === 'node:child_process') return { spawn };
      if (specifier === 'node:module') return { findPackageJSON: () => '/synthetic/cache-package.json' };
      if (specifier === 'node:fs') return {
        fstatSync(fd) { assert.equal(fd, 3); return { isFIFO: () => !options.wrongParent, isSocket: () => false }; },
        readFileSync(file) {
          if (file === '/proc/12345/cmdline') return Buffer.from('python3\0-B\0'
            + path.join(path.dirname(ownedRawAction), '../../../scripts/run-owned-dmi-grib-save.py') + '\0');
          if (file === path.join(path.dirname(ownedRawAction), 'package.json')) return ownedRawPackage;
          if (file === path.join(path.dirname(ownedRawAction), 'package-lock.json')) {
            return ownedRawLock + (options.changedLock ? ' ' : '');
          }
          assert.equal(file, '/synthetic/cache-package.json');
          return JSON.stringify({ version: '6.1.0' });
        },
        writeSync(fd, value) { assert.equal(fd, 3); ipc.push(JSON.parse(value)); },
        appendFileSync(file, value) { assert.equal(file, env.GITHUB_OUTPUT); outputs.push(value); },
      };
      if (specifier === '../../../scripts/lib/weather-acquisition-writer.mjs') return owner;
      return ownedRawRequire(specifier);
    };
    if (options.cli) require.main = module;
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: path.dirname(ownedRawAction), __filename: ownedRawAction, process: processFixture,
      Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename: ownedRawAction,
      importModuleDynamically: vmOwnedRawCache.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }).runInContext(context);
    const receipt = { schemaVersion: 1, kind: 'DMI_RAW_SAVE_V2_FINALIZED', apiVersion: '6.1.0',
      path: env.INPUT_PATH, key: env.INPUT_KEY, cacheId: 17 };
    async function finish({ api = receipt, closure = { schemaVersion: 1,
      kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 0, interrupted: false }, code = 0 } = {}) {
      const ends = [child.stdout, child.stderr, child.stdio[3]].map(pipe => ownedRawOnce(pipe, 'end'));
      child.stdout.end(closure === null ? '' : JSON.stringify(closure));
      child.stderr.end();
      child.stdio[3].end(api === null ? '' : JSON.stringify(api));
      await Promise.all(ends);
      child.emit('close', code, null);
    }
    function dispose() {
      for (const stream of child?.stdio || []) stream?.destroy();
    }
    return { ...module.exports, events, ipc, outputs, env, started, finish, receipt, processFixture, dispose,
      diagnostics, cliFinished };
  }
  try {
    await t.test('distribution receipt is separate and waits for actual fixture closure and release', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      await value.started;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), false);
      await value.finish({ api: { schemaVersion: 1, kind: 'DMI_RAW_DISTRIBUTION_READY',
        apiVersion: '6.1.0', lockSha256: '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5' } });
      const result = await operation;
      assert.equal(result.distributionReady, true);
      assert.equal(Object.hasOwn(result, 'saved'), false);
      assert.deepEqual(value.outputs, ['distribution_ready=true\n']);
      assert.equal(value.events.includes('release'), true);
      assert.equal(value.events.includes('retain'), false);
      value.dispose();
    });
    await t.test('closed failed installer produces neither distribution nor SAVE output', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_API_FAILED/);
      await value.started;
      await value.finish({ api: null, closure: { schemaVersion: 1,
        kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 1, interrupted: false } });
      await rejected;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), true);
      assert.equal(value.events.includes('retain'), false);
      value.dispose();
    });
    await t.test('distribution ready without physical closure retains the same fixture owner', async () => {
      const value = fixture({ distribution: true });
      const operation = value.runOwnedDistribution();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_RECEIPT_INVALID/);
      await value.started;
      await value.finish({ closure: null, api: { schemaVersion: 1,
        kind: 'DMI_RAW_DISTRIBUTION_READY', apiVersion: '6.1.0',
        lockSha256: '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5' } });
      await rejected;
      assert.deepEqual(value.outputs, []);
      assert.equal(value.events.includes('release'), false);
      assert.equal(value.events.includes('retain'), true);
      value.dispose();
    });
    await t.test('SAVE checks its actual lock before invoking the API', async () => {
      const value = fixture({ changedLock: true });
      globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
      await assert.rejects(value.runApiWorker(), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
      assert.deepEqual(value.ipc, []);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('API awaits v2 finalization; private IPC is not workflow success', async () => {
      const value = fixture();
      let finishApi;
      const pending = new Promise(resolve => { finishApi = resolve; });
      globalThis[apiSlot] = { available: true, save(...args) {
        assert.equal(args.length, 4);
        assert.deepEqual(Array.from(args[0]), ['.cache/dmi-grib']);
        assert.equal(args[1], value.env.INPUT_KEY);
        assert.equal(args[2], undefined);
        assert.equal(args[3], false);
        return pending;
      } };
      const operation = value.runApiWorker();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(value.ipc.length, 0);
      finishApi(17);
      await operation;
      assert.deepEqual(value.ipc, [value.receipt]);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('failed/no-op/opaque IDs never produce a private success receipt', async () => {
      for (const id of [-1, 0, undefined, '17', Number.MAX_SAFE_INTEGER + 1]) {
        const value = fixture();
        globalThis[apiSlot] = { available: true, save: async () => id };
        await assert.rejects(value.runApiWorker(), /DMI_RAW_SAVE_NOT_FINALIZED/);
        assert.deepEqual(value.ipc, []);
      }
    });
    await t.test('worker mode without the fixed cohort refuses; cleanup keeps first failure', async () => {
      const wrong = fixture({ wrongParent: true });
      globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
      await assert.rejects(wrong.runApiWorker(), /DMI_RAW_SAVE_WORKER_PARENT_UNPROVED/);
      assert.deepEqual(wrong.ipc, []);
      const value = fixture({ releaseError: new Error('SYNTHETIC_RELEASE_FAILURE') });
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_NOT_FINALIZED/);
      await value.started;
      await value.finish({ api: { ...value.receipt, key: 'wrong-key' } });
      await rejected;
      assert.equal(value.events.at(-1), 'release');
      assert.deepEqual(value.outputs, []);
    });
    await t.test('wrong host/v1/other path refuse before any API or owner use', async () => {
      for (const env of [{ ACTIONS_CACHE_SERVICE_V2: '' }, { GITHUB_SERVER_URL: 'https://enterprise.invalid' },
        { INPUT_PATH: '.cache/another-cache' }, { GITHUB_RUN_ATTEMPT: '2' }]) {
        const value = fixture({ env });
        globalThis[apiSlot] = { available: true, save: () => { throw new Error('API_MUST_NOT_RUN'); } };
        await assert.rejects(value.runApiWorker(), /DMI_RAW_SAVE_(?:V2_REQUIRED|INPUT_REFUSED)/);
        await assert.rejects(value.runOwnedSave(), /DMI_RAW_SAVE_(?:V2_REQUIRED|INPUT_REFUSED)/);
        assert.deepEqual(value.events, []);
      }
    });
    await t.test('official truthy false string is not rewritten to a different service mode', async () => {
      const value = fixture({ env: { ACTIONS_CACHE_SERVICE_V2: 'false' } });
      globalThis[apiSlot] = { available: true, save: async () => 17 };
      await value.runApiWorker();
      assert.equal(value.env.ACTIONS_CACHE_SERVICE_V2, 'false');
      assert.equal(value.ipc[0].cacheId, 17);
    });
    await t.test('same owner spans pending child; typed API plus closure precedes own release', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      await value.started;
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn']);
      assert.deepEqual(value.outputs, []);
      await value.finish();
      assert.equal((await operation).saved, true);
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'assert', 'release']);
      assert.deepEqual(value.outputs, ['saved=true\n']);
    });
    await t.test('exit0 plus API finalization without physical receipt retains own claim', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_RECEIPT_INVALID/);
      await value.started;
      await value.finish({ closure: null });
      await rejected;
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'retain']);
      assert.deepEqual(value.outputs, []);
    });
    await t.test('closed failure and wrong-key receipt release safely but never report saved', async () => {
      for (const failedWorker of [false, true]) {
        const value = fixture();
        const operation = value.runOwnedSave();
        const rejected = assert.rejects(operation, /DMI_RAW_SAVE_(?:API_FAILED|NOT_FINALIZED)/);
        await value.started;
        await value.finish({ api: { ...value.receipt, key: 'another-key' }, closure: {
          schemaVersion: 1, kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: failedWorker ? 1 : 0, interrupted: false } });
        await rejected;
        assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'release']);
        assert.deepEqual(value.outputs, []);
      }
    });
    await t.test('interruption requests stop but awaits physical closure before own release', async () => {
      const value = fixture();
      const operation = value.runOwnedSave();
      const rejected = assert.rejects(operation, /DMI_RAW_SAVE_INTERRUPTED/);
      await value.started;
      value.processFixture.emit('SIGTERM');
      assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', ['stop-request', 'SIGTERM']]);
      await value.finish();
      await rejected;
      assert.equal(value.events.at(-1), 'release');
      assert.deepEqual(value.outputs, []);
    });
    for (const raw of [0, null]) {
      await t.test(`raw ${String(raw)} assertion failure before launch cannot report saved`, async () => {
        const value = fixture({ assertError: raw });
        await assert.rejects(value.runOwnedSave(), error => Object.is(error, raw));
        assert.deepEqual(value.events, ['acquire', 'assert', 'release']);
        assert.deepEqual(value.ipc, []);
        assert.deepEqual(value.outputs, []);
      });
      await t.test(`raw ${String(raw)} release failure after closure cannot report saved`, async () => {
        const value = fixture({ releaseError: raw });
        const operation = value.runOwnedSave();
        const rejected = assert.rejects(operation, error => Object.is(error, raw));
        await value.started;
        await value.finish();
        await rejected;
        assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'assert', 'release']);
        assert.deepEqual(value.outputs, []);
      });
      await t.test(`raw ${String(raw)} primary failure survives retain failure with unknown closure`, async () => {
        const value = fixture({ receiptSetupError: raw, retainError: new Error('SYNTHETIC_RETAIN_FAILURE') });
        try {
          await assert.rejects(value.runOwnedSave(), error => Object.is(error, raw));
          assert.deepEqual(value.events, ['acquire', 'assert', 'spawn', 'retain']);
          assert.deepEqual(value.outputs, []);
        } finally { value.dispose(); }
      });
    }

    await t.test('normal CLI failure diagnostic is fixed-enum only and never evaluates unknown error properties', async () => {
      const unknown = 'DMI_RAW_SAVE_DIAGNOSTIC stage=LEASE reason=UNKNOWN\n';
      const known = 'DMI_RAW_SAVE_DIAGNOSTIC stage=LEASE reason=WEATHER_ACQUISITION_WRITER_UNPROVED\n';
      let accessorCalls = 0;
      const accessor = Object.create(null, {
        code: { get() { accessorCalls += 1; throw new Error('DO_NOT_READ_SECRET'); } },
        message: { get() { accessorCalls += 1; return 'WEATHER_ACQUISITION_WRITER_UNPROVED'; } },
      });
      let proxyCalls = 0;
      const proxy = new Proxy({}, {
        get() { proxyCalls += 1; throw new Error('DO_NOT_READ_PROXY'); },
        getOwnPropertyDescriptor() { proxyCalls += 1; throw new Error('DO_NOT_INSPECT_PROXY'); },
        ownKeys() { proxyCalls += 1; throw new Error('DO_NOT_ENUMERATE_PROXY'); },
      });
      for (const [raw, expected] of [
        [Object.freeze({ code: 'WEATHER_ACQUISITION_WRITER_UNPROVED' }), known],
        [new Error('WEATHER_ACQUISITION_WRITER_UNPROVED'), known],
        [null, unknown], [0, unknown],
        [{ stage: 'OUTPUT', code: 'UNRECOGNIZED' }, unknown],
        [{ code: 'UNKNOWN_SECRET_TOKEN', message: 'https://secret.invalid/?token=DO_NOT_LOG' }, unknown],
        [Object.create({ code: 'WEATHER_ACQUISITION_WRITER_UNPROVED' }), unknown],
        [accessor, unknown], [proxy, unknown],
      ]) {
        const value = fixture({ cli: true, assertError: raw });
        assert.equal(await value.cliFinished, 1);
        assert.deepEqual(value.diagnostics, ['DMI_RAW_SAVE_REFUSED\n', expected]);
        assert.deepEqual(value.events, ['acquire', 'assert', 'release']);
        assert.deepEqual(value.outputs, []);
        assert.deepEqual(value.ipc, []);
      }
      const occupied = fixture({ cli: true, acquireError: Object.freeze({ code: 'EEXIST' }) });
      assert.equal(await occupied.cliFinished, 1);
      assert.deepEqual(occupied.diagnostics, ['DMI_RAW_SAVE_REFUSED\n',
        'DMI_RAW_SAVE_DIAGNOSTIC stage=LEASE reason=EEXIST\n']);
      assert.deepEqual(occupied.events, ['acquire']);
      assert.deepEqual(occupied.outputs, []);
      const failedWorker = fixture({ cli: true, releaseError: new Error('DO_NOT_REPLACE_PRIMARY') });
      await failedWorker.started;
      await failedWorker.finish({ api: null, closure: { schemaVersion: 1,
        kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 1, interrupted: false } });
      assert.equal(await failedWorker.cliFinished, 1);
      assert.deepEqual(failedWorker.diagnostics, ['DMI_RAW_SAVE_REFUSED\n',
        'DMI_RAW_SAVE_DIAGNOSTIC stage=API reason=DMI_RAW_SAVE_API_FAILED\n']);
      assert.deepEqual(failedWorker.events, ['acquire', 'assert', 'spawn', 'release']);
      assert.deepEqual(failedWorker.outputs, []);
      failedWorker.dispose();
      const input = fixture({ cli: true, env: { INPUT_PATH: 'not-the-fixed-path' } });
      assert.equal(await input.cliFinished, 1);
      assert.deepEqual(input.diagnostics, ['DMI_RAW_SAVE_REFUSED\n',
        'DMI_RAW_SAVE_DIAGNOSTIC stage=INPUT reason=DMI_RAW_SAVE_INPUT_REFUSED\n']);
      assert.deepEqual(input.events, []);
      assert.deepEqual(input.outputs, []);
      assert.equal(accessorCalls, 0);
      assert.equal(proxyCalls, 0);
    });
  } finally {
    loader.deregister();
    delete globalThis[apiSlot];
  }
});


// Real owned-file I/O with the unchanged full action body. Process/npm boundaries
// are controlled here; this is NOT an npm install, SDK or native cohort proof.
testOwnedRawCache('owned distribution npm configuration: distinct empty sources and close boundary', async t => {
  const rawFs = ownedRawRequire('node:fs');
  async function fixture(options = {}) {
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rr-owned-npm-config-')));
    const action = path.join(parent, 'checkout/.github/actions/save-owned-dmi-grib');
    const cache = path.join(action, '.npm-cache');
    const runtime = path.join(parent, 'runtime');
    await fs.mkdir(action, { recursive: true });
    await fs.mkdir(runtime);
    await fs.writeFile(path.join(action, 'package.json'), ownedRawPackage);
    await fs.writeFile(path.join(action, 'package-lock.json'), ownedRawLock);
    const file = path.join(action, 'index.cjs');
    const execPath = path.join(runtime, 'bin/node');
    const npmLink = path.join(runtime, 'bin/npm');
    const npmCli = path.join(runtime, 'lib/node_modules/npm/bin/npm-cli.js');
    const configs = ['.ravradar-user.npmrc', '.ravradar-global.npmrc'].map(name => path.join(cache, name));
    const processFixture = { platform: 'linux', versions: { node: '24.19.0' }, execPath,
      ppid: 12345, env: { GITHUB_REF: 'refs/heads/main', RUNNER_OS: 'Linux',
        GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'workflow_dispatch',
        NPM_CONFIG_USERCONFIG: '/SYNTHETIC_INHERITED_CONFIG',
        npm_config_globalconfig: '/SYNTHETIC_INHERITED_CONFIG', npm_config_offline: 'true' } };
    const opened = new Set();
    const installer = new OwnedRawEmitter();
    let settings, command, args, parentAdmission = false, failUnlink = false;
    const controlledFs = new Proxy(rawFs, { get(target, name) {
      if (name === 'readFileSync') return (p, ...rest) => {
        if (p === '/proc/12345/cmdline') return Buffer.from('python3\0-B\0'
          + path.resolve(action, '../../../scripts/run-owned-dmi-grib-save.py') + '\0');
        if (p === path.join(path.dirname(npmCli), '../package.json')) return '{"name":"npm"}';
        return target.readFileSync(p, ...rest);
      };
      if (name === 'realpathSync') return p => p === npmLink ? npmCli : target.realpathSync(p);
      if (name === 'openSync') return (...args) => {
        const fd = target.openSync(...args); opened.add(fd); return fd;
      };
      if (name === 'fstatSync') return (fd, ...rest) => {
        if (parentAdmission && fd === 3 && !opened.has(fd)) {
          parentAdmission = false; return { isFIFO: () => true, isSocket: () => false };
        }
        if (opened.has(fd) && Object.hasOwn(options, 'statFailure')) throw options.statFailure;
        return target.fstatSync(fd, ...rest);
      };
      if (name === 'closeSync') return fd => {
        if (options.noopClose) return;
        target.closeSync(fd); opened.delete(fd);
      };
      if (name === 'unlinkSync') return p => {
        if (failUnlink) throw new Error('SYNTHETIC_SECONDARY_UNLINK');
        if (options.noopUnlink) return;
        return target.unlinkSync(p);
      };
      return target[name];
    } });
    const module = { exports: {} };
    const require = name => name === 'node:fs' ? controlledFs
      : name === 'node:child_process' ? { spawn(c, a, s) {
        command = c; args = a; settings = s; return installer;
      } } : ownedRawRequire(name);
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: action, __filename: file, process: processFixture, Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename: file }).runInContext(context);
    const api = vmOwnedRawCache.runInContext('({ createDistributionConfigFiles, runDistributionWorker })', context);
    return { ...api, action, cache, configs, installer, options, opened,
      runDistributionWorker() { parentAdmission = true; return api.runDistributionWorker(); },
      get settings() { return settings; }, get command() { return command; }, get args() { return args; },
      secondaryUnlinkFailure() { failUnlink = true; },
      async dispose() {
        for (const fd of opened) rawFs.closeSync(fd);
        await fs.rm(parent, { recursive: true, force: true });
      },
    };
  }
  await t.test('normal worker uses distinct own empty configs, no inherited source, and waits for close', async () => {
    const f = await fixture();
    try {
      let settled = false;
      const operation = f.runDistributionWorker();
      operation.then(() => { settled = true; }, () => { settled = true; });
      assert.equal(f.settings.env.npm_config_userconfig, f.configs[0]);
      assert.equal(f.settings.env.npm_config_globalconfig, f.configs[1]);
      assert.equal(f.settings.env.NPM_CONFIG_USERCONFIG, undefined);
      assert.equal(f.settings.env.npm_config_offline, 'true');
      assert.equal(f.settings.env.npm_config_cache, f.cache);
      assert.equal(f.settings.shell, false);
      assert.equal(f.settings.stdio, 'ignore');
      assert.deepEqual(Array.from(f.args).slice(1), ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
      const identities = f.configs.map(p => rawFs.lstatSync(p, { bigint: true }));
      for (const entry of identities) { assert.equal(entry.isFile(), true); assert.equal(entry.size, 0n); assert.equal(entry.nlink, 1n); }
      assert.notEqual(identities[0].ino, identities[1].ino);
      assert.equal(f.opened.size, 0, 'Own creation descriptors physically closed before npm');
      f.installer.emit('error', new Error('SYNTHETIC_SPAWN_ERROR'));
      await Promise.resolve();
      assert.equal(settled, false);
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
      const rejected = assert.rejects(operation, /SYNTHETIC_SPAWN_ERROR/);
      f.installer.emit('close', 17, null);
      await rejected;
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), false);
    } finally { await f.dispose(); }
  });
  await t.test('pre-existing config is not adopted or overwritten', async () => {
    const f = await fixture();
    try {
      await fs.mkdir(f.cache); await fs.writeFile(f.configs[0], 'OWN_SYNTHETIC_EXISTING');
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), e => e.code === 'EEXIST');
      assert.equal(await fs.readFile(f.configs[0], 'utf8'), 'OWN_SYNTHETIC_EXISTING');
      assert.equal(f.settings, undefined);
    } finally { await f.dispose(); }
  });
  await t.test('content and file-identity tampering refuse cleanup of unknown files', async () => {
    for (const replace of [false, true]) {
      const f = await fixture();
      try {
        const configs = f.createDistributionConfigFiles(f.action, f.cache);
        if (replace) { await fs.rename(f.configs[0], f.configs[0] + '.old'); await fs.writeFile(f.configs[0], ''); }
        else { await fs.chmod(f.configs[0], 0o600); await fs.writeFile(f.configs[0], 'OWN_TAMPER'); }
        assert.throws(() => configs.assertFiles(), /CONFIG_CHANGED/);
        assert.throws(() => configs.removeAfterInstallerClose(), /CONFIG_CHANGED/);
        assert.equal(rawFs.existsSync(f.configs[0]), true);
      } finally { await f.dispose(); }
    }
  });
  await t.test('cache replacement and a directory-link config cannot qualify', async () => {
    const f = await fixture();
    try {
      const configs = f.createDistributionConfigFiles(f.action, f.cache);
      await fs.rename(f.cache, f.cache + '.old'); await fs.mkdir(f.cache);
      assert.throws(() => configs.assertFiles(), /CONFIG_ROOT_CHANGED/);
      await fs.symlink(f.cache + '.old', f.configs[0], process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), e => ['EEXIST', 'ELOOP'].includes(e.code));
      assert.equal(rawFs.lstatSync(f.configs[0]).isSymbolicLink(), true);
    } finally { await f.dispose(); }
  });
  await t.test('no-op physical close cannot start installer', async () => {
    const f = await fixture({ noopClose: true });
    try {
      assert.throws(() => f.createDistributionConfigFiles(f.action, f.cache), /CONFIG_CLOSE_UNPROVED/);
      assert.equal(f.opened.size, 1); assert.equal(f.settings, undefined);
    } finally { await f.dispose(); }
  });
  for (const raw of [null, 0]) await t.test('raw ' + raw + ' first failure survives secondary cleanup failure', async () => {
    const f = await fixture();
    try {
      const operation = f.runDistributionWorker();
      f.installer.emit('error', raw); f.secondaryUnlinkFailure();
      const rejected = assert.rejects(operation, error => Object.is(error, raw));
      f.installer.emit('close', 17, null); await rejected;
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
    } finally { await f.dispose(); }
  });
  await t.test('no-op unlink cannot become successful distribution cleanup', async () => {
    const f = await fixture({ noopUnlink: true });
    try {
      const configs = f.createDistributionConfigFiles(f.action, f.cache);
      assert.throws(() => configs.removeAfterInstallerClose(), /CONFIG_CLEANUP_UNPROVED/);
      for (const p of f.configs) assert.equal(rawFs.existsSync(p), true);
    } finally { await f.dispose(); }
  });
});

// Additive worker-transport proof only. The full action and unchanged lock guard
// execute; SDK/publisher result transport, procfs and descriptors are synthetic.
// This does NOT install artifact6.3.1, validate a new lock, run full publishers,
// authenticate A2/H, or prove Linux close/drain, hosted finalization or SOURCE.
testOwnedRawCache('SOURCE publication workers: fixed normal factories, ordered ACK and first failure', async t => {
  const slot = Symbol.for('RavRadar.synthetic.sourcePublication');
  const root = path.posix.resolve('/synthetic/checkout');
  const action = path.posix.join(root, '.github/actions/save-owned-dmi-grib');
  const filename = path.posix.join(action, 'index.cjs');
  const checkpointUrl = ownedRawRequire('node:url').pathToFileURL(root + '/scripts/protected-ravscore-continuation-checkpoint.mjs').href;
  const privateUrl = ownedRawRequire('node:url').pathToFileURL(root + '/scripts/protected-private-production-runtime.mjs').href;
  const texts = await Promise.all([
    'scripts/protected-ravscore-continuation-checkpoint.mjs',
    'scripts/protected-private-production-runtime.mjs',
    'scripts/lib/supabase-admin-rest.mjs',
    'scripts/ravscore-continuation-checkpoint.mjs',
    'scripts/private-production-runtime-bundle.mjs',
  ].map(file => fs.readFile(file, 'utf8').then(s => s.replaceAll('\r\n', '\n'))));
  const [cpSource, privateSource, adminSource, stateSource, bundleSource] = texts;
  const between = (source, start, end) => {
    assert.equal(source.split(start).length - 1, 1, start);
    const begin = source.indexOf(start), finish = source.indexOf(end, begin + start.length);
    assert.ok(finish > begin, end); return source.slice(begin, finish);
  };
  const policy = (source, name) => between(source,
    `export const ${name} = Object.freeze({`, '\n});') + '\n});\n';
  // Whole actual factory bodies and actual policy/default helpers, not hand-
  // written factories. Only the transport and full-publisher result are doubles.
  const factorySource = [adminSource,
    policy(stateSource, 'RAVSCORE_CONTINUATION_CHECKPOINT_POLICY'),
    policy(bundleSource, 'PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY'),
    policy(privateSource, 'PROTECTED_PRIVATE_RUNTIME_POLICY'),
    between(cpSource, 'export const PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY', '\nconst isPlainObject'),
    between(cpSource, 'const isPlainObject', '\nfunction safeMetadata'),
    between(cpSource, 'const parseRemoteJson', '\n// Counts only public contract states.'),
    between(cpSource, 'async function readResponseTextBounded', '\nexport function createProtectedRavScoreCheckpointRequester'),
    between(cpSource, 'export function createProtectedRavScoreCheckpointVersionRequester', '\nfunction validateCheckpointRpcMetadata'),
    between(privateSource, 'function safeSupabaseUrl', '\nfunction parseArguments'),
    'globalThis.actualFactories={createProtectedRavScoreCheckpointVersionRequester,'
      + 'createProtectedRavScoreCheckpointRpcRequester,createProtectedRavScoreCheckpointDiagnosticRequester,'
      + 'createProtectedPrivateRuntimeClients};',
  ].join('\n').replace(/^export /gm, '');
  const loader = registerOwnedRawHooks({ resolve(specifier, context, nextResolve) {
    let body;
    if (specifier === '@actions/artifact') body = 'export class DefaultArtifactClient {'
      + 'uploadArtifact(...a){return globalThis[s].upload(...a)}'
      + 'getArtifact(...a){return globalThis[s].readback(...a)}}';
    if (specifier === checkpointUrl) body = [
      'createProtectedRavScoreCheckpointVersionRequester', 'createProtectedRavScoreCheckpointRpcRequester',
      'createProtectedRavScoreCheckpointDiagnosticRequester',
    ].map(name => `export const ${name}=(...a)=>globalThis[s].factory('${name}',a);`).join('')
      + 'export const publishProtectedRavScoreContinuationCheckpoint=(o)=>globalThis[s].checkpoint(o);';
    if (specifier === privateUrl) body = 'export const createProtectedPrivateRuntimeClients=(...a)=>'
      + 'globalThis[s].factory("createProtectedPrivateRuntimeClients",a);'
      + 'export const publishProtectedPrivateProductionRuntime=(o)=>globalThis[s].privatePublish(o);'
      + 'export const PROTECTED_PRIVATE_RUNTIME_POLICY=globalThis[s].policy;'
      + 'export const auditProtectedPrivateRuntimeAnonymousDenial=(o)=>globalThis[s].audit(o);';
    if (body === undefined) return nextResolve(specifier, context);
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(
      'const s=Symbol.for("RavRadar.synthetic.sourcePublication");' + body) };
  } });
  const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; });
    return { promise, resolve, reject }; };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  function fixture(options = {}) {
    const events = [], outputs = [], fetches = [], factoryReturns = new Map();
    const upload = deferred(), readback = deferred(), checkpoint = deferred(), privatePublish = deferred();
    const payload = Buffer.from('SYNTHETIC SEALED BYTES\n');
    const sha = crypto.createHash('sha256').update(payload).digest('hex');
    const zip = 'a'.repeat(64), name = 'ravradar-private-build-stage-42-1';
    const temporary = '/synthetic/tmp', directory = temporary + '/ravradar-private-build-stage';
    const sealed = directory + '/sealed.bin', output = '/proc/12345/fd/9';
    const target = '2026-10-14T10:00:00.000Z';
    const env = { INPUT_OPERATION: 'source', RUNNER_OS: 'Linux', GITHUB_RUN_ID: '42',
      GITHUB_RUN_ATTEMPT: '1', GITHUB_REF: 'refs/heads/main', GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: '1'.repeat(40), GITHUB_REPOSITORY: 'synthetic/repo',
      GITHUB_OUTPUT: output, RUNNER_TEMP: temporary, RAVRADAR_PRODUCTION_TARGET_HOUR: target,
      SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_SYNTHETIC',
      RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND: 'supabase' };
    const processFixture = { platform: 'linux', versions: { node: '24.19.0' }, ppid: 12345, env,
      argv: ['node', filename], stderr: { write() { throw Error('UNEXPECTED_DIAGNOSTIC'); } } };
    const opened = new Set(); let mutated = false;
    const stat = (kind, inode, nlink = 1n) => ({ dev: 3n, ino: inode, mode: kind === 'dir' ? 16832n : 33152n,
      nlink, size: BigInt(payload.length), mtimeNs: 7n, ctimeNs: mutated ? 9n : 7n,
      isFile: () => kind === 'file', isDirectory: () => kind === 'dir', isSymbolicLink: () => false });
    const fsFixture = {
      constants: ownedRawRequire('node:fs').constants,
      readFileSync(file) {
        if (file === '/proc/12345/cmdline') return Buffer.from('python3\0-I\0-B\0'
          + root + '/scripts/lib/copernicus_component_process.py\0--source-normal-program-cohort\0');
        if (file === action + '/package.json') return ownedRawCurrentPackage + (options.changedPackage ? ' ' : '');
        if (file === action + '/package-lock.json') return ownedRawCurrentLock + (options.changedLock ? ' ' : '');
        if (file === action + '/node_modules/@actions/artifact/package.json') return '{"version":"6.3.1"}';
        if (file === root + '/.cache/private-production-runtime-expected.json') return '{"syntheticExpected":1}';
        throw Error('UNEXPECTED_READ:' + file);
      },
      realpathSync: file => file,
      lstatSync(file) {
        if (file === sealed) return stat('file', 20n);
        assert.ok([root, temporary, directory].includes(file)); return stat('dir', BigInt(file.length));
      },
      openSync(file, flags) {
        assert.ok([sealed, output].includes(file)); const fd = file === sealed ? 14 : 15;
        assert.equal(flags, file === sealed ? this.constants.O_RDONLY | this.constants.O_NOFOLLOW
          : this.constants.O_WRONLY | this.constants.O_APPEND);
        assert.equal(opened.has(fd), false); opened.add(fd); events.push('open:' + fd); return fd;
      },
      fstatSync(fd) {
        if (!opened.has(fd)) { events.push('closed:' + fd); throw Object.assign(new Error('SYNTHETIC_EBADF'), { code: 'EBADF' }); }
        return stat('file', fd === 14 ? 20n : 30n, fd === 15 ? 0n : 1n);
      },
      readSync(fd, buffer, offset, length, position) {
        assert.equal(fd, 14); assert.ok(opened.has(fd));
        const n = Math.max(0, Math.min(length, payload.length - position));
        payload.copy(buffer, offset, position, position + n); return n;
      },
      closeSync(fd) {
        events.push('close:' + fd); assert.ok(opened.has(fd));
        if (options.closeFailure === fd) throw Error('SYNTHETIC_SECONDARY_CLOSE');
        if (options.noopClose !== fd) opened.delete(fd);
      },
      writeFileSync(fd, text) {
        assert.equal(fd, 15); assert.ok(opened.has(fd)); events.push('output');
        if (Object.hasOwn(options, 'writeFailure')) throw options.writeFailure;
        outputs.push(text);
      },
    };
    const normalContext = vmOwnedRawCache.createContext({ Buffer, URL, console, setTimeout,
      process: { env }, fetch: async (url, request) => {
        fetches.push({ url, request });
        assert.ok(url.startsWith('https://synthetic.invalid/'));
        assert.equal(request.headers.apikey, 'sb_secret_SYNTHETIC');
        assert.equal(request.headers.Authorization, undefined);
        const body = url.includes('?document_key=eq.ravscore-private-production-runtime-pointer&')
          ? [{ document_key: 'ravscore-private-production-runtime-pointer', version: priv.centralVersion,
            payload: { current: { productionReferenceAt: priv.productionReferenceAt,
              bundleContentSha256: priv.bundleContentSha256, objectSha256: priv.objectSha256, objectCount: priv.objectCount } } }]
          : url.includes('/storage/v1/bucket/')
          ? { id: 'ravradar-private-production-runtime', name: 'ravradar-private-production-runtime',
            public: false, file_size_limit: 50 * 1024 * 1024, allowed_mime_types: ['application/gzip'] } : [];
        return { ok: true, status: 200, text: async () => JSON.stringify(body) };
      } });
    new vmOwnedRawCache.Script(factorySource).runInContext(normalContext);
    const module = { exports: {} };
    const require = name => name === 'node:fs' ? fsFixture
      : name === 'node:path' ? path.posix
      : name === 'node:module' ? { findPackageJSON: () => action + '/node_modules/@actions/artifact/package.json' }
      : name === 'node:child_process' ? { spawn() { throw Error('UNEXPECTED_CHILD'); } }
      : ownedRawRequire(name);
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: action, __filename: filename, process: processFixture, Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename,
      importModuleDynamically: vmOwnedRawCache.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }).runInContext(context);
    const api = vmOwnedRawCache.runInContext('({runSourceArtifactUpload,runSourceCheckpointPublish,'
      + 'runSourcePrivatePublish,retainedSourcePublicationWorkers})', context);
    globalThis[slot] = {
      policy: vmOwnedRawCache.runInContext('PROTECTED_PRIVATE_RUNTIME_POLICY', normalContext),
      async audit({ request, storage }) {
        assert.equal(storage, factoryReturns.get('createProtectedPrivateRuntimeClients').storage);
        await request('?document_key=eq.ravscore-private-production-runtime-pointer&select=document_key,payload,version&limit=2', {}, 'read');
        return { anonymousReadDenied: true, objectCount: 1, statusClasses: ['4xx'], privatePayloadLogged: false };
      },
      upload(...args) { events.push('upload'); assert.equal(args.length, 4); assert.equal(args[0], name);
        assert.deepEqual(Array.from(args[1]), [sealed]); assert.equal(args[2], directory);
        assert.deepEqual(JSON.parse(JSON.stringify(args[3])), { retentionDays: 1, compressionLevel: 0 });
        return upload.promise; },
      readback(...args) { events.push('readback'); assert.deepEqual(args, [name]); return readback.promise; },
      factory(name, args) { events.push(name); assert.equal(args.length, 0);
        const value = normalContext.actualFactories[name](); factoryReturns.set(name, value); return value; },
      async checkpoint(args) {
        events.push('checkpoint'); assert.equal(args.targetReference, target);
        for (const [field, suffix] of [['request', 'Version'], ['rpcRequest', 'Rpc'], ['diagnosticRequest', 'Diagnostic']]) {
          assert.equal(args[field], factoryReturns.get('createProtectedRavScoreCheckpoint' + suffix + 'Requester'));
        }
        await args.request('?document_key=eq.ravscore-continuation-checkpoint&select=document_key,version&limit=2');
        await assert.rejects(args.request('?different'), /non-metadata/);
        await assert.rejects(args.rpcRequest(null), /body is invalid/);
        await assert.rejects(args.diagnosticRequest(null, target), /unavailable/);
        return checkpoint.promise;
      },
      async privatePublish(args) {
        events.push('private'); const clients = factoryReturns.get('createProtectedPrivateRuntimeClients');
        assert.equal(args.request, clients.documentRequest); assert.equal(args.storage, clients.storage);
        assert.equal(args.privateRoot, '/tmp/ravradar-private-production-runtime');
        assert.equal(args.bundlePath, '/tmp/ravradar-private-production-runtime/bundle-source-successor');
        assert.equal(args.repositoryRoot, root); assert.equal(args.sourceHead, env.GITHUB_SHA);
        assert.deepEqual(JSON.parse(JSON.stringify(args.expected)), { syntheticExpected: 1 });
        assert.equal(Object.hasOwn(args, 'sameReferenceMigrationEvidence'), false);
        await clients.storage.ensurePrivateBucket({ allowCreate: false });
        await clients.documentRequest('?document_key=eq.synthetic&select=version');
        return privatePublish.promise;
      },
    };
    const cp = { published: true, reason: 'protected-checkpoint-updated', centralVersion: 3,
      checkpointAt: target, targetReferenceAt: target, continuationAvailable: true, partCount: 673,
      payloadLogged: false, preexistingHistoricalVersionsPreserved: true, newHistoricalVersionsRetained: false,
      modelBundleSha256: 'b'.repeat(64), modelContractSha256: 'c'.repeat(64), continuationStateContractSha256: 'd'.repeat(64) };
    const priv = { published: true, reason: 'protected-private-runtime-updated', centralVersion: 4,
      productionReferenceAt: target, privatePayloadLogged: false, rollbackAvailable: true,
      bundleContentSha256: 'e'.repeat(64), objectSha256: 'f'.repeat(64), objectCount: 1,
      retentionCleanupComplete: true, retentionCleanupFailureCount: 0 };
    return { ...api, events, outputs, fetches, opened, upload, readback, checkpoint, privatePublish, cp, priv,
      uploaded: { id: 17, size: 123, digest: zip },
      remote: { artifact: { id: 17, name, size: 123, digest: 'sha256:' + zip } },
      sha, zip, mutate() { mutated = true; } };
  }
  try {
    await t.test('existing exact package/lock guard executes; proposed dependency is NOT qualified', async () => {
      for (const option of ['changedPackage', 'changedLock']) {
        const f = fixture({ [option]: true });
        await assert.rejects(f.runSourceArtifactUpload(), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
        assert.deepEqual(f.events, []); assert.deepEqual(f.outputs, []);
      }
    });
    await t.test('upload awaits finalize then exact readback, closes input then private output', async () => {
      const f = fixture(); let settled = false; const result = f.runSourceArtifactUpload();
      result.then(() => { settled = true; }, () => { settled = true; }); await tick();
      assert.equal(settled, false); assert.deepEqual(f.events, ['open:14', 'upload']);
      f.upload.resolve(f.uploaded); await tick();
      assert.equal(settled, false); assert.deepEqual(f.outputs, []);
      assert.deepEqual(f.events, ['open:14', 'upload', 'readback']);
      f.readback.resolve(f.remote); await result;
      assert.deepEqual(f.events, ['open:14', 'upload', 'readback', 'close:14', 'closed:14', 'open:15', 'output', 'close:15', 'closed:15']);
      assert.match(f.outputs[0], new RegExp('archive_sha=' + f.zip + '\\n'));
      assert.match(f.outputs[0], new RegExp('sealed_sha=' + f.sha + '\\n'));
      assert.notEqual(f.sha, f.zip); assert.equal(f.retainedSourcePublicationWorkers.size, 0);
    });
    await t.test('wrong metadata, bare digest and changed sealed identity never yield ACK', async () => {
      for (const kind of ['id', 'name', 'digest', 'unsafe-id', 'sealed']) {
        const f = fixture(); const result = f.runSourceArtifactUpload();
        const rejected = assert.rejects(result, /SOURCE_(ARTIFACT|PUBLICATION)_/);
        await tick(); f.upload.resolve(kind === 'unsafe-id' ? { ...f.uploaded, id: Number.MAX_SAFE_INTEGER + 1 } : f.uploaded);
        await tick();
        if (kind === 'sealed') f.mutate();
        const remote = { ...f.remote.artifact };
        if (kind === 'id') remote.id = 18;
        if (kind === 'name') remote.name += '-different';
        if (kind === 'digest') remote.digest = f.zip;
        f.readback.resolve({ artifact: remote }); await rejected;
        assert.deepEqual(f.outputs, []); assert.equal(f.events.filter(e => e === 'upload').length, 1);
        assert.ok(f.retainedSourcePublicationWorkers.size > 0);
      }
    });
    await t.test('raw null survives secondary input close failure; no-op close never succeeds', async () => {
      const f = fixture({ closeFailure: 14 }); const result = f.runSourceArtifactUpload();
      const rejected = assert.rejects(result, e => e === null); await tick(); f.upload.reject(null); await rejected;
      assert.deepEqual(f.outputs, []); assert.ok(f.opened.has(14));
      assert.ok([...f.retainedSourcePublicationWorkers].some(row => row.first?.value === null));
      const g = fixture({ noopClose: 14 }); const work = g.runSourceArtifactUpload();
      const failed = assert.rejects(work, /CLOSE_UNPROVED/); await tick();
      g.upload.resolve(g.uploaded); g.readback.resolve(g.remote); await failed;
      assert.deepEqual(g.outputs, []); assert.ok(g.opened.has(14));
    });
    await t.test('checkpoint uses all actual normal factories and emits only after returned ACK', async () => {
      const f = fixture(); const result = f.runSourceCheckpointPublish(); await tick();
      assert.deepEqual(f.events, ['createProtectedRavScoreCheckpointVersionRequester',
        'createProtectedRavScoreCheckpointRpcRequester', 'createProtectedRavScoreCheckpointDiagnosticRequester', 'checkpoint']);
      assert.deepEqual(f.outputs, []); assert.equal(f.fetches.length, 1);
      f.checkpoint.resolve(f.cp); await result;
      assert.match(f.outputs[0], /checkpoint_version=3\n/);
      assert.deepEqual(f.events.slice(-4), ['open:15', 'output', 'close:15', 'closed:15']);
      assert.equal(f.retainedSourcePublicationWorkers.size, 0);
    });
    await t.test('private publisher gets real normal clients and fixed successor, not original B', async () => {
      const f = fixture(); const result = f.runSourcePrivatePublish(); await tick();
      assert.deepEqual(f.events, ['createProtectedPrivateRuntimeClients', 'private']);
      assert.equal(f.fetches.length, 2); assert.deepEqual(f.outputs, []);
      f.privatePublish.resolve({ ...f.priv, retentionCleanupComplete: false, retentionCleanupFailureCount: 1 });
      await result; assert.match(f.outputs[0], /private_retention_failures=1\n/);
      assert.deepEqual(f.events.slice(-4), ['open:15', 'output', 'close:15', 'closed:15']);
      assert.equal(f.retainedSourcePublicationWorkers.size, 0);
    });
    await t.test('publisher null and malformed ACK retain first failure without output', async () => {
      for (const mode of ['checkpoint', 'private']) for (const kind of ['null', 'bad']) {
        const f = fixture(); const result = mode === 'checkpoint' ? f.runSourceCheckpointPublish() : f.runSourcePrivatePublish();
        const failed = assert.rejects(result, kind === 'null' ? e => e === null : /PUBLISH_UNPROVED/);
        await tick(); const pending = mode === 'checkpoint' ? f.checkpoint : f.privatePublish;
        if (kind === 'null') pending.reject(null);
        else pending.resolve(mode === 'checkpoint' ? { ...f.cp, partCount: 672 } : { ...f.priv, privatePayloadLogged: true });
        await failed; assert.deepEqual(f.outputs, []); assert.ok(f.retainedSourcePublicationWorkers.size > 0);
      }
    });
    await t.test('output write null survives close failure and retained descriptor is not released', async () => {
      const f = fixture({ writeFailure: null, closeFailure: 15 });
      const result = f.runSourceCheckpointPublish(); const failed = assert.rejects(result, e => e === null);
      await tick(); f.checkpoint.resolve(f.cp); await failed;
      assert.deepEqual(f.outputs, []); assert.ok(f.opened.has(15));
      assert.ok([...f.retainedSourcePublicationWorkers].some(row => row.fd === 15 && row.first?.value === null));
    });
  } finally { loader.deregister(); delete globalThis[slot]; }
});

// Full normal action + genuine pointer validators/audit/client factory; remote
// publication return, HTTP and procfs/fds are synthetic, not hosted/kernel proof.
testOwnedRawCache('SOURCE private publication requires same-generation anonymous denial before ACK', async t => {
  const slot = Symbol.for('RavRadar.synthetic.sourcePublicationPrivacy');
  const root = '/synthetic/checkout', directory = root + '/.github/actions/save-owned-dmi-grib';
  const filename = directory + '/index.cjs';
  const privateUrl = ownedRawRequire('node:url').pathToFileURL(root + '/scripts/protected-private-production-runtime.mjs').href;
  const paths = ['scripts/protected-private-production-runtime.mjs',
    'scripts/private-production-runtime-bundle.mjs', 'scripts/lib/supabase-admin-rest.mjs',
    'js/core/ravscore-model-contract.js', 'js/core/ravscore-model-bundle.generated.js'];
  const [p, b, admin, contract, generated] = await Promise.all(paths.map(file =>
    fs.readFile(file, 'utf8').then(text => text.replaceAll('\r\n', '\n'))));
  const between = (source, start, end) => {
    assert.equal(source.split(start).length - 1, 1, start);
    const begin = source.indexOf(start), finish = source.indexOf(end, begin + start.length);
    assert.ok(finish > begin, end); return source.slice(begin, finish);
  };
  const policy = source => between(source,
    'export const PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY = Object.freeze({', '\n});') + '\n});\n';
  const modelImport = "import {\n  GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,\n  GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256,\n} from './ravscore-model-bundle.generated.js';\n";
  assert.equal(contract.split(modelImport).length - 1, 1);
  const normalSource = [generated, contract.replace(modelImport, ''), admin, policy(b),
    between(p, 'export const PROTECTED_PRIVATE_RUNTIME_POLICY', '\nconst LEGACY_ARCHIVE_KEYS'),
    between(p, 'const SHA256_PATTERN', '\nfunction assertObjectSetPolicy'),
    between(p, 'function assertObjectSetPolicy', '\nfunction effectiveEnvelopeByteLimit'),
    between(p, 'function exactKeys', '\nfunction safeArchivePath'),
    between(b, 'function canonicalValue', '\nconst sha256Buffer'),
    between(p, 'function canonicalBindingShape', '\nasync function validateArchiveEnvelope'),
    between(p, 'async function invokeDocumentRequest', '\nfunction assertStorage'),
    between(p, 'function assertStorage', '\nasync function verifyStoredObject'),
    between(p, 'function descriptorObjects', '\nfunction referencedObjectPaths'),
    between(p, 'export async function auditProtectedPrivateRuntimeAnonymousDenial', '\nfunction safeSupabaseUrl'),
    between(p, 'function safeSupabaseUrl', '\nfunction parseArguments'),
    'globalThis.normal={createProtectedPrivateRuntimeClients,auditProtectedPrivateRuntimeAnonymousDenial,'
      + 'PROTECTED_PRIVATE_RUNTIME_POLICY,PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,ravScoreModelBinding};',
  ].join('\n').replace(/^export /gm, '');
  const loader = registerOwnedRawHooks({ resolve(specifier, context, nextResolve) {
    if (specifier !== privateUrl) return nextResolve(specifier, context);
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(
      'const s=Symbol.for("RavRadar.synthetic.sourcePublicationPrivacy");'
      + 'export const PROTECTED_PRIVATE_RUNTIME_POLICY=globalThis[s].policy;'
      + 'export const createProtectedPrivateRuntimeClients=(...a)=>globalThis[s].clients(a);'
      + 'export const publishProtectedPrivateProductionRuntime=(o)=>globalThis[s].publish(o);'
      + 'export const auditProtectedPrivateRuntimeAnonymousDenial=(o)=>globalThis[s].audit(o);') };
  } });
  const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; });
    return { promise, resolve, reject }; };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  function fixture(options = {}) {
    const events = [], outputs = [], opened = new Set();
    const published = deferred(), anonymous = deferred();
    const target = '2026-10-14T10:00:00.000Z', head = '1'.repeat(40);
    const env = { INPUT_OPERATION: 'source', RUNNER_OS: 'Linux', GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1',
      GITHUB_REF: 'refs/heads/main', GITHUB_SERVER_URL: 'https://github.com', GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_SHA: head, GITHUB_REPOSITORY: 'synthetic/repo', GITHUB_OUTPUT: '/proc/12345/fd/9',
      RAVRADAR_PRODUCTION_TARGET_HOUR: target, SUPABASE_URL: 'https://synthetic.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_SYNTHETIC', RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND: 'supabase' };
    let pointer, clients;
    const normalContext = vmOwnedRawCache.createContext({ Buffer, URL, console, crypto, setTimeout,
      process: { env }, fetch: async (url, request) => {
        if (url.includes('/rest/v1/admin_documents?')) {
          events.push('pointer'); assert.equal(request.method ?? 'GET', 'GET');
          assert.equal(request.headers.apikey, 'sb_secret_SYNTHETIC');
          assert.equal(request.headers.Authorization, undefined);
          if (Object.hasOwn(options, 'pointerFailure')) throw options.pointerFailure;
          return { ok: true, status: 200, text: async () => JSON.stringify([pointer]) };
        }
        assert.ok(url.startsWith('https://synthetic.invalid/storage/v1/object/authenticated/'));
        events.push('anonymous'); assert.equal(request?.method ?? 'GET', 'GET');
        assert.equal(request?.headers?.apikey, undefined); assert.equal(request?.headers?.Authorization, undefined);
        const status = await anonymous.promise; return { ok: status === 200, status };
      } });
    new vmOwnedRawCache.Script(normalSource).runInContext(normalContext);
    const normal = normalContext.normal, policy = normal.PROTECTED_PRIVATE_RUNTIME_POLICY;
    const ack = { published: true, reason: 'protected-private-runtime-updated', centralVersion: 4,
      productionReferenceAt: target, privatePayloadLogged: false, rollbackAvailable: false,
      bundleContentSha256: 'e'.repeat(64), objectSha256: 'f'.repeat(64), objectCount: 1,
      retentionCleanupComplete: true, retentionCleanupFailureCount: 0 };
    const partSha = 'a'.repeat(64);
    pointer = { document_key: policy.documentKey, version: ack.centralVersion, payload: {
      schemaVersion: policy.schemaVersion, kind: policy.pointerKind, previous: null, current: {
        schemaVersion: policy.schemaVersion, kind: policy.descriptorKind, privacyClass: policy.privacyClass,
        bucketId: policy.bucketId, objectSha256: ack.objectSha256, objectBytes: 17, objectCount: 1,
        objects: [{ index: 0, objectPath: `bundles/sha256/${ack.objectSha256}/part-000-${partSha}.json.gz.part`,
          objectSha256: partSha, objectBytes: 17 }], bundleContentSha256: ack.bundleContentSha256,
        datasetId: 'rr-synthetic-private-audit', productionReferenceAt: target, generatedAt: target,
        sourceHead: head, modelBinding: normal.ravScoreModelBinding(),
        contractHashes: Object.fromEntries(normal.PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.requiredContractHashKeys
          .map(key => [key, 'b'.repeat(64)])),
      } } };
    options.changePointer?.(pointer);
    const fsFixture = {
      constants: ownedRawRequire('node:fs').constants,
      readFileSync(file) {
        if (file === '/proc/12345/cmdline') return Buffer.from('python3\0-I\0-B\0' + root
          + '/scripts/lib/copernicus_component_process.py\0--source-normal-program-cohort\0');
        if (file === root + '/.cache/private-production-runtime-expected.json') return '{"syntheticExpected":1}';
        throw Error('UNEXPECTED_READ:' + file);
      },
      openSync(file, flags) { assert.equal(file, env.GITHUB_OUTPUT);
        assert.equal(flags, this.constants.O_WRONLY | this.constants.O_APPEND);
        assert.equal(opened.size, 0); opened.add(15); events.push('open'); return 15; },
      fstatSync(fd) { assert.equal(fd, 15);
        if (!opened.has(fd)) { events.push('ebadf'); throw Object.assign(Error('SYNTHETIC_EBADF'), { code: 'EBADF' }); }
        return { isFile: () => true, nlink: 0n }; },
      writeFileSync(fd, text) { assert.ok(opened.has(fd)); events.push('output');
        if (Object.hasOwn(options, 'writeFailure')) throw options.writeFailure; outputs.push(text); },
      closeSync(fd) { assert.ok(opened.has(fd)); events.push('close');
        if (options.closeFailure) throw Error('SYNTHETIC_CLOSE'); opened.delete(fd); },
    };
    const module = { exports: {} };
    const require = name => name === 'node:fs' ? fsFixture : name === 'node:path' ? path.posix
      : name === 'node:child_process' ? { spawn() { throw Error('UNEXPECTED_CHILD'); } } : ownedRawRequire(name);
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports,
      __dirname: directory, __filename: filename, Buffer, URL, console,
      process: { platform: 'linux', versions: { node: '24.19.0' }, ppid: 12345, env, argv: ['node', filename] } });
    new vmOwnedRawCache.Script(ownedRawSource, { filename,
      importModuleDynamically: vmOwnedRawCache.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER }).runInContext(context);
    const api = vmOwnedRawCache.runInContext('({runSourcePrivatePublish,retainedSourcePublicationWorkers})', context);
    globalThis[slot] = { policy, clients(args) { assert.deepEqual(args, []); events.push('clients');
      clients = normal.createProtectedPrivateRuntimeClients(); return clients; },
      publish(args) { events.push('publish'); assert.equal(args.request, clients.documentRequest);
        assert.equal(args.storage, clients.storage); assert.equal(args.sourceHead, head);
        assert.equal(args.bundlePath, '/tmp/ravradar-private-production-runtime/bundle-source-successor');
        return published.promise; },
      async audit(args) { events.push('audit'); assert.equal(args.storage, clients.storage);
        assert.notEqual(args.request, clients.documentRequest);
        if (Object.hasOwn(options, 'auditFailure')) throw options.auditFailure;
        return normal.auditProtectedPrivateRuntimeAnonymousDenial(args); },
    };
    return { ...api, published, anonymous, ack, events, outputs, opened, pointer };
  }
  try {
    await t.test('actual normal audit waits after publication and precedes closed typed ACK', async () => {
      const f = fixture(); let settled = false;
      const result = f.runSourcePrivatePublish(); result.then(() => { settled = true; }, () => { settled = true; });
      await tick(); assert.deepEqual(f.events, ['clients', 'publish']); assert.equal(settled, false);
      f.published.resolve(f.ack); await tick();
      assert.deepEqual(f.events, ['clients', 'publish', 'audit', 'pointer', 'anonymous']);
      assert.equal(settled, false); assert.deepEqual(f.outputs, []);
      f.anonymous.resolve(403); await result;
      assert.deepEqual(f.events.slice(-4), ['open', 'output', 'close', 'ebadf']);
      assert.match(f.outputs[0], /private_anonymous_denied=true\n/);
      assert.equal(f.retainedSourcePublicationWorkers.size, 0);
    });
    await t.test('different publisher identity is refused before any anonymous probe or ACK', async () => {
      for (const field of ['version', 'productionReferenceAt', 'bundleContentSha256', 'objectSha256', 'objectCount']) {
        const f = fixture({ changePointer(row) {
          if (field === 'version') row.version++;
          else if (field === 'objectCount') row.payload.current[field]++;
          else if (field === 'productionReferenceAt') row.payload.current[field] = '2026-10-14T11:00:00.000Z';
          else row.payload.current[field] = '0'.repeat(64);
        } });
        const result = f.runSourcePrivatePublish(); const failed = assert.rejects(result, /AUDIT_GENERATION_UNPROVED/);
        f.published.resolve(f.ack); await failed;
        assert.equal(f.events.includes('anonymous'), false); assert.deepEqual(f.outputs, []);
        assert.ok(f.retainedSourcePublicationWorkers.size > 0);
      }
    });
    await t.test('unchanged full normal pointer validator rejects malformed object paths', async () => {
      const f = fixture({ changePointer(row) { row.payload.current.objects[0].objectPath += '-different'; } });
      const result = f.runSourcePrivatePublish(); const failed = assert.rejects(result, /part descriptor is invalid/);
      f.published.resolve(f.ack); await failed;
      assert.equal(f.events.includes('anonymous'), false); assert.deepEqual(f.outputs, []);
    });
    await t.test('public or unknown status and raw null never become a privacy ACK', async () => {
      for (const status of [200, 520]) {
        const f = fixture(); const result = f.runSourcePrivatePublish();
        const failed = assert.rejects(result, /anonymously readable/);
        f.published.resolve(f.ack); await tick();
        f.anonymous.resolve(status);
        await failed; assert.deepEqual(f.outputs, []); assert.ok(f.retainedSourcePublicationWorkers.size > 0);
      }
      const f = fixture({ auditFailure: null }); const result = f.runSourcePrivatePublish();
      const failed = assert.rejects(result, error => error === null); f.published.resolve(f.ack); await failed;
      assert.deepEqual(f.outputs, []);
      assert.ok([...f.retainedSourcePublicationWorkers].some(row => row.first?.value === null));
    });
    await t.test('audit denial still cannot release an unclosed output or replace first null', async () => {
      const f = fixture({ writeFailure: null, closeFailure: true });
      const result = f.runSourcePrivatePublish(); const failed = assert.rejects(result, error => error === null);
      f.published.resolve(f.ack); await tick(); f.anonymous.resolve(403); await failed;
      assert.deepEqual(f.outputs, []); assert.ok(f.opened.has(15));
      assert.ok([...f.retainedSourcePublicationWorkers].some(row => row.fd === 15 && row.first?.value === null));
    });
  } finally { loader.deregister(); delete globalThis[slot]; }
});

// Actual complete action/gates and normal owned-distribution parent are used.
// Child/cohort/lease/fs transport is synthetic, never Linux/SDK finalization.
testOwnedRawCache('distribution successor: exact V36 plus unchanged legacy and normal parent ACK', async t => {
  const root = '/synthetic/checkout', action = root + '/.github/actions/save-owned-dmi-grib';
  const legacySha = '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5';
  const successorSha = '920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47';
  function runtime(packageText, lockText, options = {}) {
    const events = [], outputs = [], lease = Object.freeze({ syntheticLease: true });
    let child, startedResolve; const started = new Promise(resolve => { startedResolve = resolve; });
    const files = { packageText, lockText };
    const processFixture = new OwnedRawEmitter(); Object.assign(processFixture, {
      platform: 'linux', versions: { node: '24.19.0' }, ppid: 12345, argv: ['node', action + '/index.cjs'],
      env: { GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', RUNNER_OS: 'Linux',
        GITHUB_SERVER_URL: 'https://github.com', GITHUB_OUTPUT: '/synthetic/output' },
    });
    const owner = {
      async acquireWeatherAcquisitionWriter() { events.push('acquire'); return lease; },
      async assertWeatherAcquisitionWriter(value) { assert.equal(value, lease); events.push('assert'); },
      async releaseWeatherAcquisitionWriter(value) { assert.equal(value, lease); events.push('release'); },
      retainWeatherAcquisitionWriter(value) { assert.equal(value, lease); events.push('retain'); },
    };
    const module = { exports: {} };
    const require = name => {
      if (name === 'node:fs') return {
        readFileSync(file) {
          if (Object.hasOwn(options, 'readError')) throw options.readError;
          if (file === action + '/package.json') return files.packageText;
          if (file === action + '/package-lock.json') return files.lockText;
          throw Error('UNEXPECTED_READ:' + file);
        },
        appendFileSync(file, text) { assert.equal(file, '/synthetic/output'); outputs.push(text); },
      };
      if (name === '../../../scripts/lib/weather-acquisition-writer.mjs') return owner;
      if (name === 'node:child_process') return { spawn(command, args, settings) {
        assert.equal(command, 'python3'); assert.deepEqual(Array.from(args), ['-B', root + '/scripts/run-owned-dmi-grib-save.py', '--prepare-distribution']);
        assert.equal(settings.cwd, root); assert.equal(settings.env, processFixture.env);
        assert.equal(settings.shell, false); assert.deepEqual(Array.from(settings.stdio), ['ignore', 'pipe', 'pipe', 'pipe']);
        child = new OwnedRawEmitter(); child.stdout = new OwnedRawPipe(); child.stderr = new OwnedRawPipe();
        child.stdio = [null, child.stdout, child.stderr, new OwnedRawPipe()]; events.push('spawn'); startedResolve(); return child;
      } };
      if (name === 'node:path') return path.posix;
      return ownedRawRequire(name);
    };
    const context = vmOwnedRawCache.createContext({ require, module, exports: module.exports, process: processFixture,
      __dirname: action, __filename: action + '/index.cjs', Buffer, URL, console });
    new vmOwnedRawCache.Script(ownedRawSource, { filename: action + '/index.cjs' }).runInContext(context);
    const invoke = expression => new vmOwnedRawCache.Script(expression).runInContext(context);
    async function close(receipt, { unknown = false } = {}) {
      const ends = [child.stdout, child.stderr, child.stdio[3]].map(pipe => ownedRawOnce(pipe, 'end'));
      child.stdout.end(unknown ? '' : JSON.stringify({ schemaVersion: 1, kind: 'DMI_RAW_SAVE_COHORT_CLOSED', workerExitCode: 0, interrupted: false }));
      child.stderr.end(); child.stdio[3].end(JSON.stringify(receipt)); await Promise.all(ends); child.emit('close', 0, null);
    }
    const dispose = () => { for (const stream of child?.stdio || []) stream?.destroy(); };
    return { invoke, ...module.exports, files, started, close, dispose, events, outputs };
  }
  const ready = lockSha256 => ({ schemaVersion: 1, kind: 'DMI_RAW_DISTRIBUTION_READY', apiVersion: '6.1.0', lockSha256 });
  await t.test('legacy gate remains legacy; successor is separately exact and preserves all49 literal entries', () => {
    const old = runtime(ownedRawPackage, ownedRawLock), next = runtime(ownedRawCurrentPackage, ownedRawCurrentLock);
    assert.equal(old.invoke('assertDistributionLock()'), action);
    assert.equal(old.invoke('assertAdmittedDistributionLock().lockSha256'), legacySha);
    assert.throws(() => old.invoke('assertArtifactDistributionSuccessor()'), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
    assert.throws(() => next.invoke('assertDistributionLock()'), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
    assert.equal(next.invoke('assertArtifactDistributionSuccessor()'), action);
    assert.equal(next.invoke('assertAdmittedDistributionLock().lockSha256'), successorSha);
    const before = JSON.parse(ownedRawLock), after = JSON.parse(ownedRawCurrentLock);
    assert.equal(Object.keys(before.packages).length - 1, 49); assert.equal(Object.keys(after.packages).length - 1, 259);
    for (const key of Object.keys(before.packages).filter(Boolean)) {
      assert.deepEqual(after.packages[key], before.packages[key]);
      const raw = '    ' + JSON.stringify(key) + ': ' + JSON.stringify(before.packages[key], null, 2).replaceAll('\n', '\n    ');
      assert.ok(ownedRawLock.includes(raw)); assert.ok(ownedRawCurrentLock.replaceAll('\r\n', '\n').includes(raw));
    }
  });
  await t.test('old/new row changes, unrelated insertion, mixed pairs and altered bytes all refuse before child', async () => {
    const altered = [];
    for (const key of ['node_modules/@actions/cache', 'node_modules/@actions/artifact']) {
      const lock = JSON.parse(ownedRawCurrentLock); lock.packages[key].integrity = 'sha512-changed'; altered.push(JSON.stringify(lock, null, 2) + '\n');
    }
    const extra = JSON.parse(ownedRawCurrentLock); extra.packages['node_modules/unrelated'] = { version: '1.0.0' }; altered.push(JSON.stringify(extra, null, 2) + '\n');
    altered.push(ownedRawCurrentLock + ' ');
    for (const [pkg, lock] of [...altered.map(lock => [ownedRawCurrentPackage, lock]),
      [ownedRawPackage, ownedRawCurrentLock], [ownedRawCurrentPackage, ownedRawLock],
      [ownedRawCurrentPackage + ' ', ownedRawCurrentLock]]) {
      const value = runtime(pkg, lock);
      await assert.rejects(value.runOwnedDistribution(), /DMI_RAW_DISTRIBUTION_LOCK_REFUSED/);
      assert.equal(value.events.includes('spawn'), false); assert.deepEqual(value.outputs, []);
    }
  });
  await t.test('first raw null is not retried through legacy fallback', async () => {
    const value = runtime(ownedRawCurrentPackage, ownedRawCurrentLock, { readError: null });
    let returned = false, caught = Symbol('not caught'); try { await value.runOwnedDistribution(); returned = true; } catch (error) { caught = error; }
    assert.equal(returned, false); assert.equal(caught, null); assert.equal(value.events.includes('spawn'), false); assert.deepEqual(value.outputs, []);
  });
  await t.test('normal parent accepts exact same distribution only after close and release', async () => {
    for (const [pkg, lock, expected] of [[ownedRawPackage, ownedRawLock, legacySha], [ownedRawCurrentPackage, ownedRawCurrentLock, successorSha]]) {
      const value = runtime(pkg, lock); try {
        const operation = value.runOwnedDistribution(); await value.started;
        assert.deepEqual(value.outputs, []); assert.equal(value.events.includes('release'), false);
        await value.close(ready(expected)); const result = await operation;
        assert.equal(result.distributionReady, true); assert.equal(Object.hasOwn(result, 'saved'), false);
        assert.deepEqual(value.outputs, ['distribution_ready=true\n']); assert.equal(value.events.includes('release'), true);
      } finally { value.dispose(); }
    }
  });
  await t.test('cross-family ACK, in-flight family replacement and unknown closure emit no success', async () => {
    for (const variant of ['cross-family', 'replacement', 'unknown-closure']) {
      const value = runtime(ownedRawCurrentPackage, ownedRawCurrentLock); try {
        const operation = value.runOwnedDistribution(); const rejected = assert.rejects(operation, variant === 'unknown-closure' ? /DMI_RAW_SAVE_RECEIPT_INVALID/ : /DMI_RAW_DISTRIBUTION_NOT_READY/);
        await value.started;
        if (variant === 'replacement') { value.files.packageText = ownedRawPackage; value.files.lockText = ownedRawLock; }
        await value.close(ready(variant === 'cross-family' ? legacySha : successorSha), { unknown: variant === 'unknown-closure' });
        await rejected; assert.deepEqual(value.outputs, []);
        assert.equal(value.events.includes('retain'), variant === 'unknown-closure');
        assert.equal(value.events.includes('release'), variant !== 'unknown-closure');
      } finally { value.dispose(); }
    }
  });
});
