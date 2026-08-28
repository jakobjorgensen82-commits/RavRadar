import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  NEXT_RAVSCORE_MODEL_ID,
  evaluateNextGenerationRavScore,
} from '../js/core/ravscore-next-generation.js';
import {
  NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  projectNextRavScoreForPublic,
  resolveNextPublicRavScoreProfile,
} from '../js/core/ravscore-next-generation-profile.js';

const context = {
  mode: 'waders',
  zone: { onshoreDirectionDeg: 90 },
  weather: {
    windSpeedMps: 4.7,
    waveHeightM: 0.4,
    wavePeriodS: 8,
    waveDirectionDeg: 270,
    waterLevelCm: -20,
    waterLevelTrendCm3h: -8,
  },
};
const candidate = evaluateNextGenerationRavScore(context, {
  memory: {
    transportPotential: 76,
    mobilisationPotential: 73,
    outboundEpisodeEffectiveHours: 0,
    gridOutflowEvidenceActive: false,
  },
});
const profile = resolveNextPublicRavScoreProfile({
  selection: NEXT_PUBLIC_RAVSCORE_PROFILE_SELECTION,
  modelCoverageReady: true,
  modelMemoryReady: true,
});
const projected = projectNextRavScoreForPublic(candidate, {
  mode: 'waders',
  profile,
  context: {
    measurementStatus: 'VERIFIED',
    currentTransition: 'INBOUND_SUPPLY_EVIDENCE_BUILDUP',
    currentDirectionClass: 'INBOUND',
    currentDirectionDifferenceDeg: 32,
    transportReferenceAt: '2026-08-25T18:00:00.000Z',
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryCoverageHours: 48,
    transportMemoryWindowHours: 48,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    gridOutflowEvidenceActive: false,
  },
});

assert.equal(projected.scoreProfileId, NEXT_RAVSCORE_MODEL_ID);
assert.equal(projected.explanation.weights, null);
assert.equal(projected.explanation.contributions, null);
assert.match(projected.explanation.formula, /Kystnær tilførsel og mobilisering kobles først/);
assert.ok(projected.componentReasons.huntability.some(reason => reason.includes('faldende vand')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('kystnære tilførselspotentiale')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('mobilisering')));
assert.equal(projected.explanation.transportDiagnostics.engine, 'RAVSCORE_COASTAL_CAUSAL_CHAIN');
assert.equal(projected.explanation.transportDiagnostics.measurementStatus, 'VERIFIED');
assert.equal(projected.explanation.transportDiagnostics.currentDirectionClass, 'INBOUND');
assert.equal(projected.explanation.transportDiagnostics.currentDirectionDifferenceDeg, 32);
assert.equal(projected.explanation.transportDiagnostics.transportMemoryStatus, 'READY');
assert.equal(projected.explanation.transportDiagnostics.transportMemoryCoverageHours, 48);
assert.equal(projected.explanation.transportDiagnostics.windDirectlyIncluded, false);
assert.equal(projected.explanation.transportDiagnostics.surfZoneResolved, false);
assert.equal(projected.explanation.transportDiagnostics.beachOrSurfZoneDepletionClaimed, false);
assert.equal(projected.explanation.causalExplanation.waterLevel.scoreImpact.coastalSupply, 0);
assert.ok(projected.explanation.causalExplanation.waterLevel.huntabilityBonusPoints > 0);
assert.equal(projected.explanation.empiricalFindAccuracyClaimed, false);

const held = projectNextRavScoreForPublic(candidate, {
  mode: 'beach',
  profile,
  context: {
    measurementStatus: 'NATIVE_CADENCE_HOLD',
    currentTransition: 'NATIVE_CADENCE_HOLD',
    currentDirectionClass: null,
    currentDirectionDifferenceDeg: null,
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryCoverageHours: 48,
    transportMemoryWindowHours: 48,
  },
});
assert.equal(held.explanation.transportDiagnostics.measurementStatus, 'NATIVE_CADENCE_HOLD');
assert.equal(held.explanation.transportDiagnostics.currentDirectionDifferenceDeg, null);
assert.equal(held.explanation.transportDiagnostics.currentDirectionClass, null);

const ui = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');

for (const removed of ['Fundprognose', 'Anvendte scorelofter', '<h4>Samlet score</h4>']) {
  assert.ok(!ui.includes(removed), `Den offentlige zonevisning indeholder stadig ${removed}`);
}
assert.ok(ui.includes('RAVSCORE_COASTAL_CAUSAL_CHAIN'));
assert.ok(ui.includes('Modellen opløser ikke undertow, feeder-/langskyststrøm eller ripstrømme'));
assert.ok(index.includes('<section id="infoPanel" class="info-panel" aria-live="polite" hidden></section>'));
assert.ok(!index.includes('Vælg et område på kortet'));
assert.ok(!app.includes('Vælg et område på kortet'));
assert.ok(index.includes('E.U. Copernicus Marine Service Information'));
assert.ok(index.includes('Copernicus Marine-vilkårene'));
assert.ok(index.includes('OpenStreetMap-data er under ODbL'));
for (const marker of [
  'publicContext',
  'currentTransition',
  'transportMemoryWindowHours',
  'outboundEpisodeLossPoints',
  'gridOutflowEvidenceActive',
  'context: scoreRow?.ravScore?.publicContext',
]) {
  assert.ok(updater.includes(marker), `Produktionskæden mangler ${marker}`);
}

console.log('Offentlige kystkausale RavScore-forklaringer, forenkling og kildeangivelse: OK');
