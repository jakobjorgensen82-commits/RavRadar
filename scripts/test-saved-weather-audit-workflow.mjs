import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const text = fs.readFileSync('.github/workflows/audit-saved-weather-inputs.yml', 'utf8').replace(/\r\n/g, '\n');
const gh = value => '${{ ' + value + ' }}';

test('sealed-source diagnosis is fixed-artifact, source-gated, read-only and secret-separated', () => {
  const sealed = fs.readFileSync('.github/workflows/audit-sealed-current-source.yml', 'utf8').replace(/\r\n/g, '\n');
  assert.match(sealed, /group: ravradar-weather-production-v2/);
  assert.match(sealed, /cancel-in-progress: false/);
  assert.match(sealed, /test "\$GITHUB_SHA" = "\$EXPECTED_MAIN_HEAD"/);
  assert.match(sealed, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(sealed, /git diff --quiet bbc3c79fe555dffbff4a88af8cdf54573953efdb/);
  assert.match(sealed, /actions\/artifacts\/11281483201\/zip/);
  assert.match(sealed, /sha256sum --check --status/);
  assert.ok(sealed.indexOf('sha256sum --check --status') < sealed.indexOf('secrets.STAGED_PRIVATE_BUILD_MASTER_SECRET'));
  assert.ok(sealed.indexOf('test "$SOURCE_REQUIRED" = false') < sealed.indexOf('secrets.STAGED_PRIVATE_BUILD_MASTER_SECRET'));
  assert.equal((sealed.match(/secrets\./g) ?? []).length, 1);
  assert.doesNotMatch(sealed, /(?:contents|actions|pull-requests|pages|id-token): write|secrets: inherit|actions\/cache|restore-keys:/);
  assert.doesNotMatch(sealed, /node scripts\/(?:update-weather|protected-private-production-runtime|private-production-runtime-workflow)\.mjs|npm run|gh workflow run|\/logs|--publish|--migrate/);
  assert.match(sealed, /path: \$\{\{ runner.temp \}\}\/sealed-current-source-report.json/);
  assert.match(sealed, /target.parent != root or target.is_symlink\(\)/);
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
