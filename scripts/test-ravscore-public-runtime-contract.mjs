import assert from 'node:assert/strict';
import {
  assertPublicRuntimePrivacy,
  buildPublicConditionDetails,
  buildPublicConditions,
  buildPublicManifest,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import {
  RAVSCORE_MODEL_ID,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  resolvePublicRavScoreProfile,
} from '../js/core/ravscore-public-model.js';
import {
  buildIntegratedZoneHourlyProjection,
} from './lib/ravscore-production-adapters.mjs';
import {
  RAVSCORE_PUBLIC_EMERGENCY_MAXIMUM_AGE_HOURS,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
  assertPublicRuntimeAvailability,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
  ravScorePublicHorizonValidUntil,
  selectPublicRuntimeAvailability,
  sameRavScoreModelBinding,
} from '../js/core/ravscore-public-runtime-contract.js';
import {
  ravScoreVerifiedEvidenceTrust,
} from '../js/core/ravscore-evidence-trust-contract.js';
import {
  assertExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';

const generatedAt = '2026-08-29T00:00:00.000Z';
const horizonTimes = Array.from({ length: RAVSCORE_PUBLIC_FORECAST_HOURS }, (_, index) =>
  new Date(Date.parse(generatedAt) + index * 3_600_000).toISOString());
const binding = ravScoreModelBinding();
const reconstructedTrust = Object.freeze({
  schemaVersion: 1,
  status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
  incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
  decisionId: 'DEC-0109',
  method: 'LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH',
  evidenceClassification: 'RECONSTRUCTED_DERIVED_NOT_MEASURED',
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  descriptorSha256: 'a'.repeat(64),
  affectedPartCount: 673,
  syntheticSampleCount: 673,
  activeUntil: '2026-08-31T09:00:00.000Z',
});
const scoreProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});

function publicMode(score, mode, time = generatedAt) {
  return {
    available: true,
    status: 'only-part',
    score,
    baseScore: score,
    level: 'fair',
    label: 'Middel',
    scoreProfileId: RAVSCORE_MODEL_ID,
    modelBinding: binding,
    components: { huntability: score - 1, transport: score + 1, release: score },
    componentReasons: { huntability: ['h'], transport: ['t'], release: ['m'] },
    reasons: ['safe reason'],
    explanation: {
      ...binding,
      switchVersion: scoreProfile.switchVersion,
      weights: { huntability: .2, transport: .5, release: .3 },
      contributions: { huntability: 10, transport: 25, release: 15 },
      rawScore: score,
      roundedScore: score,
      finalScore: score,
      wadersHuntabilityMaximum: mode === 'waders' ? score : null,
      wadersHuntabilityLimitApplied: false,
      formula: 'safe',
      scoreMeaning: 'safe',
      transportDiagnostics: {
        engine: 'INTEGRATED_COASTAL_PROCESS',
        currentDirectionClass: 'INBOUND',
        transportPotential: score,
        lastMileStatus: 'LAST_MILE_BOUNDED_WAVE_APPROACH_READY',
        lastMileScoreEffect: 'BOUNDED_SUPPLY_ATTENUATION_ONLY',
        lastMileDeliveryFactor: .92,
        lastMileWaveActivity: .8,
        lastMileApproach: 1 / 3,
        lastMileStructuralUncertainty: true,
        lastMilePhysicalDeliveryResolved: false,
        resolvedSurfZoneIncluded: false,
        gridPoint: [99, 99],
      },
      mobilisationDiagnostics: { mobilisationPotential: score, waveMemoryStatus: 'READY' },
      waterLevelContext: {
        available: true,
        phase: 'FALLING',
        jointContextCode: 'FALLING_WITH_OUTBOUND_CURRENT_CONTEXT',
        currentRelation: 'OUTBOUND',
        currentRelationDeadbandMps: 0.03,
        trendSemantics: 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE',
        scoreEffectPoints: 0,
        transportEffect: 'NONE',
      },
      uncertainty: { dataStatus: 'READY', modelMaturity: 'research', modelConfidence: 'low', limitations: ['SAFE'] },
      privateDiagnostic: 'must be removed',
    },
    weather: {
      time,
      windSpeedMps: 4,
      waveHeightM: .8,
      wavePeriodS: 6,
      currentSpeedMps: .1,
      currentDirectionDeg: 90,
      currentUMps: .1,
      currentVMps: .2,
      currentProvenance: {
        status: 'verified', provider: 'dmi', collection: 'safe',
        gridPoint: [99, 99], samplingPoint: [98, 98],
      },
    },
  };
}

