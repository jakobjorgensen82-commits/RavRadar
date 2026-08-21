#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateRavScore } from '../js/core/score-engine.js';
import { evaluatePhaseDWaveProcessCandidate } from '../js/core/phase-d-wave-process-candidate.js';

const LEGACY_WEIGHTS = Object.freeze({ huntability: 0.40, transport: 0.35, release: 0.25 });
const ACTIVE_WEIGHTS = Object.freeze({ huntability: 0.25, transport: 0.40, release: 0.35 });
const ACTIVE_PRIOR_WEIGHTS = Object.freeze({ huntability: 0.25, transportAndDelivery: 0.40, mobilisation: 0.35 });
const CANDIDATE_F_WEIGHTS = Object.freeze({ huntability: 0.15, transportAndDelivery: 0.50, mobilisation: 0.35 });
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const rounded = value => Math.round(clamp(value));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const round3 = value => Number(value.toFixed(3));
const utc = value => new Date(String(value));
const hours = milliseconds => milliseconds / 3_600_000;
const scoreBand = score => score >= 75 ? 'good' : score >= 55 ? 'fair' : score >= 35 ? 'weak' : 'poor';

function parseArguments(args) {
  const valueAfter = flag => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  const positional = args.filter((value, index) =>
    !value.startsWith('--') && !['--output', '--summary'].includes(args[index - 1]));
  return {
    selfTest: args.includes('--self-test'),
    forcingPath: positional[0] || null,
    wavePath: positional[1] || null,
    windPath: positional[2] || null,
    outputPath: valueAfter('--output'),
    summaryPath: valueAfter('--summary'),
  };
}

function waveFromDirection(alignment) {
  const difference = Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI;
  return (difference + 180) % 360;
}

function currentToDirection(alignment) {
  return Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI;
}

function windFromDirection(alignment) {
  return (Math.acos(clamp(alignment, -1, 1)) * 180 / Math.PI + 180) % 360;
}

function candidateF(candidate) {
  const components = candidate.components;
  const additive = components.huntability * CANDIDATE_F_WEIGHTS.huntability
    + components.transportAndDelivery * CANDIDATE_F_WEIGHTS.transportAndDelivery
    + components.mobilisation * CANDIDATE_F_WEIGHTS.mobilisation;
  return {
    additiveScore: round3(additive),
    score: rounded(additive * candidate.gateFactor),
  };
}

function eventHistory(event, sampleTime, samples, windSamples) {
  const at = utc(sampleTime);
  const eventEnd = utc(event.endTime);
  const previousDay = samples.filter(sample => {
    const time = utc(sample.time);
    return time <= at && hours(at - time) <= 24;
  });
  const maxWave24hM = previousDay.length ? Math.max(...previousDay.map(sample => sample.waveHeightM)) : null;
  const previousWindDay = windSamples.filter(sample => {
    const time = utc(sample.time);
    return time <= at && hours(at - time) <= 24;
  });
  const maxWind24hMps = previousWindDay.length ? Math.max(...previousWindDay.map(sample => sample.windSpeedMps)) : null;
  const duration = Math.max(0, hours(utc(event.endTime) - utc(event.startTime)));
  const age = Math.max(0, hours(at - eventEnd));
  return {
    maxWave24hM,
    maxWind24hMps,
    strongEventDurationHours: duration,
    hoursSinceStrongEventEnd: age,
    hoursSinceHighEnergy: age,
  };
}

function waterLevelTrendCm3h(sampleTime, samples) {
  const at = utc(sampleTime);
  const target = new Date(at.getTime() - 3 * 3_600_000);
  const current = samples.find(sample => utc(sample.time).getTime() === at.getTime());
  const previous = samples.find(sample => utc(sample.time).getTime() === target.getTime());
  return current && previous ? round3((current.seaLevelM - previous.seaLevelM) * 100) : null;
}

function reweightedActiveBase(result, weights) {
  const components = result.components;
  const weighted = Math.round(
    components.huntability * weights.huntability
    + components.transport * weights.transport
    + components.release * weights.release
  );
  const nonWeightOffset = result.baseScore - result.explanation.rawScore;
  return rounded(weighted + nonWeightOffset);
}

