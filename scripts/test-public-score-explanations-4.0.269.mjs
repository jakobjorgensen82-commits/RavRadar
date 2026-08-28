import assert from 'node:assert/strict';
import fs from 'node:fs';

import { calculateRavScore } from '../js/core/score-engine.js';
import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  projectCandidateGForPublic,
} from '../js/core/ravscore-profile-switch.js';

const candidate = {
  available: true,
  modelId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  score: 82,
  additiveScore: 82,
  components: {
    huntability: 68,
    transport: 100,
    delivery: 100,
    transportAndDelivery: 100,
    mobilisation: 73,
  },
  outflowExhaustionGateApplied: false,
  outflowExhaustionExplanationDa: null,
};
const profile = {
  activeProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.269',
};

const projected = projectCandidateGForPublic(candidate, {
  mode: 'waders',
  profile,
  context: {
    windSpeedMps: 4.7,
    waveHeightM: 0.4,
    currentSpeedMps: 0.18,
    currentAlignment: 0.76,
    currentVerified: true,
    currentTransition: 'INBOUND_BUILDUP',
    transportReferenceAt: '2026-08-25T18:00:00.000Z',
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryCoverageHours: 48,
    transportMemoryWindowHours: 48,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
    waveMobilisationTransition: 'decay',
  },
});

assert.deepEqual(projected.explanation.weights, { huntability: 0.20, transport: 0.50, release: 0.30 });
assert.match(projected.explanation.formula, /20 %.*50 %.*30 %/);
assert.ok(projected.componentReasons.huntability.some(reason => reason.includes('4,7 m/s')));
assert.ok(projected.componentReasons.huntability.some(reason => reason.includes('0,4 m')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('0,18 m/s') && reason.includes('ind mod kystdelen')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('time for time')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('0,4 m')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('aftager gradvist')));
assert.equal(projected.explanation.transportDiagnostics.engine, 'CANDIDATE_G');
assert.equal(projected.explanation.transportDiagnostics.measurementStatus, 'VERIFIED');
assert.equal(projected.explanation.transportDiagnostics.currentDirectionClass, 'INBOUND');
assert.ok(Math.abs(projected.explanation.transportDiagnostics.currentDirectionDifferenceDeg - 40.5358) < 0.01);
assert.equal(projected.explanation.transportDiagnostics.deliveryPotential, 100);
assert.equal(projected.explanation.transportDiagnostics.transportMemoryStatus, 'READY');
assert.equal(projected.explanation.transportDiagnostics.transportMemoryCoverageHours, 48);
assert.equal(projected.explanation.transportDiagnostics.windDirectlyIncluded, false);

const held = projectCandidateGForPublic(candidate, {
  mode: 'beach',
  profile,
  context: {
    currentVerified: true,
    currentAlignment: 0.76,
    currentTransition: 'NATIVE_CADENCE_HOLD',
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryCoverageHours: 48,
    transportMemoryWindowHours: 48,
  },
});
assert.equal(held.explanation.transportDiagnostics.measurementStatus, 'NATIVE_CADENCE_HOLD');
assert.equal(held.explanation.transportDiagnostics.currentAlignment, null);
assert.equal(held.explanation.transportDiagnostics.currentDirectionDifferenceDeg, null);
assert.equal(held.explanation.transportDiagnostics.currentDirectionClass, null);

const legacy = calculateRavScore({
  mode: 'waders',
  zone: {
    id: 'explanation-test',
    coastType: 'east',
    onshoreDirectionDeg: 270,
    shallowWater: true,
    reefs: true,
    seagrass: true,
  },
  weather: {
    windSpeedMps: 4.7,
    windDirectionDeg: 306,
    waveHeightM: 0.4,
    currentSpeedMps: 0.18,
    currentDirectionDeg: 270,
    waterLevelCm: -47,
    waterLevelTrendCm3h: 64,
  },
  history: { maxWind24hMps: 9, maxWave24hM: 0.8, hoursSinceHighEnergy: 8 },
});
assert.ok(legacy.componentReasons.huntability.some(reason => reason.includes('4,7 m/s')));
assert.ok(legacy.componentReasons.transport.some(reason => reason.includes('0,18 m/s') && reason.includes('ind mod kystdelen')));
assert.ok(legacy.componentReasons.transport.some(reason => reason.includes('lavt, men er stigende')));
assert.ok(legacy.componentReasons.transport.some(reason => reason.includes('ikke den aktuelle vandstand')));
assert.ok(!legacy.componentReasons.transport.some(reason => reason.includes('Lavt vand kan hjælpe')));
assert.ok(legacy.componentReasons.release.some(reason => reason.includes('0,4 m')));

const ui = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');

for (const removed of ['Fundprognose', 'Anvendte scorelofter', '<h4>Samlet score</h4>']) {
  assert.ok(!ui.includes(removed), `Den offentlige zonevisning indeholder stadig ${removed}`);
}
assert.ok(ui.includes("t('score.state.wavePotential')"));
assert.ok(ui.includes("t('score.mobilisationDefinition')"));
assert.ok(index.includes('<section id="infoPanel" class="info-panel" aria-live="polite" hidden></section>'));
assert.ok(!index.includes('Vælg et område på kortet'));
assert.ok(!app.includes('Vælg et område på kortet'));
assert.ok(index.includes('E.U. Copernicus Marine Service Information'));
assert.ok(index.includes('Copernicus Marine-vilkårene'));
assert.ok(index.includes('OpenStreetMap-data er under ODbL'));
for (const marker of ['publicContext', 'currentTransition', 'waveMobilisationTransition', 'transportMemoryWindowHours', 'outboundEpisodeLossPoints', 'context: scoreRow?.candidateG?.publicContext']) {
  assert.ok(updater.includes(marker), `Produktionskæden mangler ${marker}`);
}

console.log('Offentlige RavScore-forklaringer, forenkling og kildeangivelse: OK');
