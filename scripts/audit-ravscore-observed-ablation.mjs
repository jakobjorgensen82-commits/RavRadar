import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const MODES = ['waders', 'beach'];
const COMPONENTS = ['huntability', 'transport', 'release'];
const WEIGHTS = Object.freeze({ huntability: 0.25, transport: 0.40, release: 0.35 });
const WEATHER_FIELDS = ['windSpeedMps', 'waveHeightM', 'currentSpeedMps', 'waterLevelTrendCm3h'];
const DRIVER_PATTERNS = Object.freeze({
  wind: /vind|wind/i,
  wave: /bølg|boelg|wave/i,
  current: /strøm|stroem|current/i,
  waterLevel: /vandstand|water level/i,
  eventHistory: /storm|histor|tidligere|varighed|hændelse|haendelse|event/i,
  coast: /kyst|strand|rev|lavvand|ålegræs|aalegraes|coast|reef|seagrass/i,
});
const selfTest = process.argv.includes('--self-test');

function finite(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return round(sorted[lower]);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower));
}

function distribution(values) {
  const valid = values.filter(finite).map(Number).sort((a, b) => a - b);
  if (!valid.length) return { count: 0 };
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const variance = valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / valid.length;
  return {
    count: valid.length,
    minimum: round(valid[0]),
    p05: quantile(valid, 0.05),
    p25: quantile(valid, 0.25),
    median: quantile(valid, 0.50),
    p75: quantile(valid, 0.75),
    p95: quantile(valid, 0.95),
    maximum: round(valid.at(-1)),
    mean: round(mean),
    standardDeviation: round(Math.sqrt(variance)),
  };
}

function pearson(rows, left, right) {
  const pairs = rows
    .map(row => [left(row), right(row)])
    .filter(([a, b]) => finite(a) && finite(b))
    .map(([a, b]) => [Number(a), Number(b)]);
  if (pairs.length < 2) return null;
  const meanA = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const meanB = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  let numerator = 0;
  let sumA = 0;
  let sumB = 0;
  for (const [a, b] of pairs) {
    const da = a - meanA;
    const db = b - meanB;
    numerator += da * db;
    sumA += da ** 2;
    sumB += db ** 2;
  }
  return sumA > 0 && sumB > 0 ? round(numerator / Math.sqrt(sumA * sumB)) : null;
}

function scoreBand(score) {
  if (score >= 75) return 'good';
  if (score >= 55) return 'fair';
  if (score >= 35) return 'weak';
  return 'poor';
}

function isScoreRecord(value) {
  return value && finite(value.score) && COMPONENTS.every(key => finite(value.components?.[key]));
}

function normalizeRecord(value, metadata) {
  const components = Object.fromEntries(COMPONENTS.map(key => [key, Number(value.components[key])]));
  const score = Number(value.score);
  const weightedExact = COMPONENTS.reduce((sum, key) => sum + components[key] * WEIGHTS[key], 0);
  const roundedWeightedScore = clampScore(weightedExact);
  const nonWeightOffset = score - roundedWeightedScore;
  const contributions = Object.fromEntries(COMPONENTS.map(key => [key, components[key] * WEIGHTS[key]]));
  const ablations = Object.fromEntries(COMPONENTS.map(key => {
    const scoreWithout = clampScore(weightedExact - contributions[key]) + nonWeightOffset;
    const boundedScoreWithout = Math.max(0, Math.min(100, scoreWithout));
    return [key, {
      scoreWithout: boundedScoreWithout,
      scoreDrop: score - boundedScoreWithout,
      changesBand: scoreBand(score) !== scoreBand(boundedScoreWithout),
    }];
  }));
  return {
    ...metadata,
    score,
    components,
    contributions,
    weightedExact,
    roundedWeightedScore,
    nonWeightOffset,
    ablations,
    explanation: value.explanation || {},
    componentReasons: value.componentReasons || {},
    weather: value.weather || {},
  };
}