function zoneContext(part, zone) {
  return {
    id: part.finalPartId,
    coastType: part.coastType || zone.coastType,
    shallowWater: zone.shallowWater === true,
    reefs: zone.reefs === true,
    seagrass: zone.seagrass === true,
    onshoreDirectionDeg: 0,
  };
}

function summarizeRows(rows) {
  const deltas = rows.map(row => row.candidateF - row.candidateE);
  return {
    evaluations: rows.length,
    legacyMean: round3(mean(rows.map(row => row.legacy))),
    activeMean: round3(mean(rows.map(row => row.active))),
    candidateEMean: round3(mean(rows.map(row => row.candidateE))),
    candidateFMean: round3(mean(rows.map(row => row.candidateF))),
    meanDeltaFMinusE: round3(mean(deltas)),
    meanDeltaActiveMinusLegacy: round3(mean(rows.map(row => row.active - row.legacy))),
    meanDeltaFMinusActive: round3(mean(rows.map(row => row.candidateF - row.active))),
    minimumDeltaFMinusE: Math.min(...deltas),
    maximumDeltaFMinusE: Math.max(...deltas),
    raised: deltas.filter(value => value > 0).length,
    unchanged: deltas.filter(value => value === 0).length,
    lowered: deltas.filter(value => value < 0).length,
    changedBand: rows.filter(row => scoreBand(row.candidateE) !== scoreBand(row.candidateF)).length,
    changedBandLegacyToActive: rows.filter(row => scoreBand(row.legacy) !== scoreBand(row.active)).length,
    changedBandActiveToF: rows.filter(row => scoreBand(row.active) !== scoreBand(row.candidateF)).length,
    meanComponents: {
      huntability: round3(mean(rows.map(row => row.huntability))),
      transportAndDelivery: round3(mean(rows.map(row => row.transportAndDelivery))),
      mobilisation: round3(mean(rows.map(row => row.mobilisation))),
    },
    meanActiveComponents: {
      huntability: round3(mean(rows.map(row => row.activeHuntability))),
      transport: round3(mean(rows.map(row => row.activeTransport))),
      mobilisation: round3(mean(rows.map(row => row.activeMobilisation))),
    },
  };
}

function summarizeDirectionPairs(rows, onshoreKey, offshoreKey) {
  const onshore = rows.map(row => row[onshoreKey]);
  const offshore = rows.map(row => row[offshoreKey]);
  const differences = rows.map((row, index) => onshore[index] - offshore[index]);
  return {
    evaluations: rows.length,
    onshoreMean: round3(mean(onshore)),
    offshoreMean: round3(mean(offshore)),
    meanOnshoreMinusOffshore: round3(mean(differences)),
    minimumOnshoreMinusOffshore: Math.min(...differences),
    maximumOnshoreMinusOffshore: Math.max(...differences),
    onshoreHigher: differences.filter(value => value > 0).length,
    unchanged: differences.filter(value => value === 0).length,
    onshoreLower: differences.filter(value => value < 0).length,
  };
}

