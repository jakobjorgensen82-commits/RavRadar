import {
  createCalibrationFeatureSnapshot,
  createForecastSnapshotReference,
  createTripStartRecord,
  HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG,
  PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG,
  RECONSTRUCTED_RAVSCORE_QUALITY_FLAG,
} from './trip-evidence-contract.js?v=4.0.317';
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../core/ravscore-model-contract.js?v=4.0.317';
import {
  RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY,
  assertPublicRuntimeAvailability,
  canonicalPublicRuntimeJson,
  sameRavScoreModelBinding,
} from '../core/ravscore-public-runtime-contract.js?v=4.0.317';
import {
  assertRavScoreEvidenceTrust,
} from '../core/ravscore-evidence-trust-contract.js?v=4.0.317';

const TRUST_FIELDS = Object.freeze([
  'schemaVersion', 'status', 'incidentId', 'decisionId', 'method', 'evidenceClassification',
  'calibrationEligible', 'hardObservedOuttransportEligible', 'descriptorSha256',
  'affectedPartCount', 'syntheticSampleCount', 'activeUntil'
]);
const VERIFIED_TRUST_FIELDS = Object.freeze([
  'schemaVersion', 'status', 'incidentId', 'calibrationEligible',
  'hardObservedOuttransportEligible', 'affectedPartCount', 'syntheticSampleCount', 'activeUntil'
]);

function finiteOrNull(value, scale = 1) {
  if (value == null || value === '') return null;
  return typeof value === 'number' && Number.isFinite(value) ? value * scale : null;
}

function hasCompleteNumericScore(modeState) {
  return typeof modeState?.score === 'number'
    && Number.isFinite(modeState.score)
    && modeState.score >= 0
    && modeState.score <= 100
    && ['huntability', 'transport', 'release'].every(key => (
      typeof modeState?.components?.[key] === 'number'
      && Number.isFinite(modeState.components[key])
      && modeState.components[key] >= 0
      && modeState.components[key] <= 100
    ));
}

function trustSignature(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const expectedFields = value.status === 'VERIFIED_ONLY'
    ? VERIFIED_TRUST_FIELDS
    : value.status === 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE'
      ? TRUST_FIELDS
      : null;
  if (!expectedFields
    || Object.keys(value).sort().join(',') !== [...expectedFields].sort().join(',')) return null;
  return JSON.stringify(Object.fromEntries(expectedFields.map(key => [key, value[key] ?? null])));
}

function assertEvidenceTrustPair(manifestTrust, conditionsTrust) {
  if (!manifestTrust || !conditionsTrust || trustSignature(manifestTrust) !== trustSignature(conditionsTrust)) {
    throw new Error('RavScore-evidensens manifest og offentlige forhold matcher ikke.');
  }
  try {
    const validated = assertRavScoreEvidenceTrust(manifestTrust, 'Turens manifest-RavScore-evidens');
    assertRavScoreEvidenceTrust(conditionsTrust, 'Turens offentlige RavScore-evidens');
    return validated.status === 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE';
  } catch {
    throw new Error('RavScore-evidensen er ikke en eksakt understøttet tillidskontrakt.');
  }
}

function conditionsEvidenceTrust(conditions, coastalPart) {
  const values = [
    conditions?.ravScoreEvidenceTrust,
    conditions?.coastalParts?.evidenceTrust,
    coastalPart?.ravScoreEvidenceTrust
      ?? coastalPart?.integrated?.evidenceTrust
      ?? coastalPart?.candidateG?.evidenceTrust
  ];
  if (values.some(value => value === undefined || value === null)
    || values.some(value => trustSignature(value) !== trustSignature(values[0]))) {
    throw new Error('Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke.');
  }
  return values[0];
}

