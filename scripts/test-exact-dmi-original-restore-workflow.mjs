import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import crypto from 'node:crypto';

// Additive CURRENT586 outer inverse. Old390663 and genuine predecessor
// whole-source/hash assertions below are intentionally byte-unchanged.
const CURRENT586_WORKFLOW_REVIEW = Object.freeze({
  beforeSha256: '01b6b7c2c184502558aae86b02f1c7a2bab925dac53e14bdc58bacd1a24beede',
  afterSha256: '546be70e725d85c5294e542921e0303d6715851737fcde93264689942f336940',
  hunks: [
    ["        description: \"Skriv RESTORE-EXACT-DMI-ORIGINALS\"\n        required: true\n        type: string\n      restore_current586_originals:\n        description: \"Separat lukket CURRENT586 B/S-plan; ingen progress-checkpoint\"\n        required: false\n        type: boolean\n        default: false\n      expected_main_head:\n        description: \"Eksakt main-commit med faktisk grøn kildekontrol\"\n        required: true\n","        description: \"Skriv RESTORE-EXACT-DMI-ORIGINALS\"\n        required: true\n        type: string\n      expected_main_head:\n        description: \"Eksakt main-commit med faktisk grøn kildekontrol\"\n        required: true\n"],
    ["          GH_TOKEN: ${{ github.token }}\n          CONFIRMATION: ${{ inputs.confirmation }}\n          EXPECTED_MAIN_HEAD: ${{ inputs.expected_main_head }}\n          CURRENT586: ${{ inputs.restore_current586_originals }}\n        run: |\n          set -euo pipefail\n          test \"$GITHUB_EVENT_NAME\" = workflow_dispatch\n","          GH_TOKEN: ${{ github.token }}\n          CONFIRMATION: ${{ inputs.confirmation }}\n          EXPECTED_MAIN_HEAD: ${{ inputs.expected_main_head }}\n        run: |\n          set -euo pipefail\n          test \"$GITHUB_EVENT_NAME\" = workflow_dispatch\n"],
    ["          test \"$GITHUB_SHA\" = \"$EXPECTED_MAIN_HEAD\"\n          test \"$(git rev-parse HEAD^{commit})\" = \"$GITHUB_SHA\"\n          test \"$(gh api \"repos/$GITHUB_REPOSITORY/git/ref/heads/main\" --jq '.object.sha')\" = \"$GITHUB_SHA\"\n          [[ \"$CURRENT586\" = true || \"$CURRENT586\" = false ]]\n          if test \"$CURRENT586\" = true; then\n            node --input-type=module -e \"import('./scripts/lib/current586-exact-original-plan.mjs').then(m=>m.requireCurrent586ExactOriginalExecution())\"\n            gh api \"repos/$GITHUB_REPOSITORY/actions/runs/39666991481/attempts/1\" > \"$RUNNER_TEMP/current586-failed-run.json\"\n            jq -e --arg repo \"$GITHUB_REPOSITORY\" '\n              .id == 39666991481 and .run_attempt == 1 and .status == \"completed\" and .conclusion == \"failure\"\n              and .head_sha == \"94b2b6173747b9d1f7d261c5110042a657af0cac\"\n              and .repository.full_name == $repo and .head_repository.full_name == $repo\n              and .head_branch == \"main\" and .path == \".github/workflows/run-current-weather-once.yml\"\n            ' \"$RUNNER_TEMP/current586-failed-run.json\" >/dev/null\n            gh api --method GET \"repos/$GITHUB_REPOSITORY/actions/caches\" \\\n              -f key=dmi-grib-v4-Linux-2026-W43-39520623069-1 -f ref=refs/heads/main -f per_page=100 \\\n              > \"$RUNNER_TEMP/current586-raw-metadata.json\"\n            jq -e '\n              .total_count == 1 and (.actions_caches | length) == 1\n              and .actions_caches[0].id == 9250979458\n              and .actions_caches[0].key == \"dmi-grib-v4-Linux-2026-W43-39520623069-1\"\n              and .actions_caches[0].ref == \"refs/heads/main\"\n              and .actions_caches[0].version == \"9d434ae81d3120176028232ea936fc3f9dc0ed030022ff6d98bec91aa9cf117a\"\n              and .actions_caches[0].size_in_bytes == 2729841089\n            ' \"$RUNNER_TEMP/current586-raw-metadata.json\" >/dev/null\n            echo \"generation=$(date -u +%G-W%V)\" >> \"$GITHUB_OUTPUT\"\n            exit 0\n          fi\n          gh api \"repos/$GITHUB_REPOSITORY/actions/runs/39066350748/attempts/1\" \\\n            > \"$RUNNER_TEMP/saved-input-source-run.json\"\n          jq -e --arg repo \"$GITHUB_REPOSITORY\" '\n","          test \"$GITHUB_SHA\" = \"$EXPECTED_MAIN_HEAD\"\n          test \"$(git rev-parse HEAD^{commit})\" = \"$GITHUB_SHA\"\n          test \"$(gh api \"repos/$GITHUB_REPOSITORY/git/ref/heads/main\" --jq '.object.sha')\" = \"$GITHUB_SHA\"\n          gh api \"repos/$GITHUB_REPOSITORY/actions/runs/39066350748/attempts/1\" \\\n            > \"$RUNNER_TEMP/saved-input-source-run.json\"\n          jq -e --arg repo \"$GITHUB_REPOSITORY\" '\n"],
    ["          -r requirements-dmi.txt -r requirements-geometry.txt -r requirements-copernicus.txt\n\n      - name: Restore only the approved encrypted checkpoint\n        if: inputs.restore_current586_originals != true\n        id: progress\n        uses: actions/cache/restore@v6\n        with:\n","          -r requirements-dmi.txt -r requirements-geometry.txt -r requirements-copernicus.txt\n\n      - name: Restore only the approved encrypted checkpoint\n        id: progress\n        uses: actions/cache/restore@v6\n        with:\n"],
    ["          fail-on-cache-miss: true\n\n      - name: Require exact checkpoint hit and privately retain its original bytes\n        if: inputs.restore_current586_originals != true\n        shell: bash\n        env:\n          MATCHED_KEY: ${{ steps.progress.outputs.cache-matched-key }}\n","          fail-on-cache-miss: true\n\n      - name: Require exact checkpoint hit and privately retain its original bytes\n        shell: bash\n        env:\n          MATCHED_KEY: ${{ steps.progress.outputs.cache-matched-key }}\n"],
    ["        uses: actions/cache/restore@v6\n        with:\n          path: .cache/dmi-grib\n          key: ${{ inputs.restore_current586_originals && 'dmi-grib-v4-Linux-2026-W43-39520623069-1' || 'dmi-grib-v4-Linux-2026-W42-39066350748-1' }}\n          fail-on-cache-miss: true\n\n      - name: Require the exact existing RAW cache before additive recovery\n","        uses: actions/cache/restore@v6\n        with:\n          path: .cache/dmi-grib\n          key: dmi-grib-v4-Linux-2026-W42-39066350748-1\n          fail-on-cache-miss: true\n\n      - name: Require the exact existing RAW cache before additive recovery\n"],
    ["        run: |\n          set -euo pipefail\n          test \"$CACHE_HIT\" = true\n          if test '${{ inputs.restore_current586_originals }}' = true; then\n            test \"$MATCHED_KEY\" = dmi-grib-v4-Linux-2026-W43-39520623069-1\n          else\n            test \"$MATCHED_KEY\" = dmi-grib-v4-Linux-2026-W42-39066350748-1\n          fi\n          test -d .cache/dmi-grib\n          test ! -L .cache\n          test ! -L .cache/dmi-grib\n","        run: |\n          set -euo pipefail\n          test \"$CACHE_HIT\" = true\n          test \"$MATCHED_KEY\" = dmi-grib-v4-Linux-2026-W42-39066350748-1\n          test -d .cache/dmi-grib\n          test ! -L .cache\n          test ! -L .cache/dmi-grib\n"],
    ["          git archive \"$producer_head\" | tar -x -C \"$RUNNER_TEMP/ravradar-saved-input-predecessor\"\n\n      - name: Prepare the exact normal caller only inside private scratch\n        if: inputs.restore_current586_originals != true\n        shell: bash\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n","          git archive \"$producer_head\" | tar -x -C \"$RUNNER_TEMP/ravradar-saved-input-predecessor\"\n\n      - name: Prepare the exact normal caller only inside private scratch\n        shell: bash\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n"],
    ["          test -s data/live/coastal-parts-v2.json\n\n      - name: Authenticate the checkpoint and prepare only demanded exact originals\n        if: inputs.restore_current586_originals != true\n        id: plan\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs audit\n","          test -s data/live/coastal-parts-v2.json\n\n      - name: Authenticate the checkpoint and prepare only demanded exact originals\n        id: plan\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs audit\n"],
    ["          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          WEATHER_PROGRESS_MASTER_SECRET: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Prepare the exact normal CURRENT586 source without central hydration\n        if: inputs.restore_current586_originals == true\n        shell: bash\n        run: |\n          set -euo pipefail\n          root=\"$RUNNER_TEMP/ravradar-saved-input-audit\"\n          git clone --shared --no-checkout \"$GITHUB_WORKSPACE\" \"$root/current586-source\"\n          git -C \"$root/current586-source\" -c core.autocrlf=false checkout --detach \"$GITHUB_SHA\"\n\n      - name: Authenticate CURRENT586 B and actual S and prepare saved121 plus forward originals\n        if: inputs.restore_current586_originals == true\n        id: current586-plan\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs audit\n          --private-root \"$RUNNER_TEMP/ravradar-saved-input-audit\"\n          --descriptor \"$RUNNER_TEMP/ravradar-saved-input-audit/current-source.json\"\n          --predecessor-root \"$RUNNER_TEMP/ravradar-saved-input-predecessor\"\n          --progress-source 39666991481-1\n          --prepare-current586-originals true\n          --output \"$RUNNER_TEMP/ravradar-saved-input-audit/current586-plan-safe.json\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n\n      - name: Reconfirm actual CURRENT586 B and S immediately before exact transport\n        if: inputs.restore_current586_originals == true && steps.current586-plan.outputs.preparation_status == 'ORIGINAL_PLAN_PREPARED'\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs verify-current586-plan\n          --private-root \"$RUNNER_TEMP/ravradar-saved-input-audit\"\n          --descriptor \"$RUNNER_TEMP/ravradar-saved-input-audit/current-source.json\"\n          --output \"$RUNNER_TEMP/ravradar-saved-input-audit/current586-before-transport-safe.json\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Inspect authenticated original metadata before transport\n        if: steps.plan.outputs.preparation_status == 'ORIGINAL_PLAN_PREPARED' || steps.current586-plan.outputs.preparation_status == 'ORIGINAL_PLAN_PREPARED'\n        run: python -B scripts/inspect-exact-dmi-original-plan.py\n        env:\n          DMI_EXACT_ORIGINAL_PLAN_SHA256: ${{ inputs.restore_current586_originals && steps.current586-plan.outputs.plan_sha256 || steps.plan.outputs.plan_sha256 }}\n          GITHUB_SHA: ${{ github.sha }}\n\n      - name: Select the normal owned cache API runtime\n","          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          WEATHER_PROGRESS_MASTER_SECRET: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Inspect authenticated original metadata before transport\n        if: steps.plan.outputs.preparation_status == 'ORIGINAL_PLAN_PREPARED'\n        run: python -B scripts/inspect-exact-dmi-original-plan.py\n        env:\n          DMI_EXACT_ORIGINAL_PLAN_SHA256: ${{ steps.plan.outputs.plan_sha256 }}\n          GITHUB_SHA: ${{ github.sha }}\n\n      - name: Select the normal owned cache API runtime\n"],
    ["        run: node scripts/run-exact-dmi-original-restore.mjs\n        env:\n          DMI_API_KEY: ${{ secrets.DMI_API_KEY }}\n          DMI_EXACT_ORIGINAL_PREPARATION_STATUS: ${{ inputs.restore_current586_originals && steps.current586-plan.outputs.preparation_status || steps.plan.outputs.preparation_status }}\n          DMI_EXACT_ORIGINAL_COUNT: ${{ inputs.restore_current586_originals && steps.current586-plan.outputs.original_count || steps.plan.outputs.original_count }}\n          DMI_EXACT_ORIGINAL_PLAN_BYTES: ${{ inputs.restore_current586_originals && steps.current586-plan.outputs.plan_bytes || steps.plan.outputs.plan_bytes }}\n          DMI_EXACT_ORIGINAL_PLAN_SHA256: ${{ inputs.restore_current586_originals && steps.current586-plan.outputs.plan_sha256 || steps.plan.outputs.plan_sha256 }}\n          DMI_BULK_MAX_DOWNLOAD_MB: 2048\n          DMI_BULK_RAW_CACHE_MAX_MB: 4096\n          DMI_BULK_MAX_RUNTIME_SECONDS: 780\n          DMI_BULK_FINALIZE_RESERVE_SECONDS: 180\n          DMI_BULK_REQUEST_TIMEOUT_SECONDS: 90\n\n      - name: Reconfirm actual CURRENT586 B and S after physical transport closure\n        if: inputs.restore_current586_originals == true && steps.originals.outputs.originals_restored == 'true'\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs verify-current586-closed\n          --private-root \"$RUNNER_TEMP/ravradar-saved-input-audit\"\n          --descriptor \"$RUNNER_TEMP/ravradar-saved-input-audit/current-source.json\"\n          --output \"$RUNNER_TEMP/ravradar-saved-input-audit/current586-after-transport-safe.json\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Reconfirm the protected source before the sole cache SAVE\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs describe\n","        run: node scripts/run-exact-dmi-original-restore.mjs\n        env:\n          DMI_API_KEY: ${{ secrets.DMI_API_KEY }}\n          DMI_EXACT_ORIGINAL_PREPARATION_STATUS: ${{ steps.plan.outputs.preparation_status }}\n          DMI_EXACT_ORIGINAL_COUNT: ${{ steps.plan.outputs.original_count }}\n          DMI_EXACT_ORIGINAL_PLAN_BYTES: ${{ steps.plan.outputs.plan_bytes }}\n          DMI_EXACT_ORIGINAL_PLAN_SHA256: ${{ steps.plan.outputs.plan_sha256 }}\n          DMI_BULK_MAX_DOWNLOAD_MB: 2048\n          DMI_BULK_RAW_CACHE_MAX_MB: 4096\n          DMI_BULK_MAX_RUNTIME_SECONDS: 780\n          DMI_BULK_FINALIZE_RESERVE_SECONDS: 180\n          DMI_BULK_REQUEST_TIMEOUT_SECONDS: 90\n\n      - name: Reconfirm the protected source before the sole cache SAVE\n        run: >-\n          node scripts/audit-saved-weather-inputs.mjs describe\n"]
  ],
});
const workflowHash = source => crypto.createHash('sha256').update(source).digest('hex');
function inverseCurrent586Workflow(source) {
  assert.equal(typeof source, 'string', 'CURRENT586 workflow review requires whole LF source');
  if (workflowHash(source) === CURRENT586_WORKFLOW_REVIEW.beforeSha256) return source;
  assert.equal(workflowHash(source), CURRENT586_WORKFLOW_REVIEW.afterSha256,
    'only the exact reviewed CURRENT586 workflow may enter the historical inverse');
  for (const [after, before] of CURRENT586_WORKFLOW_REVIEW.hunks) {
    assert.equal(source.split(after).length, 2, 'exact CURRENT586 outer inverse hunk');
    source = source.replace(after, () => before);
  }
  assert.equal(workflowHash(source), CURRENT586_WORKFLOW_REVIEW.beforeSha256,
    'WHOLE genuine preceding workflow survives the CURRENT586 inverse');
  return source;
}
const rawDeliveredWorkflow = fs.readFileSync('.github/workflows/recover-saved-dmi-originals.yml', 'utf8').replace(/\r\n/g, '\n');
const deliveredWorkflow = inverseCurrent586Workflow(rawDeliveredWorkflow);
const diagnosticStep = `      - name: Inspect authenticated original metadata before transport
        if: steps.plan.outputs.preparation_status == 'ORIGINAL_PLAN_PREPARED'
        run: python -B scripts/inspect-exact-dmi-original-plan.py
        env:
          DMI_EXACT_ORIGINAL_PLAN_SHA256: \${{ steps.plan.outputs.plan_sha256 }}
          GITHUB_SHA: \${{ github.sha }}

`;
assert.ok(deliveredWorkflow.split(diagnosticStep).length <= 2, 'No duplicate observer');
const currentWorkflow = deliveredWorkflow.replace(diagnosticStep, '');
// Reconstitute the WHOLE genuine old workflow before its unchanged historical
// assertions. Current390663 behavior is tested separately below, never retagged.
function inverseForwardRecovery(source) {
  const hydration = source.indexOf('      - name: Prepare the exact normal caller only inside private scratch\n');
  const next = source.indexOf('      - name: Authenticate the checkpoint and prepare only demanded exact originals\n', hydration);
  assert.ok(hydration > 0 && next > hydration);
  const step = source.slice(hydration, next);
  assert.equal(crypto.createHash('sha256').update(step).digest('hex'),
    '2c7ed1f20b0750e30f57ef78a6fe9223462ac98a445179d99abd50d391ee8e8a', 'entire reviewed private hydration step');
  source = source.slice(0, hydration) + source.slice(next);
  const once = (after, before) => {
    assert.equal(source.split(after).length, 2, 'exact reviewed forward recovery hunk');
    source = source.replace(after, () => before);
  };
  once('# Exact390663 post-H0 repair. Normal selection runs only in private scratch;\n# no newer forecast, production calculation, SQL or deploy is performed.',
    '# This is the one approved repair of saved originals, not a weather update.\n# No source-selected command, newer forecast, calculation, SQL or deploy.');
  once('    runs-on: ubuntu-24.04\n    timeout-minutes: 75', '    runs-on: ubuntu-latest\n    timeout-minutes: 45');
  assert.equal((source.match(/39066350748/g) ?? []).length, 10);
  source = source.replaceAll('39066350748', '38692413809');
  once('node scripts/audit-saved-weather-inputs.mjs audit\n          --private-root',
    'node scripts/prepare-saved-dmi-original-restore.mjs prepare\n          --private-root');
  once('          --progress-baseline-target-hour 2026-10-17T20:00:00.000Z\n          --include-current-window-diagnostic true\n          --prepare-current-forward-originals true\n          --output "$RUNNER_TEMP/ravradar-saved-input-audit/summary-safe.json"',
    '          --progress-baseline-target-hour 2026-10-14T18:00:00.000Z');
  once('          DMI_EXACT_ORIGINAL_PREPARATION_STATUS: ${{ steps.plan.outputs.preparation_status }}\n          DMI_EXACT_ORIGINAL_COUNT: ${{ steps.plan.outputs.original_count }}\n          DMI_EXACT_ORIGINAL_PLAN_BYTES: ${{ steps.plan.outputs.plan_bytes }}\n', '');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),
    'c5c03074348f2b5fc0f536d0ed28f64e7019f4412a0cebcb483976a68e3ef18f', 'whole genuine predecessor workflow');
  return source;
}
const workflow = inverseForwardRecovery(currentWorkflow);
test('CURRENT586 outer review: exact additive inverse preserves every frozen predecessor oracle', () => {
  assert.equal(workflowHash(rawDeliveredWorkflow), CURRENT586_WORKFLOW_REVIEW.afterSha256,
    'Actual current workflow is not a projected older file');
  assert.equal(workflowHash(deliveredWorkflow), CURRENT586_WORKFLOW_REVIEW.beforeSha256);
  assert.equal(inverseCurrent586Workflow(deliveredWorkflow), deliveredWorkflow);
  assert.match(rawDeliveredWorkflow, /restore_current586_originals:\n[\s\S]*?type: boolean\n        default: false/);
  assert.match(rawDeliveredWorkflow, /Prepare the exact normal caller only inside private scratch\n        if: inputs\.restore_current586_originals != true/);
  assert.match(rawDeliveredWorkflow, /Prepare the exact normal CURRENT586 source without central hydration\n        if: inputs\.restore_current586_originals == true/);
  assert.equal(inverseForwardRecovery(deliveredWorkflow.replace(diagnosticStep, '')), workflow,
    'All unchanged historical assertions consume the same exact old workflow');
  for (const [after] of CURRENT586_WORKFLOW_REVIEW.hunks) {
    assert.equal(rawDeliveredWorkflow.split(after).length, 2);
    assert.throws(() => inverseCurrent586Workflow(rawDeliveredWorkflow.replace(after,
      () => after + '# UNREVIEWED_CURRENT586_MUTATION\n')), /exact reviewed CURRENT586/);
  }
  assert.throws(() => inverseCurrent586Workflow(rawDeliveredWorkflow + '\n'), /exact reviewed CURRENT586/);
  assert.throws(() => inverseCurrent586Workflow(null), /whole LF source/);
});

