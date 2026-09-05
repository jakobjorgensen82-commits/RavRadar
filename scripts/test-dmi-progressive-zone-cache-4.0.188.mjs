import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [buildWorkflow, oneoffWorkflow, builder] = await Promise.all([
  readProductionWorkflowSource('build'),
  fs.readFile('.github/workflows/validate-copernicus-current-pilot.yml', 'utf8'),
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
]);

const LEGACY_READY_CACHE_KEY = 'dmi-zone-cache-v1-Linux-2026-W36-33984291027-1';

function stepIndex(source, name) {
  const index = source.indexOf(`- name: ${name}`);
  assert.ok(index >= 0, `Workflowet mangler trinnet: ${name}`);
  return index;
}

function stepBlock(source, name) {
  const start = stepIndex(source, name);
  const next = source.indexOf('\n      - name:', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

const normalRestore = stepIndex(buildWorkflow, 'Restore last complete active DMI generation');
const normalLegacyBootstrap = stepIndex(buildWorkflow, 'Bootstrap the exact known READY legacy DMI generation');
const normalMaterialize = stepIndex(buildWorkflow, 'Strictly bind and materialize the active DMI generation');
const normalCandidateRestore = stepIndex(buildWorkflow, 'Restore isolated DMI candidate progress for normal maintenance');
const normalCandidateState = stepIndex(buildWorkflow, 'Inspect isolated DMI candidate progress for normal maintenance');
const normalUpdate = stepIndex(buildWorkflow, 'Update DMI bulk model cache');
const normalGribSave = stepIndex(buildWorkflow, 'Save progressed DMI GRIB download cache');
const normalCandidateSave = stepIndex(buildWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
const normalShadowSave = stepIndex(buildWorkflow, 'Save private seven-day current-field research cache');
const normalTerminal = stepIndex(buildWorkflow, 'Require successful DMI producer before current supplement');
const normalSnapshot = stepIndex(buildWorkflow, 'Strictly snapshot the maintained READY active DMI generation');
const normalActiveSave = stepIndex(buildWorkflow, 'Save the maintained complete active DMI generation');
const validate = stepIndex(buildWorkflow, 'Validate full project after fresh weather and current provenance');

assert.ok(
  normalRestore < normalLegacyBootstrap
    && normalLegacyBootstrap < normalMaterialize
    && normalMaterialize < normalCandidateRestore
    && normalCandidateRestore < normalCandidateState
    && normalCandidateState < normalUpdate
    && normalUpdate < normalGribSave
    && normalGribSave < normalCandidateSave
    && normalCandidateSave < normalShadowSave
    && normalShadowSave < normalTerminal
    && normalTerminal < normalSnapshot
    && normalSnapshot < normalActiveSave
    && normalActiveSave < validate,
  'Normal drift skal holde active og candidate isoleret, gemme partial progression og først erstatte active efter READY-promotion.',
);

const normalRestoreBlock = stepBlock(buildWorkflow, 'Restore last complete active DMI generation');
assert.match(normalRestoreBlock, /path: \.cache\/dmi-active-complete\.json/);
assert.match(normalRestoreBlock, /key: dmi-zone-active-v1-/);
assert.match(normalRestoreBlock, /restore-keys:[\s\S]*dmi-zone-active-v1-/);

const normalBootstrapBlock = stepBlock(buildWorkflow, 'Bootstrap the exact known READY legacy DMI generation');
assert.match(normalBootstrapBlock, /steps\.dmi-active-restore\.outputs\.cache-matched-key == ''/);
assert.match(normalBootstrapBlock, /path: data\/live\/dmi-bulk-cache\.json/);
assert.ok(
  normalBootstrapBlock.includes(`key: ${LEGACY_READY_CACHE_KEY}`),
  'Kun den eksakte kendte READY-legacygeneration må bootstrappe den aktive cache.',
);
assert.match(normalBootstrapBlock, /fail-on-cache-miss: true/);

const normalMaterializeBlock = stepBlock(buildWorkflow, 'Strictly bind and materialize the active DMI generation');
assert.match(normalMaterializeBlock, /\.diagnostics\.currentOperationalLedger\.ready/);
assert.match(normalMaterializeBlock, /test "\$\(jq -r '[^']*' "\$source_path"\)" = true/);
assert.match(normalMaterializeBlock, /build-copernicus-target-registry\.py/);
assert.match(normalMaterializeBlock, /cp "\$source_path" \.cache\/dmi-active-complete\.json\.tmp/);
assert.match(normalMaterializeBlock, /cp \.cache\/dmi-active-complete\.json data\/live\/dmi-bulk-cache\.json/);

const normalCandidateRestoreBlock = stepBlock(buildWorkflow, 'Restore isolated DMI candidate progress for normal maintenance');
assert.match(normalCandidateRestoreBlock, /path: \.cache\/dmi-candidate-progress\.json/);
assert.match(normalCandidateRestoreBlock, /key: dmi-zone-candidate-v1-.*-normal-/);
assert.match(normalCandidateRestoreBlock, /restore-keys:[\s\S]*dmi-zone-candidate-v1-/);
const normalCandidateStateBlock = stepBlock(buildWorkflow, 'Inspect isolated DMI candidate progress for normal maintenance');
assert.match(normalCandidateStateBlock, /\.cache\/dmi-candidate-progress\.json/);
assert.match(normalCandidateStateBlock, /\.diagnostics\.currentOperationalLedger\.ready == true/);
assert.match(normalCandidateStateBlock, /echo "retain_preferred=true"/);
assert.match(normalCandidateStateBlock, /echo "retain_preferred=false"/);

const normalUpdateBlock = stepBlock(buildWorkflow, 'Update DMI bulk model cache');
assert.match(normalUpdateBlock, /DMI_BULK_OUTPUT_PATH: \.cache\/dmi-candidate-progress\.json/);
assert.match(normalUpdateBlock, /DMI_BULK_PROMOTION_PATH: data\/live\/dmi-bulk-cache\.json/);
assert.match(normalUpdateBlock, /DMI_BULK_PREFER_OUTPUT_CACHE: true/);
assert.match(normalUpdateBlock, /DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: \$\{\{ steps\.dmi-candidate-state\.outputs\.retain_preferred \}\}/);
assert.match(
  normalUpdateBlock,
  /DMI_BULK_COLLECTIONS_PER_RUN: \$\{\{ steps\.operational-action\.outputs\.action == 'integrated-cutover' && steps\.legacy-bootstrap\.outputs\.required == 'true' && '6' \|\| '3' \}\}/,
  'Normal vedligeholdelse skal behandle tre collections; kun den særskilte cutovervej må bruge seks.',
);
assert.match(normalUpdateBlock, /DMI_BULK_DEPLOYED_FALLBACK_PATH: \.cache\/dmi-active-complete\.json/);

const normalCandidateSaveBlock = stepBlock(buildWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
assert.match(normalCandidateSaveBlock, /always\(\)/);
assert.match(normalCandidateSaveBlock, /steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.match(normalCandidateSaveBlock, /hashFiles\('\.cache\/dmi-candidate-progress\.json'\) != ''/);
assert.match(normalCandidateSaveBlock, /path: \.cache\/dmi-candidate-progress\.json/);
assert.match(normalCandidateSaveBlock, /key: dmi-zone-candidate-v1-.*-normal-/);
assert.ok(normalCandidateSave < normalTerminal, 'Partial normal kandidatprogression skal gemmes før terminalgaten.');

const normalSnapshotBlock = stepBlock(buildWorkflow, 'Strictly snapshot the maintained READY active DMI generation');
assert.match(normalSnapshotBlock, /steps\.dmi-terminal-gate\.outputs\.ready == 'true'/);
assert.match(normalSnapshotBlock, /steps\.dmi-bulk\.outputs\.candidate_promoted == 'true'/);
assert.match(normalSnapshotBlock, /\.diagnostics\.currentOperationalLedger\.ready/);
assert.match(normalSnapshotBlock, /build-copernicus-target-registry\.py/);
const normalActiveSaveBlock = stepBlock(buildWorkflow, 'Save the maintained complete active DMI generation');
assert.match(normalActiveSaveBlock, /steps\.dmi-terminal-gate\.outputs\.ready == 'true'/);
assert.match(normalActiveSaveBlock, /steps\.dmi-bulk\.outputs\.candidate_promoted == 'true'/);
assert.match(normalActiveSaveBlock, /hashFiles\('\.cache\/dmi-active-complete\.json'\) != ''/);
assert.match(normalActiveSaveBlock, /path: \.cache\/dmi-active-complete\.json/);
assert.match(normalActiveSaveBlock, /key: dmi-zone-active-v1-/);
assert.doesNotMatch(normalActiveSaveBlock, /always\(\)|steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.doesNotMatch(
  buildWorkflow.slice(normalUpdate, normalSnapshot),
  /key: dmi-zone-active-v1-/,
  'En partial normal kandidat må aldrig gemmes under den aktive cachefamilie.',
);
assert.doesNotMatch(buildWorkflow, /Save progressive private DMI zone cache/);

const oneoffActiveRestore = stepIndex(oneoffWorkflow, 'Restore last complete active DMI generation');
const oneoffLegacyBootstrap = stepIndex(oneoffWorkflow, 'Bootstrap the exact known READY legacy DMI generation');
const oneoffMaterialize = stepIndex(oneoffWorkflow, 'Strictly bind and materialize the active DMI generation');
const candidateRestore = stepIndex(oneoffWorkflow, 'Restore isolated DMI candidate progress');
const candidateState = stepIndex(oneoffWorkflow, 'Isolate restored candidate and restore active working copy');
const oneoffUpdate = stepIndex(oneoffWorkflow, 'Refresh all bounded official DMI collections for the proof');
const candidateSave = stepIndex(oneoffWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
const promotedSnapshot = stepIndex(oneoffWorkflow, 'Strictly snapshot only a promoted READY DMI generation');
const promotedActiveSave = stepIndex(oneoffWorkflow, 'Save the promoted complete active DMI generation');
const oneoffTerminal = stepIndex(oneoffWorkflow, '"Require DMI production (${{ steps.dmi-bulk.outputs.terminal_code }}; ${{ steps.dmi-bulk.outputs.collection_failure_codes }})"');

assert.ok(
  oneoffActiveRestore < oneoffLegacyBootstrap
    && oneoffLegacyBootstrap < oneoffMaterialize
    && oneoffMaterialize < candidateRestore
    && candidateRestore < candidateState
    && candidateState < oneoffUpdate
    && oneoffUpdate < candidateSave
    && candidateSave < promotedSnapshot
    && promotedSnapshot < promotedActiveSave
    && promotedActiveSave < oneoffTerminal,
  'Engangskørslen skal holde aktiv generation og kandidatprogression isoleret frem til en READY-promotion.',
);

const oneoffActiveRestoreBlock = stepBlock(oneoffWorkflow, 'Restore last complete active DMI generation');
assert.match(oneoffActiveRestoreBlock, /path: \.cache\/dmi-active-complete\.json/);
assert.match(oneoffActiveRestoreBlock, /key: dmi-zone-active-v1-/);
const oneoffBootstrapBlock = stepBlock(oneoffWorkflow, 'Bootstrap the exact known READY legacy DMI generation');
assert.ok(oneoffBootstrapBlock.includes(`key: ${LEGACY_READY_CACHE_KEY}`));
assert.match(oneoffBootstrapBlock, /fail-on-cache-miss: true/);

const candidateRestoreBlock = stepBlock(oneoffWorkflow, 'Restore isolated DMI candidate progress');
assert.match(candidateRestoreBlock, /path: \.cache\/dmi-candidate-progress\.json/);
assert.match(candidateRestoreBlock, /key: dmi-zone-candidate-v1-/);
assert.match(candidateRestoreBlock, /restore-keys:[\s\S]*dmi-zone-candidate-v1-/);
const candidateStateBlock = stepBlock(oneoffWorkflow, 'Isolate restored candidate and restore active working copy');
assert.match(candidateStateBlock, /cp \.cache\/dmi-active-complete\.json data\/live\/dmi-bulk-cache\.json/);
assert.match(candidateStateBlock, /\.cache\/dmi-candidate-progress\.json/);
assert.match(candidateStateBlock, /\.diagnostics\.currentOperationalLedger\.ready \/\/ false/);
assert.match(candidateStateBlock, /echo "retain_preferred=true"/);

const oneoffUpdateBlock = stepBlock(oneoffWorkflow, 'Refresh all bounded official DMI collections for the proof');
assert.match(oneoffUpdateBlock, /DMI_BULK_OUTPUT_PATH: \.cache\/dmi-candidate-progress\.json/);
assert.match(oneoffUpdateBlock, /DMI_BULK_PROMOTION_PATH: data\/live\/dmi-bulk-cache\.json/);
assert.match(oneoffUpdateBlock, /DMI_BULK_PREFER_OUTPUT_CACHE: true/);
assert.match(oneoffUpdateBlock, /DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: \$\{\{ steps\.dmi-candidate-state\.outputs\.retain_preferred \}\}/);
assert.match(oneoffUpdateBlock, /DMI_BULK_DEPLOYED_FALLBACK_PATH: \.cache\/dmi-active-complete\.json/);

const candidateSaveBlock = stepBlock(oneoffWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
assert.match(candidateSaveBlock, /always\(\)/);
assert.match(candidateSaveBlock, /steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.match(candidateSaveBlock, /hashFiles\('\.cache\/dmi-candidate-progress\.json'\) != ''/);
assert.match(candidateSaveBlock, /path: \.cache\/dmi-candidate-progress\.json/);
assert.match(candidateSaveBlock, /key: dmi-zone-candidate-v1-/);
assert.ok(candidateSave < oneoffTerminal, 'Partial kandidatprogression skal gemmes før oneoff-terminalgaten.');

const promotedSnapshotBlock = stepBlock(oneoffWorkflow, 'Strictly snapshot only a promoted READY DMI generation');
assert.match(promotedSnapshotBlock, /steps\.dmi-bulk\.outcome == 'success'/);
assert.match(promotedSnapshotBlock, /steps\.dmi-bulk\.outputs\.candidate_promoted == 'true'/);
assert.match(promotedSnapshotBlock, /\.diagnostics\.currentOperationalLedger\.ready/);
assert.match(promotedSnapshotBlock, /build-copernicus-target-registry\.py/);
const promotedActiveSaveBlock = stepBlock(oneoffWorkflow, 'Save the promoted complete active DMI generation');
assert.match(promotedActiveSaveBlock, /steps\.dmi-bulk\.outcome == 'success'/);
assert.match(promotedActiveSaveBlock, /steps\.dmi-bulk\.outputs\.candidate_promoted == 'true'/);
assert.match(promotedActiveSaveBlock, /path: \.cache\/dmi-active-complete\.json/);
assert.match(promotedActiveSaveBlock, /key: dmi-zone-active-v1-/);
assert.doesNotMatch(promotedActiveSaveBlock, /always\(\)|outcome != 'cancelled'/);
assert.doesNotMatch(
  oneoffWorkflow.slice(oneoffUpdate, promotedSnapshot),
  /key: dmi-zone-active-v1-/,
  'En partial oneoff-kandidat må aldrig gemmes under den aktive cachefamilie.',
);

for (const workflow of [buildWorkflow, oneoffWorkflow]) {
  assert.doesNotMatch(
    workflow,
    /DMI_BULK_PRIVATE_REPLAY_RETENTION_HOURS/,
    'Workflows må ikke nedskrive eller på anden måde tilsidesætte producentens private replayretention.',
  );
}
assert.doesNotMatch(buildWorkflow.slice(normalRestore, validate), /upload-pages-artifact|deploy-pages/);
assert.doesNotMatch(oneoffWorkflow, /upload-pages-artifact|deploy-pages/);

assert.match(builder, /def cache_quality\(/);
assert.match(builder, /def cache_progress_time\(/);
assert.match(builder, /def sampling_registry_signature\(/);
assert.match(builder, /def load_previous\([\s\S]*?expected_signature: str,/);
assert.match(builder, /document\.get\("zoneRegistrySignature"\) == expected_signature/);
assert.match(builder, /document\.get\("checkpointedAt"\)/);
assert.match(builder, /if PREFER_OUTPUT_CACHE and output_document in compatible/);
assert.match(builder, /else max\([\s\S]*?cache_progress_time\(document\), cache_quality\(document\)/);
assert.match(builder, /"sourceKey": source\.get\("sourceKey"\)/);
assert.match(builder, /"point": source\.get\("point"\)/);
assert.doesNotMatch(builder, /WATER_SOURCES_PATH\.read_bytes/);
assert.doesNotMatch(builder, /ZONES_PATH\.read_bytes/);

const fullValidation = buildWorkflow.slice(validate);
assert.match(fullValidation, /npm run validate/);
assert.match(fullValidation, /npm run release:gate/);

console.log('OK: normal drift og oneoff gemmer partial kandidat isoleret og promoverer kun READY til active.');
