import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const completeWorkflow = fs.readFileSync('.github/workflows/audit-saved-weather-inputs.yml', 'utf8').replace(/\r\n/g, '\n');
function beforeVoersaaWaterTrace(value){
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  if(sha(value)==='4914d1497204b37dbf0407b2d3d2c98a638054b8f11ee070dc2afd7e33aa7b28'){
    assert.equal(value.split("and .path==$workflow and .status==\"completed\"").length,2);value=value.replace("and .path==$workflow and .status==\"completed\"","and .path==\".github/workflows/run-current-weather-once.yml\" and .status==\"completed\"");
    assert.equal(value.split("jq -e --arg repo \"$GITHUB_REPOSITORY\" --arg run \"$run\" --arg head \"$head\" --arg workflow \"$workflow\" '").length,2);value=value.replace("jq -e --arg repo \"$GITHUB_REPOSITORY\" --arg run \"$run\" --arg head \"$head\" --arg workflow \"$workflow\" '","jq -e --arg repo \"$GITHUB_REPOSITORY\" --arg run \"$run\" --arg head \"$head\" '");
    assert.equal(value.split("read -r run head workflow <<< \"$pair\"").length,2);value=value.replace("read -r run head workflow <<< \"$pair\"","read -r run head <<< \"$pair\"");
    assert.equal(value.split("for pair in '41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842 .github/workflows/update-and-deploy.yml' '41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae .github/workflows/run-current-weather-once.yml'; do").length,2);value=value.replace("for pair in '41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842 .github/workflows/update-and-deploy.yml' '41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae .github/workflows/run-current-weather-once.yml'; do","for pair in '41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842' '41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae'; do");
    assert.equal(sha(value),'7ab179fa390a7921af2d4d87a5bd562c4d43ab8d68d25eb570540ef34852aa0d','VOERSAA_EXACT_RUN_WORKFLOW_INVERSE_CHANGED');
  }
  if(sha(value)==='c0b58c930ff808e196790dacc30eb6caa3cd0905e87da89c25ac2f3d517f2832')return value;
  assert.equal(sha(value),'7ab179fa390a7921af2d4d87a5bd562c4d43ab8d68d25eb570540ef34852aa0d','VOERSAA_WHOLE_WORKFLOW_INPUT_CHANGED');
  const sibling=value.slice(value.indexOf('\n  voersaa-water-trace:'));
  assert.equal(sibling.length,6353);assert.equal(sha(sibling),'6d759d286001d06ff1faf31222f1e1c0e97b5da8ccd99aa0b399d49f67855531');
  value=value.slice(0,-sibling.length);
  const start=value.indexOf('\n      water_level_voersaa_trace_20261101:'),end=value.indexOf('\npermissions:',start);
  const input=value.slice(start,end);assert.equal(input.length,226);assert.equal(sha(input),'8a27fd5be0134567f6bbe59aec0aefc373612b92ba70e2f36372cf6a9b3ce590');
  value=value.slice(0,start)+value.slice(end);
  for(const operator of ['!=','==']){const from='    if: inputs.component_summary_only '+operator+' true && inputs.water_level_voersaa_trace_20261101 != true\n';
    assert.equal(value.split(from).length,2);value=value.replace(from,'    if: inputs.component_summary_only '+operator+' true\n');}
  assert.equal(sha(value),'c0b58c930ff808e196790dacc30eb6caa3cd0905e87da89c25ac2f3d517f2832','VOERSAA_WHOLE_WORKFLOW_INVERSE_CHANGED');return value;
}
const actualWorkflow = beforeVoersaaWaterTrace(completeWorkflow);
const workflowSha = value => crypto.createHash('sha256').update(value).digest('hex');
const oldWorkflowSha = '2772625366db6c0425b6e7a42ad2d09f16cd0d60ddd9eeb90a6efba524b8e53f';
const summaryWorkflowSha = 'c0b58c930ff808e196790dacc30eb6caa3cd0905e87da89c25ac2f3d517f2832';
// A finite, whole-file inverse preserves every older assertion below. No
// unknown workflow, broad regex stripping or new job can pass as the old job.
function legacyAuditWorkflow(value) {
  if (workflowSha(value) === oldWorkflowSha) return value;
  assert.equal(workflowSha(value), summaryWorkflowSha, 'B_ONLY_WORKFLOW_INPUT_CHANGED');
  const once = needle => {
    assert.equal(value.split(needle).length, 2, 'B_ONLY_WORKFLOW_INVERSE_NON_UNIQUE');
    value = value.replace(needle, '');
  };
  const marker = '\n  component-summary:';
  assert.equal(value.split(marker).length, 2, 'B_ONLY_WORKFLOW_SIBLING_NON_UNIQUE');
  const sibling = value.slice(value.indexOf(marker));
  assert.equal(sibling.length, 7426);
  once(sibling);
  const inputStart = '\n      component_summary_only:';
  assert.equal(value.split(inputStart).length, 2, 'B_ONLY_WORKFLOW_INPUT_NON_UNIQUE');
  const inputAt = value.indexOf(inputStart), inputEnd = value.indexOf('\npermissions:', inputAt);
  assert.ok(inputEnd > inputAt);
  const inputs = value.slice(inputAt, inputEnd);
  assert.equal(inputs.length, 593);
  once(inputs);
  once('    if: inputs.component_summary_only != true\n');
  once('          COMPONENT_SUMMARY_DATASET: ${{ inputs.component_summary_dataset_id }}\n'
    + '          COMPONENT_SUMMARY_REFERENCE: ${{ inputs.component_summary_reference_at }}\n');
  once('          test -z "$COMPONENT_SUMMARY_DATASET"\n          test -z "$COMPONENT_SUMMARY_REFERENCE"\n');
  assert.equal(workflowSha(value), oldWorkflowSha, 'B_ONLY_WORKFLOW_WHOLE_INVERSE_CHANGED');
  return value;
}
const text = legacyAuditWorkflow(actualWorkflow);
const gh = value => '${{ ' + value + ' }}';

