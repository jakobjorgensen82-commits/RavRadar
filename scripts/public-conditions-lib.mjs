import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { selectLatestLocalScoreRowAtOrBefore } from './lib/local-current-reference.mjs';
import { selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { forecastDateKeyInTimeZone } from '../js/core/forecast-calendar.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_COASTAL_PART_COUNT,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  RAVSCORE_PUBLIC_ZONE_COUNT,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
  ravScorePublicHorizonValidUntil,
} from '../js/core/ravscore-public-runtime-contract.js';
import {
  assertExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';
import {
  assertRavScoreVerifiedEvidenceTrust,
  ravScoreVerifiedEvidenceTrust,
} from '../js/core/ravscore-evidence-trust-contract.js';

const HOURLY_FIELDS = [
  'time','windSpeedMps','windDirectionDeg','airTemperatureC','waveHeightM','waveDirectionDeg','wavePeriodS',
  'waterLevelCm','waterLevelTrendCm3h','currentSpeedMps','currentDirectionDeg','waterTemperatureC'
];
const CURRENT_FIELDS = HOURLY_FIELDS.filter(key => key !== 'time' && key !== 'airTemperatureC');
// These two weather-derived values are retained only as model-independent trip
// covariates. Candidate/shadow state and transport-history diagnostics belong in
// the private runtime and must not inflate or ambiguate the public startup file.
const HISTORY_FIELDS = ['maxWave24hM','hoursSinceHighEnergy'];
const STARTUP_SCORE_FIELDS = [
  'available','status','score','winningPartId','winningPartName','scoreSpread','comparisonPartCount',
  'validPartCount','expectedPartCount'
];
const SCORE_FIELDS = [...STARTUP_SCORE_FIELDS, 'baseScore', 'level', 'label', 'scoreProfileId'];
const PART_FIELDS = ['id','zoneId','name','marineCoverage','waterPoint','landPoint','onshoreDirectionDeg','onshoreDirectionSource'];
const PUBLIC_FORECAST_MODES = ['waders', 'beach'];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const safeCount = value => Number.isSafeInteger(value) && value >= 0;
const scoreNumber = value => finite(value) && value >= 0 && value <= 100;
const WEATHER_NUMBER_RULES = Object.freeze({
  windSpeedMps: [0, Number.POSITIVE_INFINITY],
  windDirectionDeg: [0, 360],
  airTemperatureC: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waveHeightM: [0, Number.POSITIVE_INFINITY],
  waveDirectionDeg: [0, 360],
  wavePeriodS: [0, Number.POSITIVE_INFINITY],
  waterLevelCm: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waterLevelTrendCm3h: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  currentSpeedMps: [0, Number.POSITIVE_INFINITY],
  currentDirectionDeg: [0, 360],
  waterTemperatureC: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
});

const pick = (source, fields) => Object.fromEntries(fields
  .filter(key => source?.[key] !== undefined)
  .map(key => [key, source[key]]));
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
const requiredCount = (value, label) => {
  if (!safeCount(value)) throw new Error(`${label} must be a strict non-negative safe integer`);
  return value;
};

function publicModelBinding(full) {
  const canonical = ravScoreModelBinding();
  const source = full?.coastalParts;
  if (!source) return canonical;
  const declared = source.modelBinding ?? source.ravScoreModelBinding ?? null;
  assertRavScoreModelBinding(declared, 'coastal-parts RavScore model binding');
  const profile = source.scoreProfile;
  if (!profile || profile.activeProfileId !== RAVSCORE_MODEL_ID
    || profile.stateSchemaVersion !== RAVSCORE_STATE_SCHEMA_VERSION
    || profile.variantId !== canonical.variantId
    || profile.profileId !== RAVSCORE_PROFILE_ID
    || profile.componentSchemaId !== canonical.componentSchemaId
    || profile.explanationSchemaId !== canonical.explanationSchemaId
    || profile.rankingPolicyId !== canonical.rankingPolicyId
    || profile.bestTimePolicyId !== canonical.bestTimePolicyId
    || profile.presentationPolicyId !== canonical.presentationPolicyId
    || profile.modelContractSha256 !== RAVSCORE_MODEL_CONTRACT_SHA256
    || profile.modelBundleSha256 !== RAVSCORE_MODEL_BUNDLE_SHA256) {
    throw new Error('coastal-parts score profile is not the integrated public RavScore model');
  }
  return canonical;
}

function publicEvidenceTrust(full) {
  const source = full?.coastalParts;
  if (!source) return ravScoreVerifiedEvidenceTrust();
  return assertRavScoreVerifiedEvidenceTrust(
    source.evidenceTrust,
    'coastal-parts RavScore evidence trust',
  );
}

function projectModelBinding(value) {
  assertRavScoreModelBinding(value, 'public RavScore model binding');
  return ravScoreModelBinding();
}

function projectCurrentProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.distanceKm !== undefined && value.distanceKm !== null
    && (!finite(value.distanceKm) || value.distanceKm < 0 || value.distanceKm > 15)) {
    throw new Error('Public current provenance distance must be a strict finite number in range');
  }
  if (value.vectorSemanticsVersion !== undefined && value.vectorSemanticsVersion !== null
    && (!Number.isSafeInteger(value.vectorSemanticsVersion)
      || value.vectorSemanticsVersion < 1)) {
    throw new Error('Public current provenance vector semantics must be a strict positive integer');
  }
  return pick(value, [
    'status','reason','provider','collection','source','sourceClass','controlledLivePilot',
    'temporalResolution','verticalLayer','vectorSelection','vectorSemanticsVersion','method','fallback',
    'distanceKm'
  ]);
}