const zones = {};
const coastalZones = {};
const parts = {};
let partIndex = 0;
for (let zoneIndex = 0; zoneIndex < 210; zoneIndex += 1) {
  const zoneId = `zone-${zoneIndex}`;
  const count = zoneIndex < 43 ? 4 : 3;
  const partIds = [];
  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    partIndex += 1;
    const partId = `part-${partIndex}`;
    partIds.push(partId);
    const waders = publicMode(55 + (partIndex % 10), 'waders');
    const beach = publicMode(60 + (partIndex % 10), 'beach');
    parts[partId] = {
      zoneId,
      name: `Part ${partIndex}`,
      marineCoverage: 'full',
      waterPoint: [10, 56],
      landPoint: [10.01, 56.01],
      onshoreDirectionDeg: 45,
      onshoreDirectionSource: 'approved',
      flowPoints: { current: [10, 56], wind: [10.02, 56.02], wave: [10.03, 56.03], sources: { current: 'dmi-marine-grid', wind: 'dmi-atmospheric-grid', wave: 'dmi-wave-grid' } },
      current: { time: generatedAt, weather: waders.weather, waders, beach, privateDiagnostic: 'remove' },
      ravScoreModel: {
        ...binding,
        currentState: { currentUMps: .1, transportEvidence: [{ time: generatedAt, strength: 1 }] },
      },
    };
  }
  const winner = partIds[0];
  const coverage = (mode, time, hourIndex) => ({
    ...publicMode((mode === 'waders' ? 60 : 65) + (hourIndex % 10), mode, time),
    winningPartId: winner,
    winningPartName: parts[winner].name,
    scoreSpread: 9,
    comparisonPartCount: count,
    parts: partIds.slice(0, 2).map((partId, index) => ({ partId, name: parts[partId].name, score: 65 - index, explanation: { privateDiagnostic: true } })),
  });
  coastalZones[zoneId] = {
    expectedPartCount: count,
    scoredPartCount: count,
    currentReferenceAt: generatedAt,
    hourly: horizonTimes.map((time, hourIndex) => ({
      time,
      waders: coverage('waders', time, hourIndex),
      beach: coverage('beach', time, hourIndex),
    })),
  };
  zones[zoneId] = {
    provider: 'dmi',
    flowPoints: { current: [10, 56], wind: [10.02, 56.02], wave: [10.03, 56.03], sources: { current: 'dmi-marine-grid', wind: 'dmi-atmospheric-grid', wave: 'dmi-wave-grid' } },
    sources: { current: { provider: 'dmi' } },
    current: { windSpeedMps: 4, currentSpeedMps: .1, currentUMps: .1, currentVMps: .2 },
    history: {},
    forecast: {
      provider: 'dmi',
      generatedAt,
      validUntil: ravScorePublicHorizonValidUntil(generatedAt),
      hourly: horizonTimes.map(time => ({ time, currentUMps: .1, currentVMps: .2 })),
    },
  };
}
assert.equal(partIndex, 673);

const scoreAvailability = {
  schemaVersion: 1,
  policy: 'integrated-model-local-fail-closed',
  allZonesActive: true,
  activeZoneCount: 210,
  unavailableZoneCount: 0,
  totalZoneCount: 210,
  evaluatedAt: generatedAt,
  unavailableZones: [],
};
const full = {
  datasetId: 'integrated-public-contract-test',
  generatedAt,
  productionReferenceAt: generatedAt,
  zones,
  coastalParts: {
    schemaVersion: 2,
    enabled: true,
    modelBinding: binding,
    evidenceTrust: ravScoreVerifiedEvidenceTrust(),
    scoreProfile,
    scoreAvailability,
    expectedPartCount: 673,
    scoredPartCount: 673,
    parts,
    zones: coastalZones,
  },
};

