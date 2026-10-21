import assert from 'node:assert/strict';
import './test-candidate-g-rollback-national-forecast.mjs';
import crypto from 'node:crypto';
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
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import {
  prepareCandidateGOperationalRollback,
} from './prepare-candidate-g-operational-rollback.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  candidateGRollbackScoreProfile,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  CANDIDATE_G_ROLLBACK_STAGE_SCHEMA,
  CANDIDATE_G_ROLLBACK_STAGE_MARKER,
  installCandidateGRollbackStage,
} from './install-candidate-g-rollback-stage.mjs';
import {
  assertCandidateGRollbackPublicScore,
} from './audit-candidate-g-rollback-public-runtime.mjs';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import {
  resolvePublicRavScoreProfile,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-public-model.js';
import { buildIntegratedPublicScoreAvailability } from '../js/core/ravscore-public-runtime-contract.js';
import {
  buildPrivatePublicHourDeliveryPack,
  compactPrivateConditionsForPersistence,
  inspectPrivatePublicHourDeliveryPack,
} from './lib/public-hour-delivery-pack.mjs';
import { packPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';

const execFileAsync = promisify(execFile);
const HOUR_MS = 3_600_000;
const reference = '2026-08-29T12:00:00.000Z';
const referenceMs = Date.parse(reference);
const at = hours => new Date(referenceMs + hours * HOUR_MS).toISOString();
const forecastTimes = Array.from({ length: 118 }, (_, hourIndex) => at(hourIndex));
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
    scoreBounds: {
      lower: scoreValue,
      upper: scoreValue,
      modelUncertaintyPoints: 0,
      rawLower: scoreValue,
      rawUpper: scoreValue,
    },
    scoreQuality: 'FULL_HISTORY',
    calibrationEligible: false,
    scoreSemantics: 'EXACT_POINT_SCORE',
    conservativeTailResetApplied: false,
    historyCoverageHours: 48,
    historyReasonCodes: [],
    level: 'fair',
    label: 'Middel',
    winningPartId,
    winningPartName,
    winningPartUncertain: false,
    possibleWinningPartCount: 1,
    possibleWinningParts: [{
      partId: winningPartId,
      name: winningPartName,
      score: scoreValue,
      scoreBounds: {
        lower: scoreValue,
        upper: scoreValue,
        modelUncertaintyPoints: 0,
        rawLower: scoreValue,
        rawUpper: scoreValue,
      },
    }],
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
          rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
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
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
        automaticActivationAllowed: false,
        publicDuringNormalOperation: false,
        runtime: {
          schemaVersion: 1,
          enabled: true,
          datasetVersion: '4.0.308',
          sourceRunId: 'synthetic-rollback-stage-test',
          modelBinding: candidateBinding,
          evidenceTrust: ravScoreVerifiedEvidenceTrust(),
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
            schemaVersion: 2,
            policy: 'candidate-g-local-fail-closed',
            allZonesActive: true,
            activeZoneCount: 210,
            unavailableZoneCount: 0,
            totalZoneCount: 210,
            allCurrentScoresFullHistory: true,
            fullHistoryModeCount: 420,
            historyIncompleteModeCount: 0,
            historyIncompleteZoneCount: 0,
            evaluatedAt: reference,
            unavailableZones: [],
            historyIncompleteZones: [],
          },
          parts,
          zones,
        },
      },
    },
  };
}

const fixture = buildNationalFixture();
const fixtureAvailability = fixture.full.ravScoreCandidateGRollback.runtime.scoreAvailability;
assert.equal(fixtureAvailability.allCurrentScoresFullHistory, true);
assert.equal(fixtureAvailability.fullHistoryModeCount, 420);
assert.equal(fixtureAvailability.historyIncompleteModeCount, 0);
assert.equal(fixtureAvailability.historyIncompleteZoneCount, 0);
assert.equal(fixture.full.ravScoreCandidateGRollback.runtime.zones['rollback-zone-1']
  .hourly[0].beach.calibrationEligible, false,
'Candidate G FULL_HISTORY score rows must remain calibration-ineligible');
const preparationOptions = {
  expectedDatasetId: datasetId,
  sourceHead,
  privateBundleContentSha256,
  sourceImplementationClosureSha256: 'c'.repeat(64),
  requestedImplementationClosureSha256: 'd'.repeat(64),
  centralExpectedVersion: 0,
  now: at(1),
};
let prepared = prepareCandidateGOperationalRollback(fixture.full, preparationOptions);

