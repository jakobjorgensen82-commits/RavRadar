import fs from "node:fs";
import path from "node:path";

import {
  buildExponentialRegimeMemory,
  extractReversalEpisodes,
  signedDirectionalForce,
  simulateReversalScenario,
  summarizeRegimeReversals,
  summarizeReversalEpisodes,
} from "../js/core/ravscore-regime-memory.js";

const DEFAULT_ROOT = ".cache/ravscore-historical-wave-pilot-12";
const HALF_LIVES = [6, 12, 24, 48];
const WARMUP_HOURS = 12;

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function mean(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0 ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function eventSeries({ event, forcingRegion, windEvent }) {
  const start = new Date(event.windowStart).getTime();
  const end = new Date(event.windowEnd).getTime();
  const forcing = (forcingRegion?.samples ?? []).filter((sample) => {
    const time = new Date(sample.time).getTime();
    return time >= start && time <= end;
  });
  const wind = windEvent?.samples ?? [];

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

function buildSyntheticMatrix() {
  const strengths = [0.25, 0.5, 1, 2];
  const durations = [1, 3, 6, 12, 24, 48];
  return HALF_LIVES.flatMap((halfLifeHours) => strengths.flatMap((reversalForce) => durations.map((reversalHours) => {
    const result = simulateReversalScenario({ halfLifeHours, reversalHours, reversalForce });
    return {
      halfLifeHours,
      reversalStrengthRatio: reversalForce,
      reversalHours,
      stateAfterReversal: round(result.stateAfterReversal),
      stateChangePercent: round(result.stateChangePercent),
      flipped: result.flipped,
      hoursUntilFlip: result.hoursUntilFlip,
    };
  })));
}

function compactSyntheticSummary(matrix) {
  return HALF_LIVES.map((halfLifeHours) => {
    const rows = matrix.filter((row) => row.halfLifeHours === halfLifeHours);
    return {
      halfLifeHours,
      weakOneHourStateChangePercent: rows.find((row) => row.reversalStrengthRatio === 0.25 && row.reversalHours === 1)?.stateChangePercent,
      equalOneHourStateChangePercent: rows.find((row) => row.reversalStrengthRatio === 1 && row.reversalHours === 1)?.stateChangePercent,
      strongOneHourStateChangePercent: rows.find((row) => row.reversalStrengthRatio === 2 && row.reversalHours === 1)?.stateChangePercent,
      strongHoursUntilFlip: rows.find((row) => row.reversalStrengthRatio === 2 && row.flipped)?.reversalHours ?? null,
      exactStrongFlipHours: rows
        .filter((row) => row.reversalStrengthRatio === 2 && row.hoursUntilFlip !== null)
        .map((row) => row.hoursUntilFlip)
        .sort((left, right) => left - right)[0] ?? null,
    };
  });
}

const root = argument("root", DEFAULT_ROOT);
const forcingPath = argument("forcing", path.join(root, "ravscore-historical-forcing-features.json"));
const windPath = argument("wind", path.join(root, "ravscore-historical-wind-features.json"));
const outputPath = argument("output", path.join(root, "ravscore-regime-memory-analysis.json"));
const textPath = argument("text", path.join(root, "ravscore-regime-memory-analysis.txt"));

const forcing = readJson(forcingPath);
const wind = readJson(windPath);
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

const forcingNames = ["current", "waveEnergy", "windLinear", "windStressProxy"];
const observed = Object.fromEntries(forcingNames.map((forcingName) => [forcingName, HALF_LIVES.map((halfLifeHours) => {
  const eventRecords = events.map(({ series }) => (
    buildExponentialRegimeMemory(series[forcingName], { halfLifeHours })
  ));
  const records = eventRecords.flatMap((items) => items.slice(WARMUP_HOURS));
  const summary = summarizeRegimeReversals(records);
  const episodeSummary = summarizeReversalEpisodes(
    eventRecords.flatMap((items) => extractReversalEpisodes(items, { warmupSamples: WARMUP_HOURS })),
  );
  return {
    halfLifeHours,
    ...summary,
    episodes: episodeSummary,
    classes: Object.fromEntries(Object.entries(summary.classes).map(([name, value]) => [name, {
      ...value,
      meanImmediateStateChangePercent: round(value.meanImmediateStateChangePercent),
      medianImmediateStateChangePercent: round(value.medianImmediateStateChangePercent),
      p90ImmediateStateChangePercent: round(value.p90ImmediateStateChangePercent),
    }])),
  };
})]));

const syntheticMatrix = buildSyntheticMatrix();
const report = {
  schemaVersion: "1.0.0",
  status: "research-only-score-neutral",
  generatedAt: new Date().toISOString(),
  method: "Exponential signed forcing memory; current is linear speed, wave is Hs^2*T, wind is reported as both linear and squared stress proxy.",
  eventCount: events.length,
  halfLifeHoursTested: HALF_LIVES,
  warmupHours: WARMUP_HOURS,
  observed,
  synthetic: {
    assumption: "48 hours of unit onshore buildup followed by an offshore force at 0.25x, 0.5x, 1x or 2x for 1-48 hours.",
    summary: compactSyntheticSummary(syntheticMatrix),
    matrix: syntheticMatrix,
  },
  interpretationGuardrails: [
    "The analysis measures memory behavior and does not assign RavScore points.",
    "Current uses a linear velocity proxy; wind squared is a forcing/stress proxy, not a direct amber transport claim.",
    "Half-lives are sensitivity alternatives, not production coefficients.",
    "Wave, current and wind must be ablated before any combined candidate to avoid double counting.",
  ],
  rawWeatherValuesStored: false,
  rawUvStored: false,
  coordinateValuesStored: false,
  credentialsStored: false,
  scoreImpact: false,
  publicRuntime: false,
  automaticActivationAllowed: false,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  "RavScore regime-memory analysis",
  `Events: ${report.eventCount}; half-lives: ${HALF_LIVES.join(", ")} hours`,
  ...forcingNames.flatMap((forcingName) => observed[forcingName].map((item) => (
    `${forcingName} ${item.halfLifeHours}h: reversals=${item.reversalCount}, flips=${item.stateFlipCount}, weak=${item.classes["weak-under-half"].count}, similar=${item.classes["similar-half-to-one-and-half"].count}, strong=${item.classes["strong-over-one-and-half"].count}`
  ))),
  "Score impact: false; public runtime: false; raw values: false",
];
fs.writeFileSync(textPath, `${lines.join("\n")}\n`);

console.log(JSON.stringify({
  status: report.status,
  eventCount: report.eventCount,
  outputPath,
  textPath,
  observedReversalCounts: Object.fromEntries(forcingNames.map((name) => [
    name,
    observed[name].map((item) => ({ halfLifeHours: item.halfLifeHours, reversals: item.reversalCount, flips: item.stateFlipCount })),
  ])),
  syntheticSummary: report.synthetic.summary,
}, null, 2));
