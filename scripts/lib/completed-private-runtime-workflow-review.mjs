import { inverseLf7ObserverUpdaterTestInput } from './archived-weather-restart-updater-test-input.mjs';
// Test-only exact inverse. Every byte of the historical workflow oracle is
// retained; new-route behavior is tested separately against the actual files.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {requireSourceProducerOutput, assertSourceProducerAfter597StaticCode}
  from './source-producer-after597-runtime-family.mjs';
const review = JSON.parse(fs.readFileSync(new URL('./completed-private-runtime-workflow-review.json', import.meta.url), 'utf8'));
const coldReview = JSON.parse(fs.readFileSync(new URL('./current-family-cold-start-workflow-review.json', import.meta.url), 'utf8'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// TEST ONLY: exact terminal-delivery repair. No ordinary calculation/source
// admission changes: unknown/mixed bytes are returned to the old strict oracle.
export const terminalRepair4145WorkflowReview = Object.freeze({
  "roles": {
    "orchestrator": {
      "path": ".github/workflows/update-and-deploy.yml",
      "before": {
        "bytes": 67764,
        "sha256": "784041f35105e63ca60d3199923a20bb6d1c457b70e76a6d2cace2dcc494fe4f"
      },
      "after": {
        "bytes": 67790,
        "sha256": "2d178154177472a2b469b1c4bb063364dd443ff7122f5de062fc8c0f76940b0c"
      },
      "edits": [
        [
          15648,
          "      pull-requests: read\n",
          ""
        ]
      ]
    },
    "once": {
      "path": ".github/workflows/run-current-weather-once.yml",
      "before": {
        "bytes": 54634,
        "sha256": "3f0bbc19336918f20586c92432dc2fb46985d3657d842209a26e788426dcf814"
      },
      "after": {
        "bytes": 54660,
        "sha256": "b9301a3e3a2e8a25363df5c7e4eaf2128df017220ab5baefde06364410e8bc3e"
      },
      "edits": [
        [
          3266,
          "      pull-requests: read\n",
          ""
        ]
      ]
    },
    "repair": {
      "path": ".github/workflows/deploy-code-only-repair.yml",
      "before": {
        "bytes": 225095,
        "sha256": "9d16a127c0e7b0e256e199982b56f14762f370f8e30720b2545a40b97bf09dc1"
      },
      "after": {
        "bytes": 225121,
        "sha256": "1619b09526d8ea1288bc4c94a690b997f5a5b0f05e12b8ecc26da08e984c4c75"
      },
      "edits": [
        [
          8547,
          "      pull-requests: read\n",
          ""
        ]
      ]
    },
    "recovery": {
      "path": ".github/workflows/reusable-operational-reentry.yml",
      "before": {
        "bytes": 100817,
        "sha256": "e561395bf9bda19e7f9c3d0454f77a64721517059640bb1c2be89680b912b4c8"
      },
      "after": {
        "bytes": 102685,
        "sha256": "6228ec52b4901aa26f6fa29cda81826a5f8c3536441aba8d28e5c78473f19370"
      },
      "edits": [
        [
          54714,
          "          node scripts/ravscore-operational-pages-recovery.mjs --read-protected-prepared-target \\\n",
          "          node scripts/ravscore-operational-pages-recovery.mjs \\\n"
        ],
        [
          44462,
          "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n",
          ""
        ],
        [
          43871,
          "        with:\n          fetch-depth: 0\n",
          ""
        ],
        [
          43456,
          "      pull-requests: read\n",
          ""
        ],
        [
          25991,
          "          node scripts/ravscore-operational-pages-recovery.mjs --read-protected-prepared-target \\\n",
          "          node scripts/ravscore-operational-pages-recovery.mjs \\\n"
        ],
        [
          6716,
          "            # Only a repaired caller with an already issued exact ordinary plan\n            # may cross the old-producer/new-executor boundary. The helper reads\n            # and authenticates the protected phase/target again before real CAS.\n            if test \"$(jq -er '.slot.target.sourceHead' \"$RAVRADAR_OPERATIONAL_WORK/pre-activation.json\")\" != \"$GITHUB_SHA\" \\\n              && test \"$(jq -er '.pending' \"$RAVRADAR_OPERATIONAL_WORK/current.json\")\" = false \\\n              && test \"$(jq -er '.publicManifestSha256' \"$RAVRADAR_OPERATIONAL_WORK/current.json\")\" != \"$(jq -er '.slot.target.publicManifestSha256' \"$RAVRADAR_OPERATIONAL_WORK/pre-activation.json\")\"; then\n              gh run download \"$phase_run\" \\\n                --name \"ravscore-operational-recovery-$phase_run-$phase_attempt\" \\\n                --dir \"$RAVRADAR_OPERATIONAL_WORK/prepared-original\"\n              node scripts/protected-operational-reentry-evidence.mjs --begin-terminal-pre-activation \\\n                --repository \"$GITHUB_REPOSITORY\" --attempt \"$RAVRADAR_OPERATIONAL_WORK/pre-activation-attempt.json\" \\\n                --directory \"$RAVRADAR_OPERATIONAL_WORK/prepared-original\" --base-url \"$RAVRADAR_PUBLIC_BASE_URL\" \\\n                --output \"$RAVRADAR_OPERATIONAL_WORK/prepared-begin.json\"\n              # Never keep the pre-BEGIN source/version in the ordinary pending path.\n              node scripts/ravscore-operational-activation.mjs read \\\n                --output \"$RAVRADAR_OPERATIONAL_WORK/current.json\"\n            fi\n",
          ""
        ],
        [
          4690,
          "        with:\n          fetch-depth: 0\n",
          ""
        ],
        [
          3561,
          "      pull-requests: read\n",
          ""
        ],
        [
          3075,
          "  pull-requests: read\n",
          ""
        ]
      ]
    },
    "deploy": {
      "path": ".github/workflows/reusable-pages-deploy.yml",
      "before": {
        "bytes": 66387,
        "sha256": "a7ee43cf148c0431ec4fa6235a5dcd2e69adb391f3defda0fb63efde3de43f52"
      },
      "after": {
        "bytes": 66486,
        "sha256": "260c06d3fbc08e7bf80563b803eed758251805f55cf4a0c147526d70c3e4b8f1"
      },
      "edits": [
        [
          32113,
          "          --source-deployment-id \"$(cat \"$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt\")\"\n",
          ""
        ]
      ]
    }
  },
  "wrapper": {
    "path": ".github/workflows/resume-operational-checkpoint.yml",
    "name": "resume-operational-checkpoint.yml",
    "bytes": 1116,
    "sha256": "498c02e1549e7b4e9c8ffb0674e89968f5ad09c7191f462bbe3660634cae41ad"
  }
});
// TEST ONLY: one exact scalar-planning workflow successor. Unknown bytes
// retain every existing whole-workflow rejection; no production authority.
export const qualifiedScalarPlanningWorkflowReview = Object.freeze({
  "before": {
    "bytes": 294645,
    "sha256": "58168cce22cbf34595748fc4cf1d4929457a77754719dbb54f9da40a1c803bdb"
  },
  "after": {
    "bytes": 297829,
    "sha256": "674864b0a68ee9bb8da00f835386bbd5aa53e1d329ad9a948939e81ad4bafaf8"
  },
  "hunks": [
    [
      "            --github-output \"$GITHUB_OUTPUT\"\n",
      "            --github-output \"$GITHUB_OUTPUT\"\n          printf 'cache_path=%s\\n' \"$recovery_cache\" >> \"$GITHUB_OUTPUT\"\n"
    ],
    [
      "      - name: Plan global current acquisition before DMI\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')\n        continue-on-error: true\n        shell: bash\n        run: |\n          if ! python scripts/build-weather-acquisition-plan.py \\\n            --at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\" \\\n            --report data/diagnostics/weather-acquisition-plan-before-dmi.json; then\n            rm -f .cache/weather-current-acquisition-plan.json\n            echo \"::warning::Advisory acquisition plan unavailable; DMI uses conservative native coverage.\"\n          fi\n\n",
      "      - name: Plan global current acquisition before DMI\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')\n        shell: bash\n        env:\n          DMI_PLANNING_SNAPSHOT: ${{ steps.dmi-recovery-budget.outputs.cache_path }}\n          DMI_PART_CONTINUITY_DONOR_PATH: ${{ steps.restored-dmi-part-continuity-donor.outputs.path }}\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\n          RAVRADAR_RETAINED_SCALAR_CONTEXT: ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && 'ordinary-restored' || '' }}\n        run: |\n          set -euo pipefail\n          rm -f .cache/weather-scalar-needs.json .cache/weather-qualified-acquisition-plan.json\n          scalar_args=(--cache \"$DMI_PLANNING_SNAPSHOT\" --at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\")\n          qualified_args=(--scalar-snapshot \"$DMI_PLANNING_SNAPSHOT\")\n          if test -n \"$DMI_PART_CONTINUITY_DONOR_PATH\"; then\n            scalar_args+=(--historical \"$DMI_PART_CONTINUITY_DONOR_PATH\")\n            qualified_args+=(--scalar-history \"$DMI_PART_CONTINUITY_DONOR_PATH\")\n          fi\n          if test \"$RAVRADAR_RETAINED_SCALAR_CONTEXT\" = ordinary-restored; then\n            scalar_status=0\n            node scripts/plan-weather-scalar-acquisition.mjs \"${scalar_args[@]}\" || scalar_status=$?\n            if test \"$scalar_status\" -eq 2; then\n              echo \"::error::Retained scalar planning did not prove transport termination.\"\n              exit 2\n            elif test \"$scalar_status\" -ne 0; then\n              echo \"::warning::Retained scalar planning unavailable; native priority is preserved.\"\n            fi\n          fi\n          if ! python scripts/build-weather-acquisition-plan.py \\\n            --at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\" \\\n            --report data/diagnostics/weather-acquisition-plan-before-dmi.json \\\n            \"${qualified_args[@]}\"; then\n            rm -f .cache/weather-current-acquisition-plan.json .cache/weather-qualified-acquisition-plan.json\n            echo \"::warning::Advisory acquisition plan unavailable; DMI uses conservative native coverage.\"\n          fi\n\n"
    ],
    [
      "          DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: .cache/weather-current-acquisition-plan.json\n",
      "          DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: .cache/weather-current-acquisition-plan.json\n          DMI_BULK_QUALIFIED_ACQUISITION_PLAN_PATH: .cache/weather-qualified-acquisition-plan.json\n          DMI_BULK_SCALAR_SNAPSHOT_PATH: ${{ steps.dmi-recovery-budget.outputs.cache_path }}\n          DMI_PART_CONTINUITY_DONOR_PATH: ${{ steps.restored-dmi-part-continuity-donor.outputs.path }}\n"
    ]
  ]
});
// TEST ONLY: remove the reviewed public projection changes before the
// unchanged whole-source weather workflow checks. Mixed bytes stay unknown.
export const pagesPublicProjectionWorkflowReview = Object.freeze({
  "base": "84051e2d700595837ebf80426410dcbef8e08704",
  "tree": "5c7147ffbe31a7a983241d31eca3a8dbbf1df14b",
  "roles": {
    "build": {
      "path": ".github/workflows/reusable-weather-build.yml",
      "before": {
        "bytes": 297899,
        "sha256": "451249801b6944d945b193fd95de5065cf057a8b08a6698a675e2192c074100c"
      },
      "after": {
        "bytes": 298105,
        "sha256": "5810df1f9a3dce1a76accaab14f9cb9b69133b4783c9e7426443eb5d74b21a3f"
      },
      "edits": [
        [
          243473,
          "            node scripts/copy-pages-public-delivery.mjs --source \"$pages_source/data/live\" --target \"$pages_destination/data/live\"\n",
          "            node scripts/copy-public-delivery-shards.mjs --source \"$pages_source/data/live\" --target \"$pages_destination/data/live\"\n"
        ],
        [
          241489,
          "              --exclude '/data/jordrav/prototype-0.1.0/' \\\n",
          ""
        ],
        [
          191432,
          "        env:\n          RAVRADAR_PLAIN_MAP_HOURS: 'true'\n          RAVRADAR_PUBLIC_COLD_HOURS: 'true'\n          RAVRADAR_PUBLIC_BULK_ARCHIVE: 'true'\n",
          ""
        ]
      ]
    },
    "once": {
      "path": ".github/workflows/run-current-weather-once.yml",
      "before": {
        "bytes": 54660,
        "sha256": "b9301a3e3a2e8a25363df5c7e4eaf2128df017220ab5baefde06364410e8bc3e"
      },
      "after": {
        "bytes": 55548,
        "sha256": "defc1a6fa360472b27335eccbe6f26f6bbc66d14442a990b873557def2f032af"
      },
      "edits": [
        [
          34653,
          "          if (archive) {\n            const stored = path.join(root, archivedLocal);\n            const file = await fs.lstat(stored);\n            assert(file.isFile() && !file.isSymbolicLink() && file.size === archive.bytes);\n            await publicBulk.restorePublicBulkArchiveFile({ manifest, archiveBytes: await fs.readFile(stored), signal,\n              rawDestination: path.join(root, 'public-condition-details.json') });\n            await fs.unlink(stored);\n          }\n",
          ""
        ],
        [
          34103,
          "            archive ? ['data/live/' + archive.path.slice(2), archivedLocal, archive.bytes]\n              : ['data/live/public-condition-details.json', 'public-condition-details.json', manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes)],\n",
          "            ['data/live/public-condition-details.json', 'public-condition-details.json', manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes)],\n"
        ],
        [
          33653,
          "          const publicBulk = manifest.publicConditionDetailsArchive === undefined ? null\n            : await import('./scripts/lib/public-bulk-details-archive.mjs');\n          const archive = publicBulk?.publicBulkArchiveEntry(manifest) ?? null;\n          const archivedLocal = 'public-condition-details.archive.gz';\n",
          ""
        ]
      ]
    },
    "repair": {
      "path": ".github/workflows/deploy-code-only-repair.yml",
      "before": {
        "bytes": 225121,
        "sha256": "1619b09526d8ea1288bc4c94a690b997f5a5b0f05e12b8ecc26da08e984c4c75"
      },
      "after": {
        "bytes": 225325,
        "sha256": "391628fbcaae106df7a29d5c7caa3a7487af18b025bd4692bc93aaab5d396bf8"
      },
      "edits": [
        [
          160916,
          "          node scripts/copy-pages-public-delivery.mjs --source data/live --target _site/data/live\n",
          "          node scripts/copy-public-delivery-shards.mjs --source data/live --target _site/data/live\n"
        ],
        [
          159440,
          "            --exclude '/data/jordrav/prototype-0.1.0/' \\\n",
          ""
        ],
        [
          99500,
          "        env:\n          RAVRADAR_PLAIN_MAP_HOURS: 'true'\n          RAVRADAR_PUBLIC_COLD_HOURS: 'true'\n          RAVRADAR_PUBLIC_BULK_ARCHIVE: 'true'\n",
          ""
        ]
      ]
    }
  }
});
for (const row of Object.values(pagesPublicProjectionWorkflowReview.roles)) {
  for (const edit of row.edits) Object.freeze(edit);
  Object.freeze(row.edits);
  Object.freeze(row.before);
  Object.freeze(row.after);
  Object.freeze(row);
}
Object.freeze(pagesPublicProjectionWorkflowReview.roles);

// TEST ONLY: two exact hosted-SDK workflow insertions before the unchanged
// release597, Pages, scalar, completed-runtime and older whole-file oracles.
// TEST ONLY: the one reviewed weather-process target spelling; global H0 and
// all origin/admission/model bytes remain unchanged.
export const weatherProcessHourWorkflowReview = Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "before": {
    "bytes": 298641,
    "sha256": "b66f049d80698b3d0fe14a08f25eaae01973f6f0991dfbd9eaf7b6243a8c1ae2"
  },
  "after": {
    "bytes": 299638,
    "sha256": "efd7b3ccd447bf59e5070dccaeb157ca971ecd3855db73bce33cc7e2ae79898e"
  },
  "original": "        run: npm run update:weather\n",
  "normalized": "        shell: bash\n        run: |\n          set -euo pipefail\n          canonical_target=\"$(node --input-type=module <<'NODE_WEATHER_TARGET'\n          import assert from 'node:assert/strict';\n          import { resolveProductionReferenceTime } from './scripts/lib/production-reference-time.mjs';\n          const supplied = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;\n          assert.equal(typeof supplied, 'string', 'WEATHER_PROCESS_TARGET_REQUIRED');\n          assert.match(supplied, /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:00:00(?:\\.000)?Z$/, 'WEATHER_PROCESS_TARGET_HOUR');\n          const canonical = resolveProductionReferenceTime(supplied);\n          assert.equal(canonical.replace('.000Z', 'Z'), supplied.replace('.000Z', 'Z'), 'WEATHER_PROCESS_TARGET_CHANGED');\n          assert.equal(Date.parse(canonical), Date.parse(supplied), 'WEATHER_PROCESS_TARGET_CHANGED');\n          process.stdout.write(canonical);\n          NODE_WEATHER_TARGET\n          )\"\n          RAVRADAR_PRODUCTION_TARGET_HOUR=\"$canonical_target\" npm run update:weather\n"
});
// TEST ONLY: exact ordinary4.0.598 User-Agent delta over actual main1684.
// Unknown, mixed, wrong-role or same-size drift stays outside every inverse.
export const release598WorkflowUserAgentReview=Object.freeze({
  path:'.github/workflows/reusable-weather-build.yml',
  before:Object.freeze({bytes:300010,sha256:'2162c9d81e09035f33538f8f0e03e5777af58ed718671e5c7cf3d936a34635d8'}),
  after:Object.freeze({bytes:300010,sha256:'2f7917b26a994d4d33dd7445cdc992e571a9dcc3245867564dda85ebda145c61'}),
  original:'RavRadar/4.0.597',issued:'RavRadar/4.0.598',count:5,
});
export const pagesArtifactVisibilityWorkflowReview = Object.freeze({
  path: release598WorkflowUserAgentReview.path,
  before: release598WorkflowUserAgentReview.after,
  after: Object.freeze({bytes:300006,sha256:'f5ef7759abffa78506638a327c0fe9c5ef9555f1be7d982606428974c94e9f1c'}),
  beforeLine: '          gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$artifact_id" ',
  afterLine: '          node scripts/read-pages-artifact-metadata.mjs "$artifact_id" ',
});
export const pagesArtifactVisibilityExhaustionWorkflowReview = Object.freeze({
  before: pagesArtifactVisibilityWorkflowReview.after,
  after: Object.freeze({bytes:302000,sha256:'d21fad73693dc5d5c8db69535efdfc5cae27c78897422d4fc9ab731d6440295f'}),
  sealStart: '          if node scripts/read-pages-artifact-metadata.mjs "$artifact_id" ',
  markerStart: '      - name: Confirm exhausted exact Pages artifact metadata visibility\n',
  markerEnd: '      - name: Upload privacy-safe operational handoff evidence after Pages artifact seal\n',
});
export function inversePagesArtifactVisibilityExhaustionWorkflow(source,role) {
  const row=pagesArtifactVisibilityExhaustionWorkflowReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes);
  for(const anchor of [row.sealStart,row.markerStart,row.markerEnd])assert.equal(source.split(anchor).length,2);
  const start=source.indexOf(row.sealStart);
  const end=source.indexOf('          jq -e ',start);
  const marker=source.indexOf(row.markerStart);
  const next=source.indexOf(row.markerEnd);
  assert(start>=0&&start<end&&end<marker&&marker<next);
  const read=pagesArtifactVisibilityWorkflowReview.afterLine+'\\\n'
    +'            > "$RAVRADAR_OPERATIONAL_HANDOFF/pages-artifact-rest.json"\n';
  const previous=source.slice(0,start)+read+source.slice(end,marker)+source.slice(next);
  assert.equal(Buffer.byteLength(previous),row.before.bytes);
  assert.equal(sha(previous),row.before.sha256);
  return previous;
}
export function inversePagesArtifactVisibilityWorkflow(source,role) {
  source=inversePagesArtifactVisibilityExhaustionWorkflow(source,role);
  const row=pagesArtifactVisibilityWorkflowReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes);
  assert.equal(source.split(row.afterLine).length,2);
  const previous=source.replace(row.afterLine,row.beforeLine);
  assert.equal(Buffer.byteLength(previous),row.before.bytes);
  assert.equal(sha(previous),row.before.sha256);
  return previous;
}
export function inverseRelease598WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE598_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE598_WORKFLOW_TYPE');
  source=inversePagesArtifactVisibilityWorkflow(source,role);
  const row=release598WorkflowUserAgentReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes);
  assert.equal(source.split(row.issued).length,row.count+1,'Exactly five reviewed598 UA fields');
  const previous=source.replaceAll(row.issued,row.original);
  assert.equal(Buffer.byteLength(previous),row.before.bytes);
  assert.equal(sha(previous),row.before.sha256,'Every actualmain1684 byte survives the598 UA inverse');
  assert.equal(previous.split(row.original).length,row.count+1);
  assert.equal(previous.replaceAll(row.original,row.issued),source,'Whole exact598 UA roundtrip');
  return previous;
}

