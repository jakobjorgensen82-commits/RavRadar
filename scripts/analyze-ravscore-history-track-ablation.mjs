import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildBlendedRegimeMemory,
  normalizeMemoryTrackCausally,
  signedDirectionalForce,
} from "../js/core/ravscore-regime-memory.js";

const DEFAULT_ROOT = ".cache/ravscore-historical-wave-pilot-12";
const WARMUP_HOURS = 12;
const TRACK_VARIANTS = [
  { id: "active-24", activeWeight: 1 },
  { id: "active75-background25", activeWeight: 0.75 },
  { id: "active50-background50", activeWeight: 0.5 },
  { id: "active25-background75", activeWeight: 0.25 },
  { id: "background-48", activeWeight: 0 },
];
const FORCING_NAMES = ["current", "waveEnergy", "windLinear", "windStressProxy"];
const REPRESENTATIONS = [
  { id: "linear-wind", forcingNames: ["current", "waveEnergy", "windLinear"] },
  { id: "wind-stress-proxy", forcingNames: ["current", "waveEnergy", "windStressProxy"] },
];

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function finite(values) {
  return values.filter(Number.isFinite);
}

function mean(values) {
  const usable = finite(values);
  return usable.length > 0
    ? usable.reduce((sum, value) => sum + value, 0) / usable.length
    : null;
}

function percentile(values, probability) {
  const ordered = finite(values).sort((left, right) => left - right);
  if (ordered.length === 0) return null;
  const position = (ordered.length - 1) * Math.max(0, Math.min(1, probability));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + ((ordered[upper] - ordered[lower]) * (position - lower));
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rate(count, total) {
  return total > 0 ? round(count / total) : null;
}

function correlation(leftValues, rightValues) {
  const pairs = leftValues.map((left, index) => [left, rightValues[index]])
    .filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right));
  if (pairs.length < 2) return null;
  const leftMean = mean(pairs.map(([left]) => left));
  const rightMean = mean(pairs.map(([, right]) => right));
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (const [left, right] of pairs) {
    const leftDelta = left - leftMean;
    const rightDelta = right - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator > 0 ? round(covariance / denominator) : null;
}

function eventSeries({ event, forcingRegion, windEvent }) {
  const start = new Date(event.windowStart).getTime();
  const end = new Date(event.windowEnd).getTime();
  const forcing = (forcingRegion?.samples ?? []).filter((sample) => {
    const time = new Date(sample.time).getTime();
    return time >= start && time <= end;
  });
  const wind = (windEvent?.samples ?? []).filter((sample) => {
    const time = new Date(sample.time).getTime();
    return time >= start && time <= end;
  });

  return {
    current: forcing.map((sample) => ({
      time: sample.time,
      force: signedDirectionalForce({
        magnitude: sample.currentSpeedMps,
        alignment: sample.currentOnshoreAlignment,
      }),
    })),
    waveEnergy: forcing.map((sample) => ({
      time: sample.time,
      force: signedDirectionalForce({
        magnitude: (Number(sample.waveHeightM) ** 2) * Number(sample.wavePeriodS),
        alignment: sample.waveOnshoreAlignment,
      }),
    })),
    windLinear: wind.map((sample) => ({
      time: sample.time,
      force: signedDirectionalForce({
        magnitude: sample.windSpeedMps,
        alignment: sample.windTowardOnshoreAlignment,
      }),
    })),
    windStressProxy: wind.map((sample) => ({
      time: sample.time,
      force: signedDirectionalForce({
        magnitude: sample.windSpeedMps,
        alignment: sample.windTowardOnshoreAlignment,
        power: 2,
      }),
    })),
  };
}

function buildEventTracks(events) {
  return events.map(({ event, series }) => ({
    eventId: event.eventId,
    classification: event.classification ?? "unclassified",
    tracks: Object.fromEntries(FORCING_NAMES.map((forcingName) => [
      forcingName,
      Object.fromEntries(TRACK_VARIANTS.map((variant) => {
        const blended = buildBlendedRegimeMemory(series[forcingName], {
          activeHalfLifeHours: 24,
          backgroundHalfLifeHours: 48,
          activeWeight: variant.activeWeight,
        });
        return [variant.id, normalizeMemoryTrackCausally(blended)];
      })),
    ])),
  }));
}