function projectWeather(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.time !== undefined && (typeof value.time !== 'string'
    || !Number.isFinite(Date.parse(value.time)))) {
    throw new Error('Public weather time must be an explicit valid string');
  }
  const weather = {};
  if (value.time !== undefined) weather.time = value.time;
  for (const [field, [minimum, maximum]] of Object.entries(WEATHER_NUMBER_RULES)) {
    if (value[field] === undefined) continue;
    if (value[field] === null) {
      weather[field] = null;
      continue;
    }
    if (!finite(value[field]) || value[field] < minimum || value[field] > maximum) {
      throw new Error(`Public weather ${field} must be a strict finite number in range or null`);
    }
    weather[field] = value[field];
  }
  const provenance = projectCurrentProvenance(value.currentProvenance);
  return provenance ? { ...weather, currentProvenance: provenance } : weather;
}

function projectComponents(value, { required = false } = {}) {
  const projected = value && typeof value === 'object' && !Array.isArray(value)
    ? pick(value, ['huntability','transport','release']) : {};
  const keys = ['huntability','transport','release'];
  if ((required && !keys.every(key => Object.hasOwn(projected, key)))
    || Object.values(projected).some(component => !scoreNumber(component))) {
    throw new Error('Public available RavScore components must be strict finite numbers from 0 to 100');
  }
  return projected;
}

function projectComponentReasons(value) {
  return Object.fromEntries(['huntability','transport','release'].map(key => [key, strings(value?.[key])]));
}

function projectWeights(value, { maximum = 100 } = {}) {
  const projected = value && typeof value === 'object' && !Array.isArray(value)
    ? pick(value, ['huntability','transport','release']) : {};
  if (Object.values(projected).some(number => !finite(number) || number < 0 || number > maximum)) {
    throw new Error('Public RavScore weight or contribution must be a strict finite number');
  }
  return projected;
}

function assertOptionalFiniteFields(value, rules, label) {
  for (const [field, [minimum, maximum]] of Object.entries(rules)) {
    const candidate = value?.[field];
    if (candidate === undefined || candidate === null) continue;
    if (!finite(candidate) || candidate < minimum || candidate > maximum) {
      throw new Error(`${label} ${field} must be a strict finite number in range or null`);
    }
  }
}

function assertOptionalBooleanFields(value, fields, label) {
  for (const field of fields) {
    if (value?.[field] !== undefined && value[field] !== null
      && typeof value[field] !== 'boolean') {
      throw new Error(`${label} ${field} must be an exact boolean or null`);
    }
  }
}

function assertOptionalTimeFields(value, fields, label) {
  for (const field of fields) {
    if (value?.[field] !== undefined && value[field] !== null
      && (typeof value[field] !== 'string' || !Number.isFinite(Date.parse(value[field])))) {
      throw new Error(`${label} ${field} must be a valid time string or null`);
    }
  }
}

function projectTransportDiagnostics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  assertOptionalFiniteFields(value, {
    currentAlignment: [-1, 1],
    currentDirectionDifferenceDeg: [0, 180],
    supplyPotential: [0, 100],
    transportPotential: [0, 100],
    lastMileDeliveryFactor: [0.85, 1],
    lastMileWaveActivity: [0, 1],
    lastMileApproach: [0, 1],
    lastMileNormalAlignment: [-1, 1],
    lastMileTangentAlignment: [-1, 1],
    lastMileDirectionalCoherence: [0, 1],
    currentMemoryCoverageHours: [0, Number.POSITIVE_INFINITY],
    currentMemoryWindowHours: [0, Number.POSITIVE_INFINITY],
  }, 'Public transport diagnostics');
  assertOptionalBooleanFields(value, [
    'currentVerified','lastMileStructuralUncertainty','lastMilePhysicalDeliveryResolved',
    'currentMemoryReady','windDirectlyIncluded','outflowWholeScoreGateApplied',
    'resolvedSurfZoneIncluded',
  ], 'Public transport diagnostics');
  assertOptionalTimeFields(value, ['currentReferenceAt'], 'Public transport diagnostics');
  return pick(value, [
    'engine','measurementStatus','currentVerified','currentTransition','currentAlignment',
    'currentDirectionDifferenceDeg','currentDirectionClass','supplyPotential','transportPotential',
    'lastMileStatus','lastMileScoreEffect','lastMileStructuralUncertainty',
    'lastMileDeliveryFactor','lastMileWaveActivity','lastMileApproach',
    'lastMileNormalAlignment','lastMileTangentAlignment',
    'lastMileDirectionalCoherence','lastMilePhysicalDeliveryResolved',
    'currentReferenceAt','currentMemoryReady','currentMemoryStatus',
    'currentMemoryCoverageHours','currentMemoryWindowHours',
    'windDirectlyIncluded','outflowWholeScoreGateApplied','resolvedSurfZoneIncluded'
  ]);
}

function projectMobilisationDiagnostics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  assertOptionalFiniteFields(value, {
    mobilisationPotential: [0, 100],
  }, 'Public mobilisation diagnostics');
  assertOptionalTimeFields(value, ['waveLastVerifiedAt'], 'Public mobilisation diagnostics');
  return pick(value, ['mobilisationPotential','waveLastVerifiedAt','waveMemoryStatus']);
}

function projectWaterLevelContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  assertOptionalFiniteFields(value, {
    currentRelationDeadbandMps: [0, Number.POSITIVE_INFINITY],
    scoreEffectPoints: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  }, 'Public water-level context');
  assertOptionalBooleanFields(value, ['available'], 'Public water-level context');
  return pick(value, [
      'available','phase','interpretationCode','jointContextCode','currentRelation',
      'currentRelationDeadbandMps','trendSemantics','scoreEffectPoints','transportEffect'
    ]);
}

function projectUncertainty(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    ...pick(value, ['dataStatus','modelMaturity','modelConfidence']),
    limitations: strings(value.limitations),
  };
}

function projectExplanation(value, binding) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  assertOptionalFiniteFields(value, {
    rawScore: [0, 100],
    roundedScore: [0, 100],
    finalScore: [0, 100],
    wadersHuntabilityMaximum: [0, 100],
  }, 'Public RavScore explanation');
  for (const field of ['roundedScore', 'finalScore']) {
    if (value[field] !== undefined && value[field] !== null
      && !Number.isSafeInteger(value[field])) {
      throw new Error(`Public RavScore explanation ${field} must be a strict safe integer`);
    }
  }
  assertOptionalBooleanFields(value, [
    'wadersHuntabilityLimitApplied','scoreIsSafetyAdvice','scoreIsFindProbability',
  ], 'Public RavScore explanation');
  const explanationBinding = pick(value, Object.keys(binding));
  if (Object.keys(explanationBinding).length) projectModelBinding(explanationBinding);
  const transport = projectTransportDiagnostics(value.transportDiagnostics);
  const mobilisation = projectMobilisationDiagnostics(value.mobilisationDiagnostics);
  const water = projectWaterLevelContext(value.waterLevelContext);
  const uncertainty = projectUncertainty(value.uncertainty);
  return {
    ...binding,
    ...pick(value, [
      'switchVersion','rawScore','roundedScore','finalScore','wadersHuntabilityMaximum',
      'wadersHuntabilityLimitApplied','formula','scoreMeaning','scoreIsSafetyAdvice','scoreIsFindProbability'
    ]),
    weights: projectWeights(value.weights, { maximum: 1 }),
    contributions: projectWeights(value.contributions),
    ...(transport ? { transportDiagnostics: transport } : {}),
    ...(mobilisation ? { mobilisationDiagnostics: mobilisation } : {}),
    ...(water ? { waterLevelContext: water } : {}),
    ...(uncertainty ? { uncertainty } : {}),
  };
}

function compactCoverageParts(parts) {
  return (parts || []).map(part => {
    if (!scoreNumber(part?.score)) {
      throw new Error('Public coastal-part comparison score must be a strict number from 0 to 100');
    }
    return pick(part, ['partId','name','score']);
  });
}

function projectUnavailableParts(parts) {
  return (parts || []).map(part => pick(part, ['partId','name','code','reason']));
}

function projectPublicScore(value, binding, { startup = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value ?? null;
  if (value.available !== true && value.available !== false) {
    throw new Error('Public RavScore availability must be an exact boolean');
  }
  if (value.available === true && !scoreNumber(value.score)) {
    throw new Error('Public available RavScore must be a strict number from 0 to 100');
  }
  if (value.available === false && value.score !== null) {
    throw new Error('Public unavailable RavScore must carry score null');
  }
  if (value.baseScore !== undefined && value.baseScore !== null && !scoreNumber(value.baseScore)) {
    throw new Error('Public RavScore base score must be a strict number from 0 to 100');
  }
  if (value.scoreSpread !== undefined && value.scoreSpread !== null
    && (!finite(value.scoreSpread) || value.scoreSpread < 0 || value.scoreSpread > 100)) {
    throw new Error('Public RavScore spread must be a strict finite number from 0 to 100');
  }
  for (const field of ['comparisonPartCount', 'validPartCount', 'expectedPartCount']) {
    if (value[field] !== undefined && value[field] !== null && !safeCount(value[field])) {
      throw new Error(`Public RavScore ${field} must be a strict non-negative safe integer`);
    }
  }
  const declared = value.modelBinding
    ?? (value.explanation && typeof value.explanation === 'object'
      ? pick(value.explanation, Object.keys(binding)) : null);
  projectModelBinding(declared);
  const score = {
    ...pick(value, startup ? STARTUP_SCORE_FIELDS : SCORE_FIELDS),
    scoreProfileId: RAVSCORE_MODEL_ID,
    modelBinding: binding,
    components: projectComponents(value.components, { required: value.available === true }),
  };
  const weather = projectWeather(value.weather);
  if (weather) score.weather = weather;
  if (Array.isArray(value.parts)) score.parts = compactCoverageParts(value.parts);
  if (!startup) {
    score.componentReasons = projectComponentReasons(value.componentReasons);
    score.reasons = strings(value.reasons);
    if (value.unavailability && typeof value.unavailability === 'object') {
      for (const field of ['validPartCount', 'expectedPartCount']) {
        if (value.unavailability[field] !== undefined
          && value.unavailability[field] !== null
          && !safeCount(value.unavailability[field])) {
          throw new Error(`Public RavScore unavailability ${field} must be a strict safe integer`);
        }
      }
      score.unavailability = pick(value.unavailability, ['available','code','messageDa','policy','validPartCount','expectedPartCount']);
    }
    if (Array.isArray(value.unavailableParts)) score.unavailableParts = projectUnavailableParts(value.unavailableParts);
    const explanation = projectExplanation(value.explanation, binding);
    if (explanation) score.explanation = explanation;
  }
  return score;
}

function projectFlowPoints(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const sources = value.sources && typeof value.sources === 'object'
    ? pick(value.sources, ['current','wind']) : {};
  const currentMetadata = value.sourceMetadata?.current;
  if (currentMetadata !== undefined && (!currentMetadata
    || typeof currentMetadata !== 'object' || Array.isArray(currentMetadata)
    || typeof currentMetadata.source !== 'string'
    || typeof currentMetadata.sourceClass !== 'string'
    || !finite(currentMetadata.distanceKm)
    || currentMetadata.distanceKm < 0
    || currentMetadata.distanceKm > 15)) {
    throw new Error('Public current-arrow source metadata is invalid');
  }
  return {
    ...pick(value, ['current','wind']),
    sources,
    ...(currentMetadata ? { sourceMetadata: { current: pick(currentMetadata, [
      'source','sourceClass','distanceKm',
    ]) } } : {}),
  };
}

function projectPart(value, id, binding, { startup = false, evidenceTrust } = {}) {
  const base = {
    ...pick(value, PART_FIELDS),
    id: value?.id ?? id,
    ravScoreEvidenceTrust: evidenceTrust,
  };
  const flowPoints = projectFlowPoints(value?.flowPoints);
  if (flowPoints) base.flowPoints = flowPoints;
  if (!startup && value?.current && typeof value.current === 'object') {
    const weather = projectWeather(value.current.weather);
    base.current = {
      time: value.current.time ?? null,
      ...(weather ? { weather } : {}),
      waders: projectPublicScore(value.current.waders, binding),
      beach: projectPublicScore(value.current.beach, binding),
    };
  }
  return base;
}

function projectScoreProfile(value, binding) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const projected = {
    ...pick(value, [
      'schemaVersion','switchVersion','requestedProfileId','activeProfileId','stateSchemaVersion','variantId',
      'profileId','componentSchemaId','explanationSchemaId','rankingPolicyId','bestTimePolicyId',
      'presentationPolicyId','modelContractSha256','modelBundleSha256','rollbackModelId',
      'runtimeFallbackModelId','modelCoverageReady','modelMemoryReady','modelMigrationReady',
      'memoryReferenceScope','activationState','publicAvailabilityPolicy','crossModelRuntimeFallbackAllowed',
      'automaticActivationAllowed'
    ]),
    advisories: strings(value.advisories),
  };
  assertExactPublicRavScoreProfile(projected, binding, 'Public score profile');
  return projected;
}