// TEST ONLY: the one exact required full-validation/release publication guard.
// Public-audit diagnostic outcomes and all previous whole-file oracles remain.
export const requiredPublicationGatesWorkflowReview=Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "before": {
    "bytes": 299638,
    "sha256": "efd7b3ccd447bf59e5070dccaeb157ca971ecd3855db73bce33cc7e2ae79898e"
  },
  "after": {
    "bytes": 300010,
    "sha256": "2162c9d81e09035f33538f8f0e03e5777af58ed718671e5c7cf3d936a34635d8"
  },
  "anchor": "      - name: Build lean GitHub Pages artifact\n        id: pages-build\n        if: steps.preflight.outputs.should_run == 'true'\n        shell: bash\n        run: |\n",
  "inserted": "          if test \"${{ steps.operational-action.outputs.action }}\" != 'integrated-cutover'; then\n            if test \"${{ steps.full-validation.outcome }}\" != success \\\n              || test \"${{ steps.release-gate.outcome }}\" != success; then\n              echo \"::error::PRODUCTION_PUBLICATION_REQUIRED_GATES_NOT_PASSED\"\n              exit 1\n            fi\n          fi\n"
});
export function inverseRequiredPublicationGatesWorkflow(source,role){
  assert.equal(arguments.length,2,'REQUIRED_PUBLICATION_GATES_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','REQUIRED_PUBLICATION_GATES_WORKFLOW_TYPE');
  source=inverseRelease598WorkflowUserAgents(source,role);
  const row=requiredPublicationGatesWorkflowReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes);
  const selected=row.anchor+row.inserted;
  assert.equal(source.split(selected).length,2,'Exactly one reviewed common publication guard');
  const previous=source.replace(selected,()=>row.anchor);
  assert.equal(Buffer.byteLength(previous),row.before.bytes);
  assert.equal(sha(previous),row.before.sha256,'Exact whole9425 predecessor');
  assert.equal(previous.replace(row.anchor,()=>selected),source,'Exact whole publication guard roundtrip');
  return previous;
}

export function inverseWeatherProcessHourWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'WEATHER_PROCESS_HOUR_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'WEATHER_PROCESS_HOUR_WORKFLOW_TYPE');
  source=inverseRequiredPublicationGatesWorkflow(source,role);
  const row = weatherProcessHourWorkflowReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'WEATHER_PROCESS_HOUR_WORKFLOW_AFTER_BYTES');
  assert.equal(source.split(row.normalized).length, 2, 'WEATHER_PROCESS_HOUR_WORKFLOW_EXACT_CALLER');
  const previous = source.replace(row.normalized, () => row.original);
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'WEATHER_PROCESS_HOUR_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(previous), row.before.sha256, 'WEATHER_PROCESS_HOUR_WORKFLOW_WHOLE_PREDECESSOR');
  return previous;
}

export const runnerAndroidSdkWorkflowReview = Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "before": {
    "bytes": 298105,
    "sha256": "191471c829c87ada40096125b80ae52a004a9b2c48464915ceb5d291ddaf82ba"
  },
  "after": {
    "bytes": 298641,
    "sha256": "b66f049d80698b3d0fe14a08f25eaae01973f6f0991dfbd9eaf7b6243a8c1ae2"
  },
  "steps": [
    [
      "      - name: Install production geometry tools\n",
      "      - name: Reclaim only the unused hosted Android SDK before private restoration\n        if: steps.preflight.outputs.should_run == 'true'\n        timeout-minutes: 3\n        run: node scripts/reclaim-runner-android-sdk.mjs\n\n"
    ],
    [
      "      - name: Restore bounded DMI GRIB download cache\n",
      "      - name: Measure runner storage immediately before RAW cache restoration\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')\n        run: node scripts/reclaim-runner-android-sdk.mjs --observe-raw\n\n"
    ]
  ]
});
for (const step of runnerAndroidSdkWorkflowReview.steps) Object.freeze(step);
Object.freeze(runnerAndroidSdkWorkflowReview.steps);
Object.freeze(runnerAndroidSdkWorkflowReview.before);
Object.freeze(runnerAndroidSdkWorkflowReview.after);
export function inverseRunnerAndroidSdkWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'RUNNER_SDK_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'RUNNER_SDK_WORKFLOW_TYPE');
  source = inverseWeatherProcessHourWorkflow(source, role);
  const row = runnerAndroidSdkWorkflowReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'RUNNER_SDK_WORKFLOW_AFTER_BYTES');
  for (const [anchor, step] of row.steps) {
    assert.equal(source.split(step + anchor).length, 2, 'RUNNER_SDK_WORKFLOW_EXACT_STEP');
    source = source.replace(step + anchor, () => anchor);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'RUNNER_SDK_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(source), row.before.sha256, 'RUNNER_SDK_WORKFLOW_WHOLE_PREDECESSOR');
  return source;
}

// Test-only release597 identification for the exact PR804 build workflow.
export function inverseRelease597WorkflowUserAgents(source, role) {
  source = inverseRunnerAndroidSdkWorkflow(source, role);
  const after = '191471c829c87ada40096125b80ae52a004a9b2c48464915ceb5d291ddaf82ba';
  if (role !== 'build' || sha(source) !== after) return source;
  assert.equal(Buffer.byteLength(source), 298105);
  assert.equal(source.split('RavRadar/4.0.597').length, 6, 'Exactly five reviewed597 UA changes');
  const previous = source.replaceAll('RavRadar/4.0.597', 'RavRadar/4.0.594');
  assert.equal(sha(previous), pagesPublicProjectionWorkflowReview.roles.build.after.sha256,
    'Every byte of the reviewed Pages build survives the597 UA inverse');
  assert.equal(previous.replaceAll('RavRadar/4.0.594', 'RavRadar/4.0.597'), source);
  return previous;
}

export function inversePagesPublicProjectionWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'PAGES_PUBLIC_PROJECTION_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'PAGES_PUBLIC_PROJECTION_WORKFLOW_TYPE');
  if (role === 'repair') source = inverseReviewedSource601HistoricalCodeInput(source, '.github/workflows/deploy-code-only-repair.yml');
  source = inverseRelease597WorkflowUserAgents(source, role);
  const { roles } = pagesPublicProjectionWorkflowReview;
  const row = typeof role === 'string' && Object.hasOwn(roles, role) ? roles[role] : null;
  if (!row || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'PAGES_PUBLIC_PROJECTION_WORKFLOW_AFTER_BYTES');
  for (const [offset, actual, original] of row.edits) {
    assert.equal(source.slice(offset, offset + actual.length), actual, 'PAGES_PUBLIC_PROJECTION_WORKFLOW_EXACT_HUNK');
    source = source.slice(0, offset) + original + source.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'PAGES_PUBLIC_PROJECTION_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(source), row.before.sha256, 'PAGES_PUBLIC_PROJECTION_WORKFLOW_WHOLE_PREDECESSOR');
  return source;
}
export function inverseQualifiedScalarSchemaWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'QUALIFIED_SCALAR_SCHEMA_ARGUMENTS');
  assert.equal(typeof source, 'string', 'QUALIFIED_SCALAR_SCHEMA_TYPE');
  source = inversePagesPublicProjectionWorkflow(source, role);
  // TEST ONLY: the exact schema1/2 work-selector successor, no runtime proof.
  if (role === 'build' && sha(source) === '451249801b6944d945b193fd95de5065cf057a8b08a6698a675e2192c074100c') {
    assert.equal(Buffer.byteLength(source), 297899, 'QUALIFIED_SCALAR_SCHEMA_AFTER_BYTES');
    const actual = "RAVRADAR_RETAINED_SCALAR_CONTEXT: ${{ (steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' || steps.dmi-part-continuity-donor.outputs.continuity_schema == '2')";
    const original = "RAVRADAR_RETAINED_SCALAR_CONTEXT: ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1'";
    assert.equal(source.split(actual).length, 2, 'QUALIFIED_SCALAR_SCHEMA_EXACT_HUNK');
    source = source.replace(actual, () => original);
    assert.equal(Buffer.byteLength(source), 297829, 'QUALIFIED_SCALAR_SCHEMA_BEFORE_BYTES');
    assert.equal(sha(source), '674864b0a68ee9bb8da00f835386bbd5aa53e1d329ad9a948939e81ad4bafaf8', 'QUALIFIED_SCALAR_SCHEMA_WHOLE_PREDECESSOR');
  }
  return source;
}
export function inverseQualifiedScalarPlanningWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'QUALIFIED_SCALAR_INVERSE_ARGUMENTS');
  assert.equal(typeof source, 'string', 'QUALIFIED_SCALAR_INVERSE_TYPE');
  source = inverseQualifiedScalarSchemaWorkflow(source, role);
  const row = qualifiedScalarPlanningWorkflowReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'QUALIFIED_SCALAR_AFTER_BYTES');
  for (const [original, actual] of row.hunks) {
    assert.equal(source.split(actual).length, 2, 'QUALIFIED_SCALAR_EXACT_HUNK');
    source = source.replace(actual, () => original);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'QUALIFIED_SCALAR_BEFORE_BYTES');
  assert.equal(sha(source), row.before.sha256, 'QUALIFIED_SCALAR_WHOLE_PREDECESSOR');
  return source;
}
export function inverseTerminalRepair4145Workflow(source, role) {
  assert.equal(arguments.length, 2, 'TERMINAL4145_INVERSE_ARGUMENTS');
  assert.equal(typeof source, 'string', 'TERMINAL4145_INVERSE_TYPE');
  source = inverseSource603SavedWorkflowRole(source, role);
  if (role === 'repair') source = inverseReviewedSource601HistoricalCodeInput(source, '.github/workflows/deploy-code-only-repair.yml');
  source = inverseReviewedSource601OperationalWorkflowInspection(source, role);
  source = inverseQualifiedScalarPlanningWorkflow(source, role);
  const roles = terminalRepair4145WorkflowReview.roles;
  const row = typeof role === 'string' && Object.hasOwn(roles, role) ? roles[role] : null;
  if (!row || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'TERMINAL4145_AFTER_BYTES');
  for (const [offset, actual, original] of row.edits) {
    assert.equal(source.slice(offset, offset + actual.length), actual, 'TERMINAL4145_EXACT_SEGMENT');
    source = source.slice(0, offset) + original + source.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'TERMINAL4145_BEFORE_BYTES');
  assert.equal(sha(source), row.before.sha256, 'TERMINAL4145_WHOLE_PREDECESSOR');
  return source;
}
export function inverseTerminalRepair4145WorkflowInventory(names, wrapperSource) {
  assert.equal(arguments.length, 2, 'TERMINAL4145_INVENTORY_ARGUMENTS');
  assert(Array.isArray(names) && names.every(name => typeof name === 'string'), 'TERMINAL4145_INVENTORY_TYPE');
  assert.equal(new Set(names).size, names.length, 'TERMINAL4145_INVENTORY_DUPLICATE');
  const row = terminalRepair4145WorkflowReview.wrapper;
  assert.equal(typeof wrapperSource, 'string', 'TERMINAL4145_WRAPPER_TYPE');
  assert.equal(Buffer.byteLength(wrapperSource), row.bytes, 'TERMINAL4145_WRAPPER_BYTES');
  assert.equal(sha(wrapperSource), row.sha256, 'TERMINAL4145_WRAPPER_WHOLE');
  assert.equal(names.filter(name => name === row.name).length, 1, 'TERMINAL4145_WRAPPER_ONE');
  return names.filter(name => name !== row.name);
}
// TEST ONLY: exact normal pinned-source preparation inverse. The complete
// preceding594 workflow and every historical oracle remain unchanged.
export const fullGitPinnedSourcePreparationWorkflowReview = Object.freeze({
  "before": {
    "bytes": 294485,
    "sha256": "6b205b7a8c99c61cf4b6f65030acb22676d66d115a5469101a3062aa20f113d2"
  },
  "after": {
    "bytes": 294645,
    "sha256": "58168cce22cbf34595748fc4cf1d4929457a77754719dbb54f9da40a1c803bdb"
  },
  "hunks": [
    [
      "          git fetch --no-tags --depth=1 origin \"$legacy_source_head\"\n          test \"$(git rev-parse FETCH_HEAD^{commit})\" = \"$legacy_source_head\"\n",
      "          if ! git cat-file -e \"${legacy_source_head}^{commit}\" 2>/dev/null; then\n            git fetch --no-tags origin \"$legacy_source_head\"\n            test \"$(git rev-parse FETCH_HEAD^{commit})\" = \"$legacy_source_head\"\n          fi\n          test \"$(git rev-parse \"${legacy_source_head}^{commit}\")\" = \"$legacy_source_head\"\n"
    ],
    [
      "              git fetch --no-tags --depth=1 origin \"$original_head\"\n",
      "              git fetch --no-tags origin \"$original_head\"\n"
    ],
    [
      "          if ! git cat-file -e \"${legacy_source_head}^{commit}\" 2>/dev/null; then\n            git fetch --no-tags --depth=1 origin \"$legacy_source_head\"\n          fi\n",
      "          if ! git cat-file -e \"${legacy_source_head}^{commit}\" 2>/dev/null; then\n            git fetch --no-tags origin \"$legacy_source_head\"\n          fi\n"
    ]
  ]
});
export function inverseFullGitPinnedSourcePreparationWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'FULL_GIT_PINNED_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'FULL_GIT_PINNED_WORKFLOW_TYPE');
  source = inverseTerminalRepair4145Workflow(source, role);
  const row = fullGitPinnedSourcePreparationWorkflowReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'FULL_GIT_PINNED_WORKFLOW_AFTER_SIZE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'FULL_GIT_PINNED_WORKFLOW_EXACT_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'FULL_GIT_PINNED_WORKFLOW_BEFORE_SIZE');
  assert.equal(sha(source), row.before.sha256, 'FULL_GIT_PINNED_WORKFLOW_WHOLE_INVERSE');
  return source;
}
// TEST ONLY: præcis normal versionssynk; hele593-workflowet bevares.
export const release594WorkflowUserAgentReview=Object.freeze({
  before:Object.freeze({bytes:294485,sha256:'49b7609139f2ad62228eed7d89bcb0fa4106476cd5b7bd311a8f86f895060f6b'}),
  after:Object.freeze({bytes:294485,sha256:'6b205b7a8c99c61cf4b6f65030acb22676d66d115a5469101a3062aa20f113d2'}),
});
export function inverseRelease594WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE594_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE594_WORKFLOW_TYPE');
  source=inverseFullGitPinnedSourcePreparationWorkflow(source,role);
  const row=release594WorkflowUserAgentReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes,'RELEASE594_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.594').length,6,'Exactly five normal594 User-Agent fields');
  const previous=source.replaceAll('RavRadar/4.0.594','RavRadar/4.0.593');
  assert.equal(Buffer.byteLength(previous),row.before.bytes,'RELEASE594_PREDECESSOR_SIZE');
  assert.equal(sha(previous),row.before.sha256,'Every immutable593 workflow byte survives');
  return previous;
}
// TEST ONLY: the actual593 workflow changes only the five normal UA literals.
// The immutable592 audit/capacity body and every older oracle remain intact.
export const release593WorkflowUserAgentReview=Object.freeze({
  before:Object.freeze({bytes:294485,sha256:'e7efa59703de0914786cd4bb0230313d21fbb24218c9a4a4935875b43f836267'}),
  after:Object.freeze({bytes:294485,sha256:'49b7609139f2ad62228eed7d89bcb0fa4106476cd5b7bd311a8f86f895060f6b'}),
});
export function inverseRelease593WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE593_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE593_WORKFLOW_TYPE');
  const row=release593WorkflowUserAgentReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes,'RELEASE593_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.593').length,6,'Exactly five normal593 User-Agent fields');
  const previous=source.replaceAll('RavRadar/4.0.593','RavRadar/4.0.592');
  assert.equal(Buffer.byteLength(previous),row.before.bytes,'RELEASE593_PREDECESSOR_SIZE');
  assert.equal(sha(previous),row.before.sha256,'Every immutable592 workflow byte survives');
  return previous;
}
// Kun kontrolvisning af de fem normale versions-UA'er. Hele nye og gamle
// workflowbytes er fastbundet; ukendte billeder går uændret til gamle afslag.
// TEST ONLY: exact592 User-Agent successor of the complete591 capacity workflow.
// The five literal UA fields are the only inverse; no production admission.
export const release592WorkflowUserAgentReview = Object.freeze({
  before: Object.freeze({ bytes: 293121, sha256: '10bfb353d439877791c0a98043e2ca6e2ad0cd8a2b71bba44cc7e304e2e4897a' }),
  after: Object.freeze({ bytes: 293121, sha256: '393406fa0f1e4c6477cd4898aa6e43f49a1024693aa7b8e10b255ee153fe540f' }),
});
export function inverseRelease592WorkflowUserAgents(source, role) {
  assert.equal(arguments.length, 2, 'RELEASE592_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'RELEASE592_WORKFLOW_TYPE');
  source = inverseRuntimeAuditExecutionWorkflow(source, role);
  const row = release592WorkflowUserAgentReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'RELEASE592_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.592').length, 6, 'Exactly five normal592 User-Agent fields');
  const previous = source.replaceAll('RavRadar/4.0.592', 'RavRadar/4.0.591');
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'RELEASE592_PREDECESSOR_SIZE');
  assert.equal(sha(previous), row.before.sha256, 'Every591 capacity workflow byte survives');
  return previous;
}
// TEST ONLY: content-free audit execution/upload observation. Exact whole
// afterimage -> unchanged753; no production report or gate authority.
export const runtimeAuditExecutionWorkflowReview = Object.freeze({
  before:Object.freeze({bytes:293121,sha256:'10bfb353d439877791c0a98043e2ca6e2ad0cd8a2b71bba44cc7e304e2e4897a'}),
  after:Object.freeze({bytes:294485,sha256:'6a773164b36a721829a73b5cf66449d89434d91237e32ed9f8a6a185b55fe688'}),
  edits:Object.freeze([
  [
    "            # Both small observers use the same node executable/configuration as\n            # the audit; observer failure cannot replace its actual exit status.\n            node scripts/observe-runtime-audit-execution.mjs --phase before || true\n            runtime_audit_exit_status=0\n            node scripts/audit-ravscore-integrated-public-runtime.mjs \\\n              --input data/live/conditions.json \\\n              --output \"$audit_path\" \\\n              || runtime_audit_exit_status=$?\n            node scripts/observe-runtime-audit-execution.mjs --phase after \\\n              --exit-code \"$runtime_audit_exit_status\" || true\n            runtime_audit_outcome=\"success\"\n            if test \"$runtime_audit_exit_status\" != 0; then\n              runtime_audit_outcome=\"failure\"\n            fi\n            echo \"runtime_audit_exit_status=$runtime_audit_exit_status\" >> \"$GITHUB_OUTPUT\"\n            echo \"runtime_audit_outcome=$runtime_audit_outcome\" >> \"$GITHUB_OUTPUT\"\n",
    "            runtime_audit_outcome=\"success\"\n            node scripts/audit-ravscore-integrated-public-runtime.mjs \\\n              --input data/live/conditions.json \\\n              --output \"$audit_path\" \\\n              || runtime_audit_outcome=\"failure\"\n            echo \"runtime_audit_outcome=$runtime_audit_outcome\" >> \"$GITHUB_OUTPUT\"\n"
  ],
  [
    "        if: always() && steps.preflight.outputs.should_run == 'true' && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json') != ''",
    "        if: always() && steps.preflight.outputs.should_run == 'true' && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json') != ''"
  ],
  [
    "          path: |\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json\n",
    "          path: .geometry-v2-work/ravscore-integrated-public-runtime-audit.json\n"
  ],
  [
    "              if test -f \"$audit_path\"; then\n                echo \"::warning title=RavScore runtime audit::The audit found one or more model/state issues. The issues are retained in the payload-free audit report; valid weather publication continues.\"\n              else\n                echo \"::warning title=RavScore runtime audit process::The audit process stopped before its required report was written (exit $runtime_audit_exit_status). Fixed failure/execution observations are uploaded separately; the required-report publication gates remain unchanged.\"\n              fi\n",
    "              echo \"::warning title=RavScore runtime audit::The audit found one or more model/state issues. The issues are retained in the payload-free audit report; valid weather publication continues.\"\n"
  ]
])
});
export const runtimeAuditExecution592WorkflowReview = Object.freeze({
  before:Object.freeze({bytes:293121,sha256:'393406fa0f1e4c6477cd4898aa6e43f49a1024693aa7b8e10b255ee153fe540f'}),
  after:Object.freeze({bytes:294485,sha256:'e7efa59703de0914786cd4bb0230313d21fbb24218c9a4a4935875b43f836267'}),
  edits:runtimeAuditExecutionWorkflowReview.edits,
});
export function inverseRuntimeAuditExecutionWorkflow(source,role) {
  assert.equal(arguments.length,2,'RUNTIME_AUDIT_EXECUTION_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RUNTIME_AUDIT_EXECUTION_WORKFLOW_TYPE');
  source=inverseRelease594WorkflowUserAgents(source,role);
  source=inverseRelease593WorkflowUserAgents(source,role);
  const row=sha(source)===runtimeAuditExecution592WorkflowReview.after.sha256
    ?runtimeAuditExecution592WorkflowReview:runtimeAuditExecutionWorkflowReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes,'RUNTIME_AUDIT_EXECUTION_WORKFLOW_SIZE');
  let previous=source;
  for(const[after,before]of row.edits){
    assert.equal(previous.split(after).length,2,'RUNTIME_AUDIT_EXECUTION_EXACT_BLOCK');
    previous=previous.replace(after,()=>before);
  }
  assert.equal(Buffer.byteLength(previous),row.before.bytes,'RUNTIME_AUDIT_EXECUTION_PREDECESSOR_SIZE');
  assert.equal(sha(previous),row.before.sha256,'Every previous753 workflow byte survives');
  return previous;
}
// TEST ONLY: the reviewed scalar reserve capacity block, before unchanged
// release591 and all older whole-workflow oracles. Not production authority.
export const windTailCapacityWorkflowReview = Object.freeze({
  before: Object.freeze({ bytes: 292886, sha256: 'bfb4d382c36d713328e8d68f7a04801a16f35b3bcecffb3c1e9813cc578338c7' }),
  after: Object.freeze({ bytes: 293121, sha256: '10bfb353d439877791c0a98043e2ca6e2ad0cd8a2b71bba44cc7e304e2e4897a' }),
  beforeBlock: "          RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: ${{ inputs.quick_confirmation && '60000' || '90000' }}\n",
  afterBlock: "          # The ordinary scalar reserve must be able to reach all 673 PARTs.\n          # The runtime separately caps actual HTTP starts, including retries,\n          # and paces them; a longer deadline does not grant unlimited calls.\n          RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: ${{ inputs.quick_confirmation && '60000' || '600000' }}\n",
});
export function inverseWindTailCapacityWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'WIND_TAIL_CAPACITY_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'WIND_TAIL_CAPACITY_WORKFLOW_TYPE');
  source = inverseRuntimeAuditExecutionWorkflow(source, role);
  const row = windTailCapacityWorkflowReview;
  if (role !== 'build' || sha(source) !== row.after.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'WIND_TAIL_CAPACITY_WORKFLOW_SIZE');
  assert.equal(source.split(row.afterBlock).length, 2, 'WIND_TAIL_CAPACITY_EXACT_BLOCK');
  const previous = source.replace(row.afterBlock, () => row.beforeBlock);
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'WIND_TAIL_CAPACITY_PREDECESSOR_SIZE');
  assert.equal(sha(previous), row.before.sha256, 'Every previous591 workflow byte survives');
  return previous;
}
// TEST ONLY: exact591 -> genuine590 before the unchanged historical oracles.
export function inverseRelease591WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE591_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE591_WORKFLOW_TYPE');
  source=inverseRelease592WorkflowUserAgents(source,role);
  source=inverseWindTailCapacityWorkflow(source,role);
  if(role!=='build'||sha(source)!=='bfb4d382c36d713328e8d68f7a04801a16f35b3bcecffb3c1e9813cc578338c7')return source;
  assert.equal(Buffer.byteLength(source),292886,'RELEASE591_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.591').length,6,'Exactly five normal591 User-Agent fields');
  assert.equal(source.includes('RavRadar/4.0.590'),false,'No mixed release User-Agent fields');
  const previous=source.replaceAll('RavRadar/4.0.591','RavRadar/4.0.590');
  assert.equal(Buffer.byteLength(previous),292886,'RELEASE591_PREDECESSOR_SIZE');
  assert.equal(sha(previous),'bf9f27721718511cf345505416230b10c863a963bbb49ee774e4fdea8a7adfa6',
    'Whole genuine590 workflow survives only the five591 UA inverses');
  return previous;
}
// TEST ONLY: exact590→whole genuine588 UA layer. No gate, selector or runtime change.
export function inverseRelease590WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE590_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE590_WORKFLOW_TYPE');
  source=inverseRelease591WorkflowUserAgents(source,role);
  if(role!=='build'||sha(source)!=='bf9f27721718511cf345505416230b10c863a963bbb49ee774e4fdea8a7adfa6')return source;
  assert.equal(Buffer.byteLength(source),292886,'RELEASE590_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.590').length,6,'Exactly five normal590 User-Agent fields');
  assert.equal(source.includes('RavRadar/4.0.588'),false,'No mixed release User-Agent fields');
  const previous=source.replaceAll('RavRadar/4.0.590','RavRadar/4.0.588');
  assert.equal(Buffer.byteLength(previous),292886,'RELEASE590_PREDECESSOR_SIZE');
  assert.equal(sha(previous),'998d3a8e11a1088363a84bfd4a0d64f7117eacc059a3cf5c0ca895f7a85e22b3',
    'Whole genuine b574588 workflow survives only the five590 UA inverses');
  return previous;
}
export function inverseRelease588WorkflowUserAgents(source,role){
  assert.equal(arguments.length,2,'RELEASE588_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source,'string','RELEASE588_WORKFLOW_TYPE');
  source=inverseRelease590WorkflowUserAgents(source,role);
  if(role!=='build'||sha(source)!=='998d3a8e11a1088363a84bfd4a0d64f7117eacc059a3cf5c0ca895f7a85e22b3')return source;
  assert.equal(Buffer.byteLength(source),292886,'RELEASE588_WORKFLOW_SIZE');
  assert.equal(source.split('RavRadar/4.0.588').length,6,'Præcis fem normale 588 User-Agent-felter');
  assert.equal(source.includes('RavRadar/4.0.587'),false,'Ingen blandet versions-UA');
  const previous=source.replaceAll('RavRadar/4.0.588','RavRadar/4.0.587');
  assert.equal(Buffer.byteLength(previous),292886,'RELEASE588_PREDECESSOR_SIZE');
  assert.equal(sha(previous),'e4c022274fe0d05fd3e10aff59d7a3165c67b92847a196c7ee793df68a666600',
    'Hele det autentiske 587-workflow bevares før de historiske orakler');
  return previous;
}
// TEST INPUT ONLY: two exact saved-progress IDs in the same archive/hour.
// Unknown bytes remain rejected by the unchanged historical workflow oracles.
export const latestColdProgressWorkflowReview = {
  "scope": {
    "progressSource": "39886354260-1",
    "latestProgressSource": "39933506923-1",
    "archiveId": "775f99a210b899eacd3ee056f4daae56c20fc3258e64691d4e0544aabd04d3fb",
    "targetReferenceAt": "2026-10-23T01:00:00.000Z",
    "publicInputTarget": "2026-10-23T01:00:00Z"
  },
  "roles": {
    "build": {
      "relativePath": ".github/workflows/reusable-weather-build.yml",
      "before": {
        "bytes": 289762,
        "sha256": "39327f1ef42a4c0450c9aa3e2922dc9be9f96f12b50f45ff7a11c56dd3a9b4c7"
      },
      "after": {
        "bytes": 289911,
        "sha256": "ac548056ad2929dd64fae6ae3b22e2697f568b245b55903e4a86580a9539eab3"
      },
      "edits": [
        [
          160393,
          "          if test \"${{ inputs.current_family_cold_start }}\" = true && test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n",
          "          if test \"${{ inputs.current_family_cold_start }}\" = true && test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1\n"
        ],
        [
          94364,
          "        if: (inputs.current_family_cold_start != true || inputs.quick_progress_source == '39886354260-1' || inputs.quick_progress_source == '39933506923-1') && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current'))\n",
          "        if: (inputs.current_family_cold_start != true || inputs.quick_progress_source == '39886354260-1') && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current'))\n"
        ],
        [
          17455,
          "          if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n",
          "          if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1\n"
        ]
      ]
    },
    "once": {
      "relativePath": ".github/workflows/run-current-weather-once.yml",
      "before": {
        "bytes": 54587,
        "sha256": "790776231568428e7ea9b4943e6d4719177fb5bf7f4c03b648b16ee85f7f83e0"
      },
      "after": {
        "bytes": 54634,
        "sha256": "3f0bbc19336918f20586c92432dc2fb46985d3657d842209a26e788426dcf814"
      },
      "edits": [
        [
          5189,
          "            test \"$PROGRESS\" = 39886354260-1 || test \"$PROGRESS\" = 39933506923-1\n",
          "            test \"$PROGRESS\" = 39886354260-1\n"
        ],
        [
          111,
          "        description: 'Archive authenticated current-family B/S for a fresh cold start, or reopen only fixed 39886354260-1 or 39933506923-1 progress without another reset'\n",
          "        description: 'Archive authenticated current-family B/S for a fresh cold start, or reopen only its fixed 39886354260-1 checkpoint without another reset'\n"
        ]
      ]
    }
  }
};
for (const row of Object.values(latestColdProgressWorkflowReview.roles)) {
  row.edits.forEach(Object.freeze); Object.freeze(row.edits);
  Object.freeze(row.before); Object.freeze(row.after); Object.freeze(row);
}
Object.freeze(latestColdProgressWorkflowReview.roles);
Object.freeze(latestColdProgressWorkflowReview.scope);
Object.freeze(latestColdProgressWorkflowReview);
export function inverseLatestColdProgressWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'LATEST_COLD_PROGRESS_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'LATEST_COLD_PROGRESS_WORKFLOW_TYPE');
  assert(Object.hasOwn(latestColdProgressWorkflowReview.roles, role), 'LATEST_COLD_PROGRESS_WORKFLOW_ROLE');
  const row = latestColdProgressWorkflowReview.roles[role];
  if (Buffer.byteLength(source) === row.before.bytes && sha(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'LATEST_COLD_PROGRESS_WORKFLOW_AFTER_SIZE');
  assert.equal(sha(source), row.after.sha256, 'LATEST_COLD_PROGRESS_WORKFLOW_AFTER_SHA');
  for (const [offset, actual, original] of row.edits) {
    assert.equal(source.slice(offset, offset + actual.length), actual, 'LATEST_COLD_PROGRESS_WORKFLOW_EXACT_HUNK');
    source = source.slice(0, offset) + original + source.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'LATEST_COLD_PROGRESS_WORKFLOW_BEFORE_SIZE');
  assert.equal(sha(source), row.before.sha256, 'LATEST_COLD_PROGRESS_WORKFLOW_BEFORE_SHA');
  return source;
}
// TEST INPUT ONLY: the fixed same-archive/same-hour checkpoint caller delta.
// Runtime authentication remains in the cold kernel/GCM wrapper, never here.
export const currentFamilyColdCheckpointWorkflowReview = JSON.parse(fs.readFileSync(
  new URL('./current-family-cold-checkpoint-workflow-review.json', import.meta.url), 'utf8'));
for (const row of Object.values(currentFamilyColdCheckpointWorkflowReview.roles)) {
  row.edits.forEach(Object.freeze); Object.freeze(row.edits);
  Object.freeze(row.before); Object.freeze(row.after); Object.freeze(row);
}
Object.freeze(currentFamilyColdCheckpointWorkflowReview.roles);
Object.freeze(currentFamilyColdCheckpointWorkflowReview.scope);
Object.freeze(currentFamilyColdCheckpointWorkflowReview);
export function inverseCurrentFamilyColdCheckpointWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'COLD_CHECKPOINT_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'COLD_CHECKPOINT_WORKFLOW_TYPE');
  if (Object.hasOwn(latestColdProgressWorkflowReview.roles, role)
    && sha(source) === latestColdProgressWorkflowReview.roles[role].after.sha256)
    source = inverseLatestColdProgressWorkflow(source, role);
  assert(Object.hasOwn(currentFamilyColdCheckpointWorkflowReview.roles, role), 'COLD_CHECKPOINT_WORKFLOW_ROLE');
  const row = currentFamilyColdCheckpointWorkflowReview.roles[role];
  if (Buffer.byteLength(source) === row.before.bytes && sha(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'COLD_CHECKPOINT_WORKFLOW_AFTER_SIZE');
  assert.equal(sha(source), row.after.sha256, 'COLD_CHECKPOINT_WORKFLOW_AFTER_SHA');
  for (const [offset, actual, original] of row.edits) {
    assert.equal(source.slice(offset, offset + actual.length), actual, 'COLD_CHECKPOINT_WORKFLOW_EXACT_HUNK');
    source = source.slice(0, offset) + original + source.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'COLD_CHECKPOINT_WORKFLOW_BEFORE_SIZE');
  assert.equal(sha(source), row.before.sha256, 'COLD_CHECKPOINT_WORKFLOW_BEFORE_SHA');
  return source;
}
// TEST INPUT ONLY: the exact five current-family cold budget conditions.
// No epoch request, provider cap, clock authority or runtime rule is issued.
export const currentFamilyColdBudgetWorkflowReview = Object.freeze({
  before: Object.freeze({ bytes: 287147, sha256: '2d98a6d883c26d38e3665383f03a551167189ce587b7f21de261aecebdf5dbf5' }),
  after: Object.freeze({ bytes: 287375, sha256: 'ed1da3a8fcef9965d10b47fb8fbc79ce384e7fd705d3d2b2be6375f8e47ca93f' }),
  hunks: Object.freeze([
    ["      - name: Record the actual epoch build start before checkout\n        if: inputs.weather_state_epoch_bootstrap == true\n        shell: bash",
      "      - name: Record the actual epoch build start before checkout\n        if: inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true\n        shell: bash"],
    ...['dmi', 'copernicus', 'open-meteo', 'weather'].map(phase => [
      `      - name: Preserve the fixed epoch post-processing reserve before ${phase}\n        if: inputs.completed_private_runtime != true && (inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true')\n        run: node scripts/weather-state-epoch-budget.mjs ${phase}`,
      `      - name: Preserve the fixed epoch post-processing reserve before ${phase}\n        if: inputs.completed_private_runtime != true && ((inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true) && steps.preflight.outputs.should_run == 'true')\n        run: node scripts/weather-state-epoch-budget.mjs ${phase}`,
    ]),
  ].map(Object.freeze)),
});
export function inverseCurrentFamilyColdBudgetWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'COLD_BUDGET_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'COLD_BUDGET_WORKFLOW_TYPE');
  assert.equal(role, 'build', 'COLD_BUDGET_WORKFLOW_ROLE');
  const row = currentFamilyColdBudgetWorkflowReview;
  if (Buffer.byteLength(source) === row.before.bytes && sha(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'COLD_BUDGET_WORKFLOW_AFTER_SIZE');
  assert.equal(sha(source), row.after.sha256, 'COLD_BUDGET_WORKFLOW_AFTER_SHA');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'COLD_BUDGET_WORKFLOW_EXACT_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'COLD_BUDGET_WORKFLOW_BEFORE_SIZE');
  assert.equal(sha(source), row.before.sha256, 'COLD_BUDGET_WORKFLOW_BEFORE_SHA');
  return source;
}
// Test-only exact optional-stage wiring inverse. Both entire reviewed afterimages
// restore the previous workflows; no caller, selector or command is ignored.
export const ordinaryStageWiringReview = JSON.parse(fs.readFileSync(
  new URL('./ordinary-completed-stage-workflow-review.json', import.meta.url), 'utf8'));
for (const row of Object.values(ordinaryStageWiringReview)) {
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(ordinaryStageWiringReview);
// Exact586 then585 normal User-Agent inverses; every historical workflow byte remains the oracle.
// Kun testvisning: de to præcise Source-workflows kan læses som hele,
// gennemgåede ordinary598-kodebytes. Ingen original- eller runtimeadgang.
const reviewedSourceWorkflowInspection = Object.freeze({
  "ordinaryHead": "52d10aa7494597c3f9c5b4885f26abb4c00953c7",
  "roles": {
    "once": {
      "path": ".github/workflows/run-current-weather-once.yml",
      "after": {
        "bytes": 57845,
        "sha256": "b64147bbdb304160834dd080249ab05043f0ab73bdb35f015c282821d4486b7f"
      },
      "before": {
        "bytes": 55548,
        "sha256": "defc1a6fa360472b27335eccbe6f26f6bbc66d14442a990b873557def2f032af"
      }
    },
    "build": {
      "path": ".github/workflows/reusable-weather-build.yml",
      "after": {
        "bytes": 351841,
        "sha256": "efb442807d3a9e5b17fb7c231dffbc56459d2dfa1fd84f0eb4b208fea0f75977"
      },
      "before": {
        "bytes": 300010,
        "sha256": "2f7917b26a994d4d33dd7445cdc992e571a9dcc3245867564dda85ebda145c61"
      }
    }
  }
});
for (const row of Object.values(reviewedSourceWorkflowInspection.roles)) {
  Object.freeze(row.after); Object.freeze(row.before); Object.freeze(row);
}
Object.freeze(reviewedSourceWorkflowInspection.roles);
function inverseReviewedSourceWorkflowInspection(source, role) {
  const rows = reviewedSourceWorkflowInspection.roles;
  const row = typeof role === 'string' && Object.hasOwn(rows, role) ? rows[role] : null;
  // Gamle/ukendte input får ingen ny adgang og går videre til gamle orakler.
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
      || sha(source) !== row.after.sha256) return source;
  requireSourceProducerOutput();
  assertSourceProducerAfter597StaticCode();
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSourceWorkflowInspection.ordinaryHead + ':' + row.path,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes,
    'Hele den gennemgåede ordinary598-workflowstørrelse');
  assert.equal(sha(previous), row.before.sha256,
    'Hele den genuine ordinary598-kildevisning før alle gamle orakler');
  return previous; // Kun tekst til de uændrede historiske testassertions.
}


// Kun601-buildets nye hele identitet. Once er byteidentisk med den bevarede
//600-række ovenfor; begge visninger kræver de samme normale Source-guards.
const reviewedSource601BuildWorkflowInspection = Object.freeze({
  path: '.github/workflows/reusable-weather-build.yml',
  after: Object.freeze({bytes: 351841,
    sha256: '18e980e980b50b2de3654c2a435f4b3273e60d8dde88d5a0afe4473c703fc785'}),
  before: Object.freeze({bytes: 300010,
    sha256: '2f7917b26a994d4d33dd7445cdc992e571a9dcc3245867564dda85ebda145c61'}),
});
function inverseReviewedSource601BuildWorkflowInspection(source, role) {
  const row = reviewedSource601BuildWorkflowInspection;
  if (role !== 'build' || typeof source !== 'string'
      || Buffer.byteLength(source) !== row.after.bytes || sha(source) !== row.after.sha256) return source;
  requireSourceProducerOutput();
  assertSourceProducerAfter597StaticCode();
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSourceWorkflowInspection.ordinaryHead + ':' + row.path,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes,
    'Hele den gennemgåede ordinary598-workflowstørrelse før601');
  assert.equal(sha(previous), row.before.sha256,
    'Hele den genuine ordinary598-kildevisning før601 og alle gamle orakler');
  return previous; // Kun tekst til de uændrede historiske testassertions.
}


// Kun de to faktisk udstedte buildfiler før det uændrede genuine52d-orakel.
// Gamle600/601-rækker og ukendte input bevarer deres egne afslag.
const reviewedSource602BuildWorkflowInspection = Object.freeze({
  path: '.github/workflows/reusable-weather-build.yml',
  after: Object.freeze([
    Object.freeze({bytes: 352289,
      sha256: 'e0fff915c2e4e9a6d3182ca41b46877d2082304f950a8bc3e4480d5ffafd5eaa'}),
    Object.freeze({bytes: 352289,
      sha256: '9b11306a1272bcf59e836bb2abdffc15018120dc452529889fcf5097e3e5798d'}),
  ]),
  before: Object.freeze({bytes: 300010,
    sha256: '2f7917b26a994d4d33dd7445cdc992e571a9dcc3245867564dda85ebda145c61'}),
});
function inverseReviewedSource602BuildWorkflowInspection(source, role) {
  const row = reviewedSource602BuildWorkflowInspection;
  if (role !== 'build' || typeof source !== 'string') return source;
  const bytes = Buffer.byteLength(source);
  const sourceSha256 = sha(source);
  if (!row.after.some(entry => entry.bytes === bytes && entry.sha256 === sourceSha256)) return source;
  requireSourceProducerOutput();
  assertSourceProducerAfter597StaticCode();
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSourceWorkflowInspection.ordinaryHead + ':' + row.path,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes,
    'Hele den gennemgåede ordinary598-workflowstørrelse før602');
  assert.equal(sha(previous), row.before.sha256,
    'Hele den genuine ordinary598-kildevisning før602 og alle gamle orakler');
  return previous; // Kun tekst til de uændrede historiske testassertions.
}

