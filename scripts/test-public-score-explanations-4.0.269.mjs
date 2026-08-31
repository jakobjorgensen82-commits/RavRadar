import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  projectIntegratedRavScoreForPublic,
  resolvePublicRavScoreProfile,
} from '../js/core/ravscore-public-model.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { RAVSCORE_MODEL_ID, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';

const profile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
const state = {
  currentMemoryReady: true,
  currentMemoryStatus: 'READY',
  currentReferenceAt: '2026-08-29T18:00:00.000Z',
  supplyPotential: 100,
  waveMemoryReady: true,
  waveMemoryStatus: 'READY',
  waveLastVerifiedAt: '2026-08-29T18:00:00.000Z',
  mobilisationPotential: 73,
  lastMileMemoryReady: true,
  lastMileMemoryStatus: 'READY',
  lastMileEvidenceStatus: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
  lastMileWaveActivity: 0.6,
  lastMileNormalAlignment: 1,
  lastMileTangentAlignment: 0,
  lastMileCoherence: 1,
  lastMileApproach: 1,
  lastMileFactor: 1,
};
const weather = {
  windSpeedMps: 4.7,
  waveHeightM: 0.4,
  wavePeriodS: 6,
  waveDirectionDeg: 90,
  currentSpeedMps: 0.18,
  currentAlignment: 0.76,
  waterLevelCm: -47,
  waterLevelTrendCm3h: -4,
};
const integrated = evaluateRavScoreIntegrated({
  mode: 'waders',
  weather,
  zone: { onshoreDirectionDeg: 270 },
}, { state });
const projected = projectIntegratedRavScoreForPublic(integrated, {
  mode: 'waders',
  profile,
  context: {
    ...weather,
    currentVerified: true,
    currentTransition: 'INBOUND_BUILDUP',
    currentMemoryCoverageHours: 48,
    currentMemoryWindowHours: 48,
    waveTransition: 'DECAY',
  },
});

assert.deepEqual(projected.explanation.weights, { huntability: 0.20, transport: 0.50, release: 0.30 });
assert.match(projected.explanation.formula, /20 %.*50 %.*30 %/);
assert.equal(projected.scoreProfileId, RAVSCORE_MODEL_ID);
assert.deepEqual(projected.modelBinding, ravScoreModelBinding());
assert.ok(projected.componentReasons.huntability.some(reason => reason.includes('4,7 m/s')));
assert.ok(projected.componentReasons.huntability.some(reason => reason.includes('0,4 m')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('0,18 m/s') && reason.includes('ind mod kystdelen')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('transportbevis mod kystzonen')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('ganget én gang') && reason.includes('1,00')));
assert.ok(projected.componentReasons.transport.some(reason => reason.includes('fysisk uopløst')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('0,4 m')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('mobiliseringspotentiale') && reason.includes('aftage gradvist')));
assert.ok(projected.componentReasons.release.some(reason => reason.includes('modelbevis for mobiliseringsmulighed')));
assert.equal(projected.explanation.transportDiagnostics.engine, 'INTEGRATED_COASTAL_PROCESS');
assert.equal(projected.explanation.transportDiagnostics.measurementStatus, 'VERIFIED');
assert.equal(projected.explanation.transportDiagnostics.currentDirectionClass, 'INBOUND');
assert.ok(Math.abs(projected.explanation.transportDiagnostics.currentDirectionDifferenceDeg - 40.5358) < 0.01);
assert.equal(projected.explanation.transportDiagnostics.supplyPotential, 100);
assert.equal(projected.explanation.transportDiagnostics.transportPotential, 100);
assert.equal(projected.explanation.transportDiagnostics.lastMileScoreEffect, 'BOUNDED_SUPPLY_ATTENUATION_ONLY');
assert.equal(projected.explanation.transportDiagnostics.lastMileDeliveryFactor, 1);
assert.equal(projected.explanation.transportDiagnostics.lastMilePhysicalDeliveryResolved, false);
const missingPhysicalResolution = {
  ...integrated,
  diagnostics: {
    ...integrated.diagnostics,
    lastMile: { ...integrated.diagnostics.lastMile },
  },
};
delete missingPhysicalResolution.diagnostics.lastMile.physicalDeliveryResolved;
const projectedMissingPhysicalResolution = projectIntegratedRavScoreForPublic(
  missingPhysicalResolution,
  {
    mode: 'waders',
    profile,
    context: {
      ...weather,
      currentVerified: true,
      currentTransition: 'INBOUND_BUILDUP',
      currentMemoryCoverageHours: 48,
      currentMemoryWindowHours: 48,
      waveTransition: 'DECAY',
    },
  },
);
assert.equal(projectedMissingPhysicalResolution.explanation.transportDiagnostics.lastMilePhysicalDeliveryResolved, null,
  'manglende producentudsagn må ikke omskrives til et gyldigt fysisk-uopløst false');