assert.throws(() => buildPublicConditions({
  ...full,
  coastalParts: {
    ...full.coastalParts,
    evidenceTrust: structuredClone(reconstructedTrust),
  },
}), /VERIFIED_ONLY/,
'the integrated public producer must reject even a structurally sealed reconstructed trust contract');

const startup = buildPublicConditions(full);
const details = buildPublicConditionDetails(full);
const startupText = compactJson(startup);
const detailsText = compactJson(details);
const zoneRegistryText = compactJson({
  type: 'FeatureCollection',
  features: Object.keys(full.zones).map(id => ({
    type: 'Feature', properties: { id, zoneStatus: 'active' }, geometry: null,
  })),
});
const manifest = buildPublicManifest(full, startupText, detailsText, '{}\n', zoneRegistryText);

for (const invalidTrust of [
  null,
  structuredClone(reconstructedTrust),
  { ...ravScoreVerifiedEvidenceTrust(), unexpected: true },
]) {
  const invalidManifestTrust = structuredClone(manifest);
  invalidManifestTrust.ravScoreEvidenceTrust = invalidTrust;
  assert.throws(() => selectPublicRuntimeAvailability(invalidManifestTrust, {
    now: Date.parse(generatedAt) + 3_600_000,
    modelBinding: binding,
  }), /VERIFIED_ONLY/,
  'fresh and emergency selection must independently require exact measured-only trust');
}

assert.equal(Object.keys(startup.zones).length, 210);
assert.equal(Object.keys(details.coastalParts.zones).length, 210);
assert.equal(Object.keys(details.coastalParts.parts).length, 673);
assert.equal(startup.coastalParts.expectedPartCount, 673);
assert.deepEqual(startup.ravScoreRuntime.modelBinding, binding);
assert.deepEqual(details.ravScoreRuntime.modelBinding, binding);
assert.deepEqual(manifest.ravScoreModelBinding, binding);
assert.equal(manifest.publicConditionsSha256, sha256Text(startupText));
  assert.equal(manifest.publicConditionDetailsSha256, sha256Text(detailsText));