function compareDocuments(forcing, wave, wind, partById, zoneById) {
  assert.equal(forcing.status, 'OK');
  assert.equal(forcing.rawUvStored, false);
  assert.equal(forcing.coordinateValuesStored, false);
  assert.equal(forcing.enrichedEventCount, 12);
  assert.equal(wave.status, 'OK');
  assert.equal(wind.eventCount, 12);
  assert.equal(wind.scoreImpact, false);
  assert.equal(wind.coordinateValuesStored, false);
  const waveEvents = new Map((wave.selectedWaveWindows || []).map(event => [event.eventId, event]));
  const forcingEvents = new Map((forcing.eventCatalog || []).map(event => [event.eventId, event]));
  const windEvents = new Map((wind.events || []).map(event => [event.eventId, event]));
  const rows = [];

  for (const region of forcing.regions || []) {
    const part = partById.get(region.regionId);
    assert.ok(part, `Missing authoritative coastal part ${region.regionId}`);
    const zone = zoneById.get(part.zoneId) || {};
    for (const catalogEvent of forcingEvents.values()) {
      if (catalogEvent.regionId !== region.regionId) continue;
      const event = waveEvents.get(catalogEvent.eventId);
      assert.ok(event, `Missing wave event ${catalogEvent.eventId}`);
      const windEvent = windEvents.get(catalogEvent.eventId);
      assert.ok(windEvent, `Missing wind event ${catalogEvent.eventId}`);
      const windByTime = new Map((windEvent.samples || []).map(sample => [utc(sample.time).getTime(), sample]));
      const peak = utc(event.peakTime);
      const eventSamples = (region.samples || []).filter(sample => {
        const time = utc(sample.time);
        return time >= utc(catalogEvent.windowStart) && time <= utc(catalogEvent.windowEnd);
      });
      for (const sample of eventSamples.filter(sample => utc(sample.time) >= peak)) {
        const windSample = windByTime.get(utc(sample.time).getTime());
        if (!windSample) continue;
        for (const mode of ['waders', 'beach']) {
          const history = eventHistory(event, sample.time, eventSamples, windEvent.samples || []);
          const normalizedZone = zoneContext(part, zone);
          const active = calculateRavScore({
            mode,
            zone: normalizedZone,
            weather: {
              windSpeedMps: windSample.windSpeedMps,
              windDirectionDeg: windFromDirection(windSample.windTowardOnshoreAlignment),
              waveHeightM: sample.waveHeightM,
              wavePeriodS: sample.wavePeriodS,
              waveDirectionDeg: waveFromDirection(sample.waveOnshoreAlignment),
              currentSpeedMps: sample.currentSpeedMps,
              currentDirectionDeg: currentToDirection(sample.currentOnshoreAlignment),
              waterLevelTrendCm3h: waterLevelTrendCm3h(sample.time, eventSamples),
            },
            history,
          });
          assert.equal(active.available, true, `Active base unavailable for ${event.eventId}/${mode}`);
          assert.deepEqual(active.explanation.weights, ACTIVE_WEIGHTS);
          const candidate = evaluatePhaseDWaveProcessCandidate({
            mode,
            zone: normalizedZone,
            weather: {
              windSpeedMps: windSample.windSpeedMps,
              waveHeightM: sample.waveHeightM,
              wavePeriodS: sample.wavePeriodS,
              waveDirectionDeg: waveFromDirection(sample.waveOnshoreAlignment),
              currentSpeedMps: sample.currentSpeedMps,
              currentAlignment: sample.currentOnshoreAlignment,
            },
            history,
          });
          assert.equal(candidate.available, true, `Candidate unavailable for ${event.eventId}/${mode}`);
          const candidateFResult = candidateF(candidate);
          const evaluateDirectionPair = alignment => {
            const pairedWeather = {
              windSpeedMps: windSample.windSpeedMps,
              windDirectionDeg: windFromDirection(alignment),
              waveHeightM: sample.waveHeightM,
              wavePeriodS: sample.wavePeriodS,
              waveDirectionDeg: waveFromDirection(alignment),
              currentSpeedMps: sample.currentSpeedMps,
              currentDirectionDeg: currentToDirection(alignment),
              currentAlignment: alignment,
              waterLevelTrendCm3h: waterLevelTrendCm3h(sample.time, eventSamples),
            };
            const pairedActive = calculateRavScore({
              mode,
              zone: normalizedZone,
              weather: pairedWeather,
              history,
            });
            const pairedCandidate = evaluatePhaseDWaveProcessCandidate({
              mode,
              zone: normalizedZone,
              weather: pairedWeather,
              history,
            });
            assert.equal(pairedActive.available, true, `Paired active unavailable for ${event.eventId}/${mode}`);
            assert.equal(pairedCandidate.available, true, `Paired candidate unavailable for ${event.eventId}/${mode}`);
            return {
              active: pairedActive.baseScore,
              candidateE: pairedCandidate.candidateScores.candidateE,
              candidateF: candidateF(pairedCandidate).score,
            };
          };
          const pairedOnshore = evaluateDirectionPair(1);
          const pairedOffshore = evaluateDirectionPair(-1);
          rows.push({
            eventId: event.eventId,
            classification: catalogEvent.classification,
            mode,
            legacy: reweightedActiveBase(active, LEGACY_WEIGHTS),
            active: active.baseScore,
            candidateE: candidate.candidateScores.candidateE,
            candidateF: candidateFResult.score,
            pairedActiveOnshore: pairedOnshore.active,
            pairedActiveOffshore: pairedOffshore.active,
            pairedCandidateEOnshore: pairedOnshore.candidateE,
            pairedCandidateEOffshore: pairedOffshore.candidateE,
            pairedCandidateFOnshore: pairedOnshore.candidateF,
            pairedCandidateFOffshore: pairedOffshore.candidateF,
            activeHuntability: active.components.huntability,
            activeTransport: active.components.transport,
            activeMobilisation: active.components.release,
            huntability: candidate.components.huntability,
            transportAndDelivery: candidate.components.transportAndDelivery,
            mobilisation: candidate.components.mobilisation,
          });
        }
      }
    }
  }

  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.candidateE >= 0 && row.candidateE <= 100 && row.candidateF >= 0 && row.candidateF <= 100));
  const modes = ['waders', 'beach'];
  const classes = ['onshore-delivery', 'offshore-removal', 'conflicting-wave-current', 'alongshore-mixed'];
  const eventSummaries = [...forcingEvents.values()].flatMap(event => modes.map(mode => {
    const selected = rows.filter(row => row.eventId === event.eventId && row.mode === mode);
    return {
      eventId: event.eventId,
      regionId: event.regionId,
      classification: event.classification,
      mode,
      ...summarizeRows(selected),
    };
  }));
  const modeSummaries = modes.map(mode => ({ mode, ...summarizeRows(rows.filter(row => row.mode === mode)) }));
  const classSummaries = classes.map(classification => {
    const selected = rows.filter(row => row.classification === classification);
    return selected.length ? { classification, ...summarizeRows(selected) } : { classification, evaluations: 0 };
  });
  const classById = new Map(classSummaries.map(summary => [summary.classification, summary]));
  const onshore = classById.get('onshore-delivery');
  const offshore = classById.get('offshore-removal');
  const pairChecks = {
    candidateEOnshoreMinusOffshore: round3(onshore.candidateEMean - offshore.candidateEMean),
    candidateFOnshoreMinusOffshore: round3(onshore.candidateFMean - offshore.candidateFMean),
    candidateFWeightDeltaOnshoreMinusOffshore: round3(
      onshore.meanDeltaFMinusE - offshore.meanDeltaFMinusE
    ),
    activeOnshoreMinusOffshore: round3(onshore.activeMean - offshore.activeMean),
    activeComponentDeltaOnshoreMinusOffshore: {
      huntability: round3(onshore.meanActiveComponents.huntability - offshore.meanActiveComponents.huntability),
      transport: round3(onshore.meanActiveComponents.transport - offshore.meanActiveComponents.transport),
      mobilisation: round3(onshore.meanActiveComponents.mobilisation - offshore.meanActiveComponents.mobilisation),
    },
    candidateComponentDeltaOnshoreMinusOffshore: {
      huntability: round3(onshore.meanComponents.huntability - offshore.meanComponents.huntability),
      transportAndDelivery: round3(onshore.meanComponents.transportAndDelivery - offshore.meanComponents.transportAndDelivery),
      mobilisation: round3(onshore.meanComponents.mobilisation - offshore.meanComponents.mobilisation),
    },
  };
  assert.ok(pairChecks.candidateEOnshoreMinusOffshore > 0);
  assert.ok(pairChecks.candidateFOnshoreMinusOffshore > 0);
  const pairedDirectionChecks = {
    method: 'same-historical-magnitudes-timing-and-history-with-wave-current-and-wind-forced-onshore-vs-offshore',
    active: summarizeDirectionPairs(rows, 'pairedActiveOnshore', 'pairedActiveOffshore'),
    candidateE: summarizeDirectionPairs(rows, 'pairedCandidateEOnshore', 'pairedCandidateEOffshore'),
    candidateF: summarizeDirectionPairs(rows, 'pairedCandidateFOnshore', 'pairedCandidateFOffshore'),
  };
  assert.ok(pairedDirectionChecks.active.meanOnshoreMinusOffshore > 0);
  assert.ok(pairedDirectionChecks.candidateE.meanOnshoreMinusOffshore > 0);
  assert.ok(pairedDirectionChecks.candidateF.meanOnshoreMinusOffshore > 0);
  return {
    schemaVersion: '1.2.0',
    status: 'passed-private-historical-active-and-candidate-f-comparison',
    generatedAt: new Date().toISOString(),
    method: 'legacy-vs-active-base-engine-plus-candidate-e-vs-f-on-wave-selected-derived-historical-features',
    legacy: { id: 'RRS-LEGACY-WEIGHTS-4.0.241', weights: LEGACY_WEIGHTS, components: 'same-active-engine-components' },
    active: { id: 'active-base-25-40-35', weights: ACTIVE_WEIGHTS, rulesApplied: false, adaptiveAdjustmentApplied: false },
    baseline: { id: 'candidateE', weights: ACTIVE_PRIOR_WEIGHTS, physicalBottleneck: 'same-mild-gate' },
    candidate: { id: 'candidateF', weights: CANDIDATE_F_WEIGHTS, physicalBottleneck: 'same-mild-gate' },
    historicalWindowCount: forcing.enrichedEventCount,
    regionCount: forcing.regionCount,
    evaluationCount: rows.length,
    overall: summarizeRows(rows),
    modeSummaries,
    classSummaries,
    eventSummaries,
    pairChecks,
    pairedDirectionChecks,
    transportBelowHuntabilityEvaluations: rows.filter(
      row => row.transportAndDelivery < row.huntability
    ).length,
    activeHistoricalReplayAvailable: true,
    activeHistoricalReplayScope: 'base-engine-before-central-rules-and-without-adaptive-user-adjustment',
    activeProductionFinalReplayAvailable: false,
    activeProductionFinalReplayBlocker: 'HISTORICAL_CENTRAL_RULE_EVALUATION_NOT_APPLIED',
    interpretation: 'Legacy and active weights use identical active-engine components. Candidate F uses the newer research process components and mild physical bottleneck. This is not find calibration or a final production-rule replay.',
    limitations: [
      'FOUR_SENTINEL_COASTS_ONLY',
      'TWELVE_WAVE_SELECTED_2024_WINDOWS',
      'DMI_STATION_WIND_DOES_NOT_REPRESENT_LOCAL_MICROSCALE',
      'CENTRAL_EXPERT_RULES_NOT_REPLAYED',
      'NO_COMPLETE_TRIP_OR_FIND_OUTCOMES',
      'MODEL_COMPONENTS_ARE_RESEARCH_PRIORS',
      'EVENT_CLASS_IS_DIRECTIONAL_NOT_DELIVERY_STRENGTH',
    ],
    rawUvStored: false,
    rawWeatherValuesStored: false,
    coordinateValuesStored: false,
    scoreImpact: false,
    publicRuntime: false,
    productionGeometryChanged: false,
    dmiFallbackChanged: false,
    automaticActivationAllowed: false,
  };
}