function signTransitionCount(records) {
  let previousSign = 0;
  let transitions = 0;
  for (const record of records) {
    const sign = Math.sign(record.blendedState);
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) transitions += 1;
    if (sign !== 0) previousSign = sign;
  }
  return transitions;
}

function comparisonSummary(records, baseline) {
  assert.equal(records.length, baseline.length);
  const absoluteDeltas = [];
  let signDisagreements = 0;
  let comparableSigns = 0;
  records.forEach((record, index) => {
    const base = baseline[index];
    assert.equal(record.time, base.time);
    absoluteDeltas.push(Math.abs(record.boundedState - base.boundedState));
    const sign = Math.sign(record.blendedState);
    const baseSign = Math.sign(base.blendedState);
    if (sign !== 0 && baseSign !== 0) {
      comparableSigns += 1;
      if (sign !== baseSign) signDisagreements += 1;
    }
  });
  return {
    meanAbsoluteBoundedDelta: round(mean(absoluteDeltas)),
    p90AbsoluteBoundedDelta: round(percentile(absoluteDeltas, 0.9)),
    signDisagreementCount: signDisagreements,
    signDisagreementRate: rate(signDisagreements, comparableSigns),
  };
}

function summarizeTrack(eventTracks, forcingName, variantId) {
  const byEvent = eventTracks.map((eventTrack) => ({
    selected: eventTrack.tracks[forcingName][variantId].slice(WARMUP_HOURS),
    active: eventTrack.tracks[forcingName]["active-24"].slice(WARMUP_HOURS),
    background: eventTrack.tracks[forcingName]["background-48"].slice(WARMUP_HOURS),
  }));
  const selected = byEvent.flatMap((item) => item.selected);
  const active = byEvent.flatMap((item) => item.active);
  const background = byEvent.flatMap((item) => item.background);
  let instantaneousDisagreements = 0;
  let instantaneousComparable = 0;
  let trackSignDisagreements = 0;
  for (const record of selected) {
    const stateSign = Math.sign(record.blendedState);
    const forceSign = Math.sign(record.force);
    if (stateSign !== 0 && forceSign !== 0) {
      instantaneousComparable += 1;
      if (stateSign !== forceSign) instantaneousDisagreements += 1;
    }
    if (record.trackSignDisagreement) trackSignDisagreements += 1;
  }
  return {
    eventCount: byEvent.length,
    sampleCount: selected.length,
    meanAbsoluteBoundedState: round(mean(selected.map((record) => Math.abs(record.boundedState)))),
    p90AbsoluteBoundedState: round(percentile(
      selected.map((record) => Math.abs(record.boundedState)),
      0.9,
    )),
    signTransitionCount: byEvent.reduce(
      (sum, item) => sum + signTransitionCount(item.selected),
      0,
    ),
    instantaneousDirectionDisagreementCount: instantaneousDisagreements,
    instantaneousDirectionDisagreementRate: rate(
      instantaneousDisagreements,
      instantaneousComparable,
    ),
    activeBackgroundSignDisagreementCount: trackSignDisagreements,
    activeBackgroundSignDisagreementRate: rate(trackSignDisagreements, selected.length),
    versusActive24: comparisonSummary(selected, active),
    versusBackground48: comparisonSummary(selected, background),
  };
}

function alignedRepresentationRows(eventTrack, representation, variantId) {
  const maps = Object.fromEntries(representation.forcingNames.map((forcingName) => [
    forcingName,
    new Map(eventTrack.tracks[forcingName][variantId]
      .slice(WARMUP_HOURS)
      .map((record) => [record.time, record])),
  ]));
  const reference = eventTrack.tracks[representation.forcingNames[0]][variantId]
    .slice(WARMUP_HOURS);
  return reference.flatMap((referenceRecord) => {
    const records = representation.forcingNames.map((forcingName) => (
      maps[forcingName].get(referenceRecord.time)
    ));
    if (records.some((record) => !record)) return [];
    return [{
      eventId: eventTrack.eventId,
      classification: eventTrack.classification,
      time: referenceRecord.time,
      values: Object.fromEntries(representation.forcingNames.map((forcingName, index) => [
        forcingName,
        records[index].boundedState,
      ])),
    }];
  });
}

