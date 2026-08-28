import assert from 'node:assert/strict';
import fs from 'node:fs';

import { NEXT_RAVSCORE_MODEL_ID } from '../js/core/ravscore-next-generation.js';
import { projectNextRavScoreForPublic } from '../js/core/ravscore-next-generation-profile.js';

const candidate = {
  available: true,
  modelId: NEXT_RAVSCORE_MODEL_ID,
  score: 42,
  components: {
    coastalSupply: 36,
    mobilisation: 49,
    nearshoreSupport: 91,
    physicalOpportunity: 38,
    huntability: 70,
  },
  explanation: {
    physicalCoupling: { nearshoreOpportunity: 38, supplyCountedOnce: true },
  },
  confidence: { modelMaturity: 'physics-informed-not-find-calibrated', limitations: [] },
};
const result = projectNextRavScoreForPublic(candidate, {
  mode: 'beach',
  profile: { activeProfileId: NEXT_RAVSCORE_MODEL_ID, switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.306' },
  context: {
    measurementStatus: 'VERIFIED',
    currentTransition: 'INBOUND_BUILDUP',
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
const diagnostics = result.explanation.transportDiagnostics;
assert.equal(diagnostics.engine, 'RAVSCORE_COASTAL_CAUSAL_CHAIN');
assert.equal(diagnostics.measurementStatus, 'VERIFIED');
assert.equal(diagnostics.currentDirectionClass, 'INBOUND');
assert.equal(diagnostics.currentDirectionDifferenceDeg, 32);
assert.equal(diagnostics.transportPotential, 36);
assert.equal(diagnostics.deliveryPotential, 91);
assert.equal(diagnostics.transportAndDelivery, 38);
assert.equal(diagnostics.transportMemoryReady, true);
assert.equal(diagnostics.surfZoneResolved, false);
assert.equal(diagnostics.gridOutflowEvidenceActive, false);
assert.equal(diagnostics.beachOrSurfZoneDepletionClaimed, false);
assert.equal(result.explanation.weights, null);
assert.equal(result.explanation.empiricalFindAccuracyClaimed, false);

const infoPanel = fs.readFileSync('js/ui/info-panel.js', 'utf8');
for (const marker of [
  'Kystkausal RavScore',
  'Aktuel strømstatus',
  'Forskel strøm/kyst',
  'Strømhistorik',
  'Udgående episode',
  'Fysisk mulighed',
  'undertow, feeder-/langskyststrøm eller ripstrømme',
]) assert.ok(infoPanel.includes(marker), `Teknisk visning mangler: ${marker}`);

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'transportMemoryWindowHours: derivedState.transportMemoryWindowHours',
  'outboundEpisodeLossPoints: derivedState.outboundEpisodeLossPoints',
  'context: scoreRow?.ravScore?.publicContext',
  "waders: selectedMode(score, 'waders')",
  "beach: selectedMode(score, 'beach')",
  'currentVerified: derivedState.currentVerified === true',
]) assert.ok(updater.includes(marker), `Produktionskæden taber RavScore-diagnostik: ${marker}`);

console.log('Kystkausal RavScore teknisk diagnosekontrakt: OK');
