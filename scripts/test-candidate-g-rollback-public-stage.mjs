import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  buildBoundedCurrentTransportMemory,
} from '../js/core/ravscore-regime-memory.js';
import { ravScoreModelBinding as integratedModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  prepareCandidateGOperationalRollback,
} from './prepare-candidate-g-operational-rollback.mjs';
import {
  candidateGRollbackScoreProfile,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  CANDIDATE_G_ROLLBACK_STAGE_MARKER,
  installCandidateGRollbackStage,
} from './install-candidate-g-rollback-stage.mjs';
import {
  assertCandidateGRollbackPublicScore,
} from './audit-candidate-g-rollback-public-runtime.mjs';

const execFileAsync = promisify(execFile);
const HOUR_MS = 3_600_000;
const reference = '2026-08-29T12:00:00.000Z';
const referenceMs = Date.parse(reference);
const at = hours => new Date(referenceMs + hours * HOUR_MS).toISOString();
const forecastTimes = [0, 24, 48, 72, 96].map(at);
const datasetId = 'rr-20260829120000-210-stage';
const sourceHead = 'c'.repeat(40);
const privateBundleContentSha256 = 'd'.repeat(64);
const candidateBinding = candidateModelBinding();

const evidence = Array.from({ length: 49 }, (_, index) => ({
  time: at(index - 48),
  strength: index >= 36 ? 0.5 : 0,
}));
const oracle = buildBoundedCurrentTransportMemory(evidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: reference,
  restartAfterVerifiedTimeGap: true,
});
assert.equal(oracle.memoryReady, true);

function score(scoreValue, winningPartId, winningPartName, partCount) {
  const contributions = { huntability: 12, transport: 35, release: 15 };
  return {
    available: true,
    status: 'whole-zone',
    score: scoreValue,
    baseScore: scoreValue,
    level: 'fair',
    label: 'Middel',
    winningPartId,
    winningPartName,
    scoreSpread: 2,
    comparisonPartCount: partCount,
    validPartCount: partCount,
    expectedPartCount: partCount,
    components: { huntability: 60, transport: 70, release: 50 },
    componentReasons: { huntability: [], transport: [], release: [] },
    reasons: [],
    explanation: {
      ...candidateBinding,
      rawScore: Object.values(contributions).reduce((sum, value) => sum + value, 0),
      roundedScore: scoreValue,
      finalScore: scoreValue,
      weights: { huntability: 0.2, transport: 0.5, release: 0.3 },
      contributions,
      scoreIsSafetyAdvice: false,
      scoreIsFindProbability: false,
      transportDiagnostics: { engine: 'CANDIDATE_G' },
      mobilisationDiagnostics: { mobilisationPotential: 50 },
      waterLevelContext: { available: true, scoreEffectPoints: 0 },
    },
    scoreProfileId: candidateBinding.modelId,
    modelBinding: candidateBinding,
  };
}

assert.throws(() => assertCandidateGRollbackPublicScore({
  ...score(77, 'rollback-part-type-test', 'Rollback score type test', 1),
  score: '77',
}), /not an available Candidate G score/,
'the public rollback trust boundary must reject a numeric string score');
for (const invalidValue of ['77', false, [77]]) {
  assert.throws(() => assertCandidateGRollbackPublicScore({
    ...score(77, 'rollback-part-type-test', 'Rollback score type test', 1),
    score: invalidValue,
  }), /not an available Candidate G score/);
}
for (const component of ['huntability', 'transport', 'release']) {
  for (const invalidValue of ['70', false, [70]]) {
    const invalid = score(77, 'rollback-part-type-test', 'Rollback score type test', 1);
    invalid.components = { ...invalid.components, [component]: invalidValue };
    assert.throws(() => assertCandidateGRollbackPublicScore(invalid),
      /not an available Candidate G score/,
      `public audit must reject ${component}=${JSON.stringify(invalidValue)}`);
  }
}

function state(stateKey) {
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey,
    time: reference,
    transportReferenceAt: reference,
    transportPotential: oracle.result.transportPotential,
    outboundEpisodeEffectiveHours: oracle.result.outboundEpisodeEffectiveHours,
    transportMemoryReady: true,
    transportMemoryStatus: oracle.status,
    transportMemoryWindowHours: oracle.windowHours,
    transportMemoryCoverageHours: oracle.coverageHours,
    transportEvidence: oracle.evidence,
    mobilisationPotential: 64,
  };
}