export function createTripStartFromPublicState({
  tripId,
  startedAt,
  mode,
  zoneId,
  coastalPartId,
  manifest,
  conditions,
  coastalPart,
  appVersion,
  modelVersion,
  modelBinding = null
} = {}) {
  if (!conditions?.available && conditions?.available !== undefined) throw new Error('De offentlige forhold er ikke tilgængelige.');
  if (manifest?.datasetId && conditions?.datasetId && manifest.datasetId !== conditions.datasetId) {
    throw new Error('Manifest og offentlige forhold tilhører ikke samme datasæt.');
  }
  const runtimeAvailability = conditions?.publicRuntimeAvailability;
  assertPublicRuntimeAvailability(runtimeAvailability, manifest, {
    modelBinding: ravScoreModelBinding(),
  });
  if (String(coastalPart?.zoneId || '') !== String(zoneId || '')) {
    throw new Error('Kystdelen tilhører ikke den valgte zone.');
  }

  const zone = conditions?.zones?.[zoneId];
  const modeState = coastalPart?.current?.[mode];
  const weather = coastalPart?.current?.weather || zone?.current;
  const publicEmergency = runtimeAvailability.mode === RAVSCORE_PUBLIC_RUNTIME_MODE_EMERGENCY;
  if (publicEmergency && (conditions.detailsAvailable !== true
    || coastalPart?.current?.time !== runtimeAvailability.selectedReferenceAt
    || zone?.currentReferenceAt !== runtimeAvailability.selectedReferenceAt
    || conditions?.coastalParts?.zones?.[zoneId]?.currentReferenceAt
      !== runtimeAvailability.selectedReferenceAt)) {
    throw new Error('Nøddriftens turgrundlag er ikke bundet til det valgte aktuelle prognosetidspunkt.');
  }
  if (!weather || !hasCompleteNumericScore(modeState)) {
    throw new Error('Den valgte kystdel mangler en komplet aktuel score.');
  }
  if (publicEmergency && (!modeState?.weather
    || canonicalPublicRuntimeJson(weather)
      !== canonicalPublicRuntimeJson({ ...modeState.weather, time: runtimeAvailability.selectedReferenceAt }))) {
    throw new Error('Nøddriftens RavScore og lokale vejr er ikke det samme forseglede snapshot.');
  }
  const runtimeBinding = conditions?.ravScoreRuntime?.modelBinding ?? null;
  const manifestBinding = manifest?.ravScoreModelBinding ?? null;
  const coastalPartsBinding = conditions?.coastalParts?.modelBinding ?? null;
  for (const [label, binding] of [
    ['Offentlig runtime-modelbinding', runtimeBinding],
    ['Manifestets RavScore-modelbinding', manifestBinding],
    ['Kystdelenes RavScore-modelbinding', coastalPartsBinding],
    ['Turens RavScore-modelbinding', modelBinding],
    ['Turens score-modelbinding', modeState.modelBinding],
  ]) {
    assertRavScoreModelBinding(binding, label);
  }
  const canonical = ravScoreModelBinding();
  if (![runtimeBinding, manifestBinding, coastalPartsBinding, modelBinding, modeState.modelBinding]
    .every(value => sameRavScoreModelBinding(value, canonical))) {
    throw new Error('Turens RavScore og offentlige runtime bruger ikke samme modelbundle.');
  }
  if (modelVersion !== canonical.modelId) throw new Error('Turens modelversion matcher ikke RavScore-modelbindingen.');

  const reconstructed = assertEvidenceTrustPair(
    manifest?.ravScoreEvidenceTrust,
    conditionsEvidenceTrust(conditions, coastalPart),
  );
  const scoreQuality = modeState?.scoreQuality;
  const historyIncomplete = scoreQuality === 'HISTORY_INCOMPLETE';
  if (!['FULL_HISTORY', 'HISTORY_INCOMPLETE'].includes(scoreQuality)) {
    throw new Error('Den valgte kystdels score mangler en gyldig historikkvalitet.');
  }
  if (historyIncomplete && reconstructed) {
    throw new Error('Historikufuldstændig og rekonstrueret score må ikke bindes som samme turgrundlag.');
  }
  const dataQualityFlags = [
    ...(publicEmergency ? [PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG] : []),
    ...(historyIncomplete ? [HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG] : []),
    ...(reconstructed ? [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG] : []),
  ];

  const history = zone?.history || {};
  const forecastSnapshot = createForecastSnapshotReference({
    manifest,
    conditions,
    validAt: coastalPart?.current?.time || startedAt,
    capturedAt: startedAt
  });
  const calibrationFeatures = createCalibrationFeatureSnapshot({
    appVersion,
    modelVersion,
    modelBinding: runtimeBinding,
    totalScore: modeState.score,
    scoreBoundLower: modeState.scoreBounds?.lower,
    scoreBoundUpper: modeState.scoreBounds?.upper,
    scoreBoundModelUncertaintyPoints: modeState.scoreBounds?.modelUncertaintyPoints,
    scoreBoundRawLower: modeState.scoreBounds?.rawLower,
    scoreBoundRawUpper: modeState.scoreBounds?.rawUpper,
    scoreQuality: modeState.scoreQuality,
    scoreSemantics: modeState.scoreSemantics,
    scoreCalibrationEligible: modeState.calibrationEligible,
    conservativeTailResetApplied: modeState.conservativeTailResetApplied,
    historyCoverageHours: modeState.historyCoverageHours,
    historyReasonCodes: modeState.historyReasonCodes,
    huntabilityScore: modeState.components.huntability,
    transportScore: modeState.components.transport,
    mobilisationScore: modeState.components.release,
    windSpeedMs: finiteOrNull(weather.windSpeedMps),
    windDirectionDeg: finiteOrNull(weather.windDirectionDeg),
    waveHeightM: finiteOrNull(weather.waveHeightM),
    wavePeriodS: finiteOrNull(weather.wavePeriodS),
    waveDirectionDeg: finiteOrNull(weather.waveDirectionDeg),
    currentSpeedMs: finiteOrNull(weather.currentSpeedMps),
    currentDirectionDeg: finiteOrNull(weather.currentDirectionDeg),
    waterLevelM: finiteOrNull(weather.waterLevelCm, 0.01),
    waterLevelTrendM3h: finiteOrNull(weather.waterLevelTrendCm3h, 0.01),
    maxWaveHeight24hM: finiteOrNull(history.maxWave24hM),
    hoursSinceEnergyPeak: finiteOrNull(history.hoursSinceHighEnergy),
    sustainedOnshoreHours: null,
    reasonCodes: dataQualityFlags
  });

  return createTripStartRecord({
    tripId,
    startedAt,
    mode,
    zoneId,
    coastalPartId,
    forecastSnapshot,
    calibrationFeatures,
    forecastCalibrationEligible: RAVSCORE_CALIBRATION_ELIGIBLE === true
      && dataQualityFlags.length === 0,
    dataQualityFlags
  });
}