test('B-only summary workflow: exact finite inverse preserves the entire old audit and rejects any drift', () => {
  assert.equal(workflowSha(text), oldWorkflowSha);
  assert.equal(legacyAuditWorkflow(text), text);
  for (const changed of [actualWorkflow + '\n# unknown drift\n',
    actualWorkflow.replace('component_summary_only != true', 'component_summary_only == true'),
    actualWorkflow.replace('default: false\n        type: boolean\n      component_summary_dataset_id:',
      'default: true\n        type: boolean\n      component_summary_dataset_id:'),
    actualWorkflow.replace('  component-summary:\n', ''),
    actualWorkflow + actualWorkflow.slice(actualWorkflow.indexOf('\n  component-summary:'))]) {
    assert.notEqual(changed, actualWorkflow);
    assert.throws(() => legacyAuditWorkflow(changed), /B_ONLY_WORKFLOW_INPUT_CHANGED/);
  }
});

test('B-only summary workflow: default OFF has exclusive read-only jobs and exact expected-generation pins', () => {
  const job = actualWorkflow.split('\n  component-summary:')[1];
  assert.ok(job);
  assert.match(actualWorkflow, /component_summary_only:\n[^\n]*\n        required: false\n        default: false\n        type: boolean/);
  assert.match(actualWorkflow, /audit:\n    if: inputs\.component_summary_only != true/);
  assert.match(job, /if: inputs\.component_summary_only == true/);
  assert.match(actualWorkflow, /permissions:\n  contents: read\n  actions: read\n  pull-requests: read/);
  assert.match(actualWorkflow, /group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  assert.match(job, /timeout-minutes: 30/);
  for (const check of ['test "$GITHUB_EVENT_NAME" = workflow_dispatch', 'test "$GITHUB_REF" = refs/heads/main',
    'test "$CONFIRMATION" = AUDIT-SAVED-WEATHER-INPUTS', 'test "$GITHUB_SHA" = "$EXPECTED_MAIN_HEAD"',
    '.status=="completed"', '.head_branch=="main"', '.event=="workflow_dispatch"',
    '.path==".github/workflows/run-current-weather-once.yml"',
    'git merge-base --is-ancestor "$source_head" "$GITHUB_SHA"',
    'git merge-base --is-ancestor "$producer_head" "$GITHUB_SHA"']) assert.ok(job.includes(check), check);
  assert.equal((job.match(/git\/ref\/heads\/main/g) ?? []).length, 2);
  assert.match(job, /node scripts\/weather-source-gate\.mjs check/);
  assert.match(job, /test "\$SOURCE_REQUIRED" = false/);
  assert.ok(job.indexOf('test "$SOURCE_REQUIRED" = false') < job.indexOf(gh('secrets.SUPABASE_URL')));
  const beforeSecrets = job.slice(0, job.indexOf(gh('secrets.SUPABASE_URL')));
  for (const flag of ['INCLUDE_RAW_MANIFEST', 'INCLUDE_RAW_FILE_PRESENCE', 'INCLUDE_SELECTED_CURRENT_PREFLIGHT',
    'INCLUDE_CURRENT_WINDOW_DIAGNOSTIC', 'INCLUDE_CURRENT586_ENDPOINTS', 'INCLUDE_CURRENT586_CACHED_ORIGINALS']) {
    assert.ok(beforeSecrets.includes('"$' + flag + '"'), flag);
  }
  assert.match(beforeSecrets, /test "\$flag" = false/);
  for (const flag of ['RAW_MANIFEST_CACHE_KEY', 'RAW_MANIFEST_SOURCE', 'PROGRESS_BASELINE_TARGET_HOUR']) {
    assert.ok(beforeSecrets.includes('test -z "$' + flag + '"'), flag);
  }
  assert.match(beforeSecrets, /new Date\(reference\)\.toISOString\(\)!==reference/);
  assert.match(job, /--expected-dataset "\$EXPECTED_DATASET_ID"/);
  assert.match(job, /--expected-reference "\$EXPECTED_REFERENCE_AT"/);
  assert.match(job, /EXPECTED_DATASET_ID: \$\{\{ inputs\.component_summary_dataset_id \}\}/);
  assert.match(job, /EXPECTED_REFERENCE_AT: \$\{\{ inputs\.component_summary_reference_at \}\}/);
});

test('B-only summary workflow: archived normal B reader has no progress, RAW, provider or production branch', () => {
  const job = actualWorkflow.split('\n  component-summary:')[1];
  assert.match(job, /git archive "\$producer_head" \| tar -x -C "\$RUNNER_TEMP\/ravradar-saved-input-predecessor"/);
  assert.match(job, /audit-saved-weather-inputs\.mjs describe/);
  assert.match(job, /audit-saved-weather-inputs\.mjs component-summary/);
  assert.doesNotMatch(job, /audit-saved-weather-inputs\.mjs audit(?:\s|$)/);
  assert.doesNotMatch(job, /actions\/cache|setup-python|pip install|WEATHER_PROGRESS_MASTER_SECRET|progress\.encrypted|dmi-grib-v4|restore-keys:/);
  assert.doesNotMatch(job, /secrets\.(?:DMI|COPERNICUS|OPEN_METEO)|secrets: inherit|set -x|npm run|gh workflow run|--publish|--migrate/);
  assert.doesNotMatch(job, /node scripts\/(?:update-weather|build-|release-|protected-private-production-runtime|private-production-runtime-workflow)/);
  assert.doesNotMatch(actualWorkflow, /(?:contents|actions|pull-requests|pages|id-token): write/);
  const uploads = [...job.matchAll(/uses: actions\/upload-artifact@[^\n]+([\s\S]*?)(?=\n      - |$)/g)];
  assert.equal(uploads.length, 1);
  assert.match(uploads[0][1], /name: saved-weather-component-summary-safe-/);
  assert.match(uploads[0][1], /path: \$\{\{ runner\.temp \}\}\/ravradar-saved-input-audit\/summary-safe\.json/);
  assert.match(uploads[0][1], /if-no-files-found: error/);
  assert.doesNotMatch(uploads[0][1], /\*|descriptor|source\.json|progress\.encrypted|bundle|payload/);
});

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
    .split('      # This separate fixed CURRENT profile restores the same indivisible normal\n')[0];
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
  assert.equal((text.match(/^      [a-z_]+:\n        description:/gm) ?? []).length, 11, 'all ten previous inputs plus one bounded default-off current-window diagnosis');
});