function extractRecords(dataset) {
  const zoneWinnerHourly = [];
  const currentParts = [];
  const zones = dataset.coastalParts?.zones || {};
  const parts = dataset.coastalParts?.parts || {};

  for (const [zoneId, zone] of Object.entries(zones)) {
    for (const hour of zone.hourly || []) {
      for (const mode of MODES) {
        const value = hour?.[mode];
        if (!isScoreRecord(value)) continue;
        zoneWinnerHourly.push(normalizeRecord(value, {
          source: 'zone-winner',
          scope: hour.time === zone.currentReferenceAt ? 'current' : 'forecast',
          zoneId,
          partId: value.winningPartId || null,
          time: hour.time || null,
          mode,
        }));
      }
    }
  }

  for (const [partId, part] of Object.entries(parts)) {
    for (const mode of MODES) {
      const value = part.current?.[mode];
      if (!isScoreRecord(value)) continue;
      currentParts.push(normalizeRecord(value, {
        source: 'coastal-part',
        scope: 'current',
        zoneId: part.zoneId || null,
        partId,
        time: part.current?.time || null,
        mode,
      }));
    }
  }

  return { zoneWinnerHourly, currentParts };
}

function countWhere(rows, predicate) {
  return rows.reduce((count, row) => count + (predicate(row) ? 1 : 0), 0);
}

function rate(count, total) {
  return total ? round(count / total, 4) : null;
}

function conflictSummary(rows) {
  const definitions = {
    headlineFairWithWeakPhysicalStage: row => row.score >= 55 && Math.min(row.components.transport, row.components.release) < 35,
    headlineGoodWithWeakPhysicalStage: row => row.score >= 75 && Math.min(row.components.transport, row.components.release) < 35,
    easySearchWeakPhysicalChain: row => row.components.huntability >= 70 && Math.min(row.components.transport, row.components.release) < 35,
    mobilisedPoorTransport: row => row.components.release >= 70 && row.components.transport < 35,
    transportedLowMobilisation: row => row.components.transport >= 70 && row.components.release < 35,
    physicalOpportunityHardSearch: row => row.components.transport >= 60 && row.components.release >= 60 && row.components.huntability < 35,
    balancedHigh: row => COMPONENTS.every(key => row.components[key] >= 60),
    balancedLow: row => COMPONENTS.every(key => row.components[key] <= 40),
  };
  return Object.fromEntries(Object.entries(definitions).map(([key, predicate]) => {
    const count = countWhere(rows, predicate);
    return [key, { count, rate: rate(count, rows.length) }];
  }));
}

function validationSummary(rows) {
  const weightMismatches = [];
  const contributionMismatches = [];
  const invalidScores = [];
  for (const row of rows) {
    const shownWeights = row.explanation?.weights || {};
    for (const key of COMPONENTS) {
      if (Number(shownWeights[key]) !== WEIGHTS[key]) {
        weightMismatches.push({ zoneId: row.zoneId, partId: row.partId, time: row.time, mode: row.mode, component: key });
      }
      const shownContribution = row.explanation?.contributions?.[key];
      const expectedContribution = Math.round(row.contributions[key]);
      if (Number(shownContribution) !== expectedContribution) {
        contributionMismatches.push({ zoneId: row.zoneId, partId: row.partId, time: row.time, mode: row.mode, component: key });
      }
    }
    if (!Number.isInteger(row.score) || row.score < 0 || row.score > 100 || COMPONENTS.some(key => row.components[key] < 0 || row.components[key] > 100)) {
      invalidScores.push({ zoneId: row.zoneId, partId: row.partId, time: row.time, mode: row.mode });
    }
  }
  return {
    weightMismatchCount: weightMismatches.length,
    contributionMismatchCount: contributionMismatches.length,
    invalidScoreCount: invalidScores.length,
    examples: {
      weightMismatches: weightMismatches.slice(0, 10),
      contributionMismatches: contributionMismatches.slice(0, 10),
      invalidScores: invalidScores.slice(0, 10),
    },
  };
}