function buildNationalFixture() {
  const zones = {};
  const weatherZones = {};
  const parts = {};
  const publicPartsByZone = {};
  let partIndex = 0;
  for (let zoneIndex = 0; zoneIndex < 210; zoneIndex += 1) {
    const zoneId = `rollback-zone-${zoneIndex + 1}`;
    const partCount = zoneIndex < 43 ? 4 : 3;
    const zoneParts = [];
    for (let localIndex = 0; localIndex < partCount; localIndex += 1) {
      partIndex += 1;
      const partId = `rollback-part-${partIndex}`;
      const partName = `Rollback part ${partIndex}`;
      zoneParts.push(partId);
      parts[partId] = {
        id: partId,
        zoneId,
        name: partName,
        marineCoverage: 'full',
        landPoint: [10.01, 56.01],
        waterPoint: [10, 56],
        onshoreDirectionDeg: (zoneIndex * 17 + localIndex * 55) % 360,
        onshoreDirectionSource: 'owner-approved-existing-point',
        flowPoints: { current: [10, 56], wind: [10.02, 56.02], sources: {} },
        current: {
          time: reference,
          weather: { windSpeedMps: 5, waveHeightM: 1, currentSpeedMps: 0.1 },
          waders: score(62, partId, partName, partCount),
          beach: score(67, partId, partName, partCount),
        },
        ravScoreModel: {
          ...candidateBinding,
          rollbackId: 'integrated-schema4-to-candidate-g-schema2-v1',
          currentState: state(`rollback-state-${partIndex}`),
        },
      };
    }
    const winnerId = zoneParts[0];
    const winnerName = parts[winnerId].name;
    zones[zoneId] = {
      expectedPartCount: partCount,
      scoredPartCount: partCount,
      currentReferenceAt: reference,
      hourly: forecastTimes.map((time, dayIndex) => ({
        time,
        waders: score(62 + (zoneIndex + dayIndex) % 5, winnerId, winnerName, partCount),
        beach: score(67 + (zoneIndex + dayIndex) % 5, winnerId, winnerName, partCount),
      })),
    };
    weatherZones[zoneId] = {
      id: zoneId,
      provider: 'fixture',
      forecast: {
        generatedAt: reference,
        validUntil: at(120),
        hourly: forecastTimes.map(time => ({ time, windSpeedMps: 5, waveHeightM: 1 })),
      },
    };
    publicPartsByZone[zoneId] = zoneParts.map(partId => ({
      partId,
      name: parts[partId].name,
      waterPoint: parts[partId].waterPoint,
      landPoint: parts[partId].landPoint,
      onshoreDirectionDeg: parts[partId].onshoreDirectionDeg,
    }));
  }
  assert.equal(partIndex, 673);
  return {
    publicCoastalParts: {
      schemaVersion: 2,
      enabled: true,
      zoneCount: 210,
      partCount: 673,
      zones: publicPartsByZone,
    },
    zoneRegistry: {
      type: 'FeatureCollection',
      features: Object.keys(zones).map(zoneId => ({
        type: 'Feature',
        properties: { id: zoneId, zoneStatus: 'active' },
        geometry: null,
      })),
    },
    full: {
      datasetId,
      productionReferenceAt: reference,
      generatedAt: reference,
      zones: weatherZones,
      coastalParts: { modelBinding: integratedModelBinding() },
      ravScoreCandidateGRollback: {
        schemaVersion: '1.0.0',
        kind: 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
        sourceModelBinding: integratedModelBinding(),
        rollbackModelBinding: candidateBinding,
        rollbackId: 'integrated-schema4-to-candidate-g-schema2-v1',
        automaticActivationAllowed: false,
        publicDuringNormalOperation: false,
        runtime: {
          schemaVersion: 1,
          enabled: true,
          datasetVersion: '4.0.308',
          sourceRunId: 'synthetic-rollback-stage-test',
          modelBinding: candidateBinding,
          generatedAt: reference,
          productionReferenceAt: reference,
          marginPoints: 7,
          expectedPartCount: 673,
          scoredPartCount: 673,
          scoreProfile: candidateGRollbackScoreProfile({
            modelCoverageReady: true,
            modelMemoryReady: true,
            modelMigrationReady: true,
          }),
          currentPilotMode: 'unavailable',
          currentPilotEnabled: false,
          scoreAvailability: {
            schemaVersion: 1,
            policy: 'candidate-g-local-fail-closed',
            allZonesActive: true,
            activeZoneCount: 210,
            unavailableZoneCount: 0,
            totalZoneCount: 210,
            evaluatedAt: reference,
            unavailableZones: [],
          },
          parts,
          zones,
        },
      },
    },
  };
}