function fixture() {
  const classifications = ['onshore-delivery', 'offshore-removal', 'conflicting-wave-current', 'alongshore-mixed'];
  const forcing = {
    status: 'OK', rawUvStored: false, coordinateValuesStored: false,
    enrichedEventCount: 12, regionCount: 4, eventCatalog: [], regions: [],
  };
  const wave = { status: 'OK', selectedWaveWindows: [] };
  const wind = { eventCount: 12, scoreImpact: false, coordinateValuesStored: false, events: [] };
  const partById = new Map();
  const zoneById = new Map();
  const start = new Date('2024-01-01T00:00:00Z');
  classifications.forEach((classification, index) => {
    const regionId = `part-${index}`;
    const eventId = `event-${index}`;
    const peak = new Date(start.getTime() + index * 10 * 86_400_000 + 24 * 3_600_000);
    forcing.eventCatalog.push({
      eventId, regionId, classification,
      windowStart: new Date(peak - 24 * 3_600_000).toISOString(),
      windowEnd: new Date(peak.getTime() + 72 * 3_600_000).toISOString(),
    });
    const samples = [];
    for (let offset = -24; offset <= 72; offset += 1) {
      samples.push({
        time: new Date(peak.getTime() + offset * 3_600_000).toISOString(),
        waveHeightM: offset <= 0 ? 1.5 : 0.6,
        wavePeriodS: 7,
        waveOnshoreAlignment: classification === 'offshore-removal' ? -0.8 : 0.8,
        currentSpeedMps: 0.3,
        currentOnshoreAlignment: ['offshore-removal', 'conflicting-wave-current'].includes(classification) ? -0.8 : 0.8,
        seaLevelM: 0,
      });
    }
    forcing.regions.push({ regionId, samples });
    wind.events.push({
      eventId,
      samples: samples.map(sample => ({
        time: sample.time,
        windSpeedMps: 8,
        windTowardOnshoreAlignment: classification === 'offshore-removal' ? -0.8 : 0.8,
      })),
    });
    wave.selectedWaveWindows.push({
      eventId, partId: regionId,
      startTime: new Date(peak - 6 * 3_600_000).toISOString(),
      peakTime: peak.toISOString(),
      endTime: new Date(peak.getTime() + 3 * 3_600_000).toISOString(),
    });
    partById.set(regionId, { finalPartId: regionId, zoneId: `zone-${index}`, coastType: 'east' });
    zoneById.set(`zone-${index}`, {});
  });
  for (let index = 4; index < 12; index += 1) {
    wind.events.push({ eventId: `unused-${index}`, samples: [] });
  }
  return { forcing, wave, wind, partById, zoneById };
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.selfTest) {
    const sample = fixture();
    const report = compareDocuments(sample.forcing, sample.wave, sample.wind, sample.partById, sample.zoneById);
    assert.equal(report.status, 'passed-private-historical-active-and-candidate-f-comparison');
    assert.ok(report.evaluationCount > 0 && report.eventSummaries.length === 8);
    assert.equal(report.activeHistoricalReplayAvailable, true);
    assert.equal(report.rawWeatherValuesStored, false);
    const serialized = JSON.stringify(report).toLowerCase();
    assert.ok(!serialized.includes('waterpoint') && !serialized.includes('longitude') && !serialized.includes('umps'));
    console.log('OK: historical candidate F comparison is deterministic, private and score-neutral.');
    return;
  }
  if (!args.forcingPath || !args.wavePath || !args.windPath || !args.outputPath || !args.summaryPath) {
    throw new Error('Usage: compare-ravscore-historical-candidate-f.mjs forcing.json wave.json wind.json --output report.json --summary report.txt');
  }
  const forcing = JSON.parse(fs.readFileSync(args.forcingPath, 'utf8'));
  const wave = JSON.parse(fs.readFileSync(args.wavePath, 'utf8'));
  const wind = JSON.parse(fs.readFileSync(args.windPath, 'utf8'));
  const points = JSON.parse(fs.readFileSync('data/geometry-v2/active-national-coastal-parts/point-pairs.json', 'utf8'));
  const zones = JSON.parse(fs.readFileSync('data/zones.geojson', 'utf8'));
  const partById = new Map((points.parts || []).map(part => [part.finalPartId, part]));
  const zoneById = new Map((zones.features || []).map(feature => [feature.properties?.id, feature.properties || {}]));
  const report = compareDocuments(forcing, wave, wind, partById, zoneById);
  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(args.summaryPath), { recursive: true });
  fs.writeFileSync(args.outputPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(args.summaryPath,
    `Historical candidate F comparison: OK\nEvaluations: ${report.evaluationCount}\n`
    + `Legacy mean: ${report.overall.legacyMean}\nActive base mean: ${report.overall.activeMean}\n`
    + `Candidate E mean: ${report.overall.candidateEMean}\nCandidate F mean: ${report.overall.candidateFMean}\n`
    + `Mean delta active-legacy: ${report.overall.meanDeltaActiveMinusLegacy}\n`
    + `Mean delta F-active: ${report.overall.meanDeltaFMinusActive}\nActive base replay available: yes\n`
    + `F onshore-offshore difference: ${report.pairChecks.candidateFOnshoreMinusOffshore}\n`
    + 'Coordinates/raw weather/raw U/V stored: no\nScore impact: no\n');
  console.log(`Historical candidate F comparison: ${report.evaluationCount} private evaluations; score impact: no.`);
}

try {
  main();
} catch (error) {
  console.error(`Historical candidate F comparison failed: ${error.message}`);
  process.exitCode = 1;
}
