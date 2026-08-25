import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CANDIDATE_G_RAVSCORE_PROFILE_ID,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-profile-switch.js';

const profile = {
  activeProfileId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.280',
};
const candidateG = {
  available: true,
  modelId: CANDIDATE_G_RAVSCORE_PROFILE_ID,
  score: 33,
  additiveScore: 33,
  components: {
    huntability: 100,
    transport: 28,
    delivery: 28,
    transportAndDelivery: 28,
    mobilisation: 10,
  },
  outflowExhaustionGateApplied: false,
};
const candidateState = {
  transportReferenceAt: '2026-08-25T18:00:00.000Z',
  currentTransition: 'INBOUND_BUILDUP',
  transportMemoryReady: true,
  transportMemoryStatus: 'READY',
  transportMemoryCoverageHours: 48,
  transportMemoryWindowHours: 48,
};

const result = selectPublicRavScoreResult({
  profile,
  candidateG,
  candidateState,
  mode: 'beach',
  context: {
    currentVerified: true,
    currentAlignment: Math.cos(32 * Math.PI / 180),
    currentSpeedMps: 0.10,
    outboundEpisodeEffectiveHours: 0,
    outboundEpisodeLossPoints: 0,
    actualOutboundTransport: false,
  },
});
const diagnostics = result.explanation.transportDiagnostics;
assert.equal(diagnostics.engine, 'CANDIDATE_G');
assert.equal(diagnostics.measurementStatus, 'VERIFIED');
assert.equal(diagnostics.currentDirectionClass, 'INBOUND');
assert.ok(Math.abs(diagnostics.currentDirectionDifferenceDeg - 32) < 1e-9);
assert.equal(diagnostics.transportPotential, 28);
assert.equal(diagnostics.deliveryPotential, 28);
assert.equal(diagnostics.transportAndDelivery, 28);
assert.equal(diagnostics.transportMemoryReady, true);
assert.equal(diagnostics.transportMemoryStatus, 'READY');
assert.equal(diagnostics.transportMemoryCoverageHours, 48);
assert.equal(diagnostics.transportMemoryWindowHours, 48);
assert.equal(diagnostics.windDirectlyIncluded, false);

const infoPanel = fs.readFileSync('js/ui/info-panel.js', 'utf8');
for (const marker of [
  'Candidate G · 20/50/30',
  'Aktuel strømstatus',
  'Forskel strøm/kyst',
  'Strømhistorik',
  'Udgående episode',
  'Samlet transportkomponent',
  'Ingen ny måling denne time; seneste verificerede tilstand fastholdes',
]) assert.ok(infoPanel.includes(marker), `Teknisk visning mangler: ${marker}`);
for (const retired of ['Transport før loft', 'Transport efter loft', 'Nærkystpotentiale']) {
  assert.ok(!infoPanel.includes(retired), `Forældet felt findes stadig: ${retired}`);
}

const updater = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
for (const marker of [
  'transportMemoryWindowHours: derivedState.transportMemoryWindowHours',
  'outboundEpisodeLossPoints: derivedState.outboundEpisodeLossPoints',
  '...(explanation.transportDiagnostics || {})',
  '...explanation,',
  "waders: selectedMode(score, 'waders')",
  "beach: selectedMode(score, 'beach')",
  'currentVerified: derivedState.currentVerified === true',
]) assert.ok(updater.includes(marker), `Produktionskæden taber Candidate G-diagnostik: ${marker}`);

console.log('Candidate G-native teknisk diagnosekontrakt: OK');