const fixture = buildNationalFixture();
const prepared = prepareCandidateGOperationalRollback(fixture.full, {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  sourceImplementationClosureSha256: 'c'.repeat(64),
  requestedImplementationClosureSha256: 'd'.repeat(64),
  centralExpectedVersion: 0,
  now: at(1),
});

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-stage-test-'));
const stageRoot = path.join(temporaryRoot, 'stage');
const inputRoot = path.join(temporaryRoot, 'sealed-input');
const repositoryRoot = process.cwd();
try {
  await fs.mkdir(stageRoot, { recursive: true });
  await fs.mkdir(inputRoot, { recursive: true });
  await Promise.all([
    fs.cp(path.join(repositoryRoot, 'js'), path.join(stageRoot, 'js'), { recursive: true }),
    fs.cp(path.join(repositoryRoot, 'scripts'), path.join(stageRoot, 'scripts'), { recursive: true }),
    fs.copyFile(path.join(repositoryRoot, 'package.json'), path.join(stageRoot, 'package.json')),
  ]);
  const candidatePath = path.join(inputRoot, 'candidate-full.json');
  const planPath = path.join(inputRoot, 'plan.json');
  await Promise.all([
    fs.writeFile(candidatePath, `${JSON.stringify(prepared.candidateFull)}\n`),
    fs.writeFile(planPath, `${JSON.stringify(prepared.plan)}\n`),
    fs.mkdir(path.join(stageRoot, 'data', 'live'), { recursive: true }),
    fs.mkdir(path.join(stageRoot, 'data'), { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(stageRoot, 'data', 'live', 'coastal-parts-v2.json'),
      `${JSON.stringify(fixture.publicCoastalParts)}\n`),
    fs.writeFile(path.join(stageRoot, 'data', 'zones.geojson'),
      `${JSON.stringify(fixture.zoneRegistry)}\n`),
  ]);

  await assert.rejects(() => installCandidateGRollbackStage({
    stageRoot: repositoryRoot,
    repositoryRoot,
    candidateFull: prepared.candidateFull,
    plan: prepared.plan,
    expectedSourceHead: sourceHead,
    expectedDatasetId: datasetId,
  }), /isolated outside/);
  const tamperedFull = structuredClone(prepared.candidateFull);
  tamperedFull.datasetId = 'rr-tampered';
  await assert.rejects(() => installCandidateGRollbackStage({
    stageRoot,
    repositoryRoot,
    candidateFull: tamperedFull,
    plan: prepared.plan,
    expectedSourceHead: sourceHead,
    expectedDatasetId: datasetId,
  }), /candidate-full seal/);

  const marker = await installCandidateGRollbackStage({
    stageRoot,
    repositoryRoot,
    candidateFull: prepared.candidateFull,
    plan: prepared.plan,
    expectedSourceHead: sourceHead,
    expectedDatasetId: datasetId,
  });
  assert.equal(marker.publicArtifactReady, false);
  assert.equal(marker.installed.length, 3);
  const activeContract = await fs.readFile(path.join(stageRoot, 'js', 'core',
    'ravscore-model-contract.js'), 'utf8');
  const rollbackContract = await fs.readFile(path.join(repositoryRoot, 'scripts',
    'rollback-assets', 'ravscore-model-contract.js'), 'utf8');
  assert.equal(activeContract, rollbackContract);

  await execFileAsync(process.execPath, ['scripts/generate-public-conditions.mjs'], {
    cwd: stageRoot,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  const auditOutput = path.join(stageRoot, '.cache', 'candidate-g-operational-rollback',
    'public-audit.json');
  const auditArguments = [
    'scripts/audit-candidate-g-rollback-public-runtime.mjs',
    '--plan', planPath,
    '--output', auditOutput,
    '--expected-source-head', sourceHead,
    '--expected-dataset-id', datasetId,
  ];
  const passed = await execFileAsync(process.execPath, auditArguments, {
    cwd: stageRoot,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  assert.match(passed.stdout, /candidate-g-public-rollback-audit-passed/);
  assert.doesNotMatch(passed.stdout, /landPoint|waterPoint|currentUMps|currentVMps/);
  const audit = JSON.parse(await fs.readFile(auditOutput, 'utf8'));
  assert.equal(audit.publicArtifactReady, true);
  assert.equal(audit.zoneCount, 210);
  assert.equal(audit.coastalPartCount, 673);
  assert.deepEqual(audit.modelBinding, candidateBinding);
  assert.equal(audit.calibrationEligible, false);

  const startupPath = path.join(stageRoot, 'data', 'live', 'public-conditions.json');
  const manifestPath = path.join(stageRoot, 'data', 'live', 'manifest.json');
  const pristineStartup = await fs.readFile(startupPath, 'utf8');
  const pristineManifest = await fs.readFile(manifestPath, 'utf8');
  for (const [label, file, mutate] of [
    ['partial Candidate profile', manifestPath, document => {
      delete document.ravScoreProfile.rankingPolicyId;
    }],
    ['extra Candidate profile', manifestPath, document => {
      document.ravScoreProfile.unexpectedShadowBinding = 'forbidden';
    }],
    ['forged Candidate profile', manifestPath, document => {
      document.ravScoreProfile.bestTimePolicyId = 'forged-best-time';
    }],
    ['extra Candidate payload envelope', startupPath, document => {
      document.ravScoreRuntime.hiddenFallback = true;
    }],
    ['extra Candidate manifest runtime', manifestPath, document => {
      document.ravScoreRuntime.hiddenFallback = true;
    }],
    ['partial Candidate runtime descriptor', manifestPath, document => {
      delete document.ravScoreRuntime.details.fileSha256;
    }],
  ]) {
    const pristine = file === manifestPath ? pristineManifest : pristineStartup;
    const invalid = JSON.parse(pristine);
    mutate(invalid);
    await fs.writeFile(file, `${JSON.stringify(invalid)}\n`);
    await assert.rejects(() => execFileAsync(process.execPath, auditArguments, {
      cwd: stageRoot,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    }), error => /canonical|profile|runtime|field set|digest/i.test(
      `${error?.stderr ?? ''}${error?.message ?? ''}`), label);
    await fs.writeFile(file, pristine);
  }

  const detailsPath = path.join(stageRoot, 'data', 'live', 'public-condition-details.json');
  const pristineDetails = await fs.readFile(detailsPath, 'utf8');
  const mixedDetails = JSON.parse(pristineDetails);
  mixedDetails.coastalParts.parts['rollback-part-1'].current.beach.modelBinding.modelId =
    integratedModelBinding().modelId;
  await fs.writeFile(detailsPath, `${JSON.stringify(mixedDetails)}\n`);
  await assert.rejects(() => execFileAsync(process.execPath, auditArguments, {
    cwd: stageRoot,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  }), error => /not canonical|another score model|exact Candidate G/.test(
    `${error?.stderr ?? ''}${error?.message ?? ''}`));
  await fs.writeFile(detailsPath, pristineDetails);

  const markerPath = path.join(stageRoot, ...CANDIDATE_G_ROLLBACK_STAGE_MARKER.split('/'));
  const pristineMarker = await fs.readFile(markerPath, 'utf8');
  const wrongMarker = JSON.parse(pristineMarker);
  wrongMarker.publicArtifactReady = true;
  await fs.writeFile(markerPath, `${JSON.stringify(wrongMarker)}\n`);
  await assert.rejects(() => execFileAsync(process.execPath, auditArguments, {
    cwd: stageRoot,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  }), error => /stage marker is incompatible/.test(`${error?.stderr ?? ''}${error?.message ?? ''}`));
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Candidate G isolated stage, exact overlay, canonical 210/673 public projection and mixed-model fail-closed: passed.');