const freshAvailability = selectPublicRuntimeAvailability(manifest, {
  now: Date.parse(generatedAt) + 3_600_000,
  modelBinding: binding,
});
assert.equal(freshAvailability.mode, 'FRESH');
assert.equal(freshAvailability.selectedReferenceAt, generatedAt);
assert.equal(assertPublicRuntimeAvailability(freshAvailability, manifest, { modelBinding: binding }), true);
const emergencyAvailability = selectPublicRuntimeAvailability(manifest, {
  now: Date.parse(generatedAt) + 9 * 3_600_000 + 20 * 60_000,
  modelBinding: binding,
});
assert.equal(emergencyAvailability.mode, 'EMERGENCY_LAST_COMPLETE');
assert.equal(emergencyAvailability.selectedReferenceAt, horizonTimes[9]);
const lastAllowedEmergencyAvailability = selectPublicRuntimeAvailability(manifest, {
  now: Date.parse(generatedAt) + RAVSCORE_PUBLIC_EMERGENCY_MAXIMUM_AGE_HOURS * 3_600_000,
  modelBinding: binding,
});
assert.equal(lastAllowedEmergencyAvailability.mode, 'EMERGENCY_LAST_COMPLETE');
assert.equal(lastAllowedEmergencyAvailability.selectedReferenceAt, horizonTimes[72]);
assert.throws(() => selectPublicRuntimeAvailability(manifest, {
  now: Date.parse(generatedAt)
    + RAVSCORE_PUBLIC_EMERGENCY_MAXIMUM_AGE_HOURS * 3_600_000 + 1,
  modelBinding: binding,
}), /emergency maximum age has expired/);
assert.throws(() => selectPublicRuntimeAvailability(manifest, {
  now: Date.parse(manifest.validUntil) + 1,
  modelBinding: binding,
}), /horizon has expired/);
assert.equal(
  startup.ravScoreRuntime.payloadBodySha256,
  sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(startup))),
);
assert.equal(
  details.ravScoreRuntime.payloadBodySha256,
  sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(details))),
);
assert.equal(manifest.recoveryFallback, undefined, 'First rollout must not require a fallback.');
const bindingWithExtraField = { ...binding, hiddenModelRevision: 'must-fail-closed' };
assert.throws(
  () => assertRavScoreModelBinding(bindingWithExtraField),
  /exact key set/,
  'The canonical binding must reject hidden extra fields.',
);
assert.equal(sameRavScoreModelBinding(bindingWithExtraField, binding), false);
const startupWithExtraBindingField = structuredClone(startup);
startupWithExtraBindingField.ravScoreRuntime.modelBinding.hiddenModelRevision = 'must-fail-closed';
assert.throws(() => assertPublicRuntimeEnvelope(startupWithExtraBindingField, {
  kind: startup.ravScoreRuntime.kind,
  datasetId: startup.datasetId,
  productionReferenceAt: startup.productionReferenceAt,
  payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
  modelBinding: binding,
}), /exact (?:key set|11-field model binding)/);
for (const [label, mutate] of [
  ['partial envelope', envelope => { delete envelope.kind; }],
  ['extra envelope', envelope => { envelope.hiddenFallback = true; }],
]) {
  const invalid = structuredClone(startup);
  mutate(invalid.ravScoreRuntime);
  assert.throws(() => assertPublicRuntimeEnvelope(invalid, {
    kind: startup.ravScoreRuntime.kind,
    modelBinding: binding,
  }), /inexact runtime envelope field set/, label);
}
assert.equal(assertPublicRuntimeManifest(manifest.ravScoreRuntime, {
  modelBinding: binding,
  startup: {
    payloadBodySha256: startup.ravScoreRuntime.payloadBodySha256,
    fileSha256: manifest.publicConditionsSha256,
    bytes: manifest.publicConditionsBytes,
  },
  details: {
    payloadBodySha256: details.ravScoreRuntime.payloadBodySha256,
    fileSha256: manifest.publicConditionDetailsSha256,
    bytes: manifest.publicConditionDetailsBytes,
  },
}), true);
for (const [label, mutate, pattern] of [
  ['extra manifest runtime', runtime => { runtime.hiddenFallback = true; }, /inexact manifest runtime/],
  ['partial runtime descriptor', runtime => { delete runtime.startup.fileSha256; }, /inexact runtime descriptor/],
  ['extra runtime descriptor', runtime => { runtime.details.hiddenFallback = true; }, /inexact runtime descriptor/],
]) {
  const invalid = structuredClone(manifest.ravScoreRuntime);
  mutate(invalid);
  assert.throws(() => assertPublicRuntimeManifest(invalid, { modelBinding: binding }), pattern, label);
}
assert.equal(assertExactPublicRavScoreProfile(manifest.ravScoreProfile, binding), true);
for (const [label, mutate, pattern] of [
  ['partial public profile', profile => { delete profile.rankingPolicyId; }, /exact public score-profile/],
  ['extra public profile', profile => { profile.hiddenFallback = true; }, /exact public score-profile/],
  ['forged public profile', profile => { profile.bestTimePolicyId = 'forged'; }, /bestTimePolicyId/],
]) {
  const invalid = structuredClone(manifest.ravScoreProfile);
  mutate(invalid);
  assert.throws(() => assertExactPublicRavScoreProfile(invalid, binding), pattern, label);
}
assert.throws(() => buildPublicConditions({
  ...full,
  coastalParts: { ...full.coastalParts, modelBinding: bindingWithExtraField },
}), /exact key set/);

const firstPart = details.coastalParts.parts['part-1'];
assert.equal(firstPart.ravScoreModel, undefined);
assert.equal(firstPart.current.currentState, undefined);
assert.equal(firstPart.current.weather.currentUMps, undefined);
assert.equal(firstPart.current.weather.currentVMps, undefined);
assert.equal(firstPart.current.weather.currentProvenance.gridPoint, undefined);
assert.equal(firstPart.current.waders.explanation.privateDiagnostic, undefined);
assert.equal(firstPart.current.waders.explanation.transportDiagnostics.transportPotential, 56);
assert.equal(firstPart.current.waders.explanation.transportDiagnostics.lastMileScoreEffect,
  'BOUNDED_SUPPLY_ATTENUATION_ONLY');