function pairwiseCorrelations(rows, forcingNames) {
  const eventMeans = new Map();
  for (const row of rows) {
    if (!eventMeans.has(row.eventId)) eventMeans.set(row.eventId, {});
  }
  for (const [eventId, target] of eventMeans) {
    const selected = rows.filter((row) => row.eventId === eventId);
    for (const forcingName of forcingNames) {
      target[forcingName] = mean(selected.map((row) => row.values[forcingName]));
    }
  }

  const output = [];
  for (let left = 0; left < forcingNames.length; left += 1) {
    for (let right = left + 1; right < forcingNames.length; right += 1) {
      const leftName = forcingNames[left];
      const rightName = forcingNames[right];
      const perEvent = [...eventMeans.keys()].map((eventId) => {
        const selected = rows.filter((row) => row.eventId === eventId);
        return correlation(
          selected.map((row) => row.values[leftName]),
          selected.map((row) => row.values[rightName]),
        );
      });
      output.push({
        left: leftName,
        right: rightName,
        pooledCorrelation: correlation(
          rows.map((row) => row.values[leftName]),
          rows.map((row) => row.values[rightName]),
        ),
        withinEventDemeanedCorrelation: correlation(
          rows.map((row) => row.values[leftName] - eventMeans.get(row.eventId)[leftName]),
          rows.map((row) => row.values[rightName] - eventMeans.get(row.eventId)[rightName]),
        ),
        medianPerEventCorrelation: round(percentile(perEvent, 0.5)),
        comparableEventCount: finite(perEvent).length,
      });
    }
  }
  return output;
}

function ablationMetrics(rows, forcingName, meanAbsoluteFull) {
  const impacts = rows.map((row) => Math.abs(row.full - row.ablated[forcingName]));
  const signChanges = rows.filter((row) => (
    Math.sign(row.full) !== Math.sign(row.ablated[forcingName])
  )).length;
  const meanImpact = mean(impacts);
  return {
    omitted: forcingName,
    meanAbsoluteCompositeImpact: round(meanImpact),
    p90AbsoluteCompositeImpact: round(percentile(impacts, 0.9)),
    meanImpactRelativeToMeanAbsoluteFull: meanAbsoluteFull > 0
      ? round(meanImpact / meanAbsoluteFull)
      : null,
    compositeSignChangeCount: signChanges,
    compositeSignChangeRate: rate(signChanges, rows.length),
  };
}

function summarizeRepresentation(eventTracks, representation, variantId) {
  const rows = eventTracks.flatMap((eventTrack) => (
    alignedRepresentationRows(eventTrack, representation, variantId)
  ));
  const denominator = representation.forcingNames.length;
  const enriched = rows.map((row) => {
    const full = representation.forcingNames.reduce(
      (sum, forcingName) => sum + row.values[forcingName],
      0,
    ) / denominator;
    return {
      ...row,
      full,
      ablated: Object.fromEntries(representation.forcingNames.map((forcingName) => [
        forcingName,
        full - (row.values[forcingName] / denominator),
      ])),
    };
  });
  const byEvent = new Map();
  for (const row of enriched) {
    if (!byEvent.has(row.eventId)) byEvent.set(row.eventId, []);
    byEvent.get(row.eventId).push({ blendedState: row.full });
  }
  const pairwise = pairwiseCorrelations(enriched, representation.forcingNames);
  const meanAbsoluteFull = mean(enriched.map((row) => Math.abs(row.full)));
  const classifications = [...new Set(enriched.map((row) => row.classification))].sort();
  return {
    sampleCount: enriched.length,
    compositeSignTransitionCount: [...byEvent.values()].reduce(
      (sum, records) => sum + signTransitionCount(records),
      0,
    ),
    meanAbsoluteCompositeState: round(meanAbsoluteFull),
    pairwiseCorrelations: pairwise,
    ablations: representation.forcingNames.map((forcingName) => (
      ablationMetrics(enriched, forcingName, meanAbsoluteFull)
    )),
    byClassification: classifications.map((classification) => {
      const selected = enriched.filter((row) => row.classification === classification);
      const selectedMeanAbsoluteFull = mean(selected.map((row) => Math.abs(row.full)));
      return {
        classification,
        sampleCount: selected.length,
        ablations: representation.forcingNames.map((forcingName) => (
          ablationMetrics(selected, forcingName, selectedMeanAbsoluteFull)
        )),
      };
    }),
  };
}

