import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/recover-saved-dmi-originals.yml', 'utf8').replace(/\r\n/g, '\n');
const gh = value => '${{ ' + value + ' }}';
const step = name => {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.ok(start >= 0, name);
  const end = workflow.indexOf('\n      - ', start + 1);
  return workflow.slice(start, end < 0 ? undefined : end);
};

test('original recovery is a separate fixed manual operation under the normal writer exclusion', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (schedule|push|pull_request|workflow_run|workflow_call):/m);
  assert.equal((workflow.match(/^      [a-z_]+:\n        description:/gm) ?? []).length, 2);
  assert.match(workflow, /test "\$CONFIRMATION" = RESTORE-EXACT-DMI-ORIGINALS/);
  assert.match(workflow, /test "\$GITHUB_REF" = refs\/heads\/main/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$EXPECTED_MAIN_HEAD"/);
  assert.match(workflow, /group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /(?:contents|actions|pull-requests|pages|id-token): write|secrets: inherit|continue-on-error:/);
  assert.doesNotMatch(workflow, /workflow run|reusable-weather|update-weather\.mjs|--migrate|--publish|wrangler|supabase db|set -x/);
});

test('saved checkpoint and additive RAW base are exact, same-run and fail without prefix fallback', () => {
  for (const check of ['actions/runs/38692413809/attempts/1', '.id == 38692413809 and .run_attempt == 1',
    '.repository.full_name == $repo', '.head_repository.full_name == $repo',
    '.head_branch == "main"', '.event == "workflow_dispatch"', '.status == "completed"',
    '.path == ".github/workflows/run-current-weather-once.yml"',
    'git merge-base --is-ancestor "$source_head" "$GITHUB_SHA"',
    '.actions_caches[0].version == "9d434ae81d3120176028232ea936fc3f9dc0ed030022ff6d98bec91aa9cf117a"',
  ]) assert.ok(workflow.includes(check), check);
  assert.equal((workflow.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 2);
  assert.equal((workflow.match(/fail-on-cache-miss: true/g) ?? []).length, 2);
  assert.equal((workflow.match(/test "\$CACHE_HIT" = true/g) ?? []).length, 2);
  assert.match(workflow, /test "\$MATCHED_KEY" = weather-private-progress-encrypted-v2-Linux-main-38692413809-1/);
  assert.match(workflow, /test "\$MATCHED_KEY" = dmi-grib-v4-Linux-2026-W42-38692413809-1/);
  assert.doesNotMatch(workflow, /restore-keys:|lookup-only:|38577766010|actions\/cache\/save/);
});

test('source proof precedes protected credentials and authenticated preparation precedes DMI credentials', () => {
  const proof = workflow.indexOf('test "$SOURCE_REQUIRED" = false');
  const prepare = workflow.indexOf('node scripts/prepare-saved-dmi-original-restore.mjs prepare');
  const firstSecret = workflow.indexOf('secrets.');
  const dmi = workflow.indexOf(gh('secrets.DMI_API_KEY'));
  assert.ok(proof > 0 && firstSecret > proof && prepare > firstSecret && dmi > prepare);
  assert.match(workflow, /git archive "\$producer_head" \| tar -x -C "\$RUNNER_TEMP\/ravradar-saved-input-predecessor"/);
  assert.match(workflow, /--progress-source 38692413809-1/);
  assert.match(workflow, /--progress-baseline-target-hour 2026-10-14T18:00:00\.000Z/);
  const recovery = step('Recover exact originals without weather calculation or pruning');
  assert.match(recovery, /run: node scripts\/run-exact-dmi-original-restore\.mjs\n/);
  assert.match(recovery, /DMI_EXACT_ORIGINAL_PLAN_SHA256: \$\{\{ steps\.plan\.outputs\.plan_sha256 \}\}/);
  assert.equal((recovery.match(/secrets\./g) ?? []).length, 1);
  assert.doesNotMatch(recovery, /SUPABASE|R2_|MASTER_SECRET|GH_TOKEN|FINALIZE_ONLY|RAW_DIR|STAC_URL/);
  for (const [key, value] of [['MAX_DOWNLOAD_MB', 2048], ['RAW_CACHE_MAX_MB', 4096],
    ['MAX_RUNTIME_SECONDS', 780], ['FINALIZE_RESERVE_SECONDS', 180], ['REQUEST_TIMEOUT_SECONDS', 90]]) {
    assert.match(recovery, new RegExp(`DMI_BULK_${key}: ${value}\\n`));
  }
});

test('only a complete, physically closed recovery may enter the one existing owned cache SAVE', () => {
  const save = step('Save only through the normal physically owned cache API');
  assert.equal((workflow.match(/uses: \.\/\.github\/actions\/save-owned-dmi-grib/g) ?? []).length, 1);
  assert.match(save, /path: \.cache\/dmi-grib\n/);
  assert.match(save, /key: dmi-grib-v4-\$\{\{ runner\.os \}\}-\$\{\{ steps\.authority\.outputs\.generation \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.doesNotMatch(save, /if: always\(\)|continue-on-error|upload-encrypted-progress/);
  const guard = step('Require unchanged source, exact main and physically closed recovery');
  for (const check of ['test "$ORIGINALS_RESTORED" = true', 'test "$CACHE_API_READY" = true',
    'test ! -e .cache/weather-acquisition-writer.claim', 'test ! -L .cache/weather-acquisition-writer.claim',
    'test ! -e .cache/dmi-grib/.original-recovery-plan.json', 'test ! -L .cache/dmi-grib/.original-recovery-plan.json',
    'cmp --silent', 'current-source-before-save.json', 'git/ref/heads/main']) assert.ok(guard.includes(check), check);
  assert.ok(workflow.indexOf(guard) < workflow.indexOf(save));
  assert.match(workflow, /test "\$SAVED" = true/);
  assert.doesNotMatch(workflow, /uses: actions\/upload-artifact|path: .*\*|cat .*progress|env\s*$/m);
});