assert.equal(projected.explanation.transportDiagnostics.currentMemoryStatus, 'READY');
assert.equal(projected.explanation.transportDiagnostics.currentMemoryCoverageHours, 48);
assert.equal(projected.explanation.transportDiagnostics.windDirectlyIncluded, false);
assert.equal(projected.explanation.scoreIsFindProbability, false);
assert.match(projected.explanation.scoreMeaning, /Modelleret indeks/);
assert.ok(projected.reasons.some(reason => /Vandstanden er beregnet lavere/.test(reason) && /ingen RavScore-point/.test(reason)));

const held = projectIntegratedRavScoreForPublic(integrated, {
  mode: 'beach',
  profile,
  context: {
    ...weather,
    currentVerified: false,
    currentAlignment: 0.76,
    currentTransition: 'NATIVE_CADENCE_HOLD',
    currentMemoryCoverageHours: 48,
    currentMemoryWindowHours: 48,
  },
});
assert.equal(held.explanation.transportDiagnostics.measurementStatus, 'NATIVE_CADENCE_HOLD');
assert.equal(held.explanation.transportDiagnostics.currentAlignment, null);
assert.equal(held.explanation.transportDiagnostics.currentDirectionDifferenceDeg, null);
assert.equal(held.explanation.transportDiagnostics.currentDirectionClass, null);
assert.ok(held.componentReasons.transport.some(reason => reason.includes('uden at tilføje et nyt strømevidensinterval')));

const ui = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
const integratedRuntime = fs.readFileSync('scripts/lib/ravscore-integrated-runtime.mjs', 'utf8');
const publicModel = fs.readFileSync('js/core/ravscore-public-model.js', 'utf8');

for (const removed of ['Fundprognose', 'Anvendte scorelofter', '<h4>Samlet score</h4>']) {
  assert.ok(!ui.includes(removed), `Den offentlige zonevisning indeholder stadig ${removed}`);
}
assert.ok(ui.includes('presentActiveRavScoreExplanation'));
assert.ok((ui.match(/integratedExplanationPanel\(/g) || []).length >= 3,
  'Samme integrerede presenter skal eje nu- og femdøgnsforklaringen.');
assert.ok(!ui.includes('transportEvent'), 'Den offentlige UI må ikke bruge Candidate G transportEvent.');
assert.ok(ui.includes("t('score.mobilisationDefinition')"));
assert.ok(ui.includes("d.lastMileScoreEffect === 'BOUNDED_SUPPLY_ATTENUATION_ONLY'"));
assert.ok(ui.includes('d.lastMileDeliveryFactor'));
assert.ok(!ui.includes("d.lastMileScoreEffect === 'NONE'"));
assert.ok(index.includes('<section id="infoPanel" class="info-panel" aria-live="polite" hidden></section>'));
assert.ok(!index.includes('Vælg et område på kortet'));
assert.ok(!app.includes('Vælg et område på kortet'));
assert.ok(index.includes('E.U. Copernicus Marine Service Information'));
assert.ok(index.includes('Copernicus Marine-vilkårene'));
assert.ok(index.includes('OpenStreetMap-data er under ODbL'));
for (const marker of ['ravScoreModel', 'publicContext', 'currentTransition', 'currentMemoryWindowHours', 'waveMemoryStatus', 'context: scoreRow?.ravScoreModel?.publicContext']) {
  assert.ok(`${updater}\n${integratedRuntime}\n${publicModel}`.includes(marker),
    `Produktionskæden mangler ${marker}`);
}

console.log('Offentlige RavScore-forklaringer, forenkling og kildeangivelse: OK');