// Kun de to præcise601-fasekaldere før den uændrede historiske4145-inverse.
// De frosne e81-preimages er byteidentiske med den genuine52d-forgænger,
// som allerede er en normal lokal Git-forudsætning; ingen ny fetch kræves.
const reviewedSource601OperationalWorkflowInspection = Object.freeze({
  "deploy": {
    "path": ".github/workflows/reusable-pages-deploy.yml",
    "after": {
      "bytes": 67398,
      "sha256": "4dc3b299efdad4424024edc637df61143d2a19e576668d52ba7dfa4d2673f8c0"
    },
    "before": {
      "bytes": 66486,
      "sha256": "260c06d3fbc08e7bf80563b803eed758251805f55cf4a0c147526d70c3e4b8f1"
    }
  },
  "recovery": {
    "path": ".github/workflows/reusable-operational-reentry.yml",
    "after": {
      "bytes": 105501,
      "sha256": "888fb3ad38cd83bd06d713c14587bbeeb68390bf7a88715b03c22e0bf7421b5f"
    },
    "before": {
      "bytes": 102685,
      "sha256": "6228ec52b4901aa26f6fa29cda81826a5f8c3536441aba8d28e5c78473f19370"
    }
  }
});
for (const row of Object.values(reviewedSource601OperationalWorkflowInspection)) {
  Object.freeze(row.after); Object.freeze(row.before); Object.freeze(row);
}
function inverseReviewedSource601OperationalWorkflowInspection(source, role) {
  const rows = reviewedSource601OperationalWorkflowInspection;
  const row = typeof role === 'string' && Object.hasOwn(rows, role) ? rows[role] : null;
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
      || sha(source) !== row.after.sha256) return source;
  requireSourceProducerOutput();
  assertSourceProducerAfter597StaticCode();
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSourceWorkflowInspection.ordinaryHead + ':' + row.path,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes,
    'Hele e81/ordinary598 Pages-/reentry-workflowstørrelsen før601');
  assert.equal(sha(previous), row.before.sha256,
    'Hele den genuine e81/ordinary598 Pages-/reentry-visning før gamle orakler');
  return previous; // Kun historisk testtekst, aldrig produktions- eller DATA-adgang.
}

// Hele kendte Source-kodeinput før de bevarede historiske testorakler.
// Dette er tekstinspektion; ingen original-, plan-, SQL- eller READY-adgang.
const reviewedSource601HistoricalCodeInputs = Object.freeze({
  ".github/workflows/deploy-code-only-repair.yml": {
    "after": {
      "bytes": 244449,
      "sha256": "cfe08b1283fe9bbf732b99d1d847114826f38fdc1254cfe5b429185e33cc7473"
    },
    "correctedAfter": Object.freeze({
      "bytes": 244216,
      "sha256": "d1a1a824e7e4ec118820815f73134810c9bc19a2e54811d808aad04cae4c0a6c"
    }),
    "before": {
      "bytes": 225325,
      "sha256": "391628fbcaae106df7a29d5c7caa3a7487af18b025bd4692bc93aaab5d396bf8"
    }
  },
  "scripts/update-weather.mjs": {
    "after": {
      "bytes": 251786,
      "sha256": "ad45fb06d06345258590936d880dad21aa708226976aec31086726fe5e889907"
    },
    "before": {
      "bytes": 250461,
      "sha256": "e4f7f442c4ad655c533adebe7470144c5aa55bcbd136c4d891a37cd7ea8b9693"
    }
  },
  "scripts/lib/dmi-forecast-file.mjs": {
    "after": {
      "bytes": 30378,
      "sha256": "bf4615d3361a5b6fddb66aa8f12c01fd4f699c724089222a1985bb2224e392ac"
    },
    "before": {
      "bytes": 29084,
      "sha256": "75c10458973f5e3cdf2969b35c76698239e2baf696b4f0ff8fd4b466bdc3c536"
    }
  }
});
for (const row of Object.values(reviewedSource601HistoricalCodeInputs)) {
  Object.freeze(row.after); Object.freeze(row.before); Object.freeze(row);
}
// Test-only whole-workflow projections. These never grant a runtime binding.
const reviewedSource604OrdinaryHead = "d568ae61972b14193ca37dbc0911c86ed62c8ccc";
const source604CombinedWorkflowPaths = Object.freeze({
  build: '.github/workflows/reusable-weather-build.yml', once: '.github/workflows/run-current-weather-once.yml',
});
const reviewedSource604CombinedWorkflows = [
  { ...{"path":".github/workflows/reusable-weather-build.yml","combined":{"bytes":383046,"sha256":"b5e955b762bfb3b81817475f8d820f35044c4505c96a05f96d9105af2a2bf219"},"ordinary841":{"bytes":302000,"sha256":"d21fad73693dc5d5c8db69535efdfc5cae27c78897422d4fc9ab731d6440295f"},"source604":{"bytes":378140,"sha256":"f5a82ec42da4e37dfc16dd7892e098382efb0848c357d791d51efb68234b3ad6"}}, inverse: [
    [375315,3936,""],
    [371178,378,"          gh api \"repos/$GITHUB_REPOSITORY/actions/artifacts/$artifact_id\" \\\n            > \"$RAVRADAR_OPERATIONAL_HANDOFF/pages-artifact-rest.json\"\n"],
    [366969,85,""],
    [237614,85,""],
    [50996,85,""],
    [41726,85,""],
    [28466,135,"            source_saved_pair_public_manifest_sha256,...request}=JSON.parse(process.env.SOURCE_REQUEST);\n"],
    [19058,704,"            const occurrence=typeof source_saved_pair_occurrence==='string'\n              && /^([1-9][0-9]{0,15})-([1-9][0-9]{0,15})-[a-f0-9]{40}-([1-9][0-9]{0,15})$/.exec(source_saved_pair_occurrence);\n            assert(occurrence&&occurrence.slice(1).every(id=>Number.isSafeInteger(Number(id))),'SOURCE_SAVED_PAIR_OCCURRENCE_INVALID');\n          }else{\n            assert([source_saved_pair_pin,source_saved_pair_occurrence,source_saved_pair_public_manifest_sha256]\n"],
    [17957,112,"            source_saved_pair_public_manifest_sha256='',...request}=allInputs;\n"],
    [562,102,""],
  ] },
  { ...{"path":".github/workflows/run-current-weather-once.yml","combined":{"bytes":65877,"sha256":"3e0199ef66c99c8c1069e05fe399c5ef98606672c46c30f87fb199c72f2da6f5"},"ordinary841":{"bytes":59252,"sha256":"87b1401f437d30e57ba144bdf52820447b5a83eda7b53165ab8592375e7ef911"},"source604":{"bytes":60814,"sha256":"a0e4163981068540fa62f5d7015756286ef606f05c504294469d39c64029867e"}}, inverse: [
    [61618,104,"          COMPLETED_PRIVATE_RUNTIME: ${{ inputs.completed_private_runtime }}\n"],
    [55599,618,"      completed_private_runtime: ${{ inputs.completed_private_runtime }}\n      completed_private_runtime_pin: ${{ needs.current-main-target.outputs.completed_private_runtime_pin }}\n      source_saved_pair: ${{ needs.current-main-target.outputs.source_saved_pair == 'true' }}\n      source_saved_pair_pin: ${{ needs.current-main-target.outputs.source_saved_pair_pin }}\n      source_saved_pair_occurrence: ${{ needs.current-main-target.outputs.source_saved_pair_occurrence }}\n"],
    [17459,4604,"      - name: Lock the canonical UTC production hour\n        id: cache-state\n        if: inputs.checkpoint_target_hour == '' && inputs.completed_private_runtime != true && steps.source-saved-target.outputs.selected != 'true'\n        run: python3 scripts/check-copernicus-current-hour.py --invalid-cache-is-absent --github-output \"$GITHUB_OUTPUT\"\n\n      - name: Require one canonical target hour\n        shell: bash\n        env:\n          TARGET_HOUR: ${{ steps.source-saved-target.outputs.target_hour || steps.completed-target.outputs.target_hour || steps.checkpoint-target.outputs.target_hour || steps.cache-state.outputs.target_hour }}\n        run: |\n          set -euo pipefail\n          [[ \"$TARGET_HOUR\" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00Z$ ]]\n"],
    [9437,1086,"      - uses: actions/setup-node@v7\n        if: inputs.completed_private_runtime == true\n"],
    [6763,603,"      target_hour: ${{ steps.source-saved-target.outputs.target_hour || steps.completed-target.outputs.target_hour || steps.checkpoint-target.outputs.target_hour || steps.cache-state.outputs.target_hour }}\n      completed_private_runtime_pin: ${{ steps.completed-target.outputs.completed_private_runtime_pin }}\n      source_saved_pair: ${{ steps.source-saved-target.outputs.selected }}\n      source_saved_pair_pin: ${{ steps.source-saved-target.outputs.pair_pin }}\n      source_saved_pair_occurrence: ${{ steps.source-saved-target.outputs.occurrence }}\n"],
  ] },
];

