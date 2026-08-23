import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildBoundedCurrentTransportMemory,
  buildCurrentTransportPotential,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  deriveCurrentTransportEvidence,
} from '../js/core/ravscore-regime-memory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POINTS_PATH = path.join(
  ROOT,
  'data/geometry-v2/active-national-coastal-parts/point-pairs.json',
);
const WINDOW_HOURS = 48;
const HOUR_MS = 3_600_000;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function finite(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function quantile(values, fraction) {
  const ordered = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!ordered.length) return null;
  const position = (ordered.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + ((ordered[upper] - ordered[lower]) * (position - lower));
}

function summary(values) {
  const safe = values.filter(Number.isFinite);
  return {
    count: safe.length,
    mean: round(safe.reduce((total, value) => total + value, 0) / Math.max(1, safe.length)),
    minimum: round(Math.min(...safe)),
    median: round(quantile(safe, 0.5)),
    p90: round(quantile(safe, 0.9)),
    maximum: round(Math.max(...safe)),
  };
}

function sampleFromEntry(entry, onshoreDirectionDeg) {
  const timeMs = Date.parse(entry?.validTime ?? '');
  const uMps = finite(entry?.uMps);
  const vMps = finite(entry?.vMps);
  if (!Number.isFinite(timeMs) || uMps === null || vMps === null) return null;
  const currentDirectionDeg = ((Math.atan2(uMps, vMps) * 180 / Math.PI) + 360) % 360;
  return {
    time: new Date(timeMs).toISOString(),
    currentSpeedMps: Math.hypot(uMps, vMps),
    currentAlignment: Math.cos((currentDirectionDeg - onshoreDirectionDeg) * Math.PI / 180),
    currentVerified: true,
  };
}

function uniqueOrdered(samples) {
  const byTime = new Map();
  for (const sample of samples) byTime.set(sample.time, sample);
  return [...byTime.values()].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

function fullWindow(samples, referenceMs) {
  const cutoffMs = referenceMs - (WINDOW_HOURS * HOUR_MS);
  return samples.filter(sample => {
    const timeMs = Date.parse(sample.time);
    return timeMs >= cutoffMs && timeMs <= referenceMs;
  });
}

function windowCoverageHours(samples) {
  if (samples.length < 2) return 0;
  return (Date.parse(samples.at(-1).time) - Date.parse(samples[0].time)) / HOUR_MS;
}

function replay(samples, initialPotential, overrides = {}) {
  return buildCurrentTransportPotential(samples, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    ...overrides,
    initialPotential,
    getTime: sample => sample.time,
    getSpeed: sample => sample.currentSpeedMps,
    getAlignment: sample => sample.currentAlignment,
    isVerified: sample => sample.currentVerified === true,
  });
}

function boundedReplay(samples, externalInitialPotential) {
  const referenceMs = Date.parse(samples.at(-1)?.time ?? '');
  const evidence = samples.map(sample => deriveCurrentTransportEvidence(sample, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  })).filter(Boolean);
  const bounded = buildBoundedCurrentTransportMemory(evidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: new Date(referenceMs).toISOString(),
  });
  return {
    ready: bounded.memoryReady,
    externalInitialPotential,
    result: bounded.result,
    coverageHours: bounded.coverageHours,
  };
}

function syntheticSamples({ hours, speedMps, alignment }) {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: hours + 1 }, (_, index) => ({
    time: new Date(start + (index * HOUR_MS)).toISOString(),
    currentSpeedMps: speedMps,
    currentAlignment: alignment,
    currentVerified: true,
  }));
}