function projectScoreAvailability(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.allZonesActive !== 'boolean') {
    throw new Error('Public score availability allZonesActive must be an exact boolean');
  }
  for (const field of ['activeZoneCount', 'unavailableZoneCount', 'totalZoneCount']) {
    if (!safeCount(value[field])) {
      throw new Error(`Public score availability ${field} must be a strict non-negative safe integer`);
    }
  }
  return {
    ...pick(value, [
      'schemaVersion','policy','allZonesActive','activeZoneCount','unavailableZoneCount','totalZoneCount','evaluatedAt'
    ]),
    unavailableZones: Array.isArray(value.unavailableZones) ? value.unavailableZones.map(zone => ({
      ...pick(zone, ['zoneId','zoneName']),
      modes: strings(zone.modes),
      reasons: strings(zone.reasons),
    })) : [],
  };
}

function currentLocalRow(zone, source, full) {
  const explicit = Date.parse(zone?.currentReferenceAt || '');
  const exact = Number.isFinite(explicit)
    ? (zone?.hourly || []).find(row => Date.parse(row?.time || '') === explicit)
    : null;
  return exact || selectLatestLocalScoreRowAtOrBefore(
    zone?.hourly,
    full?.productionReferenceAt || source?.productionReferenceAt || full?.generatedAt || source?.generatedAt,
  );
}

function projectZoneRow(row, binding, { startup = false } = {}) {
  if (!row) return null;
  return {
    time: row.time,
    waders: projectPublicScore(row.waders, binding, { startup }),
    beach: projectPublicScore(row.beach, binding, { startup }),
  };
}

export function buildStartupCoastalParts(full) {
  const source = full?.coastalParts;
  if (!source) return null;
  const binding = publicModelBinding(full);
  const evidenceTrust = publicEvidenceTrust(full);
  const scoreProfile = projectScoreProfile(source.scoreProfile, binding);
  const scoreAvailability = projectScoreAvailability(source.scoreAvailability);
  const zones = {};
  const winnerIds = new Set();
  for (const [zoneId, zone] of Object.entries(source.zones || {})) {
    const row = currentLocalRow(zone, source, full);
    for (const mode of PUBLIC_FORECAST_MODES) if (row?.[mode]?.winningPartId) winnerIds.add(row[mode].winningPartId);
    const startupRow = projectZoneRow(row, binding, { startup: true });
    zones[zoneId] = {
      expectedPartCount: requiredCount(zone.expectedPartCount, 'Public zone expectedPartCount'),
      scoredPartCount: requiredCount(zone.scoredPartCount, 'Public zone scoredPartCount'),
      currentReferenceAt: startupRow?.time || null,
      hourly: startupRow ? [startupRow] : [],
    };
  }
  const parts = Object.fromEntries([...winnerIds]
    .filter(id => source.parts?.[id])
    .map(id => [id, projectPart(source.parts[id], id, binding, {
      startup: true,
      evidenceTrust,
    })]));
  return {
    schemaVersion: source.schemaVersion,
    enabled: source.enabled === true,
    datasetVersion: source.datasetVersion || null,
    sourceRunId: source.sourceRunId || null,
    generatedAt: source.generatedAt || full?.generatedAt || null,
    productionReferenceAt: full?.productionReferenceAt || source.productionReferenceAt || null,
    marginPoints: source.marginPoints || 7,
    modelBinding: binding,
    evidenceTrust,
    scoreProfile,
    scoreAvailability,
    expectedPartCount: requiredCount(source.expectedPartCount, 'Public root expectedPartCount'),
    scoredPartCount: requiredCount(source.scoredPartCount, 'Public root scoredPartCount'),
    parts,
    zones,
  };
}