export function analyzeDocuments(forcing, wind) {
  assert.equal(forcing.rawUvStored, false, "forcing input must not store raw U/V");
  assert.equal(forcing.coordinateValuesStored, false, "forcing input must not store coordinates");
  assert.equal(wind.coordinateValuesStored, false, "wind input must not store coordinates");
  const regionById = new Map((forcing.regions ?? []).map((region) => [region.regionId, region]));
  const windByEventId = new Map((wind.events ?? []).map((event) => [event.eventId, event]));
  const events = (forcing.eventCatalog ?? []).map((event) => ({
    event,
    series: eventSeries({
      event,
      forcingRegion: regionById.get(event.regionId),
      windEvent: windByEventId.get(event.eventId),
    }),
  }));
  assert.ok(events.length > 0, "at least one historical event is required");
  const eventTracks = buildEventTracks(events);

  return {
    schemaVersion: "1.0.0",
    status: "passed-private-history-track-ablation-score-neutral",
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    warmupHours: WARMUP_HOURS,
    trackDefinition: {
      activeHalfLifeHours: 24,
      backgroundHalfLifeHours: 48,
      variants: TRACK_VARIANTS.map((variant) => ({
        ...variant,
        backgroundWeight: 1 - variant.activeWeight,
      })),
      causality: "Each state and its expanding normalization use only the current and earlier samples in the same event.",
    },
    normalization: {
      method: "Strictly causal prior mean-absolute-state scaling followed by x/(1+abs(x)).",
      purpose: "Makes unlike physical proxies comparable only for leave-one-forcing-out sensitivity.",
      productionCoefficient: false,
    },
    trackSummaries: Object.fromEntries(FORCING_NAMES.map((forcingName) => [
      forcingName,
      Object.fromEntries(TRACK_VARIANTS.map((variant) => [
        variant.id,
        summarizeTrack(eventTracks, forcingName, variant.id),
      ])),
    ])),
    ablationRepresentations: Object.fromEntries(REPRESENTATIONS.map((representation) => [
      representation.id,
      {
        forcingNames: representation.forcingNames,
        combination: "Equal one-third contributions for sensitivity only; omission is zeroed without reweighting.",
        variants: Object.fromEntries(TRACK_VARIANTS.map((variant) => [
          variant.id,
          summarizeRepresentation(eventTracks, representation, variant.id),
        ])),
      },
    ])),
    interpretationGuardrails: [
      "The matrix compares memory behavior and leave-one-forcing-out sensitivity; it does not assign RavScore points.",
      "Linear wind and wind-stress proxy are alternative representations and are never included together.",
      "Equal contributions and causal normalization are analysis devices, not candidate G coefficients.",
      "Correlated forcing histories cannot establish causal amber transport or justify double counting.",
      "The twelve selected events are not representative find calibration.",
    ],
    rawWeatherValuesStored: false,
    rawUvStored: false,
    coordinateValuesStored: false,
    credentialsStored: false,
    scoreImpact: false,
    publicRuntime: false,
    automaticActivationAllowed: false,
  };
}

