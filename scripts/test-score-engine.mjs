import assert from "node:assert/strict";
import { calculateRavScore, scoreRating } from "../js/core/score-engine.js";

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
assert.equal(scoreRating(94).level, "excellent");
assert.equal(scoreRating(82).level, "good");
assert.equal(scoreRating(71).level, "fair", "71/100 skal vises som gul Middel");
assert.equal(scoreRating(44).level, "weak");
assert.equal(scoreRating(20).level, "poor");
assert.equal(scoreRating(null).level, "unavailable");
console.log(`OK: scoremotor (${calm.score} mod ${rough.score})`);

const offshoreCurrent = calculateRavScore({
  mode: 'beach', zone,
  weather: { windSpeedMps: 4, windDirectionDeg: 90, waveHeightM: .4, currentSpeedMps: .35, currentDirectionDeg: 90, waterLevelTrendCm3h: 10 },
  history: { maxWind24hMps: 15, maxWave24hM: 2, hoursSinceHighEnergy: 8 }
});
const onshoreCurrent = calculateRavScore({
  mode: 'beach', zone,
  weather: { windSpeedMps: 4, windDirectionDeg: 90, waveHeightM: .4, currentSpeedMps: .35, currentDirectionDeg: 270, waterLevelTrendCm3h: 10 },
  history: { maxWind24hMps: 15, maxWave24hM: 2, hoursSinceHighEnergy: 8 }
});
assert.ok(onshoreCurrent.components.transport - offshoreCurrent.components.transport >= 40, '180° vending af strømmen skal give en stor og dokumenteret forskel');
assert.ok(offshoreCurrent.components.transport <= 28, 'Klar strøm væk fra land må ikke få høj transportscore');
assert.ok(offshoreCurrent.explanation.transportDiagnostics.capsApplied.some(cap => cap.reason === 'strongly-offshore-current'));

const missingCurrent = calculateRavScore({
  mode: 'beach', zone,
  weather: { windSpeedMps: 3, windDirectionDeg: 90, waveHeightM: .2, currentSpeedMps: null, currentDirectionDeg: null, waterLevelTrendCm3h: 12 },
  history: { maxWind24hMps: 15, maxWave24hM: 2, hoursSinceHighEnergy: 8 }
});
assert.ok(missingCurrent.components.transport <= 52, 'Manglende strømdata skal begrænse transportscoren');