function buildDetailedCoastalParts(full) {
  const source = full?.coastalParts;
  if (!source) return null;
  const binding = publicModelBinding(full);
  const evidenceTrust = publicEvidenceTrust(full);
  const zones = Object.fromEntries(Object.entries(source.zones || {}).map(([zoneId, zone]) => {
    const current = currentLocalRow(zone, source, full);
    return [zoneId, {
      expectedPartCount: requiredCount(zone.expectedPartCount, 'Public zone expectedPartCount'),
      scoredPartCount: requiredCount(zone.scoredPartCount, 'Public zone scoredPartCount'),
      currentReferenceAt: current?.time || null,
      hourly: (zone.hourly || []).map(row => projectZoneRow(row, binding)),
    }];
  }));
  const parts = Object.fromEntries(Object.entries(source.parts || {})
    .map(([id, part]) => [id, projectPart(part, id, binding, { evidenceTrust })]));
  return {
    schemaVersion: source.schemaVersion,
    enabled: source.enabled === true,
    datasetVersion: source.datasetVersion || null,
    sourceRunId: source.sourceRunId || null,
    generatedAt: source.generatedAt || full?.generatedAt || null,
    productionReferenceAt: full?.productionReferenceAt || source.productionReferenceAt || null,
    marginPoints: source.marginPoints || 7,
    modelBinding: binding,
    evidenceTrust,
    scoreProfile: projectScoreProfile(source.scoreProfile, binding),
    scoreAvailability: projectScoreAvailability(source.scoreAvailability),
    expectedPartCount: requiredCount(source.expectedPartCount, 'Public root expectedPartCount'),
    scoredPartCount: requiredCount(source.scoredPartCount, 'Public root scoredPartCount'),
    parts,
    zones,
  };
}

function publicForecastDates(full) {
  return [...new Set(Object.values(full?.zones || {})
    .flatMap(zone => zone?.forecast?.hourly || [])
    .map(row => {
      try { return forecastDateKeyInTimeZone(row?.time); } catch { return null; }
    })
    .filter(Boolean))].sort().slice(0, 5);
}

function publicPartsByZone(source) {
  const byZone = new Map();
  for (const part of Object.values(source?.parts || {})) {
    if (!part?.zoneId) continue;
    if (!byZone.has(part.zoneId)) byZone.set(part.zoneId, []);
    byZone.get(part.zoneId).push(part);
  }
  return byZone;
}

export function buildPublicNationalForecast(full) {
  const source = full?.coastalParts;
  const binding = publicModelBinding(full);
  const dates = publicForecastDates(full);
  const partsByZone = publicPartsByZone(source);
  const modes = Object.fromEntries(PUBLIC_FORECAST_MODES.map(mode => [mode, dates.map(date => {
    const ranked = Object.keys(source?.zones || {}).flatMap(zoneId => {
      const best = selectLocalBestForDay({ coastalParts: source, zoneId, mode, date, now: 0 });
      if (!best) return [];
      const declared = best.result?.modelBinding
        ?? (best.result?.explanation && typeof best.result.explanation === 'object'
          ? pick(best.result.explanation, Object.keys(binding)) : null);
      projectModelBinding(declared);
      return [addNationalRanking({ zoneId, time: best.hour.time, result: best.result }, partsByZone.get(zoneId) || [])];
    }).sort(compareNationalRankingRows).slice(0, 5);
    return {
      date,
      rows: ranked.map(row => {
        if (!scoreNumber(row?.result?.score)
          || !finite(row?.rankingScore)
          || !finite(row?.rankingDisplayScore)) {
          throw new Error('Public national ranking contains a non-numeric score');
        }
        return {
          zoneId: row.zoneId,
          time: row.time,
          score: row.result.score,
          rankingScore: row.rankingScore,
          rankingDisplayScore: row.rankingDisplayScore,
        };
      }),
    };
  })]));
  return { schemaVersion: 2, modelBinding: binding, dates, modes };
}