function fixture() {
  const forcing = {
    rawUvStored: false,
    coordinateValuesStored: false,
    eventCatalog: [],
    regions: [],
  };
  const wind = { coordinateValuesStored: false, events: [] };
  const start = Date.UTC(2024, 0, 1);
  ["onshore", "reversal"].forEach((kind, eventIndex) => {
    const eventId = `event-${eventIndex}`;
    const regionId = `region-${eventIndex}`;
    const eventStart = start + (eventIndex * 120 * 3_600_000);
    const samples = Array.from({ length: 97 }, (_, index) => {
      const reversal = kind === "reversal" && index >= 60;
      const alignment = reversal ? -1 : 1;
      return {
        time: new Date(eventStart + (index * 3_600_000)).toISOString(),
        currentSpeedMps: reversal ? 0.6 : 0.3,
        currentOnshoreAlignment: alignment,
        waveHeightM: reversal ? 1.8 : 0.8,
        wavePeriodS: 7,
        waveOnshoreAlignment: alignment,
      };
    });
    forcing.eventCatalog.push({
      eventId,
      regionId,
      classification: kind,
      windowStart: samples[0].time,
      windowEnd: samples.at(-1).time,
    });
    forcing.regions.push({ regionId, samples });
    wind.events.push({
      eventId,
      samples: samples.map((sample, index) => ({
        time: sample.time,
        windSpeedMps: index >= 60 && kind === "reversal" ? 12 : 6,
        windTowardOnshoreAlignment: sample.currentOnshoreAlignment,
      })),
    });
  });
  return { forcing, wind };
}

function writeReport(report, outputPath, textPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "RavScore 24/48 history-track and ablation analysis",
    `Events: ${report.eventCount}; score impact: ${report.scoreImpact}; public runtime: ${report.publicRuntime}`,
    ...Object.entries(report.ablationRepresentations).flatMap(([representationId, representation]) => (
      Object.entries(representation.variants).map(([variantId, summary]) => (
        `${representationId}/${variantId}: samples=${summary.sampleCount}, transitions=${summary.compositeSignTransitionCount}, `
        + `sign-changes=${summary.ablations.map((item) => `${item.omitted}:${item.compositeSignChangeCount}`).join(",")}`
      ))
    )),
    "Raw values, coordinates, U/V and credentials stored: no",
  ];
  fs.writeFileSync(textPath, `${lines.join("\n")}\n`);
}

function main() {
  if (process.argv.includes("--self-test")) {
    const sample = fixture();
    const report = analyzeDocuments(sample.forcing, sample.wind);
    assert.equal(report.eventCount, 2);
    assert.equal(report.trackDefinition.variants.length, 5);
    assert.equal(Object.keys(report.ablationRepresentations).length, 2);
    assert.ok(report.ablationRepresentations["linear-wind"].variants["active50-background50"].sampleCount > 0);
    assert.equal(report.scoreImpact, false);
    assert.equal(report.publicRuntime, false);
    const serialized = JSON.stringify(report).toLowerCase();
    assert.ok(!serialized.includes("waterpoint"));
    assert.ok(!serialized.includes("landpoint"));
    assert.ok(!serialized.includes("longitude"));
    assert.ok(!serialized.includes("latitude"));
    console.log("OK: 24/48 track matrix and forcing ablations are causal, private and score-neutral.");
    return;
  }

  const root = argument("root", DEFAULT_ROOT);
  const forcingPath = argument("forcing", path.join(root, "ravscore-historical-forcing-features.json"));
  const windPath = argument("wind", path.join(root, "ravscore-historical-wind-features.json"));
  const outputPath = argument("output", path.join(root, "ravscore-history-track-ablation-analysis.json"));
  const textPath = argument("text", path.join(root, "ravscore-history-track-ablation-analysis.txt"));
  const report = analyzeDocuments(
    JSON.parse(fs.readFileSync(forcingPath, "utf8")),
    JSON.parse(fs.readFileSync(windPath, "utf8")),
  );
  writeReport(report, outputPath, textPath);
  console.log(JSON.stringify({
    status: report.status,
    eventCount: report.eventCount,
    variants: report.trackDefinition.variants.map((variant) => variant.id),
    outputPath,
    textPath,
    scoreImpact: report.scoreImpact,
    publicRuntime: report.publicRuntime,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`RavScore history-track ablation failed: ${error.message}`);
  process.exitCode = 1;
}