// The exact private LF7 observation addition reverses before older workflow views.
function inverseSource604Lf7ObservationWorkflow(source, relative) {
  if (relative !== source604CombinedWorkflowPaths.build) return source;
  const reviewedAfter = {bytes:383395,sha256:"686ad42c0e42935fff381012135968b20fe518071ecfdd0c54f3bbe036fb9ac4"};
  if (Buffer.byteLength(source) !== reviewedAfter.bytes || sha(source) !== reviewedAfter.sha256) return source;
  const added = "          path: |\n            .geometry-v2-work/weather-source-operational-control-summary.json\n            ${{ steps.operational-model.outputs.source_normal_producer == 'true' && steps.weather-route-result.outputs.source_result_kind == 'PREPARED_WEATHER' && steps.source-normal.outcome == 'success' && steps.source-operational-handoff-seal.outcome == 'success' && '.geometry-v2-work/lf7-fur-consumer-observation-v1.json' || '' }}\n";
  const original = "          path: .geometry-v2-work/weather-source-operational-control-summary.json\n";
  assert.equal(source.split(added).length, 2, 'SOURCE604_LF7_WORKFLOW_EXACT_FRAGMENT');
  const previous = source.replace(added, original);
  const reviewedBefore = {bytes:383046,sha256:"b5e955b762bfb3b81817475f8d820f35044c4505c96a05f96d9105af2a2bf219"};
  assert.equal(Buffer.byteLength(previous), reviewedBefore.bytes, 'SOURCE604_LF7_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(previous), reviewedBefore.sha256, 'SOURCE604_LF7_WORKFLOW_BEFORE_SHA');
  return previous;
}

// Test-only projection for the five reviewed release User-Agent edits.
function inverseReviewedSource605WorkflowUserAgents(source, relative) {
  if (relative !== source604CombinedWorkflowPaths.build) return source;
  if (Buffer.byteLength(source) === 383395
      && sha(source) === '5f22b5e16f39d7e840a3a59c114956d28bc424086fbfee84f09352863c0e4105') {
    const next = 'RavRadar/4.0.607';
    assert.equal(source.split(next).length, 6, 'SOURCE607_REVIEWED_BUILD_USER_AGENT_COUNT');
    source = source.replaceAll(next, 'RavRadar/4.0.606');
    assert.equal(sha(source), 'a2aa5c20f3e7791c07f4bd4c23eed1f7b9704d69ac4806d18980ca6d8d489588',
      'SOURCE607_REVIEWED_BUILD_606_SHA');
  }
  if (Buffer.byteLength(source) === 383395
      && sha(source) === 'a2aa5c20f3e7791c07f4bd4c23eed1f7b9704d69ac4806d18980ca6d8d489588') {
    const next = 'RavRadar/4.0.606';
    assert.equal(source.split(next).length, 6, 'SOURCE606_REVIEWED_BUILD_USER_AGENT_COUNT');
    source = source.replaceAll(next, 'RavRadar/4.0.605');
    assert.equal(sha(source), '7bd483b5c15eace61c8c25a3f36cf9bc319607665db9b21c51b59b9697ed3c62',
      'SOURCE606_REVIEWED_BUILD_605_SHA');
  }
  if (Buffer.byteLength(source) !== 383395
    || sha(source) !== '7bd483b5c15eace61c8c25a3f36cf9bc319607665db9b21c51b59b9697ed3c62') return source;
  const next = 'RavRadar/4.0.605';
  assert.equal(source.split(next).length, 6, 'SOURCE605_REVIEWED_BUILD_USER_AGENT_COUNT');
  const previous = source.replaceAll(next, 'RavRadar/4.0.604');
  assert.equal(Buffer.byteLength(previous), 383395, 'SOURCE605_REVIEWED_BUILD_BEFORE_BYTES');
  assert.equal(sha(previous), '686ad42c0e42935fff381012135968b20fe518071ecfdd0c54f3bbe036fb9ac4', 'SOURCE605_REVIEWED_BUILD_BEFORE_SHA');
  return previous;
}

// Restore only the exact SOURCE605 test input before the existing whole-file oracles.


// Test-only inverse for the exact removal of two private LF7 artifact inputs.
function inverseReviewedSourcePrivateLf7UploadRemoval(source, relative) {
  if (relative !== source604CombinedWorkflowPaths.build || Buffer.byteLength(source) !== 384997) return source;
  const currentSha = sha(source);
  const reviewed608Sha = 'c888de65012329457d619e0dbde3f54eaa21576492ff062a1995410663dadba3';
  if (currentSha !== reviewed608Sha) {
    const releaseVersion = currentSha === '694974220de75f5c44d6d31461cc51cc96490245d53ad1cab7143e380526b0e3'
      ? '4.0.609'
      : JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
    if (!/^4\.0\.[0-9]+$/.test(releaseVersion)) return source;
    const userAgent = 'RavRadar/' + releaseVersion;
    if (source.split(userAgent).length !== 6) return source;
    const previous = source.replaceAll(userAgent, 'RavRadar/4.0.608');
    if (sha(previous) !== reviewed608Sha) return source;
    source = previous;
  }
  const legacy = "            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json\n";
  const summary = "          path: .geometry-v2-work/weather-source-operational-control-summary.json\n";
  assert.equal(source.split(legacy).length, 2, 'SOURCE_LF7_EXACT_LEGACY_UPLOAD');
  assert.equal(source.split(summary).length, 2, 'SOURCE_LF7_EXACT_SOURCE_UPLOAD');
  const previous = source.replace(legacy, () => legacy + "            .geometry-v2-work/lf7-fur-consumer-observation-v1.json\n")
    .replace(summary, () => "          path: |\n            .geometry-v2-work/weather-source-operational-control-summary.json\n            ${{ steps.operational-model.outputs.source_normal_producer == 'true' && steps.weather-route-result.outputs.source_result_kind == 'PREPARED_WEATHER' && steps.source-normal.outcome == 'success' && steps.source-operational-handoff-seal.outcome == 'success' && '.geometry-v2-work/lf7-fur-consumer-observation-v1.json' || '' }}\n");
  assert.equal(Buffer.byteLength(previous), 385413, 'SOURCE_LF7_HISTORICAL_UPLOAD_BYTES');
  assert.equal(sha(previous), 'a84abf1fdfc8ac6f7ad8952e92a7c29615cde2446962f55bee75e8713e353ddb', 'SOURCE_LF7_HISTORICAL_UPLOAD_SHA');
  return previous;
}

// Test-only whole-file inverse. Keep the previous SOURCE workflow oracles intact
// without importing an unavailable historical Git object into a release.
const reviewedSourceRequestProjection = Object.freeze([
  {"path":".github/workflows/run-current-weather-once.yml","before":{"bytes":65877,"sha256":"3e0199ef66c99c8c1069e05fe399c5ef98606672c46c30f87fb199c72f2da6f5"},"candidate":{"bytes":67265,"sha256":"d754225489a0f8118591f8efd18ef4301fce932b928868d06ac8eda70c109650"},"issued608Sha256":"d754225489a0f8118591f8efd18ef4301fce932b928868d06ac8eda70c109650","edits":[[3489,3584,"33d57ad9dd88df9bca173cdda491394b0296b31c5971be53cc393b664575f58e",""],[3832,4506,"a0a6e3720d2f049a153c125723d9a1e212c7f24a3611c48d50e554a42b8aa8e0","          SOURCE_REQUEST: ${{ toJSON(inputs) }}\n"],[4680,5107,"956a1f306d0598230b0652dd76ec6a1b09f07ecb01e4fcfb5f2e18dcb2c3b089","          const request=JSON.parse(process.env.SOURCE_REQUEST);\n"],[5824,6371,"a129633ef05c76b4fbd27a82cfe2a20ce92c8d6668b10f7f397986462725f221","          assert.equal(typeof request.source_normal_producer,'boolean','SOURCE_ROUTE_SELECTION_UNKNOWN');\n          if(request.source_normal_producer===true){\n            for(const key of booleans)assert.equal(request[key],false,'SOURCE_ROUTE_MIXED_BOOLEAN');\n            for(const key of strings)assert.equal(request[key],'','SOURCE_ROUTE_MIXED_LOCATOR');\n"],[6383,6707,"0d6144e1035934403c55ca6a5bb9e7696a9b67325174eeb780551275e9e962f3","          fs.appendFileSync(process.env.GITHUB_OUTPUT,'route='+(request.source_normal_producer===true?'source':'legacy')+'\\n');\n          const ordinary=booleans.every(key=>(request[key]??false)===false)\n            &&strings.every(key=>(request[key]??'')==='');\n          fs.appendFileSync(process.env.GITHUB_OUTPUT,'ordinary_source_reentry='+ordinary+'\\n');\n"],[18372,18570,"eba473a416802b48934f4a2e1b0be7813c6157b905c7f8a4e25d522e8289fd07","          SOURCE_REQUEST: ${{ toJSON(inputs) }}\n"]]},
  {"path":".github/workflows/reusable-weather-build.yml","before":{"bytes":383395,"sha256":"5f22b5e16f39d7e840a3a59c114956d28bc424086fbfee84f09352863c0e4105"},"candidate":{"bytes":385413,"sha256":"9b69fdc52f89a9f5195bef2c8c01b678fad3e3893d3e2a5154aaa09d6b7c5815"},"issued608Sha256":"a84abf1fdfc8ac6f7ad8952e92a7c29615cde2446962f55bee75e8713e353ddb","edits":[[17452,19652,"a86c58e2197a157ec94c9a1d8d796d786a9769719c44800a4c43bdc7c4f739f4","          SOURCE_REQUEST: ${{ toJSON(inputs) }}\n"],[19826,20635,"70a1a98fa28e49a81ca8b164e9f3e802a4ef7cb6eb9c2490e483a300c84c2955","          const allInputs=JSON.parse(process.env.SOURCE_REQUEST);\n          assert(allInputs && typeof allInputs==='object' && !Array.isArray(allInputs),'SOURCE_ROUTE_REQUEST_INVALID');\n          const {source_saved_pair=false,source_saved_pair_pin='',source_saved_pair_occurrence='',\n            source_saved_pair_pages_proof='',source_saved_pair_public_manifest_sha256='',...request}=allInputs;\n          assert.equal(typeof source_saved_pair,'boolean','SOURCE_SAVED_PAIR_SELECTION_INVALID');\n"],[21105,21180,"819e9dafafc1b1bff8af89cc73de58bbf072db3da601ec3ff7ed4cf813c7e5f0","            assert.equal(request.force,true,'SOURCE_SAVED_PAIR_FORCE_REQUIRED');\n"],[22081,22176,"e7288f8e2ffe292fee318b3cf48ebd617ee37f009973c290c6164ea2f609920a","            assert([source_saved_pair_pin,source_saved_pair_occurrence,source_saved_pair_pages_proof,source_saved_pair_public_manifest_sha256]\n              .every(value=>value===''),'SOURCE_SAVED_PAIR_LOCATOR_WITHOUT_SELECTION');\n"],[22188,22918,"1930dd9026f446bf57a4431244a730df62615f9f059cfca9e6e31b52200d53a8","          const booleans=[\"current_family_cold_start\",\"completed_private_runtime\",\"quick_confirmation\",\"checkpoint_only\",\"weather_state_epoch_bootstrap\",\"weather_state_epoch_checkpoint_reentry\",\"native_sampling_identity_original_recovery\",\"extended_provider_bootstrap\",\"produce_weather_handoff\",\"ravscore_integrated_first_cutover\",\"ravscore_integrated_return\"], strings=[\"completed_private_runtime_pin\",\"completed_stage_source\",\"quick_progress_source\",\"weather_state_epoch_raw_cache_key\",\"weather_state_epoch_archive_key\",\"weather_state_epoch_archive_catalog_sha256\",\"produce_weather_handoff_confirmation\",\"ravscore_candidate_g_rollback_mode\",\"ravscore_candidate_g_rollback_confirmation\",\"ravscore_integrated_first_cutover_confirmation\",\"ravscore_integrated_weather_handoff_run_id\",\"ravscore_integrated_return_confirmation\"];\n          const known=new Set(['source_normal_producer',...booleans,...strings,'production_target_hour','force']);\n          assert(Object.keys(request).every(key=>known.has(key)),'SOURCE_ROUTE_REQUEST_UNKNOWN');\n          assert.equal(typeof request.source_normal_producer,'boolean','SOURCE_ROUTE_SELECTION_UNKNOWN');\n          if(request.source_normal_producer===true||source_saved_pair){\n            for(const key of booleans)assert.equal(request[key],false,'SOURCE_ROUTE_MIXED_BOOLEAN');\n            for(const key of strings)assert.equal(request[key],'','SOURCE_ROUTE_MIXED_LOCATOR');\n            assert.equal(typeof request.force,'boolean','SOURCE_ROUTE_FORCE_INVALID');\n            assert(/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:00:00(?:\\.000)?Z$/.test(request.production_target_hour),'SOURCE_ROUTE_TARGET_INVALID');\n"],[22930,23241,"722ba22b3f9549d50c27b99624c18050baf7dfd4b8d9663784797d18eeb5935e","          fs.appendFileSync(process.env.GITHUB_OUTPUT,'route='+(request.source_normal_producer===true||source_saved_pair?'source':'legacy')+'\\n');\n          fs.appendFileSync(process.env.GITHUB_OUTPUT,'source_saved_pair='+source_saved_pair+'\\n');\n"],[29867,30239,"b5504506d7f7919b88c3aff441eb6a03ed5d2d713f47cd6ea5a2fe9c7db01d88","          const {source_saved_pair,source_saved_pair_pin,source_saved_pair_occurrence,\n            source_saved_pair_pages_proof,source_saved_pair_public_manifest_sha256,...request}=JSON.parse(process.env.SOURCE_REQUEST);\n"],[30301,30548,"5098e5edc2d67f12d3c9a3c6e97a4a596f1e97192f4266ea9c53338ea714233a","          assert.equal(saved,source_saved_pair===true,'SOURCE_SAVED_PAIR_PREFLIGHT_CHANGED');\n"],[32011,32288,"71fef5d1f13ae89352205163a3883636c44e5c9105258c851f0bb3cd2c20447c","          SOURCE_REQUEST: ${{ toJSON(inputs) }}\n"]]},
]);

function inverseReviewedSourceRequestProjection(source, relative) {
  if (typeof source !== 'string') return source;
  const row = reviewedSourceRequestProjection.find(entry => entry.path === relative);
  if (!row || Buffer.byteLength(source) !== row.candidate.bytes) return source;
  const currentSha = sha(source);
  if (currentSha !== row.candidate.sha256 && currentSha !== row.issued608Sha256) return source;
  if (currentSha !== row.candidate.sha256) {
    source = source.replaceAll('RavRadar/4.0.608', 'RavRadar/4.0.607');
    assert.equal(sha(source), row.candidate.sha256, 'SOURCE_REQUEST_PROJECTION_CANDIDATE_SHA');
  }
  let bytes = Buffer.from(source);
  for (const [start, end, expected, original] of [...row.edits].reverse()) {
    assert.equal(sha(bytes.subarray(start, end)), expected, 'SOURCE_REQUEST_PROJECTION_EDIT_SHA');
    bytes = Buffer.concat([bytes.subarray(0, start), Buffer.from(original), bytes.subarray(end)]);
  }
  assert.equal(bytes.length, row.before.bytes, 'SOURCE_REQUEST_PROJECTION_PREVIOUS_BYTES');
  assert.equal(sha(bytes), row.before.sha256, 'SOURCE_REQUEST_PROJECTION_PREVIOUS_SHA');
  return bytes.toString('utf8');
}

// Historical 606 test projection only. No dispatch code is embedded here.
function inverseHistoricalSource606Once(source, relative) {
  if (relative !== source604CombinedWorkflowPaths.once || typeof source !== 'string'
      || Buffer.byteLength(source) !== 68822
      || sha(source) !== 'b91412cbb38aacef7555b984472f0cac95f3167199e5e3a9ab17cbe234c96e2f') return source;
  const bytes = Buffer.from(source);
  assert.equal(sha(bytes.subarray(64171, 67116)), '28db0ce29bc89827f71fc2e3e51b9439945823832e1b674cc13427193397ac17',
    'SOURCE606_HISTORICAL_ONCE_SLICE_SHA');
  const previous = Buffer.concat([bytes.subarray(0, 64171), bytes.subarray(67116)]).toString('utf8');
  assert.equal(Buffer.byteLength(previous), 65877, 'SOURCE606_HISTORICAL_ONCE_BEFORE_BYTES');
  assert.equal(sha(previous), '3e0199ef66c99c8c1069e05fe399c5ef98606672c46c30f87fb199c72f2da6f5',
    'SOURCE606_HISTORICAL_ONCE_BEFORE_SHA');
  return previous;
}

// Test-only inverse of the exact combined SOURCE and ordinary #867 workflow bytes.
// Unknown or mixed revisions proceed to the existing strict oracle unchanged.
const source859ImmediatePagesWorkflows = [
  { ...{"path":".github/workflows/run-current-weather-once.yml","role":"once","before":{"bytes":67265,"sha256":"d754225489a0f8118591f8efd18ef4301fce932b928868d06ac8eda70c109650"},"after":{"bytes":70326,"sha256":"f8875f92d1d2ce5789e493dcec5ad27fac6b84c321599a5239897f8e5e57a1ba"}}, inverse: [
    [8001,282,"15f6ec6b1f31a352efe58e4426b94afe504f04229d6ea2611e4ac93ba9f77f69",""],
    [8554,180,"9ae032ceba746060d9abc9e99692d604c33f17ac584e945ad01a4c37015b9fb5",""],
    [9178,178,"21658886205ceb2d9d902dca1f77c7b4de5bccc92c1f1df42414541798209318",""],
    [11531,124,"1cd847a1b7ca2cfa2620f6d9842c0219cf07b236cfedd5ff9426833f9205f920","          github.run_attempt == 1 && inputs.completed_private_runtime == false &&\n"],
    [19354,104,"045a50a52fa4d0f9b377582e2e45345eb79bd3b400768e25a60e1cb365a7d3fd",""],
    [19633,75,"b85780c8083ea4a3fa737730d965831075029607659e616836915ad0a8a89b79","      - name: Select provider-free continuation for the default scheduled caller\n"],
    [21594,216,"fa32ad363f5054170fe541ead47bd4bd58ad242ca5aed611ea836a1e73ef9e9b",""],
    [22196,192,"f6c258fda6f04b0bb560c09a01b63786aa633ab130c7b58cc7a3660b0bfe4de6",""],
    [22969,120,"88e96495c0b731533a4cbc5240bdfcab20a3a1289a9f3045a1c0d210c40680d7",""],
    [23496,1216,"41d28f57320747bb458858a24f63a230cd7aec4bd546688bc0d441bd7c24b6d4",""],
    [24762,0,"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","            success:true)\n              test \"$REQUESTED_COMPLETED\" = false\n              test -z \"$MANUAL_TARGET$MANUAL_PIN$CHECKPOINT_TARGET$CACHE_TARGET\"\n              completed=true\n              target=\"$AUTO_TARGET\"\n              pin=\"$AUTO_PIN\"\n              ;;\n"],
    [25706,314,"ea68dfbdc669a16e1aef057b11f9271965f7a09bc0a6641112b1ca5364f9b108",""],
    [59774,196,"4fc11a6ffffb07da93095a1e3b352263d483f4888a695aa86e95620c9d080c81",""],
    [60500,194,"5473649d365965ef57246c83bca57df223d64d69c417fc6dd4aee61a2d46c70b",""],
    [63951,102,"f0799694c1167cde3daa227f75ab5549e082e6a2e9e7be1b48e80923890bc064",""],
  ] },
  { ...{"path":".github/workflows/reusable-weather-build.yml","role":"build","before":{"bytes":384997,"sha256":"fc1319f095b0df93a9efcb601f0d4216ae18cddf5ac9467945a176dcaccec3ca"},"after":{"bytes":389397,"sha256":"a82ca97e6dee8f29c25dbaa4a1750518bdb5187c0000034656dc2e769e682941"}}, inverse: [
    [187,263,"afa5ee75f79c52c257cd5708577334c3f6b404bf08c998ea0fa963079412a713",""],
    [1346,193,"5d3480192dd5ab5d999ad5067dd84d4d0dbc3be1ab53d1b0f5e225b4d68b0fbc",""],
    [19624,251,"6ecbd13d7bca9a7908cf67f4517eedc198599949b2539a17d81116b947a3c31e",""],
    [20845,116,"211bbb090a9d68553bc09cd5b205b320657fa24428d1b233588f824a13854b31",""],
    [21458,1207,"50a9fdec1e3df2156aeb71bef5789ddca8fd40affb4dca1086ec4a5341f67b73",""],
    [24509,84,"86a6c10d6379541bfbb8dc13115c3694a5e1152c91590c6ac362d20579e7bea2","          const sourceRoute=requested==='true'||source_saved_pair;\n"],
    [25234,157,"8e8bb862ce73f3b1e1ad049e83211fa6a7ef57ea06a7d6b7e0c56c472e57b581","            +'source_route_ordinary='+ordinary+'\\n');\n"],
    [32451,139,"d354e00b8e9b4f568361334ffe22a5661da0442393dd72f12a376705dc3b097d",""],
    [34151,98,"935969455eada23fcda5eb0233467fb7354c2fb00b323d4c6c38019b95a45305",""],
    [34756,85,"e48659c47ac5a3bded871a1076f746df7987ecaa21dc3bf24032df12700d747c",""],
    [118107,1040,"68aaf47ce1e3aeca3c97f43aedcd09b78bfb6cc14796f6cbec020839ce8a9343",""],
    [159814,196,"ffcc0e60a163d76a0b73db4b3148e0b7e11fb8765489f5034f788c210cb57294",""],
    [225869,692,"4d02654533638802894c731478066b255251caaae97bfcf2392ac0711f02bfac",""],
  ] },
  { ...{"path":".github/workflows/reusable-pages-deploy.yml","role":"deploy","before":{"bytes":72981,"sha256":"655d8d08bc86303bb91dfbf8037000d52a5c710582e84dfec1f2b6f6bcdc5284"},"after":{"bytes":74403,"sha256":"a77c062113259c8efd04d4c7c73c4b1fbf825eea1d69770b5f14dc75c27d96c7"}}, inverse: [
    [75,258,"be89bc30386da180c4ffe882f226b556a84e85fee1e6e0b35a64c4a891e29770",""],
    [2101,110,"54259a93887cd3e8ac9d9e75fb8a2837b5ea92969e155b8bfec63e9e64ee7123","    timeout-minutes: 25\n"],
    [2928,408,"51af57270da30244bb8e3653225ab9c6bca3a9a8e953a09589a4486232c7148a",""],
    [39488,54,"7ba3bb6b92b6dd2d9e18cfffa98a0ab1ea1f5dfbb6faa8ff0af039e9cd7a5b0c","        uses: actions/deploy-pages@v5\n"],
    [39556,365,"b13344a30789a3970b034847b83ee121a4104abc14d3f7ab3dc92c8c4a37653f",""],
    [40086,289,"785c8326130387abbd061fd74e7f96e30f19674a9a38e1a1f85ec1abf685cde1",""],
  ] },
];
export function inverseSource859ImmediatePagesWorkflow(source, relative) {
  source = inverseSource611MaintenanceWorkflow(source, relative);
  const row = source859ImmediatePagesWorkflows.find(entry => entry.path === relative);
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
      || sha(source) !== row.after.sha256) return source;
  let bytes = Buffer.from(source);
  for (const [offset, length, afterSha256, original] of [...row.inverse].reverse()) {
    assert.equal(sha(bytes.subarray(offset, offset + length)), afterSha256, 'SOURCE859_PAGES_WORKFLOW_HUNK_CHANGED');
    bytes = Buffer.concat([bytes.subarray(0, offset), Buffer.from(original), bytes.subarray(offset + length)]);
  }
  assert.equal(bytes.length, row.before.bytes, 'SOURCE859_PAGES_WORKFLOW_PREDECESSOR_SIZE');
  assert.equal(sha(bytes), row.before.sha256, 'SOURCE859_PAGES_WORKFLOW_PREDECESSOR_CHANGED');
  return bytes.toString('utf8');
}

