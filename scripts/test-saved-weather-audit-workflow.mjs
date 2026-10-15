import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const text = fs.readFileSync('.github/workflows/audit-saved-weather-inputs.yml', 'utf8').replace(/\r\n/g, '\n');
const gh = value => '${{ ' + value + ' }}';

test('sealed-source diagnosis is fixed-artifact, source-gated, read-only and secret-separated', () => {
  const full = fs.readFileSync('.github/workflows/audit-sealed-current-source.yml', 'utf8').replace(/\r\n/g, '\n');
  const sealed = full.split('\n  inspect-oct8-arrow-score:')[0];
  assert.equal(full.split('\n  inspect-oct8-arrow-score:').length, 2, 'new fixed scope must be one isolated sibling job');
  const producer = fs.readFileSync('.github/workflows/reusable-weather-build.yml', 'utf8').replace(/\r\n/g, '\n');
  const masterBinding = /^\s+STAGED_PRIVATE_BUILD_MASTER_SECRET: (\$\{\{ secrets\.[A-Z_]+ \}\})$/m;
  const producerBinding = producer.match(masterBinding)?.[1];
  assert.equal(producerBinding, gh('secrets.SUPABASE_SERVICE_ROLE_KEY'));
  assert.equal(sealed.match(masterBinding)?.[1], producerBinding, 'reader must use the same existing master key as the actual seal producer');
  assert.doesNotMatch(sealed, /secrets\.STAGED_PRIVATE_BUILD_MASTER_SECRET/);
  assert.match(sealed, /group: ravradar-weather-production-v2/);
  assert.match(sealed, /cancel-in-progress: false/);
  assert.match(sealed, /test "\$GITHUB_SHA" = "\$EXPECTED_MAIN_HEAD"/);
  assert.match(sealed, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(sealed, /git diff --quiet bbc3c79fe555dffbff4a88af8cdf54573953efdb/);
  assert.match(sealed, /actions\/artifacts\/11281483201\/zip/);
  assert.match(sealed, /sha256sum --check --status/);
  assert.ok(sealed.indexOf('sha256sum --check --status') < sealed.indexOf(producerBinding));
  assert.ok(sealed.indexOf('test "$SOURCE_REQUIRED" = false') < sealed.indexOf(producerBinding));
  assert.equal((sealed.match(/secrets\./g) ?? []).length, 1);
  assert.doesNotMatch(sealed, /(?:contents|actions|pull-requests|pages|id-token): write|secrets: inherit|actions\/cache|restore-keys:/);
  assert.doesNotMatch(sealed, /node scripts\/(?:update-weather|protected-private-production-runtime|private-production-runtime-workflow)\.mjs|npm run|gh workflow run|\/logs|--publish|--migrate/);
  assert.match(sealed, /path: \$\{\{ runner.temp \}\}\/sealed-current-source-report.json/);
  assert.match(sealed, /default: LYNGBY_NEIGHBORS/);
  assert.match(sealed, /LYNGBY_NEIGHBORS\) test "\$CONFIRMATION" = READ-SEALED-LYNGBY-11281483201/);
  assert.match(sealed, /NATIONAL_210_673\) test "\$CONFIRMATION" = READ-SEALED-NATIONAL-11281483201/);
  assert.match(sealed, /\*\) exit 1/);
  assert.match(sealed, /--scope "\$INSPECTION_SCOPE"/);
  assert.match(sealed, /target.parent != root or target.is_symlink\(\)/);
});

