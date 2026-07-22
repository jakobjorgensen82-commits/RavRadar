import assert from "node:assert/strict";
import { calculateRavScore } from "../js/core/score-engine.js";

const zone = {
  id: "TEST",
  coastType: "east",
  onshoreDirectionDeg: 270,
  shallowWater: true,
  reefs: true,
  seagrass: true
};

const calm = calculateRavScore({
  mode: "waders",
  zone,
  weather: {
    windSpeedMps: 2.5,
    windDirectionDeg: 270,
    waveHeightM: 0.2,
    currentSpeedMps: 0.3,
    currentDirectionDeg: 270,
    waterLevelTrendCm3h: 8
  },
  history: { maxWind24hMps: 10, maxWave24hM: 1.0, hoursSinceHighEnergy: 8 }
});

const rough = calculateRavScore({
  mode: "waders",
  zone,
  weather: {
    windSpeedMps: 10,
    windDirectionDeg: 90,
    waveHeightM: 1.1,
    currentSpeedMps: 0.3,
    currentDirectionDeg: 90,
    waterLevelTrendCm3h: 0
  },
  history: { maxWind24hMps: 15, maxWave24hM: 2.0, hoursSinceHighEnergy: 2 }
});

assert.equal(calm.available, true);
assert.ok(calm.score > rough.score, "Rolige waders-forhold skal slå kraftig påland/udgående situation");
assert.ok(calm.components.transport > rough.components.transport, "Retning skal påvirke transportscoren");
assert.equal(calculateRavScore({ mode: "beach", zone, weather: {} }).available, false);
console.log(`OK: scoremotor (${calm.score} mod ${rough.score})`);