export function inverseReviewedSource604CombinedWorkflow(source, relative, target) {
  assert.equal(arguments.length, 3, 'SOURCE604_COMBINED_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'SOURCE604_COMBINED_WORKFLOW_TYPE');
  if (target !== 'ordinary841' && target !== 'source604') return source;
  source = inverseSource859ImmediatePagesWorkflow(source, relative);
  // Test-only projection of the exact Actions interpolation repair.
  if (relative === '.github/workflows/reusable-operational-reentry.yml' && Buffer.byteLength(source) === 117556
      && sha(source) === 'a318adebbfff2779acd8923c54021171965975bf6889c7dffe6f7e8816300baa') {
    const env = '          SOURCE_NORMAL_FINALIZE: ${{ inputs.source_normal_finalize }}\n';
    const shell = '            if test "$SOURCE_NORMAL_FINALIZE" = true; then\n';
    const previous = '            if test "${{ inputs.source_normal_finalize }}" = true; then\n';
    assert.equal(source.split(env).length, 2, 'SOURCE_REENTRY_EXACT_FINALIZE_ENV');
    assert.equal(source.split(shell).length, 2, 'SOURCE_REENTRY_EXACT_FINALIZE_SHELL');
    source = source.replace(env, '').replace(shell, previous);
    assert.equal(sha(source), '019d6b5dd43f911635261784e83743fd53a6a03f20f28b9aa69c5856dbb17d9d',
      'SOURCE_REENTRY_HISTORICAL_WORKFLOW_SHA');
  }
  source = inverseReviewedSourcePrivateLf7UploadRemoval(source, relative);
  source = inverseReviewedSourceRequestProjection(source, relative);
  source = inverseHistoricalSource606Once(source, relative);
  source = inverseReviewedSource605WorkflowUserAgents(source, relative);
  source = inverseSource604Lf7ObservationWorkflow(source, relative);
  const row = reviewedSource604CombinedWorkflows.find(entry => entry.path === relative);
  if (!row || Buffer.byteLength(source) !== row.combined.bytes || sha(source) !== row.combined.sha256) return source;
  let previous = source;
  if (target === 'source604') {
    for (const [offset, length, original] of row.inverse)
      previous = previous.slice(0, offset) + original + previous.slice(offset + length);
  } else {
    previous = execFileSync('git', [
      '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
      'cat-file', 'blob', reviewedSource604OrdinaryHead + ':' + row.path,
    ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
      env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  }
  assert.equal(Buffer.byteLength(previous), row[target].bytes, 'SOURCE604_COMBINED_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(previous), row[target].sha256, 'SOURCE604_COMBINED_WORKFLOW_BEFORE_SHA');
  return previous;
}

// Test-only outer layer for the exact saved-weather and post-Pages composition.
// Each admitted file becomes its genuine issued #832 blob before older views.
const reviewedSource603SavedWorkflowHead = '58917a42c8dfd030062c8f97a5223f35790ab15f';
const reviewedSource603SavedWorkflows = Object.freeze({
  build:Object.freeze({path:'.github/workflows/reusable-weather-build.yml',
    after:Object.freeze({bytes:378140,sha256:'f5a82ec42da4e37dfc16dd7892e098382efb0848c357d791d51efb68234b3ad6'}),
    before:Object.freeze({bytes:352289,sha256:'9b11306a1272bcf59e836bb2abdffc15018120dc452529889fcf5097e3e5798d'})}),
  once:Object.freeze({path:'.github/workflows/run-current-weather-once.yml',
    after:Object.freeze({bytes:60814,sha256:'a0e4163981068540fa62f5d7015756286ef606f05c504294469d39c64029867e'}),
    before:Object.freeze({bytes:57845,sha256:'b64147bbdb304160834dd080249ab05043f0ab73bdb35f015c282821d4486b7f'})}),
  repair:Object.freeze({path:'.github/workflows/deploy-code-only-repair.yml',
    after:Object.freeze({bytes:252067,sha256:'bd5861018d8cae0821bdd7db88f9b80813f06513c371b51b7fbb326a80874779'}),
    before:Object.freeze({bytes:244216,sha256:'d1a1a824e7e4ec118820815f73134810c9bc19a2e54811d808aad04cae4c0a6c'})}),
  deploy:Object.freeze({path:'.github/workflows/reusable-pages-deploy.yml',
    after:Object.freeze({bytes:72981,sha256:'655d8d08bc86303bb91dfbf8037000d52a5c710582e84dfec1f2b6f6bcdc5284'}),
    before:Object.freeze({bytes:67398,sha256:'4dc3b299efdad4424024edc637df61143d2a19e576668d52ba7dfa4d2673f8c0'})}),
  recovery:Object.freeze({path:'.github/workflows/reusable-operational-reentry.yml',
    after:Object.freeze({bytes:117498,sha256:'019d6b5dd43f911635261784e83743fd53a6a03f20f28b9aa69c5856dbb17d9d'}),
    before:Object.freeze({bytes:105501,sha256:'888fb3ad38cd83bd06d713c14587bbeeb68390bf7a88715b03c22e0bf7421b5f'})}),
});
export function inverseReviewedSource603SavedWorkflow(source, relative) {
  assert.equal(arguments.length, 2, 'SOURCE603_SAVED_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'SOURCE603_SAVED_WORKFLOW_TYPE');
  source = inverseReviewedSource604CombinedWorkflow(source, relative, 'source604');
  const row = Object.values(reviewedSource603SavedWorkflows).find(entry => entry.path === relative);
  if (!row || Buffer.byteLength(source) !== row.after.bytes || sha(source) !== row.after.sha256) return source;
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSource603SavedWorkflowHead + ':' + row.path,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'SOURCE603_SAVED_WORKFLOW_BEFORE_BYTES');
  assert.equal(sha(previous), row.before.sha256, 'SOURCE603_SAVED_WORKFLOW_BEFORE_SHA');
  return previous;
}

function inverseSource603SavedWorkflowRole(source, role) {
  if (!Object.hasOwn(reviewedSource603SavedWorkflows, role)) return source;
  return inverseReviewedSource603SavedWorkflow(source, reviewedSource603SavedWorkflows[role].path);
}

export function inverseReviewedSource601HistoricalCodeInput(source, relative) {
  assert.equal(arguments.length, 2, 'SOURCE601_HISTORICAL_INPUT_ARGUMENTS');
  assert.equal(typeof source, 'string', 'SOURCE601_HISTORICAL_INPUT_TYPE');
  source = inverseLf7ObserverUpdaterTestInput(source, relative);
  source = inverseReviewedSource603SavedWorkflow(source, relative);
  if (relative === '.github/workflows/reusable-weather-build.yml')
    return inverseReviewedSource601BuildWorkflowInspection(
      inverseReviewedSource602BuildWorkflowInspection(source, 'build'), 'build');
  if (relative === '.github/workflows/run-current-weather-once.yml')
    return inverseReviewedSourceWorkflowInspection(source, 'once');
  if (relative === '.github/workflows/reusable-pages-deploy.yml')
    return inverseReviewedSource601OperationalWorkflowInspection(source, 'deploy');
  if (relative === '.github/workflows/reusable-operational-reentry.yml')
    return inverseReviewedSource601OperationalWorkflowInspection(source, 'recovery');
  const rows = reviewedSource601HistoricalCodeInputs;
  const row = typeof relative === 'string' && Object.hasOwn(rows, relative) ? rows[relative] : null;
  if (!row) return source;
  const bytes = Buffer.byteLength(source);
  const sourceSha256 = sha(source);
  const matches = entry => entry?.bytes === bytes && entry.sha256 === sourceSha256;
  if (!matches(row.after) && !matches(row.correctedAfter))
    return source; // Ukendt/ændret input beholder de eksisterende strenge afslag.
  requireSourceProducerOutput();
  assertSourceProducerAfter597StaticCode();
  const previous = execFileSync('git', [
    '-c', 'protocol.allow=never', '-C', fileURLToPath(new URL('../../', import.meta.url)),
    'cat-file', 'blob', reviewedSourceWorkflowInspection.ordinaryHead + ':' + relative,
  ], {encoding:'utf8', timeout:30_000, maxBuffer:512 * 1024,
    env:{...process.env, GIT_NO_LAZY_FETCH:'1', GIT_NO_REPLACE_OBJECTS:'1', GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'SOURCE601_HISTORICAL_WHOLE_BEFORE_BYTES');
  assert.equal(sha(previous), row.before.sha256, 'SOURCE601_HISTORICAL_WHOLE_BEFORE_SHA');
  return previous;
}

export function inverseRelease585WorkflowUserAgents(source, role) {
  source = inverseSource603SavedWorkflowRole(source, role);
  source = inverseImmediateOrdinaryPagesWorkflow(source, role);
  source = inverseReviewedSource602BuildWorkflowInspection(source, role);
  source = inverseReviewedSource601BuildWorkflowInspection(source, role);
  source = inverseReviewedSourceWorkflowInspection(source, role);
  source = inverseNativeOriginalSchemaSelectorWorkflow(source, role);
  if (role === 'build' && sha(source) === '8223891e25cfb7fbcf57a536bcc55a1cbf59ed676f02172588192065ae4eccc0') {
    assert.equal(source.split('RavRadar/4.0.586').length, 6, 'Exactly five normal586 User-Agent fields');
    source = source.replaceAll('RavRadar/4.0.586', 'RavRadar/4.0.585');
    assert.equal(sha(source), '2ee56b8ae3546f8ac3ce97b45aaedbfe7eb67fac0960961f164cecca70c0970c',
      'Whole genuine585 workflow survives the586 User-Agent inverse');
  }
  if (role !== 'build' || sha(source) !== '2ee56b8ae3546f8ac3ce97b45aaedbfe7eb67fac0960961f164cecca70c0970c') return source;
  assert.equal(source.split('RavRadar/4.0.585').length, 6, 'Exactly five normal585 User-Agent fields');
  const previous = source.replaceAll('RavRadar/4.0.585', 'RavRadar/4.0.584');
  assert.equal(sha(previous), 'b509a5131c64f9df9a431fdf9f99b082fb14c88de8bf9c3ad3e33b8ddc77de57', 'Whole genuine main674 workflow survives');
  return previous;
}
export function inverseOrdinaryCompletedStageWorkflowWiring(source, role) {
  source = inverseRelease585WorkflowUserAgents(source, role);
  const row = ordinaryStageWiringReview[role];
  if (!row || sha(source) !== row.afterSha256) return source;
  assert.equal(Buffer.byteLength(source), row.afterBytes, 'Whole reviewed staged caller byte count');
  let previous = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'Exact optional-stage wiring hunk');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.beforeBytes);
  assert.equal(sha(previous), row.beforeSha256, 'Entire preceding workflow survives the optional-stage wiring inverse');
  return previous;
}
// Test-only exact relocation of the unchanged four-step UNPUBLISHED B stage.
// The entire c72 predecessor, including its later protected B/S writes, remains
// the old oracle. Unknown whole bytes never enter this inverse.
const earlyStageAfterSha = '05665749cefb5f210a7542cb6fab06e2900be0fd9bb8326cab9b1dcc7b432f73';
const earlyStageBeforeSha = 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6';
const earlyStageStart = '      # The expensive weather/score build is already complete. Save its exact\n';
const earlyStageNext = '      - name: Generate and strictly validate production reference zones\n';
const earlyStageOldNext = '      - name: Build dataminimized weather preflight state after final gates\n';
export function assertEarlyCompletedRuntimeStageOrder(source) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, 'build');
  assert.equal(sha(source), earlyStageAfterSha, 'Only the whole reviewed early-stage workflow is current');
  for (const marker of [earlyStageStart, earlyStageNext, earlyStageOldNext])
    assert.equal(source.split(marker).length, 2, 'One exact early-stage boundary');
  const start = source.indexOf(earlyStageStart), end = source.indexOf(earlyStageNext);
  assert(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.equal(Buffer.byteLength(block), 3399, 'The same four complete stage blocks are relocated');
  assert.equal(sha(block), '712d300b49902e52d89f7fdbe383106fdfc692eb93a531ef7ec57101a8b3d22a',
    'Every stage body, selector, secret, inventory and upload field is unchanged');
  assert.deepEqual([...block.matchAll(/^        id: (.+)$/gm)].map(row => row[1]),
    ['private-runtime-bundle-spec', 'private-runtime-bundle-create', 'private-build-stage-seal', 'private-build-stage-upload']);
  const markers = [
    '      - name: Create and validate exactly one checkpoint disposition before release gate\n',
    earlyStageStart, earlyStageNext,
    '        id: full-validation\n', '        id: release-gate\n',
    '      - name: Require exact integrated backend and Edge readiness before integrated Pages\n',
    '        id: checkpoint-build\n', '        id: checkpoint-save\n', earlyStageOldNext,
    '        id: private-runtime-publish\n', '        id: checkpoint-publish\n',
  ];
  let prior = -1;
  for (const marker of markers) {
    assert.equal(source.split(marker).length, 2, 'One unchanged current workflow step: ' + marker.trim());
    const at = source.indexOf(marker);
    assert(at > prior, 'Encrypted UNPUBLISHED B precedes final gates; protected B/S stay after them: ' + marker.trim());
    prior = at;
  }
  const disposition = source.indexOf(markers[0]);
  assert.equal(source.indexOf('      - name: ', disposition + markers[0].length),
    source.indexOf('      - name: Build private production runtime bundle specification\n'),
    'The exact four-block stage immediately follows checkpoint disposition');
  return block;
}
export function inverseEarlyCompletedRuntimeStage(source, role) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  if (role !== 'build' || sha(source) !== earlyStageAfterSha) return source;
  const block = assertEarlyCompletedRuntimeStageOrder(source);
  const without = source.replace(block, '');
  assert.equal(without.split(earlyStageOldNext).length, 2, 'One original stage destination');
  const previous = without.replace(earlyStageOldNext, () => block + earlyStageOldNext);
  assert.equal(sha(previous), earlyStageBeforeSha,
    'The whole genuine c72 workflow survives only the four-block relocation inverse');
  return previous;
}
// Test-only release584 UA layer. The complete actual workflow is checked
// before replacing only its five version strings; no runtime guard changes.
export function inverseRelease584WorkflowUserAgents(source, role) {
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  source = inverseEarlyCompletedRuntimeStage(source, role);
  if (role !== 'build' || sha(source) !== 'f0254a092c0baa188370c207b218e15ad7c9e616138d15234e6f323f101178c6') return source;
  assert.equal(source.split('RavRadar/4.0.584').length, 6, 'Exactly five reviewed584 User-Agent fields');
  const previous = source.replaceAll('RavRadar/4.0.584', 'RavRadar/4.0.581');
  assert.equal(sha(previous), '4883b292423e162eec6f88d6402ef189adca71dc538fdfe22b7f91162f8ce4f0',
    'Every byte of the genuine581 current-family-C workflow survives the584 UA inverse');
  return previous;
}
// Test-only additive C layer. Only these two whole reviewed afterimages may
// enter; every byte of the genuine f644 predecessor remains the old oracle.
export function inverseCurrentFamilyColdStartWorkflow(source, role) {
  source = inverseRelease584WorkflowUserAgents(source, role);
  const row = coldReview.roles[role];
  if (!row || sha(source) !== row.actualSha256) return source;
  let previous = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'Exact C inverse segment');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(sha(previous), row.predecessorSha256, 'Whole genuine f644 workflow survives the C inverse');
  return previous;
}
// Exact test-only ordinary checkout inverse; no runtime source guard is changed.
export function inverseOrdinaryFullHistoryCheckout(source, role) {
  if (role !== 'build' || sha(source) !== '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce') return source;
  const actual = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n";
  const original = "      - uses: actions/checkout@v7\n        with:\n          fetch-depth: ${{ inputs.completed_private_runtime && '0' || '1' }}\n";
  assert.equal(source.split(actual).length, 2, 'One reviewed checkout block');
  const previous = source.replace(actual, original);
  assert.equal(sha(previous), 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d',
    'The entire preceding workflow survives the one-line checkout inverse');
  return previous;
}
// Exact test-only RAW-retention caller layer. No runtime input or authority changes.
const rawRetentionDemand = "      - name: Plan bounded current history from the actual selected continuation\n";
const rawRetentionRefresh = "      - name: Refresh DMI water-source registry\n";
const rawRetentionGeneration = "      - name: Prepare strict active DMI donor or resumable candidate\n";
const rawRetentionLegacy = "      - name: Bind causal OLD current reconstruction to the materialized saved inputs\n";
const rawRetentionDmi = "      - name: Update DMI bulk model cache\n";
const rawRetentionOldBlock = "      - name: Plan bounded current history from the actual selected continuation\n        id: current-history-demand\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\n        run: node scripts/plan-ravscore-current-history.mjs\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\n\n";
const rawRetentionBlock = "      - name: Plan bounded current history from the actual selected continuation\n        id: current-history-demand\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.historical-wave-transition.outputs.required != 'true')\n        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: ${{ steps.private-runtime-install.outcome == 'success' && 'true' || 'false' }}\n          RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: ${{ (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true' && 'true' || 'false' }}\n\n";
const rawRetentionEnv = "          DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION: ${{ steps.private-runtime-install.outcome == 'success' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && inputs.weather_state_epoch_bootstrap != true && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && steps.historical-wave-transition.outputs.required != 'true' && 'true' || 'false' }}\n";
export function assertCurrentHistoryRawRetentionOrder(source) {
  for (const marker of [rawRetentionDemand, rawRetentionRefresh, rawRetentionGeneration,
    rawRetentionLegacy, rawRetentionDmi])
    assert.equal(source.split(marker).length, 2, 'One exact RAW-retention workflow step');
  const start = source.indexOf(rawRetentionDemand);
  const end = source.indexOf('      - name: ', start + rawRetentionDemand.length);
  const prepared = source.indexOf(rawRetentionGeneration);
  assert(end > start, 'The actual demand block has a finite next-step boundary');
  assert.equal(end, source.indexOf(rawRetentionLegacy), 'Demand immediately precedes legacy binding');
  assert(prepared < start, 'Actual generation materialization precedes demand');
  assert.equal(source.indexOf('      - name: ', prepared + rawRetentionGeneration.length), start,
    'Demand immediately follows actual generation materialization');
  assert(end < source.indexOf(rawRetentionDmi), 'Demand and legacy binding precede DMI');
  assert.equal(source.slice(start, end), rawRetentionBlock, 'Only the reviewed planner arg changes');
  assert.equal(source.split(rawRetentionEnv).length, 2, 'One exact committed-retention requirement');
  const dmiStart = source.indexOf(rawRetentionDmi);
  const dmiEnd = source.indexOf('      - name: ', dmiStart + rawRetentionDmi.length);
  assert(dmiEnd > dmiStart);
  assert(source.slice(dmiStart, dmiEnd).includes(rawRetentionEnv), 'Retention requirement belongs to DMI');
  assert.equal(sha(source), '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34', 'The entire current RAW-retention workflow is reviewed');
}
export function inverseCurrentHistoryRawRetentionOrder(source, role) {
  source = inverseCurrentFamilyColdStartWorkflow(source, role);
  if (role !== 'build' || sha(source) !== '46c88e4cca919ecc288c006db443106b1f8ce8fed1dbca3a87b74d7aea8a3e34') return source;
  assertCurrentHistoryRawRetentionOrder(source);
  let previous = source.replace(rawRetentionEnv, '').replace(rawRetentionBlock, '');
  previous = previous.replace(rawRetentionRefresh, rawRetentionOldBlock + rawRetentionRefresh);
  assert.equal(sha(previous), 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49',
    'Whole preceding workflow survives only the exact demand move, arg and env inverses');
  return previous;
}
export function inverseOriginWeatherReadCredentials(source, role) {
  source = inverseCurrentHistoryRawRetentionOrder(source, role);
  if (role !== 'build' || sha(source) !== 'fd1cd664bdbdcf41ef2ad32e6ad5caf058a980b3093a3f4fc226ca1797854b49') return source;
  const marker = '      - name: Update central weather cache\n';
  assert.equal(source.split(marker).length, 2, 'One normal weather credential scope');
  const start = source.indexOf(marker), end = source.indexOf('\n      - name: ', start + marker.length);
  assert(end > start);
  const step = source.slice(start, end);
  const actual = "          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n";
  const original = "          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n";
  assert.equal(step.split(actual).length, 2, 'Exactly two normal weather Supabase credentials');
  const previous = source.slice(0, start) + step.replace(actual, original) + source.slice(end);
  assert.equal(sha(previous), 'fff327a65cf0a441f33da2e70e144802d11d5bcb8c0b8d570219f23a84970f11',
    'Entire paired-publication workflow survives only the two weather env inverses');
  return previous;
}
export function inversePairedPrivateRuntimePublication(source, role) {
  source = inverseOriginWeatherReadCredentials(source, role);
  if (role !== 'build' || sha(source) !== 'fff327a65cf0a441f33da2e70e144802d11d5bcb8c0b8d570219f23a84970f11') return source;
  for (const [actual, original] of [["      - name: Refuse current-family B publication without a completable checkpoint disposition\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        shell: bash\n        env:\n          CHECKPOINT_DISPOSITION: ${{ steps.checkpoint-disposition.outputs.disposition }}\n        run: |\n          set -euo pipefail\n          node --input-type=module <<'NODE'\n          import fs from 'node:fs';\n          import { assertPrivateRuntimeCheckpointPublicationDisposition }\n            from './scripts/reconcile-private-runtime-checkpoint.mjs';\n          const descriptor = JSON.parse(fs.readFileSync(process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE + '/manifest.json', 'utf8'));\n          assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, process.env.CHECKPOINT_DISPOSITION);\n          NODE\n\n      - name: Publish bounded private runtime with one protected rollback generation\n        id: private-runtime-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-private-production-runtime.mjs\n          --publish\n          --private-root \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          --bundle \"$RAVRADAR_PRIVATE_RUNTIME_BUNDLE\"\n          --repository-root \"$GITHUB_WORKSPACE\"\n          --expected .cache/private-production-runtime-expected.json\n          --source-head \"$GITHUB_SHA\"\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Reconfirm current main before protected RavScore write\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED')\n        shell: bash\n        run: |\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          test \"$(git rev-parse HEAD)\" = \"$(git rev-parse origin/main)\"\n\n      - name: Publish atomic RavScore checkpoint to protected admin storage\n        id: checkpoint-publish\n        if: steps.private-runtime-publish.outcome == 'success' && steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED') && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --publish\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Publish bounded private runtime with one protected rollback generation\n        id: private-runtime-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-private-production-runtime.mjs\n          --publish\n          --private-root \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          --bundle \"$RAVRADAR_PRIVATE_RUNTIME_BUNDLE\"\n          --repository-root \"$GITHUB_WORKSPACE\"\n          --expected .cache/private-production-runtime-expected.json\n          --source-head \"$GITHUB_SHA\"\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n"],["      - name: Build dataminimized weather preflight state after final gates\n","      - name: Reconfirm current main before protected RavScore write\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED')\n        shell: bash\n        run: |\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          test \"$(git rev-parse HEAD)\" = \"$(git rev-parse origin/main)\"\n\n      - name: Publish atomic RavScore checkpoint to protected admin storage\n        id: checkpoint-publish\n        if: steps.preflight.outputs.should_run == 'true' && (steps.weather.outcome == 'success' || (inputs.completed_private_runtime == true && steps.completed-runtime-admission.outcome == 'success')) && (steps.checkpoint-disposition.outputs.disposition == 'READY_PUBLISHED' || steps.checkpoint-disposition.outputs.disposition == 'MEASURED_WARMUP_PUBLISHED') && steps.operational-action.outputs.action != 'candidate-dry-run'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --publish\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n      - name: Build dataminimized weather preflight state after final gates\n"],["      - name: Install only the allowlisted restored private runtime files\n        id: private-runtime-install\n        if: steps.preflight.outputs.should_run == 'true' && steps.private-runtime-state.outputs.available == 'true'\n        shell: bash\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          PREDECESSOR_TRANSITION_KIND: ${{ steps.historical-wave-predecessor.outputs.transition_kind }}\n          MIGRATED_RUNTIME_ROOT: ${{ steps.bounded-conditions-predecessor-migration.outputs.restored_path }}\n          EXACT_WEATHER_MIGRATED_ROOT: ${{ steps.exact-weather-pair-migration.outputs.restored_path }}\n          OWNER_CURRENT_MIGRATED_ROOT: ${{ steps.owner-current-original-migration.outputs.restored_path }}\n          CURRENT_GRID_MIGRATED_ROOT: ${{ steps.current-grid-original-migration.outputs.restored_path }}\n        run: |\n          set -euo pipefail\n          if test \"${{ inputs.weather_state_epoch_bootstrap }}\" = true; then\n            test \"${{ steps.state-epoch-runtime-install.outcome }}\" = success\n            node scripts/weather-state-epoch.mjs verify\n            exit 0\n          fi\n          if test \"${{ inputs.native_sampling_identity_original_recovery }}\" = true; then\n            test \"${{ steps.native-identity-runtime-install.outcome }}\" = success\n            node scripts/install-native-identity-checkpoint-runtime.mjs verify\n            exit 0\n          fi\n          restored_root=\"$RAVRADAR_PRIVATE_RUNTIME_RESTORE\"\n          if test \"$PREDECESSOR_TRANSITION_KIND\" = \"current-grid-sampling-original\"; then\n            test -n \"$CURRENT_GRID_MIGRATED_ROOT\"\n            test \"${{ steps.current-grid-original-migration.outcome }}\" = 'success'\n            restored_root=\"$CURRENT_GRID_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"owner-current-domain-original\"; then\n            test -n \"$OWNER_CURRENT_MIGRATED_ROOT\"\n            restored_root=\"$OWNER_CURRENT_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"bounded-conditions-writer\"; then\n            test -n \"$MIGRATED_RUNTIME_ROOT\"\n            restored_root=\"$MIGRATED_RUNTIME_ROOT\"\n          elif test -n \"$EXACT_WEATHER_MIGRATED_ROOT\"; then\n            restored_root=\"$EXACT_WEATHER_MIGRATED_ROOT\"\n          fi\n          node scripts/private-production-runtime-workflow.mjs install \\\n            --restored \"$restored_root\" \\\n            --repository-root \"$GITHUB_WORKSPACE\"\n\n      # The 4.0.500 private bundle predates persistent PART-hour DMI\n      # continuity. Bootstrap once from the exact previous protected native\n      # DMI generation, without installing any older score or cache state.\n      - name: Reconcile only authenticated CURRENT B to its exact protected S before providers\n        id: paired-checkpoint-reconcile\n        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated' && steps.paired-checkpoint-route.outputs.required == 'true'\n        shell: bash\n        run: |\n          set -euo pipefail\n          test \"${{ steps.private-runtime-install.outcome }}\" = success\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = 'refs/heads/main'\n          test \"$(git rev-parse HEAD)\" = \"$GITHUB_SHA\"\n          test \"$(git rev-parse origin/main)\" = \"$GITHUB_SHA\"\n          node scripts/reconcile-private-runtime-checkpoint.mjs reconcile\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          NATIVE_IDENTITY_RECOVERY: ${{ inputs.native_sampling_identity_original_recovery }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Install only the allowlisted restored private runtime files\n        id: private-runtime-install\n        if: steps.preflight.outputs.should_run == 'true' && steps.private-runtime-state.outputs.available == 'true'\n        shell: bash\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          PREDECESSOR_TRANSITION_KIND: ${{ steps.historical-wave-predecessor.outputs.transition_kind }}\n          MIGRATED_RUNTIME_ROOT: ${{ steps.bounded-conditions-predecessor-migration.outputs.restored_path }}\n          EXACT_WEATHER_MIGRATED_ROOT: ${{ steps.exact-weather-pair-migration.outputs.restored_path }}\n          OWNER_CURRENT_MIGRATED_ROOT: ${{ steps.owner-current-original-migration.outputs.restored_path }}\n          CURRENT_GRID_MIGRATED_ROOT: ${{ steps.current-grid-original-migration.outputs.restored_path }}\n        run: |\n          set -euo pipefail\n          if test \"${{ inputs.weather_state_epoch_bootstrap }}\" = true; then\n            test \"${{ steps.state-epoch-runtime-install.outcome }}\" = success\n            node scripts/weather-state-epoch.mjs verify\n            exit 0\n          fi\n          if test \"${{ inputs.native_sampling_identity_original_recovery }}\" = true; then\n            test \"${{ steps.native-identity-runtime-install.outcome }}\" = success\n            node scripts/install-native-identity-checkpoint-runtime.mjs verify\n            exit 0\n          fi\n          restored_root=\"$RAVRADAR_PRIVATE_RUNTIME_RESTORE\"\n          if test \"$PREDECESSOR_TRANSITION_KIND\" = \"current-grid-sampling-original\"; then\n            test -n \"$CURRENT_GRID_MIGRATED_ROOT\"\n            test \"${{ steps.current-grid-original-migration.outcome }}\" = 'success'\n            restored_root=\"$CURRENT_GRID_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"owner-current-domain-original\"; then\n            test -n \"$OWNER_CURRENT_MIGRATED_ROOT\"\n            restored_root=\"$OWNER_CURRENT_MIGRATED_ROOT\"\n          elif test \"$PREDECESSOR_TRANSITION_KIND\" = \"bounded-conditions-writer\"; then\n            test -n \"$MIGRATED_RUNTIME_ROOT\"\n            restored_root=\"$MIGRATED_RUNTIME_ROOT\"\n          elif test -n \"$EXACT_WEATHER_MIGRATED_ROOT\"; then\n            restored_root=\"$EXACT_WEATHER_MIGRATED_ROOT\"\n          fi\n          node scripts/private-production-runtime-workflow.mjs install \\\n            --restored \"$restored_root\" \\\n            --repository-root \"$GITHUB_WORKSPACE\"\n\n      # The 4.0.500 private bundle predates persistent PART-hour DMI\n      # continuity. Bootstrap once from the exact previous protected native\n      # DMI generation, without installing any older score or cache state.\n"],["      - name: Restore protected atomic RavScore checkpoint when cache is absent\n        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --restore\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n","      - name: Restore protected atomic RavScore checkpoint when cache is absent\n        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        run: >-\n          node scripts/protected-ravscore-continuation-checkpoint.mjs\n          --restore\n          --target-reference \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n        env:\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n\n"],["      - name: Select current-family paired checkpoint restoration before any S restore\n        id: paired-checkpoint-route\n        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n        shell: bash\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          NATIVE_IDENTITY_RECOVERY: ${{ inputs.native_sampling_identity_original_recovery }}\n        run: |\n          set -euo pipefail\n          git fetch --no-tags origin main\n          test \"$GITHUB_REF\" = 'refs/heads/main'\n          test \"$(git rev-parse HEAD)\" = \"$GITHUB_SHA\"\n          test \"$(git rev-parse origin/main)\" = \"$GITHUB_SHA\"\n          node scripts/reconcile-private-runtime-checkpoint.mjs select\n\n      - name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint\n        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        id: ravscore-checkpoint-cache\n        uses: actions/cache/restore@v6\n        with:\n          path: .cache/ravscore-continuation-checkpoint\n          key: ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}\n          restore-keys: |\n            ravscore-continuation-schema6-v2-\n\n","      - name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint\n        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n        id: ravscore-checkpoint-cache\n        uses: actions/cache/restore@v6\n        with:\n          path: .cache/ravscore-continuation-checkpoint\n          key: ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}\n          restore-keys: |\n            ravscore-continuation-schema6-v2-\n\n"]]) {
    assert.equal(source.split(actual).length, 2, 'Exact paired-publication workflow inverse');
    source = source.replace(actual, () => original);
  }
  assert.equal(sha(source), '861fad7501e32d4b63c72caa598825b15fb5fb2758961a1187ed57858e5c01ce', 'Whole previous ordinary workflow survives');
  return source;
}
const automaticCompletedPagesReview = JSON.parse(fs.readFileSync(
  new URL('./automatic-completed-pages-workflow-review.json', import.meta.url), 'utf8'));

const immediateOrdinaryPagesReview = JSON.parse(fs.readFileSync(
  new URL('./immediate-ordinary-pages-workflow-review.json', import.meta.url), 'utf8'));

export function inverseImmediateOrdinaryPagesWorkflow(source, role) {
  const row = Object.hasOwn(immediateOrdinaryPagesReview, role) ? immediateOrdinaryPagesReview[role] : null;
  if (!row || typeof source !== 'string' || Buffer.byteLength(source) !== row.after.bytes
      || sha(source) !== row.after.sha256) return source;
  let bytes = Buffer.from(source);
  for (const [offset, length, afterSha256, original] of [...row.inverse].reverse()) {
    assert.equal(sha(bytes.subarray(offset, offset + length)), afterSha256, 'PAGES_IMMEDIATE_WORKFLOW_HUNK_CHANGED');
    bytes = Buffer.concat([bytes.subarray(0, offset), Buffer.from(original), bytes.subarray(offset + length)]);
  }
  assert.equal(bytes.length, row.before.bytes, 'PAGES_IMMEDIATE_WORKFLOW_PREDECESSOR_SIZE');
  assert.equal(sha(bytes), row.before.sha256, 'PAGES_IMMEDIATE_WORKFLOW_PREDECESSOR_CHANGED');
  return bytes.toString('utf8');
}

export function inverseAutomaticCompletedPagesWorkflow(source, role) {
  source = inverseAutomaticDatabaseBackupHookWorkflow(source, role);
  source = inverseImmediateOrdinaryPagesWorkflow(source, role);
  if (role === 'once') {
    source = inverseSource859ImmediatePagesWorkflow(source, source604CombinedWorkflowPaths.once);
    source = inverseReviewedSourceRequestProjection(source, source604CombinedWorkflowPaths.once);
    source = inverseHistoricalSource606Once(source, source604CombinedWorkflowPaths.once);
  }
  const { before, after, applyInThisOrder } = automaticCompletedPagesReview;
  if (role !== 'once' || typeof source !== 'string'
    || Buffer.byteLength(source) !== after.bytes || sha(source) !== after.sha256) return source;
  for (const [actual, original] of applyInThisOrder) {
    assert.equal(source.split(actual).length, 2, 'One exact automatic completed Pages hunk');
    source = source.replace(actual, () => original);
  }
  assert.equal(Buffer.byteLength(source), before.bytes);
  assert.equal(sha(source), before.sha256);
  return source;
}

export function inverseCompletedRuntimeWorkflow(source, role) {
  source = inverseReviewedSource604CombinedWorkflow(source, source604CombinedWorkflowPaths[role], 'source604');
  source = inverseAutomaticCompletedPagesWorkflow(source, role);
  source = inverseTerminalRepair4145Workflow(source, role);
  source = inverseOrdinaryCompletedStageWorkflowWiring(source, role);
  source = inverseEarlyCompletedRuntimeStage(source, role);
  source = inversePairedPrivateRuntimePublication(source, role);
  source = inverseOrdinaryFullHistoryCheckout(source, role);
  // Exact release581 UA-only inverse; all historical guards below remain intact.
  if (role === 'build' && sha(source) === 'c3f3f76aed3b1193d3c446f00018668ea165370bcdb92742c7139b2cd3e9ab7d') {
    assert.equal(source.split('RavRadar/4.0.581').length, 6, 'Exactly five reviewed581 UA changes');
    source = source.replaceAll('RavRadar/4.0.581', 'RavRadar/4.0.580');
    assert.equal(sha(source), '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615',
      'Whole reviewed580 workflow must survive the581 inverse');
  }
  // Exact release580 successor only; retain the reviewed579 inverse below.
  if (role === 'build' && sha(source) === '41db6fb9dbde88f26cf6be776db5d712925e166ebc90e4db8f3d754954233615') {
    assert.equal(source.split('RavRadar/4.0.580').length, 6, 'Exactly five reviewed580 UA changes');
    source = source.replaceAll('RavRadar/4.0.580', 'RavRadar/4.0.579');
    assert.equal(sha(source), '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b',
      'Whole reviewed579 workflow must survive the580 inverse');
  }
  // Exact test-only UA release successor; retain the entire old workflow oracle.
  if (role === 'build' && sha(source) === '1630141d45a0b65bbe0b6940b23079f330c2b94a1b4ec947b3c6d961f9f43f8b') {
    assert.equal(source.split('RavRadar/4.0.579').length, 6, 'Exactly five reviewed UA changes');
    source = source.replaceAll('RavRadar/4.0.579', 'RavRadar/4.0.578');
    assert.equal(sha(source), '061c8eaababf8e718e30c98faee1f789850536d8b28fe11e4071b71d27b45af4',
      'Whole pre-release completed-runtime workflow must survive the inverse');
  }
  const row = review.inverseReview[role];
  if (!row) return source;
  assert.equal(sha(source), row.actualSha256, 'Exact reviewed completed-runtime workflow: ' + role);
  let legacy = source;
  for (const [offset, actual, original] of row.edits) {
    assert.equal(legacy.slice(offset, offset + actual.length), actual, 'Exact inverse segment');
    legacy = legacy.slice(0, offset) + original + legacy.slice(offset + actual.length);
  }
  assert.equal(sha(legacy), row.legacySha256, 'Whole historical workflow must survive the inverse');
  return legacy;
}

// Exact additional WORK-SELECTOR layer. Unknown bytes still reach and fail the
// unchanged historical whole-workflow validators; no runtime authority here.
export const nativeOriginalSchemaSelectorWorkflowReview = Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "before": {
    "bytes": 285368,
    "sha256": "8223891e25cfb7fbcf57a536bcc55a1cbf59ed676f02172588192065ae4eccc0"
  },
  "after": {
    "bytes": 287147,
    "sha256": "2d98a6d883c26d38e3665383f03a551167189ce587b7f21de261aecebdf5dbf5"
  },
  "hunks": [
    [
      "          if (store.hasPartContinuity) {",
      "          // Schema is an ordinary work selector only; never an original-proof/PASS marker.\n          const continuitySchema = store.continuity?.metadata.schemaVersion;\n          if (store.hasPartContinuity && continuitySchema !== 1 && continuitySchema !== 2) {\n            throw new Error('Unknown DMI PART continuity schema');\n          }\n          fs.appendFileSync(process.env.GITHUB_OUTPUT, `continuity_schema=${continuitySchema ?? ''}\\n`);\n          if (store.hasPartContinuity) {"
    ],
    [
      "        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw",
      "        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}"
    ]
  ]
});
export function inverseNativeOriginalSchemaSelectorWorkflow(source, role) {
  source = inverseAssistant587LatestColdCombinedTo664aWorkflow(source, role);
  if (Object.hasOwn(latestColdProgressWorkflowReview.roles, role)
    && sha(source) === latestColdProgressWorkflowReview.roles[role].after.sha256)
    source = inverseLatestColdProgressWorkflow(source, role);
  source=inverseAssistant587ColdCheckpointCombinedToF83Workflow(source,role);
  if (Object.hasOwn(currentFamilyColdCheckpointWorkflowReview.roles, role) &&
      sha(source) === currentFamilyColdCheckpointWorkflowReview.roles[role].after.sha256) {
    source = inverseCurrentFamilyColdCheckpointWorkflow(source, role);
  }
  source=inverseAssistant587ColdBudgetCombinedTo707Workflow(source,role);
  source=inverseAssistant587CompletedWorkflow(source,role);
  if (role === 'build' && sha(source) === currentFamilyColdBudgetWorkflowReview.after.sha256) {
    source = inverseCurrentFamilyColdBudgetWorkflow(source, role);
  }
  if(role!=='build'||sha(source)!==nativeOriginalSchemaSelectorWorkflowReview.after.sha256)return source;
  const row=nativeOriginalSchemaSelectorWorkflowReview;
  assert.equal(Buffer.byteLength(source),row.after.bytes,'NATIVE_SCHEMA_SELECTOR_WHOLE_AFTER_SIZE');
  let previous=source;
  for(const[before,after]of [...row.hunks].reverse()){
    assert.equal(previous.split(after).length,2,'NATIVE_SCHEMA_SELECTOR_EXACT_HUNK');
    previous=previous.replace(after,before);
  }
  assert.equal(Buffer.byteLength(previous),row.before.bytes,'NATIVE_SCHEMA_SELECTOR_WHOLE_BEFORE_SIZE');
  assert.equal(sha(previous),row.before.sha256,'NATIVE_SCHEMA_SELECTOR_WHOLE_BEFORE_SHA');
  return previous;
}