export function sha256Text(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function bindDocument(body, kind, binding) {
  return {
    ...body,
    ravScoreRuntime: {
      schemaVersion: RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
      kind,
      datasetId: body.datasetId,
      productionReferenceAt: body.productionReferenceAt ?? null,
      modelBinding: binding,
      payloadBodySha256: sha256Text(canonicalPublicRuntimeJson(body)),
    },
  };
}

export function buildPublicConditions(full) {
  const binding = publicModelBinding(full);
  const evidenceTrust = publicEvidenceTrust(full);
  const zones = {};
  for (const [zoneId, zone] of Object.entries(full?.zones || {})) {
    const forecast = zone?.forecast || {};
    zones[zoneId] = {
      provider: zone?.provider || null,
      providerLabel: zone?.providerLabel || null,
      flowPoints: projectFlowPoints(zone?.flowPoints),
      currentSource: zone?.sources?.current?.provider || null,
      current: pick(projectWeather(zone?.current) || {}, CURRENT_FIELDS),
      history: pick(zone?.history || {}, HISTORY_FIELDS),
      forecast: {
        provider: forecast.provider || zone?.provider || null,
        providerLabel: forecast.providerLabel || zone?.providerLabel || null,
        generatedAt: forecast.generatedAt || full?.generatedAt || null,
        validUntil: forecast.validUntil || null,
        hourly: [],
      },
    };
  }
  const body = {
    schemaVersion: 3,
    datasetId: full?.datasetId || null,
    generatedAt: full?.generatedAt || null,
    productionReferenceAt: full?.productionReferenceAt || null,
    source: 'RavRadar public runtime projection',
    ravScoreEvidenceTrust: evidenceTrust,
    nationalForecast: buildPublicNationalForecast(full),
    zones,
    coastalParts: buildStartupCoastalParts(full),
  };
  const document = bindDocument(body, RAVSCORE_PUBLIC_STARTUP_KIND, binding);
  assertPublicRuntimePrivacy(document, 'startup');
  return document;
}

export function buildPublicConditionDetails(full) {
  const binding = publicModelBinding(full);
  const evidenceTrust = publicEvidenceTrust(full);
  const zones = Object.fromEntries(Object.entries(full?.zones || {}).map(([zoneId, zone]) => {
    const forecast = zone?.forecast || {};
    return [zoneId, { forecast: {
      provider: forecast.provider || zone?.provider || null,
      providerLabel: forecast.providerLabel || zone?.providerLabel || null,
      generatedAt: forecast.generatedAt || full?.generatedAt || null,
      validUntil: forecast.validUntil || null,
        hourly: (forecast.hourly || []).map(hour => pick(projectWeather(hour) || {}, HOURLY_FIELDS)),
    } }];
  }));
  const body = {
    schemaVersion: 2,
    datasetId: full?.datasetId || null,
    generatedAt: full?.generatedAt || null,
    productionReferenceAt: full?.productionReferenceAt || null,
    ravScoreEvidenceTrust: evidenceTrust,
    zones,
    coastalParts: buildDetailedCoastalParts(full),
  };
  const document = bindDocument(body, RAVSCORE_PUBLIC_DETAILS_KIND, binding);
  assertPublicRuntimePrivacy(document, 'details');
  return document;
}

export function compactJson(value) { return `${JSON.stringify(value)}\n`; }

function allowedCoordinatePath(path) {
  return /^(startup|details)\.zones\.[^.]+\.flowPoints\.(current|wind)$/.test(path)
    || /^(startup|details)\.coastalParts\.parts\.[^.]+\.(waterPoint|landPoint)$/.test(path)
    || /^(startup|details)\.coastalParts\.parts\.[^.]+\.flowPoints\.(current|wind)$/.test(path);
}

const FORBIDDEN_PRIVATE_KEY = /^(candidateG|ravScoreModel|ravScoreState|currentState|continuationState|stateKey|samplingContextKey|transportEvidence|currentEvidence|waveEvidence|rawPayload|privatePayload|privateDiagnostic)$/i;
const FORBIDDEN_VECTOR_KEY = /^(currentUMps|currentVMps|uMps|vMps|eastwardCurrent|northwardCurrent)$/i;
const COORDINATE_KEY = /^(coordinates?|coords?|gridPoint|samplingPoint|position|latitude|longitude|lat|lon|lng)$/i;

export function assertPublicRuntimePrivacy(value, path = 'publicRuntime') {
  if (Array.isArray(value)) {
    const coordinateLike = value.length === 2 && value.every(item => typeof item === 'number' && Number.isFinite(item));
    if (coordinateLike && !allowedCoordinatePath(path)) {
      throw new Error(`Public runtime contains an unapproved coordinate-like pair at ${path}`);
    }
    value.forEach((item, index) => assertPublicRuntimePrivacy(item, `${path}[${index}]`));
    return true;
  }
  if (!value || typeof value !== 'object') return true;
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (FORBIDDEN_PRIVATE_KEY.test(key) || FORBIDDEN_VECTOR_KEY.test(key)) {
      throw new Error(`Public runtime contains forbidden private field ${nestedPath}`);
    }
    if (COORDINATE_KEY.test(key) && !allowedCoordinatePath(nestedPath)) {
      throw new Error(`Public runtime contains forbidden coordinate field ${nestedPath}`);
    }
    assertPublicRuntimePrivacy(nested, nestedPath);
  }
  return true;
}

function exactPublicHorizonTimes(productionReferenceAt) {
  const referenceMs = Date.parse(productionReferenceAt ?? '');
  if (!Number.isFinite(referenceMs)
    || new Date(referenceMs).toISOString() !== productionReferenceAt
    || new Date(referenceMs).getUTCMinutes() !== 0
    || new Date(referenceMs).getUTCSeconds() !== 0
    || new Date(referenceMs).getUTCMilliseconds() !== 0) {
    throw new Error('Public RavScore horizon requires one exact UTC production hour');
  }
  return Array.from({ length: RAVSCORE_PUBLIC_FORECAST_HOURS }, (_, index) =>
    new Date(referenceMs + index * 3_600_000).toISOString());
}

function assertExactHorizonRows(rows, expectedTimes, label, validateRow = null) {
  if (!Array.isArray(rows) || rows.length !== expectedTimes.length) {
    throw new Error(`${label} does not cover the exact public RavScore horizon`);
  }
  rows.forEach((row, index) => {
    if (!row || row.time !== expectedTimes[index]) {
      throw new Error(`${label} has a gap, duplicate or shifted public RavScore hour`);
    }
    if (validateRow) validateRow(row, index);
  });
}

