// TEST ONLY. Exact whole SOURCE ordinary callers -> genuine b2 callers.
// Not a source-compatibility waiver, runtime loader, publication or SAVE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(new URL('./source-normal-workflow-review.json', import.meta.url));
assert.equal(sha(bytes), '15f0d6090091c2b26289a2626eb240d9c10e76bf0360fb01d240c30712911d84');
const review = JSON.parse(bytes);
assert.equal(review.schemaVersion, 1);
assert.equal(review.kind, 'TEST_ONLY_EXACT_SOURCE_NORMAL_WORKFLOW_INVERSE');
assert.equal(review.productionAuthority, false);
assert.equal(review.predecessorHead, 'b2d4ba68c6e560c6e1f2335ea8ace604a6315da3');
assert.equal(review.predecessorTree, 'd911b0ee27084194cba8bde59ff9540d8b164543');
assert.deepEqual(Object.keys(review.roles), ['build', 'once']);
for (const [role, row] of Object.entries(review.roles)) {
  assert.equal(row.edits.length, role === 'build' ? 152 : 4);
  assert.equal(row.mode, '100644');
  row.edits.forEach(Object.freeze); Object.freeze(row.edits); Object.freeze(row);
}
Object.freeze(review.roles); Object.freeze(review);

// TEST ONLY: exact actual c920 merge and prior SOURCE User-Agent layers.
// No profile repin or runtime admission; the original reviewed JSON stays intact.
export const SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW = {
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_SOURCE_MAIN_IMPORT_INVERSE",
  "productionAuthority": false,
  "currentCodeHead": "a166d7267863808ab31e316c15143001d01db78c",
  "currentTree": "d0886183f6c36828d762efacdcd7635a68bc3da6",
  "actualMerge": {
    "head": "bda05535b91fc25fd878198d8f73dd99ad20e9d4",
    "parents": [
      "24d8f8ee75bb91d2c75afa92e5ccc407cb7c230f",
      "c920d1e2ad0cbbfe351360f594128f0e06bd1f1e"
    ],
    "main": "c920d1e2ad0cbbfe351360f594128f0e06bd1f1e"
  },
  "historicalReviewedHead": "6c8c06cb8b422cc187196fbbe26bd3c0249f316d",
  "historicalReviewedTree": "3b12ae68115e668821879ca74964c095c3f76c19",
  "roles": {
    "build": {
      "relativePath": ".github/workflows/reusable-weather-build.yml",
      "layers": [
        {
          "kind": "ACTUAL_C920_MAIN_MERGE",
          "beforeCodeHead": "24d8f8ee75bb91d2c75afa92e5ccc407cb7c230f",
          "afterCodeHead": "bda05535b91fc25fd878198d8f73dd99ad20e9d4",
          "before": {
            "bytes": 330691,
            "sha256": "0b9d0ba70e83a295c42110976463fcd0ae00d7ab63b6973d16f2bd4912b79e56"
          },
          "after": {
            "bytes": 340359,
            "sha256": "188a04a9c579394c293402634c23ee87fff7eee008165549f634826b2510f28a"
          },
          "editCount": 37,
          "edits": [
            {
              "sourceEdit": 37,
              "offset": 218936,
              "current": "            git fetch --no-tags origin \"$legacy_source_head\"\n",
              "original": "            git fetch --no-tags --depth=1 origin \"$legacy_source_head\"\n",
              "currentSha256": "325e1a627b170f9b33a38a9d63309b8f1566297701a5af157a075b60552b6b21",
              "originalSha256": "6a7dc2c473b7600aea4fef54cbb667b480ed4b1fe49ddedab207ecc528e62092",
              "beforeSha256": "188a04a9c579394c293402634c23ee87fff7eee008165549f634826b2510f28a",
              "afterSha256": "60b071f4c28880433af983d1b4910a57905c969cb708125ea5a41e3caddeb55b"
            },
            {
              "sourceEdit": 36,
              "offset": 206975,
              "current": "          path: |\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json\n            .geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json\n",
              "original": "          path: .geometry-v2-work/ravscore-integrated-public-runtime-audit.json\n",
              "currentSha256": "37f87acf6260e1bc17c726927253545fe371b618405b56e8b64583cbf42f2484",
              "originalSha256": "6a868812e94c0904ac39185d54e90863ee71e2e616719cb916c861b5d137fdb4",
              "beforeSha256": "60b071f4c28880433af983d1b4910a57905c969cb708125ea5a41e3caddeb55b",
              "afterSha256": "204b3764d96659316b728201f2bf950699ff4b3d1f9a79bad796cf7081389b6d"
            },
            {
              "sourceEdit": 35,
              "offset": 206027,
              "current": "        if: always() && ((inputs.source_normal_producer == false && steps.preflight.outputs.should_run == 'true' && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json') != '') || (inputs.source_normal_producer == true && (steps.source-normal.outputs.source_result_kind == 'PREPARED_WEATHER' || steps.source-normal.outputs.source_operational_control_report == 'observed') && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.failure.json', '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json.execution.json') != ''))\n",
              "original": "        if: always() && ((inputs.source_normal_producer == false && (always() && steps.preflight.outputs.should_run == 'true' && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json') != '')) || (inputs.source_normal_producer == true && (steps.source-normal.outputs.source_result_kind == 'PREPARED_WEATHER' || steps.source-normal.outputs.source_operational_control_report == 'observed') && hashFiles('.geometry-v2-work/ravscore-integrated-public-runtime-audit.json') != ''))\n",
              "currentSha256": "65eb60596601493edd2b8110fe748f9f3b4617cf36524aceb60f21d7ae620f6b",
              "originalSha256": "2d34fbde0fc3856a9495c5cc84109eaf71f2691f0f747cc5fbf33ebf684eb314",
              "beforeSha256": "204b3764d96659316b728201f2bf950699ff4b3d1f9a79bad796cf7081389b6d",
              "afterSha256": "5bd549cbff1d3c5527d38d05e465c39c60fb7d6c08eb982a349752953d534aba"
            },
            {
              "sourceEdit": 34,
              "offset": 204458,
              "current": "              if test -f \"$audit_path\"; then\n                echo \"::warning title=RavScore runtime audit::The audit found one or more model/state issues. The issues are retained in the payload-free audit report; valid weather publication continues.\"\n              else\n                echo \"::warning title=RavScore runtime audit process::The audit process stopped before its required report was written (exit $runtime_audit_exit_status). Fixed failure/execution observations are uploaded separately; the required-report publication gates remain unchanged.\"\n              fi\n",
              "original": "              echo \"::warning title=RavScore runtime audit::The audit found one or more model/state issues. The issues are retained in the payload-free audit report; valid weather publication continues.\"\n",
              "currentSha256": "3da80f806587cbe3722527e9ea59da4a5f4dda8d737290c5ee76e9154504036d",
              "originalSha256": "75827455c90266ef1752e762cb7373e8e9152ee606b13879d8ceeb69f465df24",
              "beforeSha256": "5bd549cbff1d3c5527d38d05e465c39c60fb7d6c08eb982a349752953d534aba",
              "afterSha256": "f894fce78078e6ad6b7bdbb1495cd19003d857e7db9f806440814efb0744f3e9"
            },
            {
              "sourceEdit": 33,
              "offset": 203868,
              "current": "              || runtime_audit_exit_status=$?\n            node scripts/observe-runtime-audit-execution.mjs --phase after \\\n              --exit-code \"$runtime_audit_exit_status\" || true\n            runtime_audit_outcome=\"success\"\n            if test \"$runtime_audit_exit_status\" != 0; then\n              runtime_audit_outcome=\"failure\"\n            fi\n            echo \"runtime_audit_exit_status=$runtime_audit_exit_status\" >> \"$GITHUB_OUTPUT\"\n",
              "original": "              || runtime_audit_outcome=\"failure\"\n",
              "currentSha256": "0d58056a82e8cc7779a17726741bdef8896417df32e83ce0a0f400a8152b236b",
              "originalSha256": "e1f53750dbbda7478ed29878b47a9ae00d41218366aaf4d28fac2bb0c63fc7fe",
              "beforeSha256": "f894fce78078e6ad6b7bdbb1495cd19003d857e7db9f806440814efb0744f3e9",
              "afterSha256": "a4f6ea1c4df1195c09f393fbfca6d0c77a5d4bf3f32ded586564586d26d6b188"
            },
            {
              "sourceEdit": 32,
              "offset": 203421,
              "current": "            # Both small observers use the same node executable/configuration as\n            # the audit; observer failure cannot replace its actual exit status.\n            node scripts/observe-runtime-audit-execution.mjs --phase before || true\n            runtime_audit_exit_status=0\n",
              "original": "            runtime_audit_outcome=\"success\"\n",
              "currentSha256": "e13fa4473b994b86d31a4f57993948a9a135975c8f968b2bc85445533cf38b8d",
              "originalSha256": "968b63f981adbd4b6123c09e6c940587cb51fdf73331ac98a584135b4d2de96a",
              "beforeSha256": "a4f6ea1c4df1195c09f393fbfca6d0c77a5d4bf3f32ded586564586d26d6b188",
              "afterSha256": "c527bf63367a8dc32f20880921051d3b32bec6ef645f262535c03458b99f7a0a"
            },
            {
              "sourceEdit": 31,
              "offset": 191234,
              "current": "          # The ordinary scalar reserve must be able to reach all 673 PARTs.\n          # The runtime separately caps actual HTTP starts, including retries,\n          # and paces them; a longer deadline does not grant unlimited calls.\n          RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: ${{ inputs.quick_confirmation && '60000' || '600000' }}\n",
              "original": "          RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: ${{ inputs.quick_confirmation && '60000' || '90000' }}\n",
              "currentSha256": "cfe533d6e9008cd76cb57adf66c32f4bb97c5b9e9aed8535a7cf48fefc9f47c2",
              "originalSha256": "c7d7df1c60e18558c5f102fc1973c113f2c7c515487efef6e8bdc244eab4fbd7",
              "beforeSha256": "c527bf63367a8dc32f20880921051d3b32bec6ef645f262535c03458b99f7a0a",
              "afterSha256": "e3d3a1a5ed2b2ba1fb99d92322802bd22a25ce608f9c0cde65714cae5d3b1cce"
            },
            {
              "sourceEdit": 30,
              "offset": 186207,
              "current": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && ((inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true) && steps.preflight.outputs.should_run == 'true'))\n        env:\n          QUICK_PROGRESS_SOURCE: ${{ inputs.current_family_cold_start != true && inputs.quick_progress_source || '' }}\n          CHECKPOINT_TARGET_HOUR: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_only && inputs.production_target_hour || '' }}\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && (inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true'))\n",
              "currentSha256": "75c08c83e9f749805239297760c995133495a719b20aa29e8bbefa3c5c7f929e",
              "originalSha256": "db671607771cd68cfb9c39bf3766cd1a9f3895b4ddd4c60b5cb9809c339b71b2",
              "beforeSha256": "e3d3a1a5ed2b2ba1fb99d92322802bd22a25ce608f9c0cde65714cae5d3b1cce",
              "afterSha256": "ac37ffbaf7b545dda18603a4ab5838a20ce65f328bead4a3843904ab42d6f1f2"
            },
            {
              "sourceEdit": 29,
              "offset": 180094,
              "current": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && ((inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true) && steps.preflight.outputs.should_run == 'true'))\n        env:\n          QUICK_PROGRESS_SOURCE: ${{ inputs.current_family_cold_start != true && inputs.quick_progress_source || '' }}\n          CHECKPOINT_TARGET_HOUR: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_only && inputs.production_target_hour || '' }}\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && (inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true'))\n",
              "currentSha256": "75c08c83e9f749805239297760c995133495a719b20aa29e8bbefa3c5c7f929e",
              "originalSha256": "db671607771cd68cfb9c39bf3766cd1a9f3895b4ddd4c60b5cb9809c339b71b2",
              "beforeSha256": "ac37ffbaf7b545dda18603a4ab5838a20ce65f328bead4a3843904ab42d6f1f2",
              "afterSha256": "36bed0c174db7da1e0370168e9bead7039ed0916ae26050d0481c7d434946041"
            },
            {
              "sourceEdit": 28,
              "offset": 177341,
              "current": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && ((inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true) && steps.preflight.outputs.should_run == 'true'))\n        env:\n          QUICK_PROGRESS_SOURCE: ${{ inputs.current_family_cold_start != true && inputs.quick_progress_source || '' }}\n          CHECKPOINT_TARGET_HOUR: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_only && inputs.production_target_hour || '' }}\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && (inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true'))\n",
              "currentSha256": "75c08c83e9f749805239297760c995133495a719b20aa29e8bbefa3c5c7f929e",
              "originalSha256": "db671607771cd68cfb9c39bf3766cd1a9f3895b4ddd4c60b5cb9809c339b71b2",
              "beforeSha256": "36bed0c174db7da1e0370168e9bead7039ed0916ae26050d0481c7d434946041",
              "afterSha256": "5b80e3808b7c28d2aa78782d9b3a2613cc2c6b87dfdf225bfb4feef14956263f"
            },
            {
              "sourceEdit": 27,
              "offset": 173343,
              "current": "          if test \"${{ inputs.current_family_cold_start }}\" = true && test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n            test \"$resolved_target\" = \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n            test \"$resolved_target\" = 2026-10-23T01:00:00Z\n          fi\n",
              "original": "",
              "currentSha256": "391208d64dad9f7d2499fda3d431a286a50df03ee37663f3e3ca061af49487a7",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "5b80e3808b7c28d2aa78782d9b3a2613cc2c6b87dfdf225bfb4feef14956263f",
              "afterSha256": "a4e5dc1f4344a9a241c74cd46d90d4caf9d02cfe505683f6fc76ad38a2b9a6c7"
            },
            {
              "sourceEdit": 26,
              "offset": 155646,
              "current": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && ((inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true) && steps.preflight.outputs.should_run == 'true'))\n        env:\n          QUICK_PROGRESS_SOURCE: ${{ inputs.current_family_cold_start != true && inputs.quick_progress_source || '' }}\n          CHECKPOINT_TARGET_HOUR: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_only && inputs.production_target_hour || '' }}\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && (inputs.weather_state_epoch_bootstrap == true && steps.preflight.outputs.should_run == 'true'))\n",
              "currentSha256": "75c08c83e9f749805239297760c995133495a719b20aa29e8bbefa3c5c7f929e",
              "originalSha256": "db671607771cd68cfb9c39bf3766cd1a9f3895b4ddd4c60b5cb9809c339b71b2",
              "beforeSha256": "a4e5dc1f4344a9a241c74cd46d90d4caf9d02cfe505683f6fc76ad38a2b9a6c7",
              "afterSha256": "d92ed4489fac800a995b018e4cc9c4e894ef3c4396d5dc305288736816b33388"
            },
            {
              "sourceEdit": 25,
              "offset": 152408,
              "current": "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
              "original": "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || inputs.current_family_cold_start) && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
              "currentSha256": "0749d5b587d2c9ce2e3fa3c6abd31ad9225bdc76278a58063cb3a004f8709c84",
              "originalSha256": "65a78255171d0f13e0de1ac9c5d0e9f30808bee54f9b760e5eaf0e992c5fbef8",
              "beforeSha256": "d92ed4489fac800a995b018e4cc9c4e894ef3c4396d5dc305288736816b33388",
              "afterSha256": "fb7cbe69c248757ec6c9a767c3657b3521de4ef13faaa3db06ed7a096708f7f6"
            },
            {
              "sourceEdit": 24,
              "offset": 151843,
              "current": "          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n",
              "original": "",
              "currentSha256": "0925038f3c7c9776962f681cd03c039f4191422ef5f593b6347657ac74f874dc",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "fb7cbe69c248757ec6c9a767c3657b3521de4ef13faaa3db06ed7a096708f7f6",
              "afterSha256": "c75164b1a0d5a93f24b3966123d7998d55bfbd92a46664c1abaffc190d7e397f"
            },
            {
              "sourceEdit": 23,
              "offset": 150242,
              "current": "        run: |\n          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            export NODE_OPTIONS=--max-old-space-size=6144\n          fi\n          node scripts/plan-ravscore-current-history.mjs --retain-committed-raw ${{ steps.dmi-part-continuity-donor.outputs.continuity_schema == '1' && steps.private-runtime-install.outcome == 'success' && steps.operational-model.outputs.model == 'integrated' && steps.operational-model.outputs.binding_current == 'true' && steps.operational-action.outputs.action == 'integrated' && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && inputs.completed_private_runtime != true && inputs.completed_private_runtime_pin == '' && inputs.completed_stage_source == '' && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.quick_progress_source == '' && inputs.current_family_cold_start != true && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.weather_state_epoch_raw_cache_key == '' && inputs.weather_state_epoch_archive_key == '' && inputs.weather_state_epoch_archive_catalog_sha256 == '' && inputs.native_sampling_identity_original_recovery != true && inputs.ravscore_integrated_weather_handoff_run_id == '' && inputs.produce_weather_handoff != true && inputs.ravscore_integrated_first_cutover != true && inputs.ravscore_integrated_return != true && (inputs.ravscore_candidate_g_rollback_mode == '' || inputs.ravscore_candidate_g_rollback_mode == 'none') && '--prepare-cached-native-originals' || '' }}\n",
              "original": "        run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw\n",
              "currentSha256": "acc4f0c508d18472ed69400085e6dd57ffe3cea3b77c0e2076c0e9c8a5299b96",
              "originalSha256": "60b5d69511aaecb27660fc1cda9eca837b492294fed5d218e176127d146ccb91",
              "beforeSha256": "c75164b1a0d5a93f24b3966123d7998d55bfbd92a46664c1abaffc190d7e397f",
              "afterSha256": "899033618554e3c37fff28380198def74ff21f97d8760a0bce41278e5e3cbc61"
            },
            {
              "sourceEdit": 22,
              "offset": 145697,
              "current": "            if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n              node scripts/run-current-family-cold-start.mjs reopen\n            else\n              node scripts/run-current-family-cold-start.mjs prepare\n            fi\n",
              "original": "            node scripts/run-current-family-cold-start.mjs prepare\n",
              "currentSha256": "8ebafc7ae7dfdd759b25fb23baa67928e718c87655497c0778cb45b949aed271",
              "originalSha256": "4c84d41f925336f81ae38a0b6d8d5c5c23e0cda96b86033493008b1ff0b1fc38",
              "beforeSha256": "899033618554e3c37fff28380198def74ff21f97d8760a0bce41278e5e3cbc61",
              "afterSha256": "84e64f0b3905c89fdd2a7b5ae279b38b025c06c86701f79e3ad80c8e5465ce12"
            },
            {
              "sourceEdit": 21,
              "offset": 145168,
              "current": "          WEATHER_PROGRESS_MASTER_SECRET: ${{ inputs.current_family_cold_start && inputs.quick_progress_source != '' && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n          PROGRESS_CACHE_MATCHED_KEY: ${{ steps.component-progress-cache.outputs.cache-matched-key }}\n          PROGRESS_CACHE_OUTCOME: ${{ steps.component-progress-cache.outcome }}\n",
              "original": "",
              "currentSha256": "b6c67e48e627fa47f2e04f9f4ca35ddeecfdb8afcfdf58a14dc31bf157f67889",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "84e64f0b3905c89fdd2a7b5ae279b38b025c06c86701f79e3ad80c8e5465ce12",
              "afterSha256": "c848af4be5d1eaee5c0d8bafd944dca94be5a6fab80723b927ffb99d9df28f0d"
            },
            {
              "sourceEdit": 20,
              "offset": 114292,
              "current": "        if: inputs.source_normal_producer == false && (inputs.current_family_cold_start != true && inputs.completed_private_runtime != true && (inputs.quick_confirmation == true || inputs.quick_progress_source != ''))\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.completed_private_runtime != true && (inputs.quick_confirmation == true || inputs.quick_progress_source != ''))\n",
              "currentSha256": "c768db89b2f2aabe4071c888fe466190831059a9bd01b2414132cfc459982677",
              "originalSha256": "824bd5792b0ae08d534373725ff9676d8bfca507013828df7ebd29eaa3d53ed2",
              "beforeSha256": "c848af4be5d1eaee5c0d8bafd944dca94be5a6fab80723b927ffb99d9df28f0d",
              "afterSha256": "5e802b529508cf15bb05fa1616d49273fa269c5c1ddd3af08133dc18032b9522"
            },
            {
              "sourceEdit": 19,
              "offset": 107155,
              "current": "        if: inputs.source_normal_producer == false && ((inputs.current_family_cold_start != true || inputs.quick_progress_source == '39886354260-1' || inputs.quick_progress_source == '39933506923-1') && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current')))\n",
              "original": "        if: inputs.source_normal_producer == false && (inputs.current_family_cold_start != true && inputs.completed_private_runtime != true && (inputs.native_sampling_identity_original_recovery != true && (inputs.weather_state_epoch_bootstrap != true || inputs.weather_state_epoch_checkpoint_reentry == true) && github.ref == 'refs/heads/main' && github.event_name != 'pull_request' && github.event_name != 'pull_request_target' && steps.private-runtime-install.outcome == 'success' && steps.weather-source-handoff.outputs.reused != 'true' && !(inputs.quick_confirmation && inputs.quick_progress_source == 'protected-current')))\n",
              "currentSha256": "b46b81c89b3de47a654c1a2e78fbde6a06bcc47670addf07898ad4fae96dc3ff",
              "originalSha256": "e7f439584d053feb39349d0d3e788daf78bd61aa1274544178e844deb1b0a8ac",
              "beforeSha256": "5e802b529508cf15bb05fa1616d49273fa269c5c1ddd3af08133dc18032b9522",
              "afterSha256": "e5b54f134ef8b905517da0ef14654e1a231f01cd127ebfd339f9efe5bf968723"
            },
            {
              "sourceEdit": 18,
              "offset": 96120,
              "current": "          // Schema is an ordinary work selector only; never an original-proof/PASS marker.\n          const continuitySchema = store.continuity?.metadata.schemaVersion;\n          if (store.hasPartContinuity && continuitySchema !== 1 && continuitySchema !== 2) {\n            throw new Error('Unknown DMI PART continuity schema');\n          }\n          fs.appendFileSync(process.env.GITHUB_OUTPUT, `continuity_schema=${continuitySchema ?? ''}\\n`);\n",
              "original": "",
              "currentSha256": "37448c56917698b1628ffba00af18f6cdbc0a61d9322531d9d932088c908aa09",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "e5b54f134ef8b905517da0ef14654e1a231f01cd127ebfd339f9efe5bf968723",
              "afterSha256": "74f0c8cf873387092f6477cf1c9c7801d3aa023f3bff4d9e1cf8d7eb5f8ec92d"
            },
            {
              "sourceEdit": 17,
              "offset": 92293,
              "current": "            exit 0\n          fi\n          if test \"${{ steps.assistant-later-h0-source.outputs.required }}\" = true; then\n            test \"${{ steps.assistant-later-h0-prepare.outcome }}\" = success\n            NODE_OPTIONS=--max-old-space-size=6144 node scripts/assistant-later-h0-runtime-transition.mjs install\n",
              "original": "",
              "currentSha256": "97ff36643b0561dfa976f6ab502aea5ab721bfe939e787edfb47cb2d891f1308",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "74f0c8cf873387092f6477cf1c9c7801d3aa023f3bff4d9e1cf8d7eb5f8ec92d",
              "afterSha256": "777ce396470c559eaa046dd555fd0d3d333f7834401fa963bb5f7fea495e5169"
            },
            {
              "sourceEdit": 16,
              "offset": 90878,
              "current": "          SUPABASE_URL: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ (inputs.weather_state_epoch_bootstrap || steps.assistant-later-h0-source.outputs.required == 'true') && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
              "original": "          SUPABASE_URL: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_URL || '' }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ inputs.weather_state_epoch_bootstrap && secrets.SUPABASE_SERVICE_ROLE_KEY || '' }}\n",
              "currentSha256": "76b4b3fa02ca6b0117fdcae68e3066a4a7dfd2aeecabbc38ac478e303f45404e",
              "originalSha256": "29f414b92813ebad681e2ea03843c7de13f83fd1959cef5ea3b07e6b4d3eb5a8",
              "beforeSha256": "777ce396470c559eaa046dd555fd0d3d333f7834401fa963bb5f7fea495e5169",
              "afterSha256": "efb2089fe5e762135f451b08d297c31930e92c3e3991e9b18b7dc72d62a4a2fb"
            },
            {
              "sourceEdit": 15,
              "offset": 90427,
              "current": "          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n",
              "original": "",
              "currentSha256": "0925038f3c7c9776962f681cd03c039f4191422ef5f593b6347657ac74f874dc",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "efb2089fe5e762135f451b08d297c31930e92c3e3991e9b18b7dc72d62a4a2fb",
              "afterSha256": "124a253d3f3eb898a045876482e466752bd6217617ddae428fb8c750f0585740"
            },
            {
              "sourceEdit": 14,
              "offset": 79097,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true')\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.private-runtime-state.outputs.available == 'true')\n",
              "currentSha256": "be817ad4eab39215053ea35799dcf0f3e541694ebdef6a3dbc76a57fcde31534",
              "originalSha256": "453ffd01853b9345b45138ddc2e01e77408dd142b686747a1cbc13f979f53360",
              "beforeSha256": "124a253d3f3eb898a045876482e466752bd6217617ddae428fb8c750f0585740",
              "afterSha256": "ff12f3a05a4f299556b59686b9ec0d16ac3cf9f9b686cfb99d0fc87932715fe6"
            },
            {
              "sourceEdit": 13,
              "offset": 68600,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "currentSha256": "532b23c12cc091bfa8d0acd74c8695347fc4c16ef3c1f1ef893183345aa3ffa9",
              "originalSha256": "b4566bde58da625f2c8c244f09fd8da7704277e40016cee98ebf6f58fbdf0429",
              "beforeSha256": "ff12f3a05a4f299556b59686b9ec0d16ac3cf9f9b686cfb99d0fc87932715fe6",
              "afterSha256": "90167684495b75e6c9a275e671bdf53bd39876e71bc904bf749f6a83ca9e3c6f"
            },
            {
              "sourceEdit": 12,
              "offset": 64141,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original')\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == '' && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original')\n",
              "currentSha256": "6ba76721a6eb14d0467ae6f93f5e39283185e85e0bff71ff480e932489393dd7",
              "originalSha256": "ee335a2bb5712724e37ab74a6070f650f41655856045eab95cb7f47bd7bbfeec",
              "beforeSha256": "90167684495b75e6c9a275e671bdf53bd39876e71bc904bf749f6a83ca9e3c6f",
              "afterSha256": "391eb2591a1abc67db8a119adf9ca74696a52ef5c6c5a781183876f8e2056eb2"
            },
            {
              "sourceEdit": 11,
              "offset": 63024,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original')\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.paired-checkpoint-route.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && steps.exact-weather-recovery.outputs.required != 'true' && steps.historical-wave-predecessor.outputs.transition_kind != 'owner-current-domain-original' && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true') && steps.historical-wave-predecessor.outputs.transition_kind != 'current-grid-sampling-original')\n",
              "currentSha256": "8ab799172effd9edd7707630181b57c049e509714e68f7e2060d6391a1801f0f",
              "originalSha256": "95e9e0d4f4aa404b1f86b9c5f24ecec5ef27f86fe68b31b864f704022f66495c",
              "beforeSha256": "391eb2591a1abc67db8a119adf9ca74696a52ef5c6c5a781183876f8e2056eb2",
              "afterSha256": "7191090c21de9337631f9b3f4a9d4615e3fc26f123237354edb1d9f757cd8239"
            },
            {
              "sourceEdit": 10,
              "offset": 61910,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated')\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && inputs.weather_state_epoch_checkpoint_reentry != true && inputs.native_sampling_identity_original_recovery != true && inputs.checkpoint_only != true && inputs.quick_confirmation != true && inputs.completed_private_runtime != true && steps.operational-action.outputs.action == 'integrated')\n",
              "currentSha256": "b4672cb5c66e2864addb228cbd65c03d81b0a85125b8aa192d82bf16b04a8231",
              "originalSha256": "9dd32e3cedcbfa961d9bb6033a030eda4edaec40e69e313064be4d258f29b804",
              "beforeSha256": "7191090c21de9337631f9b3f4a9d4615e3fc26f123237354edb1d9f757cd8239",
              "afterSha256": "7135acfd0742c0eb7b9097aaa112113ca31e782f0e3f9a8f3271ec9e71bdeb9b"
            },
            {
              "sourceEdit": 9,
              "offset": 60681,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.preflight.outputs.should_run == 'true' && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "currentSha256": "4bf1d2886e38c8d79b643c798acbcaf041f87ca794ff8e5ce26d04ef83c32b76",
              "originalSha256": "b82fa533fe15c8a2e12a834bb851e659e631caf4dd08ea6d6a7c6cd3c1448d7c",
              "beforeSha256": "7135acfd0742c0eb7b9097aaa112113ca31e782f0e3f9a8f3271ec9e71bdeb9b",
              "afterSha256": "10f6b21bd06551db93a34c85988f66aa57c6a3c6afe98a2c62e2cd9905da12e5"
            },
            {
              "sourceEdit": 8,
              "offset": 57923,
              "current": "        if: inputs.source_normal_producer == false && (steps.assistant-later-h0-source.outputs.required != 'true' && steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "original": "        if: inputs.source_normal_producer == false && (steps.preflight.outputs.should_run == 'true' && inputs.native_sampling_identity_original_recovery != true && inputs.weather_state_epoch_bootstrap != true && !(steps.operational-action.outputs.action == 'integrated-cutover' && steps.operational-model.outputs.legacy_source_required == 'true'))\n",
              "currentSha256": "532b23c12cc091bfa8d0acd74c8695347fc4c16ef3c1f1ef893183345aa3ffa9",
              "originalSha256": "b4566bde58da625f2c8c244f09fd8da7704277e40016cee98ebf6f58fbdf0429",
              "beforeSha256": "10f6b21bd06551db93a34c85988f66aa57c6a3c6afe98a2c62e2cd9905da12e5",
              "afterSha256": "2f7410867b0a15abd665d0e2af997f6b65d5c598fb8d8ed1bf8274bfd49db97e"
            },
            {
              "sourceEdit": 7,
              "offset": 56152,
              "current": "      # Separate authentic586 -> later ordinary H0. Not a code-only install,\n      # SAME_H0 event, parent rewrite or generic historical fallback.\n      - name: Select only authentic586 for the normal assistant successor\n        id: assistant-later-h0-source\n        if: inputs.weather_state_epoch_bootstrap != true && inputs.current_family_cold_start != true && inputs.native_sampling_identity_original_recovery != true && steps.preflight.outputs.should_run == 'true' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance')\n        env:\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n        run: node scripts/assistant-later-h0-runtime-transition.mjs select\n\n      - name: Prepare the whole original-preserving586 working view\n        id: assistant-later-h0-prepare\n        if: steps.assistant-later-h0-source.outputs.required == 'true'\n        shell: bash\n        env:\n          NODE_OPTIONS: --max-old-space-size=6144\n          OPERATIONAL_ACTION: ${{ steps.operational-action.outputs.action }}\n          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}\n          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}\n          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}\n          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}\n          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}\n        run: |\n          set -euo pipefail\n          mkdir -p \"$RAVRADAR_PRIVATE_RUNTIME_ROOT\"\n          node scripts/assistant-later-h0-runtime-transition.mjs prepare\n\n",
              "original": "",
              "currentSha256": "f4982ad5d61577d8abf5aa2a156de874f46195db990ea6829da71392319efa5d",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "2f7410867b0a15abd665d0e2af997f6b65d5c598fb8d8ed1bf8274bfd49db97e",
              "afterSha256": "29d91f231920192ae1ff3ce45f02635eb36161ac226b02f30cc3c76f23357e12"
            },
            {
              "sourceEdit": 6,
              "offset": 44612,
              "current": "        run: |\n          set -euo pipefail\n          source_readiness_args=()\n          if test \"${{ inputs.source_normal_producer }}\" = true; then\n            source_readiness_args+=(--source-producer)\n          fi\n          node scripts/integrated-cutover-readiness.mjs verify-db \"${source_readiness_args[@]}\"\n",
              "original": "        run: node scripts/integrated-cutover-readiness.mjs verify-db\n",
              "currentSha256": "4d7aa0855cdeef3b7f9db5b0966f5e0c7df00a18a69572ac2613bb92dc368754",
              "originalSha256": "6a7966f2b7e524dd10f6d68cd40d35f1553ab109267b22632e99a903e184c579",
              "beforeSha256": "29d91f231920192ae1ff3ce45f02635eb36161ac226b02f30cc3c76f23357e12",
              "afterSha256": "2d68bf0c98b9756d8661a6c3c0ae99a86974a1a561796ab0127b20ee820a7364"
            },
            {
              "sourceEdit": 5,
              "offset": 40149,
              "current": "              git fetch --no-tags origin \"$original_head\"\n",
              "original": "              git fetch --no-tags --depth=1 origin \"$original_head\"\n",
              "currentSha256": "cb58913ba0e0b2598caaa6fd6d7d9142ffd788f5628fd4bf3e696e635a2b9526",
              "originalSha256": "bdec1adafeb9fceac319eda6002ce36e1f47ff3e4b5801dbd6ce3f6897c50d89",
              "beforeSha256": "2d68bf0c98b9756d8661a6c3c0ae99a86974a1a561796ab0127b20ee820a7364",
              "afterSha256": "9397a2da5d02685e26f5d4df4f272e400fd2ed4ed9620c33b2c0828e92484195"
            },
            {
              "sourceEdit": 4,
              "offset": 39549,
              "current": "          if ! git cat-file -e \"${legacy_source_head}^{commit}\" 2>/dev/null; then\n            git fetch --no-tags origin \"$legacy_source_head\"\n            test \"$(git rev-parse FETCH_HEAD^{commit})\" = \"$legacy_source_head\"\n          fi\n          test \"$(git rev-parse \"${legacy_source_head}^{commit}\")\" = \"$legacy_source_head\"\n",
              "original": "          git fetch --no-tags --depth=1 origin \"$legacy_source_head\"\n          test \"$(git rev-parse FETCH_HEAD^{commit})\" = \"$legacy_source_head\"\n",
              "currentSha256": "59687ec999e97d6408283cc4ebe43cf6a7979152b4502cc9807a1ad49e2a2cdd",
              "originalSha256": "5af3f3522a2efe3534936e1e19a3b9bb44387ac46a6c60385cb2a4d57828c6cf",
              "beforeSha256": "9397a2da5d02685e26f5d4df4f272e400fd2ed4ed9620c33b2c0828e92484195",
              "afterSha256": "6678656ff567cb32d29c6df6303c9c509a6f33821bb30f034e095ebf2e4bc329"
            },
            {
              "sourceEdit": 3,
              "offset": 19874,
              "current": "          if test -n \"$QUICK_PROGRESS_SOURCE\"; then\n            test \"$QUICK_PROGRESS_SOURCE\" = 39886354260-1 || test \"$QUICK_PROGRESS_SOURCE\" = 39933506923-1\n            test \"$RAVRADAR_PRODUCTION_TARGET_HOUR\" = 2026-10-23T01:00:00Z\n            test \"$CHECKPOINT_TARGET_HOUR\" = \"$RAVRADAR_PRODUCTION_TARGET_HOUR\"\n          else\n            test -z \"$CHECKPOINT_TARGET_HOUR\"\n          fi\n",
              "original": "          test -z \"${{ inputs.quick_progress_source }}\"\n",
              "currentSha256": "4af9abb4298a0c62f9b7fa1bea65fe9dcaed87cdd38c181fff411c2e23a82203",
              "originalSha256": "0acdbacb925657f888e1172ffc6c44a981043cf582708bfa255659f5dfe3cbc0",
              "beforeSha256": "6678656ff567cb32d29c6df6303c9c509a6f33821bb30f034e095ebf2e4bc329",
              "afterSha256": "19dcf2471f51735657dff26c3e91afb6e41b317928f896f4e81f097d5b60f6db"
            },
            {
              "sourceEdit": 2,
              "offset": 15112,
              "current": "        if: inputs.weather_state_epoch_bootstrap == true || inputs.current_family_cold_start == true\n",
              "original": "        if: inputs.weather_state_epoch_bootstrap == true\n",
              "currentSha256": "6e679753126f7a996efe15e9cc850d05b9e430d00a92547ae338d051f44c9e76",
              "originalSha256": "b8f960ab85fc7441d4995019535405ecc95ce88fbef20de9249874a438fefc6a",
              "beforeSha256": "19dcf2471f51735657dff26c3e91afb6e41b317928f896f4e81f097d5b60f6db",
              "afterSha256": "7a1e6cee3a69e04e641cad73bc0e2e9df319f575892dd3e463004cfa476a41ec"
            },
            {
              "sourceEdit": 1,
              "offset": 10728,
              "current": "      CHECKPOINT_TARGET_HOUR: ${{ (inputs.checkpoint_only || (inputs.current_family_cold_start && inputs.quick_progress_source != '')) && inputs.production_target_hour || '' }}\n",
              "original": "      CHECKPOINT_TARGET_HOUR: ${{ inputs.checkpoint_only && inputs.production_target_hour || '' }}\n",
              "currentSha256": "232e9f81a986d7b3a6cc4d700a7ef586414f44de67c6391ddf49b1c365eb43c7",
              "originalSha256": "6807f92e337f5dacab68a86b5a576205da880c85fb3e3e3fbe46f5a900f91ca5",
              "beforeSha256": "7a1e6cee3a69e04e641cad73bc0e2e9df319f575892dd3e463004cfa476a41ec",
              "afterSha256": "0b9d0ba70e83a295c42110976463fcd0ae00d7ab63b6973d16f2bd4912b79e56"
            }
          ]
        },
        {
          "kind": "FIVE_SOURCE_595_USER_AGENTS_FROM_586",
          "beforeCodeHead": "6c8c06cb8b422cc187196fbbe26bd3c0249f316d",
          "afterCodeHead": "24d8f8ee75bb91d2c75afa92e5ccc407cb7c230f",
          "before": {
            "bytes": 330691,
            "sha256": "5954abde862ea588094b400fc6d60c9113d8dfd22b362ca41310c4ddf1a6ef58"
          },
          "after": {
            "bytes": 330691,
            "sha256": "0b9d0ba70e83a295c42110976463fcd0ae00d7ab63b6973d16f2bd4912b79e56"
          },
          "editCount": 5,
          "edits": [
            {
              "sourceEdit": 5,
              "offset": 183597,
              "current": "          WEATHER_USER_AGENT: \"RavRadar/4.0.595 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "original": "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "currentSha256": "139fcfe0caf8486275e04cecee85b78262690c7ce764bcf6199defc5f052a840",
              "originalSha256": "77064c6252d67b32fb4a8bbc5cf7eac362bd8c324a92bcf9cbdcca35a21815b6",
              "beforeSha256": "0b9d0ba70e83a295c42110976463fcd0ae00d7ab63b6973d16f2bd4912b79e56",
              "afterSha256": "e71e9a2619124df66491e0c16bfa5177ebb8a2627f572e560f584cdf6e2cc820"
            },
            {
              "sourceEdit": 4,
              "offset": 156414,
              "current": "          WEATHER_USER_AGENT: \"RavRadar/4.0.595 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "original": "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "currentSha256": "139fcfe0caf8486275e04cecee85b78262690c7ce764bcf6199defc5f052a840",
              "originalSha256": "77064c6252d67b32fb4a8bbc5cf7eac362bd8c324a92bcf9cbdcca35a21815b6",
              "beforeSha256": "e71e9a2619124df66491e0c16bfa5177ebb8a2627f572e560f584cdf6e2cc820",
              "afterSha256": "103af6f6c089b340f8bea5f91b5a8dab99dba5aca93939934861dd9a449c866f"
            },
            {
              "sourceEdit": 3,
              "offset": 129792,
              "current": "          WEATHER_USER_AGENT: \"RavRadar/4.0.595 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "original": "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "currentSha256": "139fcfe0caf8486275e04cecee85b78262690c7ce764bcf6199defc5f052a840",
              "originalSha256": "77064c6252d67b32fb4a8bbc5cf7eac362bd8c324a92bcf9cbdcca35a21815b6",
              "beforeSha256": "103af6f6c089b340f8bea5f91b5a8dab99dba5aca93939934861dd9a449c866f",
              "afterSha256": "a2b113327dfcc5085c2e032e4ad4c7e23b7fb9855ab6e3af73ff2fdfb5ad2f2f"
            },
            {
              "sourceEdit": 2,
              "offset": 128147,
              "current": "          WEATHER_USER_AGENT: \"RavRadar/4.0.595 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "original": "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "currentSha256": "139fcfe0caf8486275e04cecee85b78262690c7ce764bcf6199defc5f052a840",
              "originalSha256": "77064c6252d67b32fb4a8bbc5cf7eac362bd8c324a92bcf9cbdcca35a21815b6",
              "beforeSha256": "a2b113327dfcc5085c2e032e4ad4c7e23b7fb9855ab6e3af73ff2fdfb5ad2f2f",
              "afterSha256": "66ae68ba0cb0cd6c90d343aa9c542f3b6f2815d180c5dcb950433efcb20ad362"
            },
            {
              "sourceEdit": 1,
              "offset": 34904,
              "current": "          WEATHER_USER_AGENT: \"RavRadar/4.0.595 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "original": "          WEATHER_USER_AGENT: \"RavRadar/4.0.586 (${{ github.server_url }}/${{ github.repository }})\"\n",
              "currentSha256": "139fcfe0caf8486275e04cecee85b78262690c7ce764bcf6199defc5f052a840",
              "originalSha256": "77064c6252d67b32fb4a8bbc5cf7eac362bd8c324a92bcf9cbdcca35a21815b6",
              "beforeSha256": "66ae68ba0cb0cd6c90d343aa9c542f3b6f2815d180c5dcb950433efcb20ad362",
              "afterSha256": "5954abde862ea588094b400fc6d60c9113d8dfd22b362ca41310c4ddf1a6ef58"
            }
          ]
        }
      ]
    },
    "once": {
      "relativePath": ".github/workflows/run-current-weather-once.yml",
      "layers": [
        {
          "kind": "ACTUAL_C920_MAIN_MERGE",
          "beforeCodeHead": "24d8f8ee75bb91d2c75afa92e5ccc407cb7c230f",
          "afterCodeHead": "bda05535b91fc25fd878198d8f73dd99ad20e9d4",
          "before": {
            "bytes": 56686,
            "sha256": "a8b8300beaa5045fe86edb513fb4dcc759609cd029bb57a29ed942b976800560"
          },
          "after": {
            "bytes": 56957,
            "sha256": "03ce461ad76d2f4ff445fdcf04eafda1a982d5d6de5b359f85137d671ee941f4"
          },
          "editCount": 4,
          "edits": [
            {
              "sourceEdit": 4,
              "offset": 49299,
              "current": "      checkpoint_only: ${{ inputs.current_family_cold_start != true && inputs.checkpoint_target_hour != '' && inputs.completed_stage_source == '' }}\n",
              "original": "      checkpoint_only: ${{ inputs.checkpoint_target_hour != '' && inputs.completed_stage_source == '' }}\n",
              "currentSha256": "4e45b5ffeec9cacb81753e0ae2dbcdd834a6858fa8da47426ecf62439ac6ad1d",
              "originalSha256": "807776ce3dde204639ae27df6f5c424de3eaaacbfacd29fc293c62d97788fc45",
              "beforeSha256": "03ce461ad76d2f4ff445fdcf04eafda1a982d5d6de5b359f85137d671ee941f4",
              "afterSha256": "f174e88e6e93e43cc40107406d4d9dcc0f179b9a261bd8f4ea1b8b1e5cb377ed"
            },
            {
              "sourceEdit": 3,
              "offset": 7361,
              "current": "          if test -z \"$PROGRESS\"; then\n            test -z \"$TARGET\"\n          else\n            test \"$PROGRESS\" = 39886354260-1 || test \"$PROGRESS\" = 39933506923-1\n            test \"$TARGET\" = 2026-10-23T01:00:00Z\n          fi\n",
              "original": "          test -z \"$PROGRESS\"\n          test -z \"$TARGET\"\n",
              "currentSha256": "7d2e9803dcb69d2de2119c6e04abf54bf8b3547c0472a730eb0968b15f2288c2",
              "originalSha256": "348e78bbe84ae1c0a823444cbbf9d4d34bf93fcbcf1a62f02b0e91ae7ed94ad0",
              "beforeSha256": "f174e88e6e93e43cc40107406d4d9dcc0f179b9a261bd8f4ea1b8b1e5cb377ed",
              "afterSha256": "36c8aca999c8f815e19c4e7c878aeaa41e6bbfb64b9fef855e1f7a3dd054771f"
            },
            {
              "sourceEdit": 2,
              "offset": 5422,
              "current": "      pull-requests: read\n",
              "original": "",
              "currentSha256": "239aa4c5fb8c4560c57f431e4de87c25fcef91df9536a59ad765f4a9e1245055",
              "originalSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "beforeSha256": "36c8aca999c8f815e19c4e7c878aeaa41e6bbfb64b9fef855e1f7a3dd054771f",
              "afterSha256": "66a4f1cac8c9aa3a64e5d677b02ec613d54ebe84c915dfb62bed2542b62d1a62"
            },
            {
              "sourceEdit": 1,
              "offset": 317,
              "current": "        description: 'Archive authenticated current-family B/S for a fresh cold start, or reopen only fixed 39886354260-1 or 39933506923-1 progress without another reset'\n",
              "original": "        description: 'Archive authenticated current-family B/S and measure a new cold start without changing model/SQL; fresh one-off only'\n",
              "currentSha256": "da1d3ed5e7dbe2b7cf1c71230403c995acbaed0db82dc2ecb44460fc935c5feb",
              "originalSha256": "30c5dbc27e41fdc2251f96ffe9b4799f3901ddcba45b2c21eb98d139e2478385",
              "beforeSha256": "66a4f1cac8c9aa3a64e5d677b02ec613d54ebe84c915dfb62bed2542b62d1a62",
              "afterSha256": "a8b8300beaa5045fe86edb513fb4dcc759609cd029bb57a29ed942b976800560"
            }
          ]
        }
      ]
    }
  }
};
for (const row of Object.values(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.roles)) {
  for (const layer of row.layers) {
    layer.edits.forEach(Object.freeze); Object.freeze(layer.edits);
    Object.freeze(layer.before); Object.freeze(layer.after); Object.freeze(layer);
  }
  Object.freeze(row.layers); Object.freeze(row);
}
Object.freeze(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.roles);
Object.freeze(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.actualMerge.parents);
Object.freeze(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.actualMerge);
Object.freeze(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW);
export function inverseSourceNormalMainImportWorkflow(source, role) {
  assert.equal(arguments.length, 2, 'SOURCE_MAIN_IMPORT_INVERSE_ARGUMENTS');
  assert.equal(typeof source, 'string', 'SOURCE_MAIN_IMPORT_INVERSE_TYPE');
  const row = Object.hasOwn(SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.roles, role)
    ? SOURCE_NORMAL_MAIN_IMPORT_WORKFLOW_REVIEW.roles[role] : null;
  if (!row || sha(source) !== row.layers[0].after.sha256) return source;
  let prior = source;
  for (const layer of row.layers) {
    assert.equal(Buffer.byteLength(prior), layer.after.bytes, 'SOURCE_MAIN_IMPORT_WHOLE_AFTER_BYTES');
    assert.equal(sha(prior), layer.after.sha256, 'SOURCE_MAIN_IMPORT_WHOLE_AFTER_SHA');
    let editNumber = layer.editCount + 1, last = Infinity;
    for (const edit of layer.edits) {
      assert.equal(edit.sourceEdit, --editNumber, 'SOURCE_MAIN_IMPORT_EDIT_NUMBER');
      assert(Number.isSafeInteger(edit.offset) && edit.offset >= 0 && edit.offset < last, 'SOURCE_MAIN_IMPORT_EDIT_OFFSET');
      last = edit.offset;
      assert.equal(sha(edit.current), edit.currentSha256, 'SOURCE_MAIN_IMPORT_CURRENT_SEGMENT_SHA');
      assert.equal(sha(edit.original), edit.originalSha256, 'SOURCE_MAIN_IMPORT_ORIGINAL_SEGMENT_SHA');
      assert.equal(sha(prior), edit.beforeSha256, 'SOURCE_MAIN_IMPORT_WHOLE_INTERMEDIATE');
      assert.equal(prior.slice(edit.offset, edit.offset + edit.current.length), edit.current, 'SOURCE_MAIN_IMPORT_EXACT_SEGMENT');
      prior = prior.slice(0, edit.offset) + edit.original + prior.slice(edit.offset + edit.current.length);
      assert.equal(sha(prior), edit.afterSha256, 'SOURCE_MAIN_IMPORT_WHOLE_SUCCESSOR');
    }
    assert.equal(editNumber, 1, 'SOURCE_MAIN_IMPORT_ALL_EDITS');
    assert.equal(Buffer.byteLength(prior), layer.before.bytes, 'SOURCE_MAIN_IMPORT_WHOLE_BEFORE_BYTES');
    assert.equal(sha(prior), layer.before.sha256, 'SOURCE_MAIN_IMPORT_WHOLE_BEFORE_SHA');
  }
  assert.equal(sha(prior), review.roles[role].actualSha256, 'SOURCE_MAIN_IMPORT_GENUINE_OLD_ORACLE');
  return prior;
}
export const SOURCE_NORMAL_WORKFLOW_REVIEW = review;
export function inverseSourceNormalWorkflow(source, role) {
  assert.equal(arguments.length, 2);
  assert.equal(typeof source, 'string');
  assert(Object.hasOwn(review.roles, role), 'Only the reviewed build/once roles');
  source = inverseSourceNormalMainImportWorkflow(source, role);
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
  assert.equal(sha(prior), row.predecessorSha256, 'Whole genuine b2 caller, including its release585 strings');
  return prior;
}