// Exact test-only issued587 -> whole genuine586 workflow layer. It grants no
// runtime admission, original proof, SQL permission or calculation reuse.
export const assistant587CompletedWorkflowReview=Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "after": {
    "bytes": 290122,
    "sha256": "0592b24428555e7280c4ed5ed6434e0dbaf034d4210fe3ae34480d9d96bb89ad"
  },
  "userAgentBefore": {
    "bytes": 290122,
    "sha256": "47d1f2ae1f72b15778da6653255ffb2ee50dfce11a0690e5a4319cb33793d970"
  },
  "before": {
    "bytes": 287147,
    "sha256": "2d98a6d883c26d38e3665383f03a551167189ce587b7f21de261aecebdf5dbf5"
  },
  "hunks": [
    [
      139824,
      "        run: |\n          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            export NODE_OPTIONS=--max-old-space-size=6144\n          fi\n          node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
      "        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}\n        env:\n          RAVRADAR_R2_ACCOUNT_ID: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n"
    ],
    [
      82210,
      "          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            test \"${{ steps.assistant-later-h0-prepare.outcome }}\" = success\n            NODE_OPTIONS=--max-old-space-size=6144 node scripts/assistant-later-h0-runtime-transition.mjs install\n            exit 0\n          fi\n",
      ""
    ],
    [
      80312,
      "          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
      "          RAVRADAR_R2_ACCOUNT_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCOUNT_ID || '' }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_ACCESS_KEY_ID || '' }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.RAVRADAR_R2_SECRET_ACCESS_KEY || '' }}\n          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n"
    ],
    [
      69246,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true'\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true'\n"
    ],
    [
      58925,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ],
    [
      54598,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n",
      "        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n"
    ],
    [
      53525,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n",
      "        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n"
    ],
    [
      52455,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n"
    ],
    [
      51270,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ],
    [
      46829,
      "      # Separate authentic586 -> later ordinary H0. Not a code-only install,\n      # SAME_H0 event, parent rewrite or generic historical fallback.\n      - name: Select only authentic586 for the normal assistant successor\n        id: assistant-later-h0-source\n        if: inputs.weather_state_epoch_bootstrap != true && inputs.current_family_cold_start != true && inputs.native_sampling_identity_original_recovery != true && steps.preflight.outputs.should_run == 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance')\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n        run: node scripts/assistant-later-h0-runtime-transition.mjs select\n\n      - name: Prepare the whole original-preserving586 working view\n        id: assistant-later-h0-prepare\n        if: steps.assistant-later-h0-source.outputs.required == 'true'\n        shell: bash\n        env:\n          NODE_OPTIONS: --max-old-space-size=6144\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n        run: |\n          set -euo pipefail\n          mkdir -p \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          node scripts/assistant-later-h0-runtime-transition.mjs prepare\n\n      - name: Prepare exact old-reader restore for the measured wave transition\n        id: historical-wave-predecessor\n        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "      - name: Prepare exact old-reader restore for the measured wave transition\n        id: historical-wave-predecessor\n        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ]
  ]
});

for(const hunk of assistant587CompletedWorkflowReview.hunks)Object.freeze(hunk);
Object.freeze(assistant587CompletedWorkflowReview.hunks);
for(const key of ['after','userAgentBefore','before'])Object.freeze(assistant587CompletedWorkflowReview[key]);
export function inverseAssistant587CompletedWorkflow(source,role){
  const row=assistant587CompletedWorkflowReview;
  if(role!=='build'||sha(source)!==row.after.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.after.bytes,'ASSISTANT587_WORKFLOW_WHOLE_AFTER_SIZE');
  assert.equal(source.split('RavRadar/4.0.587').length,6,'Exactly five reviewed587 User-Agent fields');
  let previous=source.replaceAll('RavRadar/4.0.587','RavRadar/4.0.586');
  assert.equal(Buffer.byteLength(previous),row.userAgentBefore.bytes);
  assert.equal(sha(previous),row.userAgentBefore.sha256,'Whole reviewed assistant workflow survives only the587 UA inverse');
  for(const[offset,actual,original]of row.hunks){
    assert.equal(previous.slice(offset,offset+actual.length),actual,'ASSISTANT587_WORKFLOW_EXACT_HUNK');
    previous=previous.slice(0,offset)+original+previous.slice(offset+actual.length);
  }
  assert.equal(Buffer.byteLength(previous),row.before.bytes,'ASSISTANT587_WORKFLOW_WHOLE_BEFORE_SIZE');
  assert.equal(sha(previous),row.before.sha256,'Whole genuine586 schema-selector workflow survives the assistant inverse');
  return previous;
}

// TEST INPUT ONLY: exact composition of the two already reviewed parent layers.
// Neither this descriptor nor either projection issues runtime/SQL authority.
export const assistant587ColdBudgetCombinedWorkflowReview=Object.freeze({
  "path": ".github/workflows/reusable-weather-build.yml",
  "commonParent": {
    "bytes": 287147,
    "sha256": "2d98a6d883c26d38e3665383f03a551167189ce587b7f21de261aecebdf5dbf5"
  },
  "p0707Parent": {
    "bytes": 287375,
    "sha256": "ed1da3a8fcef9965d10b47fb8fbc79ce384e7fd705d3d2b2be6375f8e47ca93f"
  },
  "assistant587Parent": {
    "bytes": 290122,
    "sha256": "0592b24428555e7280c4ed5ed6434e0dbaf034d4210fe3ae34480d9d96bb89ad"
  },
  "combined": {
    "bytes": 290350,
    "sha256": "c370294d7695b1c4ecc7d68bddae47fdb4494e14e967a4383089652dbb55341e"
  }
});
for(const key of ['commonParent','p0707Parent','assistant587Parent','combined'])
  Object.freeze(assistant587ColdBudgetCombinedWorkflowReview[key]);
export function inverseAssistant587ColdBudgetCombinedTo587Workflow(source,role){
  const row=assistant587ColdBudgetCombinedWorkflowReview;
  if(role!=='build'||sha(source)!==row.combined.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.combined.bytes,'ASSISTANT587_COLD_COMBINED_SIZE');
  let previous=source;
  for(const[before,after]of [...currentFamilyColdBudgetWorkflowReview.hunks].reverse()){
    assert.equal(previous.split(after).length,2,'ASSISTANT587_COLD_COMBINED_EXACT_BUDGET_HUNK');
    previous=previous.replace(after,()=>before);
  }
  assert.equal(Buffer.byteLength(previous),row.assistant587Parent.bytes,'ASSISTANT587_COLD_ASSISTANT_PARENT_SIZE');
  assert.equal(sha(previous),row.assistant587Parent.sha256,'ASSISTANT587_COLD_ASSISTANT_PARENT_SHA');
  return previous;
}
export function inverseAssistant587ColdBudgetCombinedTo707Workflow(source,role){
  const row=assistant587ColdBudgetCombinedWorkflowReview;
  if(role!=='build'||sha(source)!==row.combined.sha256)return source;
  let previous=inverseAssistant587ColdBudgetCombinedTo587Workflow(source,role);
  previous=inverseAssistant587CompletedWorkflow(previous,role);
  assert.equal(Buffer.byteLength(previous),row.commonParent.bytes,'ASSISTANT587_COLD_COMMON_PARENT_SIZE');
  assert.equal(sha(previous),row.commonParent.sha256,'ASSISTANT587_COLD_COMMON_PARENT_SHA');
  for(const[before,after]of currentFamilyColdBudgetWorkflowReview.hunks){
    assert.equal(previous.split(before).length,2,'ASSISTANT587_COLD_COMBINED_FORWARD_BUDGET_HUNK');
    previous=previous.replace(before,()=>after);
  }
  assert.equal(Buffer.byteLength(previous),row.p0707Parent.bytes,'ASSISTANT587_COLD_707_PARENT_SIZE');
  assert.equal(sha(previous),row.p0707Parent.sha256,'ASSISTANT587_COLD_707_PARENT_SHA');
  return previous;
}

// TEST INPUT ONLY: exact disjoint PR710 + PR708 composition. Both complete
// historical parents remain separate oracles; no runtime/binding authority.
export const assistant587ColdCheckpointCombinedWorkflowReview = JSON.parse(fs.readFileSync(
  new URL('./assistant587-cold-checkpoint-combined-workflow-review.json', import.meta.url), 'utf8'));