test('new owner-approved Oct8 job is fixed-target, original-reader and secret-separated, not an old-target override', () => {
  const full = fs.readFileSync('.github/workflows/audit-sealed-current-source.yml', 'utf8').replace(/\r\n/g, '\n');
  const fresh = full.split('\n  inspect-oct8-arrow-score:')[1];
  assert.ok(fresh);
  assert.match(full, /inspect:\n    if: inputs.inspection_scope != 'OCT8_ARROW_SCORE_210_673'/);
  assert.match(fresh, /if: inputs.inspection_scope == 'OCT8_ARROW_SCORE_210_673'/);
  assert.match(fresh, /READ-SEALED-ARROW-SCORE-11558849419/);
  assert.match(fresh, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(fresh, /test "\$GITHUB_SHA" = "\$EXPECTED_MAIN_HEAD"/);
  assert.match(fresh, /actions\/runs\/37776075804\/attempts\/1/);
  assert.match(fresh, /actions\/artifacts\/11558849419\/zip/);
  assert.match(fresh, /stat -c %s .* = 213787612/);
  assert.match(fresh, /772b08cdcb97e22f4c39c5ed25cbf00aff0c971917e5679969b593dbc09e3b4a/);
  assert.match(fresh, /git archive e6b34db2d82d18b69fdeec21a63b8b10a6f6fa3d \| tar -x/);
  const secret = gh('secrets.SUPABASE_SERVICE_ROLE_KEY');
  assert.equal((fresh.match(/secrets\./g) ?? []).length, 1);
  assert.equal((full.match(/secrets\./g) ?? []).length, 2, 'same existing key once per mutually exclusive fixed job');
  assert.ok(fresh.indexOf('test "$SOURCE_REQUIRED" = false') < fresh.indexOf(secret));
  assert.ok(fresh.indexOf('sha256sum --check --status') < fresh.indexOf(secret));
  assert.match(fresh, /entry.compress_type != zipfile.ZIP_STORED/);
  assert.match(fresh, /len\(entries\) != 1 or entries\[0\].filename != 'sealed.bin'/);
  assert.match(fresh, /--producer-root "\$RUNNER_TEMP\/sealed-arrow-producer"/);
  assert.match(fresh, /path: \$\{\{ runner.temp \}\}\/sealed-arrow-score-safe.json/);
  assert.doesNotMatch(fresh, /11281483201|37136425685|audit-sealed-current-source\.mjs|secrets: inherit|actions\/cache|gh workflow run|--publish|--migrate|npm run/);
  assert.doesNotMatch(full, /(?:contents|actions|pull-requests|pages|id-token): write|set -x/);
  assert.match(fresh, /target.parent != root or target.is_symlink\(\)/);
});

test('saved-input audit is manual, source-gated main-only and cannot invoke production work', () => {
  assert.match(text, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(text, /^  (schedule|push|pull_request|workflow_run|workflow_call):/m);
  assert.match(text, /group: ravradar-weather-production-v2/);
  assert.match(text, /cancel-in-progress: false/);
  assert.match(text, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(text, /test "\$GITHUB_EVENT_NAME" = workflow_dispatch/);
  assert.match(text, /test "\$CONFIRMATION" = AUDIT-SAVED-WEATHER-INPUTS/);
  assert.match(text, /test "\$GITHUB_SHA" = "\$EXPECTED_MAIN_HEAD"/);
  assert.match(text, /git rev-parse HEAD\^\{commit\}/);
  assert.equal((text.match(/git\/ref\/heads\/main/g) ?? []).length, 2);
  assert.match(text, /node scripts\/weather-source-gate\.mjs check/);
  assert.match(text, /test "\$SOURCE_REQUIRED" = false/);
  assert.ok(text.indexOf('test "$SOURCE_REQUIRED" = false') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.doesNotMatch(text, /(?:contents|actions|pull-requests|pages|id-token): write/);
  assert.doesNotMatch(text, /uses: .*reusable-|npm run (?:update|build|release|validate)|node scripts\/(?:update-weather|protected-private-production-runtime|private-production-runtime-workflow)\.mjs/);
  assert.doesNotMatch(text, /secrets\.(?:DMI_API_KEY|COPERNICUS|OPEN_METEO|MET_NORWAY)/);
  assert.doesNotMatch(text, /secrets: inherit|actions\/cache\/save|--publish|--migrate|gh workflow run/);
});

test('audit binds encrypted cache to an exact normal source attempt without fallback', () => {
  assert.match(text, /actions\/runs\/\$SOURCE_RUN_ID\/attempts\/\$SOURCE_RUN_ATTEMPT/);
  for (const check of [
    '(.id | tostring) == $run', '(.run_attempt | tostring) == $attempt',
    '.repository.full_name == $repo', '.head_repository.full_name == $repo',
    '.head_branch == "main"', '.status == "completed"', '.event == "workflow_dispatch"',
    '.path == ".github/workflows/run-current-weather-once.yml"',
  ]) assert.ok(text.includes(check), check);
  assert.match(text, /git merge-base --is-ancestor "\$source_head" "\$GITHUB_SHA"/);
  assert.match(text, /weather-private-progress-encrypted-v2-Linux-main-\$SOURCE_RUN_ID-\$SOURCE_RUN_ATTEMPT/);
  assert.match(text, /uses: actions\/cache\/restore@v6/);
  assert.match(text, /fail-on-cache-miss: true/);
  assert.doesNotMatch(text, /restore-keys:|lookup-only:/);
  assert.match(text, /test "\$MATCHED_KEY" = "\$EXACT_KEY"/);
  assert.match(text, /test "\$CACHE_HIT" = true/);
  assert.match(text, /test ! -L \.cache\/weather-private-progress\.encrypted/);
  assert.match(text, /--progress-source "\$PROGRESS_SOURCE"/);
  assert.match(text, /--progress-cache-key "\$PROGRESS_CACHE_KEY"/);
});

test('audit isolates exact archived reader and exposes only the fixed safe report', () => {
  assert.match(text, /producer_head=.*\.sourceHead/);
  assert.match(text, /git merge-base --is-ancestor "\$producer_head" "\$GITHUB_SHA"/);
  assert.match(text, /git archive "\$producer_head" \| tar -x -C "\$RUNNER_TEMP\/ravradar-saved-input-predecessor"/);
  assert.match(text, /audit-saved-weather-inputs\.mjs describe/);
  assert.match(text, /audit-saved-weather-inputs\.mjs audit/);
  assert.match(text, /--predecessor-root "\$RUNNER_TEMP\/ravradar-saved-input-predecessor"/);
  assert.match(text, /--progress-file "\$RUNNER_TEMP\/ravradar-saved-input-audit\/progress\.encrypted"/);
  const uploads = [...text.matchAll(/uses: actions\/upload-artifact@[^\n]+([\s\S]*?)(?=\n      - |$)/g)];
  assert.equal(uploads.length, 1);
  assert.match(uploads[0][1], /path: \$\{\{ runner\.temp \}\}\/ravradar-saved-input-audit\/summary-safe\.json/);
  assert.doesNotMatch(uploads[0][1], /\*|descriptor|source\.json|progress\.encrypted|bundle|payload/);
  assert.match(uploads[0][1], /if-no-files-found: error/);
  assert.doesNotMatch(text, /cat .*source\.json|cat .*progress|set -x|env\s*$/m);
  assert.equal((text.match(/WEATHER_PROGRESS_MASTER_SECRET:/g) ?? []).length, 1);
});


test('optional RAW manifest audit defaults to exact same-run cache, never a provider or admission route', () => {
  assert.match(text, /include_raw_manifest:\n[\s\S]*?required: false\n        default: false\n        type: boolean/);
  assert.match(text, /raw_manifest_cache_key:\n[\s\S]*?required: false\n        default: ""\n        type: string/);
  assert.match(text, /RAW_MANIFEST_CACHE_KEY: \$\{\{ inputs\.raw_manifest_cache_key \}\}/);
  assert.match(text, /if test "\$INCLUDE_RAW_MANIFEST" = true; then/);
  assert.match(text, /if test -z "\$RAW_MANIFEST_SOURCE"; then\n\s+\[\[ "\$RAW_MANIFEST_CACHE_KEY"/);
  assert.ok(text.includes('^dmi-grib-v4-Linux-[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])-${SOURCE_RUN_ID}-${SOURCE_RUN_ATTEMPT}$'));
  assert.match(text, /gh api --method GET "repos\/\$GITHUB_REPOSITORY\/actions\/caches"/);
  for (const guard of ['.total_count == 1', '(.actions_caches | length) == 1',
    '.actions_caches[0].key == $key', '.actions_caches[0].ref == "refs/heads/main"',
    '.actions_caches[0].version == "9d434ae81d3120176028232ea936fc3f9dc0ed030022ff6d98bec91aa9cf117a"']) assert.ok(text.includes(guard), guard);
  assert.match(text, /test -z "\$RAW_MANIFEST_CACHE_KEY"/);
  assert.doesNotMatch(text, /date -u.*%G|\.created_at|\.run_started_at/);
  const raw = text.split('      - name: Optionally restore the exact same-run RAW cache for manifest counts\n')[1]
    .split('      - name: Read the current protected source identity without storage writes\n')[0];
  assert.equal((raw.match(/if: inputs\.include_raw_manifest == true/g) ?? []).length, 2);
  assert.equal((raw.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 1);
  assert.match(raw, /path: \.cache\/dmi-grib\n/);
  assert.match(raw, /key: \$\{\{ steps\.authority\.outputs\.raw_cache_key \}\}/);
  assert.match(raw, /fail-on-cache-miss: true/);
  assert.match(raw, /test "\$CACHE_HIT" = true/);
  assert.match(raw, /test "\$MATCHED_KEY" = "\$EXACT_KEY"/);
  assert.match(raw, /test ! -L \.cache\/dmi-grib\/asset-manifest\.json/);
  assert.doesNotMatch(raw, /restore-keys:|lookup-only:|save@|\.grib\b|curl|wget|sha256sum/);
  const producer = fs.readFileSync('.github/workflows/reusable-weather-build.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.match(producer, /id: dmi-grib-cache-restore\n        with:\n          path: \.cache\/dmi-grib\n/);
  assert.match(text, /--include-raw-manifest "\$INCLUDE_RAW_MANIFEST"/);
  assert.match(text, /RAW_MANIFEST_ARGS: \$\{\{ inputs\.include_raw_manifest && format\('--raw-cache-key \{0\}', steps\.authority\.outputs\.raw_cache_key\) \|\| '' \}\}/);
  assert.equal((text.match(/git\/ref\/heads\/main/g) ?? []).length, 2);
  assert.doesNotMatch(text, /restore-keys:|actions\/cache\/save|update-dmi-bulk\.py|build-current-operational-closure/);
});

test('older RAW source is one explicit fixed read scope and cannot relabel authenticated progress', () => {
  assert.match(text, /raw_manifest_source:\n[\s\S]*?required: false\n        default: ""\n        type: string/);
  assert.match(text, /RAW_MANIFEST_SOURCE: \$\{\{ inputs\.raw_manifest_source \}\}/);
  assert.match(text, /test "\$RAW_MANIFEST_SOURCE" = 38577766010-1/);
  assert.match(text, /test "\$RAW_MANIFEST_CACHE_KEY" = dmi-grib-v4-Linux-2026-W42-38577766010-1/);
  const scope = text.split('if test -n "$RAW_MANIFEST_SOURCE"; then')[1].split('\n          fi')[0];
  assert.ok(scope.includes('test "$SOURCE_RUN_ID" = 38692413809'));
  assert.ok(scope.includes('test "$SOURCE_RUN_ATTEMPT" = 1'));
  assert.ok(scope.includes('test "$PROGRESS_BASELINE_TARGET_HOUR" = 2026-10-14T18:00:00.000Z'));
  for (const guard of [
    'actions/runs/38577766010/attempts/1', '.id == 38577766010 and .run_attempt == 1',
    '.head_sha == "584e0e19530ce14f8d4f15c20ea3fbee9dd63e7e"',
    'git merge-base --is-ancestor 584e0e19530ce14f8d4f15c20ea3fbee9dd63e7e "$GITHUB_SHA"',
    '.actions_caches[0].id == 8945631595', '.actions_caches[0].size_in_bytes == 2614349607',
  ]) assert.ok(text.includes(guard), guard);
  const older = text.split('gh api "repos/$GITHUB_REPOSITORY/actions/runs/38577766010/attempts/1"')[1]
    .split('gh api --method GET "repos/$GITHUB_REPOSITORY/actions/caches"')[0];
  for (const guard of ['.repository.full_name == $repo', '.head_repository.full_name == $repo',
    '.head_branch == "main"', '.event == "workflow_dispatch"', '.status == "completed"',
    '.path == ".github/workflows/run-current-weather-once.yml"']) assert.ok(older.includes(guard), guard);
  assert.ok(text.indexOf('test "$RAW_MANIFEST_SOURCE" = 38577766010-1') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.match(text, /PROGRESS_SOURCE: \$\{\{ inputs\.progress_source_run_id \}\}-\$\{\{ inputs\.progress_source_attempt \}\}/);
  assert.match(text, /PROGRESS_CACHE_KEY: \$\{\{ steps\.authority\.outputs\.cache_key \}\}/);
  assert.match(text, /RAW_SOURCE_ARGS: \$\{\{ inputs\.raw_manifest_source != '' && format\('--raw-manifest-source \{0\}', inputs\.raw_manifest_source\) \|\| '' \}\}/);
  assert.ok(text.includes('${RAW_SOURCE_ARGS}'));
  assert.doesNotMatch(text, /restore-keys:|actions\/cache\/save|update-dmi-bulk\.py|sha256sum/);
  assert.equal((text.match(/^      [a-z_]+:\n        description:/gm) ?? []).length, 9, 'seven original inputs and two bounded default-off inputs');
});

test('RAW file presence is separate default-off metadata inventory, not numeric inspection', () => {
  assert.match(text, /include_raw_file_presence:\n[\s\S]*?required: false\n        default: false\n        type: boolean/);
  assert.match(text, /INCLUDE_RAW_FILE_PRESENCE: \$\{\{ inputs\.include_raw_file_presence \}\}/);
  assert.match(text, /if test "\$INCLUDE_RAW_FILE_PRESENCE" = true; then\n\s+test "\$INCLUDE_RAW_MANIFEST" = true/);
  assert.match(text, /if test "\$INCLUDE_RAW_FILE_PRESENCE" = true; then\n\s+test "\$INCLUDE_RAW_MANIFEST" = true\n\s+test "\$RAW_MANIFEST_SOURCE" = 38577766010-1/);
  assert.ok(text.indexOf('if test "$INCLUDE_RAW_FILE_PRESENCE" = true; then') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.match(text, /--include-raw-file-presence "\$INCLUDE_RAW_FILE_PRESENCE"/);
  assert.match(text, /path: \.cache\/dmi-grib\n/);
  assert.equal((text.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 2, 'one progress and one exact RAW restore only');
  assert.equal((text.match(/uses: actions\/upload-artifact@/g) ?? []).length, 1);
});

test('normal progress baseline reconstruction is explicit, default-off, exact-hour and audit-only', () => {
  assert.match(text, /progress_baseline_target_hour:\n[\s\S]*?required: false\n        default: ""\n        type: string/);
  assert.match(text, /PROGRESS_BASELINE_TARGET_HOUR: \$\{\{ inputs\.progress_baseline_target_hour \}\}/);
  assert.match(text, /if test -n "\$PROGRESS_BASELINE_TARGET_HOUR"; then/);
  assert.ok(text.includes('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00\\.000Z$'));
  assert.ok(text.indexOf('if test -n "$PROGRESS_BASELINE_TARGET_HOUR"; then') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.ok(text.includes('${PROGRESS_BASELINE_ARGS}'));
  assert.match(text, /PROGRESS_BASELINE_ARGS: \$\{\{ inputs\.progress_baseline_target_hour != '' && format\('--progress-baseline-target-hour \{0\}', inputs\.progress_baseline_target_hour\) \|\| '' \}\}/);
  assert.doesNotMatch(text, /(?:contents|actions|pull-requests|pages|id-token): write|actions\/cache\/save|gh workflow run|--publish/);
  assert.equal((text.match(/uses: actions\/upload-artifact@/g) ?? []).length, 1);
});