async function buildPackedIntegratedSource(root) {
  const live = path.join(root, 'data', 'live');
  await fs.mkdir(live, { recursive: true });
  const profile = resolvePublicRavScoreProfile({
    modelCoverageReady: false, modelMemoryReady: false, modelMigrationReady: false,
  });
  // Obtain genuine I-model results from the ordinary evaluator/presenter. They
  // are unavailable without history, not C scores relabelled as integrated.
  const modes = Object.fromEntries(['waders', 'beach'].map(mode => [mode,
    selectPublicRavScoreResult({ profile, mode,
      modelResult: evaluateRavScoreIntegrated({ mode }), modelState: null }),
  ]));
  const zones = Object.fromEntries(Object.entries(fixture.full.ravScoreCandidateGRollback.runtime.zones)
    .map(([id, zone]) => [id, {
      expectedPartCount: zone.expectedPartCount,
      scoredPartCount: zone.scoredPartCount,
      currentReferenceAt: reference,
      hourly: forecastTimes.map(time => ({ time, ...modes })),
    }]));
  const parts = Object.fromEntries(Object.entries(fixture.full.ravScoreCandidateGRollback.runtime.parts)
    .map(([id, part]) => [id, {
      zoneId: part.zoneId, name: part.name, marineCoverage: part.marineCoverage,
      waterPoint: part.waterPoint, landPoint: part.landPoint,
      onshoreDirectionDeg: part.onshoreDirectionDeg,
      onshoreDirectionSource: part.onshoreDirectionSource,
      flowPoints: part.flowPoints,
      current: { time: reference, weather: part.current.weather, ...modes },
    }]));
  const full = { ...fixture.full, coastalParts: {
    schemaVersion: 2, enabled: true, modelBinding: integratedModelBinding(),
    evidenceTrust: ravScoreVerifiedEvidenceTrust(), scoreProfile: profile,
    scoreAvailability: buildIntegratedPublicScoreAvailability({ zones, referenceAt: reference }),
    expectedPartCount: 673, scoredPartCount: 673, parts, zones,
  } };
  // As in the ordinary hourpack target, these small, explicit synthetic I
  // documents are pack INPUTS, not a claim of a complete I publication. The
  // real pack builder binds all118 bytes/times; C still uses normal generation.
  const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const sourceDetailsSha256 = digest('synthetic-integrated-hourpack-input');
  const hours = {};
  const forecast = path.join(live, 'forecast');
  await fs.mkdir(forecast, { recursive: true });
  for (const time of forecastTimes) {
    const text = `${JSON.stringify({
      fixtureKind: 'SYNTHETIC_INTEGRATED_HOURPACK_INPUT',
      delivery: { schemaVersion: 1, kind: 'hour', key: time,
        sourceDetailsSha256, modelBinding: integratedModelBinding() },
      coastalParts: { modelBinding: integratedModelBinding(), current: modes },
    })}\n`;
    const sha256 = digest(text);
    await fs.writeFile(path.join(forecast, `${sha256}.json`), text);
    hours[time] = { path: `./forecast/${sha256}.json`, sha256, bytes: Buffer.byteLength(text) };
  }
  const publicManifest = { datasetId, productionReferenceAt: reference,
    ravScoreModelBinding: integratedModelBinding(),
    publicConditionDetailsSha256: sourceDetailsSha256,
    detailDelivery: { schemaVersion: 1, sourceDetailsSha256, hours } };
  const startupNationalForecast = { schemaVersion: 2, modelBinding: integratedModelBinding(),
    dates: [reference.slice(0, 10)],
    modes: { waders: [{ date: reference.slice(0, 10), rows: [] }],
      beach: [{ date: reference.slice(0, 10), rows: [] }] } };
  const packPath = path.join(root, '.cache', 'public-hour-delivery.pack');
  const pack = await buildPrivatePublicHourDeliveryPack({
    liveDirectory: live, publicManifest, startupNationalForecast, outputPath: packPath,
  });
  const packed = packPrivateConditionsHourly(compactPrivateConditionsForPersistence(full, pack.marker));
  const conditionsPath = path.join(live, 'conditions.json');
  await fs.writeFile(conditionsPath, `${JSON.stringify(packed)}\n`);
  await inspectPrivatePublicHourDeliveryPack({ packPath, conditions: packed });
  return { packed, conditionsPath, packPath,
    originalConditions: await fs.readFile(conditionsPath), originalPack: await fs.readFile(packPath) };
}

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
  const integratedSource = await buildPackedIntegratedSource(path.join(inputRoot, 'integrated-original'));
  prepared = prepareCandidateGOperationalRollback(integratedSource.packed, preparationOptions);
  await assert.rejects(() => fs.stat(path.join(stageRoot, '.cache')), { code: 'ENOENT' });
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
  assert.equal(marker.schemaVersion, CANDIDATE_G_ROLLBACK_STAGE_SCHEMA);
  assert.equal(marker.candidateTargetProfileSha256,
    prepared.plan.candidateTargetProfileSha256);
  assert.match(marker.candidateTargetProfileSha256, /^[0-9a-f]{64}$/);
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
  assert.equal(Object.hasOwn(prepared.candidateFull, 'privateZoneHourly'), false);
  assert.equal(Object.hasOwn(prepared.candidateFull, 'publicHourDelivery'), false,
    'new C projection must not retain I ranking/hourpack authority');
  assert.deepEqual(await fs.readFile(integratedSource.conditionsPath), integratedSource.originalConditions);
  assert.deepEqual(await fs.readFile(integratedSource.packPath), integratedSource.originalPack);
  assert.deepEqual(integratedSource.packed, JSON.parse(integratedSource.originalConditions),
    'normal preparation must not mutate the packed I input');
  const corruptedPacked = structuredClone(integratedSource.packed);
  corruptedPacked.privateZoneHourly.zones['rollback-zone-1'].score.rawSha256 = '0'.repeat(64);
  assert.throws(() => prepareCandidateGOperationalRollback(corruptedPacked, preparationOptions),
    /PRIVATE_CONDITIONS_HOURLY_/);
  const shortenedCandidate = structuredClone(integratedSource.packed);
  shortenedCandidate.ravScoreCandidateGRollback.runtime.zones['rollback-zone-1'].hourly.pop();
  const shortenedPrepared = prepareCandidateGOperationalRollback(shortenedCandidate, preparationOptions);
  await installCandidateGRollbackStage({ stageRoot, repositoryRoot,
    candidateFull: shortenedPrepared.candidateFull, plan: shortenedPrepared.plan,
    expectedSourceHead: sourceHead, expectedDatasetId: datasetId });
  await assert.rejects(() => execFileAsync(process.execPath, ['scripts/generate-public-conditions.mjs'], {
    cwd: stageRoot, windowsHide: true, maxBuffer: 10 * 1024 * 1024,
  }), error => /complete|horizon|118|forecast/i.test(`${error?.stderr ?? ''}${error?.message ?? ''}`),
  'the existing normal public horizon gate must reject an abbreviated C axis');
  await installCandidateGRollbackStage({ stageRoot, repositoryRoot,
    candidateFull: prepared.candidateFull, plan: prepared.plan,
    expectedSourceHead: sourceHead, expectedDatasetId: datasetId });
  const corruptedMarker = structuredClone(integratedSource.packed);
  corruptedMarker.publicHourDelivery.startupNationalForecastSha256 = '0'.repeat(64);
  assert.throws(() => prepareCandidateGOperationalRollback(corruptedMarker, preparationOptions),
    /Private (?:public-hour|startup national)/i);
  const generatedManifest = JSON.parse(await fs.readFile(path.join(stageRoot, 'data', 'live', 'manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(generatedManifest.detailDelivery.hours).sort(), forecastTimes);
  for (const time of forecastTimes) {
    const descriptor = generatedManifest.detailDelivery.hours[time];
    const hour = JSON.parse(await fs.readFile(path.join(stageRoot, 'data', 'live', descriptor.path), 'utf8'));
    assert.deepEqual(hour.delivery.modelBinding, candidateBinding);
    assert.deepEqual(hour.nationalForecast.modelBinding, candidateBinding);
    for (const [zoneId, expected] of Object.entries(fixture.full.ravScoreCandidateGRollback.runtime.zones)) {
      const row = hour.coastalParts.zones[zoneId].hourly;
      assert.equal(row.length, 1);
      assert.equal(row[0].time, time);
      const source = expected.hourly.find(item => item.time === time);
      for (const mode of ['waders', 'beach']) {
        assert.deepEqual(row[0][mode].modelBinding, candidateBinding);
        assert.equal(row[0][mode].score, source[mode].score);
      }
    }
    assert.equal(Object.keys(hour.coastalParts.parts).length, 673);
    for (const [partId, part] of Object.entries(hour.coastalParts.parts)) {
      assert.equal(part.id, partId);
      if (time === reference) {
        assert.equal(part.current.time, reference);
      } else {
        assert.equal(Object.hasOwn(part, 'current'), false);
        assert.equal(Object.hasOwn(part, 'flowPoints'), false);
        assert.equal(Object.hasOwn(part, 'weather'), false,
          'future C PART metadata is not a time-specific weather projection');
      }
    }
  }
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

  const sourceVariants = [
    {
      label: 'exact current Candidate maintenance',
      options: { sourceModel: 'candidate-g' },
    },
    {
      label: 'sealed historical Candidate maintenance',
      options: {
        sourceModel: 'historical-candidate-g',
        sourceModelBinding: {
          ...candidateBinding,
          modelContractSha256: 'e'.repeat(64),
          modelBundleSha256: 'f'.repeat(64),
        },
      },
    },
    {
      label: 'exact legacy Candidate maintenance',
      options: { sourceModel: 'legacy-candidate-g', centralExpectedVersion: 0 },
    },
  ];
  for (const variant of sourceVariants) {
    const variantPrepared = prepareCandidateGOperationalRollback(fixture.full, {
      expectedDatasetId: datasetId,
      sourceHead,
      privateBundleContentSha256,
      sourceImplementationClosureSha256: 'c'.repeat(64),
      requestedImplementationClosureSha256: 'd'.repeat(64),
      centralExpectedVersion: 17,
      now: at(1),
      ...variant.options,
    });
    await installCandidateGRollbackStage({
      stageRoot,
      repositoryRoot,
      candidateFull: variantPrepared.candidateFull,
      plan: variantPrepared.plan,
      expectedSourceHead: sourceHead,
      expectedDatasetId: datasetId,
    });
    await fs.writeFile(planPath, `${JSON.stringify(variantPrepared.plan)}\n`);
    const variantAudit = await execFileAsync(process.execPath, auditArguments, {
      cwd: stageRoot,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    assert.match(variantAudit.stdout, /candidate-g-public-rollback-audit-passed/,
      variant.label);
  }
  await installCandidateGRollbackStage({
    stageRoot,
    repositoryRoot,
    candidateFull: prepared.candidateFull,
    plan: prepared.plan,
    expectedSourceHead: sourceHead,
    expectedDatasetId: datasetId,
  });
  await fs.writeFile(planPath, `${JSON.stringify(prepared.plan)}\n`);

  const startupPath = path.join(stageRoot, 'data', 'live', 'public-conditions.json');
  const manifestPath = path.join(stageRoot, 'data', 'live', 'manifest.json');
  const pristineStartup = await fs.readFile(startupPath, 'utf8');
  const pristineManifest = await fs.readFile(manifestPath, 'utf8');
  const stagedAvailability = JSON.parse(pristineStartup).coastalParts.scoreAvailability;
  assert.equal(stagedAvailability.allCurrentScoresFullHistory, true);
  assert.equal(stagedAvailability.fullHistoryModeCount, 420);
  assert.equal(stagedAvailability.historyIncompleteModeCount, 0);
  assert.equal(stagedAvailability.historyIncompleteZoneCount, 0);
  for (const [label, file, mutate,
    expectedFailure = /canonical|profile|runtime|field set|digest/i] of [
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
    ['private measured warmup payload', startupPath, document => {
      document.ravScoreCandidateGWarmup = {};
    }],
    ['extra Candidate manifest runtime', manifestPath, document => {
      document.ravScoreRuntime.hiddenFallback = true;
    }],
    ['partial Candidate runtime descriptor', manifestPath, document => {
      delete document.ravScoreRuntime.details.fileSha256;
    }],
    ['incomplete Candidate public delivery hour axis', manifestPath, document => {
      delete document.detailDelivery.hours[forecastTimes.at(-1)];
    }, /public delivery|canonical|field set/i],
    ['changed Candidate public delivery zone identity', manifestPath, document => {
      const zoneId = Object.keys(document.detailDelivery.zones)[0];
      document.detailDelivery.zones['unexpected-zone'] = document.detailDelivery.zones[zoneId];
      delete document.detailDelivery.zones[zoneId];
    }, /public delivery|canonical|field set/i],
    ['extra Candidate public delivery index field', manifestPath, document => {
      document.detailDelivery.unexpectedShadowIndex = true;
    }, /public delivery|canonical|field set/i],
    ['extra Candidate public delivery descriptor field', manifestPath, document => {
      document.detailDelivery.hours[forecastTimes[0]].unexpectedShadowField = true;
    }, /public delivery|canonical|field set/i],
  ]) {
    const pristine = file === manifestPath ? pristineManifest : pristineStartup;
    const invalid = JSON.parse(pristine);
    mutate(invalid);
    // Preserve producer formatting so each rejection tests the mutation, not JSON layout.
    await fs.writeFile(file, `${JSON.stringify(invalid, null, file === manifestPath ? 2 : undefined)}\n`);
    await assert.rejects(() => execFileAsync(process.execPath, auditArguments, {
      cwd: stageRoot,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    }), error => expectedFailure.test(
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
  for (const mutateMarker of [
    markerDocument => { markerDocument.publicArtifactReady = true; },
    markerDocument => { markerDocument.candidateTargetProfileSha256 = '0'.repeat(64); },
    markerDocument => { markerDocument.unsealedField = true; },
  ]) {
    const wrongMarker = JSON.parse(pristineMarker);
    mutateMarker(wrongMarker);
    await fs.writeFile(markerPath, `${JSON.stringify(wrongMarker)}\n`);
    await assert.rejects(() => execFileAsync(process.execPath, auditArguments, {
      cwd: stageRoot,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    }), error => /stage marker is incompatible/.test(
      `${error?.stderr ?? ''}${error?.message ?? ''}`));
  }
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Candidate G isolated stage, exact overlay, canonical 210/673 public projection and mixed-model fail-closed: passed.');