for (const key of ['toF83', 'toD5']) {
  assistant587ColdCheckpointCombinedWorkflowReview[key].forEach(Object.freeze);
  Object.freeze(assistant587ColdCheckpointCombinedWorkflowReview[key]);
}
for (const key of ['commonParent', 'p0Parent', 'assistantParent', 'combined'])
  Object.freeze(assistant587ColdCheckpointCombinedWorkflowReview[key]);
Object.freeze(assistant587ColdCheckpointCombinedWorkflowReview);
export function inverseAssistant587ColdCheckpointCombinedToF83Workflow(source, role) {
  assert.equal(arguments.length, 2, 'ASSISTANT587_CHECKPOINT_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ASSISTANT587_CHECKPOINT_TYPE');
  const row = assistant587ColdCheckpointCombinedWorkflowReview;
  if (role !== 'build' || sha(source) !== row.combined.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.combined.bytes, 'ASSISTANT587_CHECKPOINT_COMBINED_SIZE');
  let previous = source;
  for (const [offset, actual, original] of row.toF83) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'ASSISTANT587_CHECKPOINT_F83_EXACT_HUNK');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.assistantParent.bytes, 'ASSISTANT587_CHECKPOINT_F83_SIZE');
  assert.equal(sha(previous), row.assistantParent.sha256, 'ASSISTANT587_CHECKPOINT_F83_SHA');
  return previous;
}
export function inverseAssistant587ColdCheckpointCombinedToD5Workflow(source, role) {
  assert.equal(arguments.length, 2, 'ASSISTANT587_CHECKPOINT_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ASSISTANT587_CHECKPOINT_TYPE');
  const row = assistant587ColdCheckpointCombinedWorkflowReview;
  if (role !== 'build' || sha(source) !== row.combined.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.combined.bytes, 'ASSISTANT587_CHECKPOINT_COMBINED_SIZE');
  let previous = source;
  for (const [offset, actual, original] of row.toD5) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'ASSISTANT587_CHECKPOINT_D5_EXACT_HUNK');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.p0Parent.bytes, 'ASSISTANT587_CHECKPOINT_D5_SIZE');
  assert.equal(sha(previous), row.p0Parent.sha256, 'ASSISTANT587_CHECKPOINT_D5_SHA');
  return previous;
}

// TEST INPUT ONLY: exact disjoint 664a + PR712 composition. Both whole Git
// parents remain separate historical oracles. No runtime or binding authority.
export const assistant587LatestColdCombinedWorkflowReview = {
  "kind": "EXACT_TEST_INPUT_ASSISTANT587_P0712_COMPOSITION",
  "relativePath": ".github/workflows/reusable-weather-build.yml",
  "commonParent": {
    "commit": "d957e9579f2d6b3ef2281a1d65a9cb1ff4c39909",
    "bytes": 289762,
    "sha256": "39327f1ef42a4c0450c9aa3e2922dc9be9f96f12b50f45ff7a11c56dd3a9b4c7"
  },
  "p0Parent": {
    "commit": "2b1d7a95d4201ef39e10cc9d7e52cd0f4d6243aa",
    "bytes": 289911,
    "sha256": "ac548056ad2929dd64fae6ae3b22e2697f568b245b55903e4a86580a9539eab3"
  },
  "assistantParent": {
    "commit": "664aeb46966cd0ec182599a90bcaacc6c4b609ab",
    "bytes": 292737,
    "sha256": "de7c80a9bb2738fd28782dec572b1e6c3c484177316ac8f668213333a9f52cb5"
  },
  "combined": {
    "bytes": 292886,
    "sha256": "e4c022274fe0d05fd3e10aff59d7a3165c67b92847a196c7ee793df68a666600"
  },
  "to664a": [
    [
      163368,
      "          if test \"${{ inputs.current_family_cold_start }}\" = true && test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n",
      "          if test \"${{ inputs.current_family_cold_start }}\" = true && test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1\n"
    ],
    [
      96966,
      "        if: (inputs.current_family_cold_start != true || inputs.quick_progress_source == '39886354260-1' || inputs.quick_progress_source == '39933506923-1') && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current'))\n",
      "        if: (inputs.current_family_cold_start != true || inputs.quick_progress_source == '39886354260-1') && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current'))\n"
    ],
    [
      17455,
      "          if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n",
      "          if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1\n"
    ]
  ],
  "to2b": [
    [
      180717,
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.587 (${{ github.server_url }}/${{ github.repository }})\"\n",
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n"
    ],
    [
      153474,
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.587 (${{ github.server_url }}/${{ github.repository }})\"\n",
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n"
    ],
    [
      143093,
      "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
      "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n"
    ],
    [
      142528,
      "          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n",
      ""
    ],
    [
      140927,
      "        run: |\n          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            export NODE_OPTIONS=--max-old-space-size=6144\n          fi\n          node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}\n",
      "        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}\n"
    ],
    [
      123226,
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.587 (${{ github.server_url }}/${{ github.repository }})\"\n",
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n"
    ],
    [
      121669,
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.587 (${{ github.server_url }}/${{ github.repository }})\"\n",
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n"
    ],
    [
      82664,
      "          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            test \"${{ steps.assistant-later-h0-prepare.outcome }}\" = success\n            NODE_OPTIONS=--max-old-space-size=6144 node scripts/assistant-later-h0-runtime-transition.mjs install\n            exit 0\n          fi\n",
      ""
    ],
    [
      81217,
      "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
      "          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n"
    ],
    [
      80766,
      "          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n",
      ""
    ],
    [
      69700,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true'\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true'\n"
    ],
    [
      59379,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ],
    [
      55052,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n",
      "        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n"
    ],
    [
      53979,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n",
      "        if: steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original'\n"
    ],
    [
      52909,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated'\n"
    ],
    [
      51724,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ],
    [
      49054,
      "        if: steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n",
      "        if: steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true')\n"
    ],
    [
      47283,
      "      # Separate authentic586 -> later ordinary H0. Not a code-only install,\n      # SAME_H0 event, parent rewrite or generic historical fallback.\n      - name: Select only authentic586 for the normal assistant successor\n        id: assistant-later-h0-source\n        if: inputs.weather_state_epoch_bootstrap != true && inputs.current_family_cold_start != true && inputs.native_sampling_identity_original_recovery != true && steps.preflight.outputs.should_run == 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance')\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n        run: node scripts/assistant-later-h0-runtime-transition.mjs select\n\n      - name: Prepare the whole original-preserving586 working view\n        id: assistant-later-h0-prepare\n        if: steps.assistant-later-h0-source.outputs.required == 'true'\n        shell: bash\n        env:\n          NODE_OPTIONS: --max-old-space-size=6144\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n        run: |\n          set -euo pipefail\n          mkdir -p \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          node scripts/assistant-later-h0-runtime-transition.mjs prepare\n\n",
      ""
    ],
    [
      32786,
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.587 (${{ github.server_url }}/${{ github.repository }})\"\n",
      "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n"
    ]
  ]
};
for (const key of ['to664a', 'to2b']) {
  assistant587LatestColdCombinedWorkflowReview[key].forEach(Object.freeze);
  Object.freeze(assistant587LatestColdCombinedWorkflowReview[key]);
}
for (const key of ['commonParent', 'p0Parent', 'assistantParent', 'combined'])
  Object.freeze(assistant587LatestColdCombinedWorkflowReview[key]);
Object.freeze(assistant587LatestColdCombinedWorkflowReview);
export function inverseAssistant587LatestColdCombinedTo664aWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'ASSISTANT587_LATEST_COMBINED_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ASSISTANT587_LATEST_COMBINED_TYPE');
  source = inverseRelease588WorkflowUserAgents(source, role);
  const row = assistant587LatestColdCombinedWorkflowReview;
  if (role !== 'build' || sha(source) !== row.combined.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.combined.bytes, 'ASSISTANT587_LATEST_COMBINED_SIZE');
  let previous = source;
  for (const [offset, actual, original] of row.to664a) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'ASSISTANT587_LATEST_664A_EXACT_HUNK');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.assistantParent.bytes, 'ASSISTANT587_LATEST_664A_SIZE');
  assert.equal(sha(previous), row.assistantParent.sha256, 'ASSISTANT587_LATEST_664A_SHA');
  return previous;
}
export function inverseAssistant587LatestColdCombinedTo2bWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'ASSISTANT587_LATEST_COMBINED_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ASSISTANT587_LATEST_COMBINED_TYPE');
  source = inverseRelease588WorkflowUserAgents(source, role);
  const row = assistant587LatestColdCombinedWorkflowReview;
  if (role !== 'build' || sha(source) !== row.combined.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.combined.bytes, 'ASSISTANT587_LATEST_COMBINED_SIZE');
  let previous = source;
  for (const [offset, actual, original] of row.to2b) {
    assert.equal(previous.slice(offset, offset + actual.length), actual, 'ASSISTANT587_LATEST_2B_EXACT_HUNK');
    previous = previous.slice(0, offset) + original + previous.slice(offset + actual.length);
  }
  assert.equal(Buffer.byteLength(previous), row.p0Parent.bytes, 'ASSISTANT587_LATEST_2B_SIZE');
  assert.equal(sha(previous), row.p0Parent.sha256, 'ASSISTANT587_LATEST_2B_SHA');
  return previous;
}

// Test-only whole-file inverse for the one ordinary backup handoff.
// Unknown changes still reach every unchanged historical refusal.
export const automaticDatabaseBackupHookWorkflowReview=Object.freeze({
  "before": {
    "bytes": 60504,
    "sha256": "edf3178141264ed117534a9eeb049a1a28b3014e1bf0cdf2cb171a76f7bb0c87"
  },
  "after": {
    "bytes": 63367,
    "sha256": "1e9e737257489fc1ca44c56b8ccadf7262b7daea1297cecc642c1018bcc6bd18"
  },
  "hook": "  handoff-supabase-database-backup:\n    name: Hand off verified ordinary weather to database backup\n    needs: [terminal-outcome, current-main-target]\n    if: >-\n      !cancelled() && needs.terminal-outcome.result == 'success' &&\n      needs.current-main-target.result == 'success' &&\n      needs.current-main-target.outputs.completed_private_runtime == 'false' &&\n      github.repository == 'jakobjorgensen82-commits/RavRadar' &&\n      github.ref == 'refs/heads/main' && github.run_attempt == '1' &&\n      github.actor == 'github-actions[bot]' &&\n      vars.RAVRADAR_SUPABASE_BACKUP_AUTOMATION == 'weekly' &&\n      inputs.current_family_cold_start != true && inputs.completed_private_runtime != true &&\n      inputs.completed_stage_source == '' && inputs.quick_confirmation != true &&\n      inputs.quick_progress_source == '' && inputs.checkpoint_target_hour == '' &&\n      inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true &&\n      inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' &&\n      inputs.weather_state_epoch_raw_cache_key == '' && inputs.native_sampling_identity_original_recovery != true\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    continue-on-error: true\n    permissions:\n      actions: write\n    steps:\n      - name: Dispatch the existing database-backup workflow once\n        id: dispatch\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          test \"$GITHUB_REPOSITORY\" = jakobjorgensen82-commits/RavRadar\n          test \"$GITHUB_REF\" = refs/heads/main\n          test \"$GITHUB_RUN_ATTEMPT\" = 1\n          [[ \"$GITHUB_SHA\" =~ ^[a-f0-9]{40}$ ]]\n          [[ \"$GITHUB_RUN_ID\" =~ ^[1-9][0-9]*$ ]]\n          if ! ack=\"$(timeout --signal=KILL 20s gh api --method POST \\\n            -H \"Accept: application/vnd.github+json\" \\\n            -H \"X-GitHub-Api-Version: 2026-03-10\" \\\n            \"repos/$GITHUB_REPOSITORY/actions/workflows/backup-supabase-database.yml/dispatches\" \\\n            -f ref=main -f \"inputs[expected_main]=$GITHUB_SHA\" \\\n            -f \"inputs[source_weather_run_id]=$GITHUB_RUN_ID\" 2>/dev/null)\" ||\n            ! recipient=\"$(jq -er '.workflow_run_id | numbers | tostring | select(test(\"^[1-9][0-9]{0,14}$\"))' <<< \"$ack\" 2>/dev/null)\" ||\n            [[ \"$recipient\" = \"$GITHUB_RUN_ID\" ]]; then\n            echo '::warning::DATABASE_BACKUP_DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY'\n            exit 1\n          fi\n          echo \"recipient_run_id=$recipient\" >> \"$GITHUB_OUTPUT\"\n\n      # The recipient reads this exact successful step from this run attempt.\n      # A second dispatch with the same source cannot present its own run ID here.\n      - name: Bind database backup recipient ${{ steps.dispatch.outputs.recipient_run_id }}\n        run: ':'\n\n"
});
export function inverseAutomaticDatabaseBackupHookWorkflow(source,role){
  const proof=automaticDatabaseBackupHookWorkflowReview;
  if(role!=='once'||Buffer.byteLength(source)!==proof.after.bytes||sha(source)!==proof.after.sha256)return source;
  assert.equal(source.split(proof.hook).length,2,'One exact database backup handoff');
  const restored=source.replace(proof.hook,'');
  assert.equal(Buffer.byteLength(restored),proof.before.bytes);assert.equal(sha(restored),proof.before.sha256);
  return restored;
}

// Test-only exact inverse for the two separately admitted maintenance handoffs.
// The whole prior SOURCE workflow and all existing historical oracles survive.
export const source611MaintenanceWorkflowReview = Object.freeze({
  "path": ".github/workflows/run-current-weather-once.yml",
  "before": {
    "bytes": 70326,
    "sha256": "f8875f92d1d2ce5789e493dcec5ad27fac6b84c321599a5239897f8e5e57a1ba"
  },
  "after": {
    "bytes": 76067,
    "sha256": "50850eabde6cedb35bef851b580f4bf4d8127ccc9f839bfc66090e44b1dd2a31"
  },
  "additions": [
    "  handoff-supabase-database-backup:\n    name: Hand off verified ordinary weather to database backup\n    needs: [terminal-outcome, current-main-target]\n    if: >-\n      !cancelled() && needs.terminal-outcome.result == 'success' &&\n      needs.current-main-target.result == 'success' &&\n      needs.current-main-target.outputs.completed_private_runtime == 'false' &&\n      github.repository == 'jakobjorgensen82-commits/RavRadar' &&\n      github.ref == 'refs/heads/main' && github.run_attempt == '1' &&\n      github.actor == 'github-actions[bot]' &&\n      vars.RAVRADAR_SUPABASE_BACKUP_AUTOMATION == 'weekly' &&\n      inputs.current_family_cold_start != true && inputs.completed_private_runtime != true &&\n      inputs.completed_stage_source == '' && inputs.quick_confirmation != true &&\n      inputs.quick_progress_source == '' && inputs.checkpoint_target_hour == '' &&\n      inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true &&\n      inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' &&\n      inputs.weather_state_epoch_raw_cache_key == '' && inputs.native_sampling_identity_original_recovery != true\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    continue-on-error: true\n    permissions:\n      actions: write\n    steps:\n      - name: Dispatch the existing database-backup workflow once\n        id: dispatch\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          test \"$GITHUB_REPOSITORY\" = jakobjorgensen82-commits/RavRadar\n          test \"$GITHUB_REF\" = refs/heads/main\n          test \"$GITHUB_RUN_ATTEMPT\" = 1\n          [[ \"$GITHUB_SHA\" =~ ^[a-f0-9]{40}$ ]]\n          [[ \"$GITHUB_RUN_ID\" =~ ^[1-9][0-9]*$ ]]\n          if ! ack=\"$(timeout --signal=KILL 20s gh api --method POST \\\n            -H \"Accept: application/vnd.github+json\" \\\n            -H \"X-GitHub-Api-Version: 2026-03-10\" \\\n            \"repos/$GITHUB_REPOSITORY/actions/workflows/backup-supabase-database.yml/dispatches\" \\\n            -f ref=main -f \"inputs[expected_main]=$GITHUB_SHA\" \\\n            -f \"inputs[source_weather_run_id]=$GITHUB_RUN_ID\" 2>/dev/null)\" ||\n            ! recipient=\"$(jq -er '.workflow_run_id | numbers | tostring | select(test(\"^[1-9][0-9]{0,14}$\"))' <<< \"$ack\" 2>/dev/null)\" ||\n            [[ \"$recipient\" = \"$GITHUB_RUN_ID\" ]]; then\n            echo '::warning::DATABASE_BACKUP_DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY'\n            exit 1\n          fi\n          echo \"recipient_run_id=$recipient\" >> \"$GITHUB_OUTPUT\"\n\n      # The recipient reads this exact successful step from this run attempt.\n      # A second dispatch with the same source cannot present its own run ID here.\n      - name: Bind database backup recipient ${{ steps.dispatch.outputs.recipient_run_id }}\n        run: ':'\n\n  handoff-admin-document-history:\n    name: Hand off verified ordinary weather to admin document history\n    needs: [terminal-outcome, current-main-target]\n    if: >-\n      !cancelled() && needs.terminal-outcome.result == 'success' &&\n      needs.current-main-target.result == 'success' &&\n      needs.current-main-target.outputs.completed_private_runtime == 'false' &&\n      github.repository == 'jakobjorgensen82-commits/RavRadar' &&\n      github.ref == 'refs/heads/main' && github.run_attempt == '1' &&\n      github.actor == 'github-actions[bot]' &&\n      vars.RAVRADAR_ADMIN_HISTORY_MAINTENANCE == 'enabled' &&\n      inputs.current_family_cold_start != true && inputs.completed_private_runtime != true &&\n      inputs.completed_stage_source == '' && inputs.quick_confirmation != true &&\n      inputs.quick_progress_source == '' && inputs.checkpoint_target_hour == '' &&\n      inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true &&\n      inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' &&\n      inputs.weather_state_epoch_raw_cache_key == '' && inputs.native_sampling_identity_original_recovery != true\n    runs-on: ubuntu-24.04\n    timeout-minutes: 2\n    continue-on-error: true\n    permissions:\n      actions: write\n    steps:\n      - name: Dispatch the existing document-history workflow once\n        id: dispatch\n        env:\n          GH_TOKEN: ${{ github.token }}\n        shell: bash\n        run: |\n          set -euo pipefail\n          test \"$GITHUB_REPOSITORY\" = jakobjorgensen82-commits/RavRadar\n          test \"$GITHUB_REF\" = refs/heads/main\n          test \"$GITHUB_RUN_ATTEMPT\" = 1\n          [[ \"$GITHUB_SHA\" =~ ^[a-f0-9]{40}$ ]]\n          [[ \"$GITHUB_RUN_ID\" =~ ^[1-9][0-9]*$ ]]\n          if ! ack=\"$(timeout --signal=KILL 20s gh api --method POST \\\n            -H \"Accept: application/vnd.github+json\" \\\n            -H \"X-GitHub-Api-Version: 2026-03-10\" \\\n            \"repos/$GITHUB_REPOSITORY/actions/workflows/maintain-admin-document-history.yml/dispatches\" \\\n            -f ref=main -f \"inputs[expected_main]=$GITHUB_SHA\" \\\n            -f \"inputs[source_weather_run_id]=$GITHUB_RUN_ID\" 2>/dev/null)\" ||\n            ! recipient=\"$(jq -er '.workflow_run_id | numbers | tostring | select(test(\"^[1-9][0-9]{0,14}$\"))' <<< \"$ack\" 2>/dev/null)\" ||\n            [[ \"$recipient\" = \"$GITHUB_RUN_ID\" ]]; then\n            echo '::warning::DOCUMENT_HISTORY_DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY'\n            exit 1\n          fi\n          echo \"recipient_run_id=$recipient\" >> \"$GITHUB_OUTPUT\"\n\n      # The recipient reads this exact successful step from this run attempt.\n      # A second dispatch with the same source cannot present its own run ID here.\n      - name: Bind document history recipient ${{ steps.dispatch.outputs.recipient_run_id }}\n        run: ':'\n\n"
  ]
});
export function inverseSource611MaintenanceWorkflow(source, relative) {
  const row = source611MaintenanceWorkflowReview;
  if (relative !== row.path || typeof source !== 'string'
      || Buffer.byteLength(source) !== row.after.bytes || sha(source) !== row.after.sha256) return source;
  let previous = source;
  for (const addition of [...row.additions].reverse()) {
    assert.equal(previous.split(addition).length, 2, 'SOURCE611_EXACT_MAINTENANCE_HANDOFF');
    previous = previous.replace(addition, '');
  }
  assert.equal(Buffer.byteLength(previous), row.before.bytes, 'SOURCE611_MAINTENANCE_PREDECESSOR_SIZE');
  assert.equal(sha(previous), row.before.sha256, 'SOURCE611_MAINTENANCE_PREDECESSOR_BYTES');
  return previous;
}