function assertSyntheticContract() {
  const notReady = syntheticSamples({ hours: 47, speedMps: 0.15, alignment: 1 });
  const neutral = syntheticSamples({ hours: 48, speedMps: 0, alignment: 0 });
  const inboundAtThreshold = syntheticSamples({ hours: 48, speedMps: 0.15, alignment: 1 });
  const strongerInbound = syntheticSamples({ hours: 48, speedMps: 0.30, alignment: 1 });
  const outbound = syntheticSamples({ hours: 48, speedMps: 0.15, alignment: -1 });
  const starts = [0, 50, 100];
  assert.equal(boundedReplay(notReady, 0).ready, false,
    'a shorter window must not be presented as complete recent evidence');
  for (const samples of [neutral, inboundAtThreshold, strongerInbound, outbound]) {
    const results = starts.map(start => boundedReplay(samples, start));
    assert.ok(results.every(result => result.ready));
    assert.equal(new Set(results.map(result => result.result.transportPotential)).size, 1,
      'complete 48-hour windows must be independent of external runtime start state');
  }
  assert.equal(boundedReplay(neutral, 100).result.transportPotential, 0);
  assert.equal(boundedReplay(inboundAtThreshold, 0).result.transportPotential, 100);
  assert.equal(boundedReplay(strongerInbound, 0).result.transportPotential,
    boundedReplay(inboundAtThreshold, 0).result.transportPotential,
    'current above 0.15 m/s must not receive extra transport credit');
  assert.equal(boundedReplay(outbound, 100).result.transportPotential, 0);
  assert.equal(boundedReplay(outbound, 100).result.actualOutboundTransport, true);

  const shortOutbound = [
    ...syntheticSamples({ hours: 36, speedMps: 0.15, alignment: 1 }),
    ...syntheticSamples({ hours: 12, speedMps: 0.15, alignment: -1 }).slice(1).map((sample, index) => ({
      ...sample,
      time: new Date(Date.UTC(2026, 0, 1, 37 + index)).toISOString(),
    })),
  ];
  const shortResult = boundedReplay(shortOutbound, 0).result;
  assert.equal(shortResult.actualOutboundTransport, false);
  assert.equal(shortResult.transportPotential, 4);

  const tenInboundThenOneOutbound = [
    ...syntheticSamples({ hours: 38, speedMps: 0, alignment: 0 }),
    ...syntheticSamples({ hours: 10, speedMps: 0.15, alignment: 1 }).slice(1).map((sample, index) => ({
      ...sample,
      time: new Date(Date.UTC(2026, 0, 1, 39 + index)).toISOString(),
    })),
    {
      time: new Date(Date.UTC(2026, 0, 3, 1)).toISOString(),
      currentSpeedMps: 0.15,
      currentAlignment: -1,
      currentVerified: true,
    },
  ];
  const oneHourReversal = boundedReplay(tenInboundThenOneOutbound, 100).result;
  assert.equal(oneHourReversal.actualOutboundTransport, false);
  assert.equal(oneHourReversal.transportPotential, 92,
    'one strong outbound hour must reduce gradually rather than erase the inbound event');

  const inboundRecovery = [
    ...shortOutbound,
    {
      time: new Date(Date.UTC(2026, 0, 3, 1)).toISOString(),
      currentSpeedMps: 0.15,
      currentAlignment: 1,
      currentVerified: true,
    },
  ];
  const recoveryResult = boundedReplay(inboundRecovery, 50).result;
  assert.equal(recoveryResult.actualOutboundTransport, false);
  assert.equal(recoveryResult.transportPotential, 14,
    'renewed inbound transport must stop the outbound episode and rebuild gradually');
}

