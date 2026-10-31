// Test-only exact inverse. Every byte of the historical workflow oracle is
// retained; new-route behavior is tested separately against the actual files.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
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
export function inverseTerminalRepair4145Workflow(source, role) {
  assert.equal(arguments.length, 2, 'TERMINAL4145_INVERSE_ARGUMENTS');
  assert.equal(typeof source, 'string', 'TERMINAL4145_INVERSE_TYPE');
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
  source = inverseTerminalRepair4145Workflow(source, role);
  assert.equal(arguments.length, 2, 'FULL_GIT_PINNED_WORKFLOW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'FULL_GIT_PINNED_WORKFLOW_TYPE');
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
export function inverseRelease585WorkflowUserAgents(source, role) {
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
export function inverseCompletedRuntimeWorkflow(source, role) {
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
