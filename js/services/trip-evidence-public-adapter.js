import {
  createCalibrationFeatureSnapshot,
  createForecastSnapshotReference,
  createTripStartRecord,
  PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG,
  RECONSTRUCTED_RAVSCORE_QUALITY_FLAG
} from './trip-evidence-contract.js?v=4.0.312';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const TRUST_FIELDS = Object.freeze([
  'schemaVersion', 'status', 'incidentId', 'decisionId', 'method', 'evidenceClassification',
  'calibrationEligible', 'hardObservedOuttransportEligible', 'descriptorSha256',
  'affectedPartCount', 'syntheticSampleCount', 'activeUntil'
]);
const VERIFIED_TRUST_FIELDS = Object.freeze([
  'schemaVersion', 'status', 'incidentId', 'calibrationEligible',
  'hardObservedOuttransportEligible', 'affectedPartCount', 'syntheticSampleCount', 'activeUntil'
]);
const RECONSTRUCTION_INCIDENT_ID = 'RRGAP-2026-08-29-CANDIDATE-G-01';

function finiteOrNull(value, scale = 1) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number * scale : null;
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
  modelVersion
} = {}) {
  if (!conditions?.available && conditions?.available !== undefined) throw new Error('De offentlige forhold er ikke tilgængelige.');
  const displayedManifest = conditions?.recoveryFallbackActive === true
    ? manifest?.recoveryFallback
    : manifest;
  if (displayedManifest?.datasetId && conditions?.datasetId && displayedManifest.datasetId !== conditions.datasetId) {
    throw new Error('Manifest og offentlige forhold tilhører ikke samme datasæt.');
  }
  if (String(coastalPart?.zoneId || '') !== String(zoneId || '')) {
    throw new Error('Kystdelen tilhører ikke den valgte zone.');
  }

  const zone = conditions?.zones?.[zoneId];
  const weather = zone?.current;
  const modeState = coastalPart?.current?.[mode];
  if (!weather || !modeState?.components || !Number.isFinite(Number(modeState.score))) {
    throw new Error('Den valgte kystdel mangler en komplet aktuel score.');
  }
  const dataQualityFlags = publicForecastQuality({ manifest, conditions, coastalPart });

  const history = zone?.history || {};
  const forecastSnapshot = createForecastSnapshotReference({
    manifest: displayedManifest,
    conditions,
    validAt: coastalPart?.current?.time || startedAt,
    capturedAt: startedAt
  });
  const calibrationFeatures = createCalibrationFeatureSnapshot({
    appVersion,
    modelVersion,
    totalScore: modeState.score,
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
    forecastCalibrationEligible: dataQualityFlags.length === 0,
    dataQualityFlags
  });
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
  if (manifestTrust.schemaVersion !== 1) throw new Error('RavScore-evidensen bruger en ukendt kontrakt.');
  if (manifestTrust.status === 'VERIFIED_ONLY') {
    if (Object.keys(manifestTrust).sort().join(',') !== [...VERIFIED_TRUST_FIELDS].sort().join(',')
      || manifestTrust.calibrationEligible !== true
      || manifestTrust.hardObservedOuttransportEligible !== true
      || manifestTrust.incidentId !== null
      || Number(manifestTrust.affectedPartCount) !== 0
      || Number(manifestTrust.syntheticSampleCount) !== 0
      || manifestTrust.activeUntil !== null) {
      throw new Error('Målt RavScore-evidens har en inkonsistent tillidsmarkering.');
    }
    return false;
  }
  if (manifestTrust.status === 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE') {
    if (Object.keys(manifestTrust).sort().join(',') !== [...TRUST_FIELDS].sort().join(',')
      || manifestTrust.incidentId !== RECONSTRUCTION_INCIDENT_ID
      || manifestTrust.decisionId !== 'DEC-0109'
      || manifestTrust.method !== 'LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH'
      || manifestTrust.evidenceClassification !== 'RECONSTRUCTED_DERIVED_NOT_MEASURED'
      || manifestTrust.calibrationEligible !== false
      || manifestTrust.hardObservedOuttransportEligible !== false
      || !SHA256_PATTERN.test(String(manifestTrust.descriptorSha256 || ''))
      || !Number.isInteger(manifestTrust.affectedPartCount)
      || manifestTrust.affectedPartCount < 1 || manifestTrust.affectedPartCount > 673
      || !Number.isInteger(manifestTrust.syntheticSampleCount)
      || manifestTrust.syntheticSampleCount < manifestTrust.affectedPartCount
      || !Number.isFinite(Date.parse(String(manifestTrust.activeUntil || '')))) {
      throw new Error('Rekonstrueret RavScore-evidens har en inkonsistent tillidsmarkering.');
    }
    return true;
  }
  throw new Error('RavScore-evidensen har en ukendt tillidsstatus.');
}

function conditionsEvidenceTrust(conditions, coastalPart) {
  const values = [
    conditions?.ravScoreEvidenceTrust,
    conditions?.coastalParts?.evidenceTrust,
    coastalPart?.candidateG?.evidenceTrust
  ];
  if (values.some(value => value === undefined || value === null)
    || values.some(value => trustSignature(value) !== trustSignature(values[0]))) {
    throw new Error('Start-, detalje- og den valgte kystdels RavScore-evidens matcher ikke.');
  }
  return values[0];
}

function publicForecastQuality({ manifest, conditions, coastalPart }) {
  const conditionsTrust = conditionsEvidenceTrust(conditions, coastalPart);
  if (conditions?.recoveryFallbackActive === true) {
    const fallback = manifest?.recoveryFallback;
    const displayedFallback = conditions?.recoveryFallback;
    if (fallback?.schemaVersion !== 2
      || fallback?.status !== 'active-last-verified'
      || !fallback.datasetId || fallback.datasetId !== conditions?.datasetId
      || !fallback.generatedAt || fallback.generatedAt !== conditions?.generatedAt
      || !SHA256_PATTERN.test(String(fallback.publicConditionsSha256 || ''))
      || !SHA256_PATTERN.test(String(fallback.publicConditionDetailsSha256 || ''))
      || !SHA256_PATTERN.test(String(fallback.ravScoreEvidenceTrustSha256 || ''))
      || displayedFallback?.datasetId !== fallback.datasetId
      || displayedFallback?.generatedAt !== fallback.generatedAt
      || displayedFallback?.publicConditionsSha256 !== fallback.publicConditionsSha256
      || displayedFallback?.publicConditionDetailsSha256 !== fallback.publicConditionDetailsSha256
      || displayedFallback?.ravScoreEvidenceTrustSha256 !== fallback.ravScoreEvidenceTrustSha256
      || trustSignature(displayedFallback?.ravScoreEvidenceTrust)
        !== trustSignature(fallback.ravScoreEvidenceTrust)) {
      throw new Error('Den viste Candidate G-nødvisning mangler sin eksakte manifest- og hashbinding.');
    }
    const reconstructed = assertEvidenceTrustPair(fallback.ravScoreEvidenceTrust, conditionsTrust);
    return [
      PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG,
      ...(reconstructed ? [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG] : [])
    ];
  }
  const reconstructed = assertEvidenceTrustPair(manifest?.ravScoreEvidenceTrust, conditionsTrust);
  return reconstructed ? [RECONSTRUCTED_RAVSCORE_QUALITY_FLAG] : [];
}
