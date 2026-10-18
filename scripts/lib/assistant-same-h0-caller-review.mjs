// Test-only exact source-command inverse; no runtime source or authority override.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function inverseAssistantSameH0LegacySourceScripts(scripts){
  assert.equal(sha(scripts),"252555034c16775daafdf0010577d46d7dad59c75fa3fac22f926c91a6119f6e",'Exact actual SAME_H0 source command inventory');
  const inverse={...scripts,"test:ravscore-source-critical":"node scripts/build-ravscore-model-bundle.mjs --check && node scripts/check-account-assistant-issued-source.mjs && node scripts/check-native-identity-frozen-i71-source.mjs && node scripts/run-frozen-current-memory-warmup-source-targets.mjs builder && node scripts/build-established-native-current-origin-successor.mjs --check && node --test scripts/test-model-source-imports.mjs scripts/test-established-native-current-origin-successor.mjs scripts/test-established-native-current-origin-postgres-source.mjs scripts/test-code-only-public-coastal-registry-stage.mjs && node scripts/test-established-native-current-origin-followers.mjs && node scripts/sync-ravscore-model-binding.mjs --check && npm run test:native-identity-successor && npm run test:current-memory-warmup && npm run test:weather-state-epoch && node scripts/test-ravscore-integrated-model.mjs && node scripts/test-ravscore-integrated-state-pipeline.mjs && node --test scripts/test-ravscore-integrated-generator.mjs scripts/test-ravscore-recovery-replay.mjs scripts/test-score-prognosis-plain-copy.mjs scripts/test-ravscore-initial-current-window-audit.mjs scripts/test-saved-current-window-scratch.mjs && node scripts/test-ravscore-public-runtime-contract.mjs && node scripts/test-ravscore-public-data-service-binding.mjs && node scripts/test-missing-weather-null-safety-4.0.116.mjs"};
  assert.equal(sha(inverse),"a4ca00dcdba9863d49c5aa1df869f665a0402baa77db88d0cb6a609b385c2ff7",'WHOLE historical command inventory survives');return inverse;
}
const workflowEdits=[
  {
    "before": "upgrade_established_native_current_origin",
    "after": "upgrade_assistant_same_h0",
    "all": true
  },
  {
    "before": "UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN",
    "after": "UPGRADE_ASSISTANT_SAME_H0",
    "all": true
  },
  {
    "before": "RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN",
    "after": "RAVRADAR_ASSISTANT_SAME_H0",
    "all": true
  },
  {
    "before": "established-native-current-origin-prewrite.mjs",
    "after": "assistant-same-h0-prewrite.mjs",
    "all": true
  },
  {
    "before": "verify-established-native-current-origin-plan.mjs",
    "after": "verify-assistant-same-h0-plan.mjs",
    "all": true
  },
  {
    "before": "established-native-current-origin-checkpoint-publish",
    "after": "assistant-same-h0-checkpoint-publish",
    "all": true
  },
  {
    "before": "code-only-established-native-current-origin-final",
    "after": "code-only-assistant-same-h0-final",
    "all": true
  },
  {
    "before": "      upgrade_assistant_same_h0:\n        description: \"Installer kun den originalbevarende fortsættelse efter faktisk installeret0200 og autentisk B/S\"",
    "after": "      upgrade_established_native_current_origin:\n        description: \"Historisk140000-grant; må ikke genbruges i en senere kilde\"\n        required: false\n        default: false\n        type: boolean\n      upgrade_assistant_same_h0:\n        description: \"Installer kun SAME_H0 metadata-successor efter faktisk140000 og autentisk uændret B/S\""
  },
  {
    "before": "          UPGRADE_ASSISTANT_SAME_H0: ${{ inputs.upgrade_assistant_same_h0 }}",
    "after": "          UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN: ${{ inputs.upgrade_established_native_current_origin }}\n          UPGRADE_ASSISTANT_SAME_H0: ${{ inputs.upgrade_assistant_same_h0 }}"
  },
  {
    "before": "          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          if test \"$UPGRADE_EXISTING_OWNER_EXPORT\"",
    "after": "          test \"$GITHUB_REF\" = \"refs/heads/main\"\n          test \"$UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN\" != \"true\"\n          if test \"$UPGRADE_EXISTING_OWNER_EXPORT\""
  },
  {
    "before": "      RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN: ${{ inputs.upgrade_assistant_same_h0 == true && 'true' || 'false' }}",
    "after": "      RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN: ${{ inputs.upgrade_established_native_current_origin == true && 'true' || 'false' }}\n      RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN: ${{ inputs.upgrade_assistant_same_h0 == true && 'true' || 'false' }}"
  },
  {
    "before": "Select only an already-installed established-origin successor before private work",
    "after": "Select only an already-installed SAME_H0 successor before private work"
  },
  {
    "before": "Select only the exact authenticated0200 origin metadata bridge",
    "after": "Select only the exact authenticated140000 SAME_H0 metadata bridge"
  },
  {
    "before": "Stage the exact saved public coastal registry before seed metadata",
    "after": "Stage the exact saved public coastal registry before SAME_H0 metadata"
  },
  {
    "before": "Verify actual already-installed contracts before seed metadata reentry",
    "after": "Verify actual already-installed contracts before SAME_H0 metadata reentry"
  },
  {
    "before": "Prepare exact authenticated seed metadata and private origin",
    "after": "Prepare exact authenticated SAME_H0 metadata and private origin"
  },
  {
    "before": "Authenticate original0200 B/S and compare every prepared successor byte before new binding",
    "after": "Authenticate original140000 B/S and compare every prepared SAME_H0 byte before new binding"
  },
  {
    "before": "Select the sole pending current-memory warmup successor after actual original and no-loss proof",
    "after": "Select the sole pending SAME_H0 successor after actual original and no-loss proof"
  },
  {
    "before": "      - name: Deploy exact rebound trip Edges without Worker or D1 replay",
    "after": "      - name: Update and attest the existing SELF_REPORTED Worker before new Edges\n        if: env.RAVRADAR_ASSISTANT_SAME_H0_EDGE_REQUIRED == 'true'\n        timeout-minutes: 15\n        shell: bash\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}\n          RAVRADAR_ASSISTANT_SAME_H0_MIGRATION_VIEW: ${{ steps.migration-view.outputs.workdir }}\n          SUPABASE_PROJECT_ID: afqhhdrkjfjtpadntdzo\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}\n          TRIP_GATEWAY_SHARED_SECRET: ${{ secrets.TRIP_GATEWAY_SHARED_SECRET }}\n          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}\n          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n          CLOUDFLARE_TRIP_GATEWAY_URL: ${{ secrets.CLOUDFLARE_TRIP_GATEWAY_URL }}\n        run: node scripts/update-assistant-same-h0-trip-worker.mjs\n\n      - name: Deploy exact rebound trip Edges after the required Worker update"
  }
];
export function inverseAssistantSameH0CodeOnlyWorkflow(source){
  const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
  assert.equal(hash(source),"db504aec4910b2c221280f211ad1762bac2f98cfd374234e38c0918a3142e34a","Whole current normal workflow only");
  let inverse=source;for(const edit of [...workflowEdits].reverse()){assert(inverse.includes(edit.after));
    inverse=edit.all?inverse.replaceAll(edit.after,edit.before):inverse.replace(edit.after,()=>edit.before);}
  assert.equal(hash(inverse),"a5052ae64638aaf4df28523f8a8c401e13803707ea0d46e0bb371f012f33352b","WHOLE historical workflow survives");return inverse;
}