export function assertCompletePublicRavScoreHorizon(full) {
  const binding = publicModelBinding(full);
  const expectedTimes = exactPublicHorizonTimes(full?.productionReferenceAt);
  const weatherZoneIds = Object.keys(full?.zones ?? {});
  const scoreZones = full?.coastalParts?.zones;
  const scoreZoneIds = scoreZones && typeof scoreZones === 'object' && !Array.isArray(scoreZones)
    ? Object.keys(scoreZones) : [];
  const parts = full?.coastalParts?.parts;
  const partIds = parts && typeof parts === 'object' && !Array.isArray(parts)
    ? Object.keys(parts) : [];
  if (weatherZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || scoreZoneIds.length !== RAVSCORE_PUBLIC_ZONE_COUNT
    || partIds.length !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || full?.coastalParts?.expectedPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || full?.coastalParts?.scoredPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || full?.coastalParts?.scoreAvailability?.allZonesActive !== true
    || scoreZoneIds.some(zoneId => !Object.hasOwn(full.zones, zoneId))
    || weatherZoneIds.some(zoneId => !Object.hasOwn(scoreZones, zoneId))) {
    throw new Error('Public RavScore horizon is not one complete 210/673 package');
  }
  let expectedPartCount = 0;
  let scoredPartCount = 0;
  for (const zoneId of weatherZoneIds) {
    assertExactHorizonRows(
      full.zones[zoneId]?.forecast?.hourly,
      expectedTimes,
      `Public weather zone ${zoneId}`,
    );
    const scoreZone = scoreZones[zoneId];
    if (!Number.isSafeInteger(scoreZone?.expectedPartCount)
      || scoreZone.expectedPartCount < 1
      || scoreZone.scoredPartCount !== scoreZone.expectedPartCount) {
      throw new Error(`Public score zone ${zoneId} lacks complete coastal-part coverage`);
    }
    expectedPartCount += scoreZone.expectedPartCount;
    scoredPartCount += scoreZone.scoredPartCount;
    assertExactHorizonRows(scoreZone.hourly, expectedTimes, `Public score zone ${zoneId}`, row => {
      for (const mode of PUBLIC_FORECAST_MODES) {
        const result = row[mode];
        if (result?.available !== true || !scoreNumber(result.score)) {
          throw new Error(`Public score zone ${zoneId} lacks ${mode} at ${row.time}`);
        }
        const declared = result.modelBinding
          ?? (result.explanation && typeof result.explanation === 'object'
            ? pick(result.explanation, Object.keys(binding)) : null);
        projectModelBinding(declared);
      }
    });
  }
  if (expectedPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT
    || scoredPartCount !== RAVSCORE_PUBLIC_COASTAL_PART_COUNT) {
    throw new Error('Public score-zone part counts do not close the 673-part package');
  }
  return Object.freeze({
    productionReferenceAt: expectedTimes[0],
    validUntil: ravScorePublicHorizonValidUntil(expectedTimes[0]),
    hourCount: expectedTimes.length,
    zoneCount: weatherZoneIds.length,
    coastalPartCount: partIds.length,
  });
}