function reasonSummary(rows) {
  const componentDrivers = Object.fromEntries(COMPONENTS.map(component => [
    component,
    Object.fromEntries(Object.keys(DRIVER_PATTERNS).map(driver => [driver, 0])),
  ]));
  const reasonCounts = Object.fromEntries(COMPONENTS.map(component => [component, new Map()]));
  const multiComponentDrivers = Object.fromEntries(Object.keys(DRIVER_PATTERNS).map(driver => [driver, { count: 0, combinations: {} }]));

  for (const row of rows) {
    const componentText = {};
    for (const component of COMPONENTS) {
      const reasons = Array.isArray(row.componentReasons?.[component]) ? row.componentReasons[component] : [];
      componentText[component] = reasons.join(' ');
      for (const reason of reasons) {
        const clean = String(reason).replace(/\s+/g, ' ').trim();
        if (clean) reasonCounts[component].set(clean, (reasonCounts[component].get(clean) || 0) + 1);
      }
      for (const [driver, pattern] of Object.entries(DRIVER_PATTERNS)) {
        if (pattern.test(componentText[component])) componentDrivers[component][driver] += 1;
      }
    }
    for (const [driver, pattern] of Object.entries(DRIVER_PATTERNS)) {
      const matches = COMPONENTS.filter(component => pattern.test(componentText[component]));
      if (matches.length < 2) continue;
      const combination = matches.join('+');
      multiComponentDrivers[driver].count += 1;
      multiComponentDrivers[driver].combinations[combination] = (multiComponentDrivers[driver].combinations[combination] || 0) + 1;
    }
  }

  return {
    classification: 'keyword proxy over user-facing component reasons; not causal proof',
    componentDrivers: Object.fromEntries(COMPONENTS.map(component => [component, Object.fromEntries(
      Object.entries(componentDrivers[component]).map(([driver, count]) => [driver, { count, rate: rate(count, rows.length) }]),
    )])),
    multiComponentDrivers: Object.fromEntries(Object.entries(multiComponentDrivers).map(([driver, value]) => [driver, {
      count: value.count,
      rate: rate(value.count, rows.length),
      combinations: value.combinations,
    }])),
    topReasons: Object.fromEntries(COMPONENTS.map(component => [component, [...reasonCounts[component].entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count, rate: rate(count, rows.length) }))])),
  };
}

