import {
  createCalibrationFeatureSnapshot,
  createForecastSnapshotReference,
  createTripStartRecord
} from './trip-evidence-contract.js?v=4.0.262';

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
  if (manifest?.datasetId && conditions?.datasetId && manifest.datasetId !== conditions.datasetId) {
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
    reasonCodes: []
  });

  return createTripStartRecord({
    tripId,
    startedAt,
    mode,
    zoneId,
    coastalPartId,
    forecastSnapshot,
    calibrationFeatures
  });
}