// Exact808 post-H0 command union around the untouched582/140000 oracles.
export function inverseAssistantSameH0SourceScripts(scripts){
  if(sha(scripts)==="252555034c16775daafdf0010577d46d7dad59c75fa3fac22f926c91a6119f6e")return inverseAssistantSameH0LegacySourceScripts(scripts);
  assert.equal(sha(scripts),"1f2b284d59c55539a94c5b6d3c95dfffce8d8e3d1e8178839c36231fa882f28c",'Exact after658 SAME_H0 plus post-H0 command inventory');
  const input={...scripts,'test:ravscore-source-critical':scripts['test:ravscore-source-critical'].replace(" scripts/test-post-h0-dmi-original-dependencies.mjs scripts/test-saved-current-forward-original-plan.mjs",'')};
  assert.equal(sha(input),"252555034c16775daafdf0010577d46d7dad59c75fa3fac22f926c91a6119f6e",'Whole frozen582 command input survives');
  const old=inverseAssistantSameH0LegacySourceScripts(input);
  const current={...old,'test:ravscore-source-critical':old['test:ravscore-source-critical'].replace("scripts/test-saved-current-window-scratch.mjs","scripts/test-saved-current-window-scratch.mjs scripts/test-post-h0-dmi-original-dependencies.mjs scripts/test-saved-current-forward-original-plan.mjs")};
  assert.equal(sha(current),"75dc014e97c61b07238834938198f571408f227c894fb1494e0dd54427ebf79d",'Whole808 historical command inventory survives');
  return current;
}