function analyse(rows) {
  const bands = Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(key => [key, 0]));
  const dominantContribution = Object.fromEntries([...COMPONENTS, 'tie'].map(key => [key, 0]));
  for (const row of rows) {
    bands[scoreBand(row.score)] += 1;
    const maximum = Math.max(...COMPONENTS.map(key => row.contributions[key]));
    const winners = COMPONENTS.filter(key => row.contributions[key] === maximum);
    dominantContribution[winners.length === 1 ? winners[0] : 'tie'] += 1;
  }

  const componentCorrelations = {};
  for (let leftIndex = 0; leftIndex < COMPONENTS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < COMPONENTS.length; rightIndex += 1) {
      const left = COMPONENTS[leftIndex];
      const right = COMPONENTS[rightIndex];
      componentCorrelations[`${left}__${right}`] = pearson(rows, row => row.components[left], row => row.components[right]);
    }
  }

  const componentToScore = Object.fromEntries(COMPONENTS.map(key => [
    key,
    pearson(rows, row => row.components[key], row => row.score),
  ]));

  const weatherOverlapProxy = Object.fromEntries(WEATHER_FIELDS.map(field => [field, {
    available: countWhere(rows, row => finite(row.weather?.[field])),
    score: pearson(rows, row => row.weather?.[field], row => row.score),
    components: Object.fromEntries(COMPONENTS.map(key => [
      key,
      pearson(rows, row => row.weather?.[field], row => row.components[key]),
    ])),
  }]));

  const ablation = Object.fromEntries(COMPONENTS.map(key => {
    const drops = rows.map(row => row.ablations[key].scoreDrop);
    const changedBand = countWhere(rows, row => row.ablations[key].changesBand);
    return [key, {
      scoreDrop: distribution(drops),
      changedBand,
      changedBandRate: rate(changedBand, rows.length),
      scoreWithout: distribution(rows.map(row => row.ablations[key].scoreWithout)),
    }];
  }));

  return {
    records: rows.length,
    zones: new Set(rows.map(row => row.zoneId).filter(Boolean)).size,
    parts: new Set(rows.map(row => row.partId).filter(Boolean)).size,
    times: new Set(rows.map(row => row.time).filter(Boolean)).size,
    score: distribution(rows.map(row => row.score)),
    components: Object.fromEntries(COMPONENTS.map(key => [key, distribution(rows.map(row => row.components[key]))])),
    exactWeightedContributions: Object.fromEntries(COMPONENTS.map(key => [key, distribution(rows.map(row => row.contributions[key]))])),
    nonWeightOffset: distribution(rows.map(row => row.nonWeightOffset)),
    bands,
    dominantContribution,
    correlations: { components: componentCorrelations, componentToScore },
    weatherOverlapProxy,
    reasonOverlapProxy: reasonSummary(rows),
    conflicts: conflictSummary(rows),
    ablation,
    validation: validationSummary(rows),
  };
}

function buildAudit(dataset) {
  const { zoneWinnerHourly, currentParts } = extractRecords(dataset);
  const currentWinners = zoneWinnerHourly.filter(row => row.scope === 'current');
  const forecastWinners = zoneWinnerHourly.filter(row => row.scope === 'forecast');
  const combinedValidation = validationSummary([...zoneWinnerHourly, ...currentParts]);
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scoreImpact: 'none',
    method: 'observed public production-score distributions and component-zero ablation; no outcome fitting',
    dataset: {
      datasetId: dataset.datasetId || null,
      generatedAt: dataset.generatedAt || null,
      productionReferenceAt: dataset.productionReferenceAt || null,
      zones: Object.keys(dataset.coastalParts?.zones || {}).length,
      parts: Object.keys(dataset.coastalParts?.parts || {}).length,
    },
    activeWeights: WEIGHTS,
    coverage: {
      zoneWinnerHourlyRecords: zoneWinnerHourly.length,
      currentWinnerRecords: currentWinners.length,
      forecastWinnerRecords: forecastWinners.length,
      currentPartRecords: currentParts.length,
      modes: Object.fromEntries(MODES.map(mode => [mode, {
        zoneWinnerHourly: countWhere(zoneWinnerHourly, row => row.mode === mode),
        currentParts: countWhere(currentParts, row => row.mode === mode),
      }])),
    },
    validation: combinedValidation,
    analyses: {
      zoneWinnerHourly: analyse(zoneWinnerHourly),
      zoneWinnerCurrent: analyse(currentWinners),
      zoneWinnerForecast: analyse(forecastWinners),
      currentParts: analyse(currentParts),
      byMode: Object.fromEntries(MODES.map(mode => [mode, analyse(zoneWinnerHourly.filter(row => row.mode === mode))])),
      currentPartsByMode: Object.fromEntries(MODES.map(mode => [mode, analyse(currentParts.filter(row => row.mode === mode))])),
    },
    interpretationRules: [
      'The audit describes the production score distribution, not amber-find probability or model accuracy.',
      'Component-zero ablation preserves the observed integer non-weight offset and measures formula influence, not causal environmental importance.',
      'Pearson correlations can reveal redundancy risk but cannot prove double counting or causation.',
      'Absolute directions are intentionally excluded from linear weather correlations because angles wrap at 360 degrees.',
      'No coefficient, threshold, score rule, geometry or point is changed by this audit.',
    ],
  };

  if (output.dataset.zones !== 210) throw new Error(`Forventede 210 zoner, fandt ${output.dataset.zones}.`);
  if (output.dataset.parts !== 673) throw new Error(`Forventede 673 kystdele, fandt ${output.dataset.parts}.`);
  if (output.coverage.currentWinnerRecords !== 420) throw new Error(`Forventede 420 aktuelle zone-/modeposter, fandt ${output.coverage.currentWinnerRecords}.`);
  if (output.coverage.currentPartRecords !== 1346) throw new Error(`Forventede 1.346 aktuelle kystdel-/modeposter, fandt ${output.coverage.currentPartRecords}.`);
  if (output.coverage.forecastWinnerRecords < 2100) throw new Error(`For få prognoseposter: ${output.coverage.forecastWinnerRecords}.`);
  if (combinedValidation.weightMismatchCount || combinedValidation.contributionMismatchCount || combinedValidation.invalidScoreCount) {
    throw new Error(`Datakontrakten fejler: ${JSON.stringify(combinedValidation)}`);
  }
  return output;
}