test('pretransport observer follows authenticated preparation and has no provider credential or added restore authority', () => {
  assert.equal(deliveredWorkflow.split(diagnosticStep).length, 2, 'The bounded report must actually run before transport');
  const prepared = deliveredWorkflow.indexOf('id: plan\n');
  const observed = deliveredWorkflow.indexOf(diagnosticStep);
  const recovered = deliveredWorkflow.indexOf('      - name: Recover exact originals without weather calculation or pruning\n');
  assert.ok(prepared > 0 && observed > prepared && recovered > observed);
  assert.doesNotMatch(diagnosticStep, /secrets\.|DMI_API_KEY|SUPABASE|R2_|GITHUB_OUTPUT|--restore|--publish/);
  assert.match(diagnosticStep, /DMI_EXACT_ORIGINAL_PLAN_SHA256:/);
});
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

test('390663 forward repair authenticates genuine normal choices and preserves the exact cache/SAVE boundaries', () => {
  assert.match(currentWorkflow, /actions\/runs\/39066350748\/attempts\/1/);
  assert.match(currentWorkflow, /--progress-source 39066350748-1/);
  assert.match(currentWorkflow, /--progress-baseline-target-hour 2026-10-17T20:00:00\.000Z/);
  assert.match(currentWorkflow, /--include-current-window-diagnostic true\n          --prepare-current-forward-originals true/);
  assert.match(currentWorkflow, /git clone --shared --no-checkout "\$GITHUB_WORKSPACE"/);
  assert.match(currentWorkflow, /git -C "\$root\/current-window-source" -c core.autocrlf=false checkout --detach "\$GITHUB_SHA"/);
  for (const command of ['refine-coastlines-constrained-4.0.48.py', 'sync-admin-config.py',
    'apply-central-zone-reviews.py', 'build-public-coastal-parts-v2.mjs']) assert.ok(currentWorkflow.includes(command));
  assert.equal((currentWorkflow.match(/uses: actions\/cache\/restore@v6/g) ?? []).length, 2);
  assert.equal((currentWorkflow.match(/fail-on-cache-miss: true/g) ?? []).length, 2);
  assert.equal((currentWorkflow.match(/uses: \.\/\.github\/actions\/save-owned-dmi-grib/g) ?? []).length, 1);
  assert.match(currentWorkflow, /test "\$ORIGINALS_RESTORED" = true/);
  assert.match(currentWorkflow, /test "\$SAVED" = true/);
  assert.doesNotMatch(currentWorkflow, /restore-keys:|workflow run|--publish|wrangler|supabase db|continue-on-error/);
  assert.match(currentWorkflow, /runs-on: ubuntu-24.04\n    timeout-minutes: 75/);
});