assert.equal(firstPart.current.waders.explanation.transportDiagnostics.lastMileDeliveryFactor, .92);
assert.equal(firstPart.current.waders.explanation.transportDiagnostics.lastMileStructuralUncertainty, true);
assert.equal(firstPart.current.waders.explanation.transportDiagnostics.lastMilePlausibleRange, undefined,
  'The unresolved surf-zone path must not be presented as a numeric physical interval.');
assert.deepEqual(Object.keys(firstPart.flowPoints).sort(), ['current','sources','wind']);
assert.deepEqual(Object.keys(firstPart.flowPoints.sources).sort(), ['current','wind']);
assertPublicRuntimePrivacy(startup, 'startup');
assertPublicRuntimePrivacy(details, 'details');
assert.throws(() => assertPublicRuntimePrivacy({ nested: { currentUMps: .1 } }), /forbidden private field/);
assert.throws(() => assertPublicRuntimePrivacy({ nested: { gridPoint: [10, 56] } }), /forbidden coordinate field/);
assert.throws(() => assertPublicRuntimePrivacy({ nested: { values: [10, 56] } }), /coordinate-like pair/);
assert.equal(assertPublicRuntimePrivacy({ coastalParts: { parts: { p: { waterPoint: [10, 56] } } } }, 'startup'), true);

assert.throws(() => buildPublicConditions({
  ...full,
  coastalParts: { ...full.coastalParts, modelBinding: { ...binding, modelId: 'candidate-g' } },
}), /incompatible modelId/);

for (const [label, mutate] of [
  ['missing common weather hour', value => { value.zones['zone-0'].forecast.hourly.pop(); }],
  ['missing score mode', value => { delete value.coastalParts.zones['zone-0'].hourly[9].beach; }],
  ['shifted final score hour', value => {
    value.coastalParts.zones['zone-0'].hourly.at(-1).time =
      new Date(Date.parse(value.coastalParts.zones['zone-0'].hourly.at(-1).time) + 1).toISOString();
  }],
]) {
  const invalid = structuredClone(full);
  mutate(invalid);
  assert.throws(
    () => buildPublicManifest(invalid, startupText, detailsText, '{}\n', zoneRegistryText),
    /horizon|lacks beach|gap, duplicate or shifted/i,
    label,
  );
}

const generatedUnavailableMode = buildIntegratedZoneHourlyProjection({
  rows: [
    {
      partId: 'part-1',
      name: 'Part 1',
      scores: [{
        time: generatedAt,
        ravScoreModel: { modes: { waders: publicMode(61, 'waders') } },
      }],
    },
    {
      partId: 'part-2',
      name: 'Part 2',
      scores: [{
        time: generatedAt,
        ravScoreModel: { modes: { waders: {
          available: false,
          score: null,
          unavailability: { code: 'FIXTURE_MISSING', messageDa: 'Fixture mangler.' },
        } } },
      }],
    },
  ],
  expectedPartCount: 2,
  selectedMode: (row, mode) => row.ravScoreModel.modes[mode],
})[0].waders;
const locallyUnavailable = structuredClone(full);
locallyUnavailable.coastalParts.zones['zone-0'].hourly[0].waders = generatedUnavailableMode;
const locallyUnavailablePublic = buildPublicConditions(locallyUnavailable);
assert.equal(locallyUnavailablePublic.coastalParts.zones['zone-0'].hourly[0].waders.available, false);
assert.deepEqual(
  locallyUnavailablePublic.coastalParts.zones['zone-0'].hourly[0].waders.modelBinding,
  binding,
  'a generated local data gap must project as unavailable under the exact active binding',
);

const unavailableWithoutBinding = structuredClone(full);
unavailableWithoutBinding.coastalParts.zones['zone-0'].hourly[0].waders = {
  available: false,
  score: null,
  status: 'unavailable',
  reasons: ['missing'],
};
assert.throws(
  () => buildPublicConditions(unavailableWithoutBinding),
  /public RavScore model binding is missing/,
  'Unavailable rows must not be silently re-stamped as the integrated model.',
);

console.log('OK: integrated public runtime is model-atomic, explicitly projected and privacy-negative for 210/673.');