export function buildPublicManifest(full, publicText, detailsText, coastalPartsText, zoneRegistryText) {
  if (typeof coastalPartsText !== 'string' || typeof zoneRegistryText !== 'string') {
    throw new Error('Public manifest requires the exact coastal-parts and zone-registry bytes');
  }
  const publicDocument = JSON.parse(publicText);
  const detailsDocument = JSON.parse(detailsText);
  const zoneRegistryDocument = JSON.parse(zoneRegistryText);
  const binding = publicModelBinding(full);
  const evidenceTrust = publicEvidenceTrust(full);
  const scoreHorizon = assertCompletePublicRavScoreHorizon(full);
  assertPublicRuntimeEnvelope(publicDocument, {
    kind: RAVSCORE_PUBLIC_STARTUP_KIND,
    datasetId: full?.datasetId || null,
    productionReferenceAt: full?.productionReferenceAt || null,
    modelBinding: binding,
    label: 'startup payload',
  });
  assertPublicRuntimeEnvelope(detailsDocument, {
    kind: RAVSCORE_PUBLIC_DETAILS_KIND,
    datasetId: full?.datasetId || null,
    productionReferenceAt: full?.productionReferenceAt || null,
    modelBinding: binding,
    label: 'details payload',
  });
  if (sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(publicDocument)))
      !== publicDocument.ravScoreRuntime.payloadBodySha256
    || sha256Text(canonicalPublicRuntimeJson(publicRuntimeDocumentBody(detailsDocument)))
      !== detailsDocument.ravScoreRuntime.payloadBodySha256) {
    throw new Error('Public payload body hash does not match its runtime envelope');
  }
  assertPublicRuntimePrivacy(publicDocument, 'startup');
  assertPublicRuntimePrivacy(detailsDocument, 'details');
  const generatedAt = full?.generatedAt || new Date().toISOString();
  const publicConditionsSha256 = sha256Text(publicText);
  const publicConditionDetailsSha256 = sha256Text(detailsText);
  const publicConditionsBytes = Buffer.byteLength(publicText);
  const publicConditionDetailsBytes = Buffer.byteLength(detailsText);
  const registeredZoneIds = (Array.isArray(zoneRegistryDocument?.features)
    ? zoneRegistryDocument.features : [])
    .map(feature => feature?.properties?.id);
  const activeZoneIds = (Array.isArray(zoneRegistryDocument?.features)
    ? zoneRegistryDocument.features : [])
    .filter(feature => feature?.properties?.zoneStatus === 'active')
    .map(feature => feature?.properties?.id);
  const fullZoneIds = Object.keys(full?.zones || {});
  if (zoneRegistryDocument?.type !== 'FeatureCollection'
    || registeredZoneIds.some(zoneId => typeof zoneId !== 'string' || !zoneId)
    || new Set(registeredZoneIds).size !== registeredZoneIds.length
    || fullZoneIds.some(zoneId => !activeZoneIds.includes(zoneId))) {
    throw new Error('Zone registry does not contain every public runtime zone as an active identity');
  }
  const coastalPartsSha256 = sha256Text(coastalPartsText);
  const coastalPartsBytes = Buffer.byteLength(coastalPartsText);
  const zoneRegistrySha256 = sha256Text(zoneRegistryText);
  const zoneRegistryBytes = Buffer.byteLength(zoneRegistryText);
  const manifest = {
    schemaVersion: 4,
    datasetId: full?.datasetId || null,
    generatedAt,
    productionReferenceAt: full?.productionReferenceAt || null,
    validUntil: scoreHorizon.validUntil,
    zoneCount: Object.keys(full?.zones || {}).length,
    coastalPartCount: requiredCount(
      full?.coastalParts?.expectedPartCount,
      'Public manifest coastalPartCount',
    ),
    conditionsPath: './public-conditions.json',
    conditionDetailsPath: './public-condition-details.json',
    coastalPartsPath: './coastal-parts-v2.json',
    coastalPartsSha256,
    coastalPartsBytes,
    zoneRegistryPath: './data/zones.geojson',
    zoneRegistrySha256,
    zoneRegistryBytes,
    zoneRegistryFeatureCount: registeredZoneIds.length,
    zoneRegistryActiveCount: activeZoneIds.length,
    ravScoreModelBinding: binding,
    ravScoreEvidenceTrust: evidenceTrust,
    ravScoreProfile: projectScoreProfile(full?.coastalParts?.scoreProfile, binding),
    ravScoreAvailability: projectScoreAvailability(full?.coastalParts?.scoreAvailability),
    publicConditionsSha256,
    publicConditionsBytes,
    publicConditionDetailsSha256,
    publicConditionDetailsBytes,
    ravScoreRuntime: {
      schemaVersion: RAVSCORE_PUBLIC_RUNTIME_SCHEMA_VERSION,
      modelBinding: binding,
      startup: {
        kind: RAVSCORE_PUBLIC_STARTUP_KIND,
        payloadBodySha256: publicDocument.ravScoreRuntime.payloadBodySha256,
        fileSha256: publicConditionsSha256,
        bytes: publicConditionsBytes,
      },
      details: {
        kind: RAVSCORE_PUBLIC_DETAILS_KIND,
        payloadBodySha256: detailsDocument.ravScoreRuntime.payloadBodySha256,
        fileSha256: publicConditionDetailsSha256,
        bytes: publicConditionDetailsBytes,
      },
    },
    complete: true,
  };
  if (![manifest.publicConditionsSha256, manifest.publicConditionDetailsSha256,
    manifest.ravScoreRuntime.startup.payloadBodySha256, manifest.ravScoreRuntime.details.payloadBodySha256,
    manifest.coastalPartsSha256, manifest.zoneRegistrySha256]
    .every(value => SHA256_PATTERN.test(String(value)))) {
    throw new Error('Public manifest has an invalid payload digest');
  }
  assertPublicRuntimeManifest(manifest.ravScoreRuntime, {
    modelBinding: binding,
    startup: {
      payloadBodySha256: publicDocument.ravScoreRuntime.payloadBodySha256,
      fileSha256: publicConditionsSha256,
      bytes: publicConditionsBytes,
    },
    details: {
      payloadBodySha256: detailsDocument.ravScoreRuntime.payloadBodySha256,
      fileSha256: publicConditionDetailsSha256,
      bytes: publicConditionDetailsBytes,
    },
    label: 'Public manifest RavScore runtime',
  });
  assertPublicRuntimePrivacy(manifest, 'manifest');
  return manifest;
}

export async function writePublicRuntimeFromFull(full, {
  publicPath = 'data/live/public-conditions.json',
  detailsPath = 'data/live/public-condition-details.json',
  manifestPath = 'data/live/manifest.json',
  coastalPartsPath = 'data/live/coastal-parts-v2.json',
  zoneRegistryPath = 'data/zones.geojson',
} = {}) {
  if (!full?.datasetId) throw new Error('conditions.json mangler datasetId.');
  const publicDocument = buildPublicConditions(full);
  const detailsDocument = buildPublicConditionDetails(full);
  const publicText = compactJson(publicDocument);
  const detailsText = compactJson(detailsDocument);
  const coastalPartsText = await fs.readFile(coastalPartsPath, 'utf8');
  const zoneRegistryText = await fs.readFile(zoneRegistryPath, 'utf8');
  JSON.parse(coastalPartsText);
  JSON.parse(zoneRegistryText);
  const manifest = buildPublicManifest(full, publicText, detailsText, coastalPartsText, zoneRegistryText);
  await fs.writeFile(publicPath, publicText);
  await fs.writeFile(detailsPath, detailsText);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { publicDocument, detailsDocument, manifest, publicText, detailsText };
}
