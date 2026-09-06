import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [buildWorkflow, oneoffWorkflow, builder] = await Promise.all([
  readProductionWorkflowSource('build'),
  fs.readFile('.github/workflows/validate-copernicus-current-pilot.yml', 'utf8'),
  fs.readFile('scripts/update-dmi-bulk.py', 'utf8'),
]);

assert.match(buildWorkflow, /permissions:\r?\n  contents: read\r?\n  actions: read/);
assert.match(
  buildWorkflow,
  /build-and-prepare:[\s\S]*?permissions:\r?\n      contents: read\r?\n      actions: read/,
);
assert.match(oneoffWorkflow, /permissions:\r?\n  contents: read\r?\n  actions: read/);

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
const normalNodeSetup = stepIndex(buildWorkflow, 'Set up Node.js');
const normalLegacyResolve = stepIndex(buildWorkflow, 'Resolve newest terminal-proven exact-main legacy DMI generation');
const normalLegacyBootstrap = stepIndex(buildWorkflow, 'Bootstrap the terminal-proven exact legacy DMI generation');
const normalMaterialize = stepIndex(buildWorkflow, 'Strictly bind and materialize the active DMI generation');
const normalCandidateRestore = stepIndex(buildWorkflow, 'Restore isolated DMI candidate progress for normal maintenance');
const normalCandidateState = stepIndex(buildWorkflow, 'Inspect isolated DMI candidate progress for normal maintenance');
const normalUpdate = stepIndex(buildWorkflow, 'Update DMI bulk model cache');
const normalGribSave = stepIndex(buildWorkflow, 'Save progressed DMI GRIB download cache');
const normalCandidateSave = stepIndex(buildWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
const normalShadowSave = stepIndex(buildWorkflow, 'Save private seven-day current-field research cache');
const normalTerminal = stepIndex(buildWorkflow, 'Classify DMI readiness before current supplement');
const normalSnapshot = stepIndex(buildWorkflow, 'Strictly snapshot the maintained READY active DMI generation');
const normalActiveSave = stepIndex(buildWorkflow, 'Save the maintained complete active DMI generation');
const validate = stepIndex(buildWorkflow, 'Validate full project after fresh weather and current provenance');

assert.ok(
  normalNodeSetup < normalLegacyResolve
    && normalRestore < normalLegacyBootstrap
    && normalRestore < normalLegacyResolve
    && normalLegacyResolve < normalLegacyBootstrap
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

const normalResolverBlock = stepBlock(buildWorkflow, 'Resolve newest terminal-proven exact-main legacy DMI generation');
assert.match(normalResolverBlock, /id: dmi-active-legacy-key/);
assert.match(normalResolverBlock, /node scripts\/resolve-terminal-dmi-cache\.mjs/);
assert.match(normalResolverBlock, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
const normalBootstrapBlock = stepBlock(buildWorkflow, 'Bootstrap the terminal-proven exact legacy DMI generation');
assert.match(normalBootstrapBlock, /steps\.dmi-active-restore\.outputs\.cache-matched-key == ''/);
assert.match(normalBootstrapBlock, /steps\.dmi-active-legacy-key\.outputs\.available == 'true'/);
assert.match(normalBootstrapBlock, /path: data\/live\/dmi-bulk-cache\.json/);
assert.match(normalBootstrapBlock, /key: \$\{\{ steps\.dmi-active-legacy-key\.outputs\.key \}\}/);
assert.match(normalBootstrapBlock, /fail-on-cache-miss: true/);
assert.doesNotMatch(normalBootstrapBlock, /restore-keys:/);

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

const normalGribSaveBlock = stepBlock(buildWorkflow, 'Save progressed DMI GRIB download cache');
assert.match(normalGribSaveBlock, /always\(\)/);
assert.match(normalGribSaveBlock, /steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.match(normalGribSaveBlock, /steps\.dmi-bulk\.outcome != 'skipped'/);

const normalCandidateSaveBlock = stepBlock(buildWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
assert.match(normalCandidateSaveBlock, /always\(\)/);
assert.match(normalCandidateSaveBlock, /steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.match(normalCandidateSaveBlock, /steps\.dmi-bulk\.outcome != 'skipped'/);
assert.match(normalCandidateSaveBlock, /hashFiles\('\.cache\/dmi-candidate-progress\.json'\) != ''/);
assert.match(normalCandidateSaveBlock, /path: \.cache\/dmi-candidate-progress\.json/);
assert.match(normalCandidateSaveBlock, /key: dmi-zone-candidate-v1-.*-normal-/);
assert.ok(normalCandidateSave < normalTerminal, 'Partial normal kandidatprogression skal gemmes før terminalgaten.');

const normalShadowSaveBlock = stepBlock(buildWorkflow, 'Save private seven-day current-field research cache');
assert.match(normalShadowSaveBlock, /always\(\)/);
assert.match(normalShadowSaveBlock, /steps\.dmi-bulk\.outcome != 'cancelled'/);
assert.match(normalShadowSaveBlock, /steps\.dmi-bulk\.outcome != 'skipped'/);

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
const oneoffLegacyResolve = stepIndex(oneoffWorkflow, 'Resolve newest terminal-proven exact-main legacy DMI generation');
const oneoffLegacyBootstrap = stepIndex(oneoffWorkflow, 'Bootstrap the terminal-proven exact legacy DMI generation');
const oneoffMaterialize = stepIndex(oneoffWorkflow, 'Strictly bind and materialize the active DMI generation');
const candidateRestore = stepIndex(oneoffWorkflow, 'Restore isolated DMI candidate progress');
const candidateState = stepIndex(oneoffWorkflow, 'Isolate restored candidate and restore active working copy');
const oneoffUpdate = stepIndex(oneoffWorkflow, 'Refresh all bounded official DMI collections for the proof');
const candidateSave = stepIndex(oneoffWorkflow, 'Save isolated DMI candidate progress before any terminal decision');
const promotedSnapshot = stepIndex(oneoffWorkflow, 'Strictly snapshot only a promoted READY DMI generation');
const promotedActiveSave = stepIndex(oneoffWorkflow, 'Save the promoted complete active DMI generation');
const oneoffTerminal = stepIndex(oneoffWorkflow, '"Classify DMI availability (${{ steps.dmi-bulk.outputs.terminal_code }}; ${{ steps.dmi-bulk.outputs.collection_failure_codes }})"');
const oneoffNodeSetup = oneoffWorkflow.lastIndexOf('- name: Set up Node.js', oneoffLegacyResolve);

assert.ok(
  oneoffNodeSetup >= 0
    && oneoffNodeSetup < oneoffLegacyResolve
    && oneoffActiveRestore < oneoffLegacyResolve
    && oneoffLegacyResolve < oneoffLegacyBootstrap
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
const oneoffResolverBlock = stepBlock(oneoffWorkflow, 'Resolve newest terminal-proven exact-main legacy DMI generation');
assert.match(oneoffResolverBlock, /id: dmi-active-legacy-key/);
assert.match(oneoffResolverBlock, /node scripts\/resolve-terminal-dmi-cache\.mjs/);
assert.match(oneoffResolverBlock, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
const oneoffBootstrapBlock = stepBlock(oneoffWorkflow, 'Bootstrap the terminal-proven exact legacy DMI generation');
assert.match(oneoffBootstrapBlock, /steps\.dmi-active-legacy-key\.outputs\.available == 'true'/);
assert.match(oneoffBootstrapBlock, /key: \$\{\{ steps\.dmi-active-legacy-key\.outputs\.key \}\}/);
assert.match(oneoffBootstrapBlock, /fail-on-cache-miss: true/);
assert.doesNotMatch(oneoffBootstrapBlock, /restore-keys:/);

const pilotResolverBlock = stepBlock(oneoffWorkflow, 'Resolve terminal-proven legacy DMI coverage for pilot selection');
assert.match(pilotResolverBlock, /id: dmi-coverage-legacy-key/);
assert.match(pilotResolverBlock, /steps\.dmi-coverage-cache\.outputs\.cache-matched-key == ''/);
assert.match(pilotResolverBlock, /resolve-terminal-dmi-cache\.mjs --allow-missing/);
assert.match(pilotResolverBlock, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
const pilotBootstrapBlock = stepBlock(
  oneoffWorkflow,
  'Bootstrap pilot selection from the terminal-proven exact legacy DMI generation',
);
assert.match(pilotBootstrapBlock, /steps\.dmi-coverage-legacy-key\.outputs\.available == 'true'/);
assert.match(pilotBootstrapBlock, /key: \$\{\{ steps\.dmi-coverage-legacy-key\.outputs\.key \}\}/);
assert.match(pilotBootstrapBlock, /fail-on-cache-miss: true/);
assert.doesNotMatch(pilotBootstrapBlock, /restore-keys:/);
const pilotNodeSetup = oneoffWorkflow.indexOf('- name: Set up Node.js');
const pilotMainGate = stepIndex(oneoffWorkflow, 'Require exact main before private DMI cache selection');
const pilotResolve = stepIndex(oneoffWorkflow, 'Resolve terminal-proven legacy DMI coverage for pilot selection');
const pilotBootstrap = stepIndex(
  oneoffWorkflow,
  'Bootstrap pilot selection from the terminal-proven exact legacy DMI generation',
);
const pilotInspect = stepIndex(oneoffWorkflow, 'Inspect private DMI coverage availability');
const pilotLedger = stepIndex(oneoffWorkflow, 'Bind the pilot to a ready restored DMI ledger');
assert.ok(
  pilotNodeSetup >= 0
    && pilotMainGate < pilotNodeSetup
    && pilotNodeSetup < pilotResolve
    && pilotResolve < pilotBootstrap
    && pilotBootstrap < pilotInspect
    && pilotInspect < pilotLedger,
  'Piloten skal resolve og exact-restore før strict ledgerkontrol.',
);
const oneoffTargetBlock = stepBlock(oneoffWorkflow, 'Validate the operational request and bind the exact target hour');
assert.match(oneoffTargetBlock, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
assert.doesNotMatch(
  `${buildWorkflow}\n${oneoffWorkflow}`,
  /key: dmi-zone-cache-v1-Linux-\d{4}-W\d{2}-\d+-\d+/,
  'En kortlivet legacycache må ikke hardkodes i workflowet.',
);

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