test('RAW file presence is separate default-off metadata inventory, not numeric inspection', () => {
  assert.match(text, /include_raw_file_presence:\n[\s\S]*?required: false\n        default: false\n        type: boolean/);
  assert.match(text, /INCLUDE_RAW_FILE_PRESENCE: \$\{\{ inputs\.include_raw_file_presence \}\}/);
  assert.match(text, /if test "\$INCLUDE_RAW_FILE_PRESENCE" = true; then\n\s+test "\$INCLUDE_RAW_MANIFEST" = true/);
  assert.match(text, /if test "\$INCLUDE_RAW_FILE_PRESENCE" = true; then\n\s+test "\$INCLUDE_RAW_MANIFEST" = true\n\s+test "\$RAW_MANIFEST_SOURCE" = 38577766010-1/);
  assert.ok(text.indexOf('if test "$INCLUDE_RAW_FILE_PRESENCE" = true; then') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.match(text, /--include-raw-file-presence "\$INCLUDE_RAW_FILE_PRESENCE"/);
  assert.match(text, /path: \.cache\/dmi-grib\n/);
  assert.equal((text.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 3,
    'old progress and manifest restores plus one separately guarded CURRENT proof restore');
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

test('selected-current preflight is default-off, exact saved scope and never restores RAW', () => {
  assert.match(text, /include_selected_current_preflight:\n[\s\S]*?required: false\n        default: false\n        type: boolean/);
  assert.equal((text.match(/INCLUDE_SELECTED_CURRENT_PREFLIGHT: \$\{\{ inputs\.include_selected_current_preflight \}\}/g) ?? []).length, 2);
  assert.ok(text.includes('[[ "$INCLUDE_SELECTED_CURRENT_PREFLIGHT" == true || "$INCLUDE_SELECTED_CURRENT_PREFLIGHT" == false ]]'));
  const scope = text.split('if test "$INCLUDE_SELECTED_CURRENT_PREFLIGHT" = true; then')[1]?.split('\n          fi')[0];
  assert.ok(scope, 'one explicit pre-secret gate');
  for (const guard of [
    'test "$INCLUDE_RAW_MANIFEST" = false',
    'test "$INCLUDE_RAW_FILE_PRESENCE" = false',
    'test -z "$RAW_MANIFEST_SOURCE"',
    'test -z "$RAW_MANIFEST_CACHE_KEY"',
    'case "$SOURCE_RUN_ID-$SOURCE_RUN_ATTEMPT:$PROGRESS_BASELINE_TARGET_HOUR" in',
    '38692413809-1:2026-10-14T18:00:00.000Z|38768040429-1:2026-10-15T16:00:00.000Z) ;;',
    '*) exit 1 ;;',
  ]) assert.ok(scope.includes(guard), guard);
  assert.ok(text.indexOf('if test "$INCLUDE_SELECTED_CURRENT_PREFLIGHT" = true; then') < text.indexOf(gh('secrets.SUPABASE_URL')));
  assert.match(text, /--include-selected-current-preflight "\$INCLUDE_SELECTED_CURRENT_PREFLIGHT"/);
  assert.equal((text.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 3,
    'the new CURRENT-only restore is separate and cannot run with selected preflight');
  assert.equal((text.match(/uses: actions\/upload-artifact@/g) ?? []).length, 1, 'same bounded report only');
  assert.doesNotMatch(text, /(?:contents|actions|pull-requests|pages|id-token): write|actions\/cache\/save|run-exact-dmi-original-restore|update-dmi-bulk\.py|secrets\.DMI_API_KEY/);
});

test('CURRENT586 cached originals have one independent default-off exact-cache proof route, never weather or publication', () => {
  assert.match(text, /include_current586_cached_originals:\n[\s\S]*?required: false\n        default: false\n        type: boolean/);
  const scope = text.split('if test "$INCLUDE_CURRENT586_CACHED_ORIGINALS" = true; then')[1]?.split('\n          fi')[0];
  assert(scope);
  for (const name of ['CURRENT586_ENDPOINTS', 'CURRENT_WINDOW_DIAGNOSTIC', 'SELECTED_CURRENT_PREFLIGHT', 'RAW_MANIFEST', 'RAW_FILE_PRESENCE'])
    assert(scope.includes('test "$INCLUDE_' + name + '" = false'));
  for (const name of ['RAW_MANIFEST_SOURCE', 'RAW_MANIFEST_CACHE_KEY', 'PROGRESS_BASELINE_TARGET_HOUR'])
    assert(scope.includes('test -z "$' + name + '"'));
  assert(scope.includes('test "$SOURCE_RUN_ID-$SOURCE_RUN_ATTEMPT" = 39666991481-1'));
  for (const pin of ['.actions_caches[0].id == 9250979458', '.actions_caches[0].size_in_bytes == 2729841089',
    'dmi-grib-v4-Linux-2026-W43-39520623069-1', '.actions_caches[0].version == "9d434ae81d3120176028232ea936fc3f9dc0ed030022ff6d98bec91aa9cf117a"']) assert(text.includes(pin), pin);
  const restore = text.split('      - name: Restore only the fixed CURRENT586 original RAW cache\n')[1]
    ?.split('      - name: Create only the CURRENT586 diagnostic private root\n')[0];
  assert(restore);
  assert.equal((restore.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 1);
  assert.equal((restore.match(/if: inputs\.include_current586_cached_originals == true/g) ?? []).length, 2);
  assert.match(restore, /path: \.cache\/dmi-grib/);
  assert.match(restore, /key: \$\{\{ steps\.authority\.outputs\.current586_cached_raw_key \}\}/);
  assert.match(restore, /test "\$CACHE_HIT" = true/);
  assert.match(restore, /test "\$MATCHED_KEY" = "\$EXACT_KEY"/);
  assert.doesNotMatch(restore, /restore-keys:|save@|curl|wget/);
  assert.equal((text.match(/if: inputs\.include_current586_endpoints != true && inputs\.include_current586_cached_originals != true/g) ?? []).length, 3);
  const run = text.split('      - name: Prove only fixed CURRENT586 cached native originals in private scratch\n')[1]
    ?.split('      - name: Upload only the fixed-schema payload-free aggregate report\n')[0];
  assert(run); assert.match(run, /--include-current586-cached-originals true/);
  assert.match(run, /--progress-source 39666991481-1/);
  assert.doesNotMatch(run, /progress-file|WEATHER_PROGRESS_MASTER_SECRET|include-current586-endpoints|update-weather|deploy|publish/);
  assert.doesNotMatch(text, /(?:contents|actions|pull-requests|pages|id-token): write|actions\/cache\/save|gh workflow run|--publish/);
});

test('Voersaa fixed water trace workflow: exact additive inverse preserves every historical whole oracle',()=>{
  assert.equal(workflowSha(beforeVoersaaWaterTrace(completeWorkflow)),summaryWorkflowSha);
  for(const changed of [completeWorkflow+'\n# drift\n',completeWorkflow.replace('voersaa-water-trace:\n','other-job:\n'),
    completeWorkflow.replace('water_level_voersaa_trace_20261101 != true','water_level_voersaa_trace_20261101 == true'),
    completeWorkflow.replace('retention-days: 1\n','retention-days: 14\n')])
    assert.throws(()=>beforeVoersaaWaterTrace(changed),/VOERSAA_WHOLE_WORKFLOW_INPUT_CHANGED/);
});
test('Voersaa fixed water trace workflow: one fixed job is gated before secrets and archives genuine readers only',()=>{
  const job=completeWorkflow.slice(completeWorkflow.indexOf('\n  voersaa-water-trace:'));
  assert.match(completeWorkflow,/water_level_voersaa_trace_20261101:\n[^\n]*\n        required: false\n        default: false\n        type: boolean/);
  assert.match(completeWorkflow,/audit:\n    if: inputs\.component_summary_only != true && inputs\.water_level_voersaa_trace_20261101 != true/);
  assert.match(completeWorkflow,/component-summary:\n    if: inputs\.component_summary_only == true && inputs\.water_level_voersaa_trace_20261101 != true/);
  assert.match(job,/if: inputs\.water_level_voersaa_trace_20261101 == true/);
  assert.match(completeWorkflow,/group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  assert.match(job,/test "\$SOURCE_REQUIRED" = false/);
  assert(job.indexOf('test "$SOURCE_REQUIRED" = false')<job.indexOf(gh('secrets.SUPABASE_URL')));
  for(const exact of ['test "$GITHUB_SHA" = "$EXPECTED_MAIN_HEAD"','git/ref/heads/main','weather-source-gate.mjs check',
    '41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842','41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae',
    '.run_attempt==1 and .head_sha==$head','git -c protocol.allow=never merge-base --is-ancestor "$head" "$GITHUB_SHA"',
    'git -c protocol.allow=never archive 7a08f6a8dfb2131898e7270a2429c3f4f810a842',
    'git -c protocol.allow=never archive 37a34703d9ae8bfb2c28056f21a7ea73944033ae'])assert(job.includes(exact),exact);
  assert(job.includes('41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842 .github/workflows/update-and-deploy.yml'));
  assert(job.includes('41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae .github/workflows/run-current-weather-once.yml'));
  assert(job.includes('read -r run head workflow <<< "$pair"'));
  assert(job.includes('--arg workflow "$workflow"'));
  assert(job.includes('and .path==$workflow and .status=="completed"'));
  assert.doesNotMatch(job,/\.conclusion\s*==\s*"success"/);
  for(const wrong of [
    completeWorkflow.replace('41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842 .github/workflows/update-and-deploy.yml','41231144384 7a08f6a8dfb2131898e7270a2429c3f4f810a842 .github/workflows/run-current-weather-once.yml'),
    completeWorkflow.replace('41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae .github/workflows/run-current-weather-once.yml','41256251412 37a34703d9ae8bfb2c28056f21a7ea73944033ae .github/workflows/update-and-deploy.yml')])
    assert.throws(()=>beforeVoersaaWaterTrace(wrong),/VOERSAA_WHOLE_WORKFLOW_INPUT_CHANGED/);
  assert.equal((job.match(/water-level-voersaa-20261101/g)??[]).length,1);
  assert.doesNotMatch(job,/secrets\.(?:DMI|COPERNICUS|OPEN_METEO)|secrets: inherit|set -x|npm run|gh workflow run|--publish|--migrate|actions\/cache/);
  assert.doesNotMatch(job,/node scripts\/(?:update-weather|release-|protected-private-production-runtime|private-production-runtime-workflow)/);
});
test('Voersaa fixed water trace workflow: only ciphertext and safe status leave scratch, one-day retention',()=>{
  const job=completeWorkflow.slice(completeWorkflow.indexOf('\n  voersaa-water-trace:'));
  const upload=job.slice(job.indexOf('uses: actions/upload-artifact@'));
  assert.match(upload,/status-safe\.json\.encrypted/);assert.match(upload,/status-safe\.json\n/);
  assert.match(upload,/retention-days: 1\n/);assert.doesNotMatch(upload,/\*|descriptor|bundle|payload|source\.json/);
  assert.equal((upload.match(/\$\{\{ runner\.temp \}\}/g)??[]).length,2);
  const audit=fs.readFileSync('scripts/audit-saved-weather-inputs.mjs','utf8'),start=audit.indexOf('export async function auditVoersaaWaterLevelTrace('),end=audit.indexOf('export async function auditSavedWeatherInputs(',start);
  const actual=audit.slice(start,end);
  assert.match(actual,/downloadOrdinaryCompletedStageArtifact/);assert.match(actual,/oldStage\.openStagedPrivateProductionRuntime/);
  assert.match(actual,/restoreProtectedPrivateProductionRuntime/);assert.match(actual,/manifest\.bundleContentSha256!==restored\.bundleContentSha256/);
  assert.match(actual,/if\(!same\(await pointer\(\),before\)\)failed\('CURRENT_GENERATION_CHANGED'\)/);
  assert.match(actual,/trace\.sealVoersaaWaterTraceForRecipient\(privateReport,\{repository,runId,runAttempt,sourceHead,masterSecret\}\)/);
  assert.match(actual,/protectedGenerationReadbackVerified:true,exactArchivedSourceContractsVerified:true/);
  assert.doesNotMatch(actual,/recipientPublicKey|recipientPrivateKey|console\.|writeFile\([^\n]*privateReport|force:true/);
  const helper=fs.readFileSync('scripts/lib/voersaa-water-level-trace.mjs','utf8');
  assert.match(helper,/UNKNOWN_MISSING_AUTHENTIC_SAVED_CONFIG/);assert.doesNotMatch(helper,/console\.|createProtected|fetch\(/);
  assert.match(helper,/VOERSAA_WATER_TRACE\/20261101\/v1/);
  assert.match(helper,/VOERSAA_WATER_TRACE\/20261101\/v2/);
  assert.match(helper,/92d0755edecec37a78ee8e0658a79873c17b67e13324711d75fce76270e8d529/);
  assert.match(helper,/padding:crypto\.constants\.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'/);
  assert.doesNotMatch(job,/recipient|PUBLIC_KEY|PRIVATE_KEY|secrets\.(?:REPORT|RECIPIENT)/i);
});