function main() {
  assertSyntheticContract();
  if (process.argv.includes('--self-test')) {
    console.log('Candidate G bounded transport-memory self-test: OK');
    return;
  }

  const historyPath = argument('--history');
  if (!historyPath) {
    throw new Error('Usage: node scripts/audit-ravscore-candidate-g-bounded-transport-memory.mjs --history <current-pilot-history.json>');
  }
  const history = JSON.parse(fs.readFileSync(path.resolve(historyPath), 'utf8'));
  const points = JSON.parse(fs.readFileSync(POINTS_PATH, 'utf8'));
  assert.equal(history?.historyPublic, true, 'audit input must be the public current-history contract');
  assert.equal(history?.credentialsIncluded, false, 'audit input must not contain credentials');
  assert.equal(Number(points?.finalPartCount), 673);

  const directions = new Map(points.parts.map(part => [part.finalPartId, finite(part.onshoreDirectionDeg)]));
  const grouped = new Map();
  for (const entry of history.entries ?? []) {
    const onshoreDirectionDeg = directions.get(entry?.partId);
    if (!Number.isFinite(onshoreDirectionDeg)) continue;
    const sample = sampleFromEntry(entry, onshoreDirectionDeg);
    if (!sample) continue;
    if (!grouped.has(entry.partId)) grouped.set(entry.partId, []);
    grouped.get(entry.partId).push(sample);
  }

  const eligible = [];
  const insufficient = [];
  for (const samples of grouped.values()) {
    const ordered = uniqueOrdered(samples);
    const starts = [0, 50, 100].map(start => boundedReplay(ordered, start));
    if (!starts.every(result => result.ready)) {
      insufficient.push(Math.max(...starts.map(result => result.coverageHours)));
      continue;
    }
    assert.equal(new Set(starts.map(result => result.result.transportPotential)).size, 1);
    assert.equal(new Set(starts.map(result => result.result.actualOutboundTransport)).size, 1);
    const rollingWindow = fullWindow(ordered, Date.parse(ordered.at(-1).time));
    const sensitivity = [0, 50, 100].map(start => replay(rollingWindow, start).at(-1).transportPotential);
    const passive48Sensitivity = [0, 50, 100]
      .map(start => replay(ordered, start, { neutralPassiveHalfLifeHours: 48 }).at(-1).transportPotential);
    eligible.push({
      coverageHours: starts[0].coverageHours,
      transportPotential: starts[0].result.transportPotential,
      actualOutboundTransport: starts[0].result.actualOutboundTransport,
      fixedWindowStart0: sensitivity[0],
      fixedWindowStart50: sensitivity[1],
      fixedWindowStart100: sensitivity[2],
      fixedWindowPriorSpread: Math.max(...sensitivity) - Math.min(...sensitivity),
      passive48Start0: passive48Sensitivity[0],
      passive48Start50: passive48Sensitivity[1],
      passive48Start100: passive48Sensitivity[2],
      passive48PriorSpread: Math.max(...passive48Sensitivity) - Math.min(...passive48Sensitivity),
    });
  }

  const report = {
    status: 'passed-dataminimized-candidate-g-bounded-transport-memory-audit',
    method: 'trailing-48h-verified-coast-normal-current-replay-with-no-external-runtime-prior',
    publicHistoryEntryCount: Array.isArray(history.entries) ? history.entries.length : 0,
    expectedPartCount: Number(points.finalPartCount),
    historyPartCount: grouped.size,
    completeWindowPartCount: eligible.length,
    incompleteOrMissingWindowPartCount: Number(points.finalPartCount) - eligible.length,
    windowHours: WINDOW_HOURS,
    externalStartIndependence: {
      testedStarts: [0, 50, 100],
      mismatchCount: 0,
    },
    completeWindowCoverageHours: summary(eligible.map(row => row.coverageHours)),
    transportPotential: summary(eligible.map(row => row.transportPotential)),
    actualOutboundTransportCount: eligible.filter(row => row.actualOutboundTransport).length,
    fixedWindowBaselineSensitivity: {
      nonZeroSpreadCount: eligible.filter(row => row.fixedWindowPriorSpread > 1e-9).length,
      start0: summary(eligible.map(row => row.fixedWindowStart0)),
      start50: summary(eligible.map(row => row.fixedWindowStart50)),
      start100: summary(eligible.map(row => row.fixedWindowStart100)),
      spread: summary(eligible.map(row => row.fixedWindowPriorSpread)),
      interpretation: 'A rolling window removes machine-start state only when its boundary meaning is fixed explicitly.',
    },
    neutralOnlyPassiveHalfLife48Sensitivity: {
      start0: summary(eligible.map(row => row.passive48Start0)),
      start50: summary(eligible.map(row => row.passive48Start50)),
      start100: summary(eligible.map(row => row.passive48Start100)),
      nonZeroSpreadCount: eligible.filter(row => row.passive48PriorSpread > 1e-9).length,
      spread: summary(eligible.map(row => row.passive48PriorSpread)),
    },
    syntheticContract: {
      complete48hIndependentOfExternalStart: true,
      strongerThanFullStrengthGetsExtraCredit: false,
      thirteenHourOutboundGatePreserved: true,
      twelveHourOutboundGateApplied: false,
    },
    privacy: {
      rawVectorsEmitted: false,
      coordinatesEmitted: false,
      partIdentifiersEmitted: false,
      privatePayloadsEmitted: false,
    },
    publicScoreChanged: false,
    candidateActivated: false,
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