function selfTestFixture() {
  const result = (score, huntability, transport, release, weather = {}) => ({
    score,
    components: { huntability, transport, release },
    explanation: {
      weights: WEIGHTS,
      contributions: {
        huntability: Math.round(huntability * WEIGHTS.huntability),
        transport: Math.round(transport * WEIGHTS.transport),
        release: Math.round(release * WEIGHTS.release),
      },
    },
    weather,
  });
  const rows = [
    normalizeRecord(result(73, 80, 70, 70, { windSpeedMps: 4, waveHeightM: 0.5, currentSpeedMps: 0.3, waterLevelTrendCm3h: -4 }), { zoneId: 'A', partId: 'A1', time: '2026-01-01T00:00:00Z', mode: 'waders', scope: 'current' }),
    normalizeRecord(result(40, 80, 20, 30, { windSpeedMps: 2, waveHeightM: 0.1, currentSpeedMps: 0.05, waterLevelTrendCm3h: 0 }), { zoneId: 'B', partId: 'B1', time: '2026-01-01T00:00:00Z', mode: 'beach', scope: 'current' }),
    normalizeRecord(result(61, 20, 80, 65, { windSpeedMps: 10, waveHeightM: 1.2, currentSpeedMps: 0.6, waterLevelTrendCm3h: 8 }), { zoneId: 'C', partId: 'C1', time: '2026-01-01T01:00:00Z', mode: 'waders', scope: 'forecast' }),
  ];
  return rows;
}

if (selfTest) {
  const rows = selfTestFixture();
  const audit = analyse(rows);
  assert.equal(audit.records, 3);
  assert.equal(audit.validation.weightMismatchCount, 0);
  assert.equal(audit.validation.contributionMismatchCount, 0);
  assert.equal(audit.validation.invalidScoreCount, 0);
  assert.equal(audit.conflicts.easySearchWeakPhysicalChain.count, 1);
  assert.ok(audit.ablation.transport.scoreDrop.mean > audit.ablation.huntability.scoreDrop.mean);
  assert.equal(audit.weatherOverlapProxy.windDirectionDeg, undefined);
  console.log('OK: observeret RavScore-fordeling og komponentablation er deterministisk og score-neutral.');
} else {
  const input = process.argv.slice(2).find(argument => !argument.startsWith('--')) || process.env.RAVRADAR_PUBLIC_DETAILS;
  if (!input) throw new Error('Angiv public-condition-details.json som argument eller RAVRADAR_PUBLIC_DETAILS.');
  const dataset = JSON.parse(await fs.readFile(input, 'utf8'));
  console.log(JSON.stringify(buildAudit(dataset), null, 2));
}
