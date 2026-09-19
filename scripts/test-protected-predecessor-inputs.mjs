import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { extractProtectedPredecessorInputs, requirePersistedRawPredecessorRecord } from './lib/protected-predecessor-inputs.mjs';
import { privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import * as oldStaging from './lib/coastal-point-staging-contract.mjs';
import * as oldIntegratedBinding from '../js/core/ravscore-model-contract.js';
import * as oldCandidateBinding from './rollback-assets/ravscore-model-contract.js';
import { buildRavScoreProductionPartSeries } from './lib/ravscore-production-part-pipeline.mjs';
import { RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION } from './lib/ravscore-recovery-replay.mjs';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const time = '2026-09-19T03:00:00.000Z';
const part = { partId: 'SYNTHETIC-EXPORT', parentZoneId: 'SYNTHETIC-ZONE', zoneId: 'SYNTHETIC-ZONE',
  waterPoint: [8, 55], onshoreDirectionDeg: 90 };
const weather = { time, windSpeedMps: 4, windDirectionDeg: 270, waveHeightM: 1,
  wavePeriodS: 7, waveDirectionDeg: 270, currentSpeedMps: .1, currentDirectionDeg: 90,
  currentProvenance: { status: 'verified' }, waterLevelCm: 10, waterLevelTrendCm3h: 0, waterTemperatureC: 14 };
const series = buildRavScoreProductionPartSeries({ part, zone: { id: part.zoneId },
  targetReferenceAt: time, initialSelection: { state: null, source: 'COLD_START',
    candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION },
  candidateGRollbackMeasuredColdStart: true, recoverySources: [], publicHourly: [weather] });
const integratedState = series.scores[0].ravScoreModel.continuationState;
const candidateGState = series.candidateGRollbackScores[0].candidateG.continuationState;
const binding = oldIntegratedBinding.ravScoreModelBinding(), candidateBinding = oldCandidateBinding.ravScoreModelBinding();
const source = { datasetId: 'rr-synthetic', productionReferenceAt: time, generatedAt: time,
  zones: { [part.zoneId]: {} }, coastalParts: { modelBinding: binding, parts: {
    [part.partId]: { ...part, ravScoreModel: { ...binding, currentState: integratedState },
      current: { time, weather: series.scores[0].weather }, hourly: [{ time, weather: series.scores[0].weather }] },
  } }, ravScoreCandidateGWarmup: { sourceModelBinding: binding, candidateModelBinding: candidateBinding,
    runtime: { modelBinding: candidateBinding, parts: { [part.partId]: { ravScoreModel: { currentState: candidateGState } } } } } };

function options(document = source) {
  const conditionsBytes = Buffer.from(JSON.stringify(document));
  const manifest = { datasetId: document.datasetId, productionReferenceAt: time, generatedAt: time,
    partCount: 1, zoneCount: 1, modelBinding: binding, contractHashes: { continuationStateContractSha256: hash('synthetic-code') },
    files: [{ id: 'full-conditions', relativePath: 'data/live/conditions.json', bytes: conditionsBytes.length, sha256: hash(conditionsBytes) }] };
  manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest);
  return { conditionsBytes, manifest, expectedIdentity: { sourceHead: 'a'.repeat(40), datasetId: document.datasetId,
    productionReferenceAt: time, generatedAt: time, expectedPartCount: 1, expectedZoneCount: 1,
    modelBinding: binding, contractHashes: manifest.contractHashes, bundleContentSha256: manifest.bundleContentSha256 },
    oldStaging, oldIntegratedBinding, oldCandidateBinding };
}
const fixture = options(), originalBytes = fixture.conditionsBytes.toString();
const exported = extractProtectedPredecessorInputs(fixture);
const evidence = exported.parts[part.partId];
assert.equal(exported.privatePayloadIncluded, true);
assert.equal(exported.summary.privatePayloadIncluded, false);
assert.equal(exported.summary.affectedPartCount, null);
assert.equal(exported.summary.reboundStateCount, 0);
assert.equal(exported.summary.coldResetPartCount, 0);
assert.deepEqual(evidence.statePair, { integratedState, candidateGState });
assert.deepEqual(evidence.observedProjection.hourly[0], { time, weather: series.scores[0].weather });
assert.equal(evidence.rawSelectedInputRecord, null);
assert.equal(evidence.inputEquivalenceProved, false);
assert.equal(evidence.affectedByPeakCorrection, null);
assert.equal('currentUMps' in evidence.observedProjection.hourly[0].weather, false);
assert.equal('sources' in evidence.observedProjection.hourly[0].weather, false);
assert.equal(fixture.conditionsBytes.toString(), originalBytes);
assert.throws(() => requirePersistedRawPredecessorRecord(evidence),
  error => error.code === 'RAVSCORE_PREDECESSOR_RAW_HISTORY_NOT_PERSISTED');
assert.throws(() => extractProtectedPredecessorInputs({ ...fixture, conditionsBytes: Buffer.from(`${originalBytes} `) }), /sealed manifest/);
assert.throws(() => extractProtectedPredecessorInputs({ ...fixture,
  expectedIdentity: { ...fixture.expectedIdentity, bundleContentSha256: hash('another-generation') } }), /protected identity/);
const differentPair = structuredClone(source);
differentPair.ravScoreCandidateGWarmup.runtime.parts[part.partId].ravScoreModel.currentState.time = '2026-09-19T04:00:00.000Z';
assert.throws(() => extractProtectedPredecessorInputs(options(differentPair)), /H0 pair|Candidate G/);
const differentH0 = structuredClone(source);
differentH0.coastalParts.parts[part.partId].current.weather = {
  ...differentH0.coastalParts.parts[part.partId].current.weather, wavePeriodS: 99,
};
assert.throws(() => extractProtectedPredecessorInputs(options(differentH0)), /H0 and current weather disagree/);
const fakeOldBinding = structuredClone(source);
fakeOldBinding.coastalParts.parts[part.partId].ravScoreModel.currentState.modelBundleSha256 = hash('forged-bundle');
assert.throws(() => extractProtectedPredecessorInputs(options(fakeOldBinding)), /incompatible model metadata/);
console.log('Protected predecessor export: sealed observed projection and exact old state pair preserved; absent raw history cannot authorize replay/rebind.');
