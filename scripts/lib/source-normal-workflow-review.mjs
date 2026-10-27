// TEST ONLY. Exact whole SOURCE ordinary callers -> the exact newer P0/587 callers plus observed588 synchronization.
// Not a source-compatibility waiver, runtime loader, publication or SAVE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(new URL('./source-normal-workflow-review.json', import.meta.url));
assert.equal(sha(bytes), 'a302aacaa9348bc10d7dcd16fc37d35a225da12fd36712dc81f16fd6b240eedb');
const review = JSON.parse(bytes);
assert.equal(review.schemaVersion, 1);
assert.equal(review.kind, 'TEST_ONLY_EXACT_SOURCE_NORMAL_WORKFLOW_INVERSE');
assert.equal(review.productionAuthority, false);
assert.equal(review.predecessorHead, 'd4bd3af9df53107a4057fc930d89307059c34c88');
assert.deepEqual(Object.keys(review.roles), ['build', 'once']);
for (const [role, row] of Object.entries(review.roles)) {
  assert.equal(row.edits.length, role === 'build' ? 156 : 4);
  assert.equal(row.mode, '100644');
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(review.roles); Object.freeze(review.release588); Object.freeze(review);
export const SOURCE_NORMAL_WORKFLOW_REVIEW = review;

// TEST ONLY. Two finite routing images and the exact normal release589 UA image.
// They are never runtime admission, compatibility normalization or new old pins.
export const SOURCE_NORMAL_ROUTING_REVIEW = [
  {
    "role": "once",
    "relativePath": ".github/workflows/run-current-weather-once.yml",
    "actualBytes": 57273,
    "actualSha256": "97ce9509e9378663232480c83195c162cc6fc84d0ec71ad405b6da375f866c11",
    "predecessorBytes": 56931,
    "predecessorSha256": "303997ba437c778cdf561405bbc2d8515e7fb6dbdde7248ac5967b6f5613c1b8",
    "edits": [
      {
        "original": "      pull-requests: read\n    uses: ./.github/workflows/reusable-weather-build.yml\n    with:\n      source_normal_producer: ${{ inputs.source_normal_producer }}\n      production_target_hour: ${{ needs.current-main-target.outputs.target_hour }}\n      completed_private_runtime: ${{ inputs.completed_private_runtime }}\n      completed_private_runtime_pin: ${{ needs.current-main-target.outputs.completed_private_runtime_pin }}\n",
        "originalSha256": "c7bc79439365882f80fd929c303b682d325e368f8f0a36b95dfa114933e1f273",
        "afterSha256": "dc26e51376c82c8bdc233e668f353c8d877b0e7f522d1c225a65d39dca7451b6",
        "current": "      pull-requests: read\n    uses: ./.github/workflows/reusable-weather-build.yml\n    with:\n      source_normal_producer: ${{ needs.current-main-target.outputs.source_normal_producer == 'true' }}\n      production_target_hour: ${{ needs.current-main-target.outputs.target_hour }}\n      completed_private_runtime: ${{ inputs.completed_private_runtime }}\n      completed_private_runtime_pin: ${{ needs.current-main-target.outputs.completed_private_runtime_pin }}\n",
        "header": "@@ -931,7 +936,7 @@",
        "offset": 47998,
        "beforeSha256": "97ce9509e9378663232480c83195c162cc6fc84d0ec71ad405b6da375f866c11",
        "currentSha256": "fdf504cc394ebca22c82a5aee1e030822ea46a1de4fab2081b208a9f55ea0bc6"
      },
      {
        "original": "      actions: read\n    outputs:\n      target_hour: ${{ steps.completed-target.outputs.target_hour || steps.checkpoint-target.outputs.target_hour || steps.cache-state.outputs.target_hour }}\n      completed_private_runtime_pin: ${{ steps.completed-target.outputs.completed_private_runtime_pin }}\n    steps:\n      - uses: actions/checkout@v7\n\n",
        "originalSha256": "0dbca5c62cffe127889727684c4b01721769bb15c0a9da8b7a877dd8aaf74796",
        "afterSha256": "681a5f80abed5872dec8bdea8bda957d65591d523fe47579ffc6bccfb937373c",
        "current": "      actions: read\n    outputs:\n      target_hour: ${{ steps.completed-target.outputs.target_hour || steps.checkpoint-target.outputs.target_hour || steps.cache-state.outputs.target_hour }}\n      completed_private_runtime_pin: ${{ steps.completed-target.outputs.completed_private_runtime_pin }}\n      source_normal_producer: ${{ needs.source-route-request.outputs.route == 'source' }}\n    steps:\n      - uses: actions/checkout@v7\n\n",
        "header": "@@ -140,7 +144,8 @@",
        "offset": 6461,
        "beforeSha256": "dc26e51376c82c8bdc233e668f353c8d877b0e7f522d1c225a65d39dca7451b6",
        "currentSha256": "f5a385f7edb681c947bfffe30be22864c48ce10f439cfce22d34ff82c20794f8"
      },
      {
        "original": "          const known=new Set(['source_normal_producer',...booleans,...strings]);\n          assert(Object.keys(request).every(key=>known.has(key)),'SOURCE_ROUTE_REQUEST_UNKNOWN');\n          assert.equal(typeof request.source_normal_producer,'boolean','SOURCE_ROUTE_SELECTION_UNKNOWN');\n          if(request.source_normal_producer===true){\n            for(const key of booleans)assert.equal(request[key],false,'SOURCE_ROUTE_MIXED_BOOLEAN');\n            for(const key of strings)assert.equal(request[key],'','SOURCE_ROUTE_MIXED_LOCATOR');\n          }\n          fs.appendFileSync(process.env.GITHUB_OUTPUT,'route='+(request.source_normal_producer===true?'source':'legacy')+'\\n');\n          NODE\n\n  operational-recovery-gate:\n",
        "originalSha256": "cbca00d904b510ed1febb2de9065e7d75e884b7935ee4dab7fd926a05f7f8a49",
        "afterSha256": "ae473943a66ade3c9b1dea5277875fbf72a3f981e2548725435e5d6342c7841d",
        "current": "          const known=new Set(['source_normal_producer',...booleans,...strings]);\n          assert(Object.keys(request).every(key=>known.has(key)),'SOURCE_ROUTE_REQUEST_UNKNOWN');\n          assert.equal(typeof request.source_normal_producer,'boolean','SOURCE_ROUTE_SELECTION_UNKNOWN');\n          const ordinary=booleans.every(key=>request[key]===false)&&strings.every(key=>request[key]==='');\n          const source=request.source_normal_producer===true||ordinary;\n          if(source){\n            for(const key of booleans)assert.equal(request[key],false,'SOURCE_ROUTE_MIXED_BOOLEAN');\n            for(const key of strings)assert.equal(request[key],'','SOURCE_ROUTE_MIXED_LOCATOR');\n          }\n          fs.appendFileSync(process.env.GITHUB_OUTPUT,'route='+(source?'source':'legacy')+'\\n');\n          NODE\n\n  operational-recovery-gate:\n",
        "header": "@@ -107,11 +109,13 @@",
        "offset": 4548,
        "beforeSha256": "681a5f80abed5872dec8bdea8bda957d65591d523fe47579ffc6bccfb937373c",
        "currentSha256": "0a62e8d689adcb81c1d94017ff20b4caec2706816acb811f12e58fde231028db"
      },
      {
        "original": "\njobs:\n  source-route-request:\n    name: Validate the explicit SOURCE request before any operational reentry\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    permissions:\n      contents: read\n    steps:\n",
        "originalSha256": "c40af4142086cb781f9b338b7564d3d3018a8cc8a4bc9b31403b1792bb4372d0",
        "afterSha256": "047062315a41e7d2f336e19aa71516e3edaf12baa721e86fceb20f327cd15a63",
        "current": "\njobs:\n  source-route-request:\n    name: Validate the normal SOURCE route before any operational reentry\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    outputs:\n      route: ${{ steps.source-route-request.outputs.route }}\n    permissions:\n      contents: read\n    steps:\n",
        "header": "@@ -85,9 +85,11 @@",
        "offset": 3298,
        "beforeSha256": "ae473943a66ade3c9b1dea5277875fbf72a3f981e2548725435e5d6342c7841d",
        "currentSha256": "66169487361a2d86578b4368d2f2a43bfd19d4d4217fd894661b5fc9109896b2"
      },
      {
        "original": "  workflow_dispatch:\n    inputs:\n      source_normal_producer:\n        description: 'Private prepared SOURCE ordinary route; default off, never mixed with special modes'\n        required: false\n        type: boolean\n        default: false\n",
        "originalSha256": "1edb2f198b094a3d6d7ff08fb4221dbb6919ebc6bfebd43c95a436dd2a11cf4a",
        "afterSha256": "303997ba437c778cdf561405bbc2d8515e7fb6dbdde7248ac5967b6f5613c1b8",
        "current": "  workflow_dispatch:\n    inputs:\n      source_normal_producer:\n        description: 'Explicit SOURCE selection; ordinary requests use installed SOURCE automatically, never mixed with special modes'\n        required: false\n        type: boolean\n        default: false\n",
        "header": "@@ -4,7 +4,7 @@",
        "offset": 45,
        "beforeSha256": "047062315a41e7d2f336e19aa71516e3edaf12baa721e86fceb20f327cd15a63",
        "currentSha256": "10b450e8840bbe3dabdca09cb2eab71f07e4a46603bc8f631de753ad12a89ea1"
      }
    ]
  },
  {
    "role": "orchestrator",
    "relativePath": ".github/workflows/update-and-deploy.yml",
    "actualBytes": 69133,
    "actualSha256": "337274a242b15941b3081da9a498743dfa460fe9884e4911d92f519ec2f5d24b",
    "predecessorBytes": 67764,
    "predecessorSha256": "784041f35105e63ca60d3199923a20bb6d1c457b70e76a6d2cace2dcc494fe4f",
    "edits": [
      {
        "original": "      native_sampling_identity_original_recovery: false\n      produce_weather_handoff: ${{ needs.validate-dispatch.outputs.produce_weather_handoff == 'true' }}\n      produce_weather_handoff_confirmation: ${{ needs.validate-dispatch.outputs.produce_weather_handoff_confirmation }}\n      ravscore_candidate_g_rollback_mode: ${{ needs.validate-dispatch.outputs.ravscore_candidate_g_rollback_mode }}\n      ravscore_candidate_g_rollback_confirmation: ${{ needs.validate-dispatch.outputs.ravscore_candidate_g_rollback_confirmation }}\n      ravscore_integrated_first_cutover: ${{ needs.validate-dispatch.outputs.ravscore_integrated_first_cutover == 'true' }}\n      ravscore_integrated_first_cutover_confirmation: ${{ needs.validate-dispatch.outputs.ravscore_integrated_first_cutover_confirmation }}\n",
        "originalSha256": "329e925735a53bf001c07063ab3281299fa05a2adf59ac80c9608df45112ad09",
        "afterSha256": "2ebb10ed59df305a93cd131bf8faa388c0700b1d42046d8608a7d4c3e97e2a2c",
        "current": "      native_sampling_identity_original_recovery: false\n      produce_weather_handoff: ${{ needs.validate-dispatch.outputs.produce_weather_handoff == 'true' }}\n      produce_weather_handoff_confirmation: ${{ needs.validate-dispatch.outputs.produce_weather_handoff_confirmation }}\n      # 'none' is the old UI value; SOURCE's existing absence contract is ''.\n      ravscore_candidate_g_rollback_mode: ${{ needs.validate-dispatch.outputs.source_normal_producer != 'true' && needs.validate-dispatch.outputs.ravscore_candidate_g_rollback_mode || '' }}\n      ravscore_candidate_g_rollback_confirmation: ${{ needs.validate-dispatch.outputs.ravscore_candidate_g_rollback_confirmation }}\n      ravscore_integrated_first_cutover: ${{ needs.validate-dispatch.outputs.ravscore_integrated_first_cutover == 'true' }}\n      ravscore_integrated_first_cutover_confirmation: ${{ needs.validate-dispatch.outputs.ravscore_integrated_first_cutover_confirmation }}\n",
        "header": "@@ -410,7 +426,8 @@",
        "offset": 24608,
        "beforeSha256": "337274a242b15941b3081da9a498743dfa460fe9884e4911d92f519ec2f5d24b",
        "currentSha256": "502d7a84a34001921f9386b5b42340e359bd4b1e2fca34cca067056153593329"
      },
      {
        "original": "      pull-requests: read\n    uses: ./.github/workflows/reusable-weather-build.yml\n    with:\n      production_target_hour: ${{ needs.current-hour-readiness.outputs.target_hour }}\n      force: ${{ needs.validate-dispatch.outputs.force == 'true' }}\n      extended_provider_bootstrap: ${{ needs.validate-dispatch.outputs.extended_provider_bootstrap == 'true' }}\n      quick_confirmation: false\n",
        "originalSha256": "3ab15bc136cd5198e7ceec4ac1646edd11281abacaacdd4cb1a258479ce2f31e",
        "afterSha256": "66d7144c0c924469c4a44b39d16677829ccf29dee1e00cd8537b2426ce289aed",
        "current": "      pull-requests: read\n    uses: ./.github/workflows/reusable-weather-build.yml\n    with:\n      source_normal_producer: ${{ needs.validate-dispatch.outputs.source_normal_producer == 'true' }}\n      production_target_hour: ${{ needs.current-hour-readiness.outputs.target_hour }}\n      force: ${{ needs.validate-dispatch.outputs.force == 'true' }}\n      extended_provider_bootstrap: ${{ needs.validate-dispatch.outputs.extended_provider_bootstrap == 'true' }}\n      quick_confirmation: false\n",
        "header": "@@ -398,7 +413,8 @@",
        "offset": 23916,
        "beforeSha256": "2ebb10ed59df305a93cd131bf8faa388c0700b1d42046d8608a7d4c3e97e2a2c",
        "currentSha256": "30578b463f1d1415f798f2887b2234de4686f3280f93d5a7b628a101e98cc3fe"
      },
      {
        "original": "          printf '%s\\n' \"ravscore_integrated_first_cutover_confirmation=$FIRST_CUTOVER_CONFIRMATION\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_weather_handoff_run_id=$WEATHER_HANDOFF_RUN_ID\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_return=$RETURN_REQUESTED\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_return_confirmation=$RETURN_CONFIRMATION\" >> \"$GITHUB_OUTPUT\"\n\n  operational-recovery-gate:\n    name: Require terminal operational recovery before production\n",
        "originalSha256": "3786b0927766a8f15a4b361a4f896047ce2cf857554aab61f5545c61d7321227",
        "afterSha256": "520ea450c575150e29aff7f2c164b28ba052a4ec9ef5ab5f5ade8c1157dc11ee",
        "current": "          printf '%s\\n' \"ravscore_integrated_first_cutover_confirmation=$FIRST_CUTOVER_CONFIRMATION\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_weather_handoff_run_id=$WEATHER_HANDOFF_RUN_ID\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_return=$RETURN_REQUESTED\" >> \"$GITHUB_OUTPUT\"\n          printf '%s\\n' \"ravscore_integrated_return_confirmation=$RETURN_CONFIRMATION\" >> \"$GITHUB_OUTPUT\"\n          # Only the already validated plain/force request is SOURCE ordinary.\n          # Extended/bootstrap and every historical transition stay separate.\n          source_normal=false\n          if test \"$EXTENDED_PROVIDER_BOOTSTRAP\" = false \\\n              && test \"$PRODUCE_WEATHER_HANDOFF\" = false && test -z \"$PRODUCE_WEATHER_HANDOFF_CONFIRMATION\" \\\n              && test \"$GEOMETRY_PILOT\" = false && test \"$GEOMETRY_NATIONAL\" = false \\\n              && test \"$ROLLBACK_MODE\" = none && test -z \"$ROLLBACK_CONFIRMATION\" \\\n              && test \"$FIRST_CUTOVER_REQUESTED\" = false && test -z \"$FIRST_CUTOVER_CONFIRMATION\" \\\n              && test -z \"$WEATHER_HANDOFF_RUN_ID\" \\\n              && test \"$RETURN_REQUESTED\" = false && test -z \"$RETURN_CONFIRMATION\"; then\n            source_normal=true\n          fi\n          printf '%s\\n' \"source_normal_producer=$source_normal\" >> \"$GITHUB_OUTPUT\"\n\n  operational-recovery-gate:\n    name: Require terminal operational recovery before production\n",
        "header": "@@ -255,7 +257,20 @@",
        "offset": 15250,
        "beforeSha256": "66d7144c0c924469c4a44b39d16677829ccf29dee1e00cd8537b2426ce289aed",
        "currentSha256": "7365e0879b76c14752983595a6dbf7ec7f64df6e11ef4d93b88f59b226de723c"
      },
      {
        "original": "        id: dispatch-defaults\n        shell: bash\n        run: |\n          echo \"force=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"extended_provider_bootstrap=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"produce_weather_handoff=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"produce_weather_handoff_confirmation=\" >> \"$GITHUB_OUTPUT\"\n",
        "originalSha256": "ca55c6d228c14d540817dc2899e3916445d316d291615edc7b59681c4ad37d93",
        "afterSha256": "ff20ec339ff2c47469f30317d4d22cf7805f23792ecbdc3c1fbc23bae5bb240a",
        "current": "        id: dispatch-defaults\n        shell: bash\n        run: |\n          echo \"source_normal_producer=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"force=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"extended_provider_bootstrap=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"produce_weather_handoff=false\" >> \"$GITHUB_OUTPUT\"\n          echo \"produce_weather_handoff_confirmation=\" >> \"$GITHUB_OUTPUT\"\n",
        "header": "@@ -113,7 +114,8 @@",
        "offset": 6340,
        "beforeSha256": "520ea450c575150e29aff7f2c164b28ba052a4ec9ef5ab5f5ade8c1157dc11ee",
        "currentSha256": "6cedba5c789ad1a6c31a0c64e280717b5e4931a764e4f7e6c2b4d8ae7c3ad71b"
      },
      {
        "original": "    name: Validate mutually exclusive manual operation\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    outputs:\n      force: ${{ steps.validated-dispatch.outputs.force || steps.dispatch-defaults.outputs.force }}\n      extended_provider_bootstrap: ${{ steps.validated-dispatch.outputs.extended_provider_bootstrap || steps.dispatch-defaults.outputs.extended_provider_bootstrap }}\n      produce_weather_handoff: ${{ steps.validated-dispatch.outputs.produce_weather_handoff || steps.dispatch-defaults.outputs.produce_weather_handoff }}\n      produce_weather_handoff_confirmation: ${{ steps.validated-dispatch.outputs.produce_weather_handoff_confirmation || steps.dispatch-defaults.outputs.produce_weather_handoff_confirmation }}\n",
        "originalSha256": "88e80816ce4421f86f7475e80dd719baf0462113a6d2d82ed6af5798f137097b",
        "afterSha256": "784041f35105e63ca60d3199923a20bb6d1c457b70e76a6d2cace2dcc494fe4f",
        "current": "    name: Validate mutually exclusive manual operation\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    outputs:\n      source_normal_producer: ${{ steps.validated-dispatch.outputs.source_normal_producer || steps.dispatch-defaults.outputs.source_normal_producer }}\n      force: ${{ steps.validated-dispatch.outputs.force || steps.dispatch-defaults.outputs.force }}\n      extended_provider_bootstrap: ${{ steps.validated-dispatch.outputs.extended_provider_bootstrap || steps.dispatch-defaults.outputs.extended_provider_bootstrap }}\n      produce_weather_handoff: ${{ steps.validated-dispatch.outputs.produce_weather_handoff || steps.dispatch-defaults.outputs.produce_weather_handoff }}\n      produce_weather_handoff_confirmation: ${{ steps.validated-dispatch.outputs.produce_weather_handoff_confirmation || steps.dispatch-defaults.outputs.produce_weather_handoff_confirmation }}\n",
        "header": "@@ -94,8 +94,9 @@",
        "offset": 3730,
        "beforeSha256": "ff20ec339ff2c47469f30317d4d22cf7805f23792ecbdc3c1fbc23bae5bb240a",
        "currentSha256": "4c699b62e73aa9607a4ae85a0f7c750c042ac7fa496d0afb8b93bb912240bf89"
      }
    ]
  }
];
for (const row of SOURCE_NORMAL_ROUTING_REVIEW) {
  for (const edit of row.edits) Object.freeze(edit);
  Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(SOURCE_NORMAL_ROUTING_REVIEW);
export const SOURCE_RELEASE589_WORKFLOW_REVIEW = Object.freeze({
  "role": "build",
  "relativePath": ".github/workflows/reusable-weather-build.yml",
  "actualBytes": 338145,
  "actualSha256": "a089e5258ffb036e0d581b25a8f0447339ae7d93767c25ad6e07bf153cab8b45",
  "actual": "RavRadar/4.0.589",
  "original": "RavRadar/4.0.588",
  "count": 5,
  "originalBytes": 338145,
  "originalSha256": "44ce05669da1857a24dc4c3705778fd210d8df268f0d327931ebbe8ca0308536"
});
export function inverseSourceNormalWorkflowOuter(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  const release = SOURCE_RELEASE589_WORKFLOW_REVIEW;
  if (role === release.role && sha(source) === release.actualSha256) {
    assert.equal(Buffer.byteLength(source), release.actualBytes);
    assert.equal(source.split(release.actual).length - 1, release.count, 'Exactly five normal589 User-Agent fields');
    assert.equal(source.includes(release.original), false, 'No mixed release image');
    source = source.replaceAll(release.actual, release.original);
    assert.equal(Buffer.byteLength(source), release.originalBytes);
    assert.equal(sha(source), release.originalSha256, 'The whole preserved588 SOURCE caller precedes every old inverse');
  }
  const row = SOURCE_NORMAL_ROUTING_REVIEW.find(row => row.role === role && sha(source) === row.actualSha256);
  if (!row) return source; // Unknown bytes remain unknown to the unchanged old oracles.
  assert.equal(Buffer.byteLength(source), row.actualBytes);
  let last = Infinity;
  for (const edit of row.edits) {
    assert(Number.isSafeInteger(edit.offset) && edit.offset >= 0 && edit.offset < last); last = edit.offset;
    assert.equal(sha(edit.current), edit.currentSha256);
    assert.equal(sha(edit.original), edit.originalSha256);
    assert.equal(sha(source), edit.beforeSha256, 'Every whole outer routing input is pinned');
    assert.equal(source.slice(edit.offset, edit.offset + edit.current.length), edit.current);
    source = source.slice(0, edit.offset) + edit.original + source.slice(edit.offset + edit.current.length);
    assert.equal(sha(source), edit.afterSha256, 'Every whole routing predecessor is pinned');
  }
  assert.equal(Buffer.byteLength(source), row.predecessorBytes);
  assert.equal(sha(source), row.predecessorSha256, 'Exact complete old caller, never a reduced historical view');
  return source;
}
export function inverseSourceNormalWorkflow(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  source = inverseSourceNormalWorkflowOuter(source, role);
  assert(Object.hasOwn(review.roles, role), 'Only the reviewed build/once roles');
  const row = review.roles[role];
  assert.equal(Buffer.byteLength(source), row.actualBytes, 'Whole SOURCE caller byte length');
  assert.equal(sha(source), row.actualSha256, 'Only the exact reviewed SOURCE caller may enter its test-only inverse');
  let prior = source, hunk = row.edits.length + 1, last = Infinity;
  for (const edit of row.edits) {
    assert.equal(edit.sourceHunk, --hunk);
    assert(Number.isSafeInteger(edit.offset) && edit.offset >= 0 && edit.offset < last); last = edit.offset;
    assert.match(edit.header, /^@@ -[0-9]+(?:,[0-9]+)? \+[0-9]+(?:,[0-9]+)? @@/);
    assert.equal(sha(edit.current), edit.currentSha256);
    assert.equal(sha(edit.original), edit.originalSha256);
    assert.equal(sha(prior), edit.beforeSha256, 'Every whole intermediate SOURCE input is pinned');
    assert.equal(prior.slice(edit.offset, edit.offset + edit.current.length), edit.current, 'Exact Git hunk and offset');
    prior = prior.slice(0, edit.offset) + edit.original + prior.slice(edit.offset + edit.current.length);
    assert.equal(sha(prior), edit.afterSha256, 'Every whole inverse successor is pinned');
  }
  assert.equal(hunk, 1);
  assert.equal(Buffer.byteLength(prior), row.predecessorBytes);
  assert.equal(sha(prior), row.predecessorSha256, 'Whole genuine newer P0/587 caller with only the observed588 UA sync');
  return prior;
}

export function inverseRelease588WorkflowUserAgents(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  const row = review.release588;
  if (role !== row.role || sha(source) !== row.actualSha256) return source;
  assert.equal(Buffer.byteLength(source), row.actualBytes);
  assert.equal(source.split(row.actual).length - 1, row.count, 'Only the five observed normal UA fields');
  const previous = source.replaceAll(row.actual, row.original);
  assert.equal(Buffer.byteLength(previous), row.originalBytes);
  assert.equal(sha(previous), row.originalSha256, 'The entire genuine d4bd caller remains the old oracle');
  return previous;
}
// The old oracles still reject unknown bytes. Only this exact newer outer
// SOURCE image and the observed five-UA version image gain a test-only view.
export function inverseSourceNormalWorkflowForHistoricalOracle(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  source = inverseSourceNormalWorkflowOuter(source, role);
  if (!Object.hasOwn(review.roles, role)) return source;
  if (source.includes('source_normal_producer:')) source = inverseSourceNormalWorkflow(source, role);
  return inverseRelease588WorkflowUserAgents(source, role);
}
